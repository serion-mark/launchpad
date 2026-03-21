'use client';

/**
 * CSS-only 미니 앱 목업 프리뷰
 * 포트폴리오 카드에서 이모지 대신 실제 앱 UI를 시뮬레이션
 */

type MockupType =
  | 'pos'        // POS/예약관리
  | 'matching'   // O2O 매칭
  | 'lms'        // 학습관리
  | 'shop'       // 쇼핑몰
  | 'facility'   // 시설관리
  | 'farm'       // 농장직판
  | 'expert'     // 전문가매칭
  | 'health'     // 헬스케어
  | 'social'     // 소셜/동호회
  | 'smartfarm'; // 스마트팜

interface Props {
  type: MockupType;
  className?: string;
}

export default function AppMockup({ type, className = '' }: Props) {
  return (
    <div className={`w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#0f0f13] border border-[#2c2c35]/50 ${className}`}>
      {/* 브라우저 탑바 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b1b21] border-b border-[#2c2c35]/50">
        <div className="w-1.5 h-1.5 rounded-full bg-[#f45452]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
        <div className="ml-2 flex-1 h-3 rounded bg-[#2c2c35] max-w-[60%]" />
      </div>
      {/* 앱 컨텐츠 */}
      <div className="p-2 h-[calc(100%-24px)]">
        {renderMockup(type)}
      </div>
    </div>
  );
}

function renderMockup(type: MockupType) {
  switch (type) {
    case 'pos':
      return <POSMockup />;
    case 'matching':
      return <MatchingMockup />;
    case 'lms':
      return <LMSMockup />;
    case 'shop':
      return <ShopMockup />;
    case 'facility':
      return <FacilityMockup />;
    case 'farm':
      return <FarmMockup />;
    case 'expert':
      return <ExpertMockup />;
    case 'health':
      return <HealthMockup />;
    case 'social':
      return <SocialMockup />;
    case 'smartfarm':
      return <SmartFarmMockup />;
    default:
      return <POSMockup />;
  }
}

