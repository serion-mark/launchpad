'use client';

import { useState } from 'react';
import { getUser } from '@/lib/api';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';

const PLANS = [
  {
    name: '라이트',
    price: 49000,
    credits: 5000,
    perCredit: '9.8원/cr',
    desc: 'AI 회의실 + 스마트 분석 체험',
    features: ['크레딧 5,000 지급', 'AI 회의실 + 스마트 분석 체험', 'AI 채팅 상담', '이메일 지원'],
    note: '앱 생성은 스탠다드부터 가능!',
    highlight: false,
  },
  {
    name: '스탠다드',
    price: 149000,
    credits: 20000,
    perCredit: '7.5원/cr',
    desc: '앱 1개 + 수정 여유',
    badge: '가장 인기',
    features: ['크레딧 20,000 지급', '앱 1개 + 수정 여유', 'AI 회의실 + 스마트 분석', 'ZIP 다운로드 가능', '이메일 지원'],
    highlight: true,
  },
  {
    name: '프로',
    price: 299000,
    credits: 50000,
    perCredit: '6.0원/cr',
    desc: '앱 3개 이상 + 충분한 수정',
    features: ['크레딧 50,000 지급', '앱 3개 이상 생성', 'AI 회의실 + 스마트 분석', 'ZIP 다운로드 가능', '우선 이메일 지원', 'cr당 최저 단가 (6.0원)'],
    highlight: false,
  },
];

const CREDIT_TABLE = [
  { icon: '🚀', action: '앱 생성', credits: '6,800', note: '1회' },
  { icon: '🧠', action: 'AI 회의실 (스탠다드)', credits: '300', note: '' },
  { icon: '🏆', action: 'AI 회의실 (프리미엄)', credits: '1,000', note: '' },
  { icon: '📊', action: '스마트 분석', credits: '300', note: '' },
  { icon: '✏️', action: 'AI 수정 (단순)', credits: '500', note: '색상·텍스트·문구·이미지' },
  { icon: '🔨', action: 'AI 수정 (보통)', credits: '1,000', note: '레이아웃·스타일·버튼·폰트' },
  { icon: '🔧', action: 'AI 수정 (복잡)', credits: '1,500', note: '페이지추가·반응형·기능·DB·API' },
  { icon: '💬', action: 'AI 대화', credits: '30', note: '질문·상담' },
  { icon: '🖼️', action: 'AI 이미지 생성', credits: '200', note: '1장' },
];

