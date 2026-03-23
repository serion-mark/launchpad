'use client';

import { useState, useEffect } from 'react';
import { authFetch, getUser } from '@/lib/api';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';

// ── 크레딧 패키지 ────────────────────────────────────
const CREDIT_PACKAGES = [
  {
    id: 'lite', credits: 5000, price: 49000, label: '라이트팩',
    perCredit: '9.8원', discount: '', highlight: false,
    description: 'MVP 1개 생성 + 수정 4회',
    badge: '',
  },
  {
    id: 'standard', credits: 15000, price: 99000, label: '스탠다드팩',
    perCredit: '6.6원', discount: '33% 할인', highlight: true,
    description: 'MVP 3개 생성 + 수정 18회',
    badge: '가장 인기',
  },
  {
    id: 'pro', credits: 50000, price: 249000, label: '프로팩',
    perCredit: '5.0원', discount: '49% 할인', highlight: false,
    description: 'MVP 10개 이상 + 무제한 수정',
    badge: '최고 가성비',
  },
];

// ── 크레딧 소모 기준표 ───────────────────────────────
const CREDIT_COSTS = [
  { action: '질문지 답변 분석', cost: '무료', note: '프론트 로직' },
  { action: '데모 미리보기', cost: '무료', note: '정적 HTML' },
  { action: '맛보기 설계안', cost: '무료 (1회)', note: 'AI 호출 1회' },
  { action: '앱 생성', cost: '3,000', note: '과금 시작' },
  { action: 'AI 수정 요청', cost: '500', note: '1회당' },
  { action: '프리미엄 테마', cost: '1,000', note: '적용당' },
  { action: '코드 다운로드', cost: '5,000', note: '1회' },
  { action: '서버 배포', cost: '8,000', note: '1회' },
];

const COMPARISON = [
  { feature: '외주 개발', cost: '3,000~5,000만원', time: '3~6개월', risk: '높음 (소통 지옥)' },
  { feature: 'Foundry 라이트', cost: '49,000원', time: '10분', risk: '없음 (AI 자동)' },
  { feature: 'Foundry 프로', cost: '249,000원', time: '10분', risk: '없음 (10개 이상)' },
];

type CreditTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export default function CreditsPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [freeTrialUsed, setFreeTrialUsed] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const isLoggedIn = !!getUser();

  useEffect(() => {
    if (!isLoggedIn) return;
    authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setBalance(d.balance);
        setFreeTrialUsed(d.freeTrialUsed);
      }
    }).catch(() => {});
  }, [isLoggedIn]);

  const loadTransactions = async () => {
    setShowHistory(!showHistory);
    if (showHistory) return;
    const res = await authFetch('/credits/transactions?limit=20');
    if (res.ok) setTransactions(await res.json());
  };

  const handlePurchase = async (pkg: typeof CREDIT_PACKAGES[0]) => {
    if (!isLoggedIn) { window.location.href = '/login'; return; }

    setIsProcessing(true);
    setSelectedPkg(pkg.id);

    try {
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: 'foundry-user-' + Date.now() });

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: pkg.price },
        orderId: `credit-${pkg.id}-${Date.now()}`,
        orderName: `Foundry ${pkg.label} (${pkg.credits.toLocaleString()} 크레딧)`,
        successUrl: `${window.location.origin}/credits/success?pkg=${pkg.id}`,
        failUrl: `${window.location.origin}/credits/fail`,
      });
    } catch (error: any) {
      if (error.code !== 'USER_CANCEL') {
        console.error('결제 오류:', error);
        alert('결제 중 오류가 발생했습니다.');
      }
    } finally {
      setIsProcessing(false);
      setSelectedPkg(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      {/* 헤더 */}
      <header className="border-b border-[#2c2c35] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/dashboard">
            <img src="/logo.svg" alt="Foundry" className="h-7 md:h-8" />
          </a>
          <div className="flex items-center gap-3">
            {balance !== null && (
              <div className="flex items-center gap-2 rounded-xl bg-[#2c2c35] px-4 py-2">
                <span className="text-[#ffd60a]">⚡</span>
                <span className="text-sm font-bold">{balance.toLocaleString()}</span>
                <span className="text-xs text-[#8b95a1]">크레딧</span>
                <span className="text-xs text-[#6b7684]">· 앱 약 {Math.floor(balance / 3500)}개 제작 가능</span>
              </div>
            )}
            <button
              onClick={loadTransactions}
              className="rounded-xl bg-[#2c2c35] px-4 py-2 text-sm text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors"
            >
              {showHistory ? '닫기' : '이용 내역'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        {/* 잔액 대시보드 */}
        {balance !== null && isLoggedIn && (
          <div className="mb-10 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 md:p-8 text-center">
            <p className="text-sm text-[#8b95a1] mb-2">내 크레딧 잔액</p>
            <p className="text-4xl font-bold text-[#ffd60a] mb-2">⚡ {balance.toLocaleString()}<span className="text-lg text-[#8b95a1] ml-2">크레딧</span></p>
            <p className="text-base text-[#8b95a1]">앱 약 <span className="text-[#f2f4f6] font-bold">{Math.floor(balance / 3500)}개</span> 제작 가능</p>
          </div>
        )}

        {/* 타이틀 */}
        <div className="mb-10 text-center md:mb-14">
          <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-[40px]">크레딧 충전</h2>
          <p className="mx-auto max-w-xl text-base text-[#8b95a1] md:text-lg">
            쓴 만큼만 결제하세요. 구독료 없이 크레딧으로 앱을 만듭니다.
            <br />
            <span className="text-[#3182f6]">정부지원사업비로 결제 가능합니다.</span>
          </p>
          {!freeTrialUsed && isLoggedIn && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#30d158]/15 px-5 py-2.5 text-sm text-[#30d158] font-medium">
              <span>🎁</span> 맛보기 설계안 1회 무료! 크레딧 없이 AI 설계를 체험하세요
            </div>
          )}
        </div>

        {/* 크레딧 이용 내역 (토글) */}
        {showHistory && (
          <div className="mb-10 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
            <h3 className="mb-4 text-lg font-bold">이용 내역</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-[#8b95a1]">아직 이용 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between rounded-xl bg-[#2c2c35]/50 px-4 py-3">
                    <div>
                      <span className="text-sm">{tx.description || tx.type}</span>
                      <span className="ml-2 text-xs text-[#6b7684]">
                        {new Date(tx.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-[#30d158]' : 'text-[#f45452]'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-[#6b7684]">잔액 {tx.balanceAfter.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 크레딧 패키지 카드 */}
        <div className="mb-16 grid gap-5 md:gap-6 md:grid-cols-3">
          {CREDIT_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                pkg.highlight
                  ? 'border-[#3182f6] bg-[#3182f6]/8 scale-[1.02]'
                  : 'border-[#2c2c35] bg-[#1b1b21] hover:border-[#3a3a45]'
              }`}
            >
              {pkg.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#3182f6] px-4 py-1 text-xs font-bold text-white">
                  {pkg.badge}
                </div>
              )}

              <h3 className="mb-1 text-lg font-bold">{pkg.label}</h3>
              <p className="mb-4 text-sm text-[#8b95a1]">{pkg.description}</p>

              <div className="mb-2">
                <span className="text-3xl font-bold">{(pkg.price / 10000).toFixed(0)}만원</span>
              </div>
              <div className="mb-5 flex items-center gap-2">
                <span className="text-sm text-[#ffd60a] font-bold">⚡ {pkg.credits.toLocaleString()} 크레딧</span>
                {pkg.discount && (
                  <span className="rounded-md bg-[#30d158]/15 px-2 py-0.5 text-xs text-[#30d158] font-bold">{pkg.discount}</span>
                )}
              </div>
              <p className="mb-7 text-xs text-[#6b7684]">크레딧당 {pkg.perCredit}</p>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={isProcessing}
                className={`mt-auto w-full rounded-xl py-3.5 text-[15px] font-bold transition-colors ${
                  pkg.highlight
                    ? 'bg-[#3182f6] text-white hover:bg-[#1b64da]'
                    : 'bg-[#2c2c35] text-[#f2f4f6] hover:bg-[#3a3a45]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isProcessing && selectedPkg === pkg.id ? '결제 중...' : '충전하기'}
              </button>
            </div>
          ))}
        </div>

        {/* 크레딧 소모 기준표 */}
        <div className="mb-16 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 md:p-8">
          <h3 className="mb-7 text-center text-xl font-bold">크레딧 소모 기준</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2c2c35]">
                  <th className="px-4 py-3.5 text-left text-[#8b95a1] font-medium">액션</th>
                  <th className="px-4 py-3.5 text-right text-[#8b95a1] font-medium">크레딧</th>
                  <th className="px-4 py-3.5 text-left text-[#8b95a1] font-medium">비고</th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_COSTS.map(row => (
                  <tr key={row.action} className="border-b border-[#2c2c35]/50">
                    <td className="px-4 py-3.5 font-medium text-[#f2f4f6]">{row.action}</td>
                    <td className={`px-4 py-3.5 text-right font-bold ${row.cost === '무료' || row.cost === '무료 (1회)' ? 'text-[#30d158]' : 'text-[#ffd60a]'}`}>
                      {row.cost}
                    </td>
                    <td className="px-4 py-3.5 text-[#6b7684]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 비교 테이블 */}
        <div className="mb-16 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 md:p-8">
          <h3 className="mb-7 text-center text-xl font-bold">외주 개발 vs Foundry</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2c2c35]">
                  <th className="px-4 py-3.5 text-left text-[#8b95a1] font-medium">방식</th>
                  <th className="px-4 py-3.5 text-left text-[#8b95a1] font-medium">비용</th>
                  <th className="px-4 py-3.5 text-left text-[#8b95a1] font-medium">소요 시간</th>
                  <th className="px-4 py-3.5 text-left text-[#8b95a1] font-medium">리스크</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(row => (
                  <tr key={row.feature} className="border-b border-[#2c2c35]/50">
                    <td className="px-4 py-4 font-medium text-[#f2f4f6]">{row.feature}</td>
                    <td className="px-4 py-4 text-[#3182f6] font-medium">{row.cost}</td>
                    <td className="px-4 py-4 text-[#8b95a1]">{row.time}</td>
                    <td className="px-4 py-4">
                      <span className={row.risk.startsWith('없음') ? 'text-[#30d158]' : 'text-[#f45452]'}>
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 md:p-8">
          <h3 className="mb-7 text-center text-xl font-bold">자주 묻는 질문</h3>
          <div className="space-y-3">
            {[
              {
                q: '크레딧은 유효기간이 있나요?',
                a: '크레딧은 충전일로부터 1년간 유효합니다. 미사용 크레딧은 환불 가능합니다 (수수료 10%).',
              },
              {
                q: '맛보기 설계안이란?',
                a: '가입 후 1회 무료로 AI 설계안을 받아볼 수 있습니다. 실제 앱 생성(3,000 크레딧)과 동일한 품질의 아키텍처 설계를 미리 체험하세요.',
              },
              {
                q: '정부지원사업비로 결제할 수 있나요?',
                a: '세금계산서 발행이 가능합니다. 정부지원사업비 집행 가능 여부는 사업별 비목 기준에 따라 다르니 담당 매니저에게 확인해주세요.',
              },
              {
                q: '크레딧이 부족하면 어떻게 되나요?',
                a: '진행 중인 작업은 중단되지 않습니다. 새로운 앱 생성이나 AI 수정 요청 시 크레딧 충전 안내가 나타납니다.',
              },
            ].map(faq => (
              <details key={faq.q} className="group rounded-xl bg-[#2c2c35]/50 p-5">
                <summary className="cursor-pointer font-semibold text-[#f2f4f6] text-[15px]">{faq.q}</summary>
                <p className="mt-3 text-sm text-[#8b95a1] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
