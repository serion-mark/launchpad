# Phase A-2 비주얼 에디터 고도화 — 완료 보고서
> 작성: 자비스 (세션 5, 2026-03-25)
> 커밋: 4601a30

---

## 뭘 했는가

### 【1】 저장/배포 분리 + [수정사항 적용] 버튼 (치명적 버그 수정)

**문제**: 인라인 편집할 때마다 `onModifyComplete` → 재배포가 동시에 여러 번 트리거됨. 3번 수정하면 재배포 3번 겹쳐서 변경사항이 꼬이거나 날아감.

**해결**:
- `InlineEditor.tsx`: `onModifyComplete` 호출 제거 → `onInlineEditSaved`로 교체 (DB 저장만)
- `page.tsx`: `hasUnsavedChanges` state 추가. 인라인 편집 성공 시 true, 재배포 완료 시 false
- `BuilderPreview.tsx`: 미리보기 헤더 오른쪽에 **[수정사항 적용]** 버튼 추가
  - `hasUnsavedChanges === true`일 때만 표시
  - 주황색(#ff6b35) + animate-pulse로 눈에 띄게
  - 재배포 중이면 "적용 중..." + disabled
  - 클릭 → 기존 `handleModifyComplete` 실행 → 완료 후 버튼 사라짐

**흐름 (Before → After)**:
```
Before: 편집 → DB 저장 → 재배포 (매번!) → 겹침 사고
After:  편집 → DB 저장 → DOM 즉시 반영 → 사용자가 원할 때 [수정사항 적용] → 재배포 1번
```

### 【2】 단순 치환 리스크 해결

**문제**: `text-blue-500` 같은 짧은 문자열이 파일에 여러 곳 있으면 전부 바뀌는 사고.

**해결**:
- `foundry-editor.js`: `getElementInfo()`에 `openingTag` 추가 — 요소의 `<h1 className="text-3xl font-bold">` 같은 opening tag를 전송
- `SelectedElement` 타입에 `openingTag` 필드 추가
- `InlineEditor.tsx`: 텍스트 치환 시 `openingTag + oldText + closeTag` → `openingTag + newText + closeTag`로 교체
  - 예: `<h1 className="text-3xl">농장 대시보드</h1>` → `<h1 className="text-3xl">내 농장</h1>`
  - 파일 내 "농장 대시보드"가 3번 있어도, `<h1 className="...">농장 대시보드</h1>` 패턴은 1번만 매칭
- API(`project.service.ts`): JS `String.replace()`가 기본적으로 첫 번째만 치환 — 안전

---

## 왜 그렇게 했는가

### 저장/배포 분리: "되는 걸로 가자" 원칙
- 복잡한 배치 시스템이나 디바운스 대신, 사용자에게 명시적 버튼을 줬다
- 비개발자 사용자가 "언제 적용되는지" 명확하게 알 수 있음
- 기존 `handleModifyComplete` 로직 100% 재사용 — 새 코드 최소

### 맥락 치환: openingTag 활용
- `outerHTML` 전체를 보내면 너무 길고, 내부 HTML이 다를 수 있음
- opening tag만 추출하면 클래스명까지 포함되어 유일성이 높음
- fallback: `openingTag`가 없으면 기존 방식(단순 텍스트)으로 치환

---

## 삽질한 것

없음. A-1 구조가 깔끔해서 prop 전달 체인만 잘 연결하면 됐음.

---

## 변경 파일 요약

| 파일 | 변경 | 줄 수 |
|------|------|-------|
| `InlineEditor.tsx` | onModifyComplete → onInlineEditSaved, 맥락 치환 | +15/-5줄 |
| `BuilderPreview.tsx` | [수정사항 적용] 버튼, hasUnsavedChanges/onInlineEditSaved props, openingTag 타입 | +15/-3줄 |
| `page.tsx` | hasUnsavedChanges state, 재배포 완료 시 false | +5/-1줄 |
| `foundry-editor.js` | openingTag 추출 + 전송 | +6줄 |

**기존 코드 삭제/변경: 최소 (prop 이름만 변경)**
**기존 기능 영향: 없음**

---

## 다음에 할 것

### Phase A-3 (다음 마일스톤)
- [ ] 색상 변경 디바운스 (매 onChange마다 API 호출 방지)
- [ ] 드래그로 요소 이동
- [ ] 복수 요소 동시 선택
- [ ] 편집 히스토리 (Ctrl+Z)
- [ ] [수정사항 적용] 시 변경 건수 표시 (뱃지)
- [ ] 비개발자용 온보딩 툴팁 (편집 모드 처음 켤 때)
