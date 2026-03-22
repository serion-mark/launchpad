import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);

  constructor(private prisma: PrismaService) {}

  /** 프로젝트 코드를 GitHub repo에 push */
  async pushToGitHub(
    projectId: string,
    userId: string,
  ): Promise<{ repoUrl: string; message: string }> {
    // 1. 사용자 GitHub 토큰 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubToken: true, name: true, email: true },
    });
    if (!user?.githubToken) {
      throw new BadRequestException('GitHub 연결이 필요합니다. 먼저 GitHub 로그인을 해주세요.');
    }

    // 2. 프로젝트 코드 로드
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, description: true, generatedCode: true, githubRepoUrl: true },
    });
    if (!project?.generatedCode) {
      throw new BadRequestException('프로젝트 코드가 없습니다.');
    }

    const files = project.generatedCode as { path: string; content: string }[];
    const token = user.githubToken;
    const repoName = this.sanitizeRepoName(project.name);

    try {
      // 3. 새 repo 생성 (이미 있으면 기존 repo 사용)
      let repoFullName: string;

      if (project.githubRepoUrl) {
        // 기존 repo에 push
        const match = project.githubRepoUrl.match(/github\.com\/(.+)/);
        repoFullName = match ? match[1] : '';
      } else {
        // 새 repo 생성
        const createRes = await fetch('https://api.github.com/user/repos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repoName,
            description: project.description || `Foundry AI로 생성된 ${project.name}`,
            private: true,
            auto_init: true,
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          // repo 이름 중복 → 기존 repo 사용
          if (err.errors?.[0]?.message?.includes('already exists')) {
            const userRes = await fetch('https://api.github.com/user', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userRes.json();
            repoFullName = `${userData.login}/${repoName}`;
          } else {
            throw new Error(`GitHub repo 생성 실패: ${err.message}`);
          }
        } else {
          const repoData = await createRes.json();
          repoFullName = repoData.full_name;
        }
      }

      // 4. 파일들을 GitHub에 커밋
      // 먼저 현재 default branch의 최신 커밋 SHA 가져오기
      const refRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/ref/heads/main`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });

      let baseSha = '';
      let baseTreeSha = '';

      if (refRes.ok) {
        const refData = await refRes.json();
        baseSha = refData.object.sha;

        const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits/${baseSha}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        });
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree.sha;
      }

      // 5. Blob 생성 (각 파일)
      const treeItems = [];
      for (const file of files) {
        const blobRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/blobs`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: file.content,
            encoding: 'utf-8',
          }),
        });
        const blobData = await blobRes.json();

        treeItems.push({
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blobData.sha,
        });
      }

      // 6. Tree 생성
      const treeRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_tree: baseTreeSha || undefined,
          tree: treeItems,
        }),
      });
      const treeData = await treeRes.json();

      // 7. 커밋 생성
      const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: baseSha ? `feat: Foundry AI 코드 업데이트` : `feat: Foundry AI로 생성된 ${project.name}`,
          tree: treeData.sha,
          parents: baseSha ? [baseSha] : [],
        }),
      });
      const newCommit = await commitRes.json();

      // 8. ref 업데이트 (또는 생성)
      if (baseSha) {
        await fetch(`https://api.github.com/repos/${repoFullName}/git/refs/heads/main`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sha: newCommit.sha }),
        });
      } else {
        await fetch(`https://api.github.com/repos/${repoFullName}/git/refs`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref: 'refs/heads/main', sha: newCommit.sha }),
        });
      }

      // 9. 프로젝트에 repo URL 저장
      const repoUrl = `https://github.com/${repoFullName}`;
      await this.prisma.project.update({
        where: { id: projectId },
        data: { githubRepoUrl: repoUrl },
      });

      this.logger.log(`GitHub push 성공: ${repoUrl} (${files.length}개 파일)`);

      return {
        repoUrl,
        message: `${files.length}개 파일이 GitHub에 push되었습니다.`,
      };
    } catch (error: any) {
      this.logger.error(`GitHub push 실패: ${error.message}`);
      throw new BadRequestException(`GitHub push 실패: ${error.message}`);
    }
  }

  /** 코드 수정 후 자동 커밋 */
  async autoCommit(
    projectId: string,
    userId: string,
    message: string,
  ): Promise<void> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { githubRepoUrl: true },
      });

      // GitHub 연결된 프로젝트만 자동 커밋
      if (!project?.githubRepoUrl) return;

      await this.pushToGitHub(projectId, userId);
      this.logger.log(`Auto-commit: ${message}`);
    } catch (error: any) {
      // 자동 커밋 실패는 무시 (핵심 기능 아님)
      this.logger.warn(`Auto-commit 실패: ${error.message}`);
    }
  }

  /** repo 이름 정규화 */
  private sanitizeRepoName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'foundry-app';
  }
}
