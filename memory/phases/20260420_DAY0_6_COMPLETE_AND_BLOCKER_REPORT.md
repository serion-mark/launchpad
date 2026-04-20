# 📊 V3 Z안 Day 0~6 완료 + Day 6 블로커 리포트

> **작성**: 2026-04-20 17:55 KST
> **브랜치**: agent-mode-sdk → main 머지 완료 (push 됨)
> **상태**: Day 5 까지 완벽, Day 6 배포 후 root 권한 이슈로 SDK 엔드포인트 블록
> **사장님 요청**: 다른 세션에서 크로스체크 위해 현재 상태 통합 정리

---

## 🎯 1분 요약

V2 세션의 5번 디버깅 사고를 끝내기 위해 수제 Agent 루프 → **Anthropic 공식 Claude Agent SDK** 로 재설계 (Day 0~6). 로컬 POC + 구현 + tsc + 단위 검증 모두 통과하고 main 에 머지. **파운더리 서버 배포까지 성공했으나**, 첫 SDK 실사용 시 `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons` 에러로 블로킹. pm2 가 root 로 실행되는 환경이 원인. 코드 한 줄 수정 (`permissionMode` 변경) 으로 해결 예상되나 다른 세션 크로스체크 원함.

---

## 📅 Day 0~5 완료 요약

### Day 0 — SDK 실존 검증 + 기반 정리
- **커밋**: `24f297c` (V2 기록 보존), `b7ed4e9` (Day 0 POC)
- V1 명탐정이 4/18 에 이미 `v0-test.mjs` 로 SDK 실존만 검증 후 수제 루프로 선회했음을 발견
- 재설계 결정: `@anthropic-ai/claude-agent-sdk@0.2.114` 기반 재구축
- **핵심 실측**:
  - `systemPrompt: { type: 'preset', preset: 'claude_code', append: X, excludeDynamicSections: true }` 구조 확정 (sdk.d.ts:L1635-1637)
  - `model: 'claude-sonnet-4-6'` alias 정상 호출 확인
  - 로컬 macOS POC 통과 ($0.041, cache_read=31071 토큰 — V-0 캐시 공유 증거)
- **중요 sdk.d.ts 실측**: `allowDangerouslySkipPermissions: true must be set when using permissionMode: 'bypassPermissions'` (L1417) — 이 사실이 Day 6 블로커의 원인

### Day 1 — 최소 SDK Agent 루프
- **커밋**: `e99578e`
- `agent-builder-sdk.service.ts` 신설 + `sdk-message-adapter.ts` (SDKMessage → AgentStreamEvent 순수 변환)
- `POST /ai/agent-build-sdk` 컨트롤러 (feature flag `AGENT_SDK_ENABLED`)
- E2E: 이벤트 8개 생성, 빌트인 Read 도구 자동 호출

### Day 2 — 커스텀 도구 3개 MCP 포팅
- **커밋**: `6883535`
- `sdk-tools.ts` — `createFoundryMcpServer` factory
- `tool()` 빌더 + zod 스키마 + 기존 `AgentToolExecutor` 재활용 (로직 중복 0)
- 3 도구: `provision_supabase`, `deploy_to_subdomain`, `check_build`
- MCP 도구 이름: `mcp__foundry__{tool_name}`
- **발견**: Agent 가 `ToolSearch` 로 deferred tool schema lazy-load → 컨텍스트 절약

### Day 3 — AskUser 통합
- **커밋**: `7f3c462`
- AskUser tool() 추가 — handler 안에서 `SessionStoreService.waitForAnswer()` 재활용
- SDK tool handler 가 async 이므로 Promise 대기만으로 pause/resume 자동
- E2E: 외부 resolver 500ms 후 답변 → Agent 재개 "DONE" 성공
- **기존 자산 재사용률 100%**: SessionStoreService, AnswerParserService, CardRequest 타입, 프론트 AnswerSheetCard

