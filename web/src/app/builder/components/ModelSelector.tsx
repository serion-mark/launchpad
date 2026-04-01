'use client';

import { useState } from 'react';

export type AppModelTier = 'flash' | 'smart' | 'pro';

interface ModelOption {
  tier: AppModelTier;
  label: string;
  description: string;
  icon: string;
  creditPerFile: number;
  baseCost: number;
  speed: string;
  quality: string;
  available: boolean;
  fallbackNote?: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    tier: 'flash',
    label: 'Flash',
    description: '빠르고 저렴한 기본 모델',
    icon: '⚡',
    creditPerFile: 1,
    baseCost: 50,
    speed: '매우 빠름',
    quality: '기본',
    available: true,
  },
  {
    tier: 'smart',
    label: 'Smart',
    description: '속도와 품질의 균형',
    icon: '🧠',
    creditPerFile: 3,
    baseCost: 150,
    speed: '보통',
    quality: '우수',
    available: true,
  },
  {
    tier: 'pro',
    label: 'Pro',
    description: '복잡한 앱에 최적',
    icon: '🚀',
    creditPerFile: 10,
    baseCost: 500,
    speed: '느림',
    quality: '최고',
    available: true,
  },
];

interface ModelSelectorProps {
  selectedTier: AppModelTier;
  onSelect: (tier: AppModelTier) => void;
  creditBalance: number | null;
  estimatedFiles?: number;
  compact?: boolean; // 빌더 헤더에 넣을 때 사용
}

export default function ModelSelector({ selectedTier, onSelect, creditBalance, estimatedFiles = 10, compact }: ModelSelectorProps) {
  const [showDetail, setShowDetail] = useState(false);

  if (compact) {
    // 헤더용 작은 셀렉터
    const selected = MODEL_OPTIONS.find(m => m.tier === selectedTier)!;
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
        >
          <span>{selected.icon}</span>
          <span>{selected.label}</span>
          <span className="text-[var(--text-tertiary)]">▾</span>
        </button>
        {showDetail && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDetail(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-3 shadow-xl">
              {MODEL_OPTIONS.map(opt => (
                <button
                  key={opt.tier}
                  onClick={() => { onSelect(opt.tier); setShowDetail(false); }}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                    selectedTier === opt.tier ? 'bg-[var(--toss-blue)]/15 border border-[var(--toss-blue)]/30' : 'hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{opt.label}</span>
                      {!opt.available && (
                        <span className="rounded bg-[var(--toss-yellow)]/15 px-1.5 py-0.5 text-[9px] text-[var(--toss-yellow)]">Flash 전환</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {opt.available ? `${opt.creditPerFile}cr/파일 · ${opt.speed}` : opt.fallbackNote}
                    </div>
                  </div>
                  {selectedTier === opt.tier && <span className="text-[var(--toss-blue)]">✓</span>}
                </button>
              ))}
              {creditBalance !== null && (
                <div className="mt-2 rounded-lg bg-[var(--bg-elevated)] p-2.5 text-center">
                  <span className="text-[10px] text-[var(--text-secondary)]">잔액 </span>
                  <span className="text-xs font-bold text-[var(--toss-yellow)]">{creditBalance.toLocaleString()} cr</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // 풀사이즈 카드 셀렉터 (생성 전 선택 화면)
  const estimatedCost = (tier: AppModelTier) => {
    const opt = MODEL_OPTIONS.find(m => m.tier === tier)!;
    return opt.baseCost + (opt.creditPerFile * estimatedFiles);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-[var(--text-primary)]">AI 모델 선택</div>
      <div className="grid grid-cols-3 gap-3">
        {MODEL_OPTIONS.map(opt => {
          const cost = estimatedCost(opt.tier);
          const canAfford = creditBalance === null || creditBalance >= cost;

          return (
            <button
              key={opt.tier}
              onClick={() => onSelect(opt.tier)}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selectedTier === opt.tier
                  ? 'border-[var(--toss-blue)] bg-[var(--toss-blue)]/10'
                  : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)]'
              }`}
            >
              <div className="mb-2 text-2xl">{opt.icon}</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{opt.label}</div>
              <div className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{opt.description}</div>

              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-tertiary)]">속도</span>
                  <span className="text-[var(--text-primary)]">{opt.speed}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-tertiary)]">품질</span>
                  <span className="text-[var(--text-primary)]">{opt.quality}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--text-tertiary)]">예상 비용</span>
                  <span className={`font-bold ${canAfford ? 'text-[var(--toss-yellow)]' : 'text-[var(--toss-red)]'}`}>
                    ~{cost.toLocaleString()} cr
                  </span>
                </div>
              </div>

              {!opt.available && (
                <div className="mt-2 rounded-lg bg-[var(--toss-yellow)]/10 px-2 py-1 text-center">
                  <span className="text-[9px] text-[var(--toss-yellow)]">⚡ Flash로 자동 전환</span>
                </div>
              )}

              {selectedTier === opt.tier && (
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--toss-blue)] text-[10px] text-white">✓</div>
              )}
            </button>
          );
        })}
      </div>
      {creditBalance !== null && (
        <div className="text-center text-[10px] text-[var(--text-tertiary)]">
          현재 잔액: <span className="font-bold text-[var(--toss-yellow)]">{creditBalance.toLocaleString()} cr</span>
          {creditBalance < estimatedCost(selectedTier) && (
            <> · <a href="/credits" className="text-[var(--toss-red)] underline">크레딧 충전하기</a></>
          )}
        </div>
      )}
    </div>
  );
}
