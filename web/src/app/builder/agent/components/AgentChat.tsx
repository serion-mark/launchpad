'use client';

// 포비 Agent Mode 채팅창 — 클로드 냄새 0
// raw 도구 호출은 FoundryProgress 로 통합 표시 (사용자 친화)
// 개발자 모드 토글로 raw 로그 확인 가능

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatEntry, UseAgentStreamState } from '../useAgentStream';
import AnswerSheetCard from './AnswerSheetCard';
import FoundryProgress from './FoundryProgress';
import FoundryComplete from './FoundryComplete';
import FoundryError from './FoundryError';

export type SendMode = 'chat' | 'build';

interface Props {
  state: UseAgentStreamState;
  onStart: (prompt: string, mode: SendMode) => void;
  onSubmitAnswer: (answer: string) => void;
  // 수정 모드(기존 프로젝트)에 진입했는지 — 기본 mode 결정
  isEditingMode?: boolean;
}

export default function AgentChat({
  state,
  onStart,
  onSubmitAnswer,
  isEditingMode = false,
}: Props) {
  const [input, setInput] = useState('');
  const [devOpen, setDevOpen] = useState(false);
  // 🗨️ 상의(chat) / 🛠️ 만들기(build) — 수정 모드 기본값 = 상의 (보수적)
  const [mode, setMode] = useState<SendMode>(isEditingMode ? 'chat' : 'build');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // 채팅 입력창 auto-grow — 내용 따라 높이 조정 (max 200px)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);
  const startTsRef = useRef<number | null>(null);

  // 작업 중 경과 시간 tick
  useEffect(() => {
    if (state.status !== 'streaming' && state.status !== 'awaiting_answer') {
      startTsRef.current = null;
      return;
    }
    if (startTsRef.current === null) startTsRef.current = Date.now();
    const id = setInterval(() => {
      setElapsedMs(Date.now() - (startTsRef.current ?? Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [state.entries.length, state.currentLabel, state.status]);

  const disabled = state.status === 'streaming' || state.submittingAnswer;

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    if (state.status === 'awaiting_answer') {
      onSubmitAnswer(text);
    } else if (
      state.status === 'idle' ||
      state.status === 'complete' ||
      state.status === 'error'
    ) {
      onStart(text, mode);
    }
    setInput('');
  };

  const handleEditClick = () => {
    inputRef.current?.focus();
  };

  const isWorking = state.status === 'streaming';
  const lastAssistantInsight = useMemo(() => {
    // 완료 시 마지막 assistant 메시지를 인사이트로
    for (let i = state.entries.length - 1; i >= 0; i--) {
      if (state.entries[i].kind === 'assistant') return (state.entries[i] as any).text;
    }
    return undefined;
  }, [state.entries]);

  return (
    <div className="flex h-full flex-col">
      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
        data-testid="agent-chat-scroll"
      >
        {state.entries.length === 0 && state.status === 'idle' && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
            <div className="mb-2 text-4xl">✨</div>
            <p className="text-sm sm:text-base">
              만들고 싶은 걸 한 마디로 말씀해주세요.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              예: &quot;예쁜 미용실 예약앱&quot; / &quot;뭐 하나 만들어줘&quot;
            </p>
          </div>
        )}

        {state.entries.map((entry, idx) => {
          const entryCardId = entry.kind === 'card' ? entry.card.pendingId : '';
          const isActiveCard =
            entry.kind === 'card' &&
            state.pendingCard?.pendingId === entryCardId &&
            state.status === 'awaiting_answer' &&
            !state.submittingAnswer;
          return (
            <ChatEntryRow
              key={idx}
              entry={entry}
              onCardSubmit={onSubmitAnswer}
              cardDisabled={!isActiveCard}
            />
          );
        })}

        {/* 작업 중 — Foundry 진행 표 (도구 호출 있을 때만 — 상의 모드에서는 채팅만) */}
        {isWorking && state.hasToolCall && (
          <FoundryProgress
            currentStage={state.currentStage}
            currentLabel={state.currentLabel}
            completed={state.completedStages}
            percent={state.percent}
            elapsedMs={elapsedMs}
          />
        )}
        {/* 작업 중인데 도구 호출 없음 = 상의 모드 — 타이핑 인디케이터만 */}
        {isWorking && !state.hasToolCall && (
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
            </span>
            <span>💬 포비 생각 중...</span>
          </div>
        )}

        {/* 답변 전송 직후 인디케이터 */}
        {state.submittingAnswer && (
          <div
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
            style={{ borderColor: '#3182F633' }}
          >
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#3182F6 transparent #3182F6 #3182F6' }} />
            <span>📤 답지 전달 중 — 포비가 이어서 작업할 거예요</span>
          </div>
        )}

        {/* 에러 — 포비 톤 */}
        {state.status === 'error' && (
          <FoundryError message={state.error ?? undefined} />
        )}

        {/* 완료 — Foundry 완료 카드 */}
        {state.status === 'complete' && state.projectId && (
          <FoundryComplete
            projectName={state.projectName ?? undefined}
            projectId={state.projectId}
            previewUrl={state.previewUrl ?? undefined}
            insight={lastAssistantInsight}
            onEditClick={handleEditClick}
          />
        )}

        {/* 개발자 모드 — 기본 닫힘 */}
        {state.devLogs.length > 0 && (
          <details
            open={devOpen}
            onToggle={(e) => setDevOpen((e.target as HTMLDetailsElement).open)}
            className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/50"
          >
            <summary className="cursor-pointer select-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              ▶ 작업 로그 (개발자 모드, {state.devLogs.length}건)
            </summary>
            <div className="mt-2 max-h-60 space-y-1 overflow-auto font-mono text-[11px] leading-tight text-slate-500 dark:text-slate-400">
              {state.devLogs.slice(-100).map((log, i) => (
                <div key={i} className="truncate">
                  <span className="opacity-50">[{log.kind}]</span> {log.text}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* 입력창 — 모드 토글 + 입력 + 보내기 */}
      <div className="border-t border-slate-200 p-3 sm:p-4 dark:border-slate-800">
        {/* 💬 상의 / 🛠️ 만들기 토글 (awaiting_answer 때는 숨김) */}
        {state.status !== 'awaiting_answer' && (
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode('chat')}
              className={[
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
                mode === 'chat'
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400',
              ].join(' ')}
              style={mode === 'chat' ? { backgroundColor: '#3182F6' } : undefined}
            >
              💬 <span>상의</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('build')}
              className={[
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
                mode === 'build'
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400',
              ].join(' ')}
              style={mode === 'build' ? { backgroundColor: '#3182F6' } : undefined}
            >
              🛠️ <span>만들기</span>
            </button>
            <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500">
              {mode === 'chat'
                ? '자유롭게 상의 · 기능 추천 · 아이디어 토론'
                : '파일 수정 / 기능 추가 실행'}
            </span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter = 전송, Shift+Enter = 줄바꿈 (기본 동작 유지)
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              state.status === 'awaiting_answer'
                ? '번호("1, 2"), "시작", 또는 자연어로 답변 (Shift+Enter 줄바꿈)'
                : mode === 'chat' && (state.status === 'complete' || state.status === 'idle' || state.status === 'error')
                  ? '질문 / 추천 요청 (Shift+Enter 줄바꿈)'
                  : mode === 'build' && (state.status === 'complete' || state.status === 'idle' || state.status === 'error')
                    ? '만들거나 수정할 내용 (Shift+Enter 줄바꿈)'
                    : '응답 대기 중...'
            }
            disabled={disabled}
            rows={1}
            style={{ fontSize: '16px' }}
            className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 leading-6 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="rounded-lg px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
            style={{ backgroundColor: '#3182F6' }}
          >
            보내기
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex-1 truncate">
            {state.status === 'idle' && '아이디어 한 마디부터 시작해요'}
            {state.status === 'streaming' && (state.lastActivity || '✨ 포비가 작업 중...')}
            {state.status === 'awaiting_answer' &&
              (state.submittingAnswer
                ? '📤 답지 전송 중...'
                : '👆 답지 확인을 기다리고 있어요')}
            {state.status === 'complete' && '✅ 완료 — 추가 수정도 가능해요'}
            {state.status === 'error' && '⚠️ 잠깐 다시 시도할게요'}
          </span>
          {(state.status === 'streaming' || state.status === 'awaiting_answer') && (
            <span className="shrink-0 text-[10px] opacity-60">
              {state.iteration > 0 ? `step ${state.iteration}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatEntryRow({
  entry,
  onCardSubmit,
  cardDisabled,
}: {
  entry: ChatEntry;
  onCardSubmit: (answer: string) => void;
  cardDisabled: boolean;
}) {
  switch (entry.kind) {
    case 'user':
      return (
        <div className="flex justify-end">
          <div
            className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2 text-sm text-white sm:text-base"
            style={{ backgroundColor: '#3182F6' }}
          >
            {entry.text}
          </div>
        </div>
      );
    case 'assistant':
      return (
        <div className="flex justify-start">
          <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2 text-sm text-slate-800 sm:text-base dark:bg-slate-800 dark:text-slate-100">
            {entry.text}
          </div>
        </div>
      );
    case 'card':
      return (
        <div className="space-y-2">
          <AnswerSheetCard card={entry.card} onSubmit={onCardSubmit} disabled={cardDisabled} />
          {entry.answered && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              ✓ 답지 완료: {entry.answered}
            </div>
          )}
        </div>
      );
    case 'system':
      return (
        <div className="text-center text-xs text-slate-400 dark:text-slate-500">
          {entry.text}
        </div>
      );
  }
}
