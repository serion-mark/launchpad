'use client';

import LandingNav from './components/LandingNav';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import AppMockup from './components/AppMockup';

type MockupType = 'pos' | 'matching' | 'lms' | 'shop' | 'facility' | 'farm' | 'expert' | 'health' | 'social' | 'smartfarm';

// ── 포트폴리오 예시 데이터 (대표 4개) ──
const PORTFOLIO_ITEMS: {
  name: string; category: string; icon: string; desc: string; time: string;
  features: string[]; badge: string; mockup: MockupType; screenshot?: string; liveUrl?: string;
}[] = [
  { name: '헤어드림 POS', category: '미용실', icon: '✂️', desc: '예약 + 매출 + 고객CRM + 디자이너 정산', time: '~30분', features: ['예약관리', '매출통계', '알림톡'], badge: '지역', mockup: 'pos' },
  { name: '펫메이트', category: 'O2O 매칭', icon: '🐾', desc: '반려동물 돌봄 매칭 + 실시간 상태 추적', time: '~30분', features: ['매칭시스템', '실시간추적', '리뷰'], badge: '테크', mockup: 'matching', screenshot: '/screenshots/petmate.png', liveUrl: 'https://foundry.ai.kr/petmate/dashboard' },
  { name: '백설공주 사과농장', category: '지역특산품', icon: '🍎', desc: '산지직송 농산물몰 + 정기배송 + 체험예약', time: '~30분', features: ['산지직송', '정기배송', '체험예약'], badge: '지역', mockup: 'farm' },
  { name: '취미모아', category: '소셜/매칭', icon: '💕', desc: '취미 기반 동호회 매칭 + 모임 관리', time: '~30분', features: ['프로필매칭', '그룹채팅', '모임일정'], badge: '테크', mockup: 'social' },
];

