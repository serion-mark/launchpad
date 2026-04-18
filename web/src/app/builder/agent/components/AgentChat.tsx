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

  // 입력창 비활성: 백엔드 작업 진행 중 / 답변 전송 중일 때만
  // complete / error 상태에서는 활성화 (새 요청 / 재시도 가능하도록)
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

        {/* 작업 중 타이핑 인디케이터 — Agent가 생각/도구 실행 중일 때 */}
        {state.status === 'streaming' && (
          <div
            className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Agent 작업 중"
          >
            <span className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms]" />
            </span>
            <span className="flex-1 truncate">
              {state.lastActivity || '🧠 Agent가 생각 중...'}
            </span>
          </div>
        )}

        {/* 답변 전송 직후 인디케이터 — 카드 답변 보내고 서버 처리 대기 */}
        {state.submittingAnswer && (
          <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span>📤 답변 전달 중 — Agent가 이어서 작업할 거예요</span>
          </div>
        )}
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
                : state.status === 'complete'
                  ? '새 요청을 입력하세요 (예: 쇼핑몰 만들어줘)'
                  : state.status === 'error'
                    ? '다시 시도할 요청을 입력하세요'
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
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex-1 truncate">
            {state.status === 'idle' && '아이디어 한 마디부터 시작해요'}
            {state.status === 'streaming' && (state.lastActivity || '⏳ Agent가 작업 중...')}
            {state.status === 'awaiting_answer' &&
              (state.submittingAnswer
                ? '📤 답변 전송 중...'
                : '👆 종합 카드 답변을 기다리고 있어요 — 번호/자연어/"시작" 중 편한 걸로')}
            {state.status === 'complete' && '✅ 완료 — 새 요청도 입력 가능해요'}
            {state.status === 'error' && `❌ ${state.error}`}
          </span>
          {(state.status === 'streaming' || state.status === 'awaiting_answer') && (
            <span className="shrink-0 font-mono text-[10px] text-slate-400">
              iter {state.iteration} · tools {state.toolCount}
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
