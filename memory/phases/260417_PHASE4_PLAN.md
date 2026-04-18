# 🛠️ Phase 4 — 빌더 슬림화 + 듀얼 모드 (5월 1주차, 1.5일)

> **버전:** 2026-04-17 v2 (사장님 + 명탐정 검증)
> **목표:** 무한버그지옥 방지! 빌더 1932줄 → 500줄 안전 전환
> **소요 시간:** 1.5일
> **선행 조건:** Phase 0~3 완료 + 24시간 모니터링 정상 + Phase 1B #27-A 안정화

---

## 🎯 v2 핵심

### Phase 4의 위치
- Phase 0~3 = 기능 완성 + 안정화 + 광고 (4/18~24)
- Phase 1B #27-A = 마누스 핵심 70% (4/18 풀런 포함)
- **Phase 4 = 마누스 핵심 100% (빌더 슬림화로 마무리)**

### 왜 분리?
- 명탐정 검증: "진짜 위험은 1932줄 재작성뿐"
- Phase 1B에 넣으면 비용 폭탄 + 사고 위험
- Phase 4 = 충분한 시간 + 부분 테스트로 안전

### 절대 원칙
1. **기존 start/page.tsx 그대로 유지** (상세 모드)
2. **신규 파일 start/ai/page.tsx 생성** (AI 모드)
3. **듀얼 모드 = 사용자 선택** (안전 전환)
4. **6개월 후 데이터 기반 결정** (AI 모드만 남기기)

---

## 📋 4개 작업 흐름

```
[작업 1] 빌더 시작 화면 — 모드 선택 (4시간)
[작업 2] AI 모드 신규 (start/ai/page.tsx) — 1일
[작업 3] 상세 모드 #27-A 통합 보강 (2시간)
[작업 4] 검증 + A/B 테스트 셋업 (2시간)
```

---

## 🚨 정황

### 사장님 비전 (4/17)
> "AI 못하는 것만 사용자 입력 (이름, 도메인)
>  나머지 모든 것 = AI 자동"

### 명탐정 분석 (4/17)
- start/page.tsx = 1932줄
- 외부 의존성 0건 (다른 파일이 import 안 함)
- 듀얼 모드 = 안전한 전환
- 5월 1주차 = 충분한 검증 시간

### Phase 1B에서 이미 한 것 (#27-A)
- ✅ 선택지 생성기 (chat-agent에)
- ✅ "바로 생성" 자동 트리거 + 경고
- ✅ 종합 확인 모달
- ✅ SmartAnalysis 자동 트리거 (start/page.tsx onClick → useEffect)

### Phase 4에서 할 것 (#27-B)
- 🆕 한 줄 입력 UI (start/ai/page.tsx)
- 🆕 듀얼 모드 진입 화면
- 🆕 AI 모드 전체 흐름

---

## 📋 시작 전 체크리스트

