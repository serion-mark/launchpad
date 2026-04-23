import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Phase AD.1 (2026-04-23): 업로드 이미지 자동 정리 + 자가진단
//
// 배경
//   Phase AD 도입으로 /tmp/foundry-attachments/pre-session-<userId>-<ts>/ 폴더에
//   사용자 업로드 이미지가 누적됨. 24h 지난 폴더 자동 삭제 + 총 누적 크기 감시.
//
// 3중 안전망
//   1. 매시간 cron — 24h TTL 초과 폴더 rm -rf (deleted/kept 로그)
//   2. 30분마다 healthCheck — 총 크기 > 1GB WARN / > 3GB ERROR
//   3. 실패 시 다음 주기에 재시도 (멈추지 않음)
//
// 대상 폴더
//   pre-session-*  (Phase AD ReviewStage/meeting 업로드)
//   기타 UUID 형식  (Phase H/I 답지카드 업로드 = sandbox sessionId 디렉토리)
//
// 의존성: @nestjs/schedule 없이 순수 setInterval (최소 의존성)

const TTL_MS = 24 * 60 * 60 * 1000;          // 24h
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;  // 1h
const HEALTH_INTERVAL_MS = 30 * 60 * 1000;   // 30min
const WARN_BYTES = 1 * 1024 * 1024 * 1024;   // 1GB
const ERROR_BYTES = 3 * 1024 * 1024 * 1024;  // 3GB
const STARTUP_DELAY_MS = 15_000;             // 기동 후 15초 후 첫 실행 (시작 혼잡 회피)

@Injectable()
export class AttachmentCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttachmentCleanupService.name);
  private readonly root = path.join(os.tmpdir(), 'foundry-attachments');
  private cleanupTimer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private firstRunTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    // 기동 후 15초 뒤 첫 cleanup (서버 안정화 후)
    this.firstRunTimer = setTimeout(() => {
      this.cleanup().catch((e) => this.logger.error(`[cleanup] 첫 실행 실패: ${e?.message}`));
      this.healthCheck().catch((e) => this.logger.warn(`[health] 첫 실행 실패: ${e?.message}`));
    }, STARTUP_DELAY_MS);

    // 이후 주기 실행
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((e) => this.logger.error(`[cleanup] 주기 실행 실패: ${e?.message}`));
    }, CLEANUP_INTERVAL_MS);

    this.healthTimer = setInterval(() => {
      this.healthCheck().catch((e) => this.logger.warn(`[health] 주기 실행 실패: ${e?.message}`));
    }, HEALTH_INTERVAL_MS);

    this.logger.log(
      `[cleanup] 등록됨 — TTL=${TTL_MS / 3600_000}h / cleanup=${CLEANUP_INTERVAL_MS / 60_000}m / health=${HEALTH_INTERVAL_MS / 60_000}m`,
    );
  }

  onModuleDestroy() {
    if (this.firstRunTimer) clearTimeout(this.firstRunTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
  }

  /** 24h 지난 폴더 rm -rf */
  async cleanup(): Promise<void> {
    const entries = await fs.readdir(this.root).catch(() => null);
    if (!entries) return;

    const now = Date.now();
    let deleted = 0;
    let kept = 0;
    let totalKeptBytes = 0;
    let failed = 0;

    for (const name of entries) {
      const abs = path.join(this.root, name);
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat || !stat.isDirectory()) continue;

      // mtime 기준 — 폴더 내 파일이 추가되면 mtime 갱신됨
      // 실제로는 폴더 자체 mtime이 아닌 내용물까지 체크하는 게 안전
      const age = now - stat.mtimeMs;
      if (age > TTL_MS) {
        try {
          await fs.rm(abs, { recursive: true, force: true });
          deleted++;
        } catch (e: any) {
          failed++;
          this.logger.warn(`[cleanup] 삭제 실패 ${name}: ${e?.message}`);
        }
      } else {
        kept++;
        totalKeptBytes += await this.dirSize(abs);
      }
    }

    const keptMb = (totalKeptBytes / 1024 / 1024).toFixed(1);
    this.logger.log(
      `[cleanup] deleted=${deleted} kept=${kept} keptSize=${keptMb}MB failed=${failed}`,
    );
  }

  /** 총 누적 크기 감시 */
  async healthCheck(): Promise<void> {
    const totalBytes = await this.dirSize(this.root);
    const totalMb = (totalBytes / 1024 / 1024).toFixed(1);

    if (totalBytes > ERROR_BYTES) {
      this.logger.error(
        `[health] 🚨 누적 ${totalMb}MB > 3GB — 즉시 수동 확인 필요 (cleanup 실패 가능성)`,
      );
    } else if (totalBytes > WARN_BYTES) {
      this.logger.warn(`[health] ⚠️ 누적 ${totalMb}MB > 1GB — 모니터링 강화`);
    } else {
      this.logger.log(`[health] ok ${totalMb}MB`);
    }
  }

  /** 디렉토리 재귀 총 크기 (bytes) */
  private async dirSize(dir: string): Promise<number> {
    let total = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        total += await this.dirSize(abs);
      } else if (e.isFile()) {
        const stat = await fs.stat(abs).catch(() => null);
        if (stat) total += stat.size;
      }
    }
    return total;
  }
}
