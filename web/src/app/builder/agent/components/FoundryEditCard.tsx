'use client';

// 수정 단계 전용 카드 — 배포 후 사용자 "헤더 색깔 부드럽게" 같은 요청 받을 때
// 포비 정체성 일관 (답지 카드와 동일한 디자인 언어)
// AnswerSheetCard 의 경량 버전

import { useState } from 'react';

export interface EditOption {
  num: number;
  label: string;
  value: string;
  preview?: string;     // 예: 색상 hex
}

interface Props {
  title: string;              // "🎨 헤더 색 변경"
  currentValue?: string;      // "현재: 진한 파랑 (#3182F6)"
  options: EditOption[];
  onSubmit: (answer: string) => void;
  onCancel?: () => void;
}

export default function FoundryEditCard({
  title,
  currentValue,
  options,
  onSubmit,
  onCancel,
}: Props) {
  const [freeText, setFreeText] = useState('');
  const [picked, setPicked] = useState<number | null>(null);

  const handlePick = (num: number, value: string) => {
    setPicked(num);
    onSubmit(value);
  };

  const handleFreeSubmit = () => {
    const txt = freeText.trim();
    if (!txt) return;
    onSubmit(txt);
    setFreeText('');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </div>
      {currentValue && (
        <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {currentValue}
        </div>
      )}
      <div className="space-y-1.5">
        {options.map((opt) => (
          <button
            key={opt.num}
            type="button"
            onClick={() => handlePick(opt.num, opt.value)}
            className={[
              'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
              picked === opt.num
                ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              [{opt.num}]
            </span>
            {opt.preview && (
              <span
                className="inline-block h-4 w-4 rounded border border-slate-200 dark:border-slate-700"
                style={{ backgroundColor: opt.preview }}
              />
            )}
            <span className="flex-1 text-slate-800 dark:text-slate-200">{opt.label}</span>
          </button>
        ))}
      </div>
      {/* 자유 입력 */}
      <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleFreeSubmit();
          }}
          placeholder="직접 입력 (예: 파스텔톤 핑크)"
          style={{ fontSize: '16px' }}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={handleFreeSubmit}
          disabled={!freeText.trim()}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: '#3182F6' }}
        >
          반영
        </button>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          취소
        </button>
      )}
    </div>
  );
}
