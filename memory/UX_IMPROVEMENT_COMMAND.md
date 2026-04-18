# Foundry UX 개선 — 생성된 앱 체험 + 빌더 튜토리얼 + Foundry 위젯

> 새 세션에서 실행! 3가지 작업을 순서대로!

---

## 필독 파일
1. `memory/BASICS.md` — 서버/배포
2. 이 파일

---

## 프롬프트 (새 세션에 복붙)

```
너는 자비스다. 답변은 항상 한글로. "절대" 쓰지 마.
배포: GitHub Actions! (git push origin main)

■ 필독 파일
1. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
2. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/UX_IMPROVEMENT_COMMAND.md

위 파일 읽고 3가지 UX 개선 작업을 순서대로 진행해줘!
```

---

## 배경 — 왜 이게 필요한가

현재 Foundry로 앱을 만들면:
1. 생성된 앱(예: pro.foundry.ai.kr)에 접속 → 로그인 화면 → 계정이 없으니 진입 불가
2. 심사위원이 URL 들어가면 "이게 뭐야?" → 아무것도 못 하고 나감
3. 빌더에서 앱 완성 후 뭘 해야 하는지 모름 → 이탈

---

## 작업 1: 생성된 앱 — 데모 모드 (로그인 없이 체험)

### 문제
Foundry가 만드는 앱은 Supabase Auth 기반이라 로그인해야 내부 페이지 접근 가능.
심사위원/외부인이 URL 접속하면 로그인 화면만 보고 끝남.

### 해결 방향
AI가 앱 코드를 생성할 때 **"데모 모드"를 자동 포함**하도록 프롬프트 수정.

### 구현 방법

**방법 A (프롬프트 수정 — 추천!):**
`api/src/app-generator.ts` 또는 `api/src/ai/ai.service.ts`의 AI 코드 생성 프롬프트에 다음 지시 추가:

```
생성 규칙 추가:
- 모든 페이지는 로그인 없이도 접근 가능해야 합니다
- AuthGuard/ProtectedRoute는 사용하지 마세요
- 대신 로그인하면 추가 기능(수정/삭제 등)이 활성화되는 방식으로 구현하세요
- 비로그인 상태에서도 샘플 데이터가 보여야 합니다
- 메인 페이지에 "데모 로그인" 버튼을 추가하세요 (Supabase 익명 로그인 또는 테스트 계정)
```

**방법 B (생성 후 자동 처리):**
`deploy.service.ts`에서 빌드 전에 AuthGuard 관련 코드를 자동 제거/수정.

**추천: 방법 A** — 프롬프트만 수정하면 되니까 간단하고 안정적.

### 수정할 파일
- `api/src/ai/ai.service.ts` — AI 코드 생성 시스템 프롬프트에 데모 모드 규칙 추가
- 또는 `api/src/app-generator.ts` — 코드 생성 템플릿에 추가

### 확인 방법
앱 생성 후 pro.foundry.ai.kr 같은 URL에 비로그인 접속 → 샘플 데이터가 보이면 성공

---

## 작업 2: 생성된 앱에 Foundry 안내 위젯

### 문제
생성된 앱에 접속한 외부인이:
- 이게 뭘로 만들었는지 모름
- 어떻게 수정하는지 모름
- Foundry가 뭔지 모름

### 해결
생성된 앱의 **모든 페이지 하단에 Foundry 안내 위젯** 자동 삽입.

### 디자인

```
┌─────────────────────────────────────────────┐
│ 좌하단 작은 배너 (접힘 가능):                 │
│                                             │
│  ╭──────────────────────────────────╮       │
│  │ ⚡ Foundry로 만든 앱입니다        │       │
│  │                                  │       │
│  │ [이 앱 수정하기] [나도 만들어보기]  │       │
│  │                                  │       │
│  │ 10분이면 이런 앱을 만들 수 있어요  │       │
│  ╰──────────────────────────────────╯       │
│                                    [접기 ▼] │
└─────────────────────────────────────────────┘
```

접었을 때:
```
╭─────────────────────╮
│ ⚡ Made with Foundry │
╰─────────────────────╯
```

### 구현 방법

