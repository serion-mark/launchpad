import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '../prisma.service';
import {
  renderAgentNginxConf,
  agentConfFileNames,
} from './nginx-template';

const execAsync = promisify(exec);

// Agent Mode SSR 배포 파이프라인 — Plan v3 § Day 4.5 원 설계 복구
// 기존 deploy.service.ts (static export) 는 건드리지 않음
// 1) /tmp sandbox → /var/www/apps/<sub>/ 복사
// 2) npm install + next build (SSR 빌드)
// 3) 포트 할당 (3500~3999, 3중 락)
// 4) pm2 start npm --name "agent-<id>" -- start (= next start = SSR)
// 5) nginx sites-available/agent-<sub>.conf 생성 + symlink + reload
// 6) projects 테이블 업데이트 (deployedUrl, status=deployed, projectContext.agentServicePort)

const PORT_RANGE_START = 3500;
const PORT_RANGE_END = 3999;
const BUILD_TIMEOUT_MS = 10 * 60 * 1000;   // 10분 (npm install + build)
const INSTALL_TIMEOUT_MS = 6 * 60 * 1000;  // 6분

export type DeployAgentInput = {
  projectId: string;
  userId: string;
  cwd: string;          // /tmp/foundry-agent-<user>-<uuid>/
  projectRoot?: string; // cwd 하위 package.json 있는 디렉토리 (없으면 자동 탐색)
};

export type DeployAgentResult =
  | { ok: true; previewUrl: string; subdomain: string; port: number; logTail: string }
  | { ok: false; error: string; stage: string; logTail?: string };

