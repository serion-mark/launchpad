'use client';

// Agent Mode 채팅창 — 채팅 entry 렌더링 + 3중 입력 (번호/키워드/자연어)
// 반응형: 모바일 세로 / PC 동일 구조
// 폰트 16px 이상 (iOS 자동 줌 방지)

import { useEffect, useRef, useState } from 'react';
import type { ChatEntry, UseAgentStreamState } from '../useAgentStream';
import AnswerSheetCard from './AnswerSheetCard';
import ToolCallBlock from './ToolCallBlock';

interface Props {
  state: UseAgentStreamState;
  onStart: (prompt: string) => void;
  onSubmitAnswer: (answer: string) => void;
}

export default function AgentChat({ state, onStart, onSubmitAnswer }: Props) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.entries.length]);

  const disabled =
    state.status === 'streaming' ||
    state.status === 'complete' ||
    state.status === 'error';

  const handleSubmit = () => {
    const text = input.trim();
    if (!text) return;
    if (state.status === 'awaiting_answer') {
      onSubmitAnswer(text);
    } else if (state.status === 'idle') {
      onStart(text);
    }
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
        data-testid="agent-chat-scroll"
      >
        {state.entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
            <div className="mb-2 text-4xl">💬</div>
            <p className="text-sm sm:text-base">
              만들고 싶은 걸 한 마디로 말씀해주세요.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              예: &quot;예쁜 미용실 예약앱&quot; / &quot;뭐 하나 만들어줘&quot;
            </p>
          </div>
        )}

        {state.entries.map((entry, idx) => (
          <ChatEntryRow
            key={idx}
            entry={entry}
            onCardSubmit={onSubmitAnswer}
            cardDisabled={state.pendingCard?.pendingId !== (entry.kind === 'card' ? entry.card.pendingId : '') || entry.kind !== 'card' || state.status !== 'awaiting_answer'}
          />
        ))}
      </div>

      {/* 입력창 */}
      <div className="border-t border-slate-200 p-3 sm:p-4 dark:border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              state.status === 'awaiting_answer'
                ? '번호("1, 2"), "시작", 또는 자연어로 답변'
                : state.status === 'idle'
                  ? '예: 예쁜 미용실 예약앱'
                  : '응답 대기 중...'
            }
            disabled={disabled}
            style={{ fontSize: '16px' }}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
          >
            보내기
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {state.status === 'idle' && '아이디어 한 마디부터 시작해요'}
          {state.status === 'streaming' && '⏳ Agent가 작업 중...'}
          {state.status === 'awaiting_answer' && '👆 종합 카드 답변을 기다리고 있어요 — 번호/자연어/&quot;시작&quot; 중 편한 걸로'}
          {state.status === 'complete' && `✅ 완료 — 비용 $${state.costUsd.toFixed(4)}`}
          {state.status === 'error' && `❌ ${state.error}`}
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
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2 text-sm text-white sm:text-base">
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
    case 'tool':
      return (
        <ToolCallBlock
          name={entry.name}
          input={entry.input}
          output={entry.output}
          ok={entry.ok}
          durationMs={entry.durationMs}
        />
      );
    case 'card':
      return (
        <div className="space-y-2">
          <AnswerSheetCard card={entry.card} onSubmit={onCardSubmit} disabled={cardDisabled} />
          {entry.answered && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              ✓ 답변 완료: {entry.answered}
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
