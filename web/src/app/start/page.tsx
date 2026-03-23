'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authFetch, getUser, getToken, logout, API_BASE } from '@/lib/api';

// ── 템플릿 데이터 ──────────────────────────────────────
const TEMPLATES = [
  {
    id: 'beauty-salon',
    name: '미용실 POS',
    icon: '✂️',
    category: '뷰티/미용',
    description: '예약 + 매출/정산 + 고객 CRM + 디자이너 관리',
    features: [
      { id: 'reservation', name: '예약 관리', required: true, credits: 0 },
      { id: 'sales', name: '매출/결제 관리', required: true, credits: 0 },
      { id: 'customer', name: '고객 관리 (CRM)', required: true, credits: 0 },
      { id: 'staff', name: '스태프 관리', required: true, credits: 0 },
      { id: 'service-menu', name: '시술 메뉴 관리', required: true, credits: 0 },
      { id: 'dashboard', name: '매출 대시보드', required: false, credits: 300 },
      { id: 'online-booking', name: '온라인 예약 페이지', required: false, credits: 300 },
      { id: 'alimtalk', name: '카카오 알림톡', required: false, credits: 500 },
      { id: 'settlement', name: '디자이너 정산', required: false, credits: 300 },
      { id: 'prepaid', name: '정액권/선불권', required: false, credits: 200 },
    ],
    baseCredits: 2000,
  },
  {
    id: 'booking-crm',
    name: '범용 예약/CRM',
    icon: '📅',
    category: '예약/서비스',
    description: '업종 무관 예약 + 고객 관리 + 매출 통계',
    features: [
      { id: 'booking', name: '예약 관리', required: true, credits: 0 },
      { id: 'customer', name: '고객 관리 (CRM)', required: true, credits: 0 },
      { id: 'service-menu', name: '서비스 메뉴 관리', required: true, credits: 0 },
      { id: 'staff', name: '담당자 관리', required: true, credits: 0 },
      { id: 'payment', name: '결제 관리', required: false, credits: 300 },
      { id: 'dashboard', name: '통계 대시보드', required: false, credits: 300 },
      { id: 'online-booking', name: '온라인 예약 페이지', required: false, credits: 300 },
      { id: 'notification', name: '알림 (이메일/SMS)', required: false, credits: 400 },
      { id: 'membership', name: '회원권/정기권', required: false, credits: 300 },
      { id: 'review', name: '리뷰/평점', required: false, credits: 200 },
    ],
    baseCredits: 1500,
  },
  {
    id: 'ecommerce',
    name: '쇼핑몰/커머스',
    icon: '🛒',
    category: '커머스/유통',
    description: '상품 등록 + 장바구니 + 주문/결제 + 배송 관리',
    features: [
      { id: 'product', name: '상품 관리', required: true, credits: 0 },
      { id: 'cart', name: '장바구니', required: true, credits: 0 },
      { id: 'order', name: '주문/결제', required: true, credits: 0 },
      { id: 'shipping', name: '배송 관리', required: true, credits: 0 },
      { id: 'member', name: '회원 관리', required: true, credits: 0 },
      { id: 'admin-dashboard', name: '관리자 대시보드', required: false, credits: 300 },
      { id: 'coupon', name: '쿠폰/프로모션', required: false, credits: 200 },
      { id: 'review', name: '상품 리뷰', required: false, credits: 200 },
      { id: 'wishlist', name: '위시리스트/찜', required: false, credits: 100 },
      { id: 'seo', name: 'SEO 최적화', required: false, credits: 200 },
    ],
    baseCredits: 2000,
  },
  {
    id: 'o2o-matching',
    name: 'O2O 매칭',
    icon: '🔗',
    category: '매칭/중개',
    description: '수요↔공급 매칭 + 실시간 상태 + 리뷰/정산',
    features: [
      { id: 'matching', name: '매칭 시스템', required: true, credits: 0 },
      { id: 'provider-mgmt', name: '제공자 관리', required: true, credits: 0 },
      { id: 'customer', name: '고객(수요자) 관리', required: true, credits: 0 },
      { id: 'order-status', name: '실시간 상태 추적', required: true, credits: 0 },
      { id: 'payment', name: '결제/에스크로', required: true, credits: 0 },
      { id: 'review', name: '양방향 리뷰/평점', required: false, credits: 200 },
      { id: 'map', name: '지도 연동 (카카오맵)', required: false, credits: 400 },
      { id: 'chat', name: '1:1 채팅', required: false, credits: 400 },
      { id: 'settlement', name: '수수료 정산', required: false, credits: 300 },
      { id: 'notification', name: '알림톡/푸시', required: false, credits: 300 },
      { id: 'dashboard', name: '관리자 대시보드', required: false, credits: 300 },
    ],
    baseCredits: 2500,
  },
  {
    id: 'edutech',
    name: '에듀테크 (LMS)',
    icon: '🎓',
    category: '교육/강의',
    description: '강의 관리 + 수강생 CRM + 퀴즈/시험 + 수료증',
    features: [
      { id: 'course', name: '강의/커리큘럼 관리', required: true, credits: 0 },
      { id: 'student', name: '수강생 관리 (CRM)', required: true, credits: 0 },
      { id: 'progress', name: '진도율 추적', required: true, credits: 0 },
      { id: 'payment', name: '수강 결제/수강권', required: true, credits: 0 },
      { id: 'quiz', name: '퀴즈/시험 (자동채점)', required: false, credits: 300 },
      { id: 'certificate', name: '수료증 PDF 발급', required: false, credits: 300 },
      { id: 'community', name: 'Q&A 게시판', required: false, credits: 200 },
      { id: 'attendance', name: '출석 체크', required: false, credits: 200 },
      { id: 'notification', name: '리마인더 알림톡', required: false, credits: 300 },
      { id: 'dashboard', name: '매출/수강 대시보드', required: false, credits: 300 },
    ],
    baseCredits: 2000,
  },
  {
    id: 'facility-mgmt',
    name: '관리업체/시설관리',
    icon: '🏢',
    category: '관리/시설',
    description: '민원 접수/처리 + 입주민 CRM + 시설 예약 + 관리비',
    features: [
      { id: 'complaint', name: '민원 접수/처리', required: true, credits: 0 },
      { id: 'tenant', name: '입주민/회원 관리', required: true, credits: 0 },
      { id: 'notice', name: '공지사항/관리내역', required: true, credits: 0 },
      { id: 'maintenance', name: '시설 보수 관리', required: true, credits: 0 },
      { id: 'facility-booking', name: '시설 예약 (회의실/주차)', required: false, credits: 300 },
      { id: 'billing', name: '관리비 청구/수납', required: false, credits: 400 },
      { id: 'notification', name: '알림톡 (공지/민원)', required: false, credits: 300 },
      { id: 'phone-log', name: '전화 민원 자동 기록', required: false, credits: 400 },
      { id: 'dashboard', name: '민원 현황 대시보드', required: false, credits: 300 },
      { id: 'satisfaction', name: '만족도 조사', required: false, credits: 200 },
    ],
    baseCredits: 2000,
  },
  {
    id: 'local-commerce',
    name: '지역커머스/특산품',
    icon: '🐟',
    category: '지역/커머스',
    description: '지역 특산품 산지직송 + 정기배송 + 쿠폰/기획전',
    features: [
      { id: 'product', name: '상품 관리', required: true, credits: 0 },
      { id: 'order', name: '주문/결제', required: true, credits: 0 },
      { id: 'shipping', name: '배송 관리', required: true, credits: 0 },
      { id: 'store-intro', name: '가게/농장 소개', required: true, credits: 0 },
      { id: 'member', name: '회원 관리', required: true, credits: 0 },
      { id: 'subscription', name: '정기배송/구독', required: false, credits: 300 },
      { id: 'coupon', name: '쿠폰/기획전', required: false, credits: 200 },
      { id: 'review', name: '상품 후기', required: false, credits: 200 },
      { id: 'experience', name: '체험 예약', required: false, credits: 300 },
      { id: 'dashboard', name: '매출 대시보드', required: false, credits: 300 },
    ],
    baseCredits: 2000,
  },
  {
    id: 'healthcare',
    name: '헬스케어/습관관리',
    icon: '💊',
    category: '헬스/웰니스',
    description: '복약관리 + 운동/식단 기록 + 통계 + 리마인더',
    features: [
      { id: 'tracking', name: '습관 기록/트래킹', required: true, credits: 0 },
      { id: 'dashboard', name: '통계 대시보드', required: true, credits: 0 },
      { id: 'auth', name: '로그인/회원가입', required: true, credits: 0 },
      { id: 'goal', name: '목표 설정', required: true, credits: 0 },
      { id: 'reminder', name: '리마인더 알림', required: false, credits: 300 },
      { id: 'medication', name: '복약 관리', required: false, credits: 300 },
      { id: 'exercise', name: '운동 기록', required: false, credits: 200 },
      { id: 'diet', name: '식단 기록', required: false, credits: 200 },
      { id: 'report', name: '주간/월간 리포트', required: false, credits: 300 },
      { id: 'community', name: '커뮤니티/동기부여', required: false, credits: 300 },
    ],
    baseCredits: 1800,
  },
  {
    id: 'matching',
    name: '전문가매칭/견적',
    icon: '🔧',
    category: '매칭/O2O',
    description: '전문가 프로필 + 견적 요청 + 매칭 + 리뷰',
    features: [
      { id: 'expert-profile', name: '전문가 프로필', required: true, credits: 0 },
      { id: 'request', name: '견적 요청', required: true, credits: 0 },
      { id: 'matching', name: '자동 매칭', required: true, credits: 0 },
      { id: 'customer', name: '고객 관리', required: true, credits: 0 },
      { id: 'review', name: '리뷰/평점', required: false, credits: 200 },
      { id: 'chat', name: '1:1 채팅', required: false, credits: 400 },
      { id: 'payment', name: '결제/에스크로', required: false, credits: 400 },
      { id: 'settlement', name: '수수료 정산', required: false, credits: 300 },
      { id: 'category', name: '카테고리 관리', required: false, credits: 200 },
      { id: 'dashboard', name: '관리자 대시보드', required: false, credits: 300 },
    ],
    baseCredits: 2200,
  },
  {
    id: 'custom',
    name: '자유롭게 만들기',
    icon: '✨',
    category: '범용/자유',
    description: '업종 제한 없이 원하는 앱을 자유롭게 설명하세요. AI가 아키텍처를 자동 설계합니다.',
    features: [
      { id: 'custom-app', name: '맞춤 앱 생성', required: true, credits: 0 },
      { id: 'dashboard', name: '대시보드', required: false, credits: 300 },
      { id: 'auth', name: '로그인/회원가입', required: false, credits: 200 },
      { id: 'crud', name: '데이터 관리 (CRUD)', required: false, credits: 200 },
      { id: 'notification', name: '알림 기능', required: false, credits: 300 },
      { id: 'search', name: '검색/필터', required: false, credits: 200 },
      { id: 'chart', name: '차트/통계', required: false, credits: 300 },
      { id: 'file-upload', name: '파일 업로드', required: false, credits: 300 },
    ],
    baseCredits: 1500,
  },
];