// ── 크레딧 충전 패키지 ──
const PRICING_PLANS = [
  { name: '라이트', price: '49,000', credits: '5,000', desc: '회의실 10회 + 분석 6회', highlight: false },
  { name: '스탠다드', price: '149,000', credits: '20,000', desc: '앱 1개 + 수정 10회', highlight: true },
  { name: '프로', price: '299,000', credits: '50,000', desc: '앱 2개 이상 + 충분한 수정', highlight: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <LandingNav />

      {/* ── 히어로 섹션 (2분할) ─────────────────── */}
      <section className="relative overflow-hidden px-5 pt-16 pb-20 md:pt-24 md:pb-28">
        {/* 배경 글로우 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-[500px] w-[600px] rounded-full bg-[#3182f6]/8 blur-[120px]" />
          <div className="absolute right-1/4 top-0 h-[500px] w-[600px] rounded-full bg-[#a855f7]/6 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* 상단 배지 */}
          <div className="mb-10 text-center">
            <div className="inline-block rounded-full bg-[#3182f6]/10 px-4 py-1.5 text-sm font-medium text-[#3182f6]">
              정부지원사업 창업자를 위한 AI MVP 빌더
            </div>
          </div>

          {/* 2분할 그리드 */}
          <div className="grid gap-6 md:gap-8 md:grid-cols-2">
            {/* 왼쪽: MVP 만들기 */}
            <div className="rounded-3xl border border-[#2c2c35] bg-[#17171c]/80 p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="mb-6 text-5xl">💡</div>
                <h1 className="mb-5 text-[26px] sm:text-3xl md:text-4xl font-extrabold leading-[1.2] tracking-tight">
                  아이디어만<br />있으면 됩니다.<br />
                  <span className="text-[#3182f6]">나머지는 AI가<br />만들어 드립니다.</span>
                </h1>
                <p className="mb-5 text-base md:text-lg text-[#8b95a1] leading-relaxed">
                  개발자 없이, 질문에 답하기만 하면<br className="hidden md:block" />
                  작동하는 앱이 완성됩니다.
                </p>
                <p className="mb-8 text-sm font-semibold text-[#3182f6]">
                  외주 3,000만원 &rarr; Foundry 30만원.<br />
                  기획서 100장보다 작동하는 앱 1개.
                </p>
              </div>
              <div>
                <a
                  href="/start"
                  className="inline-block w-full sm:w-auto rounded-2xl bg-[#3182f6] px-10 py-4 text-center text-lg font-bold text-white hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/25"
                >
                  바로 시작 &rarr;
                </a>
                <p className="mt-4 text-xs text-[#6b7684]">회원가입 시 1,000cr 무료 지급 &middot; 카드 등록 불필요</p>
              </div>
            </div>

            {/* 오른쪽: AI 회의실 */}
            <div className="rounded-3xl border border-[#2c2c35] bg-[#12121a]/80 p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="mb-6 text-5xl">🧠</div>
                <h2 className="mb-5 text-[26px] sm:text-3xl md:text-4xl font-extrabold leading-[1.2] tracking-tight">
                  AI 한 명은 답하고,<br />
                  <span className="text-[#a855f7]">파운더리AI는<br />토론합니다.</span>
                </h2>
                <p className="mb-5 text-xl md:text-2xl font-bold text-[#f2f4f6]">
                  차이를 경험해보세요.
                </p>
                <p className="mb-8 text-base md:text-lg text-[#8b95a1] leading-relaxed">
                  사업계획서로 앱 만들기도 가능합니다
                </p>
              </div>
              <div>
                <a
                  href="/meeting"
                  className="inline-block w-full sm:w-auto rounded-2xl border-2 border-[#a855f7] px-10 py-4 text-center text-lg font-bold text-[#a855f7] hover:bg-[#a855f7]/10 transition-colors"
                >
                  회의 시작하기 &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* 하단 포트폴리오 링크 */}
          <div className="mt-8 text-center">
            <a
              href="/portfolio"
              className="rounded-2xl border border-[#2c2c35] px-8 py-3.5 text-base font-semibold text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#2c2c35] transition-colors"
            >
              이런 앱을 만들 수 있어요
            </a>
          </div>
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
                badge: '종속 없이 자유롭게',
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

      {/* ── 사용 방법 3단계 ─────────────────────── */}
      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight">30분이면 완성</h2>
            <p className="text-[#8b95a1] text-lg">AI와 대화하면 앱이 만들어집니다</p>
          </div>

          <div className="grid gap-0 md:grid-cols-3">
            {[
              { step: '1', title: 'AI와 대화', desc: '만들고 싶은 앱을 자유롭게 설명하세요. AI가 기능과 구조를 자동 설계합니다.', color: '#3182f6' },
              { step: '2', title: '앱 생성', desc: '프론트+백엔드+DB를 자동 생성. 24시간 무료 체험 배포까지.', color: '#30d158' },
              { step: '3', title: '수정 & 완성', desc: '채팅으로 수정 요청. 배포 또는 ZIP 다운로드로 내 앱 완성!', color: '#a855f7' },
            ].map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center p-6">
                {i < 2 && <div className="hidden md:block absolute top-12 right-0 w-1/2 h-0.5 bg-[#2c2c35]" />}
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PORTFOLIO_ITEMS.map(item => (
              <div key={item.name} className="rounded-2xl border border-[#2c2c35] bg-[#17171c] overflow-hidden hover:border-[#3182f6]/30 transition-colors">
                <div className="bg-gradient-to-br from-[#3182f6]/10 to-[#a855f7]/10 p-4 relative">
                  <span className={`absolute top-3 right-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold ${item.badge === '지역' ? 'bg-[#30d158]/10 text-[#30d158]' : 'bg-[#a855f7]/10 text-[#a855f7]'}`}>{item.badge}</span>
                  {item.screenshot ? (
                    <div className="relative">
                      <img src={item.screenshot} alt={item.name} className="w-full rounded-lg border border-[#2c2c35]/50" />
                      {item.liveUrl && (
                        <a href={item.liveUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 rounded-full bg-[#30d158] px-2 py-0.5 text-[9px] font-bold text-white hover:bg-[#28b84c] transition-colors">
                          LIVE
                        </a>
                      )}
                    </div>
                  ) : (
                    <AppMockup type={item.mockup} />
                  )}
                  <div className="mt-2 text-center">
                    <h3 className="text-base font-bold">{item.name}</h3>
                    <span className="mt-1 inline-block rounded-full bg-[#2c2c35] px-2.5 py-0.5 text-[10px] text-[#8b95a1]">{item.category}</span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-3 text-xs text-[#8b95a1] leading-relaxed">{item.desc}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.features.map(f => (
                      <span key={f} className="rounded-md bg-[#3182f6]/10 px-2 py-0.5 text-[10px] font-medium text-[#3182f6]">{f}</span>
                    ))}
                  </div>
                  <a href="/start" className="block text-center text-xs font-bold text-[#3182f6] hover:underline">이 앱 만들기 &rarr;</a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a href="/portfolio" className="text-sm font-semibold text-[#3182f6] hover:underline">더 많은 예시 보기 &rarr;</a>
          </div>
        </div>
      </section>

      {/* ── MVP 섹션: 왜 MVP를 먼저 만들어야 하나? ── */}
      <section className="px-4 py-20 md:py-28 bg-[#0c0c12]">
        <div className="mx-auto max-w-6xl">
          {/* 타이틀 */}
          <div className="text-center mb-12 md:mb-16">
            <div className="text-5xl mb-4">💡</div>
            <h2 className="text-2xl md:text-4xl font-bold leading-tight tracking-tight">
              외주사·개발자를 만나기 전에,<br />
              <span className="text-[#3182f6]">MVP를 먼저 만들어 가세요.</span>
            </h2>
          </div>

          {/* 비교 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {/* 왼쪽: MVP 없이 */}
            <div className="rounded-2xl bg-[#13131a] border border-[#2c2c35] p-6 md:p-8 hover:scale-[1.01] transition-transform">
              <h3 className="text-xl font-bold text-[#ef4444] mb-6">❌ MVP 없이 미팅하면</h3>
              <div className="space-y-5">
                {[
                  { icon: '💰', title: '견적', value: '3,000만 원~', sub: '외주 에이전시 평균 단가' },
                  { icon: '🗣️', title: '소통', value: '"기획서 있으세요?" "화면 설계서는요?"', sub: '요구사항 전달 실패 → 기획 증발' },
                  { icon: '⏰', title: '기간', value: '3~6개월', sub: '개발 시작까지만 2개월' },
                  { icon: '😰', title: '결과', value: '"이거 아닌데..."', sub: '돈 쓰고 나서야 깨달음' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-xs text-[#6b7684] mb-0.5">{item.title}</div>
                      <div className="text-sm font-bold text-[#f2f4f6]">{item.value}</div>
                      <div className="text-xs text-[#ef4444]/70 mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 오른쪽: MVP 들고 */}
            <div className="rounded-2xl bg-[#1a1a2e] border border-[#3182f6]/40 p-6 md:p-8 hover:scale-[1.01] transition-transform">
              <h3 className="text-xl font-bold text-[#10b981] mb-6">✅ MVP 들고 미팅하면</h3>
              <div className="space-y-5">
                {[
                  { icon: '💰', title: '견적', value: '1,500만 원', sub: 'MVP가 기획서 역할 → 견적 50% 절감' },
                  { icon: '🗣️', title: '소통', value: '"이거 기반으로 해주세요"', sub: '화면 보여주면 끝 → 소통 비용 제로' },
                  { icon: '⏰', title: '기간', value: '1~2개월', sub: '이미 구조가 잡혀있으니 바로 개발' },
                  { icon: '😊', title: '결과', value: '"딱 이거 맞아요!"', sub: '원하는 결과물 → 실패 방지' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-xs text-[#6b7684] mb-0.5">{item.title}</div>
                      <div className="text-sm font-bold text-[#f2f4f6]">{item.value}</div>
                      <div className="text-xs text-[#10b981]/70 mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Foundry가 드리는 것 */}
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold">Foundry가 드리는 것</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: '📱', title: '기획서 대신 실제 화면', desc: '말로 설명할 필요 없이, 동작하는 앱을 보여주세요' },
              { icon: '💰', title: '외주 견적 협상의 무기', desc: 'MVP가 있으면 견적이 절반으로 줄어듭니다' },
              { icon: '🧪', title: '고객 반응 먼저 테스트', desc: '돈 쓰기 전에, 진짜 고객이 원하는지 확인하세요' },
              { icon: '📦', title: '코드 다운로드', desc: '생성된 코드를 받아서 개발자에게 바로 전달 가능' },
            ].map(item => (
              <div key={item.title} className="rounded-xl border border-[#2c2c35] bg-[#13131a] p-5 text-center hover:border-[#3182f6]/30 transition-colors">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h4 className="text-sm font-bold mb-2">{item.title}</h4>
                <p className="text-xs text-[#8b95a1] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <p className="text-[#8b95a1] mb-4">30분 만에 MVP를 만들어보세요</p>
            <a
              href="/start"
              className="inline-block rounded-2xl bg-[#3182f6] px-10 py-4 text-lg font-bold text-white hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/25"
            >
              무료로 시작하기 &rarr;
            </a>
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
            가격은 부가세 별도 &middot; 호스팅 월 29,000원 별도 &middot; 다운로드 5,000 크레딧
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
                  ['개발 기간', '2~6개월', '30분'],
                  ['코드 소유권', '계약에 따라 다름', '100% 사용자 소유'],
                  ['수정 비용', '건당 50~200만원', '크레딧 소량 차감'],
                  ['기술 스택', '업체마다 다름', '최신 기술로 안정적으로 (글로벌 표준)'],
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
            아이디어가 있다면, 앱은 이미 완성된 거예요
          </h2>
          <p className="mb-10 text-lg text-[#8b95a1]">
            회원가입 시 1,000 크레딧 무료. 카드 등록 없이, 질문에 답하기만 하면 앱이 완성됩니다.
          </p>
          <a
            href="/start"
            className="inline-block rounded-2xl bg-[#3182f6] px-12 py-5 text-xl font-bold text-white hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/25"
          >
            지금 무료로 체험하기 &rarr;
          </a>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </div>
  );
}
