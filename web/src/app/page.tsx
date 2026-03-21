'use client';

import LandingNav from './components/LandingNav';
import Footer from './components/Footer';

// ── 포트폴리오 예시 데이터 ──
const PORTFOLIO_ITEMS = [
  { name: '헤어드림 POS', category: '미용실', icon: '✂️', desc: '예약 + 매출 + 고객CRM + 디자이너 정산', time: '~3분', features: ['예약관리', '매출통계', '알림톡'] },
  { name: '펫메이트', category: 'O2O 매칭', icon: '🐾', desc: '반려동물 돌봄 매칭 + 실시간 상태 추적', time: '~3분', features: ['매칭시스템', '실시간추적', '리뷰'] },
  { name: '코드잇 LMS', category: '에듀테크', icon: '🎓', desc: '온라인 강의 + 수강생 관리 + 퀴즈/시험', time: '~3분', features: ['강의관리', '진도추적', '수료증'] },
];

// ── 가격 패키지 ──
const PRICING_PLANS = [
  { name: '스타터', price: '49,000', credits: '5,000', desc: '작은 MVP 1개 생성', highlight: false },
  { name: '프로', price: '99,000', credits: '12,000', desc: '풀 MVP + 수정 여유', highlight: true },
  { name: '엔터프라이즈', price: '249,000', credits: '35,000', desc: '복잡한 서비스 + 무제한 수정', highlight: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <LandingNav />

      {/* ── 히어로 섹션 ─────────────────────────── */}
      <section className="relative overflow-hidden px-5 pt-20 pb-24 md:pt-32 md:pb-36">
        {/* 배경 글로우 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[#3182f6]/8 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full bg-[#3182f6]/10 px-4 py-1.5 text-sm font-medium text-[#3182f6]">
            정부지원사업 창업자를 위한 AI MVP 빌더
          </div>
          <h1 className="mb-6 text-4xl md:text-[60px] font-extrabold leading-[1.1] tracking-tight">
            <span className="text-[#3182f6]">30만원</span>으로<br />
            작동하는 MVP를 만드세요
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg md:text-xl text-[#8b95a1] leading-relaxed">
            외주 3,000만원 &rarr; Foundry 30만원. AI가 풀스택 앱을 자동 생성합니다.<br className="hidden md:block" />
            기획서 100장보다, <b className="text-[#f2f4f6]">작동하는 MVP 1개</b>가 가장 완벽한 기획서입니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/start"
              className="rounded-2xl bg-[#3182f6] px-10 py-4 text-lg font-bold text-white hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/25"
            >
              지금 무료로 시작하기 &rarr;
            </a>
            <a
              href="/portfolio"
              className="rounded-2xl border border-[#2c2c35] px-8 py-4 text-lg font-semibold text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#2c2c35] transition-colors"
            >
              만든 앱 구경하기
            </a>
          </div>
          <p className="mt-5 text-sm text-[#6b7684]">회원가입 시 500 크레딧 무료 제공 &middot; 카드 등록 불필요</p>
        </div>
      </section>

      {/* ── 강점/차별화 3카드 ────────────────────── */}
      <section id="features" className="px-5 py-20 md:py-28 bg-[#1b1b21]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight">왜 Foundry인가요?</h2>
            <p className="text-[#8b95a1] text-lg">외주도, 노코드도 아닌 새로운 방법</p>
          </div>

          <div className="grid gap-6 md:gap-8 md:grid-cols-3">
            {[
              {
                icon: '💰',
                title: '가격 100배 절감',
                desc: '외주 3,000만원짜리 MVP를 30만원에 만듭니다. 예창패/초창패 사업비로 충분합니다.',
                badge: '3,000만원 → 30만원',
                badgeColor: 'bg-[#30d158]/10 text-[#30d158]',
              },
              {
                icon: '🚀',
                title: '작동하는 실체',
                desc: 'PPT 기획서가 아닙니다. 실제 접속 가능한 URL, 실제 작동하는 앱. IR 발표에서 바로 시연하세요.',
                badge: 'PPT → 작동하는 앱',
                badgeColor: 'bg-[#3182f6]/10 text-[#3182f6]',
              },
              {
                icon: '📦',
                title: '코드 100% 소유',
                desc: 'Bubble처럼 갇히지 않습니다. ZIP으로 소스코드 전체 다운로드. 개발자에게 바로 인수인계 가능.',
                badge: 'Lock-in 제로',
                badgeColor: 'bg-[#a855f7]/10 text-[#a855f7]',
              },
            ].map(item => (
              <div key={item.title} className="rounded-2xl border border-[#2c2c35] bg-[#17171c] p-8 hover:border-[#3182f6]/30 transition-colors">
                <div className="mb-5 text-5xl">{item.icon}</div>
                <div className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold ${item.badgeColor}`}>
                  {item.badge}
                </div>
                <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-[#8b95a1] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 사용 방법 4단계 ─────────────────────── */}
      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight">3분이면 완성</h2>
            <p className="text-[#8b95a1] text-lg">복잡한 설정 없이 4단계로 앱을 만드세요</p>
          </div>

          <div className="grid gap-0 md:grid-cols-4">
            {[
              { step: '1', title: '업종 선택', desc: '미용실, 쇼핑몰, O2O 등 7개 업종 또는 자유 입력', color: '#3182f6' },
              { step: '2', title: '질문 답변', desc: '6가지 질문에 답하면 AI가 최적 기능을 자동 구성', color: '#30d158' },
              { step: '3', title: 'AI 생성', desc: '프론트+백엔드+DB를 3분 안에 자동 생성', color: '#a855f7' },
              { step: '4', title: '배포/다운로드', desc: '서브도메인으로 즉시 배포 또는 ZIP 다운로드', color: '#f59e0b' },
            ].map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center p-6">
                {i < 3 && <div className="hidden md:block absolute top-12 right-0 w-1/2 h-0.5 bg-[#2c2c35]" />}
                {i > 0 && <div className="hidden md:block absolute top-12 left-0 w-1/2 h-0.5 bg-[#2c2c35]" />}
                <div
                  className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white"
                  style={{ background: s.color }}
                >
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                <p className="text-sm text-[#8b95a1] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 포트폴리오 미리보기 ────────────────── */}
      <section className="px-5 py-20 md:py-28 bg-[#1b1b21]">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight">이런 앱을 만들 수 있어요</h2>
            <p className="text-[#8b95a1] text-lg">실제 Foundry로 생성한 앱 예시</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PORTFOLIO_ITEMS.map(item => (
              <div key={item.name} className="rounded-2xl border border-[#2c2c35] bg-[#17171c] overflow-hidden hover:border-[#3182f6]/30 transition-colors">
                <div className="bg-gradient-to-br from-[#3182f6]/10 to-[#a855f7]/10 p-8 text-center">
                  <div className="text-5xl mb-3">{item.icon}</div>
                  <h3 className="text-lg font-bold">{item.name}</h3>
                  <span className="mt-1 inline-block rounded-full bg-[#2c2c35] px-3 py-0.5 text-xs text-[#8b95a1]">{item.category}</span>
                </div>
                <div className="p-6">
                  <p className="mb-4 text-sm text-[#8b95a1] leading-relaxed">{item.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.features.map(f => (
                      <span key={f} className="rounded-lg bg-[#3182f6]/10 px-2.5 py-1 text-xs font-medium text-[#3182f6]">{f}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6b7684]">
                    <span>생성 시간: {item.time}</span>
                    <a href="/start" className="font-bold text-[#3182f6] hover:underline">이 앱 만들기 &rarr;</a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a href="/portfolio" className="text-sm font-semibold text-[#3182f6] hover:underline">더 많은 예시 보기 &rarr;</a>
          </div>
        </div>
      </section>

      {/* ── 가격 요약 ──────────────────────────── */}
      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight">합리적인 가격</h2>
            <p className="text-[#8b95a1] text-lg">크레딧을 충전하고, 필요한 만큼만 사용하세요</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 transition-colors ${
                  plan.highlight
                    ? 'border-[#3182f6] bg-[#3182f6]/5 ring-1 ring-[#3182f6]/30'
                    : 'border-[#2c2c35] bg-[#1b1b21] hover:border-[#3a3a45]'
                }`}
              >
                {plan.highlight && (
                  <div className="mb-4 inline-block rounded-full bg-[#3182f6] px-3 py-1 text-xs font-bold text-white">인기</div>
                )}
                <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
                <p className="mb-5 text-sm text-[#6b7684]">{plan.desc}</p>
                <div className="mb-2">
                  <span className="text-3xl font-extrabold">&#8361;{plan.price}</span>
                  <span className="text-sm text-[#6b7684]"> / 1회</span>
                </div>
                <p className="mb-6 text-sm text-[#3182f6] font-medium">{plan.credits} 크레딧 포함</p>
                <a
                  href="/pricing"
                  className={`block rounded-xl py-3 text-center text-sm font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-[#3182f6] text-white hover:bg-[#1b64da]'
                      : 'bg-[#2c2c35] text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45]'
                  }`}
                >
                  자세히 보기
                </a>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-[#6b7684]">
            가격은 부가세 별도 &middot; 호스팅 월 9,900원 별도 &middot; 다운로드 5,000 크레딧
          </p>
        </div>
      </section>

      {/* ── 비교표 ────────────────────────────── */}
      <section className="px-5 py-20 md:py-28 bg-[#1b1b21]">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight">외주 vs Foundry</h2>
            <p className="text-[#8b95a1] text-lg">같은 MVP, 다른 비용</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2c2c35]">
                  <th className="py-4 px-4 text-left text-[#6b7684] font-medium">항목</th>
                  <th className="py-4 px-4 text-center text-[#f45452] font-bold">외주 개발</th>
                  <th className="py-4 px-4 text-center text-[#3182f6] font-bold">Foundry</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['개발 비용', '2,000~5,000만원', '10~30만원'],
                  ['개발 기간', '2~6개월', '3분'],
                  ['코드 소유권', '계약에 따라 다름', '100% 사용자 소유'],
                  ['수정 비용', '건당 50~200만원', '크레딧 소량 차감'],
                  ['기술 스택', '업체마다 다름', 'Next.js + Supabase (글로벌 표준)'],
                  ['배포', '별도 협의', '원클릭 자동 배포'],
                ].map(([label, outsource, foundry]) => (
                  <tr key={label} className="border-b border-[#2c2c35]/50">
                    <td className="py-3.5 px-4 text-[#8b95a1]">{label}</td>
                    <td className="py-3.5 px-4 text-center text-[#6b7684]">{outsource}</td>
                    <td className="py-3.5 px-4 text-center font-medium text-[#f2f4f6]">{foundry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 최종 CTA ──────────────────────────── */}
      <section className="px-5 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-5 text-3xl md:text-[44px] font-bold leading-tight tracking-tight">
            지금 바로 MVP를 만들어보세요
          </h2>
          <p className="mb-10 text-lg text-[#8b95a1]">
            회원가입 시 500 크레딧 무료. 카드 등록 없이 바로 시작.
          </p>
          <a
            href="/start"
            className="inline-block rounded-2xl bg-[#3182f6] px-12 py-5 text-xl font-bold text-white hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/25"
          >
            지금 무료로 시작하기 &rarr;
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