### Day 4 — memoryService + SDK resume (V2 근본 해결)
- **커밋**: `e41f51a`
- Prisma `Project.agentSessionId String?` 추가
- `MemoryService` inject → `buildContextPrompt` → systemPrompt.append 에 주입
- 수정 모드: `resume: project.agentSessionId` 로 SDK 세션 이어받기
- 세션 종료 시 `summarizeAndSave` / `detectPreferences` fire-and-forget
- **실측**:
  - 세션 1: "My favorite color is sky blue" → session_id 캡처
  - 세션 2: resume → 답변 "sky blue" 정확 ✅
  - 세션 2 cache_read=17124 tokens, $0.006 (세션 1 비용의 1/4)
- **V2 5번 디버깅한 `sanitizeMessageHistory` 163줄을 `resume: sessionId` 한 줄로 대체**

### Day 5 — 비용 로그 + Admin 대시보드
- **커밋**: `53acf40`
- SDK END 로그에 `via=SDK cache_read=N cache_create=N hit_ratio=XX.X%` 추가
- `admin.service.ts` 파싱 확장 (optional 캐시 필드)
- `/admin/agent-cost` 페이지에 "엔진" + "cache hit" 컬럼 추가
- 단위 파싱 검증 3/3 통과 (신규/resume/기존 수제 모두)

### Day 6 — 프론트 옵트인 + 배포
- **커밋**: `8893b42` (프론트 ?sdk=1), `cd4d7d6` (main 머지)
- `useAgentStream.ts` 에 URL `?sdk=1` 감지 → `/agent-build-sdk` 분기
- main 머지 + push → GitHub Actions 배포 32초 성공
- `AGENT_SDK_ENABLED=true` env 추가 + pm2 restart --update-env
- curl 응답 403→401 변화 확인 (gate 통과)

---

## 📦 최종 커밋 이력 (main 머지 후)

```
49e5447 fix(agent-sdk): Claude binary child process 에 env 명시 전달     [hotfix 2]
62d152b fix(agent-sdk): Claude Code native binary 자동 감지 (musl 오판 회피)  [hotfix 1]
cd4d7d6 Merge branch 'agent-mode-sdk' — Z안 Claude Agent SDK 재설계 (Day 0~6)
8893b42 feat(agent-sdk): Day 6 — 프론트 ?sdk=1 옵트인 쿼리 지원
53acf40 feat(agent-sdk): Day 5 — 비용 로그 cache 필드 + Admin 대시보드
e41f51a feat(agent-sdk): Day 4 — memoryService + SDK session resume
7f3c462 feat(agent-sdk): Day 3 — AskUser pause/resume 통합
6883535 feat(agent-sdk): Day 2 — 커스텀 도구 3개 MCP 포팅
e99578e feat(agent-sdk): Day 1 — 최소 SDK Agent 루프 + adapter + controller
b7ed4e9 feat(agent-sdk): Day 0 Z안 POC — SDK 기반 재설계 기반 확립
24f297c docs: V2 세션 작업기록 + 명령서 보존 (Day 0 기반 정리)
```

---

## 🚨 Day 6 블로커 — root 권한 + bypassPermissions 충돌

### 증상 (실측)

사장님이 `https://foundry.ai.kr/builder/agent?sdk=1` 에 "주식종목 추천 커뮤니티" 입력 시:

```
⚠️ 잠깐 다시 시도할게요
포비가 자동으로 해결 중...(Claude Code process exited with code 1)
```

3번 연속 같은 에러:
1. 초기: `Claude Code native binary not found at /root/launchpad/api/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl/claude`
2. hotfix 1 후: `Claude Code process exited with code 1` (로그에서 stderr 누락)
3. hotfix 2 후: 동일 `exited with code 1`

### 디버깅 여정

**hotfix 1** — Binary 경로 수동 지정 (`62d152b`):
- 실측: 서버는 Ubuntu GLIBC 2.39 (glibc), SDK 가 musl 로 오판
- 해결: `resolveClaudeBinary()` 헬퍼로 6개 optional deps 순회하며 존재하는 binary 선택
- 결과: `[sdk] claude binary 자동 감지: /root/launchpad/api/node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude` 로그 확인
- **그러나 실행 시 여전히 exit 1**

