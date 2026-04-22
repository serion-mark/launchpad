import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectService } from '../project/project.service';

// Agent Mode 세션이 끝나면 sandbox cwd의 파일을 수집해
// 기존 projects 테이블에 저장 — "내 프로젝트"에 자동 노출
// generatedCode는 기존 /builder의 DeployService 빌드 파이프라인과 호환되는 포맷

// 수집 제외 디렉토리 — 용량/보안상 제외
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.cache',
  '.turbo',
  'coverage',
  '.vercel',
  '.DS_Store',
]);

const MAX_FILE_BYTES = 500 * 1024;     // 파일당 500KB cap
const MAX_TOTAL_FILES = 500;            // 총 500 파일 cap
const MAX_TOTAL_BYTES = 30 * 1024 * 1024; // 총 30MB cap

export type ProjectPersistenceInput = {
  userId: string;
  cwd: string;             // sandbox cwd (예: /tmp/foundry-agent-xxx-xxx/)
  userPrompt: string;      // 사용자 첫 발화 (이름/설명 추정용)
};

export type ProjectPersistenceResult = {
  ok: boolean;
  projectId?: string;
  projectName?: string;
  subdomain?: string;
  fileCount?: number;
  reason?: string;
};

@Injectable()
export class ProjectPersistenceService {
  private readonly logger = new Logger(ProjectPersistenceService.name);

  constructor(
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
  ) {}

