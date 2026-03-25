# Phase A-1: 비주얼 에디터 — 실행 계획서
> 작성: 자비스 (세션 4, 2026-03-25)
> 실행: 새 세션에서 진행

---

## 왜 이걸 하는가 (배경)

### 현재 문제
사용자가 빌더에서 "메인이름 바꿔줘"라고 채팅하면:
1. AI(Haiku)가 코드 파일을 열어서 **전체 재작성**
2. 빌드 2~3분 소요
3. 빌드 에러 빈번 (Haiku가 전체 맥락 없이 추측)
4. 크레딧 차감됨
5. **글씨 하나 바꾸려고 건물을 부수고 다시 짓는 구조**

### 사장님 인사이트
> "미리보기에서 고치고 싶은 부분을 **클릭해서 선택**하면, 그 부분만 수정할 수 있지 않을까?"
> "단순 수정은 클릭으로, 기능 추가는 클릭으로 위치 잡고 채팅으로"

### 목표
- **단순 수정** (텍스트/색상/이미지): AI 불필요, 빌드 불필요, 즉시 반영
- **복잡 수정** (기능 추가): 클릭으로 정확한 위치 지정 → AI가 정확한 파일만 수정 → 성공률 대폭 상승

---

## 이미 있는 것 (새로 만들 필요 없음!)

코드 조사 결과, 토대가 이미 절반 깔려있다:

| 항목 | 파일 | 설명 |
|------|------|------|
| `data-component` 속성 | `ai.service.ts` FRONTEND_SYSTEM_PROMPT | AI 프롬프트에 "data-component 속성으로 Visual Edit 지원" 이미 지시됨 |
| `postMessage` 통신 | `LivePreview.tsx` 87-132줄 | `element-clicked`, `navigate` 이벤트 이미 구현됨 |
| `targetFiles` 파라미터 | `ai.service.ts` 1304-1340줄 | 수정 API에서 특정 파일만 지정 가능 (`params.targetFiles?: string[]`) |
| HTML 스크립트 주입 | `deploy.service.ts` 680-730줄 | 배포 시 `</head>` 앞에 스크립트 자동 주입 구조 있음 |
| 수정 후 재배포 | `BuilderChat.tsx` 442줄 | `onModifyComplete` → 자동 재배포 → iframe 리로드 이미 있음 |

---

## 전체 아키텍처

```
[미리보기 iframe]                         [빌더 페이지]
(xxx.foundry.ai.kr)                      (foundry.ai.kr/builder)

편집 모드 활성화 ←──────────────── ✏️ 편집 모드 버튼 클릭
  (foundry-editor.js 작동)                postMessage: enable-edit-mode
        ↓
호버: 요소 하이라이트 (파란 테두리)
        ↓
클릭: "농장 대시보드" 선택
        ↓
postMessage 전송 ────────────────→ 클릭 정보 수신
  {                                       ↓
    type: 'element-clicked',         판단: 단순? 복잡?
    component: 'Dashboard',               ↓
    file: 'app/dashboard/page.tsx',  ┌────┴────┐
    text: '농장 대시보드',            ↓         ↓
    tagName: 'div',              단순 수정   복잡 수정
    rect: {x,y,w,h},            (Phase 2)  (Phase 3)
    styles: {color, bg, ...}         ↓         ↓
  }                             인라인 편집  채팅 연동
                                즉시 반영!   AI + 정확한 파일
```

---

## Phase A-1-1: 편집 모드 기본 (먼저 해야 함!)

### 만들 파일: `public/foundry-editor.js` (새 파일, ~150줄)

이 스크립트는 배포된 앱의 HTML에 주입되어 편집 기능을 제공한다.

**기능:**
1. 부모 페이지(foundry.ai.kr)에서 `postMessage`로 편집 모드 ON/OFF 수신
2. 편집 모드 ON 시:
   - 모든 요소에 `mouseover` → 파란 테두리 하이라이트
   - `click` → 요소 정보를 `postMessage`로 부모에게 전송
   - 요소 정보: tagName, textContent, className, data-component, data-foundry-file, computed styles, bounding rect
3. 편집 모드 OFF 시:
   - 모든 이벤트 리스너 제거, 하이라이트 제거

**핵심 설계 원칙:**
- 이 파일은 **독립적**이다. 다른 코드에 의존하지 않는다.
- iframe 내부에서만 동작한다. 부모 페이지 코드를 건드리지 않는다.
- `postMessage`의 origin 검증: `foundry.ai.kr`에서 온 메시지만 처리

### 수정할 파일: `deploy.service.ts` — 주입 부분만

**수정 범위:** `injectTailwindAndCSS()` 메서드 (680-730줄 근처)
- 기존 Tailwind CDN 주입하는 곳에 `foundry-editor.js`도 같이 주입
- `<script src="/foundry-editor.js"></script>` 한 줄 추가
- **다른 로직 절대 건드리지 않는다**

