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

export type AgentStreamEvent =
  | { type: 'start'; sessionId: string; cwd: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; ok: boolean; output: string; durationMs: number }
  | { type: 'assistant_text'; text: string }
  | { type: 'iteration'; n: number; stopReason?: string }
  | { type: 'card_request'; card: CardRequest }    // ⭐ Day 3: 종합 카드
  | { type: 'card_answered'; pendingId: string; answerSummary: string }
  | {
      type: 'complete';
      totalIterations: number;
      totalCostUsd?: number;
      durationMs: number;
      projectId?: string;       // "내 프로젝트"에 저장된 id
      projectName?: string;
      subdomain?: string;       // 배포 시 사용할 서브도메인 (예: "meditacker-abc")
      fileCount?: number;
    }
  | { type: 'error'; message: string; where?: string };

export const AGENT_MAX_ITERATIONS = 100;
export const AGENT_TOOL_TIMEOUT_MS = 5 * 60 * 1000; // 5분
export const CARD_ANSWER_TIMEOUT_MS = 10 * 60 * 1000; // 사용자 응답 10분 대기
