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

export type FoundryStageId =
  | 'intent' | 'setup' | 'design' | 'pages' | 'verify' | 'database' | 'deploy';

export type AgentEvent =
  | { type: 'start'; sessionId: string; cwd: string }
  | { type: 'thinking'; text: string }
  // 내부 로그 (devLog 전용)
  | { type: 'tool_call'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; ok: boolean; output: string; durationMs: number }
  | { type: 'assistant_text'; text: string }
  | { type: 'iteration'; n: number; stopReason?: string }
  // 포비 고수준 (사용자 UI)
  | {
      type: 'foundry_progress';
      stage: FoundryStageId;
      label: string;
      emoji: string;
      percent: number;
      elapsedMs: number;
    }
  | { type: 'card_request'; card: CardRequest }
  | { type: 'card_answered'; pendingId: string; answerSummary: string }
  | {
      type: 'complete';
      totalIterations: number;
      totalCostUsd?: number;
      durationMs: number;
      projectId?: string;
      projectName?: string;
      subdomain?: string;
      fileCount?: number;
      previewUrl?: string;
    }
  | { type: 'error'; message: string; where?: string };

// 개발자 모드 전용 raw 로그 (채팅창에는 안 보임)
export interface DevLog {
  ts: number;
  kind: 'tool' | 'text' | 'iter';
  text: string;
}

export type ChatEntry =
  | { kind: 'user'; text: string; ts: number }
  | { kind: 'assistant'; text: string; ts: number }
  | { kind: 'card'; card: CardRequest; answered?: string; ts: number }
  | { kind: 'system'; text: string; ts: number };

