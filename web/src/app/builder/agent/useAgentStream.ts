// Agent Mode SSE 훅 — POST /api/ai/agent-build 스트림 수신 + /answer 전송
// 기존 /builder 플로우와 격리

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, getToken } from '@/lib/api';

// 백엔드 stream-event.types.ts 와 동일 구조
export interface CardOption {
  num: number;
  label: string;
  value: string;
  needsInput?: boolean;
}
export interface CardQuestion {
  id: string;
  question: string;
  emoji?: string;
  options: CardOption[];
}
export interface CardRequest {
  pendingId: string;
  title: string;
  questions: CardQuestion[];
  assumed?: Record<string, string>;
  inputHint: string;
  quickStart: { label: string; value: 'DEFAULT_ALL' };
  allowFreeText: true;
}

export type AgentEvent =
  | { type: 'start'; sessionId: string; cwd: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; ok: boolean; output: string; durationMs: number }
  | { type: 'assistant_text'; text: string }
  | { type: 'iteration'; n: number; stopReason?: string }
  | { type: 'card_request'; card: CardRequest }
  | { type: 'card_answered'; pendingId: string; answerSummary: string }
  | { type: 'complete'; totalIterations: number; totalCostUsd?: number; durationMs: number }
  | { type: 'error'; message: string; where?: string };

export type ChatEntry =
  | { kind: 'user'; text: string; ts: number }
  | { kind: 'assistant'; text: string; ts: number }
  | { kind: 'tool'; name: string; input: unknown; output?: string; ok?: boolean; durationMs?: number; ts: number }
  | { kind: 'card'; card: CardRequest; answered?: string; ts: number }
  | { kind: 'system'; text: string; ts: number };

export interface UseAgentStreamState {
  entries: ChatEntry[];
  status: 'idle' | 'streaming' | 'awaiting_answer' | 'complete' | 'error';
  sessionId: string | null;
  pendingCard: CardRequest | null;
  error: string | null;
  costUsd: number;
  // 실시간 활동 표시용 — 사용자가 진행 상황을 체감할 수 있도록
  lastActivity: string;        // 최신 도구/텍스트의 짧은 요약
  iteration: number;           // 현재 iter 번호
  toolCount: number;           // 누적 도구 호출 수
  submittingAnswer: boolean;   // 답변 POST 중 (answer → 서버 도달 전)
}