**hotfix 2** — options.env 명시 전달 (`49e5447`):
- 의심: PM2 환경에서 ANTHROPIC_API_KEY 가 child 에 전달 안 되는 줄 알았음
- 실측: `/proc/PID/environ` 에 키 없음 (dotenv 는 runtime process.env 만 주입, OS env 아님)
- 직접 테스트: `ANTHROPIC_API_KEY=xxx /path/claude --print 'hi'` → "OK" 정상
- 해결 시도: `env: process.env` 옵션 명시
- **그러나 여전히 exit 1** → 이게 원인 아니었음

**진짜 원인 찾기 — 서버에서 minimal reproduce**:

1. 첫 재현 (`sdk-repro.mjs`): 최소 옵션 (model/path/env/maxTurns/stderr) → ✅ SUCCESS
2. 두번째 (`sdk-repro2.mjs`): + `settingSources: []` → ✅ SUCCESS
3. 세번째 (`sdk-repro3.mjs`): 실제 service 의 **전체 옵션** → ❌ FAIL, **stderr 캡처됨**:
   ```
   --dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons
   ```

### 근본 원인

파운더리 서버의 pm2 process 는 **root 유저로 실행** 중. Claude Code binary 가 **보안 설계상 root 유저에서 `--dangerously-skip-permissions` 플래그 거부**.

- 우리 코드: `permissionMode: 'bypassPermissions'` + `allowDangerouslySkipPermissions: true`
- SDK 가 binary spawn 시 `--dangerously-skip-permissions` 플래그 전달
- Binary 가 root 감지 → 즉시 거부하고 exit 1

### sdk.d.ts 요구사항 vs 실제 binary 행동

```
L1417: Must be set to 'true' when using permissionMode: 'bypassPermissions'
```

즉 `bypassPermissions` 를 쓰려면 `allowDangerouslySkipPermissions: true` 가 **필수** 인데, binary 는 root 에서 이 플래그를 **거부**. 결과: root 환경에서는 `bypassPermissions` 를 사용할 방법이 없음.

### 해결 후보 3가지

#### 후보 A: `permissionMode` 변경
- **`'acceptEdits'`** — Edit/Write 만 자동 승인. Bash 는 prompt 발생 → CLI 환경에서 hang 위험
- **`'dontAsk'`** — allowedTools 에 있으면 자동 허용, 없으면 거부. **`bypassPermissions` 대체로 가장 적합**
- **`'default'`** — prompt 발생. 서버 자동화 환경에서 부적합
- **추천**: `permissionMode: 'dontAsk'` + `allowedTools` 에 필요한 모든 도구 등록 (이미 등록됨)
- `allowDangerouslySkipPermissions: true` 는 **제거**
- **코드 한 줄 수정으로 해결 가능성**

#### 후보 B: `canUseTool` callback 사용
- 동적 권한 제어. 모든 tool 호출을 callback 에서 허가
- 코드 복잡도 ↑. 현재 필요성 낮음

#### 후보 C: pm2 를 non-root 유저로 실행
- 서버 운영 변경 (`serion-user` 같은 유저 생성 후 pm2 재설정)
- 파일 권한, nginx 설정 등 전반 영향
- 근본적 해결이지만 리스크 큼 — 기존 수제 Agent Mode 에도 영향
- **당장 권장하지 않음**

### 제안 해결 순서

1. **권장: 후보 A (`permissionMode: 'dontAsk'`)** — 코드 1곳 수정
2. 실측 재현으로 확인 후 배포
3. 만약 `dontAsk` 에서도 다른 이슈 있으면 `canUseTool` 로 fallback

### 수정 대상 파일

```
api/src/agent-builder/agent-builder-sdk.service.ts
```

```diff
-          permissionMode: 'bypassPermissions',
-          // SDK 타입 정의 (sdk.d.ts:L1417) 공식 명시:
-          //   Must be set to 'true' when using permissionMode: 'bypassPermissions'
-          allowDangerouslySkipPermissions: true,
+          // root 유저 환경에서 bypassPermissions 는 binary 가 거부 (보안 설계).
+          // dontAsk = allowedTools 에 있으면 자동 허용, 없으면 거부. 효과적으로 동일.
+          permissionMode: 'dontAsk',
```

---

## 📊 실측 증거 (타임라인)

