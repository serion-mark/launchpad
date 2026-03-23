'use client';

import { useState } from 'react';
import { getUser } from '@/lib/api';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';

const PLANS = [
  {
    name: '라이트팩',
    price: 49000,
    credits: 5000,
    perCredit: '9.8원/cr',
    desc: 'MVP 1개 + 수정 4회',
    features: ['앱 1개 생성 가능', '전체 템플릿 10종', '전체 테마 20종', 'ZIP 다운로드', '이메일 지원'],
    highlight: false,
  },
  {
    name: '스탠다드팩',
    price: 149000,
    credits: 20000,
    perCredit: '7.5원/cr',
    desc: 'MVP 5개 + 수정 30회',
    badge: '가장 인기',
    features: ['앱 5개 생성 가능', '전체 템플릿 10종', '전체 테마 20종', 'ZIP 다운로드', 'AI 수정 30회 포함', '우선 지원', '24% 할인'],
    highlight: true,
  },
  {
    name: '프로팩',
    price: 249000,
    credits: 50000,
    perCredit: '5.0원/cr',
    desc: 'MVP 15개 이상 + 무제한 수정',
    badge: '⭐ BEST',
    features: ['앱 무제한 생성', '전체 템플릿 10종', '프리미엄 테마 전체', 'ZIP 다운로드', 'AI 수정 무제한', '전담 지원', 'Sonnet 모델 사용', '49% 할인'],
    highlight: false,
  },
];

const CREDIT_TABLE = [
  { action: '앱 생성', credits: '3,000' },
  { action: 'AI 수정 (1~5회)', credits: '500 / 회' },
  { action: 'AI 수정 (6~10회)', credits: '800 / 회' },
  { action: 'AI 수정 (11회~)', credits: '1,200 / 회' },
  { action: 'AI 회의실 (스탠다드)', credits: '300' },
  { action: 'AI 회의실 (프리미엄)', credits: '1,500' },
  { action: '스마트 분석', credits: '200' },
  { action: 'AI 이미지 생성', credits: '200' },
  { action: '코드 다운로드', credits: '5,000' },
  { action: '서버 배포', credits: '8,000' },
];

