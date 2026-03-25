# 미리보기 핵심 버그 수정 보고서 — 2026-03-24

> **커밋**: `a87cb42` (버그 1+2) → `751dcc8` (대화 반영) → `c95273e` (에러 UX)
> **배포**: 전부 GitHub Actions ~25초 완료

---

## 한눈에 보기

| # | 버그 | 수정 | 상태 |
|---|------|------|------|
| 🔴 1 | done 후 미리보기에 하드코딩 목업 | re-fetch 폴링 + streamingFiles fallback | ✅ |
| 🔴 2 | 에러 후 [앱 생성하기] 다시 나옴 | hasCode → done 유지 + hasError → "다시 시도하기" | ✅ |
| 🔴 3 | 에러 시에도 하드코딩 목업 표시됨 | hasError=true → 목업 완전 차단 + 에러 전용 UI | ✅ |
| 💡 추가 | 생성 중 대화 → 완료 후 반영 | pendingRequests → "대화 내용 반영하기" 버튼 | ✅ |

---

## 🔴 버그 1: done 후 미리보기에 실제 앱 안 나옴 (`a87cb42`)

### 근본 원인
`handleGenerateComplete`에서 비동기 re-fetch → 완료 전 `setBuildPhase('done')` → `generatedFiles` 빈 배열 → `showLivePreview = false` → 하드코딩 목업 fallback

### 수정 (4곳)
1. **re-fetch 폴링**: done인데 generatedFiles 없으면 3초 간격 re-fetch (최대 10회)
2. **showLivePreview 조건 강화**: `streamingFiles.length > 0`이면 done에서도 true
3. **LivePreview files**: `generatedFiles` 없으면 `streamingFiles` fallback
4. **빈 상태 분리**: done일 때 "미리보기를 불러오는 중..." 스피너

---

## 🔴 버그 2: 에러 후 [앱 생성하기] 나옴 (`a87cb42` + `c95273e`)

### 1차 수정 (`a87cb42`)
```typescript
const hasCode = streamingFiles.length > 0 || project?.generatedCode?.length > 0;
setBuildPhase(hasCode ? 'done' : 'designing'); // 코드 있으면 done 유지
```

### 2차 수정 (`c95273e`) — 코드 없는 상태에서 에러
**문제**: 첫 생성에서 에러 → hasCode=false → `'designing'` → "앱 생성하기" + 목업

**해결**: `hasError` state 추가
```typescript
// 에러 시 (3곳 모두)
if (!hasCode) setHasError(true);

// 버튼 분기
{buildPhase === 'designing' && !hasError && (
  <button className="bg-green">앱 생성하기</button>
)}
{buildPhase === 'designing' && hasError && (
  <button className="bg-orange-to-red">🔄 다시 시도하기</button>
)}

// 생성 시작 시 리셋
setHasError(false);
```

---

## 🔴 버그 3: 에러 시 하드코딩 목업 차단 (`c95273e`)

### 수정
```typescript
// 인터랙티브 미리보기 조건에 !hasError 추가
{!showLivePreview && buildPhase !== 'generating' && buildPhase !== 'done' && !hasError && previewTemplate && (
  // 목업 렌더링 — 에러 시 차단됨!
)}

// 에러 전용 미리보기
{hasError && buildPhase === 'designing' && (
  <div>
    ⚠️ 앱 생성에 실패했습니다
    크레딧을 확인하고 다시 시도해주세요
    [크레딧 충전하기] 링크
  </div>
)}

// 상태바도 분기
{buildPhase === 'designing' && hasError && (
  <span className="text-red">● 생성 실패</span>
)}
```

---

## 💡 추가: 생성 중 대화 → 완료 후 반영 (`751dcc8`)

### 플로우
```
생성 중 "소모임 기능 추가해줘" → pendingRequests에 수집
  ↓
생성 완료:
  "💬 생성 중 요청하신 내용이 있습니다:
   1. 소모임 기능 추가해줘"
  ↓
[💬 대화 내용 반영하기] 버튼 클릭
  ↓
callModifyFiles → 코드 수정 → LivePreview 업데이트
```

---

## 에러 처리 플로우 (최종)

```
handleGenerate() 시작
  → setHasError(false)
  → setBuildPhase('generating')

성공 → setBuildPhase('done') + LivePreview 표시 ✅

실패 (코드 있음)
  → setBuildPhase('done') + 기존 LivePreview 유지
  → "기존 앱은 유지됩니다" 메시지

실패 (코드 없음)
  → setHasError(true) + setBuildPhase('designing')
  → 미리보기: ⚠️ 실패 안내 + 크레딧 충전 링크
  → 버튼: 🔄 다시 시도하기 (주황→빨강)
  → 상태바: ● 생성 실패 (빨간색)
```

---

## Anthropic API 크레딧 이슈 (2026-03-24)

| 항목 | 내용 |
|------|------|
| 3/19 충전 | $22.00 |
| 3/19~24 사용 | $22.08 (초과!) |
| 3/24 충전 | $27.50 |
| 이전 미결제 차감 | -$22.08 |
| **실질 잔액** | **~$0.83** (API 호출 차단) |
| **필요 액션** | **$25 이상 추가 충전** + Auto reload 활성화 |

---

## tsc 검증
```
web: npx tsc --noEmit → 0 에러 ✅
```

---

## 테스트 체크리스트 (Anthropic 복구 + 충전 후)

| # | 테스트 | 예상 결과 | 통과 |
|---|--------|-----------|------|
| 1 | 앱 생성 완료 후 미리보기 | LivePreview (하드코딩 X!) | ⏳ |
| 2 | 에러 발생 시 미리보기 | ⚠️ 실패 안내 (목업 X!) | ⏳ |
| 3 | 에러 발생 시 버튼 | "🔄 다시 시도하기" (앱 생성하기 X!) | ⏳ |
| 4 | 에러 발생 시 상태바 | "● 생성 실패" (설계 중 X!) | ⏳ |
| 5 | 다시 시도하기 클릭 후 | 정상 생성 + LivePreview | ⏳ |
| 6 | 생성 중 채팅 수정 요청 | 완료 후 "대화 내용 반영하기" 버튼 | ⏳ |

---

## 미완료 (후순위)
- 버그 3+4: 대기 채팅 왼쪽 통합 + 컨텍스트 유지
- 버그 5: "외부에서 보기" 배포 전 404 방지
- 버그 6: 예상 시간 과대 표시 → % 전환
- 버그 7: AI 품질 평가 59점 → 숨기기
- /start 한국어 IME 마지막 글자 남는 버그
