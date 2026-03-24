# Phase 13 UX 버그 수정 보고서 — 2026-03-24

> **사장님 실사용 테스트에서 발견한 버그 7건 수정 완료!**
> 코드 생성 로직 절대 안 건드림. 미리보기 + 채팅 + UI만 수정.

---

## 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `web/src/app/builder/page.tsx` | 버그 1~7 전체 수정 (프론트엔드) |
| `api/src/ai/meeting.service.ts` | 버그 2 수정 (백엔드 시스템 프롬프트) |

---

## 버그 1: 미리보기 하드코딩 목업 — 🔴 수정 완료

### 원인
1. SSE 생성 완료 후 `setBuildPhase('done')` 하지만 `project.generatedCode`를 갱신하지 않아 `generatedFiles`가 빈 배열
2. `generatedFiles` 비면 `showLivePreview = false` → 하드코딩 인터랙티브 미리보기(매출 대시보드)로 fallback
3. `done` 상태에서도 `previewTemplate`이 있으면 인터랙티브 미리보기 조건 충족

### 수정 (3곳)
1. **`generatedFiles` memo**: `done`인데 `project.generatedCode` 없으면 `streamingFiles` fallback 사용
2. **`handleGenerateComplete`**: 완료 시 `authFetch(/projects/${projectId})`로 프로젝트 데이터 갱신 (generatedCode 포함)
3. **인터랙티브 미리보기 조건**: `buildPhase !== 'done'` 추가하여 생성 완료 후 절대 하드코딩 미리보기 안 보임

### 검증 방법
- 데이팅앱 생성 → 완료 후 프로필 카드 보여야 함 (매출 대시보드 X)
- "₩1,280,000" 절대 안 나와야 함

---

## 버그 2: 대기 채팅이 프로젝트 정보를 모름 — 🔴 수정 완료

### 원인
- 프론트: context에 `프로젝트명/템플릿/테마`만 보냄 (answers, smartAnalysis, features 없음)
- 백엔드: 시스템 프롬프트가 "회의 결과를 참고하여" — 빌더용이 아닌 회의실용

### 수정 (2곳)
1. **프론트**: `sendWaitChat` → context에 프로젝트 전체 정보 주입 (answers, smartAnalysis, features, description)
2. **백엔드**: `simpleChat()` — context에 `[현재 프로젝트 정보]` 포함 시 빌더 전용 프롬프트 사용
   - "이전 대화를 모릅니다" 금지, 프로젝트 정보 기반 답변 유도

### 검증 방법
- 앱 생성 중 "이 앱 뭐야?" → 프로젝트 정보 아는 답변 나와야 함

---

## 버그 3+4: 대기 채팅이 사라짐 + 컨텍스트 초기화 — 🟠 수정 완료

### 원인
- 오른쪽 패널의 대기 채팅이 `streamingFiles.length === 0`일 때만 표시
- 단계 바뀌면(아키텍처→프론트엔드) streamingFiles 생기면서 사라짐
- 별도 `waitChatMessages` state 사용 → 히스토리 분리

### 수정 (왼쪽 채팅 통합)
1. **`sendGeneratingChat` 함수 추가**: `generating` 중 왼쪽 채팅으로 입력 시 AI 대기 상담 기능 (기존 `sendWaitChat` 대체)
2. **`sendMessage`에 분기**: `buildPhase === 'generating'`이면 `sendGeneratingChat` 호출
3. **왼쪽 메시지 영역에 추천 질문 4개 표시**: 생성 중에 보이며, 단계 바뀌어도 유지
4. **오른쪽 대기 채팅 UI 제거**: 간단한 안내 메시지로 대체 ("왼쪽 채팅에서 궁금한 점을 물어보세요")
5. **왼쪽 입력창 placeholder**: `generating` 중 "생성 중 궁금한 점을 물어보세요..."

### 효과
- 채팅이 단계 바뀌어도 유지됨 (왼쪽 `messages` state는 단계와 무관)
- 이전 대화 히스토리 보존
- 채팅창 1개로 통일 → 혼란 방지

---

## 버그 5: "외부에서 보기" 404 — 🟠 수정 완료

### 원인
- 배포 전에도 project.name 기반 URL로 `<a>` 링크가 표시됨
- 실제 배포 안 했으니 404

### 수정
- `project.status === 'deployed' && project.deployedUrl` → 실제 URL로 링크
- 배포 전 → disabled 버튼 + alert "배포 후 확인 가능합니다"

---

## 버그 6: 예상 시간 과대 표시 — 🟡 수정 완료

### 원인
- 단계별 평균 시간 × 남은 단계로 계산 → 초기 단계(아키텍처: 5초)일 때 과대 추정
- 파일 수 기반 추정도 × 1.3 보정 → 과대

### 수정 (옵션 A: 시간 제거)
1. 풀 프로그레스: 시간 표시 제거, **퍼센트만** 표시
2. 미니 오버레이: 시간 표시 제거, **파일 수만** 표시

---

## 버그 7: AI 품질 평가 59점 표시 — 🟡 수정 완료

### 원인
- `assess.confidence`가 AI 자체 신뢰도 (100점 기준) → 59점이면 고객 불신

### 수정 (옵션 B: 표현 변경)
- 점수 표시 완전 제거
- `"✨ 기본 구조 완성! 채팅으로 기능을 추가하거나 수정할 수 있습니다."`
- incompleteFeatures → "추가 작업 필요" → **"추천 개선사항"** (부정적 → 긍정적)

---

## tsc 검증

```
web: npx tsc --noEmit → 0 에러 ✅
api: npx tsc --noEmit → 0 에러 ✅
```

---

## 변경하지 않은 것 (안정성 보장)

- ❌ AI 코드 생성 로직 (`ai.service.ts`) — 절대 안 건드림
- ❌ 배포 파이프라인 (`deploy.service.ts`) — 절대 안 건드림
- ❌ SSE 스트리밍 로직 — 기존 그대로
- ❌ 크레딧 차감 로직 — 기존 그대로
- ❌ Supabase 프로비저닝 — 기존 그대로
- ❌ `demo-data.ts` — 질문지 단계 인터랙티브 미리보기용으로 유지 (done 상태에서 안 보이므로 OK)

---

## 검증 체크리스트

### 필수 테스트 (test@serion.ai.kr / 123456)

1. [ ] "데이팅앱" 생성 → 미리보기에 프로필 카드 (매출 대시보드 절대 아님!)
2. [ ] "딸기농장 직거래" 생성 → 미리보기에 상품 목록
3. [ ] "카페 예약" 생성 → 미리보기에 메뉴/예약
4. [ ] 각각 미리보기가 앱마다 다른지 확인
5. [ ] 대기 채팅에서 "이 앱 뭐야?" → 프로젝트 정보 아는지
6. [ ] 화면 전환(아키텍처→프론트엔드)해도 채팅 유지되는지
7. [ ] "외부에서 보기" 배포 전 안내 나오는지
8. [ ] 예상 시간 안 보이고 퍼센트만 나오는지
9. [ ] 품질 점수 안 보이고 "기본 구조 완성!" 나오는지
