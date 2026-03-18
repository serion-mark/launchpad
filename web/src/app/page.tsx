'use client';

import { useState } from 'react';

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

// ── 스텝 정의 ──────────────────────────────────────────
type Step = 'select-template' | 'select-features' | 'select-theme' | 'customize' | 'generating' | 'complete';

// ── 디자인 테마 20종 ──────────────────────────────────
const THEMES = [
  // ── 무료 (2종) ──
  { id: 'basic-light', name: '베이직 라이트', tier: 'free', credits: 0, description: '깔끔한 화이트 기본', preview: { bg: 'bg-slate-50', accent: 'bg-blue-500', style: '화이트 / 미니멀' } },
  { id: 'basic-dark', name: '베이직 다크', tier: 'free', credits: 0, description: '깔끔한 다크 기본', preview: { bg: 'bg-gray-900', accent: 'bg-blue-500', style: '다크 / 미니멀' } },
  // ── 스탠다드 (12종) ──
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
  // ── 프리미엄 (6종) ──
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

  // 템플릿 선택
  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template);
    const requiredIds = new Set(template.features.filter(f => f.required).map(f => f.id));
    setSelectedFeatures(requiredIds);
    setStep('select-features');
  };

  // 기능 토글
  const toggleFeature = (featureId: string) => {
    const feature = selectedTemplate?.features.find(f => f.id === featureId);
    if (feature?.required) return; // 필수 기능은 해제 불가

    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  };

  // 크레딧 계산
  const calcCredits = () => {
    if (!selectedTemplate) return { base: 0, extra: 0, total: 0 };
    const base = selectedTemplate.baseCredits;
    const extra = selectedTemplate.features
      .filter(f => selectedFeatures.has(f.id) && !f.required)
      .reduce((sum, f) => sum + f.credits, 0);
    const themeCredits = selectedTheme.credits;
    return { base, extra, themeCredits, total: base + extra + themeCredits };
  };

  // 생성 시작
  const handleGenerate = async () => {
    setStep('generating');
    // 시뮬레이션 (실제로는 API 호출)
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(i);
    }
    setStep('complete');
  };

  const credits = calcCredits();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-700/50 px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">
            <span className="text-blue-400">Launch</span>pad
          </h1>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="rounded-lg bg-gray-700/50 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm">
              <span className="font-bold text-yellow-400">10,000</span>
            </div>
            <a href="/builder" className="rounded-lg bg-green-600 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium hover:bg-green-500 transition">
              AI 빌더
            </a>
            <a href="/credits" className="rounded-lg bg-blue-600 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium hover:bg-blue-500 transition">
              요금제
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-12">

        {/* ── Step 1: 템플릿 선택 ─────────────────────── */}
        {step === 'select-template' && (
          <div>
            <div className="mb-8 md:mb-12 text-center">
              <h2 className="mb-2 md:mb-3 text-2xl md:text-4xl font-bold">어떤 서비스를 만드시나요?</h2>
              <p className="text-sm md:text-lg text-gray-400">
                업종을 선택하면 AI가 풀스택 MVP를 생성합니다
              </p>
            </div>

            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
              {TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="group rounded-2xl border border-gray-700/50 bg-gray-800/50 p-8 text-left transition-all hover:border-blue-500/50 hover:bg-gray-800 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="mb-4 text-5xl">{template.icon}</div>
                  <h3 className="mb-2 text-xl font-bold group-hover:text-blue-400 transition">
                    {template.name}
                  </h3>
                  <p className="mb-4 text-sm text-gray-400">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-gray-700/50 px-3 py-1 text-xs text-gray-300">
                      {template.category}
                    </span>
                    <span className="text-sm text-yellow-400">
                      {template.baseCredits.toLocaleString()} 크레딧~
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* 커밍순 */}
            <div className="mt-8 text-center text-gray-500">
              <p className="text-sm">더 많은 템플릿이 준비 중입니다</p>
              <p className="text-xs mt-1">카페/요식업 | 피트니스/헬스 | 병원/클리닉 | 학원/교육 | 부동산 | 숙박</p>
            </div>
          </div>
        )}

        {/* ── Step 2: 기능 선택 ───────────────────────── */}
        {step === 'select-features' && selectedTemplate && (
          <div>
            <button
              onClick={() => setStep('select-template')}
              className="mb-6 text-sm text-gray-400 hover:text-white transition"
            >
              &larr; 업종 다시 선택
            </button>

            <div className="mb-8">
              <h2 className="mb-2 text-3xl font-bold">
                {selectedTemplate.icon} {selectedTemplate.name} — 기능 선택
              </h2>
              <p className="text-gray-400">필수 기능은 자동 포함됩니다. 추가 기능을 선택하세요.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* 기능 체크리스트 */}
              <div className="lg:col-span-2 space-y-2 md:space-y-3">
                {selectedTemplate.features.map(feature => (
                  <button
                    key={feature.id}
                    onClick={() => toggleFeature(feature.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      selectedFeatures.has(feature.id)
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
                    } ${feature.required ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                        selectedFeatures.has(feature.id)
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-600'
                      }`}>
                        {selectedFeatures.has(feature.id) && (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {feature.name}
                          {feature.required && (
                            <span className="ml-2 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">필수</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {feature.credits > 0 && (
                      <span className="text-sm text-yellow-400">+{feature.credits}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* 요약 사이드바 */}
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6">
                <h3 className="mb-4 text-lg font-bold">생성 요약</h3>

                <div className="mb-4">
                  <label className="mb-1 block text-sm text-gray-400">프로젝트 이름</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="my-beauty-app"
                    className="w-full rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="mb-1 block text-sm text-gray-400">추가 요구사항 (선택)</label>
                  <textarea
                    value={customRequirements}
                    onChange={e => setCustomRequirements(e.target.value)}
                    placeholder="예: 고객별 포인트 적립 기능 추가해주세요"
                    rows={3}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="mb-6 space-y-2 border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">기본 (필수 기능)</span>
                    <span>{credits.base.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">추가 기능</span>
                    <span className="text-yellow-400">+{credits.extra.toLocaleString()}</span>
                  </div>
                  {(credits.themeCredits ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">디자인 테마</span>
                      <span className="text-purple-400">+{(credits.themeCredits ?? 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-700 pt-2 text-lg font-bold">
                    <span>합계</span>
                    <span className="text-blue-400">{credits.total.toLocaleString()} 크레딧</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    ≈ {(credits.total * 100).toLocaleString()}원 (외주 대비 {Math.round(30000000 / (credits.total * 100))}배 절약)
                  </p>
                </div>

                <button
                  onClick={() => setStep('select-theme')}
                  disabled={!projectName.trim()}
                  className="w-full rounded-xl bg-blue-600 py-3 font-bold transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음: 디자인 선택
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2.5: 디자인 테마 선택 ──────────────── */}
        {step === 'select-theme' && selectedTemplate && (
          <div>
            <button
              onClick={() => setStep('select-features')}
              className="mb-6 text-sm text-gray-400 hover:text-white transition"
            >
              &larr; 기능 선택으로 돌아가기
            </button>

            <div className="mb-8 text-center">
              <h2 className="mb-2 text-3xl font-bold">디자인 테마 선택</h2>
              <p className="text-gray-400">앱의 분위기를 결정합니다. 프리미엄 테마로 차별화하세요!</p>
            </div>

            {/* 필터 탭 */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {['전체', '무료', '스탠다드', '프리미엄'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setThemeFilter(filter)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${
                    themeFilter === filter ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'
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
                    className={`group relative rounded-xl border p-0 text-left transition-all overflow-hidden ${
                      selectedTheme.id === theme.id
                        ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'border-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    {/* 미니 프리뷰 */}
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

                    {/* 테마 정보 */}
                    <div className="bg-gray-800/80 p-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-sm font-bold text-white truncate">{theme.name}</h3>
                        {theme.tier === 'free' && <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] text-green-400">무료</span>}
                        {theme.tier === 'standard' && <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">+{theme.credits}</span>}
                        {theme.tier === 'premium' && <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">PRO</span>}
                      </div>
                      <p className="text-[11px] text-gray-500">{theme.preview.style}</p>
                    </div>

                    {selectedTheme.id === theme.id && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 하단 버튼 */}
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                선택: <span className="font-bold text-white">{selectedTheme.name}</span>
                {selectedTheme.credits > 0 && (
                  <span className="ml-2 text-purple-400">+{selectedTheme.credits} 크레딧</span>
                )}
              </div>
              <button
                onClick={() => setStep('customize')}
                className="rounded-xl bg-blue-600 px-8 py-3 font-bold transition hover:bg-blue-500"
              >
                다음: 최종 확인
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 최종 확인 + 생성 ────────────────── */}
        {step === 'customize' && selectedTemplate && (
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-6 text-3xl font-bold text-center">최종 확인</h2>

            <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-8">
              <div className="mb-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">템플릿</span>
                  <span className="font-medium">{selectedTemplate.icon} {selectedTemplate.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">프로젝트 이름</span>
                  <span className="font-medium">{projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">선택된 기능</span>
                  <span className="font-medium">{selectedFeatures.size}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">디자인 테마</span>
                  <span className="font-medium">{selectedTheme.name}
                    {selectedTheme.credits > 0 && <span className="ml-1 text-purple-400 text-sm">(+{selectedTheme.credits})</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">기술 스택</span>
                  <span className="text-sm text-gray-300">Next.js + NestJS + PostgreSQL</span>
                </div>
              </div>

              <div className="mb-6 rounded-xl bg-gray-900/50 p-4">
                <h4 className="mb-2 text-sm font-bold text-gray-300">생성될 항목</h4>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>Prisma DB 스키마 + 마이그레이션</li>
                  <li>NestJS 백엔드 API (CRUD + 인증)</li>
                  <li>Next.js 프론트엔드 (반응형 UI)</li>
                  <li>JWT 로그인/회원가입</li>
                  <li>관리자 대시보드</li>
                </ul>
              </div>

              <div className="mb-6 flex justify-between border-t border-gray-700 pt-4 text-xl font-bold">
                <span>소모 크레딧</span>
                <span className="text-blue-400">{credits.total.toLocaleString()}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('select-features')}
                  className="flex-1 rounded-xl border border-gray-600 py-3 font-medium transition hover:bg-gray-700"
                >
                  뒤로
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 font-bold transition hover:from-blue-500 hover:to-purple-500"
                >
                  AI 생성 시작
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: 생성 중 ────────────────────────── */}
        {step === 'generating' && (
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-8 text-6xl">
              {progress < 25 ? '📐' : progress < 50 ? '🗄️' : progress < 75 ? '⚙️' : '🎨'}
            </div>
            <h2 className="mb-4 text-2xl font-bold">
              {progress < 25
                ? '아키텍처 설계 중...'
                : progress < 50
                ? 'DB 스키마 생성 중...'
                : progress < 75
                ? '백엔드 API 생성 중...'
                : '프론트엔드 UI 생성 중...'}
            </h2>

            <div className="mb-4 h-3 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-400">{progress}% — AI가 코드를 작성하고 있습니다</p>
          </div>
        )}

        {/* ── Step 5: 완료 ───────────────────────────── */}
        {step === 'complete' && selectedTemplate && (
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 text-6xl">🎉</div>
            <h2 className="mb-4 text-3xl font-bold">MVP 생성 완료!</h2>
            <p className="mb-8 text-gray-400">
              {selectedTemplate.name} 기반 풀스택 앱이 생성되었습니다.
              아래 미리보기로 결과를 확인하세요!
            </p>

            <div className="mb-8 rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 text-left">
              <h3 className="mb-4 font-bold">생성된 파일</h3>
              <div className="space-y-2 font-mono text-sm text-gray-400">
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

            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <a
                href={`/preview?template=${selectedTemplate?.id}`}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-bold transition hover:bg-blue-500 text-center"
              >
                미리보기 실행
              </a>
              <button
                onClick={() => {
                  alert('코드 다운로드 기능은 준비 중입니다. 곧 ZIP 파일로 제공됩니다!');
                }}
                className="flex-1 rounded-xl bg-purple-600 py-3 font-bold transition hover:bg-purple-500"
              >
                코드 다운로드
              </button>
              <button
                onClick={() => {
                  alert('서버 배포 기능은 준비 중입니다. NCP 원클릭 배포를 지원할 예정입니다!');
                }}
                className="flex-1 rounded-xl border border-gray-600 py-3 font-medium transition hover:bg-gray-700"
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
              className="mt-6 text-sm text-gray-400 hover:text-white transition"
            >
              새 프로젝트 만들기
            </button>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-700/50 px-6 py-8 text-center text-sm text-gray-500">
        <p>Launchpad &mdash; AI가 만드는 풀스택 MVP. 외주비 3천만원을 20만원으로.</p>
      </footer>
    </div>
  );
}
