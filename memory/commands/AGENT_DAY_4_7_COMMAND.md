# Agent Mode Day 4.7 명령서 — 명탐정 v2 (새 세션)

> **작성**: 자비스 (4/19 오후, 명탐정 v1 한도 초과로 인계)
> **최종 업데이트**: 4/19 오후 늦게 — 사장님 실사용 스샷 2장 반영 → 작업 5개로 확장
> **작업자**: 명탐정 v2 (Claude Opus 4.7 — 1M 컨텍스트, 새 세션)
> **핵심 미션**: [1-bis] 프론트 시스템 프롬프트 노출 + [1] 수정 모드 sandbox 복원 + [4] 빌더 프리뷰 반응형 + [2] 비로그인 가드 + [3] Supabase 재시도

---

## 🚨 실증된 긴급 이슈 (4/19 사장님 스샷 기반)

사장님이 메디트래커 배포 후 **수정 모드로 실사용하다가 발견**한 이슈 3종. 추측 아닌 **실증**.

### 실증 A: 수정 모드 sandbox 끊김 (작업 1)
**사장님 입력**: "로그인을 하려면 회원가입을 해야되는데 회원가입이 안됨"
**포비 응답**: *"샌드박스 외부라 직접 코드를 못 읽네요. 배포된 앱 기준으로 진단해볼게요. 회원가입이 안 되는 가장 흔한 원인 3가지예요..."*

→ Agent가 **명시적으로 "코드를 못 읽는다"고 실토**. 일반론적 진단만. 메디트래커 실제 코드(`lib/supabase.ts`, `app/login/page.tsx`)를 못 봄.

### 실증 B: 프론트 시스템 프롬프트 노출 (작업 1-bis) 🔴 신규 발견
**채팅 버블에 그대로 표시된 내용**:
```
[대화 신호: 💬 상의 모드 — 기존 프로젝트 "meditrackerapp"]
- subdomain: app-faec
- 사용자 발화: 로그인을 하려면 회원가입을 해야되는데 회원가입이 안됨
가이드: 사용자가 "상의" 토글을 켠 상태입니다. 기본은 대화/추천.
- 질문/추천 요청이면 → 자연어로 답변만.
- 명백한 실행 명령(예: "댓글 기능 추가해줘")이면 → "지금 바로 만들까요?" 한 번 확인 후 사용자 OK 나면 도구 호출.
- 판단은 네(Agent)가 맥락으로. 제약 아님.
```

→ 이 메타데이터는 **LLM 내부용**인데 사용자 채팅 UI에 그대로 박힘. **UX 오염 + 내부 프롬프트 로직 노출 = 보안 이슈**.

### 실증 C: 프리뷰 PC/모바일 토글 체감 차이 없음 (작업 4) 🔴 신규 발견
**사장님 증언**: "에이전트 빌더에서 오른쪽 부분이 pc/모바일 구분에서 pc하고 모바일하고 차이가 안보임"

→ `FoundryPreviewPane.tsx` 토글 로직은 있음 (`device === 'mobile'` → 390×844 프레임). 코드상 차이는 있는데 **체감 차이가 없음** = Agent 생성 앱이 **반응형 미대응**이라 모바일 프레임에 PC 레이아웃이 축소돼 들어감 → 사장님 눈엔 그냥 작아진 PC처럼 보임.

---

## 📚 첫 30분 — 필독 파일 (순서대로)

