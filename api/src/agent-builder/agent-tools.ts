import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fg from 'fast-glob';
import { SandboxService } from './sandbox.service';
import { AGENT_TOOL_TIMEOUT_MS } from './stream-event.types';

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

export class AgentToolExecutor {
  constructor(
    private readonly sandbox: SandboxService,
    private readonly cwd: string,
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
}
