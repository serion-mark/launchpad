import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

// Phase I (2026-04-22): Agent Mode 답지 카드 첨부 이미지 저장
//   저장 위치: `/tmp/foundry-attachments/<sandboxSessionId>/<uuid>.<ext>`
//   세션 종료 시 sandbox cleanup 과 함께 정리 (세션 단위 TTL)
//   크기 제한: 5MB / 장, 최대 3장 / 세션
//   형식: PNG / JPG / JPEG / WEBP 만

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_SESSION = 3;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export type SavedAttachment = {
  filename: string;   // 저장된 파일명 (uuid 기반)
  path: string;       // 절대 경로 (Agent 가 Read 도구로 접근)
  size: number;
  mimetype: string;
  originalName: string;
};

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  private readonly root = path.join(os.tmpdir(), 'foundry-attachments');

  // 세션별 카운트 (간이 — 메모리 재시작 시 초기화, 악용 방지 일차 방어)
  private readonly sessionCount = new Map<string, number>();

  async ensureRoot(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  /** 업로드된 파일 저장 — Express Multer File 입력 */
  async save(
    sandboxSessionId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<SavedAttachment> {
    if (!sandboxSessionId || !file) {
      throw new BadRequestException('세션 또는 파일 누락');
    }

    // 형식 검증
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `지원하지 않는 형식 (${file.mimetype}). PNG/JPG/WEBP 만 가능.`,
      );
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException(`확장자 불허 (${ext})`);
    }

    // 크기 검증
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `파일 크기 초과 (${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 5MB)`,
      );
    }

    // 세션당 최대 개수
    const current = this.sessionCount.get(sandboxSessionId) ?? 0;
    if (current >= MAX_FILES_PER_SESSION) {
      throw new BadRequestException(
        `세션당 최대 ${MAX_FILES_PER_SESSION}장 까지 업로드 가능합니다`,
      );
    }

    // 저장 경로
    await this.ensureRoot();
    const sessionDir = path.join(this.root, sandboxSessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    const filename = `${randomUUID()}${ext}`;
    const abs = path.join(sessionDir, filename);
    await fs.writeFile(abs, file.buffer);

    this.sessionCount.set(sandboxSessionId, current + 1);
    this.logger.log(
      `[attachment] saved ${abs} (${file.size} bytes, ${file.mimetype})`,
    );
    return {
      filename,
      path: abs,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    };
  }

  /**
   * Phase AD Step 1 (2026-04-23): 세션 시작 전 업로드
   *   /start ReviewStage 또는 /meeting 종합보고서에서 Agent 시작 전에 이미지 업로드.
   *   - 첫 호출: existingFolder 없음 → 백엔드가 `pre-session-<userId>-<timestamp>` 생성
   *   - 두번째부터: 첫 응답의 sessionFolder 를 클라이언트가 다시 보내서 같은 폴더 누적
   *   - cleanup: Phase A1 (24h cron, 별도 작업)
   *   - 보안: existingFolder 가 본인 userId 로 시작하지 않으면 거부
   */
  async savePreSession(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    existingFolder?: string,
  ): Promise<SavedAttachment & { sessionFolder: string }> {
    if (!userId) {
      throw new BadRequestException('userId 누락');
    }
    let sessionFolder: string;
    if (existingFolder) {
      const expectedPrefix = `pre-session-${userId}-`;
      if (!existingFolder.startsWith(expectedPrefix)) {
        throw new BadRequestException('잘못된 sessionFolder (소유자 불일치)');
      }
      const tail = existingFolder.slice(expectedPrefix.length);
      if (!/^\d{10,16}$/.test(tail)) {
        throw new BadRequestException('잘못된 sessionFolder (형식 오류)');
      }
      sessionFolder = existingFolder;
    } else {
      sessionFolder = `pre-session-${userId}-${Date.now()}`;
    }
    const saved = await this.save(sessionFolder, file);
    return { ...saved, sessionFolder };
  }

  /** 세션 종료 시 정리 — 운영 cleanup 용 (추후 cron 또는 runWithSDK finally) */
  async cleanupSession(sandboxSessionId: string): Promise<void> {
    const dir = path.join(this.root, sandboxSessionId);
    try {
      await fs.rm(dir, { recursive: true, force: true });
      this.sessionCount.delete(sandboxSessionId);
      this.logger.log(`[attachment] cleanup ${dir}`);
    } catch (err: any) {
      this.logger.warn(`[attachment] cleanup 실패 (무시): ${err?.message}`);
    }
  }

  /** 세션의 모든 저장 첨부 경로 반환 */
  async list(sandboxSessionId: string): Promise<string[]> {
    const dir = path.join(this.root, sandboxSessionId);
    try {
      const entries = await fs.readdir(dir);
      return entries.map((e) => path.join(dir, e));
    } catch {
      return [];
    }
  }
}
