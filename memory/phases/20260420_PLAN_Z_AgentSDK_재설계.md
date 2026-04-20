# 🏗 Agent Mode 재설계 (Z안) — Claude Agent SDK 도입 마스터 플랜

> **작성**: 2026-04-20 01:45 KST (V2 세션 자비스)
> **최종 업데이트**: 2026-04-20 02:10 KST — 교차검증 후 모델 ID 정정 + `excludeDynamicSections` POC 검증 명시 추가
> **작업자**: V3 (다음 세션부터, 6~10일 집중 투입)
> **목표**: 파운더리 Agent Mode 를 Anthropic 공식 **Claude Agent SDK** 기반으로 재설계 → Claude Code 동급 기억/맥락 시스템 (A+B+C+캐싱) 달성
> **의사결정 경위**: V2 세션 5번 디버깅 사고 후 사장님 "근본 해결" 의지 + "베타 트래픽 낮음(사장님/지인만) + 시간 가능" 조건 충족 → Y(수제) 대신 Z(SDK) 선택
> **교차검증 완료**: 3건 오류 검출 → 전부 반영
>   - 🔴 모델 ID: `claude-sonnet-4-20250514` → `claude-sonnet-4-6` (현재 파운더리 실사용 모델 일치)
>   - ⚠️ `excludeDynamicSections` 실존 미확인 → Day 0 POC 체크리스트에 명시적 검증 항목 추가
>   - ⚠️ 파일 3개 untracked → commit + push 대기 중 (사장님 GO 시 실행)

---

## 🎯 Executive Summary (300자)

파운더리가 현재 **수제 Agent 루프**로 돌아가는데 5번 디버깅 사고를 통해 A+B+C+캐싱 구조 전체가 필요하다는 결론. Y(수제 추가) 대신 **Anthropic 공식 Claude Agent SDK**(`@anthropic-ai/claude-agent-sdk`)를 도입하면 **Memory / Session / Caching / Context Editing 이 빌트인**으로 제공됨. 재설계 작업은 6~10일, 브랜치 병행(`agent-mode-sdk`)로 기존 Agent Mode 는 계속 운영하며 V3가 SDK 버전을 만들어 feature flag 로 점진 전환.

---

## 📦 Claude Agent SDK 핵심 API 요약 (V3 가 반드시 숙지)

### 설치
```bash
cd /Users/mark/Desktop/정부지원사업\ MVP\ 빌더\(가칭\)/launchpad/api
npm install @anthropic-ai/claude-agent-sdk
# 요구: Node 18+ (현재 서버 Node 22 ✓)
```

### 핵심 함수 `query()`
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const session = query({
  prompt: string | AsyncIterable<SDKUserMessage>,
  options: {
    model: 'claude-sonnet-4-6',       // Sonnet 4.6 (현재 파운더리 모델)
    maxTurns: 30,                            // iter 제한 (OOM 방지)
    permissionMode: 'bypassPermissions',     // 파운더리는 사장님 환경이므로 자동 승인
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',                 // 기본 Claude Code 프롬프트
      append: customSystemPrompt,            // 포비 정체성 + 파운더리 도구 설명
      excludeDynamicSections: true,          // ★ 캐시 히트율 ↑ (cwd/git status 분리)
    },
    mcpServers: { /* 커스텀 도구 서버 */ },
    cwd: sandboxPath,                        // sandbox 디렉토리
    resume: previousSessionId,               // ★ 과거 세션 이어받기 (= B 장기 메모리)
    thinking: { type: 'adaptive' },          // Opus 4.7 일 때만 extended thinking
  },
});

// Async iterator 로 이벤트 스트리밍
for await (const msg of session) {
  if (msg.type === 'assistant') { /* ... */ }
  if (msg.type === 'result') { /* 최종 결과 */ }
  if (msg.type === 'system' && msg.subtype === 'init') {
    sessionId = msg.session_id;  // 다음 세션에 resume
  }
}
```

### 세션 관리 API (자동)
```typescript
import { listSessions, getSessionMessages, renameSession, tagSession } from '@anthropic-ai/claude-agent-sdk';

