# 🏗 플로우 재설계 마스터 플랜 — 마누스식 단순화 + 회의실 가치 보존

> **작성**: 2026-04-22 (V4 세션 — 자비스)
> **검증 대상**: 다른 세션 (크로스체크 후 피드백)
> **구현 예상**: 140분 (백엔드 30 + 프론트 80 + Prisma 10 + 테스트 20)
> **사장님 원본 지시 (인용)**:
>   - "지금 사진에 보이는 단계는 그냥빼버리자" (= `/start` 질문지 2단계~N단계)
>   - "두번째 사진에서 일정정보를 보았으면 포비로 넘어가서 요약본 체크하고 고객의도가 맞는지확인 → 서브도메인 확인 → 하고 빌드 시작"
>   - "기존 플로우에 이것만 넣고 나머지는 템플릿이나 이런건 전부 빼는거지"
>   - "마누스를 생각하면 이해하기 쉬울거야"
>   - "ai회의실에서 너무 축소요약을 하면 ai회의실을 돌린 의미가 없으니까 최대한 정보제공을 해야되는데 이걸 어떻게 해야될까"

---

## 🎯 Executive Summary

파운더리의 현재 사용자 여정은 **질문지 4~8단계**를 거치는 복잡한 깔때기 구조. 사장님이 요구한 "마누스식 단순화" = **한 줄 프롬프트 → AI 가 정리 → 확인 1번 → 즉시 빌드**. 동시에 AI 회의실(3개 AI 토론) 의 전략적 통찰이 단순 요약으로 손실되지 않도록 **3층 정보 보존 구조** (앱 스펙 / 전략 컨텍스트 / 원본) 를 도입. 본 플랜은 구현 계획 + 검증 포인트 + 리스크를 정리. 

---

## 1. 현재 상태 (코드 증거)

### 1-1. `/start` 질문지 흐름 (과도하게 복잡)
- 파일: `launchpad/web/src/app/start/page.tsx` (1,800+ 줄)
- Step 구조:
  1. 한 줄 입력 + 템플릿 선택
  2. 매장명 입력 + 업종 선택 (사장님이 스크린샷으로 지적)
  3. 디자인 테마 (20종)
  4. 기능 선택 (체크박스)
  5. 주제/스타일
  6. (질문지 완료) → `POST /projects` → `/builder?projectId=X` (Phase 3 후: `/builder/agent`)

### 1-2. `/builder/agent` 진입 흐름 (Phase 0~4 완료 상태)
- 파일: `launchpad/web/src/app/builder/agent/page.tsx`
- 현재 로직:
  - URL `?projectId=X` → 수정 모드 (`resumeProject()`)
  - URL `?fromMeeting=1` → 회의 보고서 **통째로** `wrappedPrompt` 주입 (정리 없음)
  - URL `?prompt=...` 지원 없음 (신규 진입은 채팅 input 사용)
- 문제: AI 회의실 보고서 5,000자 통째 전달 → Agent 혼란 (실측 확인)

### 1-3. Agent 의 AskUser 도구 동작
- 파일: `launchpad/api/src/agent-builder/sdk-tools.ts`
- 현재: 모든 세션에서 `mcp__foundry__AskUser` 도구 허용
- 문제: 회의실 정보 풍부해도 Agent 가 AskUser 로 재질문 (사장님 실측 지적)

### 1-4. 과금 + 의도 분류 (Phase 0 완료, 최신)
- `credit.service.ts` — `classifyIntent()` 함수로 consultation/simple/normal/complex 4단계 분류
- `CREDIT_COSTS.ai_consultation = 0` 상담 무료
- `AgentCreditConfirmModal.tsx` — 크레딧/서브도메인 확인 모달 (Phase 0)

---

## 2. 사장님 요청 해석

