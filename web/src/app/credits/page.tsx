'use client';

import { useState, useEffect } from 'react';
import { authFetch, getUser } from '@/lib/api';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';

// ── 크레딧 충전 패키지 ─────────────────────────────────
const MAIN_PACKAGES = [
  {
    id: 'lite', credits: 5000, price: 49000, label: '5,000',
    perCredit: '9.8원', discount: '', highlight: false,
    desc: '회의실 10회 + 분석 6회 + AI대화 50회', badge: '',
  },
  {
    id: 'standard', credits: 20000, price: 149000, label: '20,000',
    perCredit: '7.5원', discount: '', highlight: true,
    desc: '앱 1개 + 수정 여유', badge: '인기',
  },
  {
    id: 'pro', credits: 50000, price: 299000, label: '50,000',
    perCredit: '6.0원', discount: '', highlight: false,
    desc: '앱 3개 이상 + 충분한 수정', badge: '⭐ BEST',
  },
];

const SMALL_PACKAGES: { id: string; credits: number; price: number; perCredit: string }[] = [];

// ── 크레딧 사용 예시 ───────────────────────────────────
const CREDIT_USAGE = [
  { icon: '🚀', action: '앱 생성', cost: '6,800', note: '1회' },
  { icon: '✏️', action: 'AI 수정 (단순)', cost: '100', note: '텍스트·색상·이미지' },
  { icon: '🔧', action: 'AI 수정 (복잡)', cost: '500', note: '페이지·기능·DB' },
  { icon: '💬', action: 'AI 대화', cost: '30', note: '질문·상담' },
  { icon: '🧠', action: 'AI 회의실', cost: '300', note: '스탠다드' },
  { icon: '🏆', action: 'AI 회의실', cost: '1,000', note: '프리미엄' },
  { icon: '📊', action: '스마트 분석', cost: '300', note: '1회' },
  { icon: '🖼️', action: 'AI 이미지', cost: '200', note: '1장' },
];

// ── 모두의 창업 패키지 ─────────────────────────────────
const MODU_PACKAGES = [
  {
    tier: 'light', label: '🥉 라이트', price: 490000,
    features: [
      '크레딧 50,000 지급',
      '호스팅 3개월 포함',
      'AI 회의실 프리미엄 3회',
      '기술지원 2회 무료',
      '세금계산서 발행 가능',
    ],
  },
  {
    tier: 'standard', label: '🥈 스탠다드', price: 990000,
    features: [
      '크레딧 100,000 지급',
      '호스팅 6개월 포함',
      'AI 회의실 프리미엄 무제한급',
      '📦 코드팩 독립 포함!',
      '기술지원 5회 무료',
      '세금계산서 발행 가능',
    ],
  },
];