// 사장님 프로젝트별 세션 목록
const sessions = await listSessions({ limit: 10 });
// 특정 세션 메시지 복구
const messages = await getSessionMessages(sessionId);
```

### 빌트인 도구 (바로 사용 가능)
- **Read / Write / Edit / Bash / Glob / Grep** — 파일 조작 (파운더리 AgentToolExecutor의 대부분 대체)
- **AskUserQuestion** — 사용자 선택지 제시 (파운더리 `AskUser` 대체 ★ 핵심)
- **WebSearch / WebFetch** — 외부 정보
- **Monitor** — 프로세스 모니터링
- **Agent** — subagent 호출

### 커스텀 도구 (MCP 서버 또는 SDK Tool Builder)

**방법 A — SDK tool() 빌더 (간단, 추천)**:
```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const provisionSupabase = tool(
  'provision_supabase',
  'Supabase 프로젝트 생성 + SQL 마이그레이션 + autoconfirm 설정',
  {
    sqlSchema: z.string().describe('CREATE TABLE 문 전체'),
  },
  async ({ sqlSchema }) => {
    // 기존 agent-tools.ts 의 provisionSupabase 로직 그대로
    const result = await supabaseService.provisionForProject(...);
    return { content: [{ type: 'text', text: `✅ URL: ${result.supabaseUrl}` }] };
  },
);
```

**방법 B — MCP 서버 (고급, 프로세스 분리)**:
- 외부 process 로 돌리면 메인 API heap 부하 낮아짐
- 지금 단계에선 과잉 → 방법 A 로 시작

### 자동 기능 (무설정)
- ✅ **Prompt Caching** — 모든 요청에 자동 적용
- ✅ **Session 이력 자동 저장** — `resume` 옵션으로 이어받기
- ✅ **Tool 호출 관리** — 직접 loop 돌릴 필요 X
- ✅ **CLAUDE.md 자동 로드** — 프로젝트 루트의 CLAUDE.md 를 컨텍스트에 자동 주입

---

## 🗺 파운더리 → Agent SDK 전환 매핑표

| 파운더리 기존 코드 | Agent SDK 대응 | 난이도 |
|---|---|---|
| `AgentBuilderService.run()` 루프 (anthropic.messages.create 반복) | `query()` async iterator 1회 | 🟢 쉬움 |
| `AgentToolExecutor` 11개 도구 | `tool()` 빌더 × 11개 + 빌트인 대체 | 🟡 보통 |
| `SandboxService.createSession()` | `query({ cwd })` + Bash 도구가 대부분 처리 | 🟢 쉬움 |
| `PromptLoaderService.getSystemPrompt()` | `systemPrompt: { preset: 'claude_code', append: ... }` | 🟢 쉬움 |
| `SessionStoreService.waitForAnswer()` (AskUser 대기) | 빌트인 `AskUserQuestion` + async iterator pause | 🟡 보통 |
| `AnswerParserService` 답지 파싱 | SDK 가 내부 처리 (사용자 응답 자동 전달) | 🟢 제거 가능 |
| `ProjectPersistenceService` (startProject / finishProject) | 유지 (DB 저장은 파운더리 책임) | 🟢 그대로 |
| `EventTranslatorService` (tool → foundry_progress) | SDKMessage → AgentStreamEvent adapter | 🟡 보통 |
| `AgentDeployService.deployAgent()` | 커스텀 tool 로 랩핑 | 🟢 쉬움 |
| `agentMessages` (수제 대화 이력) | SDK session `resume: sessionId` 로 **자동** | 🟢 제거 |
| `sanitizeMessageHistory()` (어제 5번 디버깅) | **SDK 가 자동 처리** → 완전 제거 | 🟢 **핵심 제거** |
| `truncate cycle` 로직 | **SDK prompt caching + auto session** | 🟢 제거 |
| `project_memories` 로드 (buildContextPrompt) | `systemPrompt.append` 에 주입 또는 CLAUDE.md 파일 생성 | 🟡 보통 |
| `summarizeAndSave` / `detectPreferences` | 기존 memoryService 유지, 세션 종료 시 호출 | 🟢 그대로 |
| `[cost]` 로그 | `SDKMessage.usage` 활용 | 🟢 쉬움 |
| `/admin/agent-cost` 페이지 | 그대로 유지 (로그 포맷만 맞춤) | 🟢 그대로 |

**핵심 인사이트**: V2 에서 5번 디버깅한 `sanitizeMessageHistory` / `truncate cycle` 은 **SDK 에 의해 완전히 제거**. 근본 원인 자체가 사라짐.

---

## 📅 V3 Day-by-Day 실행 계획 (10일, 하루 4~6시간 집중)

### Day 0 — 준비 (반나절, 3시간)

**목표**: SDK 완벽 이해 + 파운더리 매핑 확정 + 브랜치 준비

체크리스트:
- [ ] `@anthropic-ai/claude-agent-sdk` npm 문서 + GitHub repo 1시간 숙독
- [ ] 공식 예제 3개 로컬에서 실행 (POC 디렉토리 `launchpad/api/src/agent-builder/sdk-poc/`)
- [ ] 이 플랜 + V3 핸드오프 + 이 파일의 매핑표 숙지
- [ ] `agent-mode-sdk` 브랜치 생성: `git checkout -b agent-mode-sdk`
- [ ] npm install 추가: `@anthropic-ai/claude-agent-sdk` + `zod` (tool 빌더용)
- [ ] 로컬 POC: "hello" 대화 1회 성공
- [ ] 로컬 POC: 빌트인 `Read` 도구로 `package.json` 읽기 1회 성공
- [ ] 🔴 **`excludeDynamicSections` 옵션 실제 존재 여부 검증** (교차검증 시 V2 자비스 확신 X)
      - SDK `Options` 타입 정의 직접 열람 (node_modules/@anthropic-ai/claude-agent-sdk/dist/...)
      - 공식 docs.claude.com/en/api/agent-sdk/typescript 에서 `systemPrompt` 옵션 전체 확인
      - **존재 O**: Day 1 계획대로 `excludeDynamicSections: true` 적용
      - **존재 X**: Risk 4 진입 → 대안 캐싱 전략 (시스템 프롬프트 하단 고정 영역만 append) 설계
- [ ] 🔴 **모델 ID 재확인** — 플랜 예시의 `claude-sonnet-4-6` 이 현재 파운더리 서버에서 정상 호출되는지 POC 시 테스트

**Deliverable**: Day 0 종료 시 SDK 개념 100% 이해 + POC 2개 작동 + `excludeDynamicSections` 존재 여부 확정

---

### Day 1 — 최소 Agent 루프 POC (6시간)

**목표**: `AgentBuilderServiceV2` 클래스 신설 + 기본 루프 동작

체크리스트:
- [ ] 새 파일 `api/src/agent-builder/agent-builder-sdk.service.ts` 생성
- [ ] 기본 `runWithSDK(input)` 메서드 — `query()` 호출 + async iterator 처리
- [ ] SDKMessage → 기존 `AgentStreamEvent` 변환 adapter 레이어 (최소 버전)
  - `assistant` 메시지 → `assistant_text` 이벤트
  - `result` 메시지 → `complete` 이벤트
  - `system.init` → `start` 이벤트 (sessionId 캡처)
- [ ] `systemPrompt.append` 에 기존 `getSystemPrompt()` 결과 주입
- [ ] `excludeDynamicSections: true` 적용 (캐시 히트율 ↑)
- [ ] `permissionMode: 'bypassPermissions'` (사장님 환경)
- [ ] 새 controller endpoint `POST /api/ai/agent-build-sdk` (feature flag)
- [ ] 로컬 E2E: "hello world" 생성 요청 → 기본 Agent 응답 + Read/Bash 도구 자동 사용 확인

**Deliverable**: 기본 SDK Agent 루프 동작 + 기존 SSE 프론트엔드와 호환 (최소)

**검증 게이트**:
- POST `/api/ai/agent-build-sdk` 호출 → SSE 이벤트 5개 이상 정상 수신
- 기존 `/api/ai/agent-build` 와 병행 돌아감 (간섭 X)

---

### Day 2 — 파운더리 커스텀 도구 11개 포팅 (6시간)

**목표**: 모든 기존 도구를 `tool()` 빌더로 재구현

현재 파운더리 11개 커스텀 도구 (agent-tools.ts):
1. `read_file` → **빌트인 `Read`** 사용 (제거 가능)
2. `write_file` → **빌트인 `Write`** 사용 (제거 가능)
3. `edit_file` → **빌트인 `Edit`** 사용 (제거 가능)
4. `list_files` → **빌트인 `Glob`** 사용 (제거 가능)
5. `run_bash` → **빌트인 `Bash`** 사용 (제거 가능)
6. `AskUser` → **빌트인 `AskUserQuestion`** 사용 (★ 큰 작업 불필요)
7. `provision_supabase` → `tool()` 빌더 (커스텀)
8. `deploy_to_subdomain` → `tool()` 빌더 (커스텀)
9. `create_test_user` → `tool()` 빌더 (커스텀)
10. `check_deployment` → `tool()` 빌더 (커스텀)
11. (기타) → 필요 시 추가

**체크리스트**:
- [ ] 빌트인 대체 가능한 5개 → 빌트인 allowedTools 목록에 추가
- [ ] 커스텀 도구 4개 `tool()` 빌더로 재작성 (`api/src/agent-builder/sdk-tools.ts`)
- [ ] zod 스키마 정의 (입력 검증)
- [ ] 기존 서비스(SupabaseService, AgentDeployService 등) 그대로 재사용
- [ ] Day 1 Agent 루프에 도구 주입: `options.allowedTools`, `options.sdkTools`
- [ ] 로컬 E2E: "간단한 todo 앱 만들어줘" → 실제 파일 생성 + Supabase 프로비저닝 + 배포까지 end-to-end

**Deliverable**: 파운더리 모든 도구가 SDK 환경에서 작동

**검증 게이트**:
- 간단한 앱 생성 세션 1회 성공 (파일 10개 + Supabase + 배포)
- 배포된 앱 URL 접속 가능

---

### Day 3 — AskUser (답지 카드) 고급 통합 (4시간)

**목표**: 파운더리 독자 UX인 "답지 카드" 가 SDK 의 AskUserQuestion 과 매끄럽게 연결

현재 파운더리 흐름:
```
Agent: AskUser 도구 호출 → SSE card_request 이벤트 → 프론트엔드 답지 카드 렌더
사용자: 답변 입력 → POST /agent-build/:sessionId/answer
Server: SessionStoreService.waitForAnswer() → Agent 재개
```

SDK 흐름:
```
Agent: AskUserQuestion 도구 호출 → SDKMessage 에서 waiting_for_input 발생
사용자: 답변 입력 → streamInput() 으로 전달
SDK: 자동 Agent 재개
```

**체크리스트**:
- [ ] SDKMessage 의 AskUserQuestion 형식 분석 (실제 이벤트 캡처)
- [ ] 프론트엔드 `AnswerSheetCard` 컴포넌트 호환성 확인 (기존 CardRequest 타입 변환)
- [ ] `SessionStoreService` 대체 → SDK `streamInput` 기반 새 구현
- [ ] POST `/agent-build-sdk/:sessionId/answer` endpoint 재작성
- [ ] 로컬 E2E: Agent 가 "어떤 색을 쓸까요?" 물음 → 프론트에 카드 뜸 → 답변 → 재개

**Deliverable**: 답지 카드 UX 그대로 유지 + SDK 기반 작동

**검증 게이트**:
- 사용자 선택지 3개 답지 카드 정상 렌더 + 답변 후 Agent 작업 재개

---

### Day 4 — 메모리 시스템 통합 (5시간)

**목표**: SDK session resume + 기존 `memoryService` 결합 → A+B+C+캐싱 완성

**전략**:
- **단기 A** → SDK session 자동 관리 (resume sessionId)
- **장기 B** → 기존 `memoryService` 그대로 사용 + `systemPrompt.append` 로 주입
- **자동 압축 C** → SDK prompt caching + session 관리로 자동
- **캐싱** → SDK 자동 + `excludeDynamicSections: true`

체크리스트:
- [ ] `agent-builder-sdk.service.ts` 에 `MemoryService` inject
- [ ] `query()` 호출 전 `buildContextPrompt(projectId, userId)` 조회 → `systemPrompt.append` 에 추가
- [ ] 세션 종료 시 `summarizeAndSave` / `detectPreferences` / `recordModification` fire-and-forget 호출
- [ ] SDK session ID 를 파운더리 `projects.agentSessionId` 컬럼에 저장 (prisma 필드 추가)
- [ ] 수정 모드 진입 시 `resume: project.agentSessionId` 로 SDK 세션 이어받기
- [ ] `agentMessages` 필드 **deprecated** (남기지만 사용 X)
- [ ] 기존 `sanitizeMessageHistory` / `cycle truncate` 코드 완전 제거
- [ ] 로컬 E2E: "홈 색 파란색으로" → 세션 끝 → "그거 말고 빨간색" → Agent 가 이전 대화 기억

**Deliverable**: 기억 단절 문제 100% 해결 (V2 5번 디버깅의 근본 원인 제거)

**검증 게이트**:
- 같은 projectId로 2회차 세션 → Agent 가 1회차 맥락 정확히 참조
- DB `project_memories` 에 chatSummary 업데이트 확인
- DB `projects.agentSessionId` 에 SDK 세션 ID 저장

**Prisma 스키마 변경**:
```prisma
model Project {
  // ...
  agentSessionId String?  // SDK session id (이어받기용)
  // agentMessages Json? ← deprecated, 제거는 Day 9
}
```

---

### Day 5 — 비용 로그 + Admin 대시보드 통합 (4시간)

**목표**: 기존 `/admin/agent-cost` 페이지가 SDK 기반 세션도 동일하게 표시

체크리스트:
- [ ] SDKMessage `usage` 필드 분석 (input_tokens, output_tokens, cache 정보)
- [ ] 세션별 `[cost]` 로그 포맷 유지 (관리자 페이지 파싱 호환)
- [ ] cache_read_input_tokens / cache_creation_input_tokens 항목 추가 표기
- [ ] 세션 END 시 `[cost] session=xxx END userId=xxx email=xxx projectId=xxx total=$X.XXX cache_hit_ratio=XX%` 포맷
- [ ] `admin.service.ts` getAgentCostLogs() 파싱 업데이트 (cache 정보 추가)
- [ ] `/admin/agent-cost` 프론트엔드 cache hit 률 컬럼 추가
- [ ] 로컬 E2E: 세션 2~3회 → admin 페이지에서 모두 정상 표시

**Deliverable**: 비용 관찰 가능 + cache 효과 수치로 확인

**검증 게이트**:
- 같은 프로젝트 2회차 세션에서 cache_hit_ratio > 50% 확인 (캐싱 작동 증명)

---

### Day 6 — Staging 배포 + 통합 테스트 (6시간)

**목표**: `agent-mode-sdk` 브랜치를 staging 서버에 배포 + 사장님 실사용

체크리스트:
- [ ] `agent-mode-sdk` 브랜치 push
- [ ] GitHub Actions 배포 (기존 workflow 재사용 or staging 별도)
- [ ] feature flag env 추가: `AGENT_SDK_ENABLED=true` (controller 에서 분기)
- [ ] 프론트엔드 `/builder/agent` 에 `?sdk=1` 쿼리 지원 (테스트용 전환)
- [ ] 사장님 실제 세션 5회 이상
  - [ ] 신규 앱 생성 3회
  - [ ] 수정 모드 진입 2회
  - [ ] "그거 고쳐줘" 맥락 이어받기 체감 확인
- [ ] 서버 로그 모니터링 (heap 사용량, 에러, 응답 시간)
- [ ] 비용 비교: 기존 세션 vs SDK 세션 (V2 플랜의 60~70% 절감 수치 검증)

**Deliverable**: 사장님 체감으로 "맥락 이어짐" 확인 + 비용 절감 수치 확보

**검증 게이트**:
- 5회 세션 모두 400 에러 0건
- cache hit 률 평균 50%+ (두 번째 세션 이후)
- 사장님 체감 "좋아짐" 피드백

---

### Day 7 — Feature Flag 전환 준비 (3시간)

**목표**: 기본 경로를 SDK 로 전환 (구 버전은 fallback)

체크리스트:
- [ ] controller 기본 분기 SDK 로 설정: `const useSdk = process.env.AGENT_SDK_ENABLED !== 'false'`
- [ ] 프론트엔드 자동으로 SDK endpoint 사용 (`?legacy=1` 로만 구 경로)
- [ ] 구 `AgentBuilderService` 는 유지 (긴급 fallback 용)
- [ ] 관리자 문서 업데이트 (`admin/system` 페이지에 SDK 버전 표시)
- [ ] 사장님 + 지인 계정 실사용 모니터링 시작

**Deliverable**: SDK 버전이 프로덕션 기본 동작 + 구 버전 fallback 준비

---

### Day 8 — 운영 관찰 + 버그 수정 (하루 종일, 대기 모드)

**목표**: 실사용 중 발견되는 이슈 긴급 대응

체크리스트:
- [ ] 서버 로그 주기적 확인 (30분 간격)
- [ ] 사장님 사용 세션 모두 cost 로그 + cache hit 확인
- [ ] 발견 버그 브랜치 hotfix → 배포
- [ ] 48시간 안정성 관찰 (Day 8 + 9 전반)

**Deliverable**: 큰 이슈 0건 확인

---

### Day 9 — 레거시 코드 정리 (4시간)

**목표**: 구 Agent Mode 코드 제거 + 문서화

체크리스트:
- [ ] 구 `AgentBuilderService.run()` 메서드 내부 구현 deprecated 주석
- [ ] `sanitizeMessageHistory` / cycle truncate 코드 완전 삭제 (V2 5번 디버깅 흔적)
- [ ] `agentMessages` 필드 → Prisma `db push --force-reset` 은 위험하므로 그대로 두고 사용만 안 함
- [ ] `SessionStoreService` / `AnswerParserService` 등 SDK 로 대체된 것들 단계적 제거
- [ ] README / 내부 문서 업데이트

**Deliverable**: 코드베이스 깔끔 + SDK 단일 경로

---

### Day 10 — 최종 보고 + V3 세션 마무리 (3시간)

**목표**: V4 또는 다음 작업에 넘길 수 있게 문서화

체크리스트:
- [ ] `memory/phases/20260430_AGENT_SDK_재설계_REPORT.md` 작성
  - Day 0~9 타임라인
  - 각 단계 커밋 목록
  - 비용 비교 (기존 vs SDK)
  - cache hit 률 통계
  - 발견 이슈 + 해결
- [ ] 사장님께 최종 보고
- [ ] V3 세션 인수인계서 (다음 과제 있으면)

**Deliverable**: Z 작업 100% 완료 + 다음 단계 가이드

---

## 🔀 브랜치 + 배포 전략

```
main (현재 Agent Mode, V2 버전 유지)
  └── agent-mode-sdk (V3 작업 브랜치)
         ↓
    Day 6: staging 배포 (feature flag off)
         ↓
    Day 7: feature flag on (기본 경로 SDK)
         ↓
    Day 9: main 머지
         ↓
    Day 10: 레거시 코드 제거
