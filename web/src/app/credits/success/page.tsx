'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const amount = searchParams.get('amount') || '0';
  const paymentKey = searchParams.get('paymentKey') || '';

  // 크레딧 계산 (orderId에서 패키지 추출)
  const packageType = orderId.split('-')[1] || '';
  const creditMap: Record<string, number> = {
    starter: 1000,
    growth: 5000,
    pro: 10000,
    enterprise: 50000,
  };
  const credits = creditMap[packageType] || 0;

  // TODO: 서버에서 결제 승인 확인 후 크레딧 충전
  // POST /api/payments/confirm { paymentKey, orderId, amount }

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mb-6 text-7xl">🎉</div>
      <h2 className="mb-4 text-3xl font-bold">충전 완료!</h2>
      <p className="mb-8 text-lg text-gray-400">
        <span className="font-bold text-yellow-400">{credits.toLocaleString()} 크레딧</span>이 충전되었습니다
      </p>

      <div className="mb-8 rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 text-left">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">주문번호</span>
            <span className="font-mono text-xs">{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">결제금액</span>
            <span>{Number(amount).toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">충전 크레딧</span>
            <span className="font-bold text-yellow-400">{credits.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">결제키</span>
            <span className="font-mono text-xs text-gray-500">{paymentKey.slice(0, 20)}...</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <a
          href="/"
          className="flex-1 rounded-xl bg-blue-600 py-3 font-bold transition hover:bg-blue-500 text-center"
        >
          MVP 만들러 가기
        </a>
        <a
          href="/credits"
          className="flex-1 rounded-xl border border-gray-600 py-3 font-medium transition hover:bg-gray-700 text-center"
        >
          추가 충전
        </a>
      </div>
    </div>
  );
}

export default function CreditsSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <header className="border-b border-gray-700/50 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-2xl font-bold">
            <span className="text-blue-400">Launch</span>pad
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-20">
        <Suspense fallback={<div className="text-center text-gray-400">로딩 중...</div>}>
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