export function useAgentStream() {
  const [state, setState] = useState<UseAgentStreamState>({
    entries: [],
    status: 'idle',
    sessionId: null,
    pendingCard: null,
    error: null,
    costUsd: 0,
    lastActivity: '',
    iteration: 0,
    toolCount: 0,
    submittingAnswer: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const append = useCallback((entry: ChatEntry) => {
    setState((s) => ({ ...s, entries: [...s.entries, entry] }));
  }, []);

  const handleEvent = useCallback(
    (ev: AgentEvent) => {
      switch (ev.type) {
        case 'start':
          setState((s) => ({
            ...s,
            sessionId: ev.sessionId,
            status: 'streaming',
            lastActivity: '🚀 세션 시작 — Agent 준비 중...',
          }));
          append({ kind: 'system', text: `세션 시작 (${ev.sessionId.slice(0, 8)})`, ts: Date.now() });
          break;
        case 'iteration':
          setState((s) => ({
            ...s,
            iteration: ev.n,
            lastActivity: `🧠 Agent 생각 중... (iter ${ev.n})`,
          }));
          break;
        case 'assistant_text': {
          const preview = ev.text.replace(/\s+/g, ' ').slice(0, 60);
          setState((s) => ({ ...s, lastActivity: `💬 ${preview}${ev.text.length > 60 ? '...' : ''}` }));
          append({ kind: 'assistant', text: ev.text, ts: Date.now() });
          break;
        }
        case 'tool_call': {
          const input = ev.input as any;
          let summary = ev.name;
          if (ev.name === 'Bash') summary = `💻 실행: ${String(input?.command ?? '').slice(0, 50)}`;
          else if (ev.name === 'Write') summary = `📝 작성: ${input?.path ?? ''}`;
          else if (ev.name === 'Read') summary = `📖 읽기: ${input?.path ?? ''}`;
          else if (ev.name === 'Glob') summary = `🔍 탐색: ${input?.pattern ?? ''}`;
          else if (ev.name === 'Grep') summary = `🔎 검색: "${input?.pattern ?? ''}"`;
          else if (ev.name === 'AskUser') summary = `❓ 질문 카드 준비`;
          setState((s) => ({
            ...s,
            lastActivity: summary,
            toolCount: s.toolCount + 1,
          }));
          append({
            kind: 'tool',
            name: ev.name,
            input: ev.input,
            ts: Date.now(),
          });
          break;
        }
        case 'tool_result':
          setState((s) => {
            const reversed = [...s.entries].reverse();
            const lastToolIdx = reversed.findIndex((e) => e.kind === 'tool' && e.output === undefined);
            if (lastToolIdx === -1) return s;
            const realIdx = s.entries.length - 1 - lastToolIdx;
            const updated = [...s.entries];
            updated[realIdx] = {
              ...updated[realIdx],
              output: ev.output,
              ok: ev.ok,
              durationMs: ev.durationMs,
            } as ChatEntry;
            return {
              ...s,
              entries: updated,
              lastActivity: ev.ok ? '✅ 완료 — 다음 단계 준비 중' : '⚠️ 오류 — 수정 시도 중',
            };
          });
          break;
        case 'card_request':
          setState((s) => ({
            ...s,
            pendingCard: ev.card,
            status: 'awaiting_answer',
            lastActivity: '👉 답변을 기다리는 중',
            submittingAnswer: false,
          }));
          append({ kind: 'card', card: ev.card, ts: Date.now() });
          break;
        case 'card_answered':
          setState((s) => {
            const updated = s.entries.map((e) =>
              e.kind === 'card' && e.card.pendingId === ev.pendingId
                ? { ...e, answered: ev.answerSummary }
                : e,
            );
            return {
              ...s,
              pendingCard: null,
              entries: updated,
              status: 'streaming',
              submittingAnswer: false,
              lastActivity: '🧠 답변 반영 — 작업 재개',
            };
          });
          break;
        case 'complete':
          setState((s) => ({
            ...s,
            status: 'complete',
            costUsd: ev.totalCostUsd ?? s.costUsd,
            lastActivity: '🎉 작업 완료',
          }));
          // 비용 달러 UI 노출 X — 향후 크레딧 단위로 전환 예정
          append({
            kind: 'system',
            text: `완료 — ${ev.totalIterations} steps · ${(ev.durationMs / 1000).toFixed(1)}s`,
            ts: Date.now(),
          });
          break;
        case 'error':
          setState((s) => ({
            ...s,
            status: 'error',
            error: ev.message,
            lastActivity: `❌ ${ev.message}`,
          }));
          append({ kind: 'system', text: `❌ ${ev.message}`, ts: Date.now() });
          break;
      }
    },
    [append],
  );

  // 수동 Fetch + ReadableStream 으로 SSE 수신 (POST + JWT 헤더 필요)
  const start = useCallback(
    async (prompt: string) => {
      if (state.status === 'streaming' || state.status === 'awaiting_answer') return;

      setState({
        entries: [{ kind: 'user', text: prompt, ts: Date.now() }],
        status: 'streaming',
        sessionId: null,
        pendingCard: null,
        error: null,
        costUsd: 0,
        lastActivity: '🚀 Agent 연결 중...',
        iteration: 0,
        toolCount: 0,
        submittingAnswer: false,
      });

      const controller = new AbortController();
      abortRef.current = controller;

      const token = getToken();
      let res: Response;
      try {
        res = await fetch(`${API_BASE}/ai/agent-build`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });
      } catch (err: any) {
        handleEvent({ type: 'error', message: err?.message ?? 'fetch 실패' });
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        handleEvent({ type: 'error', message: `HTTP ${res.status}: ${text}` });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        handleEvent({ type: 'error', message: '응답 스트림 없음' });
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: "data: {...}\n\n" 단위 파싱
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = chunk.trim();
          if (!line.startsWith('data:')) continue;
          const json = line.slice('data:'.length).trim();
          if (!json) continue;
          try {
            const ev = JSON.parse(json) as AgentEvent;
            handleEvent(ev);
          } catch {
            // 손상된 이벤트 스킵
          }
        }
      }
    },
    [state.status, handleEvent],
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (state.status !== 'awaiting_answer' || !state.sessionId || !state.pendingCard) return;
      // 즉시 UI 피드백 — 답변 전송 중 상태
      setState((s) => ({
        ...s,
        submittingAnswer: true,
        lastActivity: '📤 답변 전송 중...',
      }));
      append({ kind: 'user', text: answer, ts: Date.now() });

      const token = getToken();
      try {
        const res = await fetch(
          `${API_BASE}/ai/agent-build/${state.sessionId}/answer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ answer, pendingId: state.pendingCard.pendingId }),
          },
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => res.statusText);
          setState((s) => ({ ...s, submittingAnswer: false }));
          append({ kind: 'system', text: `답변 전달 실패: ${txt}`, ts: Date.now() });
          return;
        }
        // 성공 — card_answered 이벤트가 오면 submittingAnswer=false로 전환됨
      } catch (err: any) {
        setState((s) => ({ ...s, submittingAnswer: false }));
        append({ kind: 'system', text: `답변 전달 실패: ${err?.message}`, ts: Date.now() });
      }
    },
    [state.status, state.sessionId, state.pendingCard, append],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, status: 'idle' }));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, start, submitAnswer, cancel };
}
