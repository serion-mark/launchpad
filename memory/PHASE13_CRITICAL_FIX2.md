# Phase 13 Critical Fix 2 — 사장님 실전 테스트 버그 수정

> 2026-03-24 | tsc 0 에러 | 파일 7개 수정

---

## 수정 요약

| # | 버그 | 심각도 | 상태 | 수정 파일 |
|---|------|--------|------|-----------|
| 1 | 앱 생성 완료인데 미리보기 빈 화면 | CRITICAL | ✅ 완료 | `web/builder/page.tsx` |
| 2 | 배포 팝업 가격 9,900원 (→29,000원) | CRITICAL | ✅ 완료 | `web/builder/page.tsx`, `api/project.service.ts` |
| 3 | 구 구독 모델(프로/엔터프라이즈) 남아있음 | HIGH | ✅ 완료 | `web/builder/page.tsx`, `web/page.tsx`, `web/guide/page.tsx`, `web/admin/page.tsx` |
| 4 | 채팅 수정 "반영에 실패했습니다" 반복 | HIGH | ✅ 완료 | `web/builder/page.tsx` |
| 5 | 앱 생성 크레딧 222cr (역마진!) | HIGH | ✅ 완료 | `api/credit.service.ts`, `api/ai.service.ts` |

---

## 상세 수정 내용

### 버그 1: 미리보기 빈 화면 (최우선!)

**근본 원인**: `showLivePreview` 조건이 `buildPhase === 'done' && (generatedFiles.length > 0 || streamingFiles.length > 0)`이어서, done 상태인데 파일이 아직 로딩 안 된 경우 (페이지 새로고침, SSE 완료 직후 등) `showLivePreview = false` → 아무것도 안 보임 → LivePreview가 빈 files를 받으면 "페이지를 선택하세요" 표시

**수정**:
1. `showLivePreview`를 `buildPhase === 'done'`이면 무조건 true로 변경
2. LivePreview 렌더링 전에 `generatedFiles.length > 0 || streamingFiles.length > 0` 체크 추가
3. 파일 없으면 "미리보기를 불러오는 중..." + 새로고침 버튼 표시
4. re-fetch 간격 3초→2초, 최대 시도 10→30회 (60초까지 대기)
5. 배포된 앱이면 iframe 우선 표시 → 미배포면 LivePreview → 파일 없으면 로딩 UI

**미리보기 우선순위 (수정 후)**:
1. `project.deployedUrl` 있음 → iframe (실제 앱)
2. `generatedFiles.length > 0` → LivePreview (코드 기반)
3. 파일 없음 → "불러오는 중" + 새로고침 버튼
4. 절대 하드코딩 목업 안 나옴! (done 상태에서 인터랙티브 미리보기 차단됨)

### 버그 2: 가격 불일치 9,900원 → 29,000원

**수정 위치**:
- `web/builder/page.tsx`: 배포 팝업 "월 9,900원" → "월 29,000원" (2곳)
- `web/builder/page.tsx`: 다운로드 절약 팁 "9,900원" → "29,000원"
- `api/project.service.ts`: HOSTING_PLANS.basic.price 9900 → 29000
- `api/project.service.ts`: HOSTING_PLANS.pro.price 29900 → 29000
- 서브도메인 도메인도 foundry.kr → foundry.ai.kr로 수정

### 버그 3: 구 구독 모델 제거

**수정 위치**:
- `web/builder/page.tsx`: "프로 플랜 ₩99,000/월" + "엔터프라이즈 ₩249,000/월" 섹션 → 크레딧 충전 안내 링크로 교체
- `web/page.tsx` (랜딩): 구 가격 패키지(스타터/프로/엔터프라이즈) → 크레딧 충전 패키지(1,000cr/5,000cr/50,000cr)로 교체
- `web/guide/page.tsx`: FAQ "프로 플랜(99,000원/월)" → 크레딧 안내
- `web/admin/page.tsx`: 플랜 이름 "스타터/프로" → "크레딧 충전"

### 버그 4: 채팅 수정 실패 개선

**근본 원인**: done 상태에서 **모든** 메시지가 코드 수정 API(`/ai/modify-files`)로 전달됨. "만들어진 거 보고 결정해도 되지?" 같은 일반 대화도 수정 요청으로 처리 → 수정할 코드 없음 → "반영에 실패"

**수정**:
1. 수정 키워드 감지 로직 추가 (수정/변경/바꿔/추가/삭제/색상/버튼 등)
2. 키워드 없으면 → 일반 AI 채팅으로 fall-through (designing과 동일 경로)
3. 수정 API 결과가 modifiedFiles: 0이면 → "수정할 코드를 찾지 못했습니다. 좀 더 구체적으로 말씀해주세요." (실패가 아님!)
4. pendingRequests 반영 실패도 동일하게 개선

### 버그 5: 크레딧 222cr → 3,000cr 최소 보장

**근본 원인**: SSE 앱 생성에서 `deductByModel(smart, 24파일)` = 150 + 3×24 = 222cr. 설계 문서의 3,000cr과 불일치. 실제 API 비용($2~3)보다 낮아 역마진.

**수정**:
1. `credit.service.ts`에 `calculateAppGenerateCost()` 함수 추가 (기존 동적 비용 vs 3,000cr 중 큰 값)
2. `deductByModel()`에 `minCost` 옵션 추가
3. SSE 생성에서 `minCost: 3000` 전달 → 최소 3,000cr 보장
4. 수정(modify)은 기존 동적 과금 유지 (파일 수 기반)

---

## 빌드 결과

```
web: tsc --noEmit ✅ 0 에러
api: tsc --noEmit ✅ 0 에러
```

## 수정된 파일 목록

```
web/src/app/builder/page.tsx          — 버그 1,2,3,4 (미리보기+가격+플랜+채팅)
web/src/app/page.tsx                  — 버그 3 (랜딩 가격 패키지)
web/src/app/guide/page.tsx            — 버그 3 (FAQ)
web/src/app/admin/page.tsx            — 버그 3 (어드민 플랜 이름)
api/src/project/project.service.ts    — 버그 2 (호스팅 플랜 가격)
api/src/credit/credit.service.ts      — 버그 5 (최소 비용 보장)
api/src/ai/ai.service.ts              — 버그 5 (minCost 전달)
```

## 검증 체크리스트

- [ ] 앱 생성 완료 → 미리보기에 실제 앱 보이는지
- [ ] [배포] → 가격 29,000원인지
- [ ] 구 플랜(프로/엔터프라이즈) 안 보이는지
- [ ] 채팅에서 일반 대화 → "반영에 실패" 안 나오는지
- [ ] 앱 생성 크레딧 3,000cr 이상 차감되는지
