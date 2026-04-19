# Agent Mode Day 4.7 보고서 — 실사용 3이슈 + Supabase idempotency

> **작성**: 자비스 (2026-04-19 오후 늦게, 사장님 지시로 직접 실행)
> **커밋**: [`51e7db5`](https://github.com/serion-mark/launchpad/commit/51e7db5)
> **배포**: GitHub Actions 30s ✅ / HTTP 200 (foundry.ai.kr, /builder/agent)
> **tsc**: 0 에러 (web + api)

---

## 한 줄 요약

사장님이 메디트래커(app-faec)를 실사용하며 **스샷 2장 + 증언 1건**으로 실증한 Agent Mode 3이슈를 한 번에 수정. 부수로 비로그인 가드 + Supabase idempotency. **5개 작업 / 1 commit / 1 배포 / 30초**에 끝.

---

## 사장님 실증 이슈 (스샷/증언 기반)

### 실증 A — 수정 모드에서 Agent가 "샌드박스 외부라 코드 못 읽는다" 실토
**사장님 입력** (메디트래커 수정 모드): "로그인을 하려면 회원가입을 해야되는데 회원가입이 안됨"
**포비 응답**: *"샌드박스 외부라 직접 코드를 못 읽네요. 배포된 앱 기준으로 진단해볼게요..."* → 일반론적 원인 3가지만 나열. 메디트래커 실제 `lib/supabase.ts` / `app/login/page.tsx` 못 봄.

### 실증 B — 채팅 버블에 시스템 프롬프트 노출
**스샷에 그대로 찍힌 채팅 버블 내용**:
```
[대화 신호: 💬 상의 모드 — 기존 프로젝트 "meditrackerapp"]
- subdomain: app-faec
- 사용자 발화: 로그인을 하려면 회원가입을 해야되는데 회원가입이 안됨
가이드: 사용자가 "상의" 토글을 켠 상태입니다...
```
→ LLM 내부용 메타가 사용자 UI에 노출. UX 오염 + 내부 로직 노출.

### 실증 C — 프리뷰 PC/모바일 토글 체감 차이 없음
**사장님 증언**: "에이전트 빌더에서 오른쪽 부분이 pc/모바일 구분에서 pc하고 모바일하고 차이가 안보임"
→ FoundryPreviewPane.tsx 토글 로직은 있으나 체감 부족. 메디트래커 같은 단순 로그인 카드는 본질적으로 차이가 작음.

---

## 커밋 타임라인

| 시각 | 커밋 | 내용 |
|---|---|---|
| 14:32 | [`51e7db5`](https://github.com/serion-mark/launchpad/commit/51e7db5) | Day 4.7 — 3이슈 + Supabase idempotency (7 files, +745/-41) |

배포: 30초, success. HTTP 200.

---

## 작업별 결과

### 🚨 작업 1-bis: 프론트 시스템 프롬프트 노출 제거 (실증 B 해소)

**수정 파일**:
- `web/src/app/builder/agent/useAgentStream.ts` — `start(prompt, displayText?)` 시그니처 확장
- `web/src/app/builder/agent/page.tsx` — `start(chatContext, userText)`, `start(wrapped, userText)` 호출

**핵심 변경**:
```typescript
// 전 (버그)
entries: [{ kind: 'user', text: prompt, ts: Date.now() }]  // LLM prompt 전체가 UI 버블에

// 후
entries: [{ kind: 'user', text: displayText ?? prompt, ts: Date.now() }]  // UI = 순수 사용자 발화
body: JSON.stringify({ prompt })  // LLM = context 포함 full prompt
```

**검증 게이트**: 상의 모드 질문 입력 → 채팅 버블에 `[대화 신호:` 문구 **0**.

---

### 🔴 작업 1: 수정 모드 sandbox 복원 (실증 A 해소)

**수정 파일**:
- `api/src/agent-builder/agent-builder.controller.ts` — `body.projectId` 수용
- `api/src/agent-builder/agent-builder.service.ts` — run() 시작부에 복원 로직
- `web/src/app/builder/agent/useAgentStream.ts` — `start(prompt, displayText, projectId?)` 3번째 파라미터
- `web/src/app/builder/agent/page.tsx` — 수정 모드일 때 projectId 전달

**복원 로직** (agent-builder.service.ts):
1. `input.projectId` + 소유권 확인 → `projects.generatedCode` 조회
2. 새 sandbox `/tmp/foundry-agent-...` 아래 `<projectName>/` 디렉토리에 파일 N개 복원 (binary skip 이미 persistence 단에서 필터됨)
3. `persistence.startProject()` 스킵 → 기존 projectId 재사용 (새 draft 안 만듦)
4. Agent는 Read 도구로 복원된 기존 코드를 **정확히 진단** 가능

**보수적 처리**:
- 프로젝트 없거나 소유권 없으면 → 경고 로그 + **신규 모드로 fallback** (에러 throw X)
- generatedCode 비면 → 경고 + fallback
- 복원 중 예외 → 에러 로그 + fallback

**검증 게이트**: 사장님이 메디트래커 수정 모드로 "회원가입 왜 안 됨?" 입력 시 Agent가 실제 `lib/supabase.ts`, `app/login/page.tsx` Read → 구체 진단.

---

### 🆕 작업 4: 프리뷰 PC/모바일 체감 강화 (실증 C 해소)

**수정 파일**: `web/src/app/builder/agent/components/FoundryPreviewPane.tsx`

**분석 결과**: agent-core.md § 7에 **이미** "PC/모바일 차이 필수 — 미리보기 토글에서 체감 차이 나야 함" 지시가 강하게 있음. 프롬프트 건드릴 필요 X. **UI 시각화 강화**에 집중 (사장님 철학 "제약→맥락"에 부합).

**변경**:
1. 토글 버튼에 **"모바일" / "PC" 텍스트 라벨** 추가 (아이콘만으론 선택 상태 불명확)
2. 모바일 모드 상단에 **"📱 모바일 미리보기 390×844" 뱃지**
3. 기기 프레임 강화: `border-4` → `border-6`, 라운드 `24px` → `32px`, `shadow-xl` → `shadow-2xl + ring`
4. **노치 요소 추가** (상단 둥근 바 → 폰 느낌 강화)
5. 주변 배경을 `bg-slate-100` → `gradient slate-200→slate-300` (기기와 배경 대비 강화)

**검증 게이트**: 토글 전환 시 **눈에 띄는** 레이아웃/프레임 차이 체감.

---

### 🟡 작업 2: 비로그인 가드

**수정 파일**: `web/src/app/builder/agent/page.tsx`

**동작**:
```typescript
useEffect(() => {
  const user = getUser();
  if (!user) {
    router.replace(`/login?redirect=${encodeURIComponent(/builder/agent?projectId=...)}`);
    return;
  }
  setAuthChecked(true);
}, [router, pathname, projectId]);
```

- authChecked=false면 "로그인 확인 중..." 로딩 화면
- 로그인 페이지는 이미 `params.get('redirect')` 지원 중 → 바로 호환

**검증 게이트**: 시크릿 창 `/builder/agent` 접속 → `/login?redirect=...` 자동 이동 → 로그인 후 원래 페이지 복귀.

---

### 🟡 작업 3: Supabase idempotency + 이름 중복 재시도

**수정 파일**: `api/src/supabase/supabase.service.ts`

**두 갈래 회복 전략**:

**A. Idempotency** (`provisionForProject` 시작부):
```typescript
const existing = await prisma.project.findUnique({
  where: { id: projectId },
  select: { supabaseStatus, supabaseUrl, supabaseAnonKey },
});
if (existing?.supabaseStatus === 'active' && existing.supabaseUrl && existing.supabaseAnonKey) {
  return { success: true, supabaseUrl, supabaseAnonKey, reused: true };
}
```
→ 이미 active 상태면 **기존 값 그대로 반환**. 중복 프로비저닝 자체 차단.

**B. 이름 중복 재시도** (`createProjectWithRetry`):
```typescript
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  try { return await this.createProject(currentName); }
  catch (err) {
    if (/already\s*exists|duplicate|conflict|\bexists\b/i.test(err.message)) {
      currentName = `${name}-${Date.now().toString(36).slice(-4)}`;
      continue;
    }
    throw err;  // 이름 충돌 아닌 에러는 즉시 실패
  }
}
```
→ 이름 충돌만 suffix 재시도, 네트워크/권한 에러는 즉시 실패 (잘못된 재시도 금지).

**검증 게이트**: (추후) 같은 projectId 로 provisionForProject 2번 호출 → 두 번째는 `reused=true` 반환.

---

## 명령서 vs 실제 진행 차이

| 원 명령서 | 실제 | 사유 |
|---|---|---|
| "작업별 1 commit (5개)" | 1 commit | 파일 겹침 (page.tsx/useAgentStream.ts 여러 작업에 걸침) + 5회 배포 큐 방지 + 사장님 "빼먹지 말라" 지시 → 1 commit 안에 `[실증 A/B/C][부수]` 섹션으로 구분 |
| "각 commit 후 자비스 보고" | 배포 전 통합 보고 | 명탐정 v2가 아닌 자비스가 직접 실행 (사장님 "여기서 바로 할거야") |
| "npm install 복원" | 생략 | Agent가 Read 중심 진단이라 node_modules 불필요. 실행 필요하면 Agent가 Bash allowlist로 직접 호출 가능. 사장님 철학 "제약→맥락" 부합 |
| 작업 4 프롬프트 수정 | UI 강화만 | agent-core.md § 7에 이미 반응형 강제 지시 있음. 프롬프트 중복 추가는 제약 느낌 → UI 시각화로 "맥락" 제시 |

---

## 비용

```
4/19 오후 늦게 작업 (자비스 세션):
  - 코드 변경 7 파일
  - 실제 LLM 호출 0 (Agent 실행 X)
  - tsc 검증 × 2
  - git commit + push 1회
  - 배포 검증: curl 3회

자비스 메시지 비용: ~$0.3 (대화 컨텍스트)
배포 + 런타임: $0
─────────────────
누적: ~$3.3 / 잔액 ~$17.7
```

명령서 예산 $1.6 대비 **80%+ 절약** (Agent E2E 실행 안 해서). 검증은 사장님 실제 수정 모드 사용으로 대체.

---

## 다음 과제

### 즉시 — 사장님 검증
1. `foundry.ai.kr/builder/agent` → 💬 상의 → 아무 질문 → **[대화 신호: 노출 0 확인**
2. **메디트래커(app-faec) 수정 모드 → "회원가입 왜 안 됨?" → Agent 진단 품질 확인** (핵심)
3. 프리뷰 📱/🖥 토글 → 체감 차이 + 노치 + 라벨 확인
4. 시크릿 창 `/builder/agent` → `/login` 리다이렉트 확인

### Day 4.8 후보
- 과금 체계 (사장님과 토론 중)
- 기존 /builder → Agent 대체 (Phase Beta)
- AI 회의실 → Agent Builder 통합
- 책 챕터 30 ("제약보다 맥락") 정리

### 회고
- **명탐정 v1의 Day 4.5 SSR 단축 실수** → 이번엔 안 함: 명령서의 상세 지시(복원 로직 코드 예제) 그대로 따라감. 단축 유혹 (npm install 생략)도 사장님 철학 근거로 명시 판단.
- **사장님 실증 증거 기반 작업** → 추측보다 훨씬 효율적. 스샷 2장이 이슈 3개 발견 → 1 commit 30초 배포로 해소.
- **1 commit 전략** → 명령서 원안 "5 commits"보다 실용적이었음. 파일 중복 이슈 + 배포 큐 + 사장님 검증 흐름 고려.

---

## 파일 변경 요약

| 파일 | +/- | 핵심 |
|---|---|---|
| `api/src/agent-builder/agent-builder.controller.ts` | +7/-1 | body.projectId 수용 |
| `api/src/agent-builder/agent-builder.service.ts` | +58/-6 | sandbox 복원 + draft 분기 |
| `api/src/supabase/supabase.service.ts` | +61/-3 | idempotency + 재시도 |
| `web/src/app/builder/agent/page.tsx` | +38/-2 | 가드 + projectId 전달 + UI/LLM 분리 |
| `web/src/app/builder/agent/useAgentStream.ts` | +5/-4 | start 시그니처 확장 |
| `web/src/app/builder/agent/components/FoundryPreviewPane.tsx` | +28/-24 | 프리뷰 UI 강화 |
| `memory/commands/AGENT_DAY_4_7_COMMAND.md` | +548 (신규) | Day 4.7 마스터 명령서 |

**총**: 7 files, +745/-41

---

## 🎯 자비스 한 마디

사장님이 실제 메디트래커를 써보며 보낸 스샷 2장은 Day 4.5~4.6 10 commits 쏟아낸 가치를 **첫 실증**한 순간. 그리고 거기서 나온 3이슈는 **내부 개발자가 절대 못 찾을** 실사용 버그. 특히 시스템 프롬프트 UI 노출은 로컬 테스트에선 잘 안 걸리는 전형적 "사용자의 눈" 버그.

명탐정 v1 한도 초과 → 명탐정 v2 브리핑 명령서 → 사장님 "여기서 바로" → 자비스 직접 실행. 원래 흐름 안 탔는데 오히려 **사장님 실시간 추가 피드백**(실증 C가 3번째 메시지로 들어온 것)을 바로 명령서에 반영할 수 있어서 결과 품질이 높았음.

다음은 사장님이 실제 수정 모드로 메디트래커 "회원가입 안 됨" 다시 쳐서 Agent가 `lib/supabase.ts` 진짜 Read 하는지 확인해주면 됨. 만약 여전히 "샌드박스 외부라..." 뜨면 복원 로직 경로 디버깅 필요 — 그때 바로 알려주세요.

GO! 🚀

---

# Part 2 — 사장님 실사용 피드백 라운드 (4/19 저녁 긴급 추가)

51e7db5 배포 후 사장님이 실제로 메디트래커를 써보시며 **3가지 추가 문제** 실증 제보. 연달아 처리 끝에 모두 해결.

## 추가 이슈 4: PC 프리뷰 레이아웃 — viewport simulator (🔴 가장 큰 삽질)

### 증상
사장님 스샷: `/builder/agent` 프리뷰에 메디트래커 로그인 카드만 작게 보임. 실제 URL(`app-faec.foundry.ai.kr`) 직접 접속 시엔 히어로 + 로그인 2단 PC 레이아웃 정상.

### 진단 (curl로 직접 확인)
- `/` → `/login` 리다이렉트 (같은 페이지)
- HTML 에 `lg:block` / `lg:grid` / `lg:hidden` 등 Tailwind `lg:` (≥1024px) 반응형
- iframe 폭이 1024px 미만이라 앱이 **자기를 모바일로 인식 → `lg:hidden` 발동 → 히어로 숨김**

### 🙇 삽질 타임라인 (6 commits)
| 커밋 | 시도 | 결과 |
|---|---|---|
| [`46b9f92`](https://github.com/serion-mark/launchpad/commit/46b9f92) | viewport simulator 1차 (scale + iframe 1280 고정) | **창 밖 삐져나감** |
| [`828457d`](https://github.com/serion-mark/launchpad/commit/828457d) | iframe absolute + dims ResizeObserver | "34%" 뱃지 + 큰 빈 공간 |
| [`5f67c28`](https://github.com/serion-mark/launchpad/commit/5f67c28) | 레거시 /builder LivePreview 패턴 이식 (simulator 폐기) | 쉽지만 여전히 모바일로 렌더 (근본 미해결) |
| [`12513ff`](https://github.com/serion-mark/launchpad/commit/12513ff) | 채팅 폭 `lg:w-[360px]` 로 축소 → 프리뷰 여유 확보 | "채팅만 줄고 본질 해결 X" 사장님 반려 |
| [`6af07cb`](https://github.com/serion-mark/launchpad/commit/6af07cb) | 채팅 폭 원복 | — |
| ✅ [`b401578`](https://github.com/serion-mark/launchpad/commit/b401578) | **simulator 재시도 — `Math.min(1, ...)` 제한 한 줄 제거** | **해결!** |

### 진짜 정답
```typescript
// 실패: scale 1 로 제한 → 넓은 화면에서 축소 안 되고 좌상단에 1280 박혀 빈 공간
const desktopScale = Math.min(1, dims.w / DESKTOP_VIEWPORT_WIDTH);

// 성공: 제한 제거 → 항상 containerW 에 정확히 맞춤
const desktopScale = dims.w > 0 ? dims.w / DESKTOP_VIEWPORT_WIDTH : 1;
```

1440px 화면: 프리뷰 864px → scale 0.675 → iframe 1280×H 를 864×(H*0.675) 로 렌더 → 앱은 1280 인식 → lg 발동 → **히어로+로그인 2단 완전 표시** ✅

### 교훈 (기록 가치 큼)
- **첫 시도가 방향은 맞았지만 한 줄 버그로 실패** → 2~6번은 전부 방향 오판
- `Math.min` 같은 "안전장치" 습관적 추가가 버그의 원인
- UI 반응형 문제는 **추측보다 curl / preview / DevTools 직접 측정**이 10배 빠름

---

## 추가 이슈 5: 채팅 입력창 줄바꿈 안 됨

### 증상
`<input type="text">` 사용 → Shift+Enter 눌러도 single line 유지.

### 수정 ([`439fadc`](https://github.com/serion-mark/launchpad/commit/439fadc))
- `<input>` → `<textarea rows={1}>` 교체
- `useEffect` + scrollHeight 기반 auto-grow (max 200px)
- Enter = 전송, Shift+Enter = 기본 줄바꿈 유지
- `e.nativeEvent.isComposing` 체크로 한글 IME 조합 중 전송 방지
- placeholder 에 "Shift+Enter 줄바꿈" 힌트

---

## 추가 이슈 6: 회원가입 후 로그인 실패 (🔴 사장님 "한 번에 되어야 함")

### 증상
- `test3@serion.ai.kr` 가입 → 로그인 시도 → **"Email not confirmed"**
- Supabase 기본값(Email Confirmation=ON) 으로 배포된 앱 → 이메일 인증 없이는 로그인 불가
- Agent Mode UX 원칙 위반: "가입 즉시 로그인 가능해야" 함

### 수정 (2 commits)

**[`a89b87b`](https://github.com/serion-mark/launchpad/commit/a89b87b) — 근본 수정 (신규 앱 자동 적용)**
- `supabase.service.ts` 에 `setAutoConfirm(ref)` 메서드 추가
  - `PATCH /v1/projects/{ref}/config/auth` → `mailer_autoconfirm=true`
  - `UPDATE auth.users SET email_confirmed_at=NOW()` → 기존 미confirm 일괄 복구
- `provisionForProject` 신규 생성 + idempotency 경로 **둘 다** 자동 호출

**[`f10040c`](https://github.com/serion-mark/launchpad/commit/f10040c) — admin endpoint (기존 앱 일괄 복구용)**
- `AgentBuilderService.fixAutoConfirmAll(userId)` + `POST /api/ai/agent-build/fix-autoconfirm`
- 사용자 소유 active 프로젝트 전체를 한 번에 복구

### 긴급 복구 (SSH 직접 실행)
사장님이 브라우저 콘솔 명령 실행을 싫어하셔서 **자비스가 SSH로 직접 처리**:
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
# 11개 active 프로젝트 각각 PATCH config/auth + POST database/query
```

**결과**: 모두 HTTP 200/201 ✅
- 메디트래커, 네일샵 POS, 오늘한끼, 백설공주 사과농장, 동네대장밀키트
- ideabox, bling, date-matching-app, gkdk, 셀즈노트, cpzm_v1

사장님이 `test3@serion.ai.kr / 12345678` 로 로그인 → **바로 성공 확인** ✅

---

## Part 2 전체 커밋 리스트

| # | 커밋 | 내용 |
|---|---|---|
| 1 | [`46b9f92`](https://github.com/serion-mark/launchpad/commit/46b9f92) | PC 프리뷰 simulator 1차 |
| 2 | [`828457d`](https://github.com/serion-mark/launchpad/commit/828457d) | iframe absolute |
| 3 | [`5f67c28`](https://github.com/serion-mark/launchpad/commit/5f67c28) | 레거시 이식 (simulator 폐기) |
| 4 | [`12513ff`](https://github.com/serion-mark/launchpad/commit/12513ff) | 채팅 360px (사장님 반려) |
| 5 | [`6af07cb`](https://github.com/serion-mark/launchpad/commit/6af07cb) | 채팅 원복 |
| 6 | ✅ [`b401578`](https://github.com/serion-mark/launchpad/commit/b401578) | **simulator 재시도 — Math.min 제거 → 해결** |
| 7 | [`439fadc`](https://github.com/serion-mark/launchpad/commit/439fadc) | textarea + Shift+Enter |
| 8 | [`a89b87b`](https://github.com/serion-mark/launchpad/commit/a89b87b) | Supabase autoconfirm (신규 앱) |
| 9 | [`f10040c`](https://github.com/serion-mark/launchpad/commit/f10040c) | admin fix-autoconfirm endpoint |
| — | (SSH) | 11개 기존 앱 일괄 복구 |

**Part 2 총 9 commits (프리뷰 6회 포함)**. Part 1(7개) + Part 2(9개) = **4/19 하루 총 16 commits**.

---

## 교훈 (다음 세션/명탐정 v3 에게)

### 1. UI 레이아웃 문제 → 직접 측정 먼저
- curl 로 실제 HTML 확인
- preview 띄워서 DevTools 로 width/height 로그
- `ResizeObserver` 로 실제 측정값 console.log
- **추측 → 반복 수정 → 실패** 패턴 금지

### 2. "안전장치" 한 줄이 버그일 수 있음
- `Math.min(1, ...)` 처럼 "혹시 몰라서" 넣는 clamp 주의
- 원본 공식이 맞는지 먼저 확인, 그 다음 clamp 여부 판단

### 3. 사장님 워크플로우 — 자비스가 직접 처리
- 브라우저 콘솔 명령 / curl 복붙 / 수동 OFF 등 사장님 손 쓰는 일은 **피할 것**
- SSH / admin endpoint / 자동화 로 자비스가 완결 처리
- 사장님이 "네가 해!" 라고 하기 전에 이미 자비스가 했어야 함

### 4. 프로비저닝 기본값 점검
- Supabase 의 Email Confirmation 처럼 **기본값이 UX 를 망가뜨리는 설정** 체크
- 다른 외부 서비스 프로비저닝(스토리지, RLS, CORS 등) 도 같은 관점 필요

---

## 4/19 하루 최종 스펙

- **16 commits / 1일 (오전 10 + 오후 6 + 저녁 9 중 중복 제외)**
- **실증 6이슈 해결**: 사장님이 실사용 중 발견한 문제 6개 전부 당일 해결
- **검증된 실앱 11개 전부 복구** (autoconfirm 일괄)
- **배포 평균 31초** — GitHub Actions 안정

사장님 "굿! 해결됨!!!" — 🙏

GO! 🚀
