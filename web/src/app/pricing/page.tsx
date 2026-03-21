'use client';

import { useState } from 'react';
import { getUser } from '@/lib/api';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';

const PLANS = [
  {
    name: '스타터',
    price: 49000,
    credits: 5000,
    desc: '가볍게 시작하기',
    features: ['앱 1개 생성 가능', '기본 템플릿 6종', '기본 테마 2종', 'ZIP 다운로드', '이메일 지원'],
    highlight: false,
  },
  {
    name: '프로',
    price: 99000,
    credits: 12000,
    desc: '가장 인기 있는 선택',
    features: ['앱 3개 생성 가능', '전체 템플릿 7종', '전체 테마 20종', 'ZIP 다운로드', '수정 5회 포함', '우선 지원'],
    highlight: true,
  },
  {
    name: '엔터프라이즈',
    price: 249000,
    credits: 35000,
    desc: '대규모 프로젝트',
    features: ['앱 무제한 생성', '전체 템플릿 7종', '프리미엄 테마 전체', 'ZIP 다운로드', '수정 무제한', '전담 지원', 'Sonnet 모델 사용'],
    highlight: false,
  },
];

const CREDIT_TABLE = [
  { action: '앱 생성 (기본 템플릿)', credits: '1,500 ~ 2,500' },
  { action: '앱 생성 (자유 템플릿)', credits: '1,500 ~ 3,000' },
  { action: '기능 추가 (선택 옵션)', credits: '100 ~ 500 / 개' },
  { action: '프리미엄 테마 적용', credits: '300 ~ 800' },
  { action: '코드 수정 (AI 채팅)', credits: '50 ~ 200 / 건' },
  { action: 'ZIP 다운로드', credits: '5,000' },
];

const FAQ = [
  { q: '크레딧에 유효기간이 있나요?', a: '충전일로부터 1년입니다. 1년 이내에 사용하지 않은 크레딧은 소멸됩니다.' },
  { q: '크레딧이 부족하면 어떻게 되나요?', a: '잔여 크레딧이 부족하면 앱 생성이 중단됩니다. 추가 충전 후 이어서 작업할 수 있습니다.' },
  { q: '호스팅을 안 하고 다운로드만 할 수 있나요?', a: '네! 호스팅 없이 ZIP 다운로드만 가능합니다 (5,000 크레딧). 자체 서버에서 직접 운영하세요.' },
  { q: '환불이 가능한가요?', a: '충전 후 7일 이내 미사용 크레딧은 전액 환불 가능합니다. 자세한 내용은 환불 정책을 참고하세요.' },
  { q: '부가세는 별도인가요?', a: '표시된 금액은 부가세 별도입니다. 결제 시 부가세 10%가 추가됩니다.' },
  { q: '정기결제(구독)인가요?', a: '아닙니다. 크레딧은 1회성 충전이며, 자동 결제되지 않습니다. 호스팅만 월 과금입니다.' },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const user = getUser();

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <LandingNav />

      {/* 히어로 */}
      <section className="px-5 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
        <h1 className="mb-3 text-3xl md:text-[44px] font-bold tracking-tight">합리적인 가격</h1>
        <p className="text-lg text-[#8b95a1]">크레딧을 충전하고, 필요한 만큼만 사용하세요</p>
      </section>

      {/* 가격 카드 */}
      <section className="px-5 pb-20">
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
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#3182f6] px-4 py-1 text-xs font-bold text-white">
                  가장 인기
                </div>
              )}
              <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
              <p className="mb-6 text-sm text-[#6b7684]">{plan.desc}</p>
              <div className="mb-2">
                <span className="text-4xl font-extrabold">&#8361;{plan.price.toLocaleString()}</span>
                <span className="text-sm text-[#6b7684]"> / 1회</span>
              </div>
              <p className="mb-6 text-sm font-medium text-[#3182f6]">{plan.credits.toLocaleString()} 크레딧 포함</p>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#8b95a1]">
                    <span className="mt-0.5 text-[#30d158]">&#10003;</span>
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
                {user ? '크레딧 충전하기' : '시작하기'}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-[#6b7684]">
          가격은 부가세 별도 &middot; 호스팅 월 9,900원 (부가세 별도) &middot; 정기결제 아님, 1회성 충전
        </p>
      </section>

      {/* 추가 비용 */}
      <section className="px-5 py-16 bg-[#1b1b21]">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold text-center">추가 비용 안내</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#2c2c35] bg-[#17171c] p-6">
              <div className="mb-3 text-2xl">🌐</div>
              <h3 className="mb-1 font-bold">호스팅</h3>
              <p className="text-2xl font-extrabold text-[#3182f6]">월 9,900원</p>
              <p className="mt-2 text-xs text-[#6b7684]">SSL 자동 적용 &middot; 서브도메인 제공 &middot; 커스텀 도메인 가능 &middot; 해지 시 72시간 내 삭제</p>
            </div>
            <div className="rounded-2xl border border-[#2c2c35] bg-[#17171c] p-6">
              <div className="mb-3 text-2xl">📦</div>
              <h3 className="mb-1 font-bold">코드 다운로드</h3>
              <p className="text-2xl font-extrabold text-[#a855f7]">5,000 크레딧</p>
              <p className="mt-2 text-xs text-[#6b7684]">전체 소스코드 ZIP &middot; 프론트+백엔드+DB &middot; 코드 100% 소유 &middot; 자유롭게 수정/배포</p>
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
                    <td className="py-3 px-4 text-right font-medium text-[#f2f4f6]">{row.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-[#6b7684] text-center">
            실제 소모량은 앱 복잡도, 선택 기능 수, AI 모델에 따라 달라질 수 있습니다
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
                  ['MVP 개발비', '2,000~5,000만원', '10~30만원'],
                  ['개발 기간', '2~6개월', '3분'],
                  ['수정 비용', '건당 50~200만원', '50~200 크레딧'],
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
                  <span className={`text-[#8b95a1] transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>&#9660;</span>
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
              지금 시작하기 &rarr;
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