### 2-1. 정량 요약
| # | 지시 | 해석 | 범위 |
|---|---|---|---|
| A | "매장명/업종 단계 제거" | `/start` step 2 전체 | ❌ 완전 제거 |
| B | "템플릿이나 이런건 전부 빼" | `/start` step 3~N + 템플릿 버튼 | ❌ 완전 제거 |
| C | "포비로 넘어가서 요약본 체크" | `/builder/agent` 진입 시 Haiku 요약 | ➕ 신규 |
| D | "고객의도가 맞는지 확인" | 모달에 "이 내용 맞나요?" + [수정]/[이대로 시작] | ➕ 신규 |
| E | "서브도메인 확인" | 기존 Phase 0 모달 재사용 | ✅ 이미 구현 |
| F | "회의실 가치 보존" | 전략 컨텍스트 + 원본 보존 | ➕ 신규 (핵심 설계 이슈) |
| G | "마누스식" | AskUser 제거 + 한 번에 빌드 | ➕ `skipAskUser` 플래그 |

---

## 3. 제안 플로우 (마누스식)

```
홈 (/)
  └─ [바로 시작] 클릭
      ↓
/start (대폭 단순화된 버전)
  ├─ 한 줄 입력창 ("만들고 싶은 앱을 설명해 주세요")
  ├─ 크레딧 잔액 표시 (15,577 크레딧 | 앱 약 5개)
  └─ [시작] 버튼
      ↓ (POST /projects 없이, 직접 이동)
/builder/agent?prompt=<한 줄>&fromStart=1
  └─ Haiku 요약 호출 (2~3초 로딩)
      ↓
[확인 모달]
  ├─ 🧠 앱 스펙 (primary, 기본 표시)
  │   · 이름 / 핵심 기능 / 디자인 방향
  ├─ 📊 전략 컨텍스트 (접힘, ▼ 클릭 시 표시)
  │   · 타겟 / 차별화 / MVP 범위
  ├─ 📜 원본 보기 링크 (fromMeeting 일 때만)
  ├─ 🌐 서브도메인 입력 + 중복 확인
  ├─ 💳 크레딧 (신규: 6,800cr / 수정: 500~1,500cr / 상담: 0cr)
  └─ [수정하고 싶음] [이대로 시작 →]
      ↓
Agent 실행 (skipAskUser=true)
  ├─ allowedTools 에서 AskUser 제외
  ├─ system prompt 에 앱 스펙 + 전략 컨텍스트 주입
  └─ 바로 Write 시작
```

### 3-1. AI 회의실 경로도 동일 원칙
```
/meeting → 3개 AI 토론 → 종합 보고서
  └─ [🌗 포비에게 바로 맡기기]
      ↓
/builder/agent?fromMeeting=1
  └─ Haiku 가 보고서를 2섹션 요약 (앱 스펙 + 전략 컨텍스트)
  └─ 원본은 DB Project.meetingReport 저장
      ↓
[확인 모달] (동일 UI, 단 [📜 원본 보기] 링크 표시)
  ↓
Agent 실행 (fromStart 와 동일 — skipAskUser)
```

---

## 4. 핵심 설계 — 3층 정보 보존 구조

### 4-1. 왜 이렇게 하는가
AI 회의실은 30분+ 투자 + 3개 AI 토론의 결과물. 단순 "앱 이름/기능" 만 추출하면:
- ❌ 시장성/차별화/MVP 범위/경쟁사 분석 손실
- ❌ 사용자 입장 "회의실 돌린 의미 없다"
- ❌ 나중에 확장/투자 IR 때 참고할 전략 소실

해결: **Agent 에겐 핵심만, 사용자에겐 전략까지, DB 에는 원본 전부**.

### 4-2. 3층 구조

| 층 | 용도 | 저장 위치 | 크기 | 생성 방법 |
|---|---|---|---|---|
| **L1 앱 스펙** | Agent 작업 지시 | Agent system prompt (primary) | ~500자 | Haiku 추출 (structured) |
| **L2 전략 컨텍스트** | 사용자 확인 + Agent 참고 | system prompt (secondary) + 모달 표시 | ~1,500자 | Haiku 추출 (structured) |
| **L3 원본 보고서** | 영구 보관 + 사용자 추후 참고 | `Project.meetingReport` (JSON) | ~5,000자 | DB 저장 (그대로) |

### 4-3. Haiku 프롬프트 설계 (2섹션 동시 추출)