const FAQ = [
  { q: '크레딧에 유효기간이 있나요?', a: '충전일로부터 1년입니다. 1년 이내에 사용하지 않은 크레딧은 소멸됩니다.' },
  { q: '크레딧이 부족하면 어떻게 되나요?', a: '진행 중인 작업은 중단되지 않습니다. 새 요청 시 크레딧 충전 안내가 나타납니다.' },
  { q: '정부지원사업비로 결제할 수 있나요?', a: '세금계산서 발행이 가능합니다. 예비창업패키지, 초기창업패키지 등 정부사업비 집행이 가능합니다. 문의: mark@serion.ai.kr' },
  { q: '환불이 가능한가요?', a: '충전 후 7일 이내, 1cr도 사용하지 않은 경우 전액 환불. 일부 사용 시 미사용분 비례 환불. 7일 경과 시 환불 불가. 무료 지급 크레딧(1,000cr)은 환불 대상 아님.' },
  { q: '정기결제(구독)인가요?', a: '아닙니다. 크레딧은 1회성 충전이며, 자동 결제되지 않습니다. 호스팅만 월 과금입니다.' },
  { q: '배포 비용은 어떻게 되나요?', a: '앱 생성 완료 시 24시간 무료 체험 배포가 자동 제공됩니다. 이후 월 29,000원으로 유지할 수 있습니다.' },
  { q: 'AI 수정 비용은 어떻게 구분되나요?', a: '3단계로 자동 분류됩니다. 단순(색상·텍스트·이미지) 500cr, 보통(레이아웃·스타일·버튼) 1,000cr, 복잡(페이지추가·반응형·기능·DB) 1,500cr.' },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const user = getUser();

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <LandingNav />

      {/* 히어로 */}
      <section className="px-5 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
        <h1 className="mb-3 text-3xl md:text-[44px] font-bold tracking-tight">크레딧 충전</h1>
        <p className="text-lg text-[#8b95a1]">쓴 만큼만 결제하세요. 구독료 없이 크레딧으로 앱을 만듭니다.</p>
        <p className="mt-2 text-sm text-[#30d158] font-medium">회원가입 시 1,000cr 무료 지급!</p>
      </section>

      {/* 가격 카드 */}
      <section className="px-5 pb-12">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col transition-colors ${
                plan.highlight
                  ? 'border-[#3182f6] bg-[#3182f6]/5 ring-1 ring-[#3182f6]/30 relative'
                  : 'border-[#2c2c35] bg-[#1b1b21] hover:border-[#3a3a45]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#3182f6] px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
              <p className="mb-6 text-sm text-[#6b7684]">{plan.desc}</p>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">{(plan.price / 10000).toFixed(plan.price % 10000 === 0 ? 0 : 1)}만원</span>
              </div>
              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm font-medium text-[#ffd60a]">{plan.credits.toLocaleString()} 크레딧</span>
                <span className="text-xs text-[#6b7684]">({plan.perCredit})</span>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#8b95a1]">
                    <span className="mt-0.5 text-[#30d158]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={user ? '/credits' : '/login?redirect=/credits'}
                className={`block rounded-xl py-3.5 text-center text-[15px] font-bold transition-colors ${
                  plan.highlight
                    ? 'bg-[#3182f6] text-white hover:bg-[#1b64da]'
                    : 'bg-[#2c2c35] text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45]'
                }`}
              >
                충전하기
              </a>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[#6b7684]">
          가격은 부가세 별도 · 호스팅 월 29,000원 (24시간 무료 체험 포함!) · 정기결제 아님, 1회성 충전 · <span className="text-[#3182f6]">정부지원사업비 결제 가능 (세금계산서 발행)</span>
        </p>
      </section>

      {/* 크레딧 소모 기준표 */}
      <section className="px-5 py-16 bg-[#1b1b21]">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-2xl font-bold text-center">기능별 크레딧 사용량</h2>
          <p className="mb-8 text-sm text-[#6b7684] text-center">모든 유료 기능은 사용 전 크레딧 안내가 표시됩니다</p>
          <div className="rounded-2xl border border-[#2c2c35] bg-[#17171c] overflow-hidden">
            {CREDIT_TABLE.map((row, i) => (
              <div key={row.action} className={`flex items-center justify-between px-6 py-4 ${i !== CREDIT_TABLE.length - 1 ? 'border-b border-[#2c2c35]/50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{row.icon}</span>
                  <div>
                    <span className="text-sm font-medium text-[#f2f4f6]">{row.action}</span>
                    {row.note && <span className="ml-2 text-xs text-[#6b7684]">{row.note}</span>}
                  </div>
                </div>
                <span className="text-sm font-bold text-[#ffd60a]">{row.credits} cr</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#3182f6]/10 border border-[#3182f6]/20 p-4 text-center">
            <p className="text-sm text-[#3182f6] font-medium">📡 배포: 월 29,000원 (별도) · 24시간 무료 체험 포함!</p>
          </div>
        </div>
      </section>

      {/* 모두의 창업 배너 */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#ffd60a]/30 bg-[#ffd60a]/5 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">🏛️ 모두의 창업 선정자이신가요?</h2>
          <p className="text-sm text-[#8b95a1] mb-4">정부사업비로 정산 가능한 전용 패키지가 있습니다.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-3">
            <div className="rounded-xl bg-[#1b1b21] border border-[#2c2c35] px-6 py-3">
              <span className="font-bold text-[#ffd60a]">🥉 라이트 490,000원</span>
              <span className="text-xs text-[#8b95a1] ml-2">50,000cr + 호스팅 3개월 + 프리미엄 회의실 3회 + 기술지원 2회</span>
            </div>
            <div className="rounded-xl bg-[#1b1b21] border border-[#2c2c35] px-6 py-3">
              <span className="font-bold text-[#ffd60a]">🥈 스탠다드 990,000원</span>
              <span className="text-xs text-[#8b95a1] ml-2">100,000cr + 호스팅 6개월 + 코드팩 + 프리미엄 회의실 무제한급 + 기술지원 5회</span>
            </div>
          </div>
          <a href="/credits" className="text-sm text-[#3182f6] hover:underline">자세히 보기 →</a>
        </div>
      </section>

      {/* 외주 vs Foundry */}
      <section className="px-5 py-16 bg-[#1b1b21]">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold text-center">외주 개발 vs Foundry</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2c2c35]">
                  <th className="py-3 px-4 text-left text-[#6b7684] font-medium">항목</th>
                  <th className="py-3 px-4 text-center text-[#f45452] font-bold">외주</th>
                  <th className="py-3 px-4 text-center text-[#3182f6] font-bold">Foundry</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['MVP 개발비', '2,000~5,000만원', '5~30만원'],
                  ['개발 기간', '2~6개월', '30분'],
                  ['수정 비용', '건당 50~200만원', '100~500 크레딧'],
                  ['코드 소유권', '계약에 따라 다름', '100% 사용자'],
                  ['유지보수', '별도 계약 필요', '크레딧으로 자유 수정'],
                ].map(([label, o, f]) => (
                  <tr key={label} className="border-b border-[#2c2c35]/50">
                    <td className="py-3 px-4 text-[#8b95a1]">{label}</td>
                    <td className="py-3 px-4 text-center text-[#6b7684]">{o}</td>
                    <td className="py-3 px-4 text-center font-medium text-[#f2f4f6]">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold text-center">자주 묻는 질문</h2>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i} className="rounded-xl border border-[#2c2c35] bg-[#1b1b21] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-sm">{faq.q}</span>
                  <span className={`text-[#8b95a1] transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === i && (
                  <div className="border-t border-[#2c2c35] px-6 py-4">
                    <p className="text-sm text-[#8b95a1] leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-16 bg-[#1b1b21]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold">무료로 시작해보세요</h2>
          <p className="mb-8 text-[#8b95a1]">회원가입 시 1,000 크레딧 무료. 카드 등록 없이 바로 체험.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a href="/start" className="rounded-xl bg-[#3182f6] px-8 py-3.5 text-[15px] font-bold text-white hover:bg-[#1b64da] transition-colors">
              지금 시작하기 →
            </a>
            <a href="/refund" className="rounded-xl border border-[#2c2c35] px-8 py-3.5 text-[15px] font-semibold text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#2c2c35] transition-colors">
              환불 정책 보기
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
