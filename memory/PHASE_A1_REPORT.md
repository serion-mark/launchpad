# Phase A-1 비주얼 에디터 — 완료 보고서
> 작성: 자비스 (세션 5, 2026-03-25)
> 커밋: a002f6a

---

## 뭘 했는가

미리보기 iframe에서 요소를 **클릭해서 직접 수정**할 수 있는 비주얼 에디터 기능을 구현했다.

### 새로 만든 파일 (3개)
| 파일 | 역할 | 줄 수 |
|------|------|-------|
| `api/public/foundry-editor.js` | iframe 내부 편집 스크립트 (독립) | ~180줄 |
| `web/src/app/builder/components/InlineEditor.tsx` | 인라인 편집 UI (텍스트/색상/이미지) | ~200줄 |
| `memory/PHASE_A1_VISUAL_EDITOR_PLAN.md` | 계획서 (세션 4에서 작성) | - |

### 수정한 파일 (6개, 최소 변경)
| 파일 | 변경 내용 | 줄 수 |
|------|----------|-------|
| `deploy.service.ts` | foundry-editor.js 주입 + 파일 복사 | +8줄 |
| `BuilderPreview.tsx` | 편집 모드 버튼 + postMessage 리스너 + SelectedElement type export | +80줄 |
| `BuilderChat.tsx` | selectedElement prop + targetFiles 전달 | +8줄 |
| `page.tsx` | selectedElement state + prop 전달 | +6줄 |
| `project.controller.ts` | PATCH /projects/:id/inline-edit 엔드포인트 | +10줄 |
| `project.service.ts` | inlineEdit 메서드 (텍스트 치환) | +31줄 |

### 기존 코드 삭제/변경: 0줄
### 기존 기능 영향: 없음

---

## 왜 그렇게 했는가

### 설계 원칙: "독립적 레이어"
- foundry-editor.js는 **완전 독립 스크립트**. 다른 코드 의존 없음.
- editMode가 OFF면 foundry-editor.js는 아무것도 안 함 → 기존 미리보기 100% 동일.
- InlineEditor.tsx는 새 파일로 분리 → BuilderPreview.tsx 비대화 방지.
- inline-edit API는 새 엔드포인트 → 기존 modify API 건드리지 않음.

### postMessage 통신 흐름
```
[빌더 페이지]                          [미리보기 iframe]
                                      (foundry-editor.js)
✏️ 편집 모드 ON ──postMessage──→      enableEditMode()
                                         ↓
                                      호버: 파란 테두리
                                      클릭: 요소 정보 수집
                 ←──postMessage──      element-clicked
                      ↓
              InlineEditor 표시
              텍스트 수정 입력
                      ↓
               "적용" 클릭
                      ↓
         ──postMessage──→              update-text → DOM 즉시 변경
         ──API 호출──→                 PATCH /inline-edit → DB 저장
```

---

## 삽질한 것

### 없음!
계획서(PHASE_A1_VISUAL_EDITOR_PLAN.md)가 너무 잘 되어있어서 그대로 따라가니까 삽질 없이 끝남.
tsc 0 에러 유지하면서 깔끔하게 마무리.

---

## 확인 필요 사항 (배포 후)

### 반드시 확인할 것
1. foundry.ai.kr/builder에서 기존 프로젝트 열기
2. 미리보기에 `✏️ 편집` 버튼 보이는지 확인
3. 편집 모드 ON → 요소 호버 시 파란 테두리 나오는지
4. 요소 클릭 → InlineEditor 패널 나오는지
5. 텍스트 수정 → "적용" → iframe에서 즉시 반영되는지
6. 편집 모드 OFF → 기존과 동일하게 동작하는지

### 주의: foundry-editor.js 경로
- `__dirname` 기준으로 `../../public/foundry-editor.js` 접근
- 서버에서 빌드 후 `dist/project/deploy.service.js` → `api/public/foundry-editor.js`
- **만약 서버에서 public 폴더가 없으면**: `api/public/` 디렉토리도 git에 포함되므로 pull 시 생김

### 주의: origin 검증
- foundry-editor.js가 `foundry.ai.kr`과 `localhost:3000/3001`만 허용
- 다른 도메인에서 접근 시 편집 모드 안 됨 (보안)

---

## 다음에 할 것

### Phase A-1 개선 — 완료!! (세션 5, bc91f5f)
- [x] **색상 변경 DB 저장**: applyColor에서 rgbToHex 변환 후 inline-edit API 호출
- [x] **이미지 변경 DB 저장**: applyImage에서 기존 src → 새 src로 inline-edit API 호출
- [x] **재배포 트리거**: InlineEditor에 onModifyComplete prop 추가 → saveToDb 성공 시 자동 재배포
- [x] **data-foundry-file 속성**: FRONTEND_SYSTEM_PROMPT에 "최상위 요소에 data-foundry-file 추가" 지시
- [x] **채팅 컨텍스트 자동 삽입**: onSendToChat → page.tsx setInput → 채팅 입력창에 "📍 [컴포넌트] 파일경로" 자동 삽입

### Phase A-2 (다음 마일스톤)
- [ ] 드래그로 요소 이동
- [ ] 복수 요소 동시 선택
- [ ] 편집 히스토리 (Ctrl+Z)
- [ ] 색상 변경 시 디바운스 (매 onChange마다 API 호출 방지)

---

## 파일 위치 요약 (다음 세션 참고)
| 파일 | 경로 |
|------|------|
| iframe 편집 스크립트 | `api/public/foundry-editor.js` |
| 인라인 에디터 UI | `web/src/app/builder/components/InlineEditor.tsx` |
| SelectedElement 타입 | `web/src/app/builder/components/BuilderPreview.tsx` (export) |
| inline-edit API | `api/src/project/project.controller.ts` + `project.service.ts` |
| 스크립트 주입 | `api/src/project/deploy.service.ts` (690줄 근처) |
