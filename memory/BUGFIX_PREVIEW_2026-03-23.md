# 버그 수정 보고서 — 미리보기 + 코드 수정 (2026-03-23)

## 대상 프로젝트
- "백설공주 사과농장" (지역커머스/특산품 템플릿)
- URL: foundry.ai.kr/builder?projectId=cmn2t2p190001rhmsp597r2yp

---

## 버그 1: 채팅 수정 후 미리보기에 반영 안 됨 (치명적)

### 원인
`builder/page.tsx` 448행: `callModifyFiles()` 성공 후 **`setProject()` 미호출**
- API는 DB에 수정된 코드를 정상 저장하지만
- 프론트의 `project.generatedCode` React state가 업데이트되지 않아
- `LivePreview`에 전달되는 `generatedFiles`가 변경 전 그대로 유지됨
- 페이지를 새로고침해야만 수정 결과가 보였음

### 추가 발견: 이중 수정 트리거 (크레딧 낭비)
- 510~517행: `designing` 상태에서 AI 답변이 `code_change` 타입일 때 `callModifyFiles()`를 fire-and-forget으로 호출
- 결과를 받지 않고 버림 → 크레딧만 차감, 미리보기에 반영 안 됨
- VisualEdit onAiEdit (1500행)에서도 동일 문제

### 수정 내용
1. **`callModifyFiles()` 성공 후 `setProject()` 호출 추가** (`page.tsx` 448행)
   - `modifiedFiles`를 기존 `project.generatedCode`에 merge (path 기준 교체 또는 추가)
   - `setProject({ ...project, generatedCode: mergedFiles })` → LivePreview 즉시 갱신
2. **fire-and-forget `callModifyFiles()` 제거** (510~517행)
   - `designing` 상태의 `code_change`는 앱이 아직 없으므로 무시
3. **VisualEdit onAiEdit도 동일 패턴으로 수정** (1500행)
   - `await callModifyFiles()` → 결과로 `setProject()` 호출

### 변경 파일
- `web/src/app/builder/page.tsx` (3곳)

---

## 버그 2: 미리보기가 실제 페이지를 안 보여줌

### 원인
`LivePreview.tsx`의 `convertJsxToStaticHtml()`:
- JSX를 정규식으로 정적 HTML로 변환하는 간이 변환기
- `{data.map(() => (...))}` 패턴을 **전부 빈 문자열로 삭제**
- 상품 목록, 주문 리스트, 배송 카드 등이 모두 사라져 빈 화면 표시
- 영어 라우트명(store-intro, member)이 한글화 안 됨

### 수정 내용
1. **`.map()` 렌더링 개선** — 내부 JSX를 3개 샘플로 렌더링
   - `.name` → '샘플 항목', `.title` → '샘플 제목', `.price` → '15,000원' 등
   - 리스트/카드 컴포넌트가 빈 화면 대신 샘플 데이터로 표시
2. **라우트 한글화** — `routeToKorean()` 함수 추가
   - store-intro → 매장소개, member → 회원, products → 상품 등 23개 매핑

### 변경 파일
- `web/src/app/builder/components/LivePreview.tsx` (2곳)

### 한계
- LivePreview는 정적 HTML 변환 방식이므로 React 상태/이벤트/Supabase 데이터는 표시 불가
- 실제 작동 확인은 "배포하기" 후 `*.foundry.ai.kr`에서만 가능
- Phase 9에서 "실시간 미리보기"를 React CDN 기반으로 업그레이드 예정

---

## 버그 3: Flash 모델 자동 전환

### 원인
- 프론트에서 `selectedModelTier`는 `'smart'`로 고정 (832행) — 정상
- API `callWithFallback()`에서 403/404 에러 시 flash(Haiku)로 자동 폴백
- 이는 Anthropic API 키 크레딧 부족 또는 Sonnet 모델 접근 제한 시 발생
- rate limit(429) 3회 재시도 실패 시에는 에러가 throw되어 수정 자체가 실패

### 수정 내용
- **rate limit 3회 재시도 실패 시에도 flash 폴백 추가**
  - 기존: 3회 실패 → throw error → 프론트에서 "수정 실패" 표시
  - 수정: 3회 실패 → flash 폴백 → 품질은 낮지만 수정은 완료 + "⚠️ Flash 모델로 자동 전환됨" 표시

### 변경 파일
- `api/src/ai/ai.service.ts` (1곳, callWithFallback 메서드)

### 근본 해결
- Anthropic 크레딧 충분히 유지 ($16 잔액 → 충전 필요)
- rate limit은 Sonnet 분당 10,000 출력토큰 제한 → 연속 수정 시 발생 가능

---

## 검증
- [x] `tsc --noEmit` 에러 0건 (web + api)
- [ ] 실제 테스트: 채팅에서 "색상 바꿔줘" → 미리보기 반영 확인 (배포 후)
- [ ] 크레딧 소진 없이 이중 차감 안 되는지 확인

## 남은 이슈
1. **LivePreview 근본 개선** — 정적 HTML 변환 대신 React CDN 렌더링 (Phase 9 예정)
2. **수정 후 자동 재배포** — 현재 수정은 DB만 업데이트, 배포된 앱은 수동 재배포 필요
3. **Anthropic 크레딧 충전** — $16 잔액, Sonnet 기준 앱 ~2개 분량