```

**안전장치**:
- 환경변수 `AGENT_SDK_ENABLED=false` 로 즉시 rollback 가능
- 기존 `AgentBuilderService` 는 Day 9 까지 제거 X (비상용)
- 각 Day 의 검증 게이트 통과 전엔 다음 Day 진행 금지

---

## ⚠️ 위험 요소 + 대응

### Risk 1: SDK 학습 곡선 길어짐 (Day 0~1 지연)
- **확률**: 중
- **영향**: Day 1 까지 밀릴 수 있음
- **대응**:
  - Day 0 POC 실행 실패 시 **공식 예제 그대로** 돌려서 원인 파악
  - Anthropic GitHub Issues 검색 (https://github.com/anthropics/claude-agent-sdk-typescript/issues)
  - 필요 시 claude-code-guide subagent 활용 (V3 가 호출 가능)

### Risk 2: 파운더리 고유 기능 매핑 난이도 (Day 2~3)
- **확률**: 중
- **영향**: AskUser 답지 카드 재구현 특히 주의
- **대응**:
  - 기존 `AnswerSheetCard` 프론트엔드 그대로 유지 목표
  - 백엔드 SDK `AskUserQuestion` → 기존 `CardRequest` 변환 adapter 작성
  - 어려우면 빌트인 대신 커스텀 tool() 로 fallback

### Risk 3: SDK 내부 에러 디버깅
- **확률**: 중
- **영향**: 원인 파악 오래 걸림
- **대응**:
  - `debug: true` 옵션 항상 켜둠
  - SDK 내부 로그 패턴 익숙해지기 (Day 0)
  - 의심 시 `npm run` 로 SDK 소스 직접 열람 (node_modules)

### Risk 4: Prompt Caching 기대만큼 작동 X
- **확률**: 낮
- **영향**: 비용 절감 30% 이하
- **대응**:
  - `excludeDynamicSections: true` 설정 확인
  - `systemPrompt` 가 매번 같은지 (append 문자열 변하면 캐시 미스)
  - cache_read_input_tokens 로그로 실측

### Risk 5: Session resume 기능 불안정
- **확률**: 낮
- **영향**: B (장기 메모리) 효과 감소
- **대응**:
  - SDK resume 실패 시 **memoryService.buildContextPrompt** 로 fallback
  - 두 레이어 공존 (SDK session + memoryService) 로 안전망

### Risk 6: 베타 사용자 (사장님/지인) 불편
- **확률**: 낮 (사장님 본인이 V3)
- **영향**: 낮음 (이미 내부 테스트)
- **대응**:
  - Day 6~8 기간 하루 2~3회 사장님 세션 실행 + 즉시 피드백
  - feature flag off 로 즉시 롤백

### Risk 7: 비용 급증 (초기 SDK 사용 시)
- **확률**: 낮
- **영향**: 중
- **대응**:
  - Day 1 POC 부터 `[cost]` 로그 활성화
  - Day 6 staging 에서 세션당 $ 확인 → $2 초과 시 `maxTurns` 낮추기
  - `/admin/agent-cost` 에서 실시간 감시

---

## 📂 V3 가 만지게 될 파일 (체크리스트용)

### 신규 생성
- [ ] `api/src/agent-builder/agent-builder-sdk.service.ts` (Day 1)
- [ ] `api/src/agent-builder/sdk-tools.ts` (Day 2)
- [ ] `api/src/agent-builder/sdk-message-adapter.ts` (Day 1, SDKMessage → AgentStreamEvent)
- [ ] `api/src/agent-builder/sdk-poc/` (Day 0, POC 실험 디렉토리)
- [ ] `memory/phases/20260430_AGENT_SDK_재설계_REPORT.md` (Day 10)

### 수정
- [ ] `api/src/agent-builder/agent-builder.module.ts` — 새 서비스 등록
- [ ] `api/src/agent-builder/agent-builder.controller.ts` — feature flag 분기
- [ ] `api/prisma/schema.prisma` — `Project.agentSessionId` 필드 추가 (Day 4)
- [ ] `api/src/admin/admin.service.ts` — cache hit 파싱 (Day 5)
- [ ] `web/src/app/admin/agent-cost/page.tsx` — cache 컬럼 (Day 5)
- [ ] `web/src/app/builder/agent/page.tsx` — `?sdk=1` 지원 (Day 6)

### 제거 (Day 9)
- [ ] `api/src/agent-builder/agent-builder.service.ts` 내 `sanitizeMessageHistory`
- [ ] `api/src/agent-builder/agent-builder.service.ts` 내 cycle truncate 로직
- [ ] `api/src/agent-builder/session-store.service.ts` (SDK 로 대체)
- [ ] `api/src/agent-builder/answer-parser.service.ts` (SDK 가 자동 처리)

---

## 📊 성공 기준 (Day 10 기준 모두 달성)

### 기능
1. ✅ 사장님 "홈 파란색으로" 후 "그거 말고 빨간색" → Agent 가 이전 맥락 정확히 이해
2. ✅ 400 invalid_request 에러 0건
3. ✅ OOM 크래시 0건 (SDK 가 context 자동 관리)
4. ✅ 수정 모드 진입 시 이전 세션 맥락 + 선호 + 수정 이력 자동 로드
5. ✅ 답지 카드(AskUser) UX 기존과 동일

### 성능
1. ✅ 평균 세션 비용 기존 대비 **40% 이상 절감** (V2 플랜 추정 60~70% 중 보수값)
2. ✅ Cache hit 률 평균 **50% 이상**
3. ✅ 세션당 OOM 위험 사라짐 (SDK auto-manage)

### 코드
1. ✅ V2 에서 5번 디버깅한 `sanitizeMessageHistory` 완전 제거
2. ✅ `cycle truncate` 로직 완전 제거
3. ✅ 전체 Agent 관련 코드 라인 수 20~30% 감소 예상

---

## 🎓 V3 가 반드시 읽을 공식 문서 (Day 0)

우선순위 순:
1. **Agent SDK Overview** — https://code.claude.com/docs/en/agent-sdk/overview
2. **TypeScript Reference** — https://code.claude.com/docs/en/agent-sdk/typescript
3. **Modifying System Prompts** — https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts
4. **GitHub Repo** — https://github.com/anthropics/claude-agent-sdk-typescript (예제 코드 + issues)
5. **NPM 페이지** — https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk

---

## 🙇 V2 자비스 → V3 마지막 당부

### 이번 작업이 다른 이유
V2 의 5번 디버깅은 **기존 구조 고치기**. Z는 **구조 자체 교체**. 접근 방식이 완전 다름.

### 실수 금지 리스트
- ❌ "빠른 해결" 위해 단축하지 말 것. Day 0~10 순서 그대로.
- ❌ 검증 게이트 통과 전 다음 Day 진행 금지.
- ❌ 기존 코드 Day 9 전까지 제거하지 말 것 (rollback 대비).
- ❌ Day 0 SDK 문서 안 읽고 코드 치기 시작 금지 (V2 교훈).
- ❌ feature flag 없이 main 에 SDK 배포 금지.

### 반드시 할 것
- ✅ 매 Day 종료 시 "검증 게이트" 항목 모두 ✓ 확인.
- ✅ Day 6 이후 사장님 실사용 피드백 수시 수집.
- ✅ 의심나면 claude-code-guide subagent 호출.
- ✅ cache hit 률 + 비용 수치로 실측 증명.
- ✅ V2 교훈: save/load 대칭 체크, Grep 0건 ≠ 없음, 실측 우선.

### 사장님 요청 재확인
- "**근본 해결**" — Z 의 존재 이유.
- "**시간 가능**" — 6~10일 집중 OK.
- "**베타 트래픽 낮음**" — 다운타임 감수.
- 이 조건 깨지면 (급한 일 생김, 트래픽 증가) **즉시 중단 후 사장님 상의**.

---

## 🚀 V3 첫 화면 복붙 명령 (사장님이 던질 것)

```
파운더리 Agent Mode 개발 V3 — Z안 (Claude Agent SDK 재설계) 시작.