// ── 업종별 맞춤 질문지 ─────────────────────────────────
type QuestionType = 'radio' | 'checkbox' | 'text';
interface Question {
  id: string;
  question: string;
  type: QuestionType;
  options?: { label: string; value: string; featureMap?: string[] }[];
  placeholder?: string;
}

const COMMON_QUESTIONS: Question[] = [
  { id: 'biz-name', question: '매장(서비스) 이름이 뭔가요?', type: 'text', placeholder: '예: 마크헤어, 해피카페' },
  { id: 'visit-method', question: '고객이 주로 어떻게 찾아오나요?', type: 'checkbox', options: [
    { label: '미리 예약하고 온다', value: 'reservation', featureMap: ['online-booking', 'booking'] },
    { label: '그냥 와서 기다린다 (워크인)', value: 'walkin' },
    { label: '전화로 문의 후 방문', value: 'phone', featureMap: ['alimtalk', 'notification'] },
    { label: 'SNS/인스타 DM으로 예약', value: 'sns', featureMap: ['online-booking', 'booking'] },
  ]},
  { id: 'pain-point', question: '지금 가장 불편한 점은? (복수 선택)', type: 'checkbox', options: [
    { label: '예약이 꼬여서 더블부킹 됨', value: 'double-booking', featureMap: ['reservation', 'booking'] },
    { label: '매출 정산이 수기라 힘듦', value: 'manual-settlement', featureMap: ['dashboard', 'admin-dashboard', 'settlement'] },
    { label: '단골 관리가 안 됨', value: 'no-crm', featureMap: ['customer'] },
    { label: '노쇼가 많아서 스트레스', value: 'no-show', featureMap: ['alimtalk', 'notification'] },
    { label: '재고/상품 관리가 복잡', value: 'inventory', featureMap: ['product'] },
  ]},
];