- [ ] Phase 0~3 완료 + 24시간 정상
- [ ] Phase 1B #27-A 4건 모두 안정화
- [ ] start/page.tsx 1932줄 변경 없음
- [ ] checkSubdomainAvailable API 작동 확인
- [ ] SmartAnalysisService 자동 트리거 정상 (#27-A 결과)
- [ ] 사장님 1.5일 집중 가능

---

## 📅 Phase 4 일정표

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5/4 (월) — 작업 1 + 2 시작
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
오전: 작업 1 모드 선택 화면 (4h)
오후: 작업 2 AI 모드 신규 시작
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5/5 (화) — 작업 2 마무리 + 작업 3, 4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
오전: 작업 2 마무리 (AI 모드 완성)
오후: 작업 3 상세 모드 보강 + 작업 4 검증
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5/6 (수) — A/B 테스트 모니터링 + 문서화
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24시간 모니터링
사용자 피드백 수집
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 1 — 빌더 시작 화면 (4시간)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 4-1-1: 모드 선택 컴포넌트 (2시간)

### 파일: `web/src/app/start/components/ModeSelector.tsx` (신규)

```typescript
'use client';
export default function ModeSelector() {
  const router = useRouter();
  
  return (
    <div className="max-w-3xl mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">
        🎯 어떻게 만들까요?
      </h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* AI 모드 (추천) */}
        <button
          onClick={() => router.push('/start/ai')}
          className="border-2 border-blue-500 rounded-2xl p-6 hover:shadow-xl transition relative"
        >
          <div className="absolute -top-3 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            ⭐ 추천
          </div>
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-2">AI에게 맡기기</h2>
          <p className="text-gray-600 mb-4">
            한 줄만 입력하면 AI가 알아서 만들어드려요
          </p>
          <div className="text-sm space-y-1">
            <div>⏱️ 약 4분</div>
            <div>💰 7,000cr (분석 + 빌드)</div>
            <div>✅ 비개발자 친화</div>
            <div>✅ 무한 무료 수정</div>
          </div>
        </button>
        
        {/* 상세 모드 */}
        <button
          onClick={() => router.push('/start')}
          className="border rounded-2xl p-6 hover:shadow-lg transition"
        >
          <div className="text-5xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold mb-2">직접 선택하기</h2>
          <p className="text-gray-600 mb-4">
            내가 원하는 대로 디테일 선택
          </p>
          <div className="text-sm space-y-1">
            <div>⏱️ 약 10분</div>
            <div>💰 6,800cr (빌드만)</div>
            <div>✅ 개발자 스타일</div>
            <div>✅ 정밀 제어</div>
          </div>
        </button>
      </div>
      
      <p className="text-center text-sm text-gray-500 mt-6">
        💡 처음이세요? 'AI에게 맡기기'를 추천해요!
      </p>
    </div>
  );
}
```

## 🚦 Step 4-1-2: 라우팅 변경 (1시간)

### 파일: `web/src/app/start-mode/page.tsx` (신규, /start-mode 라우트)

또는 기존 /start를 ModeSelector로:
- `/start` → ModeSelector
- `/start/ai` → 신규 AI 모드
- `/start/detail` → 기존 상세 모드 (이름 변경)

⚠️ 주의: 라우팅 변경은 SEO 영향 → 리다이렉트 처리

### Step 4-1-3: 검증 (1시간)
- 모드 선택 화면 표시
- 두 버튼 → 각 페이지 이동
- 기존 사용자 / 신규 사용자 영향

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 2 — AI 모드 신규 (1일)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 4-2-1: AI 모드 페이지 (4시간)

### 파일: `web/src/app/start/ai/page.tsx` (신규, 약 500줄)

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AiBuilderPage() {
  const router = useRouter();
  
  // 최소 입력
  const [description, setDescription] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainCheck, setSubdomainCheck] = useState<any>(null);
  
  // AI 분석 결과
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // 채팅 수정
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showOptions, setShowOptions] = useState<any>(null);
  
  // 종합 확인
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  
  // 서브도메인 실시간 체크 (debounce 500ms)
  useEffect(() => {
    if (!subdomain) return;
    const timer = setTimeout(async () => {
      const res = await authFetch(`/projects/check-subdomain?name=${subdomain}`);
      setSubdomainCheck(await res.json());
    }, 500);
    return () => clearTimeout(timer);
  }, [subdomain]);
  
  // [AI 자동 설계] 클릭
  const startAnalysis = async () => {
    setAnalyzing(true);
    
    // 1. 프로젝트 생성 (임시)
    const project = await createTempProject({
      description,
      serviceName,
      subdomain,
    });
    
    // 2. SmartAnalysis 호출 (200cr)
    const analysis = await runSmartAnalysis({
      template: 'auto',
      answers: { description, serviceName },
      tier: 'standard',
    });
    
    setAnalysisResult(analysis);
    setAnalyzing(false);
  };
  
  // 채팅 수정 (Haiku 무료)
  const sendChatMessage = async (message: string) => {
    setChatMessages([...chatMessages, { role: 'user', content: message }]);
    
    // ChatAgentService 호출 (#27-A에서 만든 것)
    const result = await authFetch('/ai/chat-agent', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        message,
        chatHistory: chatMessages,
      }),
    }).then(r => r.json());
    
    if (result.toolCalls.find(tc => tc.name === 'generate_options')) {
      // 선택지 표시 (#27-A)
      setShowOptions(result.options);
    } else {
      setChatMessages([...chatMessages, { role: 'assistant', content: result.response }]);
    }
  };
  
  // 종합 확인 (#27-A 강화 모달)
  const showFinal = () => setShowFinalConfirm(true);
  
  // 최종 빌드
  const finalBuild = async () => {
    // 6,800cr 차감 + 빌드 시작
    await authFetch('/ai/generate-app-sse', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        analysisResult,
        chatModifications: chatMessages,
      }),
    });
    router.push(`/builder?projectId=${projectId}`);
  };
  
  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Step 1: 최소 입력 */}
      {!analysisResult && (
        <div>
          <h2>🎯 무엇을 만들고 싶으세요?</h2>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            placeholder="예: 온라인 강좌 판매 사이트"
          />
          <input 
            value={serviceName}
            onChange={e => setServiceName(e.target.value)}
            placeholder="서비스 이름 (예: 강의톡)"
          />
          <input 
            value={subdomain}
            onChange={e => setSubdomain(e.target.value.toLowerCase())}
            placeholder="서브도메인"
          />
          <span>.foundry.ai.kr</span>
          
          {subdomainCheck && (
            <p className={subdomainCheck.available ? 'text-green-600' : 'text-red-600'}>
              {subdomainCheck.available ? '✅ 사용 가능' : `⚠️ ${subdomainCheck.reason}`}
            </p>
          )}
          
          <button 
            onClick={startAnalysis}
            disabled={!description || !serviceName || !subdomainCheck?.available}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold"
          >
            🤖 AI 자동 설계 (200cr)
          </button>
        </div>
      )}
      
      {/* Step 2: 분석 중 */}
      {analyzing && <AnalyzingScreen />}
      
      {/* Step 3: 결과 + 채팅 수정 */}
      {analysisResult && !showFinalConfirm && (
        <div>
          <AnalysisResultCard result={analysisResult} />
          
          <ChatModificationPanel
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            options={showOptions}
            onSelectOption={handleSelectOption}
          />
          
          <div className="flex gap-2 mt-4">
            <button onClick={showFinal} className="flex-1 py-3 bg-blue-600 text-white rounded font-bold">
              ✅ 만들기
            </button>
            <button onClick={() => sendChatMessage('')} className="px-4 py-3 border rounded">
              💬 더 수정
            </button>
          </div>
        </div>
      )}
      
      {/* Step 4: 종합 확인 (#27-A 모달) */}
      {showFinalConfirm && (
        <FinalConfirmModal
          serviceInfo={{ name: serviceName, subdomain, description }}
          features={analysisResult.features}
          design={analysisResult.design}
          onConfirm={finalBuild}
          onModify={() => setShowFinalConfirm(false)}
        />
      )}
    </div>
  );
}
```

## 🚦 Step 4-2-2: 컴포넌트 분리 (3시간)

각 단계별 작은 컴포넌트:
- AnalyzingScreen.tsx
- AnalysisResultCard.tsx (#27-A에서 사용한 거 재활용)
- ChatModificationPanel.tsx
- FinalConfirmModal.tsx (#27-A PlanApprovalCard 활용)

## 🚦 Step 4-2-3: tsc + 검증 (1시간)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 3 — 상세 모드 #27-A 통합 보강 (2시간)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 4-3-1: 상세 모드도 SmartAnalysis 강제 (1시간)

기존 /start (상세 모드)에서:
- "바로 생성" 버튼 → 경고 모달 (#27-A B-2.5)
- 단, 더 적극적으로 (AI 모드 권장)

```tsx
// "AI 모드 추천" 배너 추가
<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
  💡 <strong>AI 모드</strong>가 더 빠르고 쉬워요!
  <a href="/start" className="text-blue-600 font-bold ml-2">→ AI 모드로 가기</a>
