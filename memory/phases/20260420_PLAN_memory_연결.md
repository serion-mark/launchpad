# ⚠️ DEPRECATED — Y안 (수제)

> **이 문서는 참고용으로만 보존**. 2026-04-20 새벽 사장님 결정으로 Y(수제) 대신 **Z(Claude Agent SDK 재설계)** 로 전환됨.
> 
> **진짜 마스터 플랜**: [`20260420_PLAN_Z_AgentSDK_재설계.md`](20260420_PLAN_Z_AgentSDK_재설계.md)
> 
> 아래 Y안 내용은 "만약 Z 가 실패하면 fallback" 용으로만 참고 (가능성 낮음).

---

# 📋 Agent Mode ↔ memoryService 연결 플랜 (A안) [DEPRECATED]

> **작성**: 2026-04-20 01:15 KST (자비스 — V2 세션 말미)
> **작업자**: V3 (다음 세션)
> **목표**: 레거시 /builder·AI회의실이 이미 쓰는 `MemoryService` 를 Agent Mode 에 연결 → 기억 시스템 완비
> **예상 시간**: 20~30분 코드 + 10분 배포/검증 = **총 30~40분**
> **비용**: $0 (LLM 호출 추가 없음, 기존 Haiku 요약은 fire-and-forget 으로 레거시와 동일)

---

## 🎯 전제 조건 (교차검증 완료)

### 이미 존재 + 작동 중 (V3 가 만들 필요 X)
- ✅ `api/src/ai/memory.service.ts` (217줄, 메서드 6개)
- ✅ `AiModule` 이 `MemoryService` 를 `exports` 에 **이미** 포함
- ✅ DB 테이블 `project_memories`, `user_memories` (prisma schema 에 정의됨, 실 데이터 3/2건)
- ✅ 레거시 `ai.service.ts:606, 658, 659` + `agent.service.ts:96, 184` 에서 이미 호출 중

### V3 가 해야 할 것
- 🔧 `AgentBuilderModule` 에 `AiModule` import 추가
- 🔧 `AgentBuilderService` constructor 에 `MemoryService` inject
- 🔧 `run()` 시작부 — `buildContextPrompt` 호출 + system prompt 뒤에 append
- 🔧 `run()` 종료 직전 — `summarizeAndSave` + `detectPreferences` + `recordModification` (fire-and-forget)

---

## 📐 레거시 호출 레퍼런스 (`ai.service.ts` 596~665)

그대로 따라하면 됨:

```typescript
// 1) 세션 시작 — buildContextPrompt 호출
const memoryContext = await this.memoryService.buildContextPrompt(projectId, userId);

// 2) System prompt 에 append
const systemPrompt = BUILDER_SYSTEM_PROMPT
  + '\n\n' + (TEMPLATE_PROMPTS[...])
  + memoryContext     // ← 여기
  + codeContext
  + CHAT_RESPONSE_RULES;

// 3) 세션 종료 — fire-and-forget
const allMessages = [...chatHistory, { role: 'user', content: message }, { role: 'assistant', content }];
this.memoryService.summarizeAndSave(projectId, allMessages).catch(() => {});
this.memoryService.detectPreferences(projectId, userId, message).catch(() => {});
```

---

## 🔨 구현 순서 (6단계)

### Step 1 — 모듈 import 추가 (1분)

**파일**: `api/src/agent-builder/agent-builder.module.ts`

```typescript
import { Module, forwardRef } from '@nestjs/common';
// ...
import { AiModule } from '../ai/ai.module';  // ← 추가
// ...

@Module({
  imports: [
    forwardRef(() => ProjectModule),
    SupabaseModule,
    AiModule,  // ← 추가 (MemoryService 가 exports 되어 있음)
  ],
  // ...
})
export class AgentBuilderModule {}
```

### Step 2 — Service 에 inject (1분)

**파일**: `api/src/agent-builder/agent-builder.service.ts`