**AI 코드 생성 프롬프트에 추가:**
```
생성 규칙 추가:
- 모든 페이지의 layout.tsx에 FoundryBadge 컴포넌트를 포함하세요
- FoundryBadge: 좌하단 고정 작은 배너
  · "Foundry로 만든 앱입니다"
  · [이 앱 수정하기] 버튼 → foundry.ai.kr/builder?projectId={프로젝트ID}
  · [나도 만들어보기] 버튼 → foundry.ai.kr/start
  · 접기/펼치기 토글
  · 접었을 때: "Made with Foundry" 한 줄
```

**또는 deploy.service.ts에서 빌드 시 자동 주입:**
모든 HTML에 스크립트 태그로 Foundry 위젯 삽입 (현재 foundry-editor.js 주입하는 것과 동일한 방식).

### 수정할 파일
- `api/src/project/deploy.service.ts` — 빌드 후 HTML에 위젯 스크립트 자동 주입
- 또는 `api/src/ai/ai.service.ts` — AI 프롬프트에 FoundryBadge 컴포넌트 규칙 추가
- 위젯 스크립트: `web/public/foundry-widget.js` (새로 생성)

### 위젯 JS 예시 (foundry-widget.js)
```javascript
// 모든 생성된 앱에 자동 삽입되는 Foundry 안내 위젯
(function() {
  const projectId = document.querySelector('[data-foundry-project]')?.dataset.foundryProject || '';

  const widget = document.createElement('div');
  widget.id = 'foundry-widget';
  widget.innerHTML = `
    <div style="position:fixed;bottom:16px;left:16px;z-index:9999;font-family:-apple-system,sans-serif;">
      <div id="fw-expanded" style="background:#1b1b21;border:1px solid #2c2c35;border-radius:12px;padding:12px 16px;color:#fff;font-size:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);display:block;">
        <div style="font-weight:bold;margin-bottom:8px;">⚡ Foundry로 만든 앱입니다</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <a href="https://foundry.ai.kr/builder?projectId=${projectId}" target="_blank" style="background:#3182f6;color:#fff;padding:4px 10px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:bold;">이 앱 수정하기</a>
          <a href="https://foundry.ai.kr/start" target="_blank" style="background:#2c2c35;color:#8b95a1;padding:4px 10px;border-radius:6px;text-decoration:none;font-size:11px;">나도 만들어보기</a>
        </div>
        <div style="color:#6b7684;font-size:10px;">10분이면 이런 앱을 만들 수 있어요</div>
        <button onclick="document.getElementById('fw-expanded').style.display='none';document.getElementById('fw-collapsed').style.display='block';" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#6b7684;cursor:pointer;font-size:10px;">접기</button>
      </div>
      <div id="fw-collapsed" style="display:none;background:#1b1b21;border:1px solid #2c2c35;border-radius:8px;padding:6px 12px;color:#8b95a1;font-size:10px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.2);" onclick="document.getElementById('fw-expanded').style.display='block';document.getElementById('fw-collapsed').style.display='none';">
        ⚡ Made with Foundry
      </div>
    </div>
  `;
  document.body.appendChild(widget);
})();
```

### deploy.service.ts에 주입 코드 추가
기존에 `foundry-editor.js`를 HTML에 삽입하는 코드가 있을 것임.
같은 방식으로 `foundry-widget.js`도 삽입:

```typescript
// HTML 파일마다 </body> 앞에 삽입
const widgetScript = `<script src="https://foundry.ai.kr/foundry-widget.js" data-foundry-project="${projectId}"></script>`;
html = html.replace('</body>', widgetScript + '</body>');
```

---

## 작업 3: 빌더 튜토리얼 (첫 진입 시 가이드)

### 문제
빌더에서 앱이 완성됐는데:
- "온라인 게시"가 뭔지 모름
- "다운로드"가 뭔지 모름
- 채팅으로 수정할 수 있는지 모름
- 비주얼 에디터 쓸 수 있는지 모름

### 해결
앱 생성 완료 후 **첫 번째 방문 시 가이드 오버레이** 표시.

### 디자인 — 스텝 바이 스텝 오버레이