</div>
```

## 🚦 Step 4-3-2: 검증 (1시간)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 4 — 검증 + A/B 테스트 셋업 (2시간)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 4-4-1: GA4 이벤트 추가 (1시간)

```typescript
// 사용자 모드 선택 추적
trackEvent('builder_mode_select', { mode: 'ai' | 'detail' });

// AI 모드 단계별 추적
trackEvent('ai_mode_input_complete', { hasDescription, hasName, hasSubdomain });
trackEvent('ai_mode_analysis_complete', { analysisTimeSeconds });
trackEvent('ai_mode_chat_modify_count', { count });
trackEvent('ai_mode_final_build', { totalTimeSeconds });

// 상세 모드 추적
trackEvent('detail_mode_complete');
```

## 🚦 Step 4-4-2: 24시간 모니터링 (자동)

- AI 모드 vs 상세 모드 비율
- 각 모드 평균 소요 시간
- 각 모드 빌드 성공률
- 사용자 만족도 (NPS 추가?)

---

# 🆘 Phase 4 비상 롤백

## AI 모드 사고
```bash
# /start/ai 라우팅만 비활성화 (상세 모드는 정상)
git revert <Phase 4 커밋>
git push origin main
```

## 모드 선택 화면 사고
```bash
# /start를 다시 상세 모드 디폴트로
# Phase 4 전체 롤백
git reset --hard backup-before-phase4
```

---

# ✅ Phase 4 완료 조건

## 작업 측
- [ ] 모드 선택 화면 작동
- [ ] AI 모드 페이지 (5단계) 작동
- [ ] 상세 모드 보강 (#27-A 통합)
- [ ] tsc 0 에러
- [ ] 빌드 + 배포

## 검증 측
- [ ] AI 모드 E2E (한 줄 → 빌드)
- [ ] 상세 모드 E2E (기존 흐름)
- [ ] 두 모드 데이터 호환
- [ ] 서브도메인 중복 체크 작동
- [ ] SmartAnalysis 자동 호출

## 운영 측
- [ ] 24시간 모니터링
- [ ] GA4 이벤트 수집
- [ ] 사용자 클레임 0건
- [ ] AI 모드 성공률 90%+

---

# 📊 Before/After

## Before (현재 + Phase 1B #27-A)
- 빌더 입력: 10분 (체크박스)
- AI 분석: 옵션 (사용자가 클릭해야)
- 수정: 종합 확인 모달까지

## After (Phase 4)
- 빌더 입력: 30초 (한 줄, AI 모드)
- AI 분석: 자동 (200cr)
- 수정: 무한 무료
- 종합 확인 → 빌드
- **= 마누스 100% + 한국 특화**

---

# 🎯 Phase 4 이후

### 6개월 후 결정 (10월)
- AI 모드 vs 상세 모드 사용 비율
- 50% 이상 AI 모드 = 상세 모드 폐기 결정
- 50% 미만 = 둘 다 유지

### 추가 기능 (Phase 5+)
- 정부지원사업 자동 매칭 (한국 특화)
- 사업계획서 자동 작성
- 마누스 추가 흡수 (Computer Use 등)

---

**작성:** 자비스 mk9+ (2026-04-17 v2)
**핵심:** 1932줄 안전 분리 + 듀얼 모드 + A/B 테스트