```
[입력] 사용자 한 줄 프롬프트 or AI 회의 보고서 원문

[출력] JSON:
{
  "spec": {
    "appName": "마케팅봇",
    "tagline": "소상공인용 AI 마케팅 자동화",
    "coreFeatures": [
      "사진 업로드 → AI 카피 생성",
      "업종별 해시태그 자동 추천",
      "인스타그램 연동"
    ],
    "designTone": "미니멀 / 주황 계열",
    "techHints": {
      "supabase": true,
      "requiresApiKey": "OpenAI",
      "mobile": false
    }
  },
  "strategy": {
    "targetUser": "국내 1인 소상공인 (640만명)",
    "differentiator": "한국 시장 특화 (지역 기반, 업종별 최적화)",
    "mvpScope": {
      "include": ["인스타그램 카피", "해시태그"],
      "exclude": ["블로그 자동화", "최적 게시 시간"]
    },
    "benchmarks": ["Canva", "Buffer", "네이버 MYPLACE"],
    "pricing": "월 19,000원 (프리미엄 49,000원)",
    "risks": ["AI 카피 일반화", "레드오션"]
  },
  "confidence": 0.85   // 요약 신뢰도 — 낮으면 사용자에게 경고
}
```

### 4-4. Agent system prompt 주입 형식

```markdown
[이 세션의 작업 스펙]

## 📝 앱 스펙 (반드시 이대로 만들 것)
- 앱 이름: 마케팅봇
- 핵심 기능:
  1. 사진 업로드 → AI 카피 생성
  2. 업종별 해시태그 자동 추천
  3. 인스타그램 연동
- 디자인: 미니멀 / 주황 계열

## 📊 전략 컨텍스트 (디자인/기능 우선순위 판단 참고)
- 타겟: 국내 1인 소상공인
- MVP 제외: 블로그 자동화 (V2.0 에서)
- 참고 경쟁사: Canva, Buffer

## 룰
- AskUser 도구 사용 금지 (모든 정보 위에 있음)
- 즉시 Write 시작
- 부족한 정보는 합리적 기본값 (기존 agent-core.md 11번 룰)
```

---

## 5. 구현 계획 (140분)

### Phase A — Haiku 요약 백엔드 (30분)

**파일**: `api/src/ai/ai.service.ts` (+ `api/src/ai/ai.controller.ts`)

**작업**:
1. 새 메서드 `summarizeToAgentSpec(raw: string, source: 'start' | 'meeting')`
2. Haiku 모델 호출, JSON 구조화 출력 (max_tokens: 1500)
3. 새 엔드포인트 `POST /api/ai/summarize-to-agent-spec`
   - Body: `{ raw: string, source: 'start' | 'meeting' }`
   - Response: `{ spec: {...}, strategy: {...}, confidence: number }`
4. 비용 추적 — `creditService.deduct({ action: 'ai_chat' })` 30cr (또는 무료 1회)

**주의**:
- JSON 파싱 실패 시 fallback — 전체를 `strategy` 로 넘기고 `spec` 은 기본값
- Haiku 실패 (네트워크/rate limit) 시 원본 그대로 반환 (UX 지연보다 안전 우선)

### Phase B — Prisma 스키마 (10분)

**파일**: `api/prisma/schema.prisma`

```prisma
model Project {
  // ...기존 필드
  meetingReport Json?    // { raw: string, spec: Object, strategy: Object, summarizedAt: DateTime }
  initialPrompt String?  // 첫 진입 시 사용자 한 줄 프롬프트 (회고용)
}
```

`prisma db push` 는 deploy.sh 자동 적용.

### Phase C — `/start` 대수술 (30분)

**파일**: `web/src/app/start/page.tsx`

**제거**:
- `QUESTIONNAIRES`, `TEMPLATES`, `COMMON_QUESTIONS`, `TEMPLATE_QUESTIONS` 전부
- Step 2~N 렌더 코드 (약 1,500줄)
- 테마 선택 / 기능 체크박스 / 주제 선택 UI
- 사용자 지정 서브도메인 UI (모달로 이관)

**유지**:
- 첫 진입: 한 줄 입력 + "시작" 버튼
- 크레딧 표시 (기존 배너)
- 템플릿 버튼은 **placeholder 예시 텍스트로만** 변환 ("예: 반려동물 돌봄 매칭 앱")
- 로그인 가드 (비로그인 → `/login?redirect=...`)