```typescript
import { MemoryService } from '../ai/memory.service';  // ← 추가

export class AgentBuilderService {
  constructor(
    private readonly sandbox: SandboxService,
    // ... 기존 의존성 ...
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,  // ← 추가 (맨 뒤)
  ) {
    // ...
  }
}
```

### Step 3 — `run()` 시작부에서 memory context 주입 (5분)

**파일**: `api/src/agent-builder/agent-builder.service.ts`  
**위치**: `systemPrompt` 로드 직후 (`this.promptLoader.getSystemPrompt()` 라인 근처)

```typescript
// 2. system prompt 로드
let systemPrompt = await this.promptLoader.getSystemPrompt();

// 2-bis. 기존 프로젝트면 memory context 주입
//        (레거시 /builder + AI 회의실 동일 패턴)
if (editingProjectId && userId && userId !== 'anon') {
  try {
    const memoryContext = await this.memoryService.buildContextPrompt(
      editingProjectId,
      String(userId),
    );
    if (memoryContext) {
      systemPrompt = systemPrompt + memoryContext;
      this.logger.log(
        `[memory] ${editingProjectId} → context 주입 (${memoryContext.length}자)`,
      );
    }
  } catch (err: any) {
    this.logger.warn(`[memory] buildContextPrompt 실패 (무시): ${err?.message}`);
  }
}
```

**주의**: `systemPrompt` 가 `const` 였으니 `let` 으로 변경.

### Step 4 — `run()` 종료 직전 memory 저장 (10분)

**위치**: `agentMessages` 저장 블록 **직후** (complete 이벤트 전송 직전)

```typescript
// (기존 agentMessages 저장 블록 바로 뒤)

// Memory 저장 — fire-and-forget (응답 지연 없이 백그라운드)
if (finalProjectId && userId && userId !== 'anon') {
  // messages 를 text-only 포맷으로 변환 (memoryService 는 string content 요구)
  const textMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const content =
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content
                .filter((b: any) => b?.type === 'text')
                .map((b: any) => b.text)
                .join('\n')
            : '';
      return { role: m.role, content };
    });

  // 대화 요약 (Haiku)
  this.memoryService
    .summarizeAndSave(finalProjectId, textMessages)
    .catch((e) => this.logger.warn(`[memory] summarizeAndSave 실패: ${e?.message}`));

  // 선호 감지 (키워드 매칭, LLM 호출 없음)
  this.memoryService
    .detectPreferences(finalProjectId, String(userId), prompt)
    .catch((e) => this.logger.warn(`[memory] detectPreferences 실패: ${e?.message}`));

  // 수정 기록 (수정 모드일 때만)
  if (editingProjectId) {
    const version = iter;  // 단순히 iteration 수로 대체
    this.memoryService
      .recordModification(editingProjectId, prompt, version)
      .catch((e) => this.logger.warn(`[memory] recordModification 실패: ${e?.message}`));
  }

  this.logger.log(`[memory] ${finalProjectId} → summarize/preferences/modHistory 큐잉 완료`);
}
```

**주의사항**:
- `fire-and-forget`: `await` X. `.catch()` 만 달기
- `textMessages` 변환: Agent Mode messages 는 content 가 배열(tool blocks 포함) → text block 만 추출
- `recordModification` 는 수정 모드에서만 (신규 생성은 의미 없음)
- 로거로 각 호출 추적 (실패해도 세션 완료는 정상 진행)

### Step 5 — tsc + 배포 (5분)