const TEMPLATE_QUESTIONS: Record<string, Question[]> = {
  'beauty-salon': [
    { id: 'target-gender', question: '주로 어떤 고객이 오시나요?', type: 'radio', options: [
      { label: '여성 위주', value: 'female' },
      { label: '남성 위주 (바버샵)', value: 'male' },
      { label: '남녀 모두', value: 'both' },
    ]},
    { id: 'staff-count', question: '디자이너가 몇 명인가요?', type: 'radio', options: [
      { label: '나 혼자', value: 'solo' },
      { label: '2~5명', value: 'small', featureMap: ['staff', 'settlement'] },
      { label: '6명 이상', value: 'large', featureMap: ['staff', 'settlement', 'dashboard'] },
    ]},
    { id: 'booking-type', question: '예약 방식이 어떻게 되나요?', type: 'radio', options: [
      { label: '예약제 (미리 잡고 온다)', value: 'reservation', featureMap: ['reservation', 'online-booking'] },
      { label: '워크인 (와서 기다린다)', value: 'walkin' },
      { label: '둘 다', value: 'both', featureMap: ['reservation', 'online-booking'] },
    ]},
    { id: 'extras', question: '이런 기능도 필요하세요?', type: 'checkbox', options: [
      { label: '고객한테 카톡 알림 보내기', value: 'alimtalk', featureMap: ['alimtalk'] },
      { label: '정액권/선불권 판매', value: 'prepaid', featureMap: ['prepaid'] },
      { label: '온라인 예약 페이지', value: 'online', featureMap: ['online-booking'] },
      { label: '매출 통계 대시보드', value: 'stats', featureMap: ['dashboard'] },
    ]},
  ],
  'booking-crm': [
    { id: 'biz-type', question: '어떤 업종이세요?', type: 'radio', options: [
      { label: '병원/클리닉', value: 'clinic' },
      { label: '피트니스/요가', value: 'fitness' },
      { label: '학원/교육', value: 'education' },
      { label: '카페/식당', value: 'cafe' },
      { label: '기타 서비스', value: 'other' },
    ]},
    { id: 'staff-count', question: '담당자(직원)가 몇 명인가요?', type: 'radio', options: [
      { label: '나 혼자', value: 'solo' },
      { label: '2~5명', value: 'small', featureMap: ['staff'] },
      { label: '6명 이상', value: 'large', featureMap: ['staff', 'dashboard'] },
    ]},
    { id: 'extras', question: '추가로 필요한 기능은?', type: 'checkbox', options: [
      { label: '온라인 예약 페이지', value: 'online', featureMap: ['online-booking'] },
      { label: '결제 관리 (카드/현금)', value: 'payment', featureMap: ['payment'] },
      { label: '알림 (카톡/문자)', value: 'notification', featureMap: ['notification'] },
      { label: '회원권/정기권', value: 'membership', featureMap: ['membership'] },
      { label: '리뷰/평점', value: 'review', featureMap: ['review'] },
    ]},
  ],
  'ecommerce': [
    { id: 'product-type', question: '어떤 상품을 판매하세요?', type: 'radio', options: [
      { label: '의류/패션', value: 'fashion' },
      { label: '식품/음료', value: 'food' },
      { label: '핸드메이드/수공예', value: 'handmade' },
      { label: '전자제품/가전', value: 'electronics' },
      { label: '기타', value: 'other' },
    ]},
    { id: 'delivery', question: '배송은 어떻게 하시나요?', type: 'radio', options: [
      { label: '택배 배송', value: 'delivery', featureMap: ['shipping'] },
      { label: '직접 배송/퀵', value: 'direct', featureMap: ['shipping'] },
      { label: '매장 픽업', value: 'pickup' },
      { label: '디지털 상품 (배송 없음)', value: 'digital' },
    ]},
    { id: 'subscription', question: '정기 구독(정기배송) 서비스도 하시나요?', type: 'radio', options: [
      { label: '네, 정기배송 있어요', value: 'yes', featureMap: ['coupon'] },
      { label: '아니요, 단건 판매만', value: 'no' },
    ]},
    { id: 'extras', question: '추가로 필요한 기능은?', type: 'checkbox', options: [
      { label: '쿠폰/프로모션', value: 'coupon', featureMap: ['coupon'] },
      { label: '상품 리뷰', value: 'review', featureMap: ['review'] },
      { label: '위시리스트/찜', value: 'wishlist', featureMap: ['wishlist'] },
      { label: 'SEO 최적화', value: 'seo', featureMap: ['seo'] },
    ]},
  ],
  'o2o-matching': [
    { id: 'service-type', question: '어떤 서비스를 매칭하나요?', type: 'radio', options: [
      { label: '배달/심부름', value: 'delivery' },
      { label: '청소/가사도우미', value: 'cleaning' },
      { label: '과외/레슨', value: 'tutoring' },
      { label: '펫시터/반려동물', value: 'pet' },
      { label: '부동산/인테리어', value: 'realestate' },
      { label: '기타 서비스', value: 'other' },
    ]},
    { id: 'matching-method', question: '매칭 방식은?', type: 'radio', options: [
      { label: '자동 매칭 (가까운 제공자 배정)', value: 'auto', featureMap: ['map'] },
      { label: '제공자가 입찰 (견적 제출)', value: 'bid' },
      { label: '고객이 직접 선택', value: 'choose', featureMap: ['review'] },
    ]},
    { id: 'payment-method', question: '결제 방식은?', type: 'radio', options: [
      { label: '선결제 (에스크로)', value: 'prepay', featureMap: ['payment'] },
      { label: '후결제 (서비스 완료 후)', value: 'postpay', featureMap: ['payment'] },
      { label: '현장 결제', value: 'onsite' },
    ]},
    { id: 'extras', question: '추가 기능이 필요하세요?', type: 'checkbox', options: [
      { label: '지도에서 제공자 위치 보기', value: 'map', featureMap: ['map'] },
      { label: '매칭 후 1:1 채팅', value: 'chat', featureMap: ['chat'] },
      { label: '양방향 리뷰/평점', value: 'review', featureMap: ['review'] },
      { label: '수수료 자동 정산', value: 'settlement', featureMap: ['settlement'] },
      { label: '관리자 대시보드', value: 'dashboard', featureMap: ['dashboard'] },
    ]},
  ],
  'edutech': [
    { id: 'edu-type', question: '어떤 교육 서비스인가요?', type: 'radio', options: [
      { label: '온라인 강의 (VOD)', value: 'vod' },
      { label: '실시간 라이브 수업', value: 'live' },
      { label: '오프라인 학원/교습소', value: 'offline' },
      { label: '기업 교육/연수', value: 'corporate' },
      { label: '자격증/시험 대비', value: 'exam' },
    ]},
    { id: 'content-type', question: '강의 콘텐츠 형태는?', type: 'checkbox', options: [
      { label: '영상 강의 (YouTube/Vimeo 임베드)', value: 'video', featureMap: ['course'] },
      { label: 'PDF/PPT 교재', value: 'document', featureMap: ['course'] },
      { label: '실시간 화상 수업 (Zoom 연동)', value: 'zoom', featureMap: ['attendance'] },
      { label: '과제/포트폴리오 제출', value: 'assignment', featureMap: ['quiz'] },
    ]},
    { id: 'eval-method', question: '평가 방식은?', type: 'checkbox', options: [
      { label: '퀴즈/시험 (자동 채점)', value: 'quiz', featureMap: ['quiz'] },
      { label: '과제 제출', value: 'assignment', featureMap: ['quiz'] },
      { label: '수료증 자동 발급', value: 'certificate', featureMap: ['certificate'] },
      { label: '평가 없음 (자유 수강)', value: 'none' },
    ]},
    { id: 'extras', question: '추가 기능이 필요하세요?', type: 'checkbox', options: [
      { label: 'Q&A 게시판/커뮤니티', value: 'community', featureMap: ['community'] },
      { label: '출석 체크', value: 'attendance', featureMap: ['attendance'] },
      { label: '수업 리마인더 알림', value: 'notification', featureMap: ['notification'] },
      { label: '매출/수강 통계', value: 'dashboard', featureMap: ['dashboard'] },
    ]},
  ],
  'facility-mgmt': [
    { id: 'facility-type', question: '어떤 시설을 관리하나요?', type: 'radio', options: [
      { label: '아파트/주거단지', value: 'apartment' },
      { label: '오피스빌딩/상업시설', value: 'office' },
      { label: '공유오피스/코워킹', value: 'coworking' },
      { label: '상가/쇼핑몰', value: 'mall' },
      { label: '기타 시설', value: 'other' },
    ]},
    { id: 'complaint-type', question: '주요 민원 유형은? (복수 선택)', type: 'checkbox', options: [
      { label: '하자보수 (누수/벽면/설비)', value: 'repair', featureMap: ['maintenance'] },
      { label: '소음/층간소음', value: 'noise', featureMap: ['complaint'] },
      { label: '주차 문제', value: 'parking', featureMap: ['facility-booking'] },
      { label: '시설 이용 문의', value: 'facility', featureMap: ['facility-booking'] },
      { label: '관리비 관련', value: 'billing', featureMap: ['billing'] },
    ]},
    { id: 'scale', question: '관리 규모는?', type: 'radio', options: [
      { label: '소규모 (~100세대/호실)', value: 'small' },
      { label: '중규모 (100~500세대)', value: 'medium', featureMap: ['dashboard'] },
      { label: '대규모 (500세대 이상)', value: 'large', featureMap: ['dashboard', 'phone-log'] },
    ]},
    { id: 'extras', question: '추가 기능이 필요하세요?', type: 'checkbox', options: [
      { label: '시설 예약 (회의실/커뮤니티)', value: 'booking', featureMap: ['facility-booking'] },
      { label: '관리비 청구/수납', value: 'billing', featureMap: ['billing'] },
      { label: '전화 민원 자동 기록', value: 'phone', featureMap: ['phone-log'] },
      { label: '알림톡 (공지/처리결과)', value: 'notification', featureMap: ['notification'] },
      { label: '만족도 조사', value: 'satisfaction', featureMap: ['satisfaction'] },
    ]},
  ],
  'local-commerce': [
    { id: 'product-type', question: '어떤 상품을 판매하세요?', type: 'radio', options: [
      { label: '수산물/해산물', value: 'seafood' },
      { label: '농산물/과일', value: 'farm' },
      { label: '축산물/한우', value: 'meat' },
      { label: '지역 특산품 (꿀, 잼, 전통주 등)', value: 'specialty' },
      { label: '기타', value: 'other' },
    ]},
    { id: 'delivery', question: '배송 방식은?', type: 'radio', options: [
      { label: '택배 산지직송', value: 'delivery', featureMap: ['shipping'] },
      { label: '방문 수령/픽업', value: 'pickup' },
      { label: '둘 다', value: 'both', featureMap: ['shipping'] },
    ]},
    { id: 'subscription', question: '정기배송(구독) 서비스도 하시나요?', type: 'radio', options: [
      { label: '네, 정기배송 있어요', value: 'yes', featureMap: ['subscription'] },
      { label: '아니요, 단건 판매만', value: 'no' },
      { label: '추후 도입 예정', value: 'later' },
    ]},
    { id: 'extras', question: '추가로 필요한 기능은?', type: 'checkbox', options: [
      { label: '쿠폰/기획전 이벤트', value: 'coupon', featureMap: ['coupon'] },
      { label: '농장/가게 체험 예약', value: 'experience', featureMap: ['experience'] },
      { label: '상품 후기', value: 'review', featureMap: ['review'] },
      { label: '매출 통계 대시보드', value: 'dashboard', featureMap: ['dashboard'] },
    ]},
  ],
  'healthcare': [
    { id: 'health-type', question: '어떤 건강 관리를 주로 하시나요?', type: 'checkbox', options: [
      { label: '복약 관리 (약 복용 기록)', value: 'medication', featureMap: ['medication'] },
      { label: '운동 기록 (러닝, 헬스 등)', value: 'exercise', featureMap: ['exercise'] },
      { label: '식단/칼로리 관리', value: 'diet', featureMap: ['diet'] },
      { label: '다이어트/체중 관리', value: 'weight', featureMap: ['tracking'] },
    ]},
    { id: 'reminder-need', question: '알림/리마인더가 필요하세요?', type: 'radio', options: [
      { label: '네, 복약/운동 시간 알림', value: 'yes', featureMap: ['reminder'] },
      { label: '아니요, 직접 기록만', value: 'no' },
    ]},
    { id: 'report', question: '통계/리포트 형태는?', type: 'radio', options: [
      { label: '일간 기록만', value: 'daily' },
      { label: '주간/월간 리포트까지', value: 'weekly', featureMap: ['report'] },
      { label: '차트/그래프로 시각화', value: 'chart', featureMap: ['report', 'dashboard'] },
    ]},
    { id: 'extras', question: '추가 기능이 필요하세요?', type: 'checkbox', options: [
      { label: '목표 설정 (일일 걸음수 등)', value: 'goal', featureMap: ['goal'] },
      { label: '커뮤니티/동기부여 게시판', value: 'community', featureMap: ['community'] },
      { label: '통계 대시보드', value: 'dashboard', featureMap: ['dashboard'] },
    ]},
  ],
  'matching': [
    { id: 'service-field', question: '어떤 분야의 전문가를 매칭하나요?', type: 'radio', options: [
      { label: '인테리어/리모델링', value: 'interior' },
      { label: '이사/청소', value: 'moving' },
      { label: '과외/레슨', value: 'tutoring' },
      { label: '법률/세무 상담', value: 'legal' },
      { label: '기타 전문 서비스', value: 'other' },
    ]},
    { id: 'matching-method', question: '매칭 방식은?', type: 'radio', options: [
      { label: '고객이 견적 요청 → 전문가가 견적 제출', value: 'bid', featureMap: ['request'] },
      { label: '고객이 전문가 리스트에서 직접 선택', value: 'choose', featureMap: ['expert-profile'] },
      { label: '자동 매칭 (조건 기반)', value: 'auto', featureMap: ['matching'] },
    ]},
    { id: 'payment-method', question: '결제 방식은?', type: 'radio', options: [
      { label: '플랫폼 결제 (에스크로)', value: 'escrow', featureMap: ['payment'] },
      { label: '현장 결제 (플랫폼은 중개만)', value: 'onsite' },
      { label: '둘 다', value: 'both', featureMap: ['payment'] },
    ]},
    { id: 'extras', question: '추가 기능이 필요하세요?', type: 'checkbox', options: [
      { label: '리뷰/평점 시스템', value: 'review', featureMap: ['review'] },
      { label: '1:1 채팅', value: 'chat', featureMap: ['chat'] },
      { label: '수수료 자동 정산', value: 'settlement', featureMap: ['settlement'] },
      { label: '카테고리별 서비스 관리', value: 'category', featureMap: ['category'] },
      { label: '관리자 대시보드', value: 'dashboard', featureMap: ['dashboard'] },
    ]},
  ],
  'custom': [
    { id: 'app-type', question: '어떤 앱을 만들고 싶으세요?', type: 'radio', options: [
      { label: '개인용 도구 (타이머, 가계부, 메모 등)', value: 'personal-tool' },
      { label: '비즈니스/관리 (대시보드, CRM, 재고 등)', value: 'business', featureMap: ['dashboard', 'auth', 'crud'] },
      { label: '커뮤니티/소셜 (게시판, 피드, 채팅 등)', value: 'community', featureMap: ['auth', 'crud'] },
      { label: '콘텐츠/미디어 (블로그, 갤러리, 포트폴리오)', value: 'content', featureMap: ['crud'] },
      { label: '기타 (직접 설명할게요)', value: 'other' },
    ]},
    { id: 'data-need', question: '데이터 저장이 필요한가요?', type: 'radio', options: [
      { label: '아니요, 브라우저에만 저장 (새로고침하면 사라져도 OK)', value: 'local' },
      { label: '네, 서버에 저장 (로그인+데이터베이스 필요)', value: 'server', featureMap: ['auth', 'crud'] },
      { label: '잘 모르겠어요 (AI가 판단)', value: 'auto' },
    ]},
    { id: 'extras', question: '필요한 기능을 골라주세요 (복수 선택)', type: 'checkbox', options: [
      { label: '대시보드/통계', value: 'dashboard', featureMap: ['dashboard'] },
      { label: '로그인/회원가입', value: 'auth', featureMap: ['auth'] },
      { label: '검색/필터', value: 'search', featureMap: ['search'] },
      { label: '차트/그래프', value: 'chart', featureMap: ['chart'] },
      { label: '알림 기능', value: 'notification', featureMap: ['notification'] },
    ]},
  ],
};

// ── 스텝 정의 ──────────────────────────────────────────
type Step = 'select-template' | 'questionnaire' | 'select-theme' | 'customize' | 'generating' | 'complete';

// ── 동적 미리보기 HTML 생성 ─────────────────────────────
const THEME_COLORS: Record<string, { accent: string; accentLight: string; bg: string; card: string }> = {
  'basic-light': { accent: '#3b82f6', accentLight: '#dbeafe', bg: '#f8fafc', card: '#ffffff' },
  'basic-dark': { accent: '#3b82f6', accentLight: '#1e3a5f', bg: '#0f172a', card: '#1e293b' },
  'ocean-blue': { accent: '#0ea5e9', accentLight: '#e0f2fe', bg: '#f0f9ff', card: '#ffffff' },
  'forest-green': { accent: '#16a34a', accentLight: '#dcfce7', bg: '#f0fdf4', card: '#ffffff' },
  'warm-amber': { accent: '#d97706', accentLight: '#fef3c7', bg: '#fffbeb', card: '#ffffff' },
  'rose-pink': { accent: '#f43f5e', accentLight: '#ffe4e6', bg: '#fff1f2', card: '#ffffff' },
  'korean-naver': { accent: '#03C75A', accentLight: '#dcfce7', bg: '#f8fafc', card: '#ffffff' },
  'korean-kakao': { accent: '#FEE500', accentLight: '#fefce8', bg: '#fefce8', card: '#ffffff' },
};

