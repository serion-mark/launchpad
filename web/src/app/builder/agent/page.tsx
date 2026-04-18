'use client';

// /builder/agent — Agent Mode 메인 페이지
// 기존 /builder와 격리된 신규 라우트
// 반응형: 모바일 한 화면 / PC 좌우 2열 (채팅 + 진행 요약)

import Link from 'next/link';
import { useAgentStream } from './useAgentStream';
import AgentChat from './components/AgentChat';

export default function BuilderAgentPage() {
  const { state, start, submitAnswer, cancel } = useAgentStream();

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/builder"
            className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            ← 기존 빌더
          </Link>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
            🤖 Agent Mode
          </h1>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {/* 실시간 상태 뱃지 */}
          {state.status === 'streaming' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              <span className="hidden sm:inline">작업 중</span>
              <span className="font-mono text-[10px] opacity-70">
                iter {state.iteration}
              </span>
            </span>
          )}
          {state.status === 'awaiting_answer' && !state.submittingAnswer && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              💬 <span className="hidden sm:inline">답변 대기</span>
            </span>
          )}
          {state.submittingAnswer && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="hidden sm:inline">전송 중</span>
            </span>
          )}
          {state.status === 'complete' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✅ <span className="hidden sm:inline">완료</span>
            </span>
          )}
          {state.sessionId && (
            <span className="hidden font-mono text-slate-500 sm:inline dark:text-slate-400">
              {state.sessionId.slice(0, 8)}
            </span>
          )}
          {(state.status === 'streaming' || state.status === 'awaiting_answer') && (
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
            >
              중단
            </button>
          )}
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-hidden">
        <AgentChat state={state} onStart={start} onSubmitAnswer={submitAnswer} />
      </main>
    </div>
  );
}
