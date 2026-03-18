'use client';

import { useState } from 'react';
import { authFetch, getUser } from '@/lib/api';

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
};

// ── 스텝 정의 ──────────────────────────────────────────
type Step = 'select-template' | 'questionnaire' | 'select-theme' | 'customize' | 'generating' | 'complete';

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

export default function Home() {
  const [step, setStep] = useState<Step>('select-template');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [themeFilter, setThemeFilter] = useState('전체');
  const [projectName, setProjectName] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [progress, setProgress] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template);
    const requiredIds = new Set(template.features.filter(f => f.required).map(f => f.id));
    setSelectedFeatures(requiredIds);
    setAnswers({});
    setStep('questionnaire');
  };

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
            <a href="/dashboard" className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm font-semibold text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
              내 프로젝트
            </a>
            <a href="/credits" className="rounded-xl bg-[#3182f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b64da] transition-colors">
              요금제
            </a>
            <a href="/login" className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
              로그인
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-14">

        {/* ── Step 1: 템플릿 선택 ─────────────── */}
        {step === 'select-template' && (
          <div>
            <div className="mb-10 md:mb-14 text-center">
              <h2 className="mb-3 text-3xl md:text-[40px] font-bold leading-tight tracking-tight">
                어떤 서비스를 만드시나요?
              </h2>
              <p className="text-base md:text-lg text-[#8b95a1]">
                업종을 선택하면 AI가 풀스택 MVP를 생성합니다
              </p>
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
              <p className="text-sm">더 많은 템플릿이 준비 중입니다</p>
              <p className="text-xs mt-1.5">카페/요식업 | 피트니스/헬스 | 병원/클리닉 | 학원/교육 | 부동산 | 숙박</p>
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

                {/* 레퍼런스 URL */}
                <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <h3 className="mb-1 text-[15px] font-semibold">따라하고 싶은 홈페이지가 있나요?</h3>
                  <p className="mb-4 text-xs text-[#6b7684]">참고할 사이트나 경쟁사 URL을 알려주시면 디자인/기능을 참고합니다.</p>
                  <input
                    type="url"
                    value={(answers['ref-url-1'] as string) || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, 'ref-url-1': e.target.value }))}
                    placeholder="https://따라하고싶은사이트.com"
                    className="mb-2.5 w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] focus:border-[#3182f6] focus:outline-none transition-colors"
                  />
                  <input
                    type="url"
                    value={(answers['ref-url-2'] as string) || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, 'ref-url-2': e.target.value }))}
                    placeholder="https://경쟁사사이트.com (선택)"
                    className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] focus:border-[#3182f6] focus:outline-none transition-colors"
                  />
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

        {/* ── Step 3: 최종 확인 ──────────────── */}
        {step === 'customize' && selectedTemplate && (
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-8 text-3xl font-bold text-center tracking-tight">최종 확인</h2>

            <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-8">
              <div className="mb-6 space-y-4">
                {[
                  ['템플릿', `${selectedTemplate.icon} ${selectedTemplate.name}`],
                  ['프로젝트 이름', projectName],
                  ['선택된 기능', `${selectedFeatures.size}개`],
                  ['디자인 테마', `${selectedTheme.name}${selectedTheme.credits > 0 ? ` (+${selectedTheme.credits})` : ''}`],
                  ['기술 스택', 'Next.js + NestJS + PostgreSQL'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-[#8b95a1]">{label}</span>
                    <span className="font-medium text-[#f2f4f6]">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mb-6 rounded-xl bg-[#2c2c35] p-5">
                <h4 className="mb-3 text-sm font-bold text-[#8b95a1]">생성될 항목</h4>
                <ul className="space-y-1.5 text-sm text-[#8b95a1]">
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

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('questionnaire')}
                  className="flex-1 rounded-xl border border-[#2c2c35] py-3.5 text-[15px] font-semibold text-[#8b95a1] transition-colors hover:bg-[#2c2c35] hover:text-[#f2f4f6]"
                >
                  뒤로
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#1b64da]"
                >
                  AI 생성 시작
                </button>
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
