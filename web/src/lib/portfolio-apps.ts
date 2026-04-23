// Phase AD Step 11-A (2026-04-23): 포트폴리오 앱 공용 모듈
// 기존 web/src/app/portfolio/page.tsx 의 APPS 배열을 추출 — ReviewStage / 프리셋 카드 UI 에서 재사용.
// portfolio/page.tsx 는 이 모듈을 import 해서 동일하게 작동 (회귀 방지).

export type LayoutType =
  | '랜딩형'
  | '대시보드형'
  | '피드형'
  | '스텝형'
  | '탭형'
  | '카드그리드형'
  | '커머스앱형';

export const LAYOUT_TYPES: LayoutType[] = [
  '랜딩형',
  '대시보드형',
  '피드형',
  '스텝형',
  '탭형',
  '카드그리드형',
  '커머스앱형',
];

export interface PortfolioApp {
  name: string;
  url: string;
  screenshot: string;
  category: string;
  tag: string;
  desc: string;
  layout: LayoutType;
  view: 'mobile' | 'pc';
}

export const PORTFOLIO_APPS: PortfolioApp[] = [
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

export const PORTFOLIO_CATEGORIES = [
  '전체',
  '매장관리',
  '헬스케어',
  '소셜/커뮤니티',
  '쇼핑몰',
  '에듀테크',
  '지역특산품',
  'O2O 매칭',
];
