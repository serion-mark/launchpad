import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fg from 'fast-glob';
import { SandboxService } from './sandbox.service';
import { AGENT_TOOL_TIMEOUT_MS } from './stream-event.types';
import type { SupabaseService } from '../supabase/supabase.service';
import type { ProjectPersistenceService } from './project-persistence.service';
import type { DeployService } from '../project/deploy.service';
import type { AgentDeployService } from './agent-deploy.service';

const execAsync = promisify(exec);

// Anthropic API tool schema (자비스가 쓰는 Bash/Write/Read/Glob/Grep 재현)
export const AGENT_TOOLS = [
  {
    name: 'Bash',
    description:
      'Runs a shell command in the project sandbox (cwd 제한). 명령 allowlist: npm, npx, node, yarn, pnpm, mkdir, rm(sandbox 내부만), ls, cat, echo, touch, cp, mv, git, tsc, prisma, pwd. 5분 timeout. 금지: sudo, ssh, curl 외부.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: '실행할 shell 명령' },
        description: { type: 'string', description: '이 명령이 뭘 하는지 한 줄 설명 (사용자에게 표시)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'Write',
    description: '파일 작성 또는 덮어쓰기. 경로는 sandbox cwd 기준 상대경로 또는 cwd 내부 절대경로.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: '쓸 파일 경로' },
        content: { type: 'string', description: '파일 내용 전체' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'Read',
    description: '파일 읽기. 경로는 sandbox cwd 기준.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: '읽을 파일 경로' },
      },
      required: ['path'],
    },
  },
  {
    name: 'Glob',
    description: '파일 패턴 매칭. sandbox cwd 내부만 검색.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'glob 패턴 (예: "**/*.tsx")' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Grep',
    description: '파일 내용 검색 (ripgrep). sandbox cwd 내부만.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: '검색 패턴 (정규식 가능)' },
        path: { type: 'string', description: '검색 경로 (cwd 상대, 생략 시 전체)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'provision_supabase',
    description:
      '답지에서 "Supabase 연결" 옵션을 고른 경우에만 호출. 새 Supabase 프로젝트를 자동 생성하고 SQL 스키마를 push한 뒤 .env.local 을 자동 작성한다. 사용자에게 "Supabase 붙일까요?" 같은 추가 질문은 금지 (답지에서 이미 받음).',
    input_schema: {
      type: 'object' as const,
      properties: {
        sqlSchema: {
          type: 'string',
          description: 'CREATE TABLE … 형태의 풀 SQL. RLS 정책 포함.',
        },
      },
      required: ['sqlSchema'],
    },
  },
  {
    name: 'deploy_to_subdomain',
    description:
      '답지에서 "서브도메인 배포 (1일 무료)" 옵션을 고른 경우에만 호출. 현재 sandbox 에 쌓인 코드를 projects.generatedCode 로 저장하고 기존 deploy-trial 파이프라인으로 배포한다. 사용자에게 "배포할까요?" 는 이미 답지에 있으므로 추가 질문 금지.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'check_build',
    description:
      '현재 sandbox 프로젝트에서 `npm run build` 를 실행해 빌드 가능 여부를 검증. 실패 시 에러 메시지를 받아 바로 수정하라.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'AskUser',
    description:
      '사용자에게 종합 카드로 한 번에 물어본다. 답지의 빈 칸이 여러 개일 때 사용 (꼬리 질문 금지, 원샷 1번만). 옵션마다 번호를 붙여 번호/클릭/자연어 3중 입력을 받는다. 작업 중에는 절대 사용하지 말고, 작업 시작 전에만 사용하라.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: '카드 상단에 표시될 한 줄 인사 (예: "미용실 예약앱 만들어드릴게요! 답지만 채우면 시작!")',
        },
        questions: {
          type: 'array',
          description: '최대 2~3개의 질문. 각 질문은 2~4개 옵션 + "기타" 포함.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '답지 필드 키 (예: "benchmarkSites")' },
              question: { type: 'string', description: '질문 한 줄' },
              emoji: { type: 'string' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    num: { type: 'number', description: '번호 [1] [2] [3]' },
                    label: { type: 'string' },
                    value: { type: 'string' },
                    needsInput: {
                      type: 'boolean',
                      description: '"기타 (직접 입력)" 같은 자유 입력 옵션',
                    },
                  },
                  required: ['num', 'label', 'value'],
                },
              },
            },
            required: ['id', 'question', 'options'],
          },
        },
        assumed: {
          type: 'object',
          description: 'AI가 미리 추정한 답지 칸 (✓ 추정 표시). 키=필드, 값=추정값.',
          additionalProperties: { type: 'string' },
        },
        inputHint: {
          type: 'string',
          description: '사용자 안내 (예: "1, 2, 1 같이 번호로 또는 자연어로 말씀해주세요")',
        },
        quickStartLabel: {
          type: 'string',
          description: '"그대로 시작" 버튼 라벨 (예: "추정값 그대로 바로 시작 →")',
        },
      },
      required: ['title', 'questions', 'inputHint', 'quickStartLabel'],
    },
  },
];