[필독 순서]
1. CLAUDE.md
2. memory/FOUNDRY_GUIDE.md
3. ⭐ launchpad/memory/phases/20260420_파운더리_에이전트모드개발V3_핸드오프.md
4. ⭐ launchpad/memory/phases/20260420_PLAN_Z_AgentSDK_재설계.md (이 파일 = 마스터 플랜)
5. launchpad/memory/phases/260419_AGENT_HISTORY_DEBUG_REPORT.md (V2 교훈)
6. 공식: https://code.claude.com/docs/en/agent-sdk/overview
7. launchpad/api/src/agent-builder/agent-builder.service.ts (기존 구조)

[오늘 작업: Day 0]
SDK 학습 + POC 실행 + 브랜치 생성. 4~5시간.
Day 0 검증 게이트 통과 시 Day 1 진입.

[원칙]
✓ 검증 게이트 준수
✓ 실측 우선 (V2 교훈)
✓ 기존 main 유지, sdk 브랜치에서 작업
✓ feature flag 준비
✓ 매 Day 결과 사장님 보고

GO!
```

---

## 📌 이 플랜의 위치

```
launchpad/memory/phases/
├── 20260420_파운더리_에이전트모드개발V3_핸드오프.md   ← V3 세션 인수인계
├── 20260420_PLAN_Z_AgentSDK_재설계.md                 ← 이 파일 (마스터 플랜)
├── 20260420_PLAN_memory_연결.md                       ← Y안 (deprecated, Z 로 대체됨)
├── 260419_AGENT_HISTORY_DEBUG_REPORT.md                ← V2 교훈
└── 260419_AGENT_MODE_DAY_4_7_REPORT.md                 ← Day 4.7 전체 보고
```

---

## 🙏 마지막 한 마디

V3 야. 이 플랜은 10일짜리 마라톤이야. Day 0 에 **너무 천천히** 가도 괜찮아. SDK 제대로 이해 못 하고 Day 1 가는 게 훨씬 위험해.

사장님이 "한 번에 할 수 있다" 고 하셨으니 **집중**. 어제 밤 5번 디버깅 같은 삽질은 Z 구조 자체가 방지해줄 거야.

완성하면 파운더리 = **Claude Code 동급 기억 시스템** 보유. 국내에서 이 수준 되는 MVP 빌더 아마 파운더리뿐일 거야. 지원사업 발표 때 자랑거리.

GO 🎯
