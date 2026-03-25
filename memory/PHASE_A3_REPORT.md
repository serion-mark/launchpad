# Phase A-3 비주얼 에디터 안정화 — 완료 보고서
> 작성: 자비스 (세션 5, 2026-03-25)
> 커밋: b1d4c07

---

## 뭘 했는가

### 【1】 치환 실패 감지 + 사용자 알림

**문제**: DOM과 소스코드가 달라서 치환이 조용히 실패 → 사용자는 화면에서 바뀐 걸 보고 배포하지만, 실제론 안 바뀜.

**해결**:
- `project.service.ts`: `includes()` 체크 실패 시 throw 대신 `{ success: false, matchFound: false }` 반환
- `replace()` 전후 비교로 이중 검증
- `InlineEditor.tsx`: API 응답의 `matchFound` 확인 → 실패 시 주황색 경고 배너 표시
- 실패 시 `onInlineEditSaved` 호출 안 함 → unsavedCount 증가 안 됨

### 【2】 색상 디바운스 + 경쟁 상태 방지

**문제**: 컬러피커 드래그 시 매 onChange마다 API 호출 → 서버 폭격.

**해결**:
- DOM 변경(postMessage)은 즉시 실행 → 사용자 눈에 바로 반영
- DB 저장(API)은 500ms 디바운스 → setTimeout + clearTimeout
- `onSavingChange` 콜백으로 page.tsx에 `isSaving` state 전달
- [수정사항 적용] 버튼: `isSaving`이면 "저장 중..." + disabled → 저장 완료 전 배포 시작 방지

### 【3】 변경 건수 뱃지

- `hasUnsavedChanges(boolean)` → `unsavedCount(number)`로 변경
- 인라인 편집 성공 시 `unsavedCount++`
- 버튼: `수정사항 적용 (3)` 형태로 건수 표시
- 배포 완료 시 0으로 리셋

### 【4】 온보딩 툴팁

- 편집 모드 처음 켤 때 "요소를 클릭하면 직접 수정할 수 있습니다" 파란색 말풍선
- `localStorage('foundry-edit-onboarded')` → 한 번만 표시
- 4초 후 자동 사라짐

---

## 왜 그렇게 했는가

### throw 대신 응답으로 실패 반환
- throw하면 프론트에서 catch로 빠져서 "네트워크 에러인지 매칭 실패인지" 구분 불가
- 200 OK + `{ success: false }` 반환하면 프론트에서 명확하게 분기 가능

### 디바운스 직접 구현 (라이브러리 X)
- lodash 등 추가 의존성 없이 setTimeout/clearTimeout만으로 충분
- `onSavingChange(true)`를 디바운스 시작 시점에 호출 → 타이머 대기 중에도 "저장 중" 표시

---

## 변경 파일 요약

| 파일 | 변경 | 줄 수 |
|------|------|-------|
| `project.service.ts` | 치환 실패 시 정상 응답 반환 | +5/-3줄 |
| `InlineEditor.tsx` | 실패 알림, 디바운스, onSavingChange | 전면 수정 (~250줄) |
| `BuilderPreview.tsx` | 건수 뱃지, isSaving disabled, 온보딩 | +20/-5줄 |
| `page.tsx` | unsavedCount, isSaving state | +5/-3줄 |

---

## 다음에 할 것

### Phase B (다음 큰 마일스톤)
- [ ] 드래그로 요소 이동
- [ ] 복수 요소 동시 선택
- [ ] 편집 히스토리 (Ctrl+Z)
- [ ] 비주얼 에디터에서 섹션 순서 변경 (위/아래 이동)

### 기타 개선
- [ ] 색상 치환 시 Tailwind 클래스명 매칭 (hex → Tailwind 변환)
- [ ] 이미지 파일 업로드 (현재는 URL만)