**새 로직**:
- 시작 버튼 클릭:
  - 비로그인 → `/login?redirect=/start?prompt=${encoded}`
  - 로그인 → `/builder/agent?prompt=${encoded}&fromStart=1` (POST `/projects` 없이 직접)

### Phase D — 확인 모달 확장 (40분)

**파일**: `web/src/app/builder/agent/components/AgentCreditConfirmModal.tsx` 확장 or 신규 `AgentStartConfirmModal.tsx`

**새 섹션 (기존 위에 추가)**:
```tsx
{/* 🧠 앱 스펙 섹션 */}
<div className="mb-3 rounded-xl border bg-blue-50 p-4">
  <h3>📝 앱 스펙</h3>
  <div>이름: {spec.appName}</div>
  <ul>{spec.coreFeatures.map(...)}</ul>
  <div>디자인: {spec.designTone}</div>
</div>

{/* 📊 전략 컨텍스트 (접힘) */}
<details className="mb-3">
  <summary>📊 전략 컨텍스트</summary>
  <div>타겟: {strategy.targetUser}</div>
  <div>MVP 범위: {strategy.mvpScope}</div>
  ...
</details>

{/* 📜 원본 보기 (fromMeeting 일 때만) */}
{source === 'meeting' && (
  <a href={rawUrl} target="_blank">📜 원본 회의 보고서 ↗</a>
)}

{/* 기존 서브도메인 + 크레딧 섹션 (그대로) */}

{/* 버튼 */}
<button onClick={onEdit}>✏️ 수정하고 싶음</button>
<button onClick={onConfirm}>이대로 시작 →</button>
```

**[수정하고 싶음] 클릭 시**:
- 프롬프트 input 모드 전환
- 사용자가 새 텍스트 입력 → 다시 Haiku 호출 → 모달 갱신

### Phase E — `/builder/agent` 진입 로직 (15분)

**파일**: `web/src/app/builder/agent/page.tsx`

**새 쿼리 처리**:
- `?prompt=X&fromStart=1` → 한 줄 프롬프트로 Haiku 호출 → 모달 팝업
- `?fromMeeting=1` → sessionStorage 보고서 읽기 → Haiku 호출 → 모달 팝업
- `?projectId=X` → 기존 수정 모드 (변경 없음)
- 직접 타이핑 → 기존대로 (AskUser 허용)

**통합 useEffect**:
```tsx
useEffect(() => {
  if (!authChecked || autoStartedRef.current) return;
  const initialPrompt = fromStart ? prompt : null;
  const meetingContext = fromMeeting ? sessionStorage.getItem('meeting_context') : null;
  const raw = initialPrompt ?? meetingContext;
  if (!raw) return;
  autoStartedRef.current = true;
  // Haiku 요약
  authFetch('/ai/summarize-to-agent-spec', {
    method: 'POST',
    body: JSON.stringify({ raw, source: fromMeeting ? 'meeting' : 'start' }),
  }).then((r) => r.json()).then((data) => {
    setPendingStart({
      spec: data.spec,
      strategy: data.strategy,
      raw,
      isEdit: false,
      source: fromMeeting ? 'meeting' : 'start',
    });
  });
  if (fromMeeting) sessionStorage.removeItem('meeting_context');
}, [authChecked, fromStart, fromMeeting, prompt]);
```

### Phase F — skipAskUser + 상담 템플릿 (15분)

**백엔드 `agent-builder-sdk.service.ts`**:
- `AgentSdkInput` 에 `skipAskUser?: boolean` 추가
- `AgentSdkInput` 에 `agentSpec?: object` / `strategyContext?: object` 추가
- `runWithSDK()`:
  - `skipAskUser=true` 이면 `allowedTools` 에서 `mcp__foundry__AskUser` 제외
  - `systemPrompt.append` 앞에 앱 스펙 + 전략 컨텍스트 주입
  - DB `Project.meetingReport` 에 원본 저장 (project 생성 후)

**프롬프트 `agent-core.md` 섹션 13 추가**:
- 이미 이전 메시지에서 계획한 "상담 모드 응답 템플릿" + 금지
- 섹션 12 를 "수정/생성 전용" 으로 명시