// ── 독립 패키지 ────────────────────────────────────────
const INDEPENDENCE_PACKAGES = [
  {
    tier: 'code', label: '📦 코드팩', price: 990000,
    items: ['전체 소스코드 ZIP', '배포 가이드 문서'],
  },
  {
    tier: 'pro', label: '📦 프로팩', price: 1990000,
    items: ['코드팩 포함', 'DB 스키마 문서(ERD)', 'API 명세서(Swagger)', '외주사 인수인계 체크리스트'],
  },
  {
    tier: 'enterprise', label: '📦 엔터프라이즈', price: 4990000,
    items: ['프로팩 포함', 'AI 코드 리뷰 보고서', '커스텀 도메인 배포 대행', '1개월 기술 지원', '아키텍처 확장 가이드'],
  },
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
  const [activeTab, setActiveTab] = useState<'credit' | 'modu' | 'independence'>('credit');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [refundAgreed, setRefundAgreed] = useState(false);
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
    const res = await authFetch('/credits/transactions?limit=30');
    if (res.ok) setTransactions(await res.json());
  };

  const handlePurchase = async (pkgId: string, price: number, credits: number, label: string) => {
    if (!isLoggedIn) { window.location.href = '/login'; return; }
    if (!termsAgreed || !refundAgreed) {
      alert('이용약관과 환불 규정에 동의해주세요.');
      return;
    }

    setIsProcessing(true);
    setSelectedPkg(pkgId);

    try {
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const user = (await import('@/lib/api')).getUser();
      const customerKey = user?.userId ? `foundry-${user.userId}` : `foundry-anon-${Date.now()}`;
      const payment = tossPayments.payment({ customerKey });

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: price },
        orderId: `credit-${pkgId}-${Date.now()}`,
        orderName: `Foundry 크레딧 ${credits.toLocaleString()}cr (${label})`,
        successUrl: `${window.location.origin}/credits/success?pkg=${pkgId}`,
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
          <a href="/">
            <img src="/logo.svg" alt="Foundry" className="h-7 md:h-8" />
          </a>
          <div className="flex items-center gap-3">
            {balance !== null && (
              <div className="flex items-center gap-2 rounded-xl bg-[#2c2c35] px-4 py-2">
                <span className="text-[#ffd60a]">⚡</span>
                <span className="text-sm font-bold">{balance.toLocaleString()}</span>
                <span className="text-xs text-[#8b95a1]">크레딧</span>
                <span className="text-xs text-[#6b7684] hidden md:inline">· 앱 약 {Math.floor(balance / 3500)}개</span>
              </div>
            )}
            <a href="/dashboard" className="rounded-xl bg-[#2c2c35] px-4 py-2 text-sm text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
              내 프로젝트
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        {/* 잔액 대시보드 */}
        {balance !== null && isLoggedIn && (
          <div className="mb-8 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-[#8b95a1] mb-1">내 크레딧 잔액</p>
                <p className="text-4xl font-bold text-[#ffd60a]">⚡ {balance.toLocaleString()}<span className="text-lg text-[#8b95a1] ml-2">크레딧</span></p>
                <p className="text-sm text-[#8b95a1] mt-1">앱 약 <span className="text-[#f2f4f6] font-bold">{Math.floor(balance / 3500)}개</span> 제작 가능</p>
              </div>
              <button
                onClick={loadTransactions}
                className="rounded-xl bg-[#2c2c35] px-5 py-3 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors self-start"
              >
                📊 {showHistory ? '내역 닫기' : '사용 내역 보기'}
              </button>
            </div>
          </div>
        )}

        {/* 사용 내역 (토글) */}
        {showHistory && (
          <div className="mb-8 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
            <h3 className="mb-4 text-lg font-bold">📊 크레딧 사용 내역</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-[#8b95a1]">아직 이용 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2c2c35]">
                      <th className="px-3 py-2.5 text-left text-[#8b95a1] font-medium">날짜</th>
                      <th className="px-3 py-2.5 text-left text-[#8b95a1] font-medium">내용</th>
                      <th className="px-3 py-2.5 text-right text-[#8b95a1] font-medium">크레딧</th>
                      <th className="px-3 py-2.5 text-right text-[#8b95a1] font-medium">잔액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-[#2c2c35]/50">
                        <td className="px-3 py-2.5 text-[#6b7684] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-3 py-2.5 text-[#f2f4f6]">{tx.description || tx.type}</td>
                        <td className={`px-3 py-2.5 text-right font-bold ${tx.amount > 0 ? 'text-[#30d158]' : 'text-[#f45452]'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[#6b7684]">{tx.balanceAfter.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 타이틀 */}
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-[40px]">🔋 크레딧 충전</h2>
          <p className="mx-auto max-w-xl text-base text-[#8b95a1]">
            쓴 만큼만 결제하세요. 구독료 없이 크레딧으로 앱을 만듭니다.
            <br />
            <span className="text-[#3182f6] font-medium">많이 충전할수록 크레딧당 단가가 내려갑니다 ↓</span>
          </p>
          {!freeTrialUsed && isLoggedIn && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#30d158]/15 px-5 py-2.5 text-sm text-[#30d158] font-medium">
              🎁 맛보기 설계안 1회 무료! 크레딧 없이 AI 설계를 체험하세요
            </div>
          )}
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-8 flex justify-center gap-2">
          {[
            { key: 'credit' as const, label: '🔋 크레딧 충전' },
            { key: 'modu' as const, label: '🏛️ 모두의 창업' },
            { key: 'independence' as const, label: '🚀 독립 패키지' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#3182f6] text-white'
                  : 'bg-[#2c2c35] text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════ 크레딧 충전 탭 ══════ */}
        {activeTab === 'credit' && (
          <>
            {/* 메인 패키지 3종 */}
            <div className="mb-8 grid gap-5 md:gap-6 md:grid-cols-3">
              {MAIN_PACKAGES.map(pkg => (
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

                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#ffd60a]">⚡ {pkg.label}</span>
                    <span className="text-sm text-[#8b95a1]">크레딧</span>
                  </div>
                  <div className="mb-1">
                    <span className="text-2xl font-bold">{(pkg.price / 10000).toFixed(0)}만원</span>
                  </div>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs text-[#6b7684]">크레딧당 {pkg.perCredit}</span>
                    {pkg.discount && (
                      <span className="rounded-md bg-[#30d158]/15 px-2 py-0.5 text-xs text-[#30d158] font-bold">{pkg.discount}</span>
                    )}
                  </div>
                  <p className="mb-6 text-sm text-[#8b95a1]">{pkg.desc}</p>

                  <button
                    onClick={() => handlePurchase(pkg.id, pkg.price, pkg.credits, pkg.label + 'cr')}
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

            {/* 소량 충전 */}
            <div className="mb-10 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
              <h3 className="mb-4 text-sm font-bold text-[#8b95a1]">소량 충전</h3>
              <div className="flex flex-wrap gap-3">
                {SMALL_PACKAGES.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePurchase(pkg.id, pkg.price, pkg.credits, pkg.credits.toLocaleString() + 'cr')}
                    disabled={isProcessing}
                    className="flex items-center gap-3 rounded-xl border border-[#2c2c35] bg-[#2c2c35]/50 px-5 py-3 hover:bg-[#3a3a45] transition-colors disabled:opacity-40"
                  >
                    <span className="text-sm font-bold text-[#ffd60a]">⚡ {pkg.credits.toLocaleString()}cr</span>
                    <span className="text-sm text-[#f2f4f6]">{(pkg.price / 10000).toFixed(1)}만원</span>
                    <span className="text-xs text-[#6b7684]">({pkg.perCredit}/cr)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 결제 전 동의 체크박스 */}
            <div className="mb-10 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={e => setTermsAgreed(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#3182f6]"
                  />
                  <span className="text-sm text-[#8b95a1]">
                    <a href="/terms" target="_blank" className="text-[#3182f6] underline">이용약관</a>에 동의합니다 <span className="text-[#f45452]">(필수)</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundAgreed}
                    onChange={e => setRefundAgreed(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#3182f6]"
                  />
                  <span className="text-sm text-[#8b95a1]">
                    <a href="/refund" target="_blank" className="text-[#3182f6] underline">환불 규정</a>을 확인했습니다 <span className="text-[#f45452]">(필수)</span>
                  </span>
                </label>
              </div>
            </div>

            {/* 크레딧 사용 예시 */}
            <div className="mb-10 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
              <h3 className="mb-5 text-center text-lg font-bold">💡 크레딧 사용 예시</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {CREDIT_USAGE.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-[#2c2c35]/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <span className="text-sm font-medium text-[#f2f4f6]">{item.action}</span>
                        <span className="ml-2 text-xs text-[#6b7684]">{item.note}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#ffd60a]">{item.cost}cr</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 정부지원사업비 안내 */}
            <div className="mb-10 rounded-2xl border border-[#3182f6]/30 bg-[#3182f6]/5 p-6 text-center">
              <p className="text-sm text-[#3182f6] font-medium">
                💡 정부지원사업비로 결제 가능합니다 — 세금계산서 발행 가능
              </p>
              <p className="text-xs text-[#6b7684] mt-1">문의: mark@serion.ai.kr</p>
            </div>
          </>
        )}

        {/* ══════ 모두의 창업 패키지 탭 ══════ */}
        {activeTab === 'modu' && (
          <>
            <div className="mb-8 rounded-2xl border border-[#ffd60a]/30 bg-[#ffd60a]/5 p-6 text-center">
              <h3 className="text-xl font-bold mb-2">🏛️ 모두의 창업 선정자이신가요?</h3>
              <p className="text-sm text-[#8b95a1]">정부사업비로 정산 가능한 전용 패키지입니다. 세금계산서 발행 가능.</p>
              <p className="text-xs text-[#6b7684] mt-2">월 최대 100만원 한도 | 2개월 쓰고 싶으면 2번 결제하면 됩니다!</p>
            </div>

            <div className="mb-10 grid gap-6 md:grid-cols-2">
              {MODU_PACKAGES.map(pkg => (
                <div key={pkg.tier} className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <h3 className="text-xl font-bold mb-2">{pkg.label}</h3>
                  <p className="text-3xl font-bold text-[#ffd60a] mb-4">{(pkg.price / 10000).toFixed(0)}만원</p>
                  <ul className="space-y-2 mb-6">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-[#30d158]">✅</span>
                        <span className={f.includes('독립') ? 'text-[#ffd60a] font-bold' : 'text-[#8b95a1]'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => alert('모두의 창업 패키지 문의: mark@serion.ai.kr\n전화: 010-XXXX-XXXX')}
                    className="w-full rounded-xl bg-[#ffd60a] py-3.5 text-[15px] font-bold text-[#17171c] hover:bg-[#ffc800] transition-colors"
                  >
                    문의하기
                  </button>
                </div>
              ))}
            </div>

            {/* 비교 */}
            <div className="mb-10 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
              <h3 className="mb-4 text-center text-lg font-bold">📊 어떤 패키지를 선택할까?</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 rounded-xl bg-[#2c2c35]/50 p-4">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="font-bold text-[#f2f4f6]">"49만원만 쓸래" → 🥉 라이트</p>
                    <p className="text-[#8b95a1] mt-1">나머지 예산은 다른 솔루션에 자유롭게 사용하세요.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-[#2c2c35]/50 p-4">
                  <span className="text-lg">🔥</span>
                  <div>
                    <p className="font-bold text-[#f2f4f6]">"100만원 다 쓸래" → 🥈 스탠다드</p>
                    <p className="text-[#8b95a1] mt-1">코드팩 독립 + 호스팅 6개월 + 프리미엄 회의실 무제한급 + 기술지원 5회!</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-[#2c2c35]/50 p-4">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="font-bold text-[#f2f4f6]">"2개월 다 쓸래" → 아무거나 2번 결제!</p>
                    <p className="text-[#8b95a1] mt-1">월 단위 결제 — 다음 달에 한번 더 결제하면 됩니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════ 독립 패키지 탭 ══════ */}
        {activeTab === 'independence' && (
          <>
            <div className="mb-8 text-center">
              <h3 className="text-xl font-bold mb-2">🚀 앱을 독립시키기</h3>
              <p className="text-sm text-[#8b95a1]">사업이 성장했나요? 내 도메인으로 독립 운영하세요.</p>
              <p className="text-xs text-[#6b7684] mt-1">정부사업비로 정산 가능합니다 (세금계산서 발행)</p>
            </div>

            <div className="mb-10 grid gap-5 md:grid-cols-3">
              {INDEPENDENCE_PACKAGES.map(pkg => (
                <div key={pkg.tier} className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 flex flex-col">
                  <h3 className="text-lg font-bold mb-2">{pkg.label}</h3>
                  <p className="text-2xl font-bold text-[#ffd60a] mb-4">{(pkg.price / 10000).toFixed(0)}만원</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {pkg.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[#8b95a1]">
                        <span className="text-[#30d158]">✅</span>{item}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => alert('독립 패키지 문의: mark@serion.ai.kr')}
                    className="w-full rounded-xl bg-[#2c2c35] py-3 text-sm font-bold text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors"
                  >
                    문의하기
                  </button>
                </div>
              ))}
            </div>

            {/* 독립 프로세스 */}
            <div className="mb-10 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
              <h3 className="mb-4 text-center text-lg font-bold">📋 독립 프로세스</h3>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { step: '1', title: '패키지 선택', desc: '코드팩/프로팩/엔터 중 선택' },
                  { step: '2', title: '결제', desc: '세금계산서 발행 가능' },
                  { step: '3', title: '산출물 전달', desc: 'ZIP + 문서 다운로드' },
                  { step: '4', title: '독립 운영', desc: '내 서버에서 자유롭게!' },
                ].map(s => (
                  <div key={s.step} className="text-center">
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#3182f6]/15 text-[#3182f6] font-bold text-lg">{s.step}</div>
                    <p className="text-sm font-bold text-[#f2f4f6]">{s.title}</p>
                    <p className="text-xs text-[#6b7684] mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* FAQ */}
        <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 md:p-8">
          <h3 className="mb-5 text-center text-xl font-bold">자주 묻는 질문</h3>
          <div className="space-y-3">
            {[
              {
                q: '크레딧은 유효기간이 있나요?',
                a: '크레딧은 충전일로부터 1년간 유효합니다. 미사용 크레딧은 7일 이내 환불 가능합니다.',
              },
              {
                q: '많이 수정하면 크레딧이 더 소모되나요?',
                a: '아닙니다. AI 수정 비용은 고정입니다. 단순 수정(텍스트/색상/이미지) 100cr, 복잡 수정(페이지/기능/DB/API) 500cr. 횟수에 따라 증가하지 않습니다.',
              },
              {
                q: '정부지원사업비로 결제할 수 있나요?',
                a: '세금계산서 발행이 가능합니다. 모두의 창업, 예비창업패키지, 초기창업패키지 등 정부사업비 집행이 가능합니다. 문의: mark@serion.ai.kr',
              },
              {
                q: '독립 패키지를 구매하면 호스팅 해지해도 되나요?',
                a: '네! 코드를 100% 소유하게 되므로 내 서버에서 자유롭게 운영할 수 있습니다. Foundry 호스팅은 해지해도 됩니다.',
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
