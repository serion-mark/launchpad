'use client';

import { useState } from 'react';

// 토스페이먼츠 테스트 클라이언트 키
const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

// 크레딧 패키지
const PACKAGES = [
  { id: 'starter', name: '스타터', credits: 1000, price: 100000, perCredit: 100, badge: '' },
  { id: 'growth', name: '그로스', credits: 5000, price: 450000, perCredit: 90, badge: '10% 할인' },
  { id: 'pro', name: '프로', credits: 10000, price: 800000, perCredit: 80, badge: '20% 할인' },
  { id: 'enterprise', name: '엔터프라이즈', credits: 50000, price: 3500000, perCredit: 70, badge: '30% 할인' },
];

// 크레딧 사용 가이드
const USAGE_GUIDE = [
  { action: 'MVP 앱 생성 (풀스택)', credits: 2000, note: '≈ 20만원' },
  { action: '페이지 추가 (1개)', credits: 200, note: '≈ 2만원' },
  { action: '기능 모듈 추가', credits: '300~500', note: '≈ 3~5만원' },
  { action: 'AI 수정 요청 (1건)', credits: '50~100', note: '≈ 5천~1만원' },
  { action: '서버 배포 (월)', credits: 500, note: '≈ 5만원' },
  { action: '코드 다운로드', credits: 3000, note: '≈ 30만원' },
];

export default function CreditsPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCredits] = useState(0); // TODO: API에서 조회

  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    setIsProcessing(true);
    setSelectedPackage(pkg.id);

    try {
      // 토스페이먼츠 SDK 동적 로드
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);

      const payment = tossPayments.payment({ customerKey: 'launchpad-user-' + Date.now() });

      // 결제 요청
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: pkg.price },
        orderId: `credit-${pkg.id}-${Date.now()}`,
        orderName: `Launchpad 크레딧 ${pkg.credits.toLocaleString()}개`,
        successUrl: `${window.location.origin}/credits/success`,
        failUrl: `${window.location.origin}/credits/fail`,
      });
    } catch (error: any) {
      if (error.code === 'USER_CANCEL') {
        // 사용자가 결제를 취소한 경우
      } else {
        console.error('결제 오류:', error);
        alert('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsProcessing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-700/50 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-2xl font-bold">
            <span className="text-blue-400">Launch</span>pad
          </a>
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-gray-700/50 px-4 py-2 text-sm">
              보유 크레딧: <span className="font-bold text-yellow-400">{currentCredits.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* 타이틀 */}
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-bold">크레딧 충전</h2>
          <p className="text-lg text-gray-400">
            외주 개발비 3,000만원을 20만원으로. 쓴 만큼만 과금합니다.
          </p>
        </div>

        {/* 크레딧 패키지 */}
        <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl border p-6 transition-all ${
                pkg.id === 'pro'
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                  : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              {pkg.id === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-xs font-bold">
                  인기
                </div>
              )}

              {pkg.badge && (
                <span className="mb-3 inline-block rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                  {pkg.badge}
                </span>
              )}

              <h3 className="mb-1 text-lg font-bold">{pkg.name}</h3>
              <div className="mb-1 text-3xl font-bold">
                {pkg.credits.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-gray-400">크레딧</span>
              </div>
              <div className="mb-4 text-2xl font-semibold text-blue-400">
                {(pkg.price / 10000).toLocaleString()}만원
              </div>
              <p className="mb-6 text-sm text-gray-400">
                크레딧당 {pkg.perCredit}원
              </p>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={isProcessing}
                className={`w-full rounded-xl py-3 font-bold transition ${
                  pkg.id === 'pro'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isProcessing && selectedPackage === pkg.id ? '처리 중...' : '충전하기'}
              </button>
            </div>
          ))}
        </div>

        {/* 크레딧 사용 가이드 */}
        <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-8">
          <h3 className="mb-6 text-xl font-bold">크레딧 사용 가이드</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {USAGE_GUIDE.map(item => (
              <div
                key={item.action}
                className="flex items-center justify-between rounded-xl bg-gray-900/50 p-4"
              >
                <span className="text-gray-300">{item.action}</span>
                <div className="text-right">
                  <span className="font-bold text-yellow-400">
                    {typeof item.credits === 'number' ? item.credits.toLocaleString() : item.credits}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">{item.note}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-blue-500/10 border border-blue-500/30 p-4 text-sm text-blue-300">
            <strong>비교:</strong> 외주 개발 시 MVP 1개 = 3,000~5,000만원 / Launchpad = 20~30만원 (약 100배 절약)
          </div>
        </div>
      </main>
    </div>
  );
}