```bash
cd launchpad/api
npx tsc --noEmit   # 에러 0 확인

cd launchpad
git add api/src/agent-builder/agent-builder.module.ts \
        api/src/agent-builder/agent-builder.service.ts

git commit -m "feat(agent-mode): memoryService 연결 — chatSummary/선호/수정이력 영구 저장

교차검증 결정: 레거시 /builder + AI 회의실이 이미 쓰던 MemoryService 를
Agent Mode 에 연결. 새 설계 X, 호출만 추가.

- agent-builder.module.ts: AiModule import (MemoryService 가 exports)
- agent-builder.service.ts constructor: MemoryService inject
- run() 시작: buildContextPrompt → systemPrompt 에 append
  (project_memories.chatSummary + preferences + modHistory + user_memories.designPref 주입)
- run() 종료 직전: summarizeAndSave + detectPreferences + recordModification
  (fire-and-forget, tsc-only content 변환)

이전 5번 디버깅 사고(agentMessages raw 자르기) 의 근본 해결.
agentMessages 는 그대로 유지 (단기 참조 버퍼).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
"

git push origin main
# → GitHub Actions 자동 배포 (~30초)
```

### Step 6 — 검증 (10분)

#### 6-1. 배포 확인
```bash
sleep 60 && gh run list --limit 1
```

#### 6-2. SSH 로그 확인 (세션 실행 **전** baseline)
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  'pm2 describe launchpad-api 2>&1 | grep -E "uptime|restarts"'
```

#### 6-3. 사장님이 세션 1회 실행
- localpick 수정 모드 진입
- "홈 메인 색깔 파란색으로 바꿔줘" 같은 질문
- Agent 응답 완료 대기

#### 6-4. 서버 로그에서 memory 호출 흔적 확인
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  'grep -aE "\[memory\]|MemoryService" /root/.pm2/logs/launchpad-api-out.log | tail -10'
```

**기대**:
```
[memory] cmo5fjv5s... → context 주입 (350자)        ← buildContextPrompt
프로젝트 cmo5fjv5s... 대화 요약 저장 완료           ← summarizeAndSave
[memory] cmo5fjv5s... → summarize/preferences/modHistory 큐잉 완료
```

#### 6-5. DB 에 project_memories 로우 추가 확인
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  'PGPASSWORD=launchpad1234 psql -h localhost -U launchpad launchpaddb -tAF"|" -c \
  "SELECT p.name, pm.\"updatedAt\"::timestamp(0), LEFT(pm.\"chatSummary\", 80), pm.preferences FROM project_memories pm JOIN projects p ON pm.\"projectId\" = p.id ORDER BY pm.\"updatedAt\" DESC LIMIT 5;"'
