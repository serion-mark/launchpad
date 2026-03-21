'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const amount = searchParams.get('amount') || '0';
  const paymentKey = searchParams.get('paymentKey') || '';

  const packageType = orderId.split('-')[1] || '';
  const creditMap: Record<string, number> = {
    starter: 1000, growth: 5000, pro: 10000, enterprise: 50000,
  };
  const credits = creditMap[packageType] || 0;

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mb-6 text-7xl">🎉</div>
      <h2 className="mb-4 text-3xl font-bold tracking-tight">충전 완료!</h2>
      <p className="mb-8 text-lg text-[#8b95a1]">
        <span className="font-bold text-[#ffd60a]">{credits.toLocaleString()} 크레딧</span>이 충전되었습니다
      </p>

      <div className="mb-8 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 text-left">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#8b95a1]">주문번호</span>
            <span className="font-mono text-xs">{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b95a1]">결제금액</span>
            <span>{Number(amount).toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b95a1]">충전 크레딧</span>
            <span className="font-bold text-[#ffd60a]">{credits.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b95a1]">결제키</span>
            <span className="font-mono text-xs text-[#6b7684]">{paymentKey.slice(0, 20)}...</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <a href="/start" className="flex-1 rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white text-center transition-colors hover:bg-[#1b64da]">
          MVP 만들러 가기
        </a>
        <a href="/credits" className="flex-1 rounded-xl border border-[#2c2c35] py-3.5 text-[15px] font-semibold text-[#8b95a1] text-center transition-colors hover:bg-[#2c2c35] hover:text-[#f2f4f6]">
          추가 충전
        </a>
      </div>
    </div>
  );
}

export default function CreditsSuccessPage() {
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
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