export type ToolResult = { ok: boolean; output: string; durationMs: number };

// 도구 실행 시 외부 서비스/컨텍스트 주입 — Day 4.5에서 Supabase + Deploy 연동용
export interface AgentToolDeps {
  supabase?: SupabaseService;
  deploy?: DeployService;        // 레거시 (static export). 현재 deploy_to_subdomain 은 agentDeploy 사용
  agentDeploy?: AgentDeployService; // SSR 파이프라인 (Plan v3 § Day 4.5 원 설계)
  persistence?: ProjectPersistenceService;
  userId?: string;
  projectId?: string;      // startProject 로 미리 생성된 id
  userPrompt?: string;     // 사용자 첫 발화 (finishProject 에 전달)
}

export class AgentToolExecutor {
  constructor(
    private readonly sandbox: SandboxService,
    private readonly cwd: string,
    private readonly deps: AgentToolDeps = {},
  ) {}

  async execute(name: string, input: any): Promise<ToolResult> {
    const start = Date.now();
    try {
      let output = '';
      switch (name) {
        case 'Bash':
          output = await this.bash(input.command);
          break;
        case 'Write':
          output = await this.write(input.path, input.content);
          break;
        case 'Read':
          output = await this.read(input.path);
          break;
        case 'Glob':
          output = await this.glob(input.pattern);
          break;
        case 'Grep':
          output = await this.grep(input.pattern, input.path);
          break;
        case 'provision_supabase':
          output = await this.provisionSupabase(input);
          break;
        case 'deploy_to_subdomain':
          output = await this.deployToSubdomain(input);
          break;
        case 'check_build':
          output = await this.checkBuild();
          break;
        default:
          return { ok: false, output: `미지의 도구: ${name}`, durationMs: Date.now() - start };
      }
      return { ok: true, output, durationMs: Date.now() - start };
    } catch (err: any) {
      return {
        ok: false,
        output: `[${name} 실패] ${err?.message ?? String(err)}`,
        durationMs: Date.now() - start,
      };
    }
  }

  private async bash(command: string): Promise<string> {
    if (!command || typeof command !== 'string') throw new Error('command 필수');
    const check = this.sandbox.isCommandAllowed(command);
    if (!check.ok) throw new Error(`명령 차단: ${check.reason}`);

    const { stdout, stderr } = await execAsync(command, {
      cwd: this.cwd,
      timeout: AGENT_TOOL_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: {
        ...process.env,
        // 사용자의 API 키 등 민감 정보 제거 (이 세션에 한정된 env만)
        ANTHROPIC_API_KEY: '',
        DATABASE_URL: '',
        JWT_SECRET: '',
      },
    });
    const out = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');
    return out.slice(0, 50000); // 응답 크기 제한
  }