```

**기대**: localpick 행 새로 추가 (또는 기존 행 updatedAt 갱신) + chatSummary 에 텍스트 + preferences 에 `{colors: ["파란"]}` 같은 키워드.

#### 6-6. 두 번째 세션으로 맥락 이어짐 체감
사장님이 같은 창에서:
> "그거 말고 빨간색은 어때?"

→ Agent 가 "좀 전에 말씀하신 파란색 배경에서 빨간색으로 바꾸시려는 거죠?" 처럼 **이전 제안을 맥락으로 이해** 하면 성공.

---

## 🚨 잠재 위험 + 대응

### 위험 1: `summarizeAndSave` 가 Haiku 호출 → 추가 비용
- **실측**: 호출당 ~$0.0003 (300 토큰 output, Haiku 단가)
- **영향**: 세션당 $0.0003 증가 → 일 100세션이어도 월 $0.90
- **비교**: Agent Mode 세션 자체가 평균 $0.2~1 → 무시 수준
- ✅ 허용

### 위험 2: `AiModule` 순환 참조
- AiModule 이 `forwardRef(() => ProjectModule)` 사용 중
- AgentBuilderModule 도 `forwardRef(() => ProjectModule)` 사용 중
- AiModule ↔ AgentBuilderModule 은 직접 참조 없으므로 순환 없음 예상
- 만약 에러 나면: `forwardRef(() => AiModule)` 로 감싸면 됨

### 위험 3: `textMessages` 변환 시 content 없는 경우
- assistant content 가 tool_use 만 있고 text block 없음 → 빈 문자열
- `memoryService.summarizeAndSave` 내부 `slice(0, 300)` 은 빈 문자열에도 안전
- ✅ 안전

### 위험 4: 첫 호출 시 DB 없음 → auto-create
- `getProjectMemory` 가 없으면 자동 생성 (line 19~23)
- 첫 호출에 로우 추가되고 그 다음부터 update
- ✅ 설계대로 안전

### 위험 5: prompt 이 시스템 메타 포함
- Agent Mode 의 prompt 는 `[만들기 모드 — ...]\n...\n- 사용자 발화: ...` 포맷
- detectPreferences 는 정규식 매칭이라 일부 false positive 가능 (메타 텍스트의 "파란" 단어 등)
- 개선: 사용자 순수 발화 추출해서 넘기기 → `handleStart` 에서 쓰는 `userText` 가 별도로 있음
- **V3 선택**:
  - (a) 빠름: prompt 그대로 넘김 → 약간의 false positive 감수
  - (b) 더 정확: useAgentStream 에서 displayText 를 백엔드로도 보내주기 (API 스키마 변경 필요)
- **권장**: 일단 (a), 문제 생기면 (b)

---

## 🎯 성공 기준 (3가지 모두 충족)

1. ✅ 서버 로그에 `[memory] ... context 주입` / `[MemoryService] ... 요약 저장 완료` 찍힘
2. ✅ DB `project_memories` 테이블에 localpick(또는 테스트 앱) 행 추가/갱신 + chatSummary 실제 텍스트
3. ✅ 두 번째 세션에서 "그것도 고쳐줘" 같은 참조형 대화가 의미 단위로 이어짐

---

## 📊 예상 효과 (V2 5번 디버깅 대비)

| 항목 | V2 이전 (agentMessages only) | V3 이후 (memory + agentMessages) |
|---|---|---|
| 맥락 보존 방식 | raw 메시지 덤프 (100KB 제한) | Haiku 요약 (2KB) + raw 단기 버퍼 |
| 400 에러 가능성 | sanitize 버그 많음 (5번 디버깅) | 요약은 단순 문자열 → 0 |
| 장기 누적 | 점점 커짐 → 비용/속도 하락 | 2KB 고정 → 항상 안정 |
| 선호도 크로스 프로젝트 | 0 | user_memories.designPref 누적 |
| 수정 이력 추적 | 대화 덤프 추측 | modHistory 명시적 기록 |

---

## 🧭 V3 가 이 플랜을 쓰는 법

1. 이 문서 15분 숙독
2. 레거시 호출 레퍼런스 (`ai.service.ts:596~665`) 한 번 열어보기
3. Step 1~4 순서 엄수 (모듈 → inject → 시작부 → 종료부)
4. tsc 통과 전까지 배포 금지
5. 배포 후 Step 6-3~6-6 로 **실측 검증** (V2 교훈)
6. 검증 통과 시 사장님께 "memory 시스템 연결 완료" 보고

---

## 🙇 V2 자비스 → V3 한 마디

이번 플랜은 **"새로 만들 필요 없는 재사용 작업"** 이라 짧게 끝날 거야. V2 가 5번 디버깅으로 날린 시간 만회할 기회.

**실수 금지 리스트**:
- ❌ 서버 로그 안 보고 배포 (V2 처럼)
- ❌ Grep 0건으로 "없다" 단정 (함정 #21)
- ❌ save 만 고치고 load 빼먹기 (대칭 체크!)
- ❌ `await` 까먹고 fire-and-forget (성능 위해 의도적, `.catch()` 로 커버)

**꼭 할 것**:
- ✅ Step 6 검증 **모두** 통과 후 보고
- ✅ 실측: DB 쿼리 + 서버 로그 + 사장님 체감
- ✅ 플랜 그대로 따라가되, 위험 열거된 부분은 의심하며 진행

끝내고 "자비스 V3 memory 연결 완료, project_memories N건 증가, 체감 OK" 보고만 나오면 이 세션의 대미.

GO 🎯