function generatePreviewHtml(templateId: string, name: string, features: Set<string>, themeId: string): string {
  const c = THEME_COLORS[themeId] || THEME_COLORS['basic-light'];
  const appName = name || '내 서비스';

  if (templateId === 'beauty-salon') {
    const hasDashboard = features.has('dashboard');
    const hasOnlineBooking = features.has('online-booking');
    return `<div style="font-family:system-ui;background:${c.bg};min-height:100vh">
      <div style="background:${c.accent};color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:16px">✂️ ${appName}</span>
        <span style="font-size:12px;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:6px">관리자</span>
      </div>
      ${hasDashboard ? `<div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:11px;color:#64748b">오늘 매출</div><div style="font-size:20px;font-weight:700;color:${c.accent}">₩1,280,000</div></div>
        <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:20px;font-weight:700">12건</div></div>
      </div>` : ''}
      <div style="padding:0 16px">
        <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
          <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:#1e293b">예약 현황</div>
          <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span><b style="color:${c.accent}">10:00</b> 김지현 - 커트+염색</span><span style="background:${c.accentLight};color:${c.accent};padding:2px 8px;border-radius:10px;font-size:10px">확정</span></div>
          <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span><b style="color:${c.accent}">11:30</b> 이서윤 - 디지털펌</span><span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:10px;font-size:10px">시술중</span></div>
          <div style="font-size:12px;padding:8px 0;display:flex;justify-content:space-between"><span><b style="color:${c.accent}">14:30</b> 최하은 - 매직셋팅</span><span style="background:#fef9c3;color:#ca8a04;padding:2px 8px;border-radius:10px;font-size:10px">대기</span></div>
        </div>
      </div>
      ${hasOnlineBooking ? `<div style="padding:16px"><div style="background:${c.accent};color:white;text-align:center;padding:12px;border-radius:12px;font-size:13px;font-weight:600">온라인 예약 페이지 →</div></div>` : ''}
      <div style="border-top:1px solid #e2e8f0;display:flex;padding:4px 8px;background:${c.card}">
        ${Array.from(features).slice(0, 5).map((fId, i) => {
          const labels: Record<string, string> = { 'reservation': '📅 예약', 'sales': '💰 매출', 'customer': '👥 고객', 'staff': '👤 스태프', 'service-menu': '✂️ 시술', 'dashboard': '📊 통계', 'online-booking': '🌐 온라인', 'alimtalk': '💬 알림', 'settlement': '📋 정산', 'prepaid': '🎫 정액권' };
          return `<div style="flex:1;text-align:center;padding:8px 4px;font-size:10px;${i === 0 ? `color:${c.accent};font-weight:700` : 'color:#94a3b8'}">${labels[fId] || fId}</div>`;
        }).join('')}
      </div>
    </div>`;
  }

  if (templateId === 'ecommerce') {
    return `<div style="font-family:system-ui;min-height:100vh;background:${c.bg}">
      <div style="background:${c.accent};color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:16px">🛍 ${appName}</span><span>🛒 3</span>
      </div>
      <div style="background:linear-gradient(135deg,${c.accent},#764ba2);padding:32px 20px;text-align:center;color:white">
        <div style="font-size:20px;font-weight:700">GRAND OPEN</div>
        <div style="font-size:13px;opacity:.8;margin-top:4px">신상품 최대 30% OFF</div>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:${c.card};border-radius:10px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#fef3c7;padding:28px;text-align:center;font-size:32px">👗</div><div style="padding:10px"><div style="font-size:12px;font-weight:600">린넨 원피스</div><div style="color:#ef4444;font-weight:700;font-size:13px">₩62,300</div></div></div>
        <div style="background:${c.card};border-radius:10px;overflow:hidden;border:1px solid #e2e8f0"><div style="background:#dbeafe;padding:28px;text-align:center;font-size:32px">👜</div><div style="padding:10px"><div style="font-size:12px;font-weight:600">미니 크로스백</div><div style="color:#ef4444;font-weight:700;font-size:13px">₩31,500</div></div></div>
      </div>
    </div>`;
  }

  // O2O 매칭
  if (templateId === 'o2o-matching') {
    return `<div style="font-family:system-ui;min-height:100vh;background:${c.bg}">
      <div style="background:${c.accent};color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:16px">🔗 ${appName}</span>
        <span style="font-size:12px;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:6px">관리자</span>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">활성 제공자</div><div style="font-size:18px;font-weight:700;color:${c.accent}">24명</div></div>
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">오늘 매칭</div><div style="font-size:18px;font-weight:700">37건</div></div>
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">평균 평점</div><div style="font-size:18px;font-weight:700;color:#f59e0b">4.8⭐</div></div>
      </div>
      <div style="padding:0 16px"><div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">실시간 매칭 현황</div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span>🟢 김도우미 → 강남구 청소</span><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:10px">진행중</span></div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span>🟡 박기사 → 서초구 배달</span><span style="background:#fef9c3;color:#ca8a04;padding:2px 8px;border-radius:10px;font-size:10px">이동중</span></div>
        <div style="font-size:12px;padding:8px 0;display:flex;justify-content:space-between"><span>🔵 이전문 → 송파구 레슨</span><span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:10px;font-size:10px">수락대기</span></div>
      </div></div>
    </div>`;
  }

  // 에듀테크 (LMS)
  if (templateId === 'edutech') {
    return `<div style="font-family:system-ui;min-height:100vh;background:${c.bg}">
      <div style="background:${c.accent};color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:16px">🎓 ${appName}</span>
        <span style="font-size:12px;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:6px">관리자</span>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">수강생</div><div style="font-size:18px;font-weight:700;color:${c.accent}">248명</div></div>
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">완료율</div><div style="font-size:18px;font-weight:700">67%</div></div>
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">이번주 매출</div><div style="font-size:18px;font-weight:700;color:#16a34a">₩3.2M</div></div>
      </div>
      <div style="padding:0 16px"><div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">인기 강의</div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9"><span>📹 Python 기초 마스터</span><div style="background:#e2e8f0;border-radius:4px;height:6px;margin-top:4px"><div style="background:${c.accent};border-radius:4px;height:6px;width:73%"></div></div><span style="font-size:10px;color:#64748b">수강생 89명 · 완료율 73%</span></div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9"><span>📹 웹개발 부트캠프</span><div style="background:#e2e8f0;border-radius:4px;height:6px;margin-top:4px"><div style="background:${c.accent};border-radius:4px;height:6px;width:45%"></div></div><span style="font-size:10px;color:#64748b">수강생 56명 · 완료율 45%</span></div>
        <div style="font-size:12px;padding:8px 0"><span>📹 데이터 분석 입문</span><div style="background:#e2e8f0;border-radius:4px;height:6px;margin-top:4px"><div style="background:${c.accent};border-radius:4px;height:6px;width:91%"></div></div><span style="font-size:10px;color:#64748b">수강생 103명 · 완료율 91%</span></div>
      </div></div>
    </div>`;
  }

  // 관리업체/시설관리
  if (templateId === 'facility-mgmt') {
    return `<div style="font-family:system-ui;min-height:100vh;background:${c.bg}">
      <div style="background:${c.accent};color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:16px">🏢 ${appName}</span>
        <span style="font-size:12px;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:6px">관리자</span>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">접수 민원</div><div style="font-size:18px;font-weight:700;color:#ef4444">8건</div></div>
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">처리 완료</div><div style="font-size:18px;font-weight:700;color:#16a34a">92%</div></div>
        <div style="background:${c.card};padding:12px;border-radius:10px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">입주민</div><div style="font-size:18px;font-weight:700">342세대</div></div>
      </div>
      <div style="padding:0 16px"><div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">최근 민원</div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span>🔧 301동 502호 · 화장실 누수</span><span style="background:#fef9c3;color:#ca8a04;padding:2px 8px;border-radius:10px;font-size:10px">처리중</span></div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span>🔊 105동 1203호 · 층간소음</span><span style="background:#fee2e2;color:#ef4444;padding:2px 8px;border-radius:10px;font-size:10px">접수</span></div>
        <div style="font-size:12px;padding:8px 0;display:flex;justify-content:space-between"><span>🅿️ 지하2층 B-15 · 주차 문의</span><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:10px">완료</span></div>
      </div></div>
    </div>`;
  }

  // custom (자유롭게 만들기)
  if (templateId === 'custom') {
    return `<div style="font-family:system-ui;min-height:100vh;background:${c.bg}">
      <div style="background:linear-gradient(135deg,${c.accent},#a855f7);color:white;padding:20px">
        <div style="font-size:18px;font-weight:800">🚀 ${appName}</div>
        <div style="font-size:11px;opacity:.8;margin-top:4px">AI가 설계한 맞춤 앱</div>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:11px;color:#64748b">활성 사용자</div><div style="font-size:20px;font-weight:700;color:${c.accent}">128명</div></div>
        <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:11px;color:#64748b">오늘 활동</div><div style="font-size:20px;font-weight:700">47건</div></div>
      </div>
      <div style="padding:0 16px"><div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">최근 활동</div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9">🟢 새 항목이 추가되었습니다</div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9">📊 대시보드가 업데이트되었습니다</div>
        <div style="font-size:12px;padding:8px 0">🔔 새 알림이 있습니다</div>
      </div></div>
    </div>`;
  }

  // booking-crm (기본)
  const FEATURE_LABELS: Record<string, string> = {
    'reservation': '📅 예약', 'sales': '💰 매출', 'customer': '👥 고객', 'staff': '👤 스태프',
    'service-menu': '✂️ 시술', 'dashboard': '📊 대시보드', 'online-booking': '🌐 온라인예약',
    'alimtalk': '💬 알림톡', 'settlement': '📋 정산', 'prepaid': '🎫 정액권',
    'coupon': '🎟 쿠폰', 'review': '⭐ 리뷰', 'wishlist': '❤️ 찜',
    'admin-dashboard': '📊 대시보드', 'attendance': '✅ 출석',
  };
  const featureMenus = Array.from(features).slice(0, 5).map((fId, i) => {
    const label = FEATURE_LABELS[fId] || fId;
    const isActive = i === 0;
    return `<div style="flex:1;text-align:center;padding:8px 4px;font-size:10px;${isActive ? `color:${c.accent};font-weight:700` : 'color:#94a3b8'}">${label}</div>`;
  }).join('');

  return `<div style="font-family:system-ui;background:${c.bg};min-height:100vh;display:flex;flex-direction:column">
    <div style="background:${c.accent};color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;font-size:16px">📅 ${appName}</span>
      <span style="font-size:12px;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:6px">관리자</span>
    </div>
    <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:20px;font-weight:700;color:${c.accent}">18건</div></div>
      <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:11px;color:#64748b">온라인 예약</div><div style="font-size:20px;font-weight:700">34%</div></div>
    </div>
    <div style="padding:0 16px;flex:1">
      <div style="background:${c.card};padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">일정</div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9"><b style="color:${c.accent}">09:00</b> 김철수 - 일반 진료</div>
        <div style="font-size:12px;padding:8px 0;border-bottom:1px solid #f1f5f9"><b style="color:${c.accent}">09:30</b> 박영희 - 건강검진</div>
        <div style="font-size:12px;padding:8px 0"><b style="color:${c.accent}">10:00</b> 이민호 - 재활치료</div>
      </div>
    </div>
    <div style="border-top:1px solid #e2e8f0;display:flex;padding:4px 8px;background:${c.card}">${featureMenus}</div>
  </div>`;
}

