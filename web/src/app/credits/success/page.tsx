'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/api';

const CREDIT_MAP: Record<string, number> = {
  lite: 5000,
  standard: 15000,
  pro: 50000,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const amount = searchParams.get('amount') || '0';
  const paymentKey = searchParams.get('paymentKey') || '';

  const packageId = orderId.split('-')[1] || '';
  const expectedCredits = CREDIT_MAP[packageId] || 0;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [chargedCredits, setChargedCredits] = useState(0);
  const [balance, setBalance] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (confirmedRef.current || !paymentKey || !orderId) return;
    confirmedRef.current = true;

    (async () => {
      try {
        const res = await authFetch('/credits/confirm-payment', {
          method: 'POST',
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || '결제 승인 실패');
        }

        const data = await res.json();
        setChargedCredits(data.charged || expectedCredits);
        setBalance(data.balance || 0);
        setStatus('success');
      } catch (e: any) {
        setErrorMsg(e.message || '결제 처리 중 오류가 발생했습니다');
        setStatus('error');
      }
    })();
  }, [paymentKey, orderId, amount, expectedCredits]);

  return (
    <div className="mx-auto max-w-lg text-center">
      {status === 'loading' && (
        <>
          <div className="mb-6 text-7xl animate-pulse">⏳</div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">결제 확인 중...</h2>
          <p className="text-[#8b95a1]">토스페이먼츠에서 결제를 승인하고 있습니다</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mb-6 text-7xl">🎉</div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight">충전 완료!</h2>
          <p className="mb-8 text-lg text-[#8b95a1]">
            <span className="font-bold text-[#ffd60a]">{(chargedCredits || expectedCredits).toLocaleString()} 크레딧</span>이 충전되었습니다
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
                <span className="font-bold text-[#ffd60a]">{(chargedCredits || expectedCredits).toLocaleString()}</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-sm border-t border-[#2c2c35] pt-3">
                  <span className="text-[#8b95a1]">현재 잔액</span>
                  <span className="font-bold text-[#3182f6]">{balance.toLocaleString()} cr</span>
                </div>
              )}
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
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-6 text-7xl">😥</div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-red-400">결제 승인 실패</h2>
          <p className="mb-4 text-[#8b95a1]">{errorMsg}</p>
          <p className="mb-8 text-sm text-[#6b7684]">
            결제 금액이 청구되지 않았습니다. 문제가 지속되면 고객지원으로 연락해주세요.
          </p>

          <div className="mb-6 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-4 text-left text-xs text-[#6b7684]">
            <p>주문번호: {orderId}</p>
            <p>결제키: {paymentKey.slice(0, 20)}...</p>
          </div>

          <div className="flex gap-3">
            <a href="/credits" className="flex-1 rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white text-center transition-colors hover:bg-[#1b64da]">
              다시 시도
            </a>
            <a href="/" className="flex-1 rounded-xl border border-[#2c2c35] py-3.5 text-[15px] font-semibold text-[#8b95a1] text-center transition-colors hover:bg-[#2c2c35] hover:text-[#f2f4f6]">
              홈으로
            </a>
          </div>
        </>
      )}
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
