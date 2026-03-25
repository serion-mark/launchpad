# Phase A-4: 비주얼 에디터 완성

## 배경
Phase A-1~A-3에서 비주얼 에디터 뼈대를 만들었다.
- ✅ 편집 모드 ON → 클릭 → 편집 패널 → 텍스트/색상/이미지 수정 → 화면 즉시 반영
- ❌ 편집 모드 버튼 누르면 자동 활성화 안 됨 (Console에서 수동 postMessage 해야 됨)
- ❌ DB 저장 안 됨 (화면만 바뀌고 코드는 안 바뀜)
- ❌ [배포] 버튼 → [수정사항 적용]으로 변경 안 됨
- ❌ 디바운스 대기 중 버튼 비활성화 안 됨

## 작업 목록

### 【1】 편집 모드 자동 활성화 (타이밍 수정) — 최우선!!
**문제**: ✏️ 편집 중 버튼 누르면 iframe에 enable-edit-mode 메시지가 가야 하는데, 안 감.
Console에서 수동으로 postMessage 보내면 됨 → 메시지 전달 타이밍 문제.

**원인 추정**:
- iframe이 로드 완료되기 전에 메시지를 보내서 무시됨
- 또는 foundry-editor.js가 `foundry-editor-ready` 메시지를 부모에게 보내는데, 부모가 이걸 안 기다림

**해결**:
- BuilderPreview.tsx에서 iframe의 `foundry-editor-ready` 메시지를 수신
- `editorReady` state 추가
- 편집 모드 토글 시: editorReady면 바로 전송, 아니면 큐에 넣고 ready 되면 전송
- iframe이 src 바뀔 때 editorReady를 false로 리셋

**파일**: `web/src/app/builder/components/BuilderPreview.tsx`

### 【2】 인라인 편집 DB 저장 수정 — 핵심!! (세션4에서 원인 확정!)
**문제**: [적용] 누르면 화면(DOM)만 바뀌고 DB 코드가 안 바뀜. 배포해도 원래대로.

**원인 확정 (세션4 디버깅 결과)**:
1. `data-foundry-file` 속성이 앱에 없음 → `el.file`이 항상 빈 값
2. `saveToDb()` 66줄에서 `if (!el.file)` 체크 → 바로 return (API 호출 안 함!)
3. 이미 수정함: `!el.file` 체크 제거 (커밋 e9fb623)
4. 그래도 안 됨! → `applyText()` 112줄에서 `el.openingTag && el.file` 체크
   - el.file 없으면 else로 빠져서 `saveToDb(oldText, text)` 호출
   - oldText = DOM의 innerText ("신선한 사과를농장에서 바로" 줄바꿈 없이 합쳐짐)
   - 소스코드: `신선한 사과를<br/><span>농장에서 바로</span>` → 매칭 안 됨!!
5. 이미 수정함: `el.file` 체크 제거하고 `el.openingTag`만 체크 (아직 push 안 함!)

**근본 문제: DOM의 텍스트 ≠ 소스코드(JSX)의 텍스트**
- DOM: `<h1 class="text-4xl">신선한 사과를<br>농장에서 바로</h1>` (class, br)
- JSX: `<h1 className="text-4xl">신선한 사과를<br/><span>농장에서 바로</span></h1>` (className, br/, span)
- openingTag도 DOM 기준이라 `class` vs `className` 불일치

**해결 방향 (3가지 중 선택)**:
A. **innerText 기반 검색** — 가장 간단
   - API에서 filePath+oldText 대신 `searchText`(innerText)로 전체 파일 grep
   - 매칭되는 텍스트 포함 라인을 찾아서 해당 라인만 수정
   - 장점: DOM/JSX 차이 무관. 단점: 같은 텍스트 여러 곳이면 위험

B. **data-foundry-file 강제 주입** — 가장 정확
   - AI 프롬프트에 "각 페이지 최상위에 data-foundry-file 추가" 지시
   - 또는 빌드 후 HTML 후처리로 자동 주입
   - 장점: 파일 특정 가능. 단점: 기존 앱은 재생성 필요

C. **하이브리드** — A+B 조합
   - 새 앱은 data-foundry-file 자동 포함 (AI 프롬프트)
   - 기존 앱은 innerText 기반 fallback
   - 장점: 둘 다 커버. 단점: 복잡

**추천: A (innerText 기반)** — 지금 바로 되고, 대부분의 케이스 커버

**파일**:
- `web/src/app/builder/components/InlineEditor.tsx` (프론트)
- `api/src/project/project.service.ts` (API — inlineEdit 메서드)

**구현 상세**:
1. InlineEditor의 applyText에서:
   - `el.openingTag` 조건 제거
   - `saveToDb(el.innerText, newText)` — 순수 텍스트만 전송
2. API inlineEdit에서:
   - filePath 없으면 전체 파일에서 oldText 검색 (이미 수정됨 ✅)
   - 단, `>oldText<` 패턴으로 검색해서 태그 안의 텍스트만 정확히 매칭
   - 예: `>신선한 사과를<` 패턴으로 찾으면 JSX 태그 내부 텍스트 정확 매칭
3. 치환 시 태그 구조 보존하면서 텍스트만 교체

### 【3】 [배포] → [수정사항 적용] 버튼 변경
**사장님 결정**: 하단 [배포] 버튼을 [수정사항 적용]으로 변경

**구현**:
- 인라인 편집 후 unsavedCount > 0이면: 버튼 텍스트 "수정사항 적용 (N)" + 배포 실행
- unsavedCount === 0이면: 버튼 텍스트 "배포" (기존 동작)
- 배포 완료 시 unsavedCount = 0으로 리셋

**파일**: `web/src/app/builder/page.tsx` (하단 버튼 영역)

### 【4】 디바운스 대기 중 버튼 비활성화
**문제**: 컬러피커 드래그 직후 바로 [수정사항 적용] 누르면 저장 전에 배포 시작됨

**해결**:
- isSaving state가 true면 [수정사항 적용] 버튼 disabled + "저장 중..." 표시
- 500ms 디바운스 완료 + API 응답 후 isSaving = false

**파일**: `web/src/app/builder/components/BuilderPreview.tsx`, `page.tsx`

## 절대 규칙
- 패치 금지! 기존 파일에 덕지덕지 추가하지 마
- 기존 로직 변경 최소화 — 작동하는 건 건드리지 마
- tsc 0 에러 필수
- 되는 걸로 가자
- 매 작업 끝날 때마다 git push → GitHub Actions 배포 확인

## 완료 후
- tsc 0 에러 확인
- git push → 배포
- 앱 재배포해서 실제 테스트
- memory/PHASE_A4_REPORT.md 작성