export interface UseAgentStreamState {
  entries: ChatEntry[];
  status: 'idle' | 'streaming' | 'awaiting_answer' | 'complete' | 'error';
  sessionId: string | null;
  pendingCard: CardRequest | null;
  error: string | null;
  costUsd: number;
  // 실시간 활동 표시용
  lastActivity: string;
  iteration: number;
  toolCount: number;
  submittingAnswer: boolean;
  // 실제 도구 호출이 있었는지 — FoundryProgress 노출 조건
  // (상의 모드에서 도구 안 쓰면 채팅 말풍선만, 빌드 단계 표 X)
  hasToolCall: boolean;
  // 포비 진행 상태 (Day 4.6)
  currentStage: FoundryStageId | null;
  currentLabel: string;
  completedStages: Set<FoundryStageId>;
  percent: number;
  // 완료 후 "내 프로젝트" 연결 정보
  projectId: string | null;
  projectName: string | null;
  subdomain: string | null;
  fileCount: number | null;
  previewUrl: string | null;
  // 개발자 로그 (raw 도구 호출, 채팅에 안 보임)
  devLogs: DevLog[];
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
    hasToolCall: false,
    currentStage: null,
    currentLabel: '',
    completedStages: new Set(),
    percent: 0,
    projectId: null,
    projectName: null,
    subdomain: null,
    fileCount: null,
    previewUrl: null,
    devLogs: [],
  });
  const abortRef = useRef<AbortController | null>(null);

  const append = useCallback((entry: ChatEntry) => {
    setState((s) => ({ ...s, entries: [...s.entries, entry] }));
  }, []);

  const pushDev = useCallback((log: DevLog) => {
    setState((s) => ({ ...s, devLogs: [...s.devLogs, log] }));
  }, []);

  const handleEvent = useCallback(
    (ev: AgentEvent) => {
      switch (ev.type) {
        case 'start':
          setState((s) => ({
            ...s,
            sessionId: ev.sessionId,
            status: 'streaming',
            lastActivity: '✨ 포비 준비 중...',
          }));
          break;

        case 'iteration':
          pushDev({ ts: Date.now(), kind: 'iter', text: `iter ${ev.n} (${ev.stopReason ?? 'tool_use'})` });
          break;

        case 'assistant_text': {
          // Agent 의 자유 텍스트는 채팅창에 표시 (카톡처럼)
          const preview = ev.text.replace(/\s+/g, ' ').slice(0, 60);
          setState((s) => ({
            ...s,
            lastActivity: `💬 ${preview}${ev.text.length > 60 ? '...' : ''}`,
          }));
          // 너무 짧은 메시지(한 줄 tool bridge)는 스킵
          if (ev.text.trim().length > 10) {
            append({ kind: 'assistant', text: ev.text, ts: Date.now() });
          }
          pushDev({ ts: Date.now(), kind: 'text', text: ev.text.slice(0, 200) });
          break;
        }

        case 'tool_call': {
          // 사용자에게는 안 보임 — devLog 로만
          const input = ev.input as any;
          const summary = `${ev.name}  ${JSON.stringify(input).slice(0, 80)}`;
          pushDev({ ts: Date.now(), kind: 'tool', text: summary });
          // hasToolCall=true → FoundryProgress 단계 표 노출 조건 활성화
          setState((s) => ({ ...s, toolCount: s.toolCount + 1, hasToolCall: true }));
          break;
        }

        case 'tool_result':
          // devLog only
          pushDev({
            ts: Date.now(),
            kind: 'tool',
            text: `→ ${ev.ok ? 'ok' : 'fail'} ${ev.durationMs}ms ${ev.output.slice(0, 80).replace(/\n/g, ' ')}`,
          });
          break;

        case 'foundry_progress':
          // 포비 고수준 이벤트 — 사용자 UI의 FoundryProgress 로 렌더링
          setState((s) => {
            const completed = new Set(s.completedStages);
            // 다른 단계로 넘어갔으면 이전 current 단계를 completed 로 마킹
            if (s.currentStage && s.currentStage !== ev.stage) {
              completed.add(s.currentStage);
            }
            return {
              ...s,
              currentStage: ev.stage,
              currentLabel: ev.label,
              completedStages: completed,
              percent: ev.percent,
              lastActivity: `${ev.emoji} ${ev.label}`,
            };
          });
          break;

        case 'card_request':
          setState((s) => ({
            ...s,
            pendingCard: ev.card,
            status: 'awaiting_answer',
            lastActivity: '👉 답지 기다리는 중',
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
              lastActivity: '📋 답지 반영 — 작업 재개',
            };
          });
          break;

        case 'complete':
          setState((s) => {
            // 현재 단계도 completed 로
            const completed = new Set(s.completedStages);
            if (s.currentStage) completed.add(s.currentStage);
            return {
              ...s,
              status: 'complete',
              costUsd: ev.totalCostUsd ?? s.costUsd,
              lastActivity: '✅ 작업 완료',
              currentStage: null,
              currentLabel: '',
              completedStages: completed,
              percent: 100,
              projectId: ev.projectId ?? null,
              projectName: ev.projectName ?? null,
              subdomain: ev.subdomain ?? null,
              fileCount: ev.fileCount ?? null,
              previewUrl: ev.previewUrl ?? null,
            };
          });
          break;

        case 'error':
          // 사용자에게는 포비 말투로 간단히, raw 는 devLog
          setState((s) => ({
            ...s,
            status: 'error',
            error: ev.message,
            lastActivity: '⚠️ 잠깐 다시 시도할게요',
          }));
          pushDev({ ts: Date.now(), kind: 'tool', text: `error: ${ev.message}` });
          break;
      }
    },
    [append, pushDev],
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
        lastActivity: '🚀 포비 연결 중...',
        iteration: 0,
        toolCount: 0,
        submittingAnswer: false,
        hasToolCall: false,
        currentStage: null,
        currentLabel: '',
        completedStages: new Set(),
        percent: 0,
        projectId: null,
        projectName: null,
        subdomain: null,
        fileCount: null,
        previewUrl: null,
        devLogs: [],
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

  // 기존 프로젝트 "이어서 작업" — /builder/agent?projectId=xxx 로 진입 시 호출
  // complete 상태로 초기화 해서 FoundryComplete 카드 + iframe 프리뷰 바로 뜨게
  // 사장님 지시: 친절한 가이드 멘트로 사용자 방향 제시
  const resumeProject = useCallback(
    (data: {
      projectId: string;
      projectName?: string | null;
      subdomain?: string | null;
      previewUrl?: string | null;
    }) => {
      const appName = data.projectName ?? '프로젝트';
      setState({
        entries: [
          {
            kind: 'assistant',
            text:
              `📝 **"${appName}" 수정 모드**\n\n` +
              `여기서 자유롭게 상의하세요!\n` +
              `• 💬 **기능 제안 받기** — "어떤 기능이 있으면 좋을까?"\n` +
              `• ✨ **새 기능 추가** — "댓글 기능 추가해줘"\n` +
              `• 🎨 **디자인 변경** — "헤더 색깔 부드럽게"\n` +
              `• 🔧 **개선 상의** — "사용성 어떻게 개선할까?"\n\n` +
              `대화 후 **"만들어줘"** 하시면 바로 반영됩니다 🚀`,
            ts: Date.now(),
          },
          ...(data.previewUrl
            ? [
                {
                  kind: 'system' as const,
                  text: `🌐 현재 배포: ${data.previewUrl}`,
                  ts: Date.now(),
                },
              ]
            : []),
        ],
        status: 'complete',
        sessionId: null,
        pendingCard: null,
        error: null,
        costUsd: 0,
        lastActivity: '✅ 이전 작업 이어서',
        iteration: 0,
        toolCount: 0,
        submittingAnswer: false,
        hasToolCall: false,
        currentStage: null,
        currentLabel: '',
        completedStages: new Set(),
        percent: 100,
        projectId: data.projectId,
        projectName: data.projectName ?? null,
        subdomain: data.subdomain ?? null,
        fileCount: null,
        previewUrl: data.previewUrl ?? null,
        devLogs: [],
      });
    },
    [],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, start, submitAnswer, cancel, resumeProject };
}
