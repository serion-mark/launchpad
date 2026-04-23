'use client';

import { useState } from 'react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { PORTFOLIO_APPS as APPS, PORTFOLIO_CATEGORIES as CATEGORIES } from '@/lib/portfolio-apps';

export default function PortfolioPage() {
  const [category, setCategory] = useState('전체');

  const filtered = category === '전체' ? APPS : APPS.filter(a => a.category === category);

  return (
    <div className="min-h-screen bg-[var(--bg-card)] text-[var(--text-primary)]">
      <LandingNav />

      {/* 히어로 */}
      <section className="px-5 pt-16 pb-8 md:pt-24 md:pb-12 text-center">
        <h1 className="mb-3 text-3xl md:text-[44px] font-bold tracking-tight">포트폴리오</h1>
        <p className="text-lg text-[var(--text-secondary)]">Foundry로 만든 실제 앱 9개. 클릭하면 라이브로 체험할 수 있습니다.</p>
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
                  ? 'bg-[var(--toss-blue)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
              className="group rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden hover:border-[var(--toss-blue)]/50 hover:shadow-lg hover:shadow-[#3182f6]/10 transition-all flex flex-col cursor-pointer"
            >
              {/* 스크린샷 영역 */}
              <div className="relative h-64 overflow-hidden bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-secondary)] flex items-center justify-center py-3">
                {app.view === 'mobile' ? (
                  /* 모바일: 폰 프레임 스타일 (세로) */
                  <div className="relative h-full w-auto rounded-xl overflow-hidden shadow-2xl border border-[var(--border-hover)]">
                    <img
                      src={app.screenshot}
                      alt={app.name}
                      className="h-full w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  /* PC: 모니터 프레임 스타일 (가로) */
                  <div className="relative w-[92%] rounded-lg overflow-hidden shadow-2xl border border-[var(--border-hover)]">
                    <div className="bg-[var(--bg-elevated)] px-3 py-1.5 flex items-center gap-1.5">
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
                <span className="absolute top-3 right-3 z-10 rounded-full bg-[var(--toss-green)] px-3 py-1 text-[11px] font-bold text-white tracking-wide shadow-lg">
                  접속하기
                </span>
              </div>

              {/* 본문 */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold mb-1 group-hover:text-[var(--toss-blue)] transition-colors">{app.name}</h3>
                <span className="inline-block self-start rounded-full bg-[var(--toss-blue)]/10 text-[var(--toss-blue)] px-3 py-0.5 text-xs font-medium mb-3">
                  {app.tag}
                </span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{app.desc}</p>

                {/* 레이아웃 태그 */}
                <div className="mt-auto flex items-center justify-between">
                  <span className="rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-tertiary)]">
                    {app.layout}
                  </span>
                  <span className="text-xs text-[var(--text-disabled)] group-hover:text-[var(--toss-blue)] transition-colors">
                    체험하기 &rarr;
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="px-5 py-16 bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold">이런 앱을 만들고 싶으신가요?</h2>
          <p className="mb-8 text-[var(--text-secondary)]">AI와 대화하면 30분 안에 나만의 앱이 만들어집니다.</p>
          <a href="/start" className="inline-block rounded-2xl bg-[var(--toss-blue)] px-10 py-4 text-lg font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors shadow-lg shadow-[#3182f6]/25">
            무료로 시작하기 &rarr;
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
