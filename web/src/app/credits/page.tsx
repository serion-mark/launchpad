'use client';

import { useState } from 'react';

// 토스페이먼츠 테스트 클라이언트 키
const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

// 구독 요금제
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    description: '아이디어 검증용',
    badge: '',
    highlight: false,
    features: [
      'AI MVP 미리보기 (데모)',
      '업종별 템플릿 체험',
      '디자인 테마 둘러보기',
      '기능 체크리스트',
    ],
    limits: [
      '실제 앱 생성 불가',
      '코드 다운로드 불가',
    ],
    cta: '무료로 시작',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 150000,
    period: '/월',
    description: '첫 MVP를 만들어보세요',
    badge: '',
    highlight: false,
    features: [
      'AI MVP 1개 생성',
      'Launchpad 호스팅 포함',
      '월 5회 AI 수정 요청',
      '기본 디자인 테마',
      '모바일 반응형',
      'SSL 인증서 포함',
    ],
    limits: [
      '코드 다운로드 불가',
      '프리미엄 테마 불가',
    ],
    cta: '구독 시작',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 290000,
    period: '/월',
    description: '정부지원사업 MVP에 최적',
    badge: '가장 인기',
    highlight: true,
    features: [
      'AI MVP 3개까지 생성',
      'Launchpad 호스팅 포함',
      '무제한 AI 수정 요청',
      '프리미엄 테마 전체',
      '결제(토스) 연동',
      '커스텀 도메인 연결',
      '관리자 대시보드',
      '우선 기술 지원',
    ],
    limits: [],
    cta: '구독 시작',
  },
  {
    id: 'exit',
    name: 'Exit',
    price: 15000000,
    period: ' (1회)',
    description: '완전한 코드 소유권 이전',
    badge: '정부사업 심사용',
    highlight: false,
    features: [
      'Pro 요금제 기능 전체',
      '소스코드 완전 소유권',
      '독립 NCP/AWS 서버 이관',
      'GitHub 레포 이전',
      'DB 마이그레이션',
      '배포 가이드 문서',
      '1개월 유지보수 포함',
      '정부사업 증빙 서류 제공',
    ],
    limits: [],
    cta: '상담 신청',
  },
];

