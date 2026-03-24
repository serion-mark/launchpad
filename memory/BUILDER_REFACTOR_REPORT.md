# Builder Refactoring Report — 2026-03-24

## 결과 요약

| 항목 | Before | After |
|------|--------|-------|
| page.tsx | 2,069줄 (1파일) | 617줄 (상태관리+레이아웃) |
| BuilderChat.tsx | - | 835줄 (채팅 엔진) |
| BuilderPreview.tsx | - | 453줄 (미리보기+구조시각화) |
| CreditConfirmModal.tsx | - | 89줄 (크레딧 모달) |
| tsc 에러 | 0 | 0 |

## 삭제된 것 (템플릿 잔재)

1. **generateDynamicPreview()** — 하드코딩 목업 전체 삭제 (~200줄)
2. **generatePageContent()** — 업종별 HTML 목업 전체 삭제 (~200줄)
3. **previewTemplate 상태변수** — 삭제
4. **demoData/demoNames/demoServices** — page.tsx에서 import 제거
5. **THEME_MAP, getFeatLabel** — page.tsx/BuilderChat에서 import 제거
6. **업종별 분기 (isBeauty/isCommerce/isO2O...)** — page.tsx에서 전부 삭제
7. **beauty-salon fallback** → `custom` 으로 변경
8. **"₩1,280,000" "김지현" 등 하드코딩 데이터** — 전부 삭제 (구조 시각화로 교체)

## 미리보기 수정 (3단계)

### designing 상태
- Before: 하드코딩 목업 (어떤 앱이든 매출 대시보드 나옴!)
- After: **StructureVisualization** 컴포넌트
  - 앱 이름 + 페이지 목록 + 기능 트리 + 설정 요약
  - 채팅에서 답변한 내용 기반으로 실시간 반영
  - 답변 없으면 "채팅으로 앱을 설계하세요" 안내

### done 상태
- 렌더링 우선순위:
  1. deployedUrl → iframe (실제 배포된 앱) + LIVE 배지
  2. generatedFiles → LivePreview (로그인 스킵!)
  3. 파일 로딩 중 → "미리보기를 불러오는 중..." + 새로고침 버튼
  4. **절대 하드코딩 목업 안 나옴**

### generating 상태
- streamingFiles 없으면: 풀 프로그레스 (단계별 아이콘 + 퍼센트 바)
- streamingFiles 있으면: 실시간 LivePreview + 미니 프로그레스 오버레이

## 채팅 로직 수정 (4단계)

### done 상태 메시지 분류
- 수정 키워드 → AI 수정 API (callModifyFiles)
  - 키워드: 수정,변경,바꿔,바꾸,추가,삭제,제거,고쳐,고치,색상,색깔,텍스트,문구,버튼,이미지,크기,위치,레이아웃,fix,change,add,remove,update,modify
- 일반 대화 → AI 채팅 (callAiChat)

### 에러 메시지 차단
- "반영에 실패했습니다" → **제거됨**
- "코드를 수정하지 못했습니다" → **제거됨**
- 수정 실패 시 → "좀 더 구체적으로 말씀해주세요. 예: 메인 페이지 배경색을 파란색으로 바꿔줘"

## 컴포넌트 구조

```
builder/
  page.tsx                    (617줄) 상태관리 + SSE 생성 + 레이아웃
  components/
    BuilderChat.tsx           (835줄) 채팅 엔진 (질문지+대화+수정)
    BuilderPreview.tsx        (453줄) 미리보기 (구조시각화+LivePreview+프로그레스)
    CreditConfirmModal.tsx    (89줄)  크레딧 사전 안내 모달
    LivePreview.tsx           (기존)  실시간 코드 미리보기
    AgentPanel.tsx            (기존)  Agent 모드
    VisualEditPopup.tsx       (기존)  비주얼 편집
    VersionHistory.tsx        (기존)  버전 이력
    CodeHealthPanel.tsx       (기존)  코드 헬스체크
    WelcomeBack.tsx           (기존)  이어서 하기
  constants.ts               (기존)  질문지 + 테마맵 + 기능라벨
  demo-data.ts               (기존, 미사용) 업종별 데모데이터 — 삭제 가능
```

## 검증 체크리스트

- [x] tsc --noEmit 0 에러 (3회 확인)
- [x] generateDynamicPreview() 삭제
- [x] generatePageContent() 삭제
- [x] previewTemplate 상태 삭제
- [x] beauty-salon fallback → custom 변경
- [x] 하드코딩 목업 완전 제거
- [x] designing → 구조 시각화
- [x] done → LivePreview/iframe만 (로그인 아님!)
- [x] "반영 실패" / "코드 수정 못함" 메시지 차단
- [ ] 실제 배포 테스트 (사장님 확인 필요)
- [ ] /start에서 채팅으로 앱 설계 시작되는지 (기존 플로우 유지)
- [ ] class="w-full" 텍스트 노출 없는지

## 남은 작업

1. **demo-data.ts** 파일 삭제 가능 (page.tsx에서 더 이상 import 안 함)
2. **/start 페이지 "또는 템플릿으로 시작하기"** 섹션 제거 — 별도 작업
3. **constants.ts** 정리 — QUESTIONNAIRES는 유지, THEME_MAP/getFeatLabel은 BuilderPreview 미사용 확인 후 정리 가능
4. **배포 테스트** — git push 후 실제 사이트 확인