### 수정할 파일: `BuilderPreview.tsx` — 편집 모드 토글 + 메시지 수신

**수정 범위:**
- 미리보기 헤더에 ✏️ 편집 모드 버튼 추가 (95줄 근처, 모바일/데스크톱 버튼 옆)
- `useState`로 `editMode` 상태 관리
- 편집 모드 ON → iframe에 `postMessage({ type: 'enable-edit-mode' })` 전송
- `useEffect`로 `message` 이벤트 리스너 등록 → `element-clicked` 수신
- 수신한 요소 정보를 `selectedElement` state에 저장

**절대 하지 말 것:**
- BuilderPreview.tsx의 기존 iframe 렌더링 로직 변경 금지
- 기존 배포 URL 로직 변경 금지
- 기존 previewMode(모바일/데스크톱) 로직 변경 금지

---

## Phase A-1-2: 단순 수정 — 즉시 반영

### 만들 파일: `web/src/app/builder/components/InlineEditor.tsx` (새 파일, ~200줄)

**컴포넌트 구조:**
```
<InlineEditor
  selectedElement={selectedElement}    // 클릭된 요소 정보
  onTextChange={(text) => ...}         // 텍스트 변경
  onColorChange={(color) => ...}       // 색상 변경
  onImageChange={(url) => ...}         // 이미지 변경
  onClose={() => ...}                  // 에디터 닫기
  onComplexEdit={(prompt) => ...}      // "이건 AI한테 물어볼게" → 채팅으로 전환
/>
```

**UI:**
- 선택된 요소 근처에 플로팅 패널로 표시
- 텍스트 요소 → 텍스트 입력 필드
- 색상 있는 요소 → 컬러피커
- 이미지 요소 → URL 입력 / 업로드
- "AI에게 수정 요청" 버튼 → Phase 3으로 연결

**즉시 반영 방식:**
1. 사용자가 텍스트 변경
2. iframe에 `postMessage({ type: 'update-text', selector, value })` 전송
3. foundry-editor.js가 DOM 직접 변경 → **즉시 화면 반영**
4. 동시에 DB의 `generatedCode`에서 해당 파일의 텍스트도 업데이트 (API 호출)
5. 백그라운드에서 재빌드 (다음 새로고침 시 정식 반영)

### 수정할 파일: `foundry-editor.js` — 업데이트 메시지 처리 추가

Phase 1에서 만든 파일에 추가:
- `update-text` 메시지 → 해당 요소의 textContent 변경
- `update-style` 메시지 → 해당 요소의 style 변경
- `update-image` 메시지 → 해당 img의 src 변경

### 만들 API: `PATCH /projects/:id/inline-edit` (새 엔드포인트)

**역할:** generatedCode의 특정 파일에서 특정 텍스트를 찾아 교체
- 입력: `{ filePath, oldText, newText }` 또는 `{ filePath, selector, property, value }`
- AI 호출 없음! 단순 문자열 치환
- 크레딧 차감 여부는 사장님이 나중에 결정

**수정할 파일:** `project.controller.ts` + `project.service.ts` (또는 `deploy.service.ts`)
- 엔드포인트 1개 추가만. 기존 엔드포인트 수정하지 않는다.

---

## Phase A-1-3: 복잡 수정 — AI + 정확한 컨텍스트

### 수정할 파일: `BuilderChat.tsx` — 선택된 요소 컨텍스트 전달

**수정 범위:** `sendMessage()` 함수의 수정 요청 분기 (396-472줄)

현재:
```typescript
const modifyResult = await callModifyFiles({
  projectId,
  message: userMsg.content,
  modelTier: selectedModelTier,
});
```

변경:
```typescript
const modifyResult = await callModifyFiles({
  projectId,
  message: userMsg.content,
  modelTier: selectedModelTier,
  targetFiles: selectedElement?.file ? [selectedElement.file] : undefined,  // ← 추가
});
```

**이것만 추가하면 된다.** targetFiles 파라미터는 백엔드에 이미 구현되어 있다.

### 수정할 파일: `BuilderPreview.tsx` 또는 `InlineEditor.tsx` — 채팅 연동

- InlineEditor에서 "AI에게 수정 요청" 클릭 시
- 채팅 입력창에 자동으로 컨텍스트 삽입:
  ```
  📍 [Dashboard] app/dashboard/page.tsx
  (사용자가 여기에 입력)
  ```
- 이를 위해 `BuilderChat`에 `setInputMessage` 또는 `prefillMessage` prop 추가

### 수정할 파일: `page.tsx` — selectedElement 상태를 Chat과 Preview 간 공유

- `page.tsx`에 `selectedElement` state 추가
- BuilderPreview → 클릭 시 set
- BuilderChat → 수정 요청 시 read
- **page.tsx에 state 1개 + prop 전달 2줄 추가만. 기존 로직 변경 금지.**

