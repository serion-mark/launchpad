# Phase A-4 비주얼 에디터 완성 — 완료 보고서
> 작성: 자비스 (세션 5~6, 2026-03-25~26)
> 커밋: 7e0b3db, a302b32 (긴급 버그 수정)

---

## 뭘 했는가

### 【1】 편집 모드 자동 활성화 (타이밍 수정)

**문제**: 편집 모드 버튼 누르면 iframe에 메시지가 안 감. Console에서 수동 postMessage 해야 동작.

**원인**: iframe이 로드 완료되기 전에 enable-edit-mode 메시지를 보내서 무시됨.

**해결**:
- `foundry-editor.js`는 이미 `foundry-editor-ready` 메시지를 부모에게 보냄 (247줄)
- `BuilderPreview.tsx`에 `editorReady` state + `pendingEditMode` ref 추가
- `useEffect`에서 `foundry-editor-ready` 수신 시 → editorReady = true + 큐에 대기 중인 메시지 전송
- `iframeKey` 변경 시 (재배포 등) → editorReady = false로 리셋

### 【2】 DB 저장 — JSX 범용 텍스트 치환 (핵심!!)

**문제**: DOM의 innerText ≠ JSX 소스코드. 단순 `includes`로 매칭 안 됨.
- DOM: `신선한 사과를\n농장에서 바로` (줄바꿈, 태그 없음)
- JSX: `>신선한 사과를<br/><span>농장에서 바로</span></h1>` (태그 포함)

**해결**: `project.service.ts`에 4단계 매칭 로직:
1. **단순 includes**: filePath 파일에서 oldText 직접 매칭 (가장 빠름)
2. **전체 파일 검색**: filePath 없으면 모든 파일에서 includes 검색
3. **JSX 패턴 매칭** (핵심): 정규식으로 JSX 내 텍스트 검색
   - `>텍스트</` — 태그 사이 텍스트
   - `>텍스트 <` — 후행 태그 앞 텍스트
   - `{"텍스트"}`, `{'텍스트'}`, `` {`텍스트`} `` — JSX 표현식
   - 공백/줄바꿈/중간 태그 유연 매칭 (`\s+` → `[\s\n]*(?:<[^>]*>)*[\s\n]*`)

**InlineEditor 변경**: openingTag 의존 제거. 순수 innerText만 API에 전송.

### 【3】 [배포] → [수정사항 적용] 버튼 분기

- BuilderChat 하단: `unsavedCount > 0`이면 주황색 `수정사항 적용 (N)` + `onModifyComplete` 호출
- `unsavedCount === 0`이면 기존 파란색 `배포` + `setShowCostModal('deploy')` 호출
- `isSaving`이면 disabled + "저장 중..." 표시

### 【4】 디바운스 대기 중 버튼 비활성화

- 하단 [배포/수정사항 적용] + 상단 [수정사항 적용] 모두 `isSaving` 시 disabled
- A-3에서 이미 상단은 구현, 이번에 하단도 통일

### 【5】 긴급 버그 수정: F6 자동 수정이 인라인 편집 덮어쓰기 (a302b32)

**증상**: 인라인 편집 → DB 저장 성공 → [수정사항 적용] → 빌드 에러 발생 → F6 자동 수정 발동 → **인라인 편집 내용이 원래대로 원복됨**

**원인**: `deploy.service.ts`의 F6 자동 수정이 **빌드 시작 시점에 읽은 옛날 generatedCode 전체**를 DB에 덮어쓰기. 그 사이에 인라인 편집으로 바뀐 내용이 날아감.

**해결 (3중 보호)**:
1. **F6 저장 전 최신 DB 다시 읽기** — `freshProject` 쿼리로 최신 generatedCode 가져와서 F6이 수정한 파일만 머지. 나머지 파일은 최신 상태 유지.
2. **인라인 편집 시 `lastModifiedFiles` 기록** — `project.service.ts`에 `markFileAsUserModified()` 헬퍼 추가. 인라인 편집 성공 시 `projectContext.lastModifiedFiles`에 파일 경로 기록 (최근 10개 추적).
3. **F6 사용자 수정 파일 보호** — F6이 `lastModifiedFiles`에 있는 파일은 건드리지 않음 (기존 로직 활용, 이제 인라인 편집도 대상).

**적용 범위**: F6 AI 수정 + F4+F6 잘린 파일 처리 둘 다 적용.

---

## 왜 그렇게 했는가

### 4단계 매칭이 아닌 정규식만으로 했으면 안 됐나?
- 정규식은 느리고 복잡. 대부분의 수정은 단순 includes로 매칭됨 (1단계)
- 정규식은 fallback으로만 사용 → 성능 + 정확성 균형

### openingTag 제거한 이유
- DOM의 openingTag는 `class` 사용 (HTML), JSX는 `className` → 항상 불일치
- openingTag에 의존하면 오히려 매칭 실패율 올라감
- 순수 innerText만 보내고 API에서 JSX 패턴으로 찾는 게 더 범용적

### F6 버그: 왜 전체 저장 대신 머지로 바꿨는가
- F6은 에러 파일 1~5개만 수정하는데, generatedCode 전체(수십 개 파일)를 덮어쓰고 있었음
- 인라인 편집은 F6과 독립적으로 실행되므로, F6 실행 중에도 사용자가 편집할 수 있음
- **해결 원칙**: F6은 자기가 수정한 파일만 DB에 반영, 나머지는 최신 DB 상태 유지

---

## 변경 파일 요약

| 파일 | 변경 | 커밋 |
|------|------|------|
| `project.service.ts` | 4단계 JSX 매칭 + `markFileAsUserModified` + lastModifiedFiles 기록 | 7e0b3db, a302b32 |
| `deploy.service.ts` | F6 저장 전 최신 DB 읽기 + 머지 (F4+F6 둘 다) | a302b32 |
| `BuilderPreview.tsx` | editorReady 큐잉 + foundry-editor-ready 수신 + 온보딩 | 7e0b3db |
| `InlineEditor.tsx` | applyText 단순화 (openingTag 제거) | 7e0b3db |
| `BuilderChat.tsx` | unsavedCount/isSaving prop + 배포 버튼 분기 | 7e0b3db |
| `page.tsx` | unsavedCount/isSaving prop 전달 | 7e0b3db |

---

## 삽질 기록

### F6 덮어쓰기 버그 (세션 6에서 발견)
- A-4 구현 후 테스트에서 발견: 인라인 편집 → DB 저장 성공 → 배포 시 F6 발동 → 원복
- 원인 파악에 5분, 수정에 10분. `deploy.service.ts` 813줄에서 files를 처음에 한 번 읽고 계속 사용하는 구조가 문제
- 교훈: **비동기 작업(F6)이 DB를 공유하면 반드시 최신 상태를 다시 읽어야 함**

---

## 다음에 할 것

### 즉시 테스트 필요
- [x] foundry.ai.kr/builder에서 app-7e95 (스마트팜) 열기
- [x] 편집 모드 ON → 요소 클릭 → 텍스트 수정 → [적용]
- [x] F12 Network: PATCH inline-edit → 200 OK + matchFound: true 확인
- [ ] [수정사항 적용] 클릭 → F6 발동 시에도 인라인 편집 유지 확인
- [ ] 새로고침해도 유지 확인

### Phase B 후보
- [ ] 드래그로 요소 이동
- [ ] 복수 요소 동시 선택
- [ ] 편집 히스토리 (Ctrl+Z)
- [ ] 비주얼 에디터에서 섹션 순서 변경