const FAQ = [
  { q: '크레딧에 유효기간이 있나요?', a: '충전일로부터 1년입니다. 1년 이내에 사용하지 않은 크레딧은 소멸됩니다.' },
  { q: '크레딧이 부족하면 어떻게 되나요?', a: '진행 중인 작업은 중단되지 않습니다. 새로운 앱 생성이나 AI 수정 요청 시 크레딧 충전 안내가 나타납니다.' },
  { q: '정부지원사업비로 결제할 수 있나요?', a: '세금계산서 발행이 가능합니다. 모두의 창업, 예비창업패키지, 초기창업패키지 등 정부사업비 집행이 가능합니다. 문의: mark@serion.ai.kr' },
  { q: '환불이 가능한가요?', a: '충전 후 7일 이내 미사용 크레딧은 전액 환불 가능합니다. 자세한 내용은 환불 정책을 참고하세요.' },
  { q: '정기결제(구독)인가요?', a: '아닙니다. 크레딧은 1회성 충전이며, 자동 결제되지 않습니다. 호스팅만 월 과금입니다.' },
  { q: '많이 수정하면 크레딧이 더 소모되나요?', a: '네, 프로젝트당 수정 횟수에 따라 단계적으로 증가합니다. 1~5회: 500cr, 6~10회: 800cr, 11회 이상: 1,200cr. 새 프로젝트를 만들면 리셋됩니다.' },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const user = getUser();

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <LandingNav />

      {/* 히어로 */}
      <section className="px-5 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
        <h1 className="mb-3 text-3xl md:text-[44px] font-bold tracking-tight">🔋 크레딧 충전</h1>
        <p className="text-lg text-[#8b95a1]">쓴 만큼만 결제하세요. 구독료 없이 크레딧으로 앱을 만듭니다.</p>
        <p className="mt-2 text-sm text-[#3182f6] font-medium">많이 충전할수록 크레딧당 단가가 내려갑니다 ↓</p>
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
                <span className="text-4xl font-extrabold">{(plan.price / 10000).toFixed(0)}만원</span>
              </div>
              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm font-medium text-[#ffd60a]">⚡ {plan.credits.toLocaleString()} 크레딧</span>
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

        {/* 소량 충전 안내 */}
        <div className="mx-auto max-w-5xl mt-6 flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-[#6b7684]">
          <span>소량 충전도 가능합니다:</span>
          <span className="text-[#ffd60a] font-medium">⚡ 1,000cr 12,000원</span>
          <span className="text-[#ffd60a] font-medium">⚡ 3,000cr 33,000원</span>
          <a href="/credits" className="text-[#3182f6] hover:underline">→ 크레딧 충전 페이지</a>
        </div>

        <p className="mt-6 text-center text-xs text-[#6b7684]">
          가격은 부가세 별도 · 호스팅 월 29,000원 (부가세 별도) · 정기결제 아님, 1회성 충전 · <span className="text-[#3182f6]">정부지원사업비 결제 가능 (세금계산서 발행)</span>
        </p>
      </section>

      {/* 모두의 창업 배너 */}
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#ffd60a]/30 bg-[#ffd60a]/5 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">🏛️ 모두의 창업 선정자이신가요?</h2>
          <p className="text-sm text-[#8b95a1] mb-4">정부사업비로 정산 가능한 전용 패키지가 있습니다.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-3">
            <div className="rounded-xl bg-[#1b1b21] border border-[#2c2c35] px-6 py-3">
              <span className="font-bold text-[#ffd60a]">🥉 라이트 49만원/월</span>
              <span className="text-xs text-[#8b95a1] ml-2">50,000cr + 호스팅 + 프리미엄 회의실 3회</span>
            </div>
            <div className="rounded-xl bg-[#1b1b21] border border-[#2c2c35] px-6 py-3">
              <span className="font-bold text-[#ffd60a]">🥈 스탠다드 99만원/월</span>
              <span className="text-xs text-[#8b95a1] ml-2">100,000cr + 호스팅 + 코드팩 독립!</span>
            </div>
          </div>
          <a href="/credits" className="text-sm text-[#3182f6] hover:underline">자세히 보기 →</a>
        </div>
      </section>

      {/* 추가 비용 */}
      <section className="px-5 py-16 bg-[#1b1b21]">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold text-center">추가 비용 안내</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#2c2c35] bg-[#17171c] p-6">
              <div className="mb-3 text-2xl">🌐</div>
              <h3 className="mb-1 font-bold">호스팅</h3>
              <p className="text-2xl font-extrabold text-[#3182f6]">월 29,000원</p>
              <p className="mt-2 text-xs text-[#6b7684]">SSL 자동 적용 · 내 앱 전용 주소 · 해지 시 72시간 내 삭제</p>
            </div>
            <div className="rounded-2xl border border-[#2c2c35] bg-[#17171c] p-6">
              <div className="mb-3 text-2xl">📦</div>
              <h3 className="mb-1 font-bold">코드 다운로드</h3>
              <p className="text-2xl font-extrabold text-[#a855f7]">5,000 크레딧</p>
              <p className="mt-2 text-xs text-[#6b7684]">전체 소스코드 ZIP · 프론트+백엔드+DB · 코드 100% 소유</p>
            </div>
          </div>
        </div>
      </section>

      {/* 크레딧 소모 기준표 */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold text-center">크레딧 소모 기준</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2c2c35]">
                  <th className="py-3 px-4 text-left text-[#6b7684] font-medium">작업</th>
                  <th className="py-3 px-4 text-right text-[#6b7684] font-medium">소모 크레딧</th>
                </tr>
              </thead>
              <tbody>
                {CREDIT_TABLE.map(row => (
                  <tr key={row.action} className="border-b border-[#2c2c35]/50">
                    <td className="py-3 px-4 text-[#8b95a1]">{row.action}</td>
                    <td className="py-3 px-4 text-right font-medium text-[#ffd60a]">{row.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-[#6b7684] text-center">
            AI 수정은 프로젝트별 횟수에 따라 단계적으로 증가합니다
          </p>
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
                  ['MVP 개발비', '2,000~5,000만원', '5~25만원'],
                  ['개발 기간', '2~6개월', '30분'],
                  ['수정 비용', '건당 50~200만원', '500~1,200 크레딧'],
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
          <p className="mb-8 text-[#8b95a1]">회원가입 시 500 크레딧 무료. 카드 등록 없이 바로 체험.</p>
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