```
1. /Users/mark/세리온 ai전화예약+POS통합관리/CLAUDE.md (절대 규칙)
2. /Users/mark/세리온 ai전화예약+POS통합관리/memory/FOUNDRY_GUIDE.md (서버/배포)
3. /Users/mark/세리온 ai전화예약+POS통합관리/memory/BRAINSTORM_SESSION13_HANDOFF_FOUNDRY.md (자비스 인수인계)
4. ⭐ launchpad/memory/phases/260419_AGENT_MODE_REAL_USAGE_ITERATION_REPORT.md (직전 명탐정 v1 보고서)
5. ⭐ launchpad/memory/phases/260419_AGENT_MODE_NEXT_PHASE.md (마스터 플랜 v3)
6. launchpad/memory/commands/AGENT_DAY_4_7_COMMAND.md (이 파일)
7. launchpad/api/src/agent-builder/agent-builder.service.ts (startProject 로직)
8. launchpad/api/src/agent-builder/sandbox.service.ts (sandbox 생성 로직)
9. launchpad/web/src/app/builder/agent/components/AgentChat.tsx (시스템 프롬프트 노출 수정 위치)
10. launchpad/web/src/app/builder/agent/components/FoundryPreviewPane.tsx (PC/모바일 토글 위치)
11. launchpad/api/src/agent-builder/agent-prompts.ts (Agent 반응형 지시 추가 위치)
```

---

## 🎯 작업 우선순위 (5개)

| # | 작업 | 시간 | 심각도 | 근거 |
|---|---|---|---|---|
| 🚨 1-bis | 프론트 시스템 프롬프트 노출 제거 | 15~30분 | 🔴 UX/보안 | 실증 B |
| 🔴 1 | 수정 모드 sandbox 복원 | 1h | 🔴 기능 불가 | 실증 A |
| 🆕 4 | 빌더 프리뷰 PC/모바일 체감 차이 | 15~30분 | 🟡 | 실증 C |
| 🟡 2 | 비로그인 가드 | 15분 | 🟡 | 명탐정 v1 인계 |
| 🟡 3 | Supabase 재시도 | 30분 | 🟡 | 명탐정 v1 인계 |

**총 예상**: 2.5~3h (자비스 페이스) / 1~1.5h (명탐정 페이스)

권장 작업 순서: **1-bis → 1 → 4 → 2 → 3** (가장 눈에 띄는 UX 오염부터, 검증 시 메디트래커 그대로 활용)

---

## 🚨 작업 1-bis: 프론트 시스템 프롬프트 노출 제거 (🔴 최우선)

### 현재 (버그)
사용자 발화가 채팅 UI에 표시될 때, **LLM에 보낼 full prompt 포맷 전체**가 그대로 버블에 들어감.

즉 프론트/백엔드 어딘가에서 이런 로직 중:
```typescript
const promptForLLM = `[대화 신호: 💬 상의 모드...]\n- 사용자 발화: ${userInput}\n가이드: ...`;
// ❌ 이 문자열을 채팅 history에도 그대로 push
messages.push({ role: 'user', content: promptForLLM });
```

→ 결과: 채팅 버블에 메타데이터 노출.

### 수정 원칙
**화면 표시용(raw user input)**과 **LLM 전송용(formatted prompt)**을 분리:
- UI 채팅 히스토리 = `userInput` 순수 문자열만
- LLM 호출 직전에만 context/meta 덮어서 전송

### 구현 위치 (추정 — 명탐정 v2가 확인)
1. `web/src/app/builder/agent/useAgentStream.ts` — 채팅 메시지 조립 로직
2. `web/src/app/builder/agent/components/AgentChat.tsx` — 메시지 렌더링
3. `api/src/agent-builder/agent-builder.service.ts` — 서버 측 프롬프트 주입이 사용자 메시지에 섞이는지