// ── POS / 예약관리 ──
function POSMockup() {
  return (
    <div className="h-full flex gap-1">
      {/* 사이드바 */}
      <div className="w-[18%] bg-[#1b1b21] rounded p-1 flex flex-col gap-1">
        <div className="w-full h-3 rounded bg-[#3182f6]/30" />
        <div className="w-full h-2 rounded bg-[#2c2c35]" />
        <div className="w-full h-2 rounded bg-[#2c2c35]" />
        <div className="w-full h-2 rounded bg-[#3182f6]/20" />
        <div className="w-full h-2 rounded bg-[#2c2c35]" />
      </div>
      {/* 메인 */}
      <div className="flex-1 flex flex-col gap-1">
        {/* 상단 KPI */}
        <div className="flex gap-1">
          {['#3182f6', '#30d158', '#a855f7', '#f5a623'].map(c => (
            <div key={c} className="flex-1 rounded bg-[#1b1b21] p-1">
              <div className="h-1.5 w-[60%] rounded" style={{ background: `${c}40` }} />
              <div className="mt-0.5 h-2.5 w-[80%] rounded" style={{ background: `${c}30` }} />
            </div>
          ))}
        </div>
        {/* 예약 타임라인 그리드 */}
        <div className="flex-1 bg-[#1b1b21] rounded p-1">
          <div className="grid grid-cols-6 gap-0.5 h-full">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="rounded"
                style={{
                  background: [2, 5, 8, 10, 14].includes(i) ? '#3182f620' :
                    [3, 11].includes(i) ? '#a855f720' :
                      [7, 15].includes(i) ? '#30d15820' : '#2c2c3540',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── O2O 매칭 ──
function MatchingMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      {/* 네비 */}
      <div className="flex items-center gap-1 px-1">
        <div className="w-4 h-2.5 rounded bg-[#3182f6]/40" />
        <div className="flex-1" />
        <div className="w-2 h-2 rounded-full bg-[#2c2c35]" />
        <div className="w-2 h-2 rounded-full bg-[#3182f6]/30" />
      </div>
      {/* 프로필 카드들 */}
      <div className="flex-1 grid grid-cols-2 gap-1">
        {[
          { color: '#3182f6', stars: 5 },
          { color: '#30d158', stars: 4 },
          { color: '#a855f7', stars: 5 },
          { color: '#f5a623', stars: 4 },
        ].map((item, i) => (
          <div key={i} className="bg-[#1b1b21] rounded p-1.5 flex flex-col">
            <div className="w-full aspect-square rounded bg-gradient-to-br mb-1" style={{ background: `linear-gradient(135deg, ${item.color}20, ${item.color}40)` }}>
              <div className="w-[40%] h-[40%] mx-auto mt-[20%] rounded-full" style={{ background: `${item.color}50` }} />
            </div>
            <div className="h-1.5 w-[70%] rounded bg-[#2c2c35]" />
            <div className="mt-0.5 flex gap-0.5">
              {Array.from({ length: item.stars }).map((_, j) => (
                <div key={j} className="w-1 h-1 rounded-sm bg-[#f5a623]/60" />
              ))}
            </div>
            <div className="mt-auto h-2 rounded" style={{ background: `${item.color}30` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LMS ──
function LMSMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      <div className="flex items-center gap-1 px-1">
        <div className="w-5 h-2.5 rounded bg-[#a855f7]/40" />
        <div className="flex-1" />
        <div className="w-4 h-2 rounded bg-[#2c2c35]" />
      </div>
      {/* 진도율 바 */}
      <div className="bg-[#1b1b21] rounded p-1.5">
        <div className="h-1.5 w-full rounded-full bg-[#2c2c35]">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#3182f6] to-[#a855f7]" />
        </div>
        <div className="mt-1 h-1 w-[30%] rounded bg-[#2c2c35]" />
      </div>
      {/* 강의 리스트 */}
      <div className="flex-1 flex flex-col gap-0.5">
        {[true, true, true, false, false].map((done, i) => (
          <div key={i} className="flex items-center gap-1 bg-[#1b1b21] rounded px-1.5 py-1">
            <div className={`w-2 h-2 rounded-full ${done ? 'bg-[#30d158]' : 'bg-[#2c2c35]'}`} />
            <div className="flex-1 h-1.5 rounded bg-[#2c2c35]" />
            <div className="w-4 h-1.5 rounded bg-[#2c2c35]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 쇼핑몰 ──
function ShopMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      <div className="flex items-center gap-1 px-1">
        <div className="w-5 h-2.5 rounded bg-[#f5a623]/40" />
        <div className="flex-1" />
        <div className="w-3 h-2 rounded bg-[#2c2c35]" />
      </div>
      {/* 배너 */}
      <div className="h-[28%] rounded bg-gradient-to-r from-[#3182f6]/20 to-[#a855f7]/20 p-1.5">
        <div className="h-2 w-[50%] rounded bg-white/10" />
        <div className="mt-0.5 h-1.5 w-[30%] rounded bg-white/5" />
      </div>
      {/* 상품 그리드 */}
      <div className="flex-1 grid grid-cols-3 gap-1">
        {['#3182f6', '#30d158', '#f5a623', '#a855f7', '#f45452', '#3182f6'].map((c, i) => (
          <div key={i} className="bg-[#1b1b21] rounded p-0.5 flex flex-col">
            <div className="w-full aspect-square rounded mb-0.5" style={{ background: `${c}15` }} />
            <div className="h-1 w-[80%] rounded bg-[#2c2c35]" />
            <div className="mt-0.5 h-1.5 w-[60%] rounded bg-[#f5a623]/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 시설관리 ──
function FacilityMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      <div className="flex items-center gap-1 px-1">
        <div className="w-5 h-2.5 rounded bg-[#30d158]/40" />
        <div className="flex-1" />
        <div className="w-2 h-2 rounded-full bg-[#f45452]/40" />
      </div>
      {/* 민원 현황 카드 */}
      <div className="flex gap-1">
        <div className="flex-1 bg-[#1b1b21] rounded p-1">
          <div className="h-1 w-[40%] rounded bg-[#2c2c35]" />
          <div className="mt-0.5 h-3 w-[60%] rounded bg-[#30d158]/30" />
        </div>
        <div className="flex-1 bg-[#1b1b21] rounded p-1">
          <div className="h-1 w-[40%] rounded bg-[#2c2c35]" />
          <div className="mt-0.5 h-3 w-[60%] rounded bg-[#f5a623]/30" />
        </div>
      </div>
      {/* 민원 리스트 */}
      <div className="flex-1 flex flex-col gap-0.5">
        {[
          { status: '#30d158', label: '완료' },
          { status: '#f5a623', label: '처리중' },
          { status: '#f45452', label: '대기' },
          { status: '#30d158', label: '완료' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1 bg-[#1b1b21] rounded px-1.5 py-1">
            <div className="w-1 h-full rounded-full" style={{ background: item.status }} />
            <div className="flex-1 h-1.5 rounded bg-[#2c2c35]" />
            <div className="w-3 h-1.5 rounded text-[4px] text-center" style={{ background: `${item.status}20`, color: item.status }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 농장 직판 (지역특산품) ──
function FarmMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      {/* 히어로 배너 */}
      <div className="h-[35%] rounded bg-gradient-to-br from-[#30d158]/20 to-[#f5a623]/20 p-1.5 flex flex-col justify-end">
        <div className="h-2 w-[60%] rounded bg-white/10" />
        <div className="mt-0.5 h-1.5 w-[40%] rounded bg-white/5" />
        <div className="mt-1 h-2.5 w-[25%] rounded bg-[#30d158]/40" />
      </div>
      {/* 상품 리스트 */}
      <div className="flex-1 flex flex-col gap-0.5">
        {[
          { color: '#f45452', price: '29,000' },
          { color: '#f5a623', price: '35,000' },
          { color: '#30d158', price: '42,000' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1 bg-[#1b1b21] rounded px-1 py-1">
            <div className="w-5 h-5 rounded" style={{ background: `${item.color}20` }} />
            <div className="flex-1">
              <div className="h-1.5 w-[70%] rounded bg-[#2c2c35]" />
              <div className="mt-0.5 h-1 w-[40%] rounded bg-[#2c2c35]" />
            </div>
            <div className="h-2 w-5 rounded bg-[#30d158]/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 전문가 매칭 ──
function ExpertMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      <div className="flex items-center gap-1 px-1">
        <div className="w-5 h-2.5 rounded bg-[#3182f6]/40" />
        <div className="flex-1" />
        <div className="w-6 h-2 rounded bg-[#3182f6]/20" />
      </div>
      {/* 검색바 */}
      <div className="bg-[#1b1b21] rounded px-1.5 py-1 flex items-center gap-1">
        <div className="w-2 h-2 rounded bg-[#2c2c35]" />
        <div className="flex-1 h-2 rounded bg-[#2c2c35]" />
      </div>
      {/* 카테고리 칩 */}
      <div className="flex gap-0.5 px-0.5">
        <div className="h-2 px-1.5 rounded-full bg-[#3182f6]/20" />
        <div className="h-2 px-1.5 rounded-full bg-[#2c2c35]" />
        <div className="h-2 px-1.5 rounded-full bg-[#2c2c35]" />
        <div className="h-2 px-1.5 rounded-full bg-[#2c2c35]" />
      </div>
      {/* 전문가 카드 */}
      <div className="flex-1 flex flex-col gap-0.5">
        {['#3182f6', '#a855f7', '#30d158'].map((c, i) => (
          <div key={i} className="flex items-center gap-1 bg-[#1b1b21] rounded px-1.5 py-1">
            <div className="w-4 h-4 rounded-full" style={{ background: `${c}30` }} />
            <div className="flex-1">
              <div className="h-1.5 w-[50%] rounded bg-[#2c2c35]" />
              <div className="mt-0.5 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="w-1 h-1 rounded-sm bg-[#f5a623]/50" />
                ))}
              </div>
            </div>
            <div className="h-2.5 w-5 rounded" style={{ background: `${c}20` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 헬스케어/습관트래커 ──
function HealthMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      <div className="flex items-center gap-1 px-1">
        <div className="w-5 h-2.5 rounded bg-[#30d158]/40" />
        <div className="flex-1" />
        <div className="w-2 h-2 rounded-full bg-[#2c2c35]" />
      </div>
      {/* 원형 진행률 */}
      <div className="bg-[#1b1b21] rounded p-2 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#2c2c35] relative">
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#30d158] border-r-[#30d158] rotate-45" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[6px] font-bold text-[#30d158]">72%</span>
          </div>
        </div>
      </div>
      {/* 습관 체크리스트 */}
      <div className="flex-1 flex flex-col gap-0.5">
        {[
          { done: true, color: '#30d158', label: '물 2L' },
          { done: true, color: '#3182f6', label: '운동 30분' },
          { done: false, color: '#a855f7', label: '영양제' },
          { done: false, color: '#f5a623', label: '취침 11시' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1 bg-[#1b1b21] rounded px-1.5 py-0.5">
            <div className={`w-2 h-2 rounded ${item.done ? '' : 'border border-[#2c2c35]'}`} style={item.done ? { background: item.color } : {}} />
            <div className="flex-1 h-1.5 rounded bg-[#2c2c35]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 소셜/동호회 ──
function SocialMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      <div className="flex items-center gap-1 px-1">
        <div className="w-5 h-2.5 rounded bg-[#a855f7]/40" />
        <div className="flex-1" />
        <div className="w-2 h-2 rounded-full bg-[#f45452]/40" />
      </div>
      {/* 모임 카드 */}
      <div className="flex-1 flex flex-col gap-1">
        {[
          { color: '#3182f6', members: 12, title: '한강 러닝크루' },
          { color: '#30d158', members: 8, title: '북악산 등산모임' },
          { color: '#a855f7', members: 15, title: '강남 독서클럽' },
        ].map((item, i) => (
          <div key={i} className="bg-[#1b1b21] rounded p-1.5">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-3 h-3 rounded" style={{ background: `${item.color}20` }} />
              <div className="flex-1">
                <div className="h-1.5 w-[70%] rounded bg-[#2c2c35]" />
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {/* 멤버 아바타 */}
              {Array.from({ length: Math.min(item.members, 4) }).map((_, j) => (
                <div key={j} className="w-2 h-2 rounded-full -ml-0.5 first:ml-0" style={{ background: `${item.color}${30 + j * 10}` }} />
              ))}
              <span className="text-[5px] text-[#6b7684] ml-0.5">+{item.members}</span>
              <div className="ml-auto h-2 w-5 rounded" style={{ background: `${item.color}20` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 스마트팜 ──
function SmartFarmMockup() {
  return (
    <div className="h-full flex flex-col gap-1">
      <div className="flex items-center gap-1 px-1">
        <div className="w-5 h-2.5 rounded bg-[#30d158]/40" />
        <div className="flex-1" />
        <div className="w-4 h-2 rounded bg-[#2c2c35]" />
      </div>
      {/* 센서 현황 */}
      <div className="flex gap-1">
        {[
          { label: '온도', value: '24°', color: '#f45452' },
          { label: '습도', value: '65%', color: '#3182f6' },
          { label: '일조', value: '8h', color: '#f5a623' },
        ].map((s, i) => (
          <div key={i} className="flex-1 bg-[#1b1b21] rounded p-1 text-center">
            <div className="text-[5px] text-[#6b7684]">{s.label}</div>
            <div className="text-[7px] font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* 상품+체험 */}
      <div className="flex-1 flex flex-col gap-0.5">
        {['산지직송 사과 5kg', '농장체험 예약', '정기배송 구독'].map((_, i) => (
          <div key={i} className="flex items-center gap-1 bg-[#1b1b21] rounded px-1 py-1">
            <div className="w-4 h-4 rounded bg-[#30d158]/15" />
            <div className="flex-1">
              <div className="h-1.5 w-[65%] rounded bg-[#2c2c35]" />
              <div className="mt-0.5 h-1 w-[40%] rounded bg-[#30d158]/15" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
