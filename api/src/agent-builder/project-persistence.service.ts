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

  // 사용자 prompt에서 프로젝트 이름 추정 (LLM 없이 간단 추출)
  // 우선순위: 루트 디렉토리명 > prompt 첫 20자 > 'agent-app'
  private deriveName(projectRoot: string, cwd: string, userPrompt: string): string {
    const dirName = path.basename(projectRoot);
    // cwd 이름(예: foundry-agent-xxx-xxx)이면 의미 있는 이름 아님
    if (dirName && !dirName.startsWith('foundry-agent-')) {
      return dirName.slice(0, 40);
    }
    const cleaned = (userPrompt ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (cleaned) return cleaned;
    return 'agent-app';
  }

  // Agent 작업 시작 시점에 projects 껍데기 먼저 생성 (status='draft')
  // 이유: 도구(provision_supabase / deploy_to_subdomain)가 projectId 필요
  async startProject(userId: string, userPrompt: string): Promise<ProjectPersistenceResult> {
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
