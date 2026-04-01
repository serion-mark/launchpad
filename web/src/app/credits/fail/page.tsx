'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Logo from '../../components/Logo';
import ThemeToggle from '../../components/ThemeToggle';

function FailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || 'UNKNOWN';
  const message = searchParams.get('message') || '결제 처리 중 오류가 발생했습니다.';

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mb-6 text-7xl">😢</div>
      <h2 className="mb-4 text-3xl font-bold tracking-tight">결제 실패</h2>
      <p className="mb-8 text-lg text-[var(--text-secondary)]">{message}</p>

      <div className="mb-8 rounded-2xl border border-[var(--toss-red)]/20 bg-[var(--toss-red)]/8 p-6 text-left">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">에러 코드</span>
            <span className="font-mono text-[var(--toss-red)]">{code}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">메시지</span>
            <span className="text-[var(--toss-red)]">{message}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <a href="/credits" className="flex-1 rounded-xl bg-[var(--toss-blue)] py-3.5 text-[15px] font-bold text-white text-center transition-colors hover:bg-[var(--toss-blue-hover)]">
          다시 시도
        </a>
        <a href="/" className="flex-1 rounded-xl border border-[var(--border-primary)] py-3.5 text-[15px] font-semibold text-[var(--text-secondary)] text-center transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
          홈으로
        </a>
      </div>
    </div>
  );
}

export default function CreditsFailPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-card)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-primary)] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/">
            <Logo className="h-8" />
          </a>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-20">
        <Suspense fallback={<div className="text-center text-[var(--text-secondary)]">로딩 중...</div>}>
          <FailContent />
        </Suspense>
      </main>
    </div>
  );
}
