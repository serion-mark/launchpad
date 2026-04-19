// Agent Mode SSE 스트림 이벤트 타입
// 프론트엔드(채팅창 실시간 표시)와 백엔드(Agent loop) 사이 계약

// 종합 카드 — Agent가 AskUser 도구 호출 시 프론트에 전달할 구조
// 번호 선택([1][2]) + 자연어 + "그대로 시작" 3중 입력 지원
export interface CardQuestion {
  id: string;            // 답지 필드 키 (예: "benchmarkSites")
  question: string;      // 사용자에게 보일 질문
  emoji?: string;
  options: CardOption[]; // 2~4개 권장 + "기타" 옵션
}

export interface CardOption {
  num: number;            // [1] [2] [3] — 번호 입력용
  label: string;
  value: string;
  needsInput?: boolean;   // "기타 (직접 입력)" 같은 경우
}

export interface CardRequest {
  pendingId: string;                  // 이 카드에 응답할 때 사용할 ID
  title: string;                      // "예약 앱 만들어드릴게요! 답지만 채우면 시작!"
  questions: CardQuestion[];          // 최대 2~3개
  assumed?: Record<string, string>;   // AI가 미리 채운 칸 (✓ 추정)
  inputHint: string;                  // "1, 2, 1 같이 번호로 또는 자유롭게 말씀해주세요"
  quickStart: { label: string; value: 'DEFAULT_ALL' };
  allowFreeText: true;
}

// Day 4.6: 7단계 포비 정체성
// 사용자 화면에 노출되는 high-level 이벤트. raw 도구 호출은 devLog 로만.
export type FoundryStageId =
  | 'intent' | 'setup' | 'design' | 'pages' | 'verify' | 'database' | 'deploy';

export type AgentStreamEvent =
  | { type: 'start'; sessionId: string; cwd: string }
  | { type: 'thinking'; text: string }
  // ── 내부 로그 (devLog 용) ────────────────────
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; ok: boolean; output: string; durationMs: number }
  | { type: 'assistant_text'; text: string }
  | { type: 'iteration'; n: number; stopReason?: string }
  // ── 포비 고수준 이벤트 (사용자 UI용) ──────────
  | {
      type: 'foundry_progress';
      stage: FoundryStageId;
      label: string;          // "🏠 홈 페이지 디자인 중"
      emoji: string;           // 단계 이모지 (📋 📦 🎨 📄 🔍 🗄 🌐)
      percent: number;         // 0~100 (단계 완료 기준 추정)
      elapsedMs: number;
    }
  // ── 답지/완료 ─────────────────────────────
  | { type: 'card_request'; card: CardRequest }
  | { type: 'card_answered'; pendingId: string; answerSummary: string }
  | {
      type: 'complete';
      totalIterations: number;
      // totalCostUsd 는 고객 노출 금지 — 서버 로그(agent-builder.service.ts [cost])에만 기록
      durationMs: number;
      projectId?: string;
      projectName?: string;
      subdomain?: string;
      fileCount?: number;
      previewUrl?: string;     // Day 4.6: 배포 도구가 호출됐다면 설정됨
    }
  | { type: 'error'; message: string; where?: string };

export const AGENT_MAX_ITERATIONS = 100;
export const AGENT_TOOL_TIMEOUT_MS = 5 * 60 * 1000; // 5분
export const CARD_ANSWER_TIMEOUT_MS = 10 * 60 * 1000; // 사용자 응답 10분 대기
