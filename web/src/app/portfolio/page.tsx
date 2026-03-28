'use client';

import { useState } from 'react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';

const CATEGORIES = ['전체', '매장관리', '헬스케어', '소셜/커뮤니티', '쇼핑몰', '에듀테크', '지역특산품', 'O2O 매칭'];

const APPS: {
  name: string; url: string; screenshot: string; category: string;
  tag: string; desc: string; layout: string; view: 'mobile' | 'pc';
}[] = [
  {
    name: '백설공주 사과농장',
    url: 'https://app-7063.foundry.ai.kr',
    screenshot: '/portfolio/apple-farm.png',
    category: '지역특산품',
    tag: '지역특산품',
    desc: '로컬 농산물 주간배송 주문 서비스',
    layout: '랜딩형',
    view: 'pc',
  },
  {
    name: '카페노트',
    url: 'https://cafe-note.foundry.ai.kr',
    screenshot: '/portfolio/cafe-note.png',
    category: '매장관리',
    tag: '매장관리',
    desc: '1인 카페 매출·재고 대시보드',
    layout: '대시보드형',
    view: 'pc',
  },
  {
    name: '우리동네',
    url: 'https://our-town.foundry.ai.kr',
    screenshot: '/portfolio/our-town.png',
    category: '소셜/커뮤니티',
    tag: '소셜/매칭',
    desc: '동네 소식과 가게 쿠폰 커뮤니티',
    layout: '피드형',
    view: 'mobile',
  },
  {
    name: '꿀잠체크',
    url: 'https://sleep-check.foundry.ai.kr',
    screenshot: '/portfolio/sleep-check.png',
    category: '헬스케어',
    tag: '헬스케어',
    desc: 'AI 수면 패턴 분석 셀프 진단',
    layout: '스텝형',
    view: 'mobile',
  },
  {
    name: '멍냥일기',
    url: 'https://pet-diary.foundry.ai.kr',
    screenshot: '/portfolio/pet-diary.png',
    category: 'O2O 매칭',
    tag: 'O2O 매칭',
    desc: '반려동물 건강기록 펫 다이어리',
    layout: '탭형',
    view: 'mobile',
  },
  {
    name: '돌봄일지',
    url: 'https://care-log.foundry.ai.kr',
    screenshot: '/portfolio/care-log.png',
    category: '헬스케어',
    tag: '헬스케어',
    desc: '재가돌봄 어르신 일정관리 대시보드',
    layout: '대시보드형',
    view: 'pc',
  },
  {
    name: '오운완',
    url: 'https://workout.foundry.ai.kr',
    screenshot: '/portfolio/workout.png',
    category: '헬스케어',
    tag: '헬스케어',
    desc: '운동 루틴 관리 트래커',
    layout: '탭형',
    view: 'mobile',
  },
  {
    name: '마이폴리오',
    url: 'https://my-folio.foundry.ai.kr',
    screenshot: '/portfolio/my-folio.png',
    category: '에듀테크',
    tag: '에듀테크',
    desc: '프리랜서 포트폴리오 & 의뢰 관리',
    layout: '카드그리드형',
    view: 'pc',
  },
  {
    name: '스마트몰',
    url: 'https://smart-mall.foundry.ai.kr',
    screenshot: '/portfolio/smart-mall.png',
    category: '쇼핑몰',
    tag: '쇼핑몰',
    desc: '건강기능식품 멤버십 쇼핑몰',
    layout: '커머스앱형',
    view: 'mobile',
  },
];

export default function PortfolioPage() {
  const [category, setCategory] = useState('전체');

  const filtered = category === '전체' ? APPS : APPS.filter(a => a.category === category);

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <LandingNav />

      {/* 히어로 */}
      <section className="px-5 pt-16 pb-8 md:pt-24 md:pb-12 text-center">
        <h1 className="mb-3 text-3xl md:text-[44px] font-bold tracking-tight">포트폴리오</h1>
        <p className="text-lg text-[#8b95a1]">Foundry로 만든 실제 앱 9개. 클릭하면 라이브로 체험할 수 있습니다.</p>
      </section>

      {/* 카테고리 필터 */}
      <section className="px-5 pb-8">
        <div className="mx-auto max-w-6xl flex gap-2 flex-wrap justify-center">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-[#3182f6] text-white'
                  : 'bg-[#2c2c35] text-[#8b95a1] hover:text-[#f2f4f6]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 앱 카드 */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(app => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-[#2c2c35] bg-[#1b1b21] overflow-hidden hover:border-[#3182f6]/50 hover:shadow-lg hover:shadow-[#3182f6]/10 transition-all flex flex-col cursor-pointer"
            >
              {/* 스크린샷 영역 */}
              <div className="relative h-64 overflow-hidden bg-gradient-to-b from-[#2c2c35] to-[#1b1b21] flex items-center justify-center py-3">
                {app.view === 'mobile' ? (
                  /* 모바일: 폰 프레임 스타일 (세로) */
                  <div className="relative h-full w-auto rounded-xl overflow-hidden shadow-2xl border border-[#3c3c45]">
                    <img
                      src={app.screenshot}
                      alt={app.name}
                      className="h-full w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  /* PC: 모니터 프레임 스타일 (가로) */
                  <div className="relative w-[92%] rounded-lg overflow-hidden shadow-2xl border border-[#3c3c45]">
                    <div className="bg-[#2c2c35] px-3 py-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                      <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
                      <span className="w-2 h-2 rounded-full bg-[#28c840]" />
                    </div>
                    <img
                      src={app.screenshot}
                      alt={app.name}
                      className="w-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <span className="absolute top-3 right-3 z-10 rounded-full bg-[#30d158] px-3 py-1 text-[11px] font-bold text-white tracking-wide shadow-lg">
                  접속하기
                </span>
              </div>

              {/* 본문 */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold mb-1 group-hover:text-[#3182f6] transition-colors">{app.name}</h3>
                <span className="inline-block self-start rounded-full bg-[#3182f6]/10 text-[#3182f6] px-3 py-0.5 text-xs font-medium mb-3">
                  {app.tag}
                </span>
                <p className="text-sm text-[#8b95a1] leading-relaxed mb-4">{app.desc}</p>

                {/* 레이아웃 태그 */}
                <div className="mt-auto flex items-center justify-between">
                  <span className="rounded-lg bg-[#2c2c35] px-2.5 py-1 text-xs text-[#6b7684]">
                    {app.layout}
                  </span>
                  <span className="text-xs text-[#4e5968] group-hover:text-[#3182f6] transition-colors">
                    체험하기 &rarr;
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="px-5 py-16 bg-[#1b1b21]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold">이런 앱을 만들고 싶으신가요?</h2>
          <p className="mb-8 text-[#8b95a1]">AI와 대화하면 30분 안에 나만의 앱이 만들어집니다.</p>
          <a href="/start" className="inline-block rounded-2xl bg-[#3182f6] px-10 py-4 text-lg font-bold text-white hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/25">
            무료로 시작하기 &rarr;
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