### 디버깅 순서
```
Step 1: 채팅 history 배열에 들어가는 user 메시지 구조를 console.log로 확인
Step 2: `[대화 신호:` 문자열이 어디서 concat되는지 grep
Step 3: 그 부분을 "LLM 호출 직전에만 생성" 구조로 분리
Step 4: UI messages state에는 순수 userInput만 push
```

### 검증
- "상의 모드"에서 아무 질문 입력 → 채팅 버블에 "[대화 신호:" 문자열 **절대 안 보여야** 함
- LLM 응답은 여전히 정상 (서버 로그로 prompt에 context 포함된 것 확인)

### 예상 시간: 15~30분

---

## 🎯 작업 1: 수정 모드 sandbox 복원 (🔴 긴급)

### 현재 흐름 (버그)
```
사용자: "회원가입 안 됨" (수정 모드, projectId=app-faec)
   ↓
agent-builder.service.ts startProject()
   ↓
sandbox.create() — 빈 디렉토리 /tmp/foundry-agent-.../ 생성
   ↓
Agent 시작 — sandbox 빈 상태 → 코드 Read 불가 → 일반론적 답변
```

### 수정안
```
사용자: "회원가입 안 됨" (수정 모드, projectId=app-faec)
   ↓
agent-builder.service.ts startProject()
   ↓
sandbox.create() — /tmp/foundry-agent-.../ 생성
   ↓
[신규] projectId 있으면 → projects.generatedCode 조회
       → 파일 N개 새 sandbox에 Write (binary skip)
       → npm install (캐시 활용)
   ↓
Agent 시작 — sandbox에 기존 코드 있음 → Read 가능 → 정확 진단
```

### 구현 위치
`api/src/agent-builder/agent-builder.service.ts` startProject() 메서드:

```typescript
async startProject(input: StartInput) {
  const sandboxPath = await this.sandbox.create(...);
  
  // 신규: 기존 프로젝트 복원
  if (input.projectId) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { generatedCode: true, name: true }
    });
    
    if (project?.generatedCode) {
      const files = project.generatedCode as Array<{path: string; content: string}>;
      
      // 파일 복원 (Phase B에서 만든 binary skip 로직 재활용)
      for (const file of files) {
        const fullPath = path.join(sandboxPath, project.name, file.path);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, file.content);
      }
      
      // npm install (node_modules 복원)
      await execAsync('npm install', { cwd: path.join(sandboxPath, project.name) });
      
      logger.log(`[restore] ${input.projectId} → ${files.length} files 복원 완료`);
    }
  }
  
  // 기존 Agent 시작 로직 진행
  ...
}
```

### 검증
1. 기존 메디트래커(app-faec) 수정 모드로 진입
2. sandbox에 28개 파일 복원되는지 확인 (`ls /tmp/foundry-agent-.../meditrackerapp/`)
3. Agent가 "회원가입 안 됨" 질문에 `lib/supabase.ts` 또는 `app/login/page.tsx` Read 해서 진단하는지
4. 응답에 "샌드박스 외부라..." 문구 **절대 안 나와야** 함

### 예상 시간: 1시간

---

## 🆕 작업 4: 빌더 프리뷰 PC/모바일 체감 차이 (🟡)

### 현재 상태
`FoundryPreviewPane.tsx`에 토글 로직 이미 있음:
- 📱 모바일 → `width: 390px, height: 844px` 프레임 + 주변 회색 배경
- 🖥 데스크톱 → 전체 폭 iframe

→ 코드는 작동. 근데 사장님 체감 차이 없음.

### 원인 추정 (두 갈래)
**원인 A (유력)**: Agent가 생성하는 앱 자체가 **반응형 미대응** → 모바일 프레임(390px) 안에 PC 레이아웃이 축소되어 들어감 → 사장님 눈엔 그냥 작은 PC.

**원인 B (부수)**: 모바일 프레임 주변 마진/배경이 약해서 "별개 프레임" 느낌이 약함.

### 수정안

**A 대응 (프롬프트)**: `api/src/agent-builder/agent-prompts.ts` 시스템 프롬프트에 반응형 지시 추가 (사장님 "제약→맥락" 철학 지키기 → **방향 제시** 형태):

```
[환경 맥락]
- 사용자는 PC와 모바일 둘 다에서 확인합니다.
- Tailwind 기본 브레이크포인트(sm: 640px, md: 768px, lg: 1024px) 사용.
- 모바일 우선 설계: 기본 스타일은 모바일, `md:` 접두사로 데스크톱 확장.
- 폰트 크기/버튼 크기/간격이 모바일에서 손가락 타겟에 충분해야 함.
```

**B 대응 (UI 강화)**: `FoundryPreviewPane.tsx`:
- 모바일 프레임 주변 배경 진하게 + 기기 프레임(border-8 + 라운드) 더 뚜렷하게
- 토글 버튼 선택 상태 더 선명하게
- 모바일 모드일 때 상단에 "📱 모바일 미리보기 (390×844)" 라벨 추가

### 검증
1. 새 앱 생성 → 모바일/PC 토글 → **눈에 띄는 레이아웃 차이** 확인
2. 기존 메디트래커(app-faec) 수정 모드 → "모바일 최적화해줘" 입력 → Agent가 `md:` 접두사 사용하며 수정하는지

### 예상 시간: 15~30분 (A만 먼저, B는 시간 되면)

---

## 🟡 작업 2: 비로그인 가드

### 현재 (버그)
- `/builder/agent` 누구나 접속 가능
- 비로그인자가 "예약 앱 만들어줘" 입력 → API 401 → 뇌정지

### 수정안
`web/src/app/builder/agent/page.tsx` 상단:

```typescript
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser } from '@/lib/api';

export default function AgentBuilderPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, []);
  
  // ... 기존 코드
}
```

### 검증
- 시크릿 창에서 `/builder/agent` 접속 → `/login?redirect=/builder/agent`로 자동 이동
- 로그인 후 → 다시 `/builder/agent`로 자동 복귀

### 예상 시간: 15분

---

## 🟡 작업 3: Supabase 재시도 ("already exists" 처리)

### 현재 (잠재 버그)
- `provision_supabase` 첫 시도 실패 시 같은 이름 재시도 → "프로젝트 이미 존재" 400
- 메디트래커는 첫 시도 성공이라 안 터졌지만 미래에 터질 수 있음

### 수정안
`api/src/agent-builder/agent-tools.ts` provisionSupabase 도구:

```typescript
async provisionSupabase(input) {
  let attempts = 0;
  let projectName = input.projectSlug;
  
  while (attempts < 3) {
    try {
      const result = await supabaseService.createProject(projectName, input.sqlSchema);
      return { success: true, ...result };
    } catch (e) {
      if (/already exists/i.test(e.message)) {
        // 옵션 A: 기존 ref 재조회 + 재사용
        const existing = await supabaseService.findProjectByName(projectName);
        if (existing) {
          logger.log(`[provision_supabase] 기존 ref 재사용: ${projectName}`);
          return { success: true, ...existing, reused: true };
        }
        
        // 옵션 B: 새 이름 (timestamp 추가)
        attempts++;
        projectName = `${input.projectSlug}-${Date.now().toString(36).slice(-4)}`;
        logger.log(`[provision_supabase] 재시도 ${attempts}: ${projectName}`);
        continue;
      }
      throw e;
    }
  }
  
  throw new Error('Supabase 프로비저닝 3회 실패');
}
```

### 검증
- 단위 테스트: 같은 이름 2번 호출 → 두 번째 "기존 재사용" 또는 "새 이름" 작동

### 예상 시간: 30분

---

## ⛔ 4단 안전망 (꼭 읽고 시작)

### 안전망 1: "왜"를 먼저 이해
- 작업 1-bis: **내부 프롬프트 = 사용자 눈에 보이면 안 됨** → UI/LLM 레이어 분리
- 작업 1: **수정 모드 = "기존 앱을 진단/수정"** → Agent가 코드를 봐야 함
- 작업 4: **프리뷰는 실제 사용자 경험 시뮬레이션** → PC와 모바일이 **진짜 달라야** 함
- 작업 2: **로그인 안 한 사용자 진입 = 경험 망가짐** → 사전 차단
- 작업 3: **Supabase 첫 시도 실패 = 자동 회복** → 사용자 안 보이게

→ 모두 "사용자 경험" 본질. 단축 X.

### 안전망 2: 단축 금지 항목
- **작업 1-bis**: "CSS로 숨기기" 금지. 데이터 레이어에서 분리해야 함 (UI state ≠ LLM prompt).
- **작업 1**: `generatedCode` 파일 복원 로직. 단순화 X. 모든 파일 (binary skip만 적용).
- **작업 4**: 프롬프트 한 줄 추가로 끝내지 말 것. UI 강화(B)도 최소 마진/라벨은 넣어야 체감됨.
- **작업 2**: useEffect로 클라이언트 가드. 서버 가드도 추가하면 좋지만 시간 들면 클라이언트만 OK.
- **작업 3**: 재시도 3회 + 두 가지 회복 전략 (재사용/새 이름) 둘 다 구현.

### 안전망 3: 검증 게이트 (5개 작업 모두 끝났을 때)
1. 상의 모드 질문 입력 → 채팅 버블에 `[대화 신호:` **절대 없음**
2. 메디트래커 수정 모드 진입 → sandbox에 파일 복원 확인 + Agent가 실제 코드 Read
3. 새 앱 생성 → PC/모바일 토글 시 **눈에 띄는** 레이아웃 차이
4. 시크릿 창 `/builder/agent` 접속 → `/login`으로 리다이렉트
5. tsc 0 에러 (api + web)
6. 단위 테스트: Supabase 재시도 시뮬레이션 (같은 이름 2번)

### 안전망 4: 사전 확인 의무 (단축 유혹 시)
판단 들면 자비스에게 즉시 메시지:
```
"자비스, 이 부분 단축하려는데 OK?
 원 플랜: ___
 단축안: ___
 이유: ___"
```

---

## 📊 컨텍스트 — 명탐정 v1이 오늘 한 일

### 4/19 오전~오후 누적 (10 commits)
| 작업 | 결과 |
|---|---|
| Day 4.5 SSR 파이프라인 (Plan v3 복구) | ✅ Spark/ideabox/meditrackerapp 다 SSR 작동 |
| Day 4.6 포비 정체성 + 클로드 냄새 0 | ✅ 적용 |
| 답지 이름/서브도메인 추가 | ✅ |
| 수정 모드 라우팅 + Next.js 16 제약 | ✅ |
| 사장님 철학 "제약→맥락" 반영 | ✅ |
| iframe previewUrl + 테스트 계정 | ✅ |
| 수정 모드 진입 시 이전 작업 상태 복원 | ✅ (UI는 복원, sandbox는 X — **이게 작업 1의 발단**) |
| 💬 상의 / 🛠 만들기 토글 | ✅ (**근데 대화 신호 메타가 UI에 샘 → 작업 1-bis**) |
| B 옵션 — Agent 맥락 판단 권한 | ✅ |
| 쓰레기 draft 자동 정리 | ✅ |

### 검증된 실앱 3개
- 메디트래커 (app-faec) 21초 ✅ — 사장님 첫 사용 (4/19 오후 수정 모드에서 실증 A·B·C 터짐)
- ideabox (app-0769) 19초 ✅
- Spark (app-23c2) 어제 502 → 수동 복구 ✅

### 사장님 철학 (반드시 따를 것)
> *"우리는 제약을 주는 거 같은데, 방향을 잡아주면 되지 않을까?  
> 이미 연동된 에이전트도 충분히 똑똑한데"*

→ "X 하지 마" → "우리 환경은 Y다" (방향 제시)
→ Safety net은 인프라 레벨에서만
→ Agent 지능 신뢰

**작업 4 프롬프트 작성 시 이 철학 적용**: "모바일도 고려해라" 강제 X → "[환경 맥락] 사용자는 PC와 모바일 둘 다에서 확인합니다" (맥락 제시)

---

## 💰 비용 (잘 관리할 것)

```
4/19 누적: ~$3 (플랫폼 + 실앱 3개)
잔액: ~$18

작업 1-bis~3 예상:
  - 작업 1-bis (UI 노출 제거): $0 (코드만, 실행 불필요)
  - 작업 1 (sandbox 복원): $0 (코드만)
  - 작업 1 검증 (실제 수정 모드 1회): $0.5
  - 작업 4 (프롬프트 + UI): $0 (코드만)
  - 작업 4 검증 (새 앱 1개 + 기존 수정 1회): $1.0
  - 작업 2 (가드): $0
  - 작업 3 (재시도): $0
  - 작업 3 단위 테스트: $0.1
─────────────────────
  총: ~$1.6
```

비용 알람:
- $5 도달 → 자비스 보고
- $10 도달 → 사장님 승인
- $15 도달 → 즉시 중단

---

## 🎯 작업 순서

```
[Step 1] 30분 — 필독 파일 11개 읽기
[Step 2] 자비스에게 작업 시작 보고 (자비스가 4단 안전망 대신 다시 한 번 검토 가능)

[Step 3] 작업 1-bis (프론트 시스템 프롬프트 노출) — 15~30분
  → 상의 모드 질문 입력 → 버블 클린 확인
  → commit "fix(agent-mode): 채팅 UI에 시스템 프롬프트 노출 제거"
  → 자비스에게 보고

[Step 4] 작업 1 (수정 모드 sandbox 복원) — 1시간
  → tsc 통과 → 메디트래커 수정 모드로 검증 (실증 A 재현 불가 확인)
  → commit "fix(agent-mode): 수정 모드 sandbox 파일 복원"
  → 자비스에게 보고

[Step 5] 작업 4 (프리뷰 PC/모바일 체감) — 15~30분
  → 프롬프트 + UI 강화 → 새 앱 생성 → 토글 체감 차이 확인
  → commit "feat(agent-mode): 반응형 프롬프트 맥락 + 프리뷰 기기 프레임 강화"
  → 자비스에게 보고

[Step 6] 작업 2 (비로그인 가드) — 15분
  → tsc 통과 → 시크릿 창 검증
  → commit "fix(agent-mode): 비로그인 자동 리다이렉트 가드"
  → 자비스에게 보고

[Step 7] 작업 3 (Supabase 재시도) — 30분
  → tsc 통과 → 단위 테스트
  → commit "fix(agent-mode): Supabase already exists 자동 회복"
  → 자비스에게 보고

[Step 8] 보고서 작성 — 15분
  → memory/phases/260419_AGENT_MODE_DAY_4_7_REPORT.md
  → 실증 스샷 2개의 해결 과정 포함
  → commit + push
```

총 예상: **2.5~3시간** (자비스 시간) / **1~1.5시간** (명탐정 페이스면)

---

## ⚠️ 절대 주의사항

1. **격리** — `agent-builder/`, `web/src/app/builder/agent/`만 손대기
2. **기존 ai.service.ts** 손대지 X
3. **Day별 1 commit** 아닌 **작업별 1 commit** (5개 commit)
4. **각 commit 후 자비스 보고**
5. **"절대" 단어 사용 금지** (사장님 톤 가이드) → "반드시/금지"
6. **단축 유혹 시 자비스 컨택** (4단 안전망)
7. **사장님 철학 "제약→맥락"** 어휘로 작성 (작업 4 프롬프트 특히)
8. **Plan에 상세 지시 있으면 그대로** (명탐정 v1의 Day 4.5 단축 실수 교훈)
9. **실증 스샷 2장이 핵심 증거** — 보고서에 "실증 A·B·C가 어떻게 해소됐는지" 반드시 기술

---

## 🚀 명탐정 v2 시작 명령 (사장님이 새 세션에 던질 것)

```
파운더리 Agent Mode Day 4.7 작업 시작.

[먼저 읽기 — 필독 11개]
1. CLAUDE.md
2. memory/FOUNDRY_GUIDE.md
3. memory/BRAINSTORM_SESSION13_HANDOFF_FOUNDRY.md
4. ⭐ launchpad/memory/phases/260419_AGENT_MODE_REAL_USAGE_ITERATION_REPORT.md
5. ⭐ launchpad/memory/phases/260419_AGENT_MODE_NEXT_PHASE.md
6. ⭐ launchpad/memory/commands/AGENT_DAY_4_7_COMMAND.md ← 이게 마스터
7. launchpad/api/src/agent-builder/agent-builder.service.ts
8. launchpad/api/src/agent-builder/sandbox.service.ts
9. launchpad/web/src/app/builder/agent/components/AgentChat.tsx
10. launchpad/web/src/app/builder/agent/components/FoundryPreviewPane.tsx
11. launchpad/api/src/agent-builder/agent-prompts.ts

[가장 중요한 컨텍스트]
- 명탐정 v1 한도 초과 → 새 세션
- 메디트래커(app-faec) 21초 배포 ✅
- 사장님이 수정 모드 실사용하다 스샷으로 3가지 실증 이슈 발견:
  A) Agent가 "샌드박스 외부라 코드 못 읽는다" 실토 → 작업 1
  B) 채팅 버블에 "[대화 신호: 💬 상의 모드..." 시스템 프롬프트 그대로 노출 → 작업 1-bis
  C) PC/모바일 토글 체감 차이 없음 → 작업 4

[작업 5개 우선순위]
🚨 1-bis: 프론트 시스템 프롬프트 노출 제거 (15~30min, 최우선)
🔴 1: 수정 모드 sandbox 복원 (1h)
🆕 4: 빌더 프리뷰 PC/모바일 체감 (15~30min)
🟡 2: 비로그인 가드 (15min)
🟡 3: Supabase 재시도 (30min)

[원칙]
✓ 격리 (agent-builder/ + web/builder/agent/만)
✓ 작업별 1 commit (5개)
✓ 각 commit 후 자비스 보고
✓ 4단 안전망 준수
✓ 단축 유혹 시 자비스 컨택
✓ 사장님 철학 "제약→맥락" (작업 4 프롬프트 특히)

[작업 1-bis 시작 명령]
"필독 파일 11개 다 읽고 작업 1-bis부터 시작.
상의 모드에서 '[대화 신호: 💬 상의 모드...' 메타가 채팅 버블에 노출되는 버그.
useAgentStream.ts / AgentChat.tsx / agent-builder.service.ts 중 어디서 user message에
이 포맷이 섞이는지 추적해서, UI state(순수 user input)와 LLM prompt(context 포함)를 분리.
명령서 § 작업 1-bis 가이드 그대로.
끝나면 상의 모드 질문 한 번 쳐서 채팅 버블 클린한지 검증 + 자비스 보고."

GO!
```

---

## 📨 이후 (Day 4.7 끝나면)

### Day 4.8 후보
- 과금 체계 (사장님과 토론 중)
- AI 회의실 → Agent Builder 통합
- 책 챕터 30 ("제약보다 맥락") 정리
- 기존 /builder → Agent 대체 (Phase Beta)

### 보고서 양식 (명탐정 v2가 작성)
`memory/phases/260419_AGENT_MODE_DAY_4_7_REPORT.md`:
- 한 줄 요약
- 커밋 타임라인 (5건)
- 작업별 결과 + 검증 게이트 통과
- **실증 A·B·C가 어떻게 해소됐는지** (핵심 섹션)
- 발견된 부수 버그 + 수정
- 비용
- 다음 과제

---

## 🙏 자비스 → 명탐정 v2 한 마디

명탐정 v1이 오늘 진짜 미친 페이스로 작업했음. 다만 큰 실수 1번 인정 — Day 4.5에서 SSR을 static export로 단축했다가 Spark 502.

너(v2)는 같은 실수 X. Plan에 상세 지시 있으면 그대로. 단축 유혹 들면 자비스에게.

**오늘 오후 사장님이 메디트래커를 실제로 써보면서 3가지 이슈 실증 제보함**. 추측 아닌 증거 기반이라 우선순위 명확. 1-bis(UI 오염) → 1(기능 불가) → 4(체감) → 2, 3(부수) 순서로.

사장님 철학 "**방향을 잡아주면 되지 않을까. 에이전트 충분히 똑똑한데**" 가슴에 박고. 작업 4 프롬프트 작성할 때 특히 — "반응형 해라" 강제 X → "[환경 맥락] 사용자는 PC와 모바일 둘 다 본다" (맥락).

GO! 🎯