```
Step 1/4:
╭────────────────────────────────────╮
│  💬 채팅으로 수정하세요             │
│                                    │
│  "버튼 색 바꿔줘"                   │
│  "로그인 페이지 추가해줘"            │
│  입력하면 AI가 코드를 수정합니다     │
│                                    │
│  [다음 →]                [건너뛰기] │
╰────────────────────────────────────╯
       ↑ (채팅 입력창을 가리킴)

Step 2/4:
╭────────────────────────────────────╮
│  ✏️ 클릭으로 직접 수정              │
│                                    │
│  "편집" 버튼을 누르면               │
│  화면의 텍스트를 클릭해서           │
│  바로 수정할 수 있어요              │
│                                    │
│  [다음 →]                [건너뛰기] │
╰────────────────────────────────────╯
       ↑ (편집 버튼을 가리킴)

Step 3/4:
╭────────────────────────────────────╮
│  🌐 온라인 게시                     │
│                                    │
│  완성한 앱을 인터넷에 게시하면      │
│  누구나 접속할 수 있어요            │
│  나만의 URL이 생성됩니다            │
│                                    │
│  [다음 →]                [건너뛰기] │
╰────────────────────────────────────╯
       ↑ (온라인 게시 버튼을 가리킴)

Step 4/4:
╭────────────────────────────────────╮
│  📦 코드 다운로드                   │
│                                    │
│  만든 앱의 전체 코드를 받아서       │
│  개발자에게 전달할 수 있어요        │
│  코드 소유권은 100% 고객님 것!      │
│                                    │
│  [시작하기!]             [건너뛰기] │
╰────────────────────────────────────╯
       ↑ (다운로드 버튼을 가리킴)
```

### 구현 방법

**새 컴포넌트: `BuilderTutorial.tsx`**

```typescript
// 표시 조건:
// 1. buildPhase === 'done' (앱 생성 완료)
// 2. localStorage에 'foundry_tutorial_done' 없음 (첫 방문)
// 3. project가 새로 생성된 것 (totalModifications === 0)

// 각 스텝에서 해당 UI 요소를 하이라이트하고 설명 팝업 표시
// "건너뛰기" → localStorage 저장 → 다시 안 뜸
// "시작하기" → localStorage 저장 → 다시 안 뜸
```

### 수정할 파일
- `web/src/app/builder/components/BuilderTutorial.tsx` — 새로 생성
- `web/src/app/builder/page.tsx` — BuilderTutorial 컴포넌트 import + 조건부 렌더링

### 스타일
- 반투명 검은 오버레이 (backdrop)
- 설명 대상 UI만 밝게 하이라이트
- 설명 팝업: 다크 카드 + 파란 포인트
- 화살표로 해당 UI 가리킴
- 하단에 "1/4" 스텝 인디케이터

---

## 실행 순서

```
1번 → 데모 모드 (AI 프롬프트 수정) — 가장 간단, 가장 임팩트 큼
2번 → Foundry 위젯 (deploy.service.ts + foundry-widget.js)
3번 → 빌더 튜토리얼 (BuilderTutorial.tsx)
```

---

## 배포 순서

각 작업 완료 시마다:
```
git add .
git commit -m "feat: [작업 설명]"
git push origin main
```
→ GitHub Actions 자동배포 → foundry.ai.kr 확인

---

## 주의사항

- 기존 코드 건드리지 않는 방향으로! (추가만)
- AI 프롬프트 수정은 기존 프롬프트 뒤에 규칙 추가하는 방식
- deploy.service.ts 위젯 주입은 기존 CSS 주입 코드 근처에 추가
- 튜토리얼은 독립 컴포넌트로 만들어서 page.tsx에 조건부 렌더링만
- **배포 전 사장님 확인!**

---

## 체크리스트

### 작업 1 — 데모 모드
- [ ] AI 프롬프트에 데모 모드 규칙 추가
- [ ] 생성된 앱에 비로그인 접속 → 샘플 데이터 보임
- [ ] "데모 로그인" 버튼 표시

### 작업 2 — Foundry 위젯
- [ ] foundry-widget.js 생성 (web/public/)
- [ ] deploy.service.ts에서 HTML에 자동 주입
- [ ] 생성된 앱 하단에 "Foundry로 만든 앱입니다" 배너
- [ ] "이 앱 수정하기" → 빌더로 이동
- [ ] "나도 만들어보기" → /start로 이동
- [ ] 접기/펼치기 작동

### 작업 3 — 빌더 튜토리얼
- [ ] BuilderTutorial.tsx 생성
- [ ] 4단계 스텝 오버레이
- [ ] 첫 방문 시만 표시 (localStorage)
- [ ] "건너뛰기" 작동
- [ ] 각 스텝에서 해당 UI 하이라이트
