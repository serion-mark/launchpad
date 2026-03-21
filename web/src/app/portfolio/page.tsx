'use client';

import { useState } from 'react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';

const CATEGORIES = ['전체', '뷰티/미용', 'O2O 매칭', '에듀테크', '쇼핑몰', '시설관리'];

const APPS = [
  {
    name: '헤어드림 POS',
    category: '뷰티/미용',
    icon: '✂️',
    template: 'beauty-salon',
    desc: '미용실 예약 + 매출 관리 + 고객 CRM + 디자이너 정산까지 올인원',
    features: ['예약 관리', '매출/결제', '고객 CRM', '디자이너 정산', '알림톡', '온라인 예약'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,300',
    highlight: '디자이너 5명 규모 미용실에 최적화. 예약↔매출 자동 연동.',
  },
  {
    name: '펫메이트',
    category: 'O2O 매칭',
    icon: '🐾',
    template: 'o2o-matching',
    desc: '반려동물 돌봄 매칭 플랫폼. 펫시터와 보호자를 연결합니다.',
    features: ['매칭 시스템', '실시간 추적', '양방향 리뷰', '결제/에스크로', '1:1 채팅', '관리자 대시보드'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '3,100',
    highlight: '자동 매칭 + 위치 기반 검색. 수수료 자동 정산.',
  },
  {
    name: '코드잇 LMS',
    category: '에듀테크',
    icon: '🎓',
    template: 'edutech',
    desc: '온라인 강의 플랫폼. 수강생 관리부터 수료증 발급까지.',
    features: ['강의 관리', '수강생 CRM', '진도율 추적', '퀴즈/시험', '수료증 PDF', 'Q&A 게시판'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,800',
    highlight: '영상 강의 + 퀴즈 자동채점. 수강생 248명 관리 중.',
  },
  {
    name: '트렌드샵',
    category: '쇼핑몰',
    icon: '🛒',
    template: 'ecommerce',
    desc: '의류 쇼핑몰. 상품 관리부터 배송 추적까지 올인원.',
    features: ['상품 관리', '장바구니', '주문/결제', '배송 관리', '쿠폰/프로모션', '상품 리뷰'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,500',
    highlight: '모바일 최적화 UI. 쿠폰 + 위시리스트 기본 포함.',
  },
  {
    name: '하나관리',
    category: '시설관리',
    icon: '🏢',
    template: 'facility-mgmt',
    desc: '아파트 관리사무소 시스템. 민원 접수부터 관리비 청구까지.',
    features: ['민원 접수/처리', '입주민 관리', '공지사항', '시설 보수', '시설 예약', '관리비 청구'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,700',
    highlight: '342세대 아파트 운영. 민원 처리율 92%.',
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
        <p className="text-lg text-[#8b95a1]">Foundry로 생성한 앱 예시. 이런 앱을 3분 만에 만들 수 있습니다.</p>
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
            <div key={app.name} className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] overflow-hidden hover:border-[#3182f6]/30 transition-colors flex flex-col">
              {/* 헤더 */}
              <div className="bg-gradient-to-br from-[#3182f6]/10 to-[#a855f7]/10 p-8 text-center">
                <div className="text-5xl mb-3">{app.icon}</div>
                <h3 className="text-xl font-bold">{app.name}</h3>
                <span className="mt-1 inline-block rounded-full bg-[#2c2c35] px-3 py-0.5 text-xs text-[#8b95a1]">{app.category}</span>
              </div>

              {/* 본문 */}
              <div className="p-6 flex-1 flex flex-col">
                <p className="mb-4 text-sm text-[#8b95a1] leading-relaxed">{app.desc}</p>

                {/* 하이라이트 */}
                <div className="mb-4 rounded-lg bg-[#3182f6]/5 border border-[#3182f6]/20 px-4 py-3">
                  <p className="text-xs text-[#3182f6] font-medium">{app.highlight}</p>
                </div>

                {/* 기능 태그 */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {app.features.map(f => (
                    <span key={f} className="rounded-lg bg-[#2c2c35] px-2.5 py-1 text-xs text-[#8b95a1]">{f}</span>
                  ))}
                </div>

                {/* 메타 정보 */}
                <div className="mt-auto pt-4 border-t border-[#2c2c35] grid grid-cols-3 gap-2 text-xs text-[#6b7684]">
                  <div>
                    <div className="text-[#4e5968]">생성 시간</div>
                    <div className="font-medium text-[#8b95a1]">{app.genTime}</div>
                  </div>
                  <div>
                    <div className="text-[#4e5968]">소모 크레딧</div>
                    <div className="font-medium text-[#8b95a1]">{app.credits}</div>
                  </div>
                  <div>
                    <div className="text-[#4e5968]">기술 스택</div>
                    <div className="font-medium text-[#8b95a1]">Next.js</div>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href="/start"
                  className="mt-5 block rounded-xl bg-[#3182f6] py-3 text-center text-sm font-bold text-white hover:bg-[#1b64da] transition-colors"
                >
                  이 앱 만들어보기 &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-16 bg-[#1b1b21]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold">나만의 앱을 만들어보세요</h2>
          <p className="mb-8 text-[#8b95a1]">위 예시처럼, 또는 완전히 새로운 앱을 AI가 3분 만에 생성합니다.</p>
          <a href="/start" className="inline-block rounded-2xl bg-[#3182f6] px-10 py-4 text-lg font-bold text-white hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/25">
            지금 무료로 시작하기 &rarr;
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