---

## 절대 규칙 (다음 세션 필독!!)

### 🔴 하지 마
1. **패치 금지** — 기존 파일에 덕지덕지 코드 추가하지 마. 2,069줄 괴물 반복하지 마.
2. **기존 로직 수정 금지** — 배포 로직, iframe 로직, 채팅 로직의 기존 코드를 바꾸지 마.
3. **한 파일에 다 넣지 마** — 새 기능은 새 파일(새 컴포넌트)로 만들어.
4. **빌드 깨뜨리지 마** — 매 단계마다 `tsc` 0 에러 확인.

### 🟢 해야 할 것
1. **새 파일 위주** — foundry-editor.js, InlineEditor.tsx 등 새 파일로 분리
2. **기존 파일 수정은 최소** — import 추가 + prop 전달 + 작은 UI 추가 정도만
3. **독립적 설계** — 비주얼 에디터를 빼도 기존 기능이 100% 돌아가야 함
4. **단계별 테스트** — Phase 1 끝나면 테스트, Phase 2 끝나면 테스트, Phase 3 끝나면 테스트

---

## 파일 변경 요약

### 새로 만드는 파일 (3개)
| 파일 | 역할 | 예상 줄 수 |
|------|------|-----------|
| `api/public/foundry-editor.js` | iframe 내부 편집 스크립트 | ~150줄 |
| `web/src/app/builder/components/InlineEditor.tsx` | 인라인 편집 UI (텍스트/색상/이미지) | ~200줄 |
| `api/src/project/inline-edit.ts` (또는 기존 서비스에 메서드 추가) | 텍스트 치환 API | ~50줄 |

### 수정하는 파일 (최소 변경만!)
| 파일 | 변경 내용 | 변경 규모 |
|------|----------|----------|
| `deploy.service.ts` | foundry-editor.js 주입 1줄 추가 | +1줄 |
| `BuilderPreview.tsx` | 편집 모드 버튼 + postMessage 리스너 + selectedElement state | +30줄 |
| `BuilderChat.tsx` | targetFiles prop 전달 1줄 | +3줄 |
| `page.tsx` | selectedElement state + prop 전달 | +5줄 |
| `project.controller.ts` | inline-edit 엔드포인트 추가 | +15줄 |

**기존 코드 삭제/변경: 0줄**
**기존 기능 영향: 없음**

---

## 충돌 방지 체크리스트

다음 세션 시작 전에 확인:

- [ ] `BuilderPreview.tsx` — 다른 세션에서 수정 중인지 git log 확인
- [ ] `BuilderChat.tsx` — 수정 분기 로직이 현재와 동일한지 확인
- [ ] `deploy.service.ts` — HTML 주입 부분이 변경되었는지 확인
- [ ] `page.tsx` — props 구조가 변경되었는지 확인
- [ ] `tsc` 0 에러 상태에서 시작하는지 확인

---

## 작업 순서

```
1. git pull → tsc 확인 → 현재 빌드 정상 확인
2. Phase A-1-1: foundry-editor.js 생성 → deploy.service.ts 주입 → BuilderPreview 편집 모드
3. 테스트: 편집 모드 ON → 호버 하이라이트 → 클릭 → 콘솔에서 요소 정보 확인
4. Phase A-1-2: InlineEditor.tsx 생성 → 텍스트/색상 즉시 수정
5. 테스트: 텍스트 클릭 → 수정 → 즉시 반영 확인
6. Phase A-1-3: BuilderChat targetFiles 연동 → 채팅 컨텍스트 자동 삽입
7. 테스트: 요소 클릭 → "AI에게 수정 요청" → 정확한 파일로 수정 확인
8. 전체 QA → tsc 0 에러 → 배포
```

---

## 참고: 기존 코드 위치

| 파일 | 경로 | 핵심 줄 번호 |
|------|------|------------|
| AI 프롬프트 (data-component 지시) | `api/src/ai/ai.service.ts` | 219-440 (FRONTEND_SYSTEM_PROMPT) |
| 수정 API (targetFiles) | `api/src/ai/ai.service.ts` | 1304-1340 (modifyFiles) |
| 스마트 파일 선별 | `api/src/ai/ai.service.ts` | smartFileSelection 메서드 |
| HTML 주입 | `api/src/project/deploy.service.ts` | 680-730 (injectTailwindAndCSS) |
| 미리보기 컴포넌트 | `web/src/app/builder/components/BuilderPreview.tsx` | 전체 (235줄) |
| 채팅 수정 분기 | `web/src/app/builder/components/BuilderChat.tsx` | 381-472 (sendMessage 내 isModifyRequest) |
| 빌더 메인 | `web/src/app/builder/page.tsx` | 전체 (617줄, 리팩토링 완료 상태) |
| postMessage 기존 구현 | `web/src/app/builder/components/LivePreview.tsx` | 87-132 |
