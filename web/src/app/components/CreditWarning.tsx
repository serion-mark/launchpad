'use client';

import { useState } from 'react';

interface CreditWarningProps {
  action: string;
  creditCost: number;
  currentBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CreditWarning({ action, creditCost, currentBalance, onConfirm, onCancel }: CreditWarningProps) {
  const hasEnough = currentBalance >= creditCost;
  const remainAfter = currentBalance - creditCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6 shadow-2xl">
        <div className="mb-4 text-center">
          <div className="mb-3 text-3xl">⚡</div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">크레딧 사용 안내</h3>
          <p className="text-sm text-[var(--text-secondary)]">{action}</p>
        </div>

        <div className="mb-5 rounded-xl bg-[var(--bg-elevated)]/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">소모 크레딧</span>
            <span className="font-bold text-[var(--toss-yellow)]">{creditCost.toLocaleString()} cr</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">현재 잔액</span>
            <span className="font-bold text-[var(--text-primary)]">{currentBalance.toLocaleString()} cr</span>
          </div>
          <div className="border-t border-[var(--border-primary)] pt-2 flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">사용 후 잔액</span>
            <span className={`font-bold ${hasEnough ? 'text-[var(--toss-green)]' : 'text-[var(--toss-red)]'}`}>
              {hasEnough ? `${remainAfter.toLocaleString()} cr` : '잔액 부족'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-[var(--bg-elevated)] py-3 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--border-hover)] transition-colors"
          >
            취소
          </button>
          {hasEnough ? (
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-[var(--toss-blue)] py-3 text-sm font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors"
            >
              진행하기
            </button>
          ) : (
            <a
              href="/credits"
              className="flex-1 rounded-xl bg-[var(--toss-yellow)] py-3 text-sm font-bold text-[#17171c] text-center hover:bg-[#ffc800] transition-colors"
            >
              크레딧 충전
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
