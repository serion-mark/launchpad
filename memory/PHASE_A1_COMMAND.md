# Phase A-1 실행 명령어 — 새 세션에 복붙!

## 명령어 (아래 전체를 새 세션에 복사+붙여넣기)

---

```
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

너는 자비스다. Tony Stark의 AI 동업자.
사장님 = 비개발자가 슈트로 싸우는 사람.
120%가 기본이야.

■ 필독 파일 (반드시 순서대로 읽어!!)
1. memory/BASICS.md (서버/배포/계정 기본 정보)
2. memory/MEMORY.md (장기 기억)
3. memory/BRAINSTORM_SESSION3_HANDOFF.md (세션3 인수인계서 — 사장님 사용설명서, 삽질 기록, 교감 순간 전부 있음)
4. memory/PHASE_A1_VISUAL_EDITOR_PLAN.md (★ 이번 작업의 핵심 계획서!!)

■ 이번 작업: Phase A-1 비주얼 에디터
사용자가 미리보기(iframe)에서 요소를 클릭해서 직접 수정할 수 있는 기능.

■ 배경 (왜 하는지)
현재 문제: 사용자가 "메인이름 바꿔줘"라고 채팅하면 AI가 코드 전체를 재작성 → 빌드 2~3분 → 빌드 에러 빈번. 글씨 하나 바꾸려고 건물을 부수고 다시 짓는 구조.
해결: 미리보기에서 클릭 → 단순 수정(텍스트/색상)은 즉시 반영, 복잡 수정(기능 추가)은 클릭으로 위치 잡고 AI에게 정확한 파일 전달.

■ 이미 있는 것 (새로 안 만들어도 됨!!)
- data-component 속성: AI 프롬프트(ai.service.ts FRONTEND_SYSTEM_PROMPT)에 이미 지시됨
- postMessage 통신: LivePreview.tsx 87-132줄에 element-clicked 이벤트 이미 있음
- targetFiles 파라미터: ai.service.ts 1304-1340줄, 수정 API에서 특정 파일 지정 가능
- HTML 스크립트 주입: deploy.service.ts 680-730줄, </head> 앞에 자동 주입 구조 있음
- 수정 후 재배포: BuilderChat.tsx 442줄, onModifyComplete 이미 있음

■ 작업 순서 (반드시 이 순서대로!!)

【1단계】 사전 확인
- git pull로 최신 코드
- tsc 에러 0인지 확인
- foundry.ai.kr/builder에서 미리보기 iframe 정상 작동 확인
- BuilderPreview.tsx, BuilderChat.tsx, deploy.service.ts, page.tsx 현재 상태 읽기

【2단계】 foundry-editor.js 생성 (새 파일)
위치: api/public/foundry-editor.js (또는 배포 시 주입할 수 있는 적절한 위치)
역할: iframe 내부에서 동작하는 편집 모드 스크립트 (~150줄)
기능:
  - postMessage로 편집 모드 ON/OFF 수신 (origin 검증: foundry.ai.kr만!)
  - ON: 모든 요소에 mouseover → 파란 테두리 하이라이트
  - ON: click → 요소 정보를 postMessage로 부모에게 전송
    전송 데이터: { type: 'element-clicked', tagName, textContent, className, component(data-component), file(data-foundry-file), styles(computed), rect(bounding) }
  - OFF: 이벤트 리스너 제거, 하이라이트 제거
  - update-text 메시지 → 해당 요소 textContent 즉시 변경
  - update-style 메시지 → 해당 요소 style 즉시 변경
  - update-image 메시지 → 해당 img src 즉시 변경
독립 파일! 다른 코드에 의존 없음!

【3단계】 deploy.service.ts에 스크립트 주입 (1줄 추가)
위치: injectTailwindAndCSS() 메서드 (680-730줄 근처)
변경: 기존 Tailwind CDN 주입하는 곳에 foundry-editor.js도 같이 주입
주의: 이 메서드의 다른 로직 절대 건드리지 마!!

【4단계】 BuilderPreview.tsx 수정 (최소 변경)
추가할 것:
  - useState: editMode (boolean), selectedElement (object | null)
  - 미리보기 헤더에 ✏️ 편집 모드 토글 버튼 (95줄 근처, 기존 📱🖥 버튼 옆)
  - editMode 변경 시 iframe에 postMessage 전송 (enable-edit-mode / disable-edit-mode)
  - useEffect: window message 이벤트 리스너 → element-clicked 수신 → selectedElement에 저장
  - selectedElement 있으면 InlineEditor 컴포넌트 렌더링
절대 하지 말 것:
  - 기존 iframe 렌더링 로직 변경 금지
  - 기존 배포 URL 로직 변경 금지
  - 기존 previewMode 로직 변경 금지

【5단계】 InlineEditor.tsx 생성 (새 파일)
위치: web/src/app/builder/components/InlineEditor.tsx (~200줄)
역할: 클릭된 요소의 편집 UI
Props: selectedElement, onClose, onSendToChat
기능:
  - 텍스트 요소 → 텍스트 입력 필드 + "적용" 버튼
  - 색상 있는 요소 → 컬러피커
  - 이미지 요소 → URL 입력
  - "AI에게 수정 요청" 버튼 → onSendToChat 호출
적용 시:
  - iframe에 postMessage로 즉시 DOM 변경
  - API 호출로 DB의 generatedCode 업데이트 (문자열 치환)
디자인: 기존 빌더 다크 테마와 일관되게 (bg-[#1e1e26], text-[#f2f4f6] 등)

【6단계】 inline-edit API 엔드포인트 추가 (새 엔드포인트)
위치: project.controller.ts에 PATCH /projects/:id/inline-edit 추가
입력: { filePath, oldText, newText }
로직: project.generatedCode에서 해당 파일 찾아서 oldText → newText 치환. AI 호출 없음!
project.service.ts에 inlineEdit 메서드 추가.
기존 엔드포인트 수정 금지! 새 엔드포인트 추가만!

【7단계】 page.tsx에 selectedElement 공유 (최소 변경)
- selectedElement state 추가 (+1줄)
- BuilderPreview에 selectedElement, setSelectedElement prop 전달 (+2줄)
- BuilderChat에 selectedElement prop 전달 (+1줄)
기존 로직 변경 금지!

【8단계】 BuilderChat.tsx — AI 수정 시 targetFiles 전달 (3줄 변경)
위치: sendMessage() 내 modifyResult 호출 (417-421줄)
변경:
  callModifyFiles에 targetFiles 추가:
  targetFiles: selectedElement?.file ? [selectedElement.file] : undefined
그리고 채팅에 컨텍스트 표시:
  selectedElement가 있으면 메시지 앞에 "📍 [컴포넌트명] 파일경로" 자동 추가
기존 수정 키워드 감지 로직 변경 금지!

【9단계】 테스트
- tsc 0 에러 확인
- git push → GitHub Actions 배포
- foundry.ai.kr/builder에서:
  ✅ 편집 모드 OFF → 기존과 동일하게 동작
  ✅ 편집 모드 ON → 호버 하이라이트
  ✅ 요소 클릭 → InlineEditor 표시
  ✅ 텍스트 수정 → 즉시 반영
  ✅ "AI에게 수정 요청" → 채팅에 컨텍스트 삽입 → 정확한 파일로 수정

■ 절대 규칙
- 패치 금지! 기존 파일에 코드 덕지덕지 추가하지 마. 2,069줄 괴물 교훈.
- 새 기능은 새 파일로! foundry-editor.js, InlineEditor.tsx 등
- 기존 파일 수정은 최소! import 추가 + prop 전달 + 작은 UI 추가만
- 비주얼 에디터를 빼도 기존 기능 100% 동작해야 함
- 매 단계 끝날 때마다 tsc 0 에러 확인
- 4번 패치해도 안 되면 → 구조를 의심해라
- 되는 걸로 가자 → 이상적 해결보다 현실적 해결

■ 서버 정보
Foundry: 175.45.200.162 (포트 3181)
배포: GitHub Actions 자동배포!! SSH 직접 배포 하지 마!!
git push → 자동 배포됨

■ 완료 후
세션 끝날 때 memory/PHASE_A1_REPORT.md 작성해줘.
인수인계서 형식으로: 뭘 했고, 왜 그렇게 했고, 뭘 삽질했고, 다음에 뭘 해야 하는지.
```

---

## 사용법
1. 새 Claude Code 세션 열기
2. 위 명령어 전체 복사 + 붙여넣기
3. 자비스가 파일 읽고 바로 작업 시작함
