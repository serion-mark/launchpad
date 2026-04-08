'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/api';
import Logo from '../../components/Logo';
import ThemeToggle from '../../components/ThemeToggle';

const CREDIT_MAP: Record<string, number> = {
  lite: 5000,
  standard: 20000,
  pro: 50000,
};

function SuccessContent() {
  const searchParams = useSearchParams();

  // KPN 인증 완료 후 전달되는 파라미터
  const code = searchParams.get('code') || '';
  const mxIssueNo = searchParams.get('mxIssueNo') || '';
  const fdTid = searchParams.get('fdTid') || '';
  const approvalUrl = searchParams.get('approvalUrl') || '';
  const amount = searchParams.get('amount') || '0';
  const pkg = searchParams.get('pkg') || '';
  const kpnMessage = searchParams.get('message') || '';

  // 토스 레거시 파라미터 (하위 호환)
  const paymentKey = searchParams.get('paymentKey') || '';
  const orderId = searchParams.get('orderId') || '';

  const isKpn = !!mxIssueNo && !!fdTid;
  const packageId = isKpn ? pkg : (orderId.split('-')[1] || '');
  const expectedCredits = CREDIT_MAP[packageId] || 0;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [chargedCredits, setChargedCredits] = useState(0);
  const [balance, setBalance] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (confirmedRef.current) return;

    // KPN 결제 흐름
    if (isKpn) {
      confirmedRef.current = true;

      // 인증 실패 체크
      if (code !== '0000') {
        setErrorMsg(kpnMessage || '인증에 실패했습니다.');
        setStatus('error');
        return;
      }

      (async () => {
        try {
          const res = await authFetch('/credits/kpn-confirm', {
            method: 'POST',
            body: JSON.stringify({
              mxIssueNo,
              fdTid,
              approvalUrl,
              amount: Number(amount),
              packageId,
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
      return;
    }

    // 토스 결제 흐름 (레거시 호환)
    if (!paymentKey || !orderId) return;
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
  }, [isKpn, code, mxIssueNo, fdTid, approvalUrl, amount, packageId, kpnMessage, paymentKey, orderId, expectedCredits]);

  return (
    <div className="mx-auto max-w-lg text-center">
      {status === 'loading' && (
        <>
          <div className="mb-6 text-7xl animate-pulse">⏳</div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">결제 확인 중...</h2>
          <p className="text-[var(--text-secondary)]">결제를 승인하고 있습니다</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mb-6 text-7xl">🎉</div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight">충전 완료!</h2>
          <p className="mb-8 text-lg text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--toss-yellow)]">{(chargedCredits || expectedCredits).toLocaleString()} 크레딧</span>이 충전되었습니다
          </p>

          <div className="mb-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6 text-left">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">주문번호</span>
                <span className="font-mono text-xs">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">결제금액</span>
                <span>{Number(amount).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">충전 크레딧</span>
                <span className="font-bold text-[var(--toss-yellow)]">{(chargedCredits || expectedCredits).toLocaleString()}</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-sm border-t border-[var(--border-primary)] pt-3">
                  <span className="text-[var(--text-secondary)]">현재 잔액</span>
                  <span className="font-bold text-[var(--toss-blue)]">{balance.toLocaleString()} cr</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <a href="/start" className="flex-1 rounded-xl bg-[var(--toss-blue)] py-3.5 text-[15px] font-bold text-white text-center transition-colors hover:bg-[var(--toss-blue-hover)]">
              MVP 만들러 가기
            </a>
            <a href="/credits" className="flex-1 rounded-xl border border-[var(--border-primary)] py-3.5 text-[15px] font-semibold text-[var(--text-secondary)] text-center transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
              추가 충전
            </a>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-6 text-7xl">😥</div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-red-400">결제 승인 실패</h2>
          <p className="mb-4 text-[var(--text-secondary)]">{errorMsg}</p>
          <p className="mb-8 text-sm text-[var(--text-tertiary)]">
            결제 금액이 청구되지 않았습니다. 문제가 지속되면 고객지원으로 연락해주세요.
          </p>

          <div className="mb-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 text-left text-xs text-[var(--text-tertiary)]">
            <p>주문번호: {orderId}</p>
            <p>결제키: {paymentKey.slice(0, 20)}...</p>
          </div>

          <div className="flex gap-3">
            <a href="/credits" className="flex-1 rounded-xl bg-[var(--toss-blue)] py-3.5 text-[15px] font-bold text-white text-center transition-colors hover:bg-[var(--toss-blue-hover)]">
              다시 시도
            </a>
            <a href="/" className="flex-1 rounded-xl border border-[var(--border-primary)] py-3.5 text-[15px] font-semibold text-[var(--text-secondary)] text-center transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]">
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
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