  // cwd에서 가장 의미 있는 "프로젝트 루트" 찾기
  // 우선순위: package.json 있는 서브디렉토리 > cwd 자체 package.json > index.html > cwd
  private findProjectRoot(cwd: string): string {
    try {
      const entries = fs.readdirSync(cwd, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory() || IGNORE_DIRS.has(e.name)) continue;
        const sub = path.join(cwd, e.name);
        if (fs.existsSync(path.join(sub, 'package.json'))) return sub;
      }
      if (fs.existsSync(path.join(cwd, 'package.json'))) return cwd;
      for (const e of entries) {
        if (!e.isDirectory() || IGNORE_DIRS.has(e.name)) continue;
        const sub = path.join(cwd, e.name);
        if (fs.existsSync(path.join(sub, 'index.html'))) return sub;
      }
      if (fs.existsSync(path.join(cwd, 'index.html'))) return cwd;
    } catch {
      // fall through
    }
    return cwd;
  }

  // 디렉토리 재귀 순회하며 텍스트 파일 수집
  private collectFiles(root: string): { path: string; content: string }[] {
    const out: { path: string; content: string }[] = [];
    let totalBytes = 0;

    const walk = (dir: string, rel = '') => {
      if (out.length >= MAX_TOTAL_FILES) return;
      if (totalBytes >= MAX_TOTAL_BYTES) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.git')) continue;
        const full = path.join(dir, entry.name);
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(full, relPath);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(full);
            if (stat.size > MAX_FILE_BYTES) continue;
            if (totalBytes + stat.size > MAX_TOTAL_BYTES) continue;
            // binary 파일 감지 — 첫 1KB에 null 바이트 있으면 skip
            // (PostgreSQL JSON 은 \u0000 을 저장할 수 없음)
            const buf = fs.readFileSync(full);
            const sampleLen = Math.min(buf.length, 1024);
            let hasNull = false;
            for (let i = 0; i < sampleLen; i++) {
              if (buf[i] === 0) { hasNull = true; break; }
            }
            if (hasNull) continue;
            const content = buf.toString('utf8');
            out.push({ path: relPath, content });
            totalBytes += stat.size;
            if (out.length >= MAX_TOTAL_FILES) return;
          } catch {
            // binary 또는 읽기 실패 skip
          }
        }
      }
    };
    walk(root);
    return out;
  }

  // Phase AB (2026-04-22): 실제 사용자 대면 앱 이름 추출 (우선순위)
  //   1. src/app/layout.tsx 의 metadata.title — 가장 정확 (한글 앱명: "마케팅봇")
  //   2. package.json 의 name — 영문 프로젝트명
  //   3. 루트 디렉토리명 — foundry-agent-/foundry-project- 제외
  //   4. userPrompt 첫 30자 — fallback
  //   5. 'agent-app' — 최후 fallback
  //
  // 실전 버그 (2026-04-22 사장님 테스트):
  //   기존에는 디렉토리명 `foundry-project-cmo9mnyr30003rhfjodu4g465` 가 그대로 name 에 들어감
  //   → 대시보드 "내 프로젝트" 에 개발자용 ID 노출. 실제 앱은 "마케팅봇"인데.
  //   → layout.tsx 에서 <title>{"마케팅봇 — AI 인스타그램 마케팅 자동화"}</title> 추출
  //   → "—" 앞의 "마케팅봇" 만 name 으로 사용.
  private deriveName(projectRoot: string, cwd: string, userPrompt: string): string {
    // 1. layout.tsx / _app.tsx 의 metadata.title 에서 추출
    if (projectRoot) {
      try {
        const layoutCandidates = [
          'src/app/layout.tsx',
          'app/layout.tsx',
          'src/app/layout.ts',
          'src/pages/_app.tsx',
          'pages/_app.tsx',
        ];
        for (const rel of layoutCandidates) {
          const layoutPath = path.join(projectRoot, rel);
          if (!fs.existsSync(layoutPath)) continue;
          const content = fs.readFileSync(layoutPath, 'utf8');
          // metadata: { title: 'X' } / title: "X" / title: `X`
          const titleMatch = content.match(
            /title\s*:\s*['"`]([^'"`\n]{2,80})['"`]/,
          );
          if (!titleMatch) continue;
          const full = titleMatch[1].trim();
          // "앱이름 — 설명" / "앱이름 | 설명" / "앱이름: 설명" 형태 → 앞부분만
          const short = full.split(/[—–|·:]/)[0].trim();
          if (short && short.length >= 2 && short.length <= 40) {
            return short;
          }
          // 구분자 없으면 전체 (단 40자 제한)
          if (full.length <= 40) return full;
          return full.slice(0, 40);
        }
      } catch {
        // fall through
      }

      // 2. package.json 의 name
      try {
        const pkgPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const n = String(pkg?.name ?? '').trim();
          if (
            n &&
            n !== 'nextjs' &&
            n !== 'next-app' &&
            n !== 'app' &&
            !n.startsWith('foundry-')
          ) {
            return n.slice(0, 40);
          }
        }
      } catch {
        // fall through
      }
    }

    // 3. 루트 디렉토리명 (의미 있는 경우만)
    const dirName = path.basename(projectRoot);
    if (
      dirName &&
      !dirName.startsWith('foundry-agent-') &&
      !dirName.startsWith('foundry-project-') // Phase AB: 신규 제외 패턴
    ) {
      return dirName.slice(0, 40);
    }

    // 4. userPrompt fallback
    const cleaned = (userPrompt ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (cleaned) return cleaned;

    // 5. 최후
    return 'agent-app';
  }

  // Agent 작업 시작 시점에 projects 껍데기 먼저 생성 (status='draft')
  // 이유: 도구(provision_supabase / deploy_to_subdomain)가 projectId 필요
  //
  // Phase 0 (2026-04-22): customSubdomain 전달 — 사용자가 사전 확인 모달에서
  //   입력 + 중복 체크 통과한 값. projectService.create 가 2차 검증(중복 시 throw).
  async startProject(
    userId: string,
    userPrompt: string,
    customSubdomain?: string,
  ): Promise<ProjectPersistenceResult> {
    if (!userId || userId === 'anon') {
      return { ok: false, reason: '비로그인 사용자 — 프로젝트 저장 생략' };
    }
    try {
      const tempName = this.deriveName('', '', userPrompt);
      const description = `Agent Mode로 생성 — "${userPrompt.slice(0, 80)}"`;
      const project = await this.projectService.create(String(userId), {
        name: tempName,
        description,
        template: 'agent-mode',
        ...(customSubdomain ? { subdomain: customSubdomain } : {}),
      });
      this.logger.log(`[startProject] ${project.id} "${tempName}" (draft)`);
      return {
        ok: true,
        projectId: project.id,
        projectName: tempName,
        subdomain: project.subdomain ?? undefined,
      };
    } catch (err: any) {
      this.logger.error(`[startProject] 실패: ${err?.message}`);
      return { ok: false, reason: err?.message ?? String(err) };
    }
  }

  // Agent 작업 종료 시 — cwd 파일 수집 → generatedCode 업데이트 → status='active'
  // projectId는 startProject 결과를 받아 전달
  async finishProject(input: ProjectPersistenceInput & { projectId?: string }): Promise<ProjectPersistenceResult> {
    const { userId, cwd, userPrompt, projectId } = input;

    if (!userId || userId === 'anon') {
      return { ok: false, reason: '비로그인 사용자 — 프로젝트 저장 생략' };
    }
    if (!projectId) {
      // 레거시 경로 — startProject 없이 바로 persist()를 쓰던 호출 그대로 처리
      return this.persist({ userId, cwd, userPrompt });
    }

    try {
      const projectRoot = this.findProjectRoot(cwd);
      const files = this.collectFiles(projectRoot);
      if (files.length === 0) {
        return { ok: false, reason: '수집된 파일 없음 (빈 앱)' };
      }

      const name = this.deriveName(projectRoot, cwd, userPrompt);
      await this.projectService.update(projectId, String(userId), {
        name,
        generatedCode: files as any,
        status: 'active',
      });

      this.logger.log(`[finishProject] ${projectId} "${name}" (${files.length} files)`);
      return {
        ok: true,
        projectId,
        projectName: name,
        fileCount: files.length,
      };
    } catch (err: any) {
      this.logger.error(`[finishProject] 실패: ${err?.message}`, err?.stack);
      return { ok: false, reason: err?.message ?? String(err) };
    }
  }

  // 레거시 — startProject 없이 한 번에 create+update (호환성 유지)
  async persist(input: ProjectPersistenceInput): Promise<ProjectPersistenceResult> {
    const { userId, cwd, userPrompt } = input;

    if (!userId || userId === 'anon') {
      return { ok: false, reason: '비로그인 사용자 — 프로젝트 저장 생략' };
    }

    try {
      const projectRoot = this.findProjectRoot(cwd);
      const files = this.collectFiles(projectRoot);

      if (files.length === 0) {
        return { ok: false, reason: '수집된 파일 없음 (빈 앱)' };
      }

      const name = this.deriveName(projectRoot, cwd, userPrompt);
      const description = `Agent Mode로 생성 — "${userPrompt.slice(0, 80)}"`;

      // 1) projects.create — subdomain 자동 배정
      const project = await this.projectService.create(String(userId), {
        name,
        description,
        template: 'agent-mode', // 기존 /builder와 구분
      });

      // 2) 파일을 generatedCode로 저장 + status = active
      //    기존 /builder 빌드 파이프라인과 동일 포맷 — 재사용 가능
      await this.projectService.update(project.id, String(userId), {
        generatedCode: files as any,
        status: 'active',
      });

      this.logger.log(
        `[persist] ${project.id} "${name}" (${files.length} files, subdomain=${project.subdomain})`,
      );

      return {
        ok: true,
        projectId: project.id,
        projectName: name,
        subdomain: project.subdomain ?? undefined,
        fileCount: files.length,
      };
    } catch (err: any) {
      this.logger.error(`[persist] 실패: ${err?.message}`, err?.stack);
      return { ok: false, reason: err?.message ?? String(err) };
    }
  }
}