### Phase G — 테스트 + 커밋 + 배포 (20분)

- tsc (api + web)
- 커밋 메시지 (긴 설명 + Phase A~F 전부)
- push → GitHub Actions 배포 (32초)
- 실사용 검증:
  1. 홈 → 바로 시작 → "반려동물 돌봄 매칭 앱" 입력 → 모달 확인
  2. 회의실 → 보고서 → 포비에게 맡기기 → 모달 확인 (전략 섹션 있는지)
  3. 모달 [수정하고 싶음] → 재입력 → 재요약
  4. [이대로 시작] → Agent 즉시 Write 시작 (AskUser 없음)

---

## 6. 검증 포인트 (다른 세션이 판단할 것)

### 🔍 설계 타당성

**Q1**: 3층 구조 (spec / strategy / raw) 가 사장님 의도 ("회의실 가치 보존") 에 정확히 부합하는가?
- 대안 A: 2층만 (spec + raw). strategy 는 모달에 안 보여주고 raw 로 대체.
- 대안 B: 4층 (spec + strategy + mvpPlan + raw). Phase 별 실행 계획도 별도 섹션.
- **현 제안**: 3층. strategy 는 "확인용 + Agent 참고용" 이중 역할.

**Q2**: Haiku 요약의 fallback 정책 타당한가?
- 현 제안: 실패 시 `strategy` 에 raw 통째 넣고 `spec` 은 기본값 + confidence=0 → 모달에 "요약 실패" 경고
- 대안: 아예 실패 시 "요약 없이 진행?" 사용자 선택
- 위험: 실패했는데 사용자가 모르고 진행 → Agent 혼란 재발 (교훈: V3 의 "증상 레이어만 건드림")

**Q3**: `/start` 의 로그인 리다이렉트 UX
- 현 제안: `/start?prompt=X` → 비로그인 → `/login?redirect=/start?prompt=X` → 로그인 후 복귀하면 prompt 유지
- 대안: localStorage 에 임시 저장 후 로그인 후 복원
- 위험: URL 쿼리에 사용자 원문 노출 (로그 등) — 개인정보 불포함이면 OK

### 🔍 기술적 리스크

**R1**: Haiku 지연 (2~3초) 로딩 UX
- 모달이 뜨기 전 2~3초 로딩 → 사용자 "?" 할 수 있음
- 해결: Skeleton UI + "AI 가 정리 중..." 문구
- 측정 필요: 실측 지연 (입력 토큰수 기반 추정 2~5초)

**R2**: Agent 가 skipAskUser 상태에서도 AskUser 호출 시도
- 백엔드 `allowedTools` 에서 제외 → SDK 가 내부적으로 거부
- Agent 가 혼란해서 중단할 가능성? → agent-core.md 에 명확한 지시 필요
- 검증: 실제 세션에서 `[credit]` 로그 + `[sandbox]` 세션 생성 후 tool_use 패턴 관찰

**R3**: JSON 파싱 실패 빈도
- Haiku 가 매번 valid JSON 출력하는가? — 구조화 출력 프롬프트 강도에 달림
- 해결: `structured_output` 옵션 있으면 사용 (Anthropic SDK 지원 확인 필요)
- fallback: try-catch + `{ spec: {}, strategy: { raw } }`

**R4**: `/start` 단순화 시 기존 사용자 이탈
- 기존 질문지에 익숙한 사용자가 "단순해져서 불안" 할 수 있음
- 해결: 모달의 확인 UX 가 "AI 가 여기까지 이해함" 을 보여줘서 신뢰 확보

### 🔍 비즈니스 영향

**B1**: 크레딧 정책 변화 없음
- 신규: 6,800cr (기존과 동일)
- 상담: 0cr (이미 Phase 0 에서 도입)
- Haiku 요약 비용: 내부 부담 (3원/세션, 무시)

**B2**: 사용자 이탈 지점 변화
- 기존: 5~8단계 → 각 단계마다 이탈 가능
- 신규: 2단계 (한 줄 입력 + 모달 확인) → 이탈 포인트 ↓ → 전환율 예상 ↑

