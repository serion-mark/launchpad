'use client';

// 종합 카드 — 답지 빈 칸을 한 번에 표시
// 반응형: 모바일 1열 세로 (h-12 터치) / PC 2~3열 그리드
// 번호 입력 친화: 옵션마다 [1] [2] [3]

import { useState } from 'react';
import type { CardRequest } from '../useAgentStream';

interface Props {
  card: CardRequest;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export default function AnswerSheetCard({ card, onSubmit, disabled }: Props) {
  // 각 질문별 선택 상태 (번호 클릭 시 반영)
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [freeText, setFreeText] = useState('');

  const handlePick = (qId: string, num: number) => {
    setPicks((p) => ({ ...p, [qId]: num }));
  };

  const handleSubmitPicks = () => {
    // 질문 순서대로 번호 문자열 생성 ("1, 2, 1")
    const nums = card.questions.map((q) => picks[q.id] ?? '').filter(Boolean);
    if (nums.length === 0) return;
    onSubmit(nums.join(', '));
  };

  const handleSubmitFree = () => {
    if (!freeText.trim()) return;
    onSubmit(freeText.trim());
    setFreeText('');
  };

  const handleQuickStart = () => onSubmit(card.quickStart.value);

  const allPicked = card.questions.every((q) => picks[q.id] !== undefined);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      data-testid="answer-sheet-card"
    >
      {/* 제목 */}
      <h3 className="mb-3 text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
        {card.title}
      </h3>

      {/* AI 추정값 */}
      {card.assumed && Object.keys(card.assumed).length > 0 && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs dark:bg-emerald-950/30">
          <div className="mb-1 font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ 자동 추정한 항목
          </div>
          <ul className="space-y-0.5 text-emerald-800 dark:text-emerald-300">
            {Object.entries(card.assumed).map(([k, v]) => (
              <li key={k}>
                <span className="font-mono">{k}</span>: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 질문 섹션 */}
      <div className="space-y-5">
        {card.questions.map((q, idx) => (
          <div key={q.id}>
            <p className="mb-2 text-sm font-semibold text-slate-800 sm:text-base dark:text-slate-200">
              {idx + 1}. {q.emoji ?? ''} {q.question}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {q.options.map((opt) => {
                const picked = picks[q.id] === opt.num;
                return (
                  <button
                    key={opt.num}
                    type="button"
                    onClick={() => handlePick(q.id, opt.num)}
                    disabled={disabled}
                    className={[
                      'flex min-h-12 items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      picked
                        ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500',
                    ].join(' ')}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      [{opt.num}]
                    </span>
                    <span className="flex-1">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 안내 */}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        💬 {card.inputHint}
      </p>

      {/* 액션 버튼 */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSubmitPicks}
          disabled={disabled || !allPicked}
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
        >
          선택 완료 → 진행
        </button>
        <button
          type="button"
          onClick={handleQuickStart}
          disabled={disabled}
          className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {card.quickStart.label}
        </button>
      </div>

      {/* 자유 입력 (항상) */}
      <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row dark:border-slate-800">
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitFree();
          }}
          placeholder="또는 자연어로 직접 입력 (예: 야놀자 스타일)"
          disabled={disabled}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          style={{ fontSize: '16px' }}
        />
        <button
          type="button"
          onClick={handleSubmitFree}
          disabled={disabled || !freeText.trim()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 sm:text-base dark:bg-slate-700"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