@Injectable()
export class AgentDeployService {
  private readonly logger = new Logger(AgentDeployService.name);
  // Node 프로세스 내 Promise chain 뮤틱스 (pm2 fork 1 인스턴스 전제)
  private mutexChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  async deployAgent(input: DeployAgentInput): Promise<DeployAgentResult> {
    const { projectId, userId } = input;
    const log: string[] = [];
    const append = (msg: string) => {
      this.logger.log(`[deploy-agent ${projectId}] ${msg}`);
      log.push(`[${new Date().toISOString()}] ${msg}`);
    };
    const logTail = () => log.slice(-30).join('\n');

    // ── 0. 프로젝트 조회 ──────────────────────────
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { ok: false, error: 'project not found', stage: 'lookup' };
    if (project.userId !== userId) return { ok: false, error: 'forbidden', stage: 'lookup' };
    if (!project.subdomain) return { ok: false, error: 'subdomain 미배정', stage: 'lookup' };
    const subdomain = project.subdomain;
    append(`시작 — subdomain=${subdomain}`);

    // ── 1. 프로젝트 루트 찾기 ───────────────────
    const projectRoot = input.projectRoot ?? (await this.findProjectRoot(input.cwd));
    try {
      await fs.access(path.join(projectRoot, 'package.json'));
    } catch {
      return { ok: false, error: 'package.json 없음 (SSR 불가)', stage: 'root', logTail: logTail() };
    }
    append(`project root: ${projectRoot}`);

    const destDir = `/var/www/apps/${subdomain}`;
    const pmName = `agent-${projectId.slice(-12)}`;

    try {
      // ── 2. buildStatus=building ───────────────────
      await this.prisma.project.update({
        where: { id: projectId },
        data: { buildStatus: 'building', buildStartedAt: new Date(), buildLog: null },
      });

      // ── 3. 포트 할당 (3중 락) ─────────────────
      const port = await this.allocatePort(projectId);
      append(`포트 할당: ${port}`);

      // ── 4. /var/www/apps/<sub>/ 로 복사 ──────────
      //    기존 디렉토리 있으면 깨끗이 지우고 재복사 (재배포 시나리오)
      await execAsync(`rm -rf "${destDir}" && mkdir -p "${destDir}"`);
      // cp -a 로 권한/심볼릭 링크 보존
      await execAsync(`cp -a "${projectRoot}/." "${destDir}/"`, { timeout: 60_000 });
      append(`파일 복사 완료 → ${destDir}`);

      // node_modules 가 복사됐으면 삭제 (재설치)
      await execAsync(`rm -rf "${destDir}/node_modules" "${destDir}/.next"`).catch(() => {});

      // ── 5. npm install ───────────────────────────
      append('npm install 시작...');
      try {
        const env = { ...process.env };
        delete env.NODE_ENV;
        await execAsync('npm install --legacy-peer-deps 2>&1', {
          cwd: destDir,
          env,
          timeout: INSTALL_TIMEOUT_MS,
          maxBuffer: 50 * 1024 * 1024,
        });
        append('npm install 완료');
      } catch (err: any) {
        const stderr = String(err?.stderr ?? err?.stdout ?? err?.message ?? err).slice(0, 2000);
        append(`npm install 실패: ${stderr.slice(0, 500)}`);
        await this.markFailed(projectId, stderr, log);
        return { ok: false, error: 'npm install 실패', stage: 'install', logTail: logTail() };
      }

      // ── 6. next build (SSR 빌드 — static export 아님) ──
      //     이 빌드가 성공하면 next start 로 SSR 동작
      append('next build 시작...');
      try {
        await execAsync('npm run build 2>&1', {
          cwd: destDir,
          timeout: BUILD_TIMEOUT_MS,
          maxBuffer: 50 * 1024 * 1024,
        });
        append('next build 완료');
      } catch (err: any) {
        const stderr = String(err?.stderr ?? err?.stdout ?? err?.message ?? err).slice(0, 3000);
        append(`next build 실패: ${stderr.slice(0, 800)}`);
        await this.markFailed(projectId, stderr, log);
        return { ok: false, error: 'next build 실패', stage: 'build', logTail: logTail() };
      }

      // ── 7. PM2 start npm -- start (= next start = SSR) ──
      // 기존 프로세스 있으면 정리 (재배포)
      await execAsync(`pm2 delete ${pmName} 2>&1`).catch(() => {});
      const pm2Cmd =
        `PORT=${port} pm2 start npm --name "${pmName}" --cwd "${destDir}" ` +
        `--max-memory-restart 400M --time -- start 2>&1`;
      try {
        const { stdout } = await execAsync(pm2Cmd, { timeout: 30_000 });
        append(`pm2 start 완료: ${stdout.split('\n').slice(-3).join(' | ').slice(0, 200)}`);
      } catch (err: any) {
        const stderr = String(err?.stderr ?? err?.stdout ?? err?.message).slice(0, 1000);
        append(`pm2 start 실패: ${stderr.slice(0, 300)}`);
        await this.markFailed(projectId, stderr, log);
        return { ok: false, error: 'pm2 start 실패', stage: 'pm2', logTail: logTail() };
      }
      await execAsync('pm2 save 2>&1').catch(() => {});

      // ── 8. nginx 설정 생성 + symlink + reload ──
      const conf = renderAgentNginxConf(subdomain, port, projectId);
      const { available, enabled } = agentConfFileNames(subdomain);
      await fs.writeFile(available, conf, 'utf8');
      // symlink 이미 있으면 재생성
      await fs.unlink(enabled).catch(() => {});
      await fs.symlink(available, enabled);
      append(`nginx 설정 작성: ${available}`);

      try {
        await execAsync('nginx -t 2>&1');
        await execAsync('nginx -s reload 2>&1');
        append('nginx reload 완료');
      } catch (err: any) {
        const stderr = String(err?.stderr ?? err?.stdout ?? err?.message).slice(0, 1000);
        append(`nginx reload 실패: ${stderr.slice(0, 300)}`);
        // 롤백: 방금 만든 symlink 제거, pm2 delete
        await fs.unlink(enabled).catch(() => {});
        await execAsync(`pm2 delete ${pmName}`).catch(() => {});
        await this.markFailed(projectId, stderr, log);
        return { ok: false, error: 'nginx reload 실패', stage: 'nginx', logTail: logTail() };
      }

      // ── 9. projects 테이블 업데이트 ──
      const previewUrl = `https://${subdomain}.foundry.ai.kr`;
      const trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 무료 체험
      const existingContext = (project.projectContext as any) ?? {};
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'deployed',
          buildStatus: 'done',
          deployedUrl: previewUrl,
          buildFinishedAt: new Date(),
          buildLog: log.join('\n').slice(-50_000),
          projectContext: {
            ...existingContext,
            agentServicePort: port,
            agentSsrMode: true,
            trialDeployed: true,
            trialExpiresAt: trialExpiresAt.toISOString(),
          } as any,
        },
      });
      append(`배포 완료 — ${previewUrl}`);

      return { ok: true, previewUrl, subdomain, port, logTail: logTail() };
    } catch (err: any) {
      append(`예기치 못한 예외: ${err?.message ?? err}`);
      await this.markFailed(projectId, String(err?.stack ?? err?.message ?? err), log).catch(() => {});
      return { ok: false, error: err?.message ?? String(err), stage: 'unknown', logTail: logTail() };
    }
  }

  // ── 포트 할당 (3중 락) ─────────────────────
  private async allocatePort(projectId: string): Promise<number> {
    return this.withMutex(async () => {
      // ② DB에서 사용 중 포트 조회
      const projects = await this.prisma.project.findMany({
        where: { projectContext: { not: null as any } },
        select: { id: true, projectContext: true },
      });
      const used = new Set<number>();
      for (const p of projects) {
        const ctx = p.projectContext as any;
        if (p.id === projectId) continue; // 자기 자신은 (재배포 시) 재사용
        if (ctx && typeof ctx.agentServicePort === 'number') used.add(ctx.agentServicePort);
      }
      for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
        if (used.has(port)) continue;
        // ③ 실제 listen 테스트
        if (await this.isPortFree(port)) return port;
      }
      throw new Error(`가용 포트 없음 (${PORT_RANGE_START}~${PORT_RANGE_END})`);
    });
  }

  private isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });
  }

  // ① Node 뮤틱스 (Promise chain)
  private withMutex<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.mutexChain;
    const next = prev.then(fn, fn);
    // 다음 대기자는 성공/실패 상관없이 이어감
    this.mutexChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next as Promise<T>;
  }

  // cwd 에서 package.json 있는 프로젝트 루트 탐색
  private async findProjectRoot(cwd: string): Promise<string> {
    try {
      const entries = await fs.readdir(cwd, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const sub = path.join(cwd, e.name);
        try {
          await fs.access(path.join(sub, 'package.json'));
          return sub;
        } catch {}
      }
      await fs.access(path.join(cwd, 'package.json'));
      return cwd;
    } catch {
      return cwd;
    }
  }

  private async markFailed(projectId: string, errMsg: string, log: string[]): Promise<void> {
    await this.prisma.project
      .update({
        where: { id: projectId },
        data: {
          buildStatus: 'failed',
          buildFinishedAt: new Date(),
          buildLog: (log.join('\n') + '\n[ERROR] ' + errMsg).slice(-50_000),
        },
      })
      .catch(() => {});
  }
}