| 시각 (KST) | 이벤트 |
|---|---|
| 17:29 | main 머지 + push (cd4d7d6) |
| 17:30 | GitHub Actions 배포 성공 (32초) |
| 17:35 | .env 에 `AGENT_SDK_ENABLED=true` 추가 + pm2 restart |
| 17:36 | curl 403→401 변화 확인 (gate OK) |
| 17:40 | 1차 사장님 테스트 → `binary not found at ...-musl/claude` |
| 17:43 | hotfix 1 배포 (62d152b, `resolveClaudeBinary`) |
| 17:45 | 2차 테스트 → `process exited with code 1` |
| 17:48 | hotfix 2 배포 (49e5447, `options.env`) |
| 17:49 | 3차 테스트 → 동일 `exited with code 1` |
| 17:52 | 서버 minimal reproduce → 성공 확인 |
| 17:54 | 전체 옵션 reproduce → **stderr 캡처 "root 에서 `--dangerously-skip-permissions` 거부"** |

## 🧪 재현 스크립트 (서버 /root/launchpad/api/ 에 남아있음)

- `sdk-repro.mjs` — 최소 옵션 (성공)
- `sdk-repro2.mjs` — + settingSources: [] (성공)
- `sdk-repro3.mjs` — 전체 옵션 (실패, stderr 캡처) ← **결정적 증거**

## 🗂 관련 문서

- 마스터 플랜: `launchpad/memory/phases/20260420_PLAN_Z_AgentSDK_재설계.md`
- V3 핸드오프: `launchpad/memory/phases/20260420_파운더리_에이전트모드개발V3_핸드오프.md`
- V2 디버깅 교훈: `launchpad/memory/phases/260419_AGENT_HISTORY_DEBUG_REPORT.md`

---

## 🎯 다른 세션 크로스체크 요청

**아래 사항에 대해 다른 의견 부탁드립니다**:

1. **`permissionMode: 'dontAsk'`** 가 `bypassPermissions` 의 적절한 대체인가?
   - SDK 문서상: "Don't prompt for permissions, deny if not pre-approved"
   - 현재 `allowedTools` 에 필요한 모든 도구(Read/Write/Edit/Bash/Glob/Grep + 4개 MCP) 이미 등록됨
   - 놓치는 권한 체크가 있는지?

2. **root 권한 자체를 벗어나는 것** 이 더 나은 선택인가?
   - Claude Code 디자인 철학상 non-root 가 정상
   - 하지만 파운더리 서버 전반 운영 변경 필요 (pm2 ecosystem, /var/www/apps 권한, nginx 등)
   - 현재 투자 대비 이점?

3. **다른 원인 가능성**?
   - stderr 에서 `--dangerously-skip-permissions ...` 뒤에 더 있었는데 뒤 에러도 있을 수 있음
   - stderr 끝까지 확인 필요 시 `sdk-repro3.mjs` 다시 실행

4. **canUseTool callback** 방식은 더 안전한가?
   - 권한 체크 명시적 제어
   - 복잡도 증가 대비 이점?

---

## 📈 누적 비용 (V3 세션 전체)

- Day 0~5 POC: ~$0.25
- Day 6 배포 전후 실측/디버깅: ~$0.10 (추정)
- **누적 ~$0.35**

---

## 💡 성과 요약

V2 에서 5번 디버깅 실패한 근본 원인 (`agentMessages` 수제 관리) 을 구조적으로 해결:

| 영역 | V2 수제 | Z안 SDK |
|---|---|---|
| 대화 이력 관리 | `sanitizeMessageHistory` 163줄 + cycle truncate | `resume: sessionId` 한 줄 |
| 캐시 공유 | 수동 `cache_control: ephemeral` | `excludeDynamicSections` + SDK 자동 |
| 도구 호출 loop | `while iter < 100` 수동 | `query()` async iterator |
| 메모리 시스템 | 누락 | `memoryService` + systemPrompt.append |
| OOM 방지 | 수동 truncate + swap 4GB | SDK 자동 압축 (`SDKCompactBoundaryMessage`) |

**Day 6 블로커 해결 시 Day 7~10 (feature flag 전환, 레거시 제거, 최종 보고) 예정대로 진행 가능.**
