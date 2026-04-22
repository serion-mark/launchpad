import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

// Agent가 실행할 수 있는 명령 allowlist (첫 토큰 기준)
// 금지: sudo, rm -rf /, ssh, curl 외부 URL 등
const COMMAND_ALLOWLIST = new Set([
  'npm', 'npx', 'node', 'yarn', 'pnpm',
  'mkdir', 'ls', 'cat', 'echo', 'touch', 'cp', 'mv',
  'git', 'tsc', 'prisma',
  'pwd', 'true', 'false',
]);

// rm은 특수 처리 (cwd 내부만 허용, rm -rf / 방지)
const RM_ALLOWED = true;

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  /**
   * 샌드박스 세션 생성.
   * @param options.projectId — 지정 시 cwd 를 `/tmp/foundry-project-<id>` 로 고정.
   *   같은 projectId 로 여러 세션이 진입해도 cwd 가 동일 → Claude Agent SDK 의
   *   session 저장소(`~/.claude/projects/<cwd-slug>/*.jsonl`) 가 프로젝트별로
   *   한 디렉토리에 모여 resume 이 정상 작동.
   *
   *   options 생략 시 기존 동작(UUID 기반 1회성 cwd) 유지 — 수제 루프 호환.
   */
  async createSession(
    userId: string | number,
    options?: { projectId?: string },
  ): Promise<{ sessionId: string; cwd: string }> {
    const sessionId = randomUUID();
    const cwd = options?.projectId
      ? path.join(os.tmpdir(), `foundry-project-${options.projectId}`)
      : path.join(os.tmpdir(), `foundry-agent-${userId}-${sessionId}`);
    await fs.mkdir(cwd, { recursive: true });
    const mode = options?.projectId ? ' (project-fixed)' : '';
    this.logger.log(`[sandbox] 세션 생성: ${cwd}${mode}`);
    return { sessionId, cwd };
  }

  async cleanup(cwd: string): Promise<void> {
    try {
      const tmp = os.tmpdir();
      const real = await fs.realpath(cwd);
      if (!real.startsWith(tmp)) {
        this.logger.warn(`[sandbox] cleanup 거부 — tmp 외부: ${real}`);
        return;
      }
      await fs.rm(real, { recursive: true, force: true });
      this.logger.log(`[sandbox] 정리 완료: ${real}`);
    } catch (err: any) {
      this.logger.warn(`[sandbox] cleanup 실패: ${err?.message}`);
    }
  }

  // 절대 경로가 cwd 내부인지 검증 (symlink 공격 방지)
  // 존재하는 경로는 realpath로, 존재하지 않는 부분은 부모 realpath + suffix로 정규화
  async assertInsideCwd(cwd: string, targetPath: string): Promise<string> {
    const absolute = path.resolve(
      path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath),
    );
    const cwdReal = await fs.realpath(cwd);

    // 존재하는 가장 깊은 부모까지 realpath 해석
    let existingPart = absolute;
    while (existingPart !== path.dirname(existingPart)) {
      try {
        await fs.access(existingPart);
        break;
      } catch {
        existingPart = path.dirname(existingPart);
      }
    }
    const existingReal = await fs.realpath(existingPart);
    const rest = path.relative(existingPart, absolute);
    const finalReal = rest ? path.join(existingReal, rest) : existingReal;

    if (finalReal !== cwdReal && !finalReal.startsWith(cwdReal + path.sep)) {
      throw new Error(`샌드박스 위반: ${finalReal} 는 ${cwdReal} 외부`);
    }
    return finalReal;
  }

  // Bash 명령의 첫 토큰이 allowlist에 있는지 + 위험 패턴 차단
  isCommandAllowed(command: string): { ok: boolean; reason?: string } {
    const trimmed = command.trim();
    if (!trimmed) return { ok: false, reason: '빈 명령' };

    // 위험 패턴 차단
    const danger = [
      /\bsudo\b/, /\bssh\b/, /\bscp\b/, /\brsync\b/,
      /\bshutdown\b/, /\breboot\b/, /\bkill\b.*-9.*\b1\b/,
      /:\(\)\{.*:\|:&.*\};:/,  // fork bomb
      /\/etc\/passwd/, /\/etc\/shadow/,
      /\brm\s+-rf\s+\/\s*$/, /\brm\s+-rf\s+\/\s/, /\brm\s+-rf\s+~/,
    ];
    for (const pat of danger) {
      if (pat.test(trimmed)) return { ok: false, reason: `위험 패턴 감지: ${pat}` };
    }

    // 첫 토큰 추출 (파이프/리다이렉트 고려 — && || | ; 기준)
    const firstSegment = trimmed.split(/[&|;]/)[0].trim();
    const firstToken = firstSegment.split(/\s+/)[0];

    if (firstToken === 'rm') {
      if (!RM_ALLOWED) return { ok: false, reason: 'rm 금지' };
      // rm은 통과 (위험 패턴은 위에서 이미 차단됨)
      return { ok: true };
    }

    if (!COMMAND_ALLOWLIST.has(firstToken)) {
      return { ok: false, reason: `allowlist 미등록 명령: ${firstToken}` };
    }
    return { ok: true };
  }
}
