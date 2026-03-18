'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || 'UNKNOWN';
  const message = searchParams.get('message') || '결제 처리 중 오류가 발생했습니다.';

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mb-6 text-7xl">😢</div>
      <h2 className="mb-4 text-3xl font-bold tracking-tight">결제 실패</h2>
      <p className="mb-8 text-lg text-[#8b95a1]">{message}</p>

      <div className="mb-8 rounded-2xl border border-[#f45452]/20 bg-[#f45452]/8 p-6 text-left">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#8b95a1]">에러 코드</span>
            <span className="font-mono text-[#f45452]">{code}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b95a1]">메시지</span>
            <span className="text-[#f45452]">{message}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <a href="/credits" className="flex-1 rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white text-center transition-colors hover:bg-[#1b64da]">
          다시 시도
        </a>
        <a href="/" className="flex-1 rounded-xl border border-[#2c2c35] py-3.5 text-[15px] font-semibold text-[#8b95a1] text-center transition-colors hover:bg-[#2c2c35] hover:text-[#f2f4f6]">
          홈으로
        </a>
      </div>
    </div>
  );
}

export default function CreditsFailPage() {
  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <header className="border-b border-[#2c2c35] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/">
            <img src="/logo.svg" alt="Foundry" className="h-8" />
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-20">
        <Suspense fallback={<div className="text-center text-[#8b95a1]">로딩 중...</div>}>
          <FailContent />
        </Suspense>
      </main>
    </div>
  );
}