// 비교 테이블
const COMPARISON = [
  { feature: '외주 개발', cost: '3,000~5,000만원', time: '3~6개월', risk: '높음 (소통 지옥)' },
  { feature: 'Launchpad Pro', cost: '월 29만원 (연 348만원)', time: '10분', risk: '없음 (AI 자동)' },
  { feature: 'Launchpad Exit', cost: '1,500만원', time: '3일', risk: '없음 (코드 소유)' },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const getPrice = (plan: typeof PLANS[0]) => {
    if (plan.price === 0 || plan.id === 'exit') return plan.price;
    return annual ? Math.round(plan.price * 0.8) : plan.price;
  };

  const handleSubscribe = async (plan: typeof PLANS[0]) => {
    if (plan.id === 'free') {
      window.location.href = '/';
      return;
    }

    if (plan.id === 'exit') {
      alert('Exit 요금제는 상담 후 진행됩니다.\n이메일: contact@launchpad.kr');
      return;
    }

    setIsProcessing(true);
    setSelectedPlan(plan.id);

    try {
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: 'launchpad-user-' + Date.now() });

      const price = getPrice(plan);
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: price },
        orderId: `sub-${plan.id}-${annual ? 'annual' : 'monthly'}-${Date.now()}`,
        orderName: `Launchpad ${plan.name} ${annual ? '연간' : '월간'} 구독`,
        successUrl: `${window.location.origin}/credits/success`,
        failUrl: `${window.location.origin}/credits/fail`,
      });
    } catch (error: any) {
      if (error.code !== 'USER_CANCEL') {
        console.error('결제 오류:', error);
        alert('결제 중 오류가 발생했습니다.');
      }
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-700/50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-xl font-bold sm:text-2xl">
            <span className="text-blue-400">Launch</span>pad
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* 타이틀 */}
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="mb-3 text-3xl font-bold sm:text-4xl">요금제</h2>
          <p className="mx-auto max-w-xl text-base text-gray-400 sm:text-lg">
            외주 개발비 5,000만원 아끼고, 10분 만에 MVP를 만드세요.
            <br />
            <span className="text-blue-400">정부지원사업비로 결제 가능합니다.</span>
          </p>

          {/* 월간/연간 토글 */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? 'text-white' : 'text-gray-500'}`}>월간</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative h-7 w-14 rounded-full transition ${annual ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${annual ? 'left-7' : 'left-0.5'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-white' : 'text-gray-500'}`}>
              연간 <span className="text-green-400 font-bold">20% 할인</span>
            </span>
          </div>
        </div>

        {/* 요금제 카드 */}
        <div className="mb-16 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map(plan => {
            const price = getPrice(plan);
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 transition-all ${
                  plan.highlight
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold ${
                    plan.id === 'exit' ? 'bg-amber-500' : 'bg-blue-500'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <h3 className="mb-1 text-lg font-bold">{plan.name}</h3>
                <p className="mb-3 text-sm text-gray-400">{plan.description}</p>

                <div className="mb-4">
                  {plan.price === 0 ? (
                    <div className="text-3xl font-bold">무료</div>
                  ) : plan.id === 'exit' ? (
                    <div>
                      <span className="text-3xl font-bold">1,500만원</span>
                      <span className="text-sm text-gray-400">{plan.period}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold">{(price / 10000).toFixed(0)}만원</span>
                      <span className="text-sm text-gray-400">{plan.period}</span>
                      {annual && plan.price > 0 && (
                        <div className="text-xs text-gray-500 line-through">
                          월 {(plan.price / 10000).toFixed(0)}만원
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 기능 리스트 */}
                <ul className="mb-6 flex-1 space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                  {plan.limits.map(l => (
                    <li key={l} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-gray-600">&#10007;</span>
                      <span className="text-gray-500">{l}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isProcessing}
                  className={`w-full rounded-xl py-3 font-bold transition ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-500'
                      : plan.id === 'exit'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isProcessing && selectedPlan === plan.id ? '처리 중...' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* 비교 테이블 */}
        <div className="mb-16 rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 sm:p-8">
          <h3 className="mb-6 text-center text-xl font-bold">외주 개발 vs Launchpad</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-gray-400">방식</th>
                  <th className="px-4 py-3 text-left text-gray-400">비용</th>
                  <th className="px-4 py-3 text-left text-gray-400">소요 시간</th>
                  <th className="px-4 py-3 text-left text-gray-400">리스크</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(row => (
                  <tr key={row.feature} className="border-b border-gray-700/50">
                    <td className="px-4 py-3 font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-blue-400">{row.cost}</td>
                    <td className="px-4 py-3">{row.time}</td>
                    <td className="px-4 py-3">
                      <span className={row.risk === '없음 (AI 자동)' || row.risk === '없음 (코드 소유)' ? 'text-green-400' : 'text-red-400'}>
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
        <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 sm:p-8">
          <h3 className="mb-6 text-center text-xl font-bold">자주 묻는 질문</h3>
          <div className="space-y-4">
            {[
              {
                q: '정부지원사업비(예창패/초창패)로 결제할 수 있나요?',
                a: '네! Launchpad 구독료는 "클라우드 서비스 이용료" 또는 "SW 개발 도구" 비목으로 사업비 집행이 가능합니다. Exit 요금제는 "외주용역비"로 처리됩니다.',
              },
              {
                q: '구독을 해지하면 만든 앱은 어떻게 되나요?',
                a: 'Pro 구독 해지 시 30일간 데이터가 보존됩니다. 그 전에 Exit 요금제로 전환하시면 소스코드와 서버를 완전히 이관해 드립니다.',
              },
              {
                q: 'Exit 요금제가 외주보다 나은 점은?',
                a: 'AI가 생성한 검증된 코드 + 독립 서버 + GitHub 레포 + DB까지 모두 이전됩니다. 외주 3,000만원짜리 결과물을 1,500만원에, 3일 만에 받으실 수 있습니다.',
              },
              {
                q: '만든 앱을 나중에 수정할 수 있나요?',
                a: 'Pro 구독 중에는 AI에게 무제한으로 수정 요청할 수 있습니다. Exit 후에는 직접 코드를 수정하시거나, 별도 유지보수 계약을 맺으실 수 있습니다.',
              },
            ].map(faq => (
              <details key={faq.q} className="rounded-xl bg-gray-900/50 p-4">
                <summary className="cursor-pointer font-medium text-gray-200">{faq.q}</summary>
                <p className="mt-2 text-sm text-gray-400">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