**B3**: AI 회의실 가치 강조
- 회의실 사용자 → 포비 맡기기 경로가 매끄러워져 → 회의실 사용량 증가 예상

---

## 7. 리스크 / 고려사항

### ⚠️ 구현 리스크

| 위험 | 확률 | 영향 | 완화 |
|---|---|---|---|
| Haiku 요약 품질 저하 | 중 | 중 | 프롬프트 여러 번 튜닝 + confidence 필드로 감지 |
| AskUser 차단 시 Agent 멈춤 | 낮 | 중 | agent-core.md 섹션 13 에 "정보 부족 시 기본값" 룰 강화 |
| Prisma meetingReport 필드 추가 시 장애 | 낮 | 낮 | db push 는 nullable 필드 추가라 안전 |
| `/start` 대수술 중 기존 진입 실패 | 낮 | 높 | 롤백 준비 (기존 page.tsx.bak 보관) |
| 회의실 → Haiku → 보고서 재인코딩 실패 (한글 5,000자) | 낮 | 중 | 입력 초과 시 앞 3,000자만 전달 |

### ⚠️ UX 리스크

| 위험 | 완화 |
|---|---|
| Haiku 가 핵심 기능 놓침 | 모달 [수정하고 싶음] 으로 사용자가 교정 가능 |
| 사용자가 요약이 너무 짧다 느낌 | 전략 섹션 펼치기 + 원본 링크 |
| "이게 내 의도가 아닌데" 거부감 | [수정] → 재프롬프트 (2회 자유 시도) |

---

## 8. 세션 간 호환성

### Phase 0~4 와 충돌 없음
- 과금 로직: 그대로 유지 (classifyIntent → intentToAction)
- 서브도메인: 모달에서 그대로
- 채팅 노이즈 제거: 이미 배포됨 (agent-core.md)
- 단계 UI: 이미 배포됨 (FoundryPreviewPane)

### 기존 수제 루프 (`agent-builder.service.ts`) 처리
- `AgentBuilderInput` 에도 `skipAskUser?` / `agentSpec?` 추가
- 단, agent-core.md 프롬프트 룰만으로 AskUser 차단 (도구 제한은 SDK 만 구현)
- 수제 루프는 deprecated 경로이므로 최소 수정

---

## 9. 대안 검토 (다른 세션 평가용)

### 대안 1 — Haiku 안 쓰고 Sonnet 으로 요약
- 장점: 품질 ↑
- 단점: 비용 5배 ($0.015 vs $0.003)
- 판정: ❌ 세션당 부담 증가. Haiku 품질이 부족하면 재검토.

### 대안 2 — 요약 없이 Agent 가 직접 원본 읽기
- 장점: 정보 손실 0
- 단점: 이미 실측으로 Agent 혼란 확인됨 (V4 세션 증거)
- 판정: ❌ 이미 시도했다 실패.

### 대안 3 — 회의실이 끝날 때 미리 요약 생성 (선제)
- 장점: 사용자가 기다릴 필요 없음
- 단점: 회의실 코드 수정 필요 + 요약 안 쓸 사용자에게도 비용 발생
- 판정: 🤔 Phase 2 로 연기 가능. 일단 `/builder/agent` 진입 시 요약으로 시작.

### 대안 4 — 사용자가 직접 보고서 편집
- 장점: 정확도 100%
- 단점: 마누스식 "한 번에 시작" 원칙 깨짐
- 판정: ❌ [수정하고 싶음] 으로 충분.

---

## 10. 구현 순서 + 검증 게이트

```
Gate 1 (Phase A 완료 후)
  ✅ POST /api/ai/summarize-to-agent-spec 응답 검증
  ✅ 샘플 회의 보고서 (5,000자) → spec + strategy 추출
  ✅ JSON 파싱 성공률 95%+

Gate 2 (Phase B + C 완료 후)
  ✅ Prisma Project.meetingReport 필드 추가됨
  ✅ /start 기존 질문지 삭제 (1,500줄 감소)
  ✅ 홈 → /start → /builder/agent 흐름 작동

Gate 3 (Phase D + E 완료 후)
  ✅ 모달에 spec 섹션 표시
  ✅ 전략 섹션 접힘/펼침 동작
  ✅ [수정하고 싶음] → 재프롬프트 → 재요약 루프

Gate 4 (Phase F 완료 후)
  ✅ Agent 세션에서 AskUser 호출 0건 (fromStart / fromMeeting 시)
  ✅ Agent 가 spec 기반으로 Write 즉시 시작
  ✅ Project.meetingReport 에 원본 저장 확인

Gate 5 (최종)
  ✅ 사장님 실사용 2회 (직접 입력 + 회의실)
  ✅ 완료 시간 기존 대비 단축 확인
  ✅ 채팅에 이상한 메시지 없음
```

