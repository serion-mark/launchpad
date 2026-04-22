import { Injectable, Logger } from '@nestjs/common';
import type { CardRequest } from './stream-event.types';
import { CARD_ANSWER_TIMEOUT_MS } from './stream-event.types';

// Agent loop이 AskUser 도구를 호출하면 loop이 await로 대기.
// 사용자가 POST /agent-build/:sessionId/answer 로 답변 보내면 waiter resolve.
// Day 3: in-memory Map (Day 5+에서 Redis 등으로 확장 가능)

// Phase I (2026-04-22): attachments 추가 — 이미지 파일 절대 경로 배열
export type AnswerPayload = {
  answer: string;
  attachments: string[];  // Claude vision 이 Read 도구로 읽을 이미지 경로들
};

type PendingEntry = {
  sessionId: string;
  pendingId: string;
  card: CardRequest;
  resolve: (payload: AnswerPayload) => void;
  reject: (err: Error) => void;
  timeoutHandle: NodeJS.Timeout;
  createdAt: number;
};

@Injectable()
export class SessionStoreService {
  private readonly logger = new Logger(SessionStoreService.name);
  // key = `${sessionId}:${pendingId}`
  private readonly pendings = new Map<string, PendingEntry>();
  // sessionId → 현재 대기 중인 pendingId (한 세션에 하나만)
  private readonly currentPendingBySession = new Map<string, string>();

  // Agent loop이 AskUser 호출 → 카드 방출 후 이 메서드로 답변 대기
  // Phase I (2026-04-22): 반환 타입 string → AnswerPayload (attachments 포함)
  waitForAnswer(sessionId: string, pendingId: string, card: CardRequest): Promise<AnswerPayload> {
    const key = `${sessionId}:${pendingId}`;

    // 같은 세션의 이전 대기 있으면 reject (새 AskUser가 덮어씀 — 드문 케이스)
    const prev = this.currentPendingBySession.get(sessionId);
    if (prev) {
      const prevEntry = this.pendings.get(`${sessionId}:${prev}`);
      if (prevEntry) {
        clearTimeout(prevEntry.timeoutHandle);
        prevEntry.reject(new Error('새 AskUser로 덮어씀'));
        this.pendings.delete(`${sessionId}:${prev}`);
      }
    }

    return new Promise<AnswerPayload>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendings.delete(key);
        if (this.currentPendingBySession.get(sessionId) === pendingId) {
          this.currentPendingBySession.delete(sessionId);
        }
        reject(new Error(`답변 대기 timeout (${CARD_ANSWER_TIMEOUT_MS / 1000}s)`));
      }, CARD_ANSWER_TIMEOUT_MS);

      this.pendings.set(key, {
        sessionId,
        pendingId,
        card,
        resolve,
        reject,
        timeoutHandle,
        createdAt: Date.now(),
      });
      this.currentPendingBySession.set(sessionId, pendingId);
      this.logger.log(`[session-store] 답변 대기: ${key}`);
    });
  }

  // 사용자가 답변 전송 → 매칭되는 waiter resolve
  // pendingId 지정 없이 sessionId만으로도 현재 pending을 해결할 수 있게 함
  // Phase I (2026-04-22): attachments 배열 추가 (이미지 절대 경로)
  submitAnswer(
    sessionId: string,
    pendingIdOrNull: string | null,
    answer: string,
    attachments: string[] = [],
  ): { ok: true } | { ok: false; reason: string } {
    const pendingId = pendingIdOrNull ?? this.currentPendingBySession.get(sessionId);
    if (!pendingId) return { ok: false, reason: '대기 중인 카드 없음' };

    const key = `${sessionId}:${pendingId}`;
    const entry = this.pendings.get(key);
    if (!entry) return { ok: false, reason: '카드를 찾을 수 없음' };

    clearTimeout(entry.timeoutHandle);
    entry.resolve({ answer, attachments });
    this.pendings.delete(key);
    this.currentPendingBySession.delete(sessionId);
    this.logger.log(
      `[session-store] 답변 수신: ${key} (attachments=${attachments.length}장)`,
    );
    return { ok: true };
  }

  // 세션 종료 (error 또는 클라이언트 연결 끊김)
  cancelSession(sessionId: string, reason: string): void {
    const pendingId = this.currentPendingBySession.get(sessionId);
    if (!pendingId) return;
    const key = `${sessionId}:${pendingId}`;
    const entry = this.pendings.get(key);
    if (entry) {
      clearTimeout(entry.timeoutHandle);
      entry.reject(new Error(`세션 취소: ${reason}`));
      this.pendings.delete(key);
    }
    this.currentPendingBySession.delete(sessionId);
  }

  // 진단용
  getPendingInfo(sessionId: string): { pendingId: string; card: CardRequest; ageMs: number } | null {
    const pendingId = this.currentPendingBySession.get(sessionId);
    if (!pendingId) return null;
    const entry = this.pendings.get(`${sessionId}:${pendingId}`);
    if (!entry) return null;
    return { pendingId, card: entry.card, ageMs: Date.now() - entry.createdAt };
  }
}