// ── 디자인 테마 20종 ──────────────────────────────────
const THEMES = [
  { id: 'basic-light', name: '베이직 라이트', tier: 'free', credits: 0, description: '깔끔한 화이트 기본', preview: { bg: 'bg-slate-50', accent: 'bg-blue-500', style: '화이트 / 미니멀' } },
  { id: 'basic-dark', name: '베이직 다크', tier: 'free', credits: 0, description: '깔끔한 다크 기본', preview: { bg: 'bg-gray-900', accent: 'bg-blue-500', style: '다크 / 미니멀' } },
  { id: 'ocean-blue', name: '오션 블루', tier: 'standard', credits: 300, description: '시원한 바다 느낌', preview: { bg: 'bg-sky-50', accent: 'bg-sky-500', style: '블루 / 신뢰감' } },
  { id: 'forest-green', name: '포레스트 그린', tier: 'standard', credits: 300, description: '자연 친화적 그린톤', preview: { bg: 'bg-emerald-50', accent: 'bg-emerald-500', style: '그린 / 힐링' } },
  { id: 'warm-amber', name: '웜 앰버', tier: 'standard', credits: 300, description: '따뜻한 카페 감성', preview: { bg: 'bg-amber-50', accent: 'bg-amber-500', style: '웜톤 / 카페' } },
  { id: 'rose-pink', name: '로즈 핑크', tier: 'standard', credits: 300, description: '여성 타겟 서비스', preview: { bg: 'bg-rose-50', accent: 'bg-rose-400', style: '핑크 / 감성적' } },
  { id: 'midnight-purple', name: '미드나잇 퍼플', tier: 'standard', credits: 300, description: '세련된 퍼플 다크', preview: { bg: 'bg-purple-950', accent: 'bg-purple-500', style: '퍼플 / 세련된' } },
  { id: 'slate-mono', name: '슬레이트 모노', tier: 'standard', credits: 300, description: '무채색 모노톤', preview: { bg: 'bg-slate-100', accent: 'bg-slate-600', style: '모노 / 프로페셔널' } },
  { id: 'korean-naver', name: '한국형 네이버', tier: 'standard', credits: 300, description: '네이버 스타일 친숙한 UI', preview: { bg: 'bg-white', accent: 'bg-green-500', style: '네이버풍 / 친숙한' } },
  { id: 'korean-kakao', name: '한국형 카카오', tier: 'standard', credits: 300, description: '카카오 스타일 옐로우', preview: { bg: 'bg-yellow-50', accent: 'bg-yellow-400', style: '카카오풍 / 밝은' } },
  { id: 'sunset-orange', name: '선셋 오렌지', tier: 'standard', credits: 300, description: '활기찬 오렌지 톤', preview: { bg: 'bg-orange-50', accent: 'bg-orange-500', style: '오렌지 / 에너지' } },
  { id: 'deep-navy', name: '딥 네이비', tier: 'standard', credits: 300, description: '차분한 네이비 다크', preview: { bg: 'bg-blue-950', accent: 'bg-blue-400', style: '네이비 / 신뢰감' } },
  { id: 'arctic-ice', name: '아크틱 아이스', tier: 'standard', credits: 300, description: '차가운 아이스 블루', preview: { bg: 'bg-cyan-50', accent: 'bg-cyan-500', style: '아이스 / 쿨톤' } },
  { id: 'charcoal-gold', name: '차콜 골드', tier: 'standard', credits: 300, description: '고급스러운 골드 포인트', preview: { bg: 'bg-neutral-900', accent: 'bg-yellow-500', style: '차콜 / 럭셔리' } },
  { id: 'glass-aurora', name: '글래스 오로라', tier: 'premium', credits: 800, description: '글래스모피즘 + 오로라 그라디언트', preview: { bg: 'bg-gradient-to-br from-indigo-950 to-purple-950', accent: 'bg-gradient-to-r from-pink-500 to-violet-500', style: '글래스 / 몽환적' } },
  { id: 'neon-cyber', name: '네온 사이버', tier: 'premium', credits: 800, description: '사이버펑크 네온 컬러', preview: { bg: 'bg-gray-950', accent: 'bg-gradient-to-r from-green-400 to-cyan-400', style: '네온 / 사이버펑크' } },
  { id: 'gradient-sunset', name: '그라디언트 선셋', tier: 'premium', credits: 800, description: '노을빛 그라디언트', preview: { bg: 'bg-gradient-to-br from-orange-100 to-rose-100', accent: 'bg-gradient-to-r from-orange-400 to-pink-500', style: '그라디언트 / 따뜻한' } },
  { id: 'startup-bold', name: '스타트업 볼드', tier: 'premium', credits: 800, description: '대담한 컬러 + 큰 타이포', preview: { bg: 'bg-slate-950', accent: 'bg-cyan-500', style: '볼드 / IR발표용' } },
  { id: 'luxury-marble', name: '럭셔리 마블', tier: 'premium', credits: 800, description: '대리석 텍스처 + 골드', preview: { bg: 'bg-stone-100', accent: 'bg-gradient-to-r from-amber-300 to-yellow-500', style: '마블 / 하이엔드' } },
  { id: 'minimal-swiss', name: '미니멀 스위스', tier: 'premium', credits: 800, description: '스위스 디자인 타이포그래피', preview: { bg: 'bg-white', accent: 'bg-red-500', style: '타이포 / 아트' } },
];

// Suspense 래퍼 (useSearchParams는 Suspense 필요)
export default function StartPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0f0f14]"><div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full" /></div>}>
      <StartPage />
    </Suspense>
  );
}

function StartPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('select-template');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [themeFilter, setThemeFilter] = useState('전체');
  const [projectName, setProjectName] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [progress, setProgress] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [refImages, setRefImages] = useState<{ file: File; preview: string }[]>([]);
  // 자연어 자유 입력
  const [freeInput, setFreeInput] = useState('');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  // AI 대화 채팅 상태
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [appSpec, setAppSpec] = useState<Record<string, string> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendChatMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    const newMessages = [...chatMessages, { role: 'user' as const, content: msg }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/start-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          chatHistory: chatMessages,
        }),
      });

      if (!res.ok) throw new Error('AI 응답 실패');
      const data = await res.json();

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }]);

      if (data.isReady && data.appSpec) {
        setAppSpec(data.appSpec);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '죄송합니다, 일시적인 오류가 발생했습니다. 다시 시도해주세요.' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleAppSpecGenerate = () => {
    if (!appSpec) return;
    const customTemplate = TEMPLATES.find(t => t.id === 'custom');
    if (!customTemplate) return;
    setSelectedTemplate(customTemplate);
    const requiredIds = new Set(customTemplate.features.filter(f => f.required).map(f => f.id));
    setSelectedFeatures(requiredIds);
    setProjectName(appSpec['앱 이름'] || '새 프로젝트');
    setAnswers({
      biz_name: appSpec['앱 이름'] || '',
      biz_desc: appSpec['상세'] || '',
    });
    setCustomRequirements(
      `업종: ${appSpec['업종'] || ''}\n핵심 기능: ${appSpec['핵심 기능'] || ''}\n타겟: ${appSpec['타겟'] || ''}\n\n대화 컨텍스트:\n${chatMessages.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n')}`
    );
    setStep('questionnaire');
  };

  // 스마트 분석 상태
  const [smartAnalysis, setSmartAnalysis] = useState<{
    running: boolean;
    phase: string;
    results: { market?: string; benchmark?: string; optimization?: string };
  }>({ running: false, phase: '', results: {} });

  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template);
    const requiredIds = new Set(template.features.filter(f => f.required).map(f => f.id));
    setSelectedFeatures(requiredIds);
    setAnswers({});
    setStep('questionnaire');
  };

  // 자연어 자유 입력 → custom 템플릿 자동 선택 + 첫 답변 채움
  const handleFreeInputSubmit = () => {
    const input = freeInput.trim();
    if (!input) return;
    const customTemplate = TEMPLATES.find(t => t.id === 'custom');
    if (!customTemplate) return;
    setSelectedTemplate(customTemplate);
    const requiredIds = new Set(customTemplate.features.filter(f => f.required).map(f => f.id));
    setSelectedFeatures(requiredIds);
    // 첫 답변(서비스 이름)과 상세 설명을 자동 채움
    const nameMatch = input.match(/^(.+?)[\s\-—–([]/) || [null, input.slice(0, 20)];
    setProjectName(nameMatch[1]?.trim() || input.slice(0, 20));
    setAnswers({ biz_name: nameMatch[1]?.trim() || input.slice(0, 20), biz_desc: input });
    setCustomRequirements(input);
    setStep('questionnaire');
  };

  // URL ?template= 파라미터로 템플릿 자동 선택 (포트폴리오에서 진입 시)
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (templateId && !selectedTemplate) {
      const template = TEMPLATES.find(t => t.id === templateId);
      if (template) {
        handleSelectTemplate(template);
      }
    }
  }, [searchParams]);

  const handleAnswer = (questionId: string, value: string, type: QuestionType, featureMap?: string[]) => {
    setAnswers(prev => {
      if (type === 'checkbox') {
        const current = (prev[questionId] as string[]) || [];
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: value };
    });
    if (featureMap) {
      setSelectedFeatures(prev => {
        const next = new Set(prev);
        featureMap.forEach(f => next.add(f));
        return next;
      });
    }
  };

  const handleQuestionnaireNext = () => {
    if (!projectName.trim()) { alert('매장/서비스 이름을 입력해주세요.'); return; }
    setStep('select-theme');
  };

  const calcCredits = () => {
    if (!selectedTemplate) return { base: 0, extra: 0, themeCredits: 0, total: 0 };
    const base = selectedTemplate.baseCredits;
    const extra = selectedTemplate.features
      .filter(f => selectedFeatures.has(f.id) && !f.required)
      .reduce((sum, f) => sum + f.credits, 0);
    const themeCredits = selectedTheme.credits;
    return { base, extra, themeCredits, total: base + extra + themeCredits };
  };

  const handleGenerate = async () => {
    const user = getUser();
    if (!user) {
      setStep('generating');
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(r => setTimeout(r, 200));
        setProgress(i);
      }
      setStep('complete');
      return;
    }

    setStep('generating');
    try {
      const selectedFeatureIds = Array.from(selectedFeatures);
      const res = await authFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          template: selectedTemplate!.id,
          theme: selectedTheme.id,
          features: { selected: selectedFeatureIds, themeId: selectedTheme.id },
          description: customRequirements || undefined,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        for (let i = 0; i <= 80; i += 10) {
          await new Promise(r => setTimeout(r, 150));
          setProgress(i);
        }
        window.location.href = `/builder?projectId=${project.id}`;
        return;
      }
    } catch { /* fallback to simulation */ }

    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(i);
    }
    setStep('complete');
  };

  const credits = calcCredits();

  // ── 체크 아이콘 ──
  const CheckIcon = () => (
    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      {/* ── 헤더 ─────────────────────────────── */}
      <header className="border-b border-[#2c2c35] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1>
            <img src="/logo.svg" alt="Foundry" className="h-7 md:h-8" />
          </h1>
          <div className="flex items-center gap-2.5">
            {getUser() ? (
              <>
                <a href="/dashboard" className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm font-semibold text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
                  내 프로젝트
                </a>
                <a href="/credits" className="rounded-xl bg-[#3182f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b64da] transition-colors">
                  요금제
                </a>
                <button onClick={logout} className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <a href="/credits" className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm font-semibold text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
                  요금제
                </a>
                <a href="/login" className="rounded-xl bg-[#3182f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b64da] transition-colors">
                  로그인
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-14">

        {/* ── Step 1: 템플릿 선택 ─────────────── */}
        {step === 'select-template' && (
          <div>
            <div className="mb-10 md:mb-14 text-center">
              <h2 className="mb-3 text-3xl md:text-[40px] font-bold leading-tight tracking-tight">
                어떤 앱을 만들까요?
              </h2>
              <p className="text-base md:text-lg text-[#8b95a1]">
                아이디어를 입력하거나, 템플릿을 선택하세요
              </p>
            </div>

            {/* AI 대화형 앱 기획 */}
            <div className="mx-auto mb-10 max-w-2xl">
              <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] overflow-hidden transition-all focus-within:border-[#3182f6]/50 focus-within:shadow-lg focus-within:shadow-[#3182f6]/5">

                {/* 채팅 메시지 영역 */}
                {chatMessages.length > 0 && (
                  <div className="max-h-[320px] overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#3182f6] text-white rounded-br-md'
                            : 'bg-[#2c2c35] text-[#e5e7eb] rounded-bl-md'
                        }`}>
                          {msg.role === 'assistant' && (
                            <span className="text-[10px] text-[#6b7684] block mb-1">🤖 Foundry AI</span>
                          )}
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#2c2c35] rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#6b7684] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#6b7684] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-[#6b7684] animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* 앱 생성 버튼 (AI가 충분한 정보 파악 후) */}
                {appSpec && (
                  <div className="mx-4 mb-3 rounded-xl border border-emerald-700/40 bg-emerald-900/15 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">✅</span>
                      <span className="font-bold text-sm text-emerald-400">앱 기획 완료!</span>
                    </div>
                    <div className="text-xs text-[#8b95a1] space-y-1 mb-3">
                      {Object.entries(appSpec).map(([k, v]) => (
                        <div key={k}><span className="text-[#6b7684]">{k}:</span> {v}</div>
                      ))}
                    </div>
                    <button
                      onClick={handleAppSpecGenerate}
                      className="w-full rounded-xl bg-gradient-to-r from-[#3182f6] to-[#6366f1] py-3 text-sm font-bold text-white hover:brightness-110 transition-all"
                    >
                      🚀 이 기획으로 앱 만들기
                    </button>
                  </div>
                )}

                {/* 입력창 */}
                <div className="p-4 pt-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={chatMessages.length > 0 ? chatInput : freeInput}
                      onChange={e => chatMessages.length > 0 ? setChatInput(e.target.value) : setFreeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key !== 'Enter') return;
                        if (chatMessages.length > 0) sendChatMessage();
                        else if (freeInput.trim()) {
                          // 첫 입력은 채팅 모드로 전환
                          setChatInput('');
                          sendChatMessage();
                          // freeInput 값을 chatInput으로 전달
                          const msg = freeInput.trim();
                          setFreeInput('');
                          setChatMessages([{ role: 'user', content: msg }]);
                          setChatLoading(true);
                          fetch(`${API_BASE}/ai/start-chat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: msg, chatHistory: [] }),
                          })
                            .then(r => r.ok ? r.json() : Promise.reject())
                            .then(data => {
                              setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
                              if (data.isReady && data.appSpec) setAppSpec(data.appSpec);
                            })
                            .catch(() => {
                              setChatMessages(prev => [...prev, { role: 'assistant', content: '죄송합니다, 일시적인 오류입니다. 다시 시도해주세요.' }]);
                            })
                            .finally(() => setChatLoading(false));
                        }
                      }}
                      placeholder={chatMessages.length > 0 ? '답변을 입력하세요...' : '만들고 싶은 앱을 설명해주세요 (예: 반려동물 돌봄 매칭 앱)'}
                      className="flex-1 bg-transparent text-[15px] text-[#f2f4f6] placeholder-[#4e5968] focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (chatMessages.length > 0) {
                          sendChatMessage();
                        } else if (freeInput.trim()) {
                          // 첫 입력 → 채팅 모드 진입
                          const msg = freeInput.trim();
                          setFreeInput('');
                          setChatMessages([{ role: 'user', content: msg }]);
                          setChatLoading(true);
                          fetch(`${API_BASE}/ai/start-chat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message: msg, chatHistory: [] }),
                          })
                            .then(r => r.ok ? r.json() : Promise.reject())
                            .then(data => {
                              setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
                              if (data.isReady && data.appSpec) setAppSpec(data.appSpec);
                            })
                            .catch(() => {
                              setChatMessages(prev => [...prev, { role: 'assistant', content: '죄송합니다, 일시적인 오류입니다. 다시 시도해주세요.' }]);
                            })
                            .finally(() => setChatLoading(false));
                        }
                      }}
                      disabled={chatMessages.length > 0 ? (!chatInput.trim() || chatLoading) : !freeInput.trim()}
                      className="shrink-0 rounded-xl bg-gradient-to-r from-[#3182f6] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#3182f6]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {chatMessages.length > 0 ? '전송' : '대화 시작'}
                    </button>
                  </div>

                  {/* 예시 칩 (대화 시작 전에만) */}
                  {chatMessages.length === 0 && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['미용실 예약 앱', '학원 관리 시스템', '배달 주문 앱', '커뮤니티 게시판'].map(example => (
                          <button
                            key={example}
                            onClick={() => setFreeInput(example)}
                            className="rounded-lg bg-[#2c2c35] px-3 py-1.5 text-xs text-[#8b95a1] hover:bg-[#3a3a45] hover:text-[#f2f4f6] transition-colors"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2.5 text-[11px] text-[#4e5968]">
                        AI와 대화하며 앱을 기획하거나, 아래 템플릿을 바로 선택하세요
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="mx-auto mb-10 flex max-w-2xl items-center gap-4">
              <div className="flex-1 border-t border-[#2c2c35]" />
              <span className="text-sm text-[#4e5968]">또는 템플릿으로 시작하기</span>
              <div className="flex-1 border-t border-[#2c2c35]" />
            </div>

            <div className="grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-3">
              {TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="group rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-7 md:p-8 text-left transition-all hover:border-[#3182f6]/40 hover:bg-[#1f1f26]"
                >
                  <div className="mb-5 text-5xl">{template.icon}</div>
                  <h3 className="mb-2 text-lg font-bold group-hover:text-[#3182f6] transition-colors">
                    {template.name}
                  </h3>
                  <p className="mb-5 text-sm text-[#8b95a1] leading-relaxed">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-[#2c2c35] px-3 py-1.5 text-xs font-medium text-[#8b95a1]">
                      {template.category}
                    </span>
                    <span className="text-sm font-semibold text-[#3182f6]">
                      {template.baseCredits.toLocaleString()} 크레딧~
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 text-center text-[#6b7684]">
              <p className="text-sm">업종이 없나요? 상단 입력창에 자유롭게 설명하거나 <span className="text-[#3182f6] font-medium">"자유롭게 만들기"</span>를 선택하세요!</p>
              <p className="text-xs mt-1.5">포모도로 타이머 | 가계부 | 블로그 | 커뮤니티 | 대시보드 | 게임 — 뭐든 가능합니다</p>
            </div>
          </div>
        )}

        {/* ── Step 2: 질문지 ─────────────────── */}
        {step === 'questionnaire' && selectedTemplate && (
          <div>
            <button
              onClick={() => setStep('select-template')}
              className="mb-7 text-sm text-[#8b95a1] hover:text-[#f2f4f6] transition-colors"
            >
              &larr; 업종 다시 선택
            </button>

            <div className="mb-8">
              <h2 className="mb-2 text-2xl md:text-[32px] font-bold tracking-tight">
                {selectedTemplate.icon} 몇 가지만 알려주세요!
              </h2>
              <p className="text-[#8b95a1]">답변에 맞춰 최적의 앱을 구성해드립니다.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                {/* 이름 입력 */}
                <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <h3 className="mb-3 text-[15px] font-semibold">{COMMON_QUESTIONS[0].question}</h3>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder={COMMON_QUESTIONS[0].placeholder}
                    className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] focus:border-[#3182f6] focus:outline-none transition-colors"
                  />
                </div>

                {/* 업종별 질문 */}
                {(TEMPLATE_QUESTIONS[selectedTemplate.id] || []).map(q => (
                  <div key={q.id} className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                    <h3 className="mb-4 text-[15px] font-semibold">{q.question}</h3>
                    {q.type === 'radio' && q.options && (
                      <div className="space-y-2.5">
                        {q.options.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleAnswer(q.id, opt.value, 'radio', opt.featureMap)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors ${
                              answers[q.id] === opt.value
                                ? 'border-[#3182f6] bg-[#3182f6]/8 text-[#f2f4f6]'
                                : 'border-[#2c2c35] hover:border-[#3a3a45] text-[#8b95a1] hover:text-[#f2f4f6]'
                            }`}
                          >
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              answers[q.id] === opt.value ? 'border-[#3182f6]' : 'border-[#4e5968]'
                            }`}>
                              {answers[q.id] === opt.value && <div className="h-2.5 w-2.5 rounded-full bg-[#3182f6]" />}
                            </div>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {q.type === 'checkbox' && q.options && (
                      <div className="space-y-2.5">
                        {q.options.map(opt => {
                          const checked = ((answers[q.id] as string[]) || []).includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleAnswer(q.id, opt.value, 'checkbox', opt.featureMap)}
                              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors ${
                                checked
                                  ? 'border-[#3182f6] bg-[#3182f6]/8 text-[#f2f4f6]'
                                  : 'border-[#2c2c35] hover:border-[#3a3a45] text-[#8b95a1] hover:text-[#f2f4f6]'
                              }`}
                            >
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                                checked ? 'border-[#3182f6] bg-[#3182f6]' : 'border-[#4e5968]'
                              }`}>
                                {checked && <CheckIcon />}
                              </div>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* 공통 질문: 불편한 점 */}
                <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <h3 className="mb-4 text-[15px] font-semibold">{COMMON_QUESTIONS[2].question}</h3>
                  <div className="space-y-2.5">
                    {COMMON_QUESTIONS[2].options!.map(opt => {
                      const checked = ((answers['pain-point'] as string[]) || []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleAnswer('pain-point', opt.value, 'checkbox', opt.featureMap)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors ${
                            checked
                              ? 'border-[#ffd60a] bg-[#ffd60a]/8 text-[#f2f4f6]'
                              : 'border-[#2c2c35] hover:border-[#3a3a45] text-[#8b95a1] hover:text-[#f2f4f6]'
                          }`}
                        >
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            checked ? 'border-[#ffd60a] bg-[#ffd60a]' : 'border-[#4e5968]'
                          }`}>
                            {checked && (
                              <svg className="h-3.5 w-3.5 text-[#17171c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 레퍼런스 URL + 스크린샷 */}
                <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <h3 className="mb-1 text-[15px] font-semibold">참고하고 싶은 서비스가 있나요?</h3>
                  <p className="mb-4 text-xs text-[#6b7684]">URL을 입력하거나, 캡처 이미지를 올려주세요. AI가 디자인/기능을 참고합니다.</p>

                  {/* URL 입력 */}
                  <input
                    type="url"
                    value={(answers['ref-url-1'] as string) || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, 'ref-url-1': e.target.value }))}
                    placeholder="https://참고사이트.com (선택)"
                    className="mb-2.5 w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] focus:border-[#3182f6] focus:outline-none transition-colors"
                  />

                  {/* 이미지 업로드 */}
                  <div className="mt-3">
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2c2c35] bg-[#2c2c35]/50 px-4 py-5 text-sm text-[#8b95a1] transition-colors hover:border-[#3182f6]/40 hover:text-[#f2f4f6]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      캡처 이미지 올리기 (최대 3장)
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          const remaining = 3 - refImages.length;
                          const newFiles = files.slice(0, remaining).map(file => ({
                            file,
                            preview: URL.createObjectURL(file),
                          }));
                          setRefImages(prev => [...prev, ...newFiles]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* 업로드된 이미지 미리보기 */}
                  {refImages.length > 0 && (
                    <div className="mt-3 flex gap-2.5 flex-wrap">
                      {refImages.map((img, i) => (
                        <div key={i} className="group relative">
                          <img
                            src={img.preview}
                            alt={`레퍼런스 ${i + 1}`}
                            className="h-24 w-24 rounded-xl border border-[#2c2c35] object-cover"
                          />
                          <button
                            onClick={() => {
                              URL.revokeObjectURL(img.preview);
                              setRefImages(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#f45452] text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 추가 요구사항 */}
                <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <h3 className="mb-3 text-[15px] font-semibold">추가로 원하시는 게 있다면 자유롭게 적어주세요</h3>
                  <textarea
                    value={customRequirements}
                    onChange={e => setCustomRequirements(e.target.value)}
                    placeholder="예: 인스타그램 연동, 포인트 적립, 쿠폰 기능..."
                    rows={3}
                    className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] focus:border-[#3182f6] focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              {/* 자동 구성 요약 사이드바 */}
              <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 h-fit lg:sticky lg:top-6">
                <h3 className="mb-1 text-lg font-bold">자동 구성된 기능</h3>
                <p className="mb-5 text-xs text-[#6b7684]">답변에 따라 자동으로 선택됩니다</p>

                <div className="mb-6 space-y-2.5">
                  {selectedTemplate.features.map(feature => (
                    <div key={feature.id} className="flex items-center gap-2.5 text-sm">
                      <span className={selectedFeatures.has(feature.id) ? 'text-[#30d158]' : 'text-[#4e5968]'}>
                        {selectedFeatures.has(feature.id) ? '\u2713' : '\u2717'}
                      </span>
                      <span className={selectedFeatures.has(feature.id) ? 'text-[#f2f4f6]' : 'text-[#6b7684]'}>
                        {feature.name}
                        {feature.required && <span className="ml-1 text-xs text-[#6b7684]">(필수)</span>}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mb-6 space-y-2 border-t border-[#2c2c35] pt-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b95a1]">선택된 기능</span>
                    <span className="text-[#3182f6] font-bold">{selectedFeatures.size}개</span>
                  </div>
                </div>

                <button
                  onClick={handleQuestionnaireNext}
                  disabled={!projectName.trim()}
                  className="w-full rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#1b64da] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다음: 디자인 선택
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2.5: 디자인 테마 선택 ──────── */}
        {step === 'select-theme' && selectedTemplate && (
          <div>
            <button
              onClick={() => setStep('questionnaire')}
              className="mb-7 text-sm text-[#8b95a1] hover:text-[#f2f4f6] transition-colors"
            >
              &larr; 기능 선택으로 돌아가기
            </button>

            <div className="mb-10 text-center">
              <h2 className="mb-2 text-3xl font-bold tracking-tight">디자인 테마 선택</h2>
              <p className="text-[#8b95a1]">앱의 분위기를 결정합니다. 프리미엄 테마로 차별화하세요!</p>
            </div>

            {/* 필터 탭 */}
            <div className="flex gap-2 mb-7 flex-wrap">
              {['전체', '무료', '스탠다드', '프리미엄'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setThemeFilter(filter)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    themeFilter === filter
                      ? 'bg-[#3182f6] text-white'
                      : 'bg-[#2c2c35] text-[#8b95a1] hover:text-[#f2f4f6]'
                  }`}
                >
                  {filter} ({filter === '전체' ? THEMES.length : THEMES.filter(t =>
                    filter === '무료' ? t.tier === 'free' : filter === '스탠다드' ? t.tier === 'standard' : t.tier === 'premium'
                  ).length})
                </button>
              ))}
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {THEMES.filter(t => {
                if (themeFilter === '전체') return true;
                if (themeFilter === '무료') return t.tier === 'free';
                if (themeFilter === '스탠다드') return t.tier === 'standard';
                return t.tier === 'premium';
              }).map(theme => {
                const isDark = theme.preview.bg.includes('900') || theme.preview.bg.includes('950') || theme.preview.bg.includes('gray-9') || theme.preview.bg.includes('indigo') || theme.preview.bg.includes('neutral-9') || theme.preview.bg.includes('blue-9') || theme.preview.bg.includes('purple-9');
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`group relative rounded-2xl border text-left transition-all overflow-hidden ${
                      selectedTheme.id === theme.id
                        ? 'border-[#3182f6] ring-2 ring-[#3182f6]/30'
                        : 'border-[#2c2c35] hover:border-[#3a3a45]'
                    }`}
                  >
                    <div className={`${theme.preview.bg} p-3 h-24 flex flex-col justify-between`}>
                      <div className="flex gap-1.5">
                        <div className={`${theme.preview.accent} h-5 flex-1 rounded opacity-90`}></div>
                        <div className={`${isDark ? 'bg-white/10' : 'bg-black/5'} h-5 flex-1 rounded`}></div>
                        <div className={`${isDark ? 'bg-white/10' : 'bg-black/5'} h-5 flex-1 rounded`}></div>
                      </div>
                      <div className="space-y-1">
                        <div className={`h-1.5 w-2/3 rounded ${isDark ? 'bg-white/15' : 'bg-black/8'}`}></div>
                        <div className={`h-1.5 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-black/5'}`}></div>
                      </div>
                    </div>

                    <div className="bg-[#1b1b21] p-3.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-sm font-bold text-[#f2f4f6] truncate">{theme.name}</h3>
                        {theme.tier === 'free' && <span className="rounded-lg bg-[#30d158]/15 px-2 py-0.5 text-[10px] font-medium text-[#30d158]">무료</span>}
                        {theme.tier === 'standard' && <span className="rounded-lg bg-[#3182f6]/15 px-2 py-0.5 text-[10px] font-medium text-[#3182f6]">+{theme.credits}</span>}
                        {theme.tier === 'premium' && <span className="rounded-lg bg-[#a855f7]/15 px-2 py-0.5 text-[10px] font-medium text-[#a855f7]">PRO</span>}
                      </div>
                      <p className="text-[11px] text-[#6b7684]">{theme.preview.style}</p>
                    </div>

                    {selectedTheme.id === theme.id && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#3182f6]">
                        <CheckIcon />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-[#8b95a1]">
                선택: <span className="font-bold text-[#f2f4f6]">{selectedTheme.name}</span>
                {selectedTheme.credits > 0 && (
                  <span className="ml-2 text-[#a855f7]">+{selectedTheme.credits} 크레딧</span>
                )}
              </div>
              <button
                onClick={() => setStep('customize')}
                className="rounded-xl bg-[#3182f6] px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#1b64da]"
              >
                다음: 최종 확인
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 최종 확인 + 미리보기 ────── */}
        {step === 'customize' && selectedTemplate && (
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-3xl font-bold text-center tracking-tight">최종 확인</h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* 왼쪽: 요약 + 버튼 */}
              <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-8">
                <div className="mb-5 space-y-3.5">
                  {[
                    ['템플릿', `${selectedTemplate.icon} ${selectedTemplate.name}`],
                    ['프로젝트 이름', projectName],
                    ['디자인 테마', `${selectedTheme.name}${selectedTheme.credits > 0 ? ` (+${selectedTheme.credits})` : ''}`],
                    ['기술 스택', 'Next.js + NestJS + PostgreSQL'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-[#8b95a1]">{label}</span>
                      <span className="font-medium text-[#f2f4f6]">{value}</span>
                    </div>
                  ))}
                </div>

                {/* 선택된 기능 상세 목록 */}
                <div className="mb-5 rounded-xl bg-[#2c2c35] p-4">
                  <h4 className="mb-3 flex items-center justify-between text-sm font-bold text-[#8b95a1]">
                    <span>선택된 기능</span>
                    <span className="text-[#3182f6]">{selectedFeatures.size}개</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.features
                      .filter(f => selectedFeatures.has(f.id))
                      .map(f => (
                        <span key={f.id} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          f.required ? 'bg-[#30d158]/15 text-[#30d158]' : 'bg-[#3182f6]/15 text-[#3182f6]'
                        }`}>
                          {f.required ? '✓ ' : ''}{f.name}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="mb-5 rounded-xl bg-[#2c2c35] p-4">
                  <h4 className="mb-3 text-sm font-bold text-[#8b95a1]">생성될 항목</h4>
                  <ul className="space-y-1.5 text-xs text-[#6b7684]">
                    <li>Prisma DB 스키마 + 마이그레이션</li>
                    <li>NestJS 백엔드 API (CRUD + 인증)</li>
                    <li>Next.js 프론트엔드 (반응형 UI)</li>
                    <li>JWT 로그인/회원가입</li>
                    <li>관리자 대시보드</li>
                  </ul>
                </div>

                <div className="mb-6 flex justify-between border-t border-[#2c2c35] pt-5 text-xl font-bold">
                  <span>소모 크레딧</span>
                  <span className="text-[#3182f6]">{credits.total.toLocaleString()}</span>
                </div>

                {/* 스마트 분석 옵션 */}
                {!smartAnalysis.running && !smartAnalysis.results.optimization && (
                  <div className="mb-5 rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🧠</span>
                      <span className="font-bold text-sm text-[#a5b4fc]">AI 스마트 분석</span>
                      <span className="text-xs text-[#6b7684] bg-[#2c2c35] px-2 py-0.5 rounded-full">추천</span>
                    </div>
                    <p className="text-xs text-[#8b95a1] mb-3">
                      앱 생성 전에 AI 3개가 시장조사 → 벤치마크 → 설계최적화를 자동 수행합니다. 결과가 3배 좋아집니다.
                    </p>
                    <button
                      onClick={async () => {
                        setSmartAnalysis({ running: true, phase: '시장 조사 중...', results: {} });
                        try {
                          const token = getToken();
                          const res = await fetch(`${API_BASE}/ai/smart-analysis-sse`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                            body: JSON.stringify({
                              template: selectedTemplate!.id,
                              answers,
                              features: Array.from(selectedFeatures),
                              tier: 'standard',
                            }),
                          });
                          if (!res.ok || !res.body) throw new Error('분석 실패');
                          const reader = res.body.getReader();
                          const decoder = new TextDecoder();
                          let buf = '';
                          const results: Record<string, string> = {};
                          while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            buf += decoder.decode(value, { stream: true });
                            const lines = buf.split('\n');
                            buf = lines.pop() || '';
                            for (const l of lines) {
                              if (!l.startsWith('data: ')) continue;
                              try {
                                const ev = JSON.parse(l.slice(6));
                                if (ev.phase === 'market') { results.market = ev.content; setSmartAnalysis(s => ({ ...s, phase: 'UI/UX 벤치마크 중...' })); }
                                else if (ev.phase === 'benchmark') { results.benchmark = ev.content; setSmartAnalysis(s => ({ ...s, phase: '설계 최적화 중...' })); }
                                else if (ev.phase === 'optimization') { results.optimization = ev.content; }
                              } catch {}
                            }
                          }
                          setSmartAnalysis({ running: false, phase: '', results });
                          // 분석 완료 → 자동으로 앱 생성 시작
                          if (results.optimization) {
                            setTimeout(() => handleGenerate(), 500);
                          }
                        } catch {
                          setSmartAnalysis({ running: false, phase: '', results: {} });
                        }
                      }}
                      className="w-full rounded-lg bg-gradient-to-r from-[#6366f1] to-[#3182f6] py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all"
                    >
                      🧠 스마트 분석 후 생성 (200 cr)
                    </button>
                  </div>
                )}

                {/* 스마트 분석 진행 중 */}
                {smartAnalysis.running && (
                  <div className="mb-5 rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/5 p-4 text-center">
                    <div className="animate-pulse text-[#a5b4fc] font-medium text-sm">{smartAnalysis.phase}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-[#2c2c35] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#6366f1] to-[#3182f6] rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                )}

                {/* 스마트 분석 완료 결과 요약 */}
                {smartAnalysis.results.optimization && (
                  <div className="mb-5 rounded-xl border border-emerald-700/30 bg-emerald-900/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span>✅</span>
                      <span className="font-bold text-sm text-emerald-400">스마트 분석 완료</span>
                    </div>
                    <p className="text-xs text-[#8b95a1]">시장조사 + 벤치마크 + 설계최적화가 앱 생성에 자동 반영됩니다.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('select-theme')}
                    className="flex-1 rounded-xl border border-[#2c2c35] py-3.5 text-[15px] font-semibold text-[#8b95a1] transition-colors hover:bg-[#2c2c35] hover:text-[#f2f4f6]"
                  >
                    뒤로
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={smartAnalysis.running}
                    className="flex-1 rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#1b64da] disabled:opacity-50"
                  >
                    {smartAnalysis.results.optimization ? '🚀 분석 반영하여 생성' : '⚡ 바로 생성'}
                  </button>
                </div>
              </div>

              {/* 오른쪽: PC/모바일 전환 미리보기 */}
              <div className="flex flex-col items-center">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm text-[#6b7684]">미리보기</span>
                  <div className="flex rounded-lg bg-[#2c2c35] p-0.5">
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${previewMode === 'mobile' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'}`}
                    >📱 모바일</button>
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${previewMode === 'desktop' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'}`}
                    >🖥 PC</button>
                  </div>
                </div>
                <div className={`overflow-hidden border border-[#2c2c35] bg-white shadow-2xl transition-all duration-300 ${
                  previewMode === 'mobile' ? 'w-[300px] rounded-[2rem]' : 'w-[520px] rounded-xl'
                }`}>
                  {previewMode === 'mobile' && (
                    <div className="flex h-[32px] items-center justify-center bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <div className="h-[4px] w-[80px] rounded-full bg-[#1b1b21]" />
                    </div>
                  )}
                  <div className="overflow-hidden bg-white" style={{ height: previewMode === 'mobile' ? '520px' : '420px' }}>
                    <iframe
                      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;font-size:14px}</style></head><body>${generatePreviewHtml(selectedTemplate.id, projectName, selectedFeatures, selectedTheme.id)}</body></html>`}
                      className="h-full w-full border-0"
                      title="Preview"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#6b7684]">실제 앱과 다를 수 있습니다</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: 생성 중 ────────────────── */}
        {step === 'generating' && (
          <div className="mx-auto max-w-lg text-center py-16">
            <div className="mb-8 text-6xl">
              {progress < 25 ? '📐' : progress < 50 ? '🗄️' : progress < 75 ? '⚙️' : '🎨'}
            </div>
            <h2 className="mb-5 text-2xl font-bold tracking-tight">
              {progress < 25 ? '아키텍처 설계 중...' : progress < 50 ? 'DB 스키마 생성 중...' : progress < 75 ? '백엔드 API 생성 중...' : '프론트엔드 UI 생성 중...'}
            </h2>

            <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#2c2c35]">
              <div
                className="h-full rounded-full bg-[#3182f6] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#8b95a1]">{progress}% — AI가 코드를 작성하고 있습니다</p>
          </div>
        )}

        {/* ── Step 5: 완료 ───────────────────── */}
        {step === 'complete' && selectedTemplate && (
          <div className="mx-auto max-w-2xl text-center py-10">
            <div className="mb-6 text-6xl">🎉</div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight">MVP 생성 완료!</h2>
            <p className="mb-10 text-[#8b95a1]">
              {selectedTemplate.name} 기반 풀스택 앱이 생성되었습니다.
              아래 미리보기로 결과를 확인하세요!
            </p>

            <div className="mb-8 rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 text-left">
              <h3 className="mb-4 font-bold">생성된 파일</h3>
              <div className="space-y-2 font-mono text-sm text-[#8b95a1]">
                <p>prisma/schema.prisma</p>
                <p>src/auth/ (로그인/회원가입 API)</p>
                <p>src/reservations/ (예약 관리 API)</p>
                <p>src/customers/ (고객 관리 API)</p>
                <p>src/app/page.tsx (메인 페이지)</p>
                <p>src/app/reservations/page.tsx</p>
                <p>src/app/customers/page.tsx</p>
                <p>... 외 15개 파일</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <a
                href={`/preview?template=${selectedTemplate?.id}`}
                className="flex-1 rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white text-center transition-colors hover:bg-[#1b64da]"
              >
                미리보기 실행
              </a>
              <button
                onClick={() => alert('코드 다운로드 기능은 준비 중입니다. 곧 ZIP 파일로 제공됩니다!')}
                className="flex-1 rounded-xl bg-[#a855f7] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#9333ea]"
              >
                코드 다운로드
              </button>
              <button
                onClick={() => alert('서버 배포 기능은 준비 중입니다. NCP 원클릭 배포를 지원할 예정입니다!')}
                className="flex-1 rounded-xl border border-[#2c2c35] py-3.5 text-[15px] font-semibold text-[#8b95a1] transition-colors hover:bg-[#2c2c35] hover:text-[#f2f4f6]"
              >
                서버 배포
              </button>
            </div>

            <button
              onClick={() => {
                setStep('select-template');
                setSelectedTemplate(null);
                setSelectedFeatures(new Set());
                setProjectName('');
                setProgress(0);
              }}
              className="mt-7 text-sm text-[#8b95a1] hover:text-[#f2f4f6] transition-colors"
            >
              새 프로젝트 만들기
            </button>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-[#2c2c35] px-6 py-8 text-center text-sm text-[#6b7684]">
        <p>Foundry &mdash; AI가 만드는 풀스택 MVP. 외주비 3천만원을 20만원으로.</p>
      </footer>
    </div>
  );
}
