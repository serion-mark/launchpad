# Phase A-4 비주얼 에디터 완성 — 완료 보고서
> 작성: 자비스 (세션 5, 2026-03-25)
> 커밋: 7e0b3db

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

---

## 왜 그렇게 했는가

### 4단계 매칭이 아닌 정규식만으로 했으면 안 됐나?
- 정규식은 느리고 복잡. 대부분의 수정은 단순 includes로 매칭됨 (1단계)
- 정규식은 fallback으로만 사용 → 성능 + 정확성 균형

### openingTag 제거한 이유
- DOM의 openingTag는 `class` 사용 (HTML), JSX는 `className` → 항상 불일치
- openingTag에 의존하면 오히려 매칭 실패율 올라감
- 순수 innerText만 보내고 API에서 JSX 패턴으로 찾는 게 더 범용적

---

## 변경 파일 요약

| 파일 | 변경 | 줄 수 |
|------|------|-------|
| `project.service.ts` | 4단계 매칭 + JSX 패턴 정규식 | +80/-20줄 |
| `BuilderPreview.tsx` | editorReady 큐잉 + foundry-editor-ready 수신 | +30/-10줄 |
| `InlineEditor.tsx` | applyText 단순화 (openingTag 제거) | -5줄 |
| `BuilderChat.tsx` | unsavedCount/isSaving prop + 배포 버튼 분기 | +15/-3줄 |
| `page.tsx` | unsavedCount/isSaving prop 전달 | +2줄 |

---

## 삽질 기록

없음. A-1~A-3에서 충분히 삽질했기 때문에 이번엔 원인이 명확했고 계획서(PLAN.md)가 정확했음.

---

## 다음에 할 것

### 즉시 테스트 필요
- [ ] foundry.ai.kr/builder에서 app-7e95 (스마트팜) 열기
- [ ] 편집 모드 ON → 요소 클릭 → 텍스트 수정 → [적용]
- [ ] F12 Network: PATCH inline-edit → 200 OK + matchFound: true 확인
- [ ] [수정사항 적용] 클릭 → 재배포 → 새로고침해도 유지 확인

### Phase B 후보
- [ ] 드래그로 요소 이동
- [ ] 복수 요소 동시 선택
- [ ] 편집 히스토리 (Ctrl+Z)
- [ ] 비주얼 에디터에서 섹션 순서 변경