---

## 11. 교차검증 요청 사항

다른 세션에게 검증받고 싶은 **구체적 질문 5개**:

**Q1. 3층 구조 (spec/strategy/raw) vs 2층 (spec/raw)**  
어느 쪽이 "회의실 가치 보존" 목표에 더 부합하나? 3층이 과잉 설계인가?

**Q2. `/start` 에서 "POST /projects" 제거하는 것이 안전한가?**  
현재는 `/start` 완료 시 DB 에 draft 생성 → `/builder/agent` 로 이동.  
제안: DB 생성 시점을 모달 "이대로 시작" 클릭 시로 이동 (startProject 는 runWithSDK 에서).  
이유: 사용자가 모달에서 취소하면 draft 쓰레기 발생 방지.  
리스크: `/builder/agent` 진입 중 projectId 없는 상태 → 기존 로직 어긋남?

**Q3. Haiku 실패 시 Sonnet fallback 할지 아니면 원본 그대로 전달?**  
- 현 제안: 원본 그대로 + confidence=0 경고 (비용 0)
- 대안: Sonnet 자동 재시도 (비용 +5배)

**Q4. [수정하고 싶음] 클릭 횟수 제한?**  
- 현 제안: 무제한 (Haiku 비용 무시 수준)
- 대안: 2회 제한 후 "직접 입력" 강제

**Q5. 회의실 보고서 DB 저장 — 개인정보/기밀 이슈?**  
- `Project.meetingReport` 에 원본 저장 시 사용자 사업 전략 DB 에 남음
- 삭제 정책 필요한가? (예: 프로젝트 삭제 시 cascade)

---

## 12. 예상 효과 (배포 후 측정 대상)

| 지표 | 기존 | 예상 | 측정 방법 |
|---|---|---|---|
| 신규 세션 전환율 (홈 → 완료) | ? | ↑ | GA/로그 |
| 평균 세션 시작 시간 (첫 클릭 → 빌드) | 3~5분 (질문지) | 30~60초 | [cost] 로그 시작/종료 타임스탬프 |
| AI 회의실 → 포비 전환율 | ? | ↑ | 회의 완료 이벤트 / 포비 진입 이벤트 |
| Agent AskUser 호출 | 세션당 ~1회 | 0회 (fromStart/fromMeeting) | [sandbox] 로그 tool_use 패턴 |
| 완료 후 사용자 만족도 | ? | ↑ | 사용자 피드백 |

---

## 📎 참고

- **V3 세션 Z안 재설계 계획**: `memory/phases/20260420_PLAN_Z_AgentSDK_재설계.md`
- **V4 현재 상태 인수인계**: `memory/phases/20260422_파운더리_에이전트모드개발V4_핸드오프.md`
- **현재 Phase 0~4 배포 상태**: main 브랜치 최신 커밋 `05a007f`
- **과금 로직**: `api/src/credit/credit.service.ts` (classifyIntent)

---

## 🚀 작성자 권고

사장님 "마누스식" + "회의실 가치 보존" 두 요구를 **3층 구조 + skipAskUser 조합**으로 양립 가능. 구현 복잡도 중간 (140분), 리스크 낮음 (롤백 쉬움). 

다른 세션의 교차검증 4가지 판단 요청:

1. **3층 구조 타당성** (핵심 설계)
2. **`/start` 대수술 안전성** (코드 1,500줄 제거)
3. **Haiku fallback 정책**
4. **projectId 생성 시점 이전 (취소 시 draft 방지)**

검증 완료 후 사장님 승인하면 140분 내 전체 구현 + 배포.