  private async write(targetPath: string, content: string): Promise<string> {
    if (!targetPath) throw new Error('path 필수');
    if (typeof content !== 'string') throw new Error('content 필수 (문자열)');
    const abs = await this.sandbox.assertInsideCwd(this.cwd, targetPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    const rel = path.relative(this.cwd, abs);
    return `✓ 작성 완료: ${rel} (${content.length} bytes)`;
  }

  private async read(targetPath: string): Promise<string> {
    if (!targetPath) throw new Error('path 필수');
    const abs = await this.sandbox.assertInsideCwd(this.cwd, targetPath);
    const data = await fs.readFile(abs, 'utf8');
    return data.slice(0, 50000);
  }

  private async glob(pattern: string): Promise<string> {
    if (!pattern) throw new Error('pattern 필수');
    const files = await fg(pattern, {
      cwd: this.cwd,
      onlyFiles: false,
      dot: false,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });
    return files.slice(0, 500).join('\n') || '(매칭 없음)';
  }

  private async grep(pattern: string, subPath?: string): Promise<string> {
    if (!pattern) throw new Error('pattern 필수');
    const searchPath = subPath
      ? await this.sandbox.assertInsideCwd(this.cwd, subPath)
      : this.cwd;
    const safePattern = pattern.replace(/'/g, "'\\''");
    const cmd = `rg --no-heading --line-number --max-count=20 -- '${safePattern}' '${searchPath}' 2>&1 | head -200`;
    try {
      const { stdout } = await execAsync(cmd, {
        cwd: this.cwd,
        timeout: 30_000,
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout || '(매칭 없음)';
    } catch (err: any) {
      // rg exit code 1 = no match → 에러 아님
      if (err?.code === 1) return '(매칭 없음)';
      throw err;
    }
  }

  // ── Day 4.5 자동화 도구 ────────────────────────────────

  // cwd 에서 Next.js 프로젝트 루트 찾기 (package.json 기준)
  private async findProjectRoot(): Promise<string> {
    const entries = await fs.readdir(this.cwd, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const pkg = path.join(this.cwd, e.name, 'package.json');
      try {
        await fs.access(pkg);
        return path.join(this.cwd, e.name);
      } catch {}
    }
    try {
      await fs.access(path.join(this.cwd, 'package.json'));
      return this.cwd;
    } catch {}
    return this.cwd;
  }

  // provision_supabase — 기존 SupabaseService 재사용
  // 1) 새 Supabase 프로젝트 생성 + SQL push
  // 2) 프로젝트 루트에 .env.local 자동 작성 (NEXT_PUBLIC_*)
  private async provisionSupabase(input: any): Promise<string> {
    if (!this.deps.supabase) {
      throw new Error('Supabase 서비스 미주입 (AgentBuilderService 구성 확인)');
    }
    if (!this.deps.projectId) {
      throw new Error('projectId 없음 (startProject 선행 필요)');
    }
    const sqlSchema = String(input?.sqlSchema ?? '').trim();
    if (!sqlSchema) throw new Error('sqlSchema 필수');

    const appName = `agent-${this.deps.projectId.slice(-8)}`;
    const result = await this.deps.supabase.provisionForProject(
      this.deps.projectId,
      appName,
      sqlSchema,
    );
    if (!result.success) {
      throw new Error(result.error ?? 'Supabase 프로비저닝 실패');
    }

    // 프로젝트 루트에 .env.local 작성 (이미 있으면 append/overwrite)
    const root = await this.findProjectRoot();
    const envPath = path.join(root, '.env.local');
    const envContent =
      `NEXT_PUBLIC_SUPABASE_URL=${result.supabaseUrl}\n` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${result.supabaseAnonKey}\n`;
    await fs.writeFile(envPath, envContent, 'utf8');

    return (
      `✅ Supabase 자동 프로비저닝 완료\n` +
      `- URL: ${result.supabaseUrl}\n` +
      `- .env.local 자동 주입됨 (${path.relative(this.cwd, envPath)})\n` +
      `- 스키마 ${sqlSchema.split(';').filter(Boolean).length}개 SQL 문 실행됨`
    );
  }

  // deploy_to_subdomain — Plan v3 § Day 4.5 원 설계 (SSR 파이프라인)
  // 1) cwd 파일을 projects.generatedCode 로 저장 (finishProject, DB 동기화)
  // 2) AgentDeployService.deployAgent 호출 (복사 → npm install → next build → pm2 → nginx)
  // 3) 성공 시 HTTPS previewUrl 반환
  //
  // 기존 deploy.service.ts (static export) 은 안 씀 — 동적 라우트 / Server Component 호환 위해 SSR 전용.
  private async deployToSubdomain(_input: any): Promise<string> {
    if (!this.deps.agentDeploy || !this.deps.persistence) {
      throw new Error('AgentDeployService/Persistence 미주입');
    }
    if (!this.deps.projectId || !this.deps.userId) {
      throw new Error('projectId/userId 없음 (startProject 선행 필요)');
    }

    // 1) 파일 스냅샷 DB 저장 (수정 세션에서도 최신 코드 유지)
    const persistResult = await this.deps.persistence.finishProject({
      userId: this.deps.userId,
      cwd: this.cwd,
      userPrompt: this.deps.userPrompt ?? '',
      projectId: this.deps.projectId,
    });
    if (!persistResult.ok) {
      throw new Error(`파일 저장 실패: ${persistResult.reason}`);
    }

    // 2) SSR 배포 파이프라인 실행 (동기 실행 — 완료까지 대기)
    //    복잡한 앱은 2~5분 걸릴 수 있음. Agent loop 이 기다려준다.
    const result = await this.deps.agentDeploy.deployAgent({
      projectId: this.deps.projectId,
      userId: this.deps.userId,
      cwd: this.cwd,
    });

    if (result.ok === false) {
      const logPart = result.logTail ? `\n\n[로그 tail]\n${result.logTail.slice(-1500)}` : '';
      throw new Error(
        `배포 실패 (${result.stage}): ${result.error}${logPart}`,
      );
    }

    return (
      `✅ 서브도메인 배포 완료 (SSR 모드, 1일 무료 체험)\n` +
      `- URL: ${result.previewUrl}\n` +
      `- 포트: ${result.port}\n` +
      `- 서브도메인: ${result.subdomain}\n` +
      `- 동적 라우트 + Server Component + next/headers 모두 지원됨`
    );
  }

  // check_build — cwd 프로젝트에서 npm run build 실행
  private async checkBuild(): Promise<string> {
    const root = await this.findProjectRoot();
    const rel = path.relative(this.cwd, root);
    const cwdFlag = rel ? ` --prefix ${rel}` : '';
    try {
      const { stdout, stderr } = await execAsync(
        `npm run build${cwdFlag} 2>&1 | tail -60`,
        {
          cwd: this.cwd,
          timeout: AGENT_TOOL_TIMEOUT_MS,
          maxBuffer: 10 * 1024 * 1024,
        },
      );
      const out = (stdout + stderr).slice(0, 10000);
      return `✅ 빌드 성공\n${out}`;
    } catch (err: any) {
      const out = (err?.stdout ?? '') + (err?.stderr ?? '');
      throw new Error(`빌드 실패\n${out.slice(0, 5000)}`);
    }
  }
}
