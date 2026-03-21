'use client';

import { useState } from 'react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import AppMockup from '../components/AppMockup';

const CATEGORIES = ['전체', '뷰티/미용', 'O2O 매칭', '에듀테크', '쇼핑몰', '시설관리', '지역특산품', '전문가매칭', '헬스케어', '소셜/매칭', '스마트팜'];

type MockupType = 'pos' | 'matching' | 'lms' | 'shop' | 'facility' | 'farm' | 'expert' | 'health' | 'social' | 'smartfarm';

const APPS: {
  name: string; category: string; icon: string; template: string; desc: string;
  features: string[]; techStack: string; genTime: string; credits: string;
  highlight: string; badge: string; mockup: MockupType; screenshot?: string; liveUrl?: string;
}[] = [
  {
    name: '헤어드림 POS',
    category: '뷰티/미용',
    icon: '✂️',
    template: 'beauty-salon',
    mockup: 'pos',
    desc: '미용실 예약 + 매출 관리 + 고객 CRM + 디자이너 정산까지 올인원',
    features: ['예약 관리', '매출/결제', '고객 CRM', '디자이너 정산', '알림톡', '온라인 예약'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,300',
    highlight: '디자이너 5명 규모 미용실에 최적화. 예약↔매출 자동 연동.',
    badge: '지역',
  },
  {
    name: '펫메이트',
    category: 'O2O 매칭',
    icon: '🐾',
    template: 'o2o-matching',
    mockup: 'matching',
    screenshot: '/screenshots/petmate.png',
    liveUrl: 'https://foundry.ai.kr/petmate/dashboard',
    desc: '반려동물 돌봄 매칭 플랫폼. 펫시터와 보호자를 연결합니다.',
    features: ['매칭 시스템', '실시간 추적', '양방향 리뷰', '결제/에스크로', '1:1 채팅', '관리자 대시보드'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '3,100',
    highlight: '자동 매칭 + 위치 기반 검색. 수수료 자동 정산.',
    badge: '테크',
  },
  {
    name: '코드잇 LMS',
    category: '에듀테크',
    icon: '🎓',
    template: 'edutech',
    mockup: 'lms',
    desc: '온라인 강의 플랫폼. 수강생 관리부터 수료증 발급까지.',
    features: ['강의 관리', '수강생 CRM', '진도율 추적', '퀴즈/시험', '수료증 PDF', 'Q&A 게시판'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,800',
    highlight: '영상 강의 + 퀴즈 자동채점. 수강생 248명 관리 중.',
    badge: '테크',
  },
  {
    name: '트렌드샵',
    category: '쇼핑몰',
    icon: '🛒',
    template: 'ecommerce',
    mockup: 'shop',
    desc: '의류 쇼핑몰. 상품 관리부터 배송 추적까지 올인원.',
    features: ['상품 관리', '장바구니', '주문/결제', '배송 관리', '쿠폰/프로모션', '상품 리뷰'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,500',
    highlight: '모바일 최적화 UI. 쿠폰 + 위시리스트 기본 포함.',
    badge: '지역',
  },
  {
    name: '하나관리',
    category: '시설관리',
    icon: '🏢',
    template: 'facility-mgmt',
    mockup: 'facility',
    desc: '아파트 관리사무소 시스템. 민원 접수부터 관리비 청구까지.',
    features: ['민원 접수/처리', '입주민 관리', '공지사항', '시설 보수', '시설 예약', '관리비 청구'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,700',
    highlight: '342세대 아파트 운영. 민원 처리율 92%.',
    badge: '지역',
  },
  {
    name: '백설공주 사과농장',
    category: '지역특산품',
    icon: '🍎',
    template: 'local-commerce',
    mockup: 'farm',
    desc: '영주 사과 산지직송몰. 농장 소개, 정기배송, 체험 예약까지.',
    features: ['산지직송 주문', '농장 소개', '정기배송/구독', '체험 예약', '쿠폰/기획전', '상품 후기'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,600',
    highlight: '귀농 청년 사과농장. 산지직송 + 농장체험 예약 원스톱.',
    badge: '지역',
  },
  {
    name: '매칭히어로',
    category: '전문가매칭',
    icon: '🔧',
    template: 'matching',
    mockup: 'expert',
    desc: '전문가 매칭 플랫폼. 인테리어/이사/과외 등 견적 요청 & 매칭.',
    features: ['견적 요청', '전문가 프로필', '자동 매칭', '1:1 채팅', '리뷰/평점', '수수료 정산'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '3,000',
    highlight: '숨고 스타일. 카테고리별 전문가 3만명+ 규모 설계.',
    badge: '테크',
  },
  {
    name: '하루습관',
    category: '헬스케어',
    icon: '💊',
    template: 'healthcare',
    mockup: 'health',
    desc: '복약/운동/식단 습관 트래커. 기록하고 통계로 확인하세요.',
    features: ['습관 기록', '복약 리마인더', '운동/식단 로그', '통계 차트', '목표 설정', '주간 리포트'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,400',
    highlight: '삐약이 스타일. GLP-1 다이어트 관리에도 활용 가능.',
    badge: '테크',
  },
  {
    name: '취미모아',
    category: '소셜/매칭',
    icon: '💕',
    template: 'custom',
    mockup: 'social',
    desc: '취미 기반 동호회 매칭. 등산/러닝/독서 등 관심사로 연결.',
    features: ['프로필 생성', '취미 매칭', '그룹 채팅', '모임 일정', '동호회 관리', '오프라인 모임'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,800',
    highlight: '시니어 동호회, 지역 소모임에 최적. 5060 세대 블루오션.',
    badge: '테크',
  },
  {
    name: '팜투홈',
    category: '스마트팜',
    icon: '🌿',
    template: 'local-commerce',
    mockup: 'smartfarm',
    desc: '농장 직판몰 + 체험 예약. 소비자에게 직접 판매하세요.',
    features: ['농산물 직판', '체험 예약', '정기배송', '농장 소개', '후기/사진', '주문 관리'],
    techStack: 'Next.js + Supabase + PostgreSQL',
    genTime: '약 3분',
    credits: '2,500',
    highlight: '귀농귀촌 청년 필수. 농장→소비자 직거래 플랫폼.',
    badge: '지역',
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
              {/* 헤더: 스크린샷 or CSS 목업 */}
              <div className="bg-gradient-to-br from-[#3182f6]/10 to-[#a855f7]/10 p-4 relative">
                {app.badge && (
                  <span className={`absolute top-3 right-3 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${app.badge === '지역' ? 'bg-[#30d158]/10 text-[#30d158]' : 'bg-[#a855f7]/10 text-[#a855f7]'}`}>{app.badge}</span>
                )}
                {app.screenshot ? (
                  <div className="relative">
                    <img src={app.screenshot} alt={app.name} className="w-full rounded-lg border border-[#2c2c35]/50" />
                    {app.liveUrl && (
                      <a href={app.liveUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 rounded-full bg-[#30d158] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#28b84c] transition-colors">
                        LIVE
                      </a>
                    )}
                  </div>
                ) : (
                  <AppMockup type={app.mockup} />
                )}
                <div className="mt-3 text-center">
                  <h3 className="text-xl font-bold">{app.name}</h3>
                  <span className="mt-1 inline-block rounded-full bg-[#2c2c35] px-3 py-0.5 text-xs text-[#8b95a1]">{app.category}</span>
                </div>
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
