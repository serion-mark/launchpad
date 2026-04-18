// Agent Mode SSE 스트림 이벤트 타입
// 프론트엔드(채팅창 실시간 표시)와 백엔드(Agent loop) 사이 계약

export type AgentStreamEvent =
  | { type: 'start'; sessionId: string; cwd: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; ok: boolean; output: string; durationMs: number }
  | { type: 'assistant_text'; text: string }
  | { type: 'iteration'; n: number; stopReason?: string }
  | { type: 'complete'; totalIterations: number; totalCostUsd?: number; durationMs: number }
  | { type: 'error'; message: string; where?: string };

export const AGENT_MAX_ITERATIONS = 100;
export const AGENT_TOOL_TIMEOUT_MS = 5 * 60 * 1000; // 5분
