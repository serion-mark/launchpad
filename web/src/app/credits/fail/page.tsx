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
      <h2 className="mb-4 text-3xl font-bold">결제 실패</h2>
      <p className="mb-8 text-lg text-gray-400">{message}</p>

      <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-left">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">에러 코드</span>
            <span className="font-mono text-red-400">{code}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">메시지</span>
            <span className="text-red-300">{message}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <a
          href="/credits"
          className="flex-1 rounded-xl bg-blue-600 py-3 font-bold transition hover:bg-blue-500 text-center"
        >
          다시 시도
        </a>
        <a
          href="/"
          className="flex-1 rounded-xl border border-gray-600 py-3 font-medium transition hover:bg-gray-700 text-center"
        >
          홈으로
        </a>
      </div>
    </div>
  );
}

export default function CreditsFailPage() {
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
          <FailContent />
        </Suspense>
      </main>
    </div>
  );
}
