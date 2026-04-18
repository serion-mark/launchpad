# ⭐⭐⭐⭐⭐ Phase 1 — 기능 완성 (v2 — 촘촘한 그물망)

> **버전:** 2026-04-17 v2 (사장님 요청 재작성)
> **목표:** 무한버그지옥 방지! Foundry의 영혼 = Claude Code 임베드
> **소요 시간:** 6.5일 작업 + 휴식
> **선행 조건:** Phase 0 완료 + 24시간 모니터링 정상

---

## 🎯 v2 변경점

### v1 약점
- @anthropic-ai/claude-agent-sdk **존재 가정**! (없을 수도!)
- tool_use 응답 형식 검증 부재
- 기존 채팅 코드와 충돌 가능성 미체크
- Supabase Storage 의존 (Phase 2 미해결)

### v2 강점
- **Step 1-A-0: Agent SDK 존재 사전 검증** ⭐ 신규!
- **Step 1-A-1: tool_use 응답 형식 사전 호출** ⭐ 신규!
- **단계별 부분 배포** (작업 A → 테스트 → 작업 B)
- **각 작업 끝마다 E2E 검증**

### 절대 원칙
1. **작업 시작 전 사전 검증 필수**
2. **각 작업 끝나면 부분 배포 + E2E**
3. **모호하면 추측 X, 사장님 호출 O**
4. **외부 라이브러리 가정 X** (실제 npm view 확인)

---

## 📋 6개 작업 흐름

```
[A] Phase A — Agent SDK 통합 (1.5일, 11단계)
[B] Phase B — Plan Mode (1.5일, 6단계)
[C] Phase C — Vision (1일, 6단계)
[D] Phase D — 메모리 + 검증 (1일, 4단계)
[E] 추천 카드 UI (1.5일, 5단계)
[F] 한국어/영어 토글 (1.5일, 6단계)
```

---

## 🚨 정황

### 사장님 핵심 비전
> "내가 Claude Code로 Foundry, 세리온 만든 것처럼,
>  우리 고객도 Foundry 채팅으로 같은 경험을 해야"

= **"AI 활용 격차 해소 미들웨어"**

### 초기 사고 (참고)
"메인 로고 변경" 채팅 → 다른 페이지 로고만 변경 → 편집 모드 만든 계기.

**이번엔 가능한 이유:**
- Sonnet 4.6 (95%+ 정확도, Phase 0 마이그레이션 완료)
- 1M context (전체 코드 분석)
- Plan Mode (의도 명확화 단계)
- 7중 안전망

### 비용 정책 (사장님)
- 채팅 입력 = 무료
- 분류/질문/분석 (Haiku) = 회사 부담
- 실행 (Sonnet/Opus) = 사용자 동의 후 차감
- 환불 X, 코드 롤백 O

### 모델 등급
- ⚡ FAST (Haiku 4.5) — 무료
- 💡 SMART (Sonnet 4.6) — 1,000~1,500cr
- 🚀 PRO (Opus 4) — 3,000~5,000cr

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 A — Phase 1A: Agent SDK 통합 (1.5일, 11단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🎯 목적
채팅으로 코드 수정 가능한 기본 구조 구축.

## ⭐ 구현 경로 권장 (명탐정 검증 후 업데이트)

**기본 경로 = tool_use 직접 구현** (Anthropic SDK 내장 기능 활용)

### 이유
1. **의존성 최소화** — 이미 쓰는 `@anthropic-ai/sdk`로 구현 가능 → 신규 패키지 0
2. **버전 리스크 회피** — `@anthropic-ai/claude-agent-sdk`는 최근 출시되어 자주 업데이트. peer dependency 충돌 위험.
3. **비용 철학 부합** — 사장님 "비용 0, 외부 의존 최소" 원칙과 일치
4. **학습 비용 적음** — ai.service.ts가 이미 Anthropic SDK로 Sonnet 호출 중. 같은 패턴 확장.

### 작업 분량
- Agent SDK 사용 시: 100~150줄 (SDK wrapper 호출)
- tool_use 직접: 200~300줄 (tool schema 정의 + 루프 직접)
- **차이 약 100~150줄** — Opus 1시간 내 작성 가능

### 예외 (Agent SDK 쓰는 경우)
- npm view 결과 **안정 버전 1.0+ 확인**
- peer dependency `@anthropic-ai/sdk` 버전이 현재 레포 버전과 일치
- 둘 다 만족해야 Step 1-A-0의 SDK 분기로 진행

---

## 🚦 Step 1-A-0: Agent SDK 패키지 존재 검증 ⭐ 신규! (10분)

### 목적
**가장 큰 위험!** @anthropic-ai/claude-agent-sdk 실제 존재 확인.
단, 존재하더라도 위 "구현 경로 권장"에 따라 **tool_use 직접 구현이 기본**.

### 검증

```bash
npm view @anthropic-ai/claude-agent-sdk 2>&1 | head -20
```

### ✅ 케이스 1: 존재
```
@anthropic-ai/claude-agent-sdk@x.x.x | ...
```
→ Step 1-A-1로

### 케이스 2: 다른 이름
```bash
npm search "claude agent" "anthropic agent"
```
→ 정확한 이름 찾기

### ❌ 케이스 3: SDK 없음
**자체 구현 (tool_use)으로 진행!**

기존 @anthropic-ai/sdk만 사용:
```typescript
import Anthropic from '@anthropic-ai/sdk';
// tool_use 직접 구현
```

**사장님께 보고:**
"Agent SDK 없어서 tool_use 직접 구현으로 진행. 시간 비슷합니다."

### ✅ 진행 조건
- [ ] 패키지 존재 OR 자체 구현 결정 (사장님 승인)

### 🚨 절대 금지
- 패키지 없는데 "있다 가정"하고 코드 작성 X

---

## 🚦 Step 1-A-1: tool_use 응답 형식 사전 호출 ⭐ 신규! (15분)

### 목적
Sonnet 4.6의 tool_use 응답 구조 확인.

### 테스트

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
API_KEY=$(grep '^ANTHROPIC_API_KEY=' /root/launchpad/api/.env | cut -d= -f2 | tr -d '"')
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "tools": [{
      "name": "get_weather",
      "description": "도시 날씨",
      "input_schema": {"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}
    }],
    "messages": [{"role":"user","content":"서울 날씨 알려줘"}]
  }' | head -c 2000
EOF
```

### ✅ 예상
```json
{
  "content": [
    {"type":"text","text":"..."},
    {"type":"tool_use","id":"toolu_xxx","name":"get_weather","input":{"city":"서울"}}
  ],
  "stop_reason": "tool_use"
}
```

### 검증
- [ ] `content[]` 에 `{type: "tool_use"}` 포함
- [ ] `stop_reason: "tool_use"`
- [ ] `tool_use.input` 정확히 추출

### ❌ 실패 시
- tool_use 안 나옴 → 프롬프트 조정
- 응답 형식 다름 → 사장님 보고

### 🚨 절대 금지
- 응답 형식 가정 X

---

## 🚦 Step 1-A-2: 기존 코드 충돌 확인 (10분)

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

echo "[기존 채팅 함수]"
grep -n "async chat\|chatHistory" api/src/ai/ai.service.ts | head -10

echo "[엔드포인트]"
grep -n "@Post\|@Get" api/src/ai/ai.controller.ts | head -20
```

### ✅ 진행 조건
- [ ] `chat-agent` 엔드포인트 미존재
- [ ] `ChatAgentService` 미존재 (신규 생성)
- [ ] 기존 `chat` 메서드 유지 (상담 전용)

---

## 🚦 Step 1-A-3: ChatAgentService 파일 생성 (1시간)

### 파일: `api/src/ai/chat-agent.service.ts` (신규)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma.service';

export interface ChatAgentResult {
  response: string;
  toolCalls: ToolCall[];
  needsApproval: boolean;
  proposedPlan?: ProposedPlan;
}

export interface ToolCall {
  id: string;
  name: string;
  input: any;
}

export interface ProposedPlan {
  description: string;
  filesToModify: string[];
  filesToCreate: string[];
  estimatedCredits: number;
  estimatedTimeSeconds: number;
  modelTier: 'fast' | 'smart' | 'pro';
  warnings: string[];
}

@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);
  private anthropic: Anthropic;
  
  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  
  // 다음 단계에서 메서드 추가
}
```

### 검증
```bash
ls -la api/src/ai/chat-agent.service.ts
```

---

## 🚦 Step 1-A-4: 시스템 프롬프트 작성 (30분)

### chat-agent.service.ts에 메서드 추가

```typescript
private getSystemPrompt(projectInfo: any, language: 'ko' | 'en' = 'ko'): string {
  const lang = language === 'ko' ? '한국어' : 'English';
  
  return `당신은 Foundry 고객의 전용 자비스(개발자)입니다.
사용자: 비개발자
응답 언어: ${lang}

[프로젝트]
- 이름: ${projectInfo.name}
- 설명: ${projectInfo.description || ''}
- 파일 수: ${projectInfo.fileCount || 0}

[원칙]
1. 코드 용어 금지 ("useState" "props" 등 X)
2. 친근하게
3. 결과 위주 ("회원가입 페이지 추가됐어요!")
4. 의도 모호 → 추측 X, 객관식 질문 O

[모델]
- ⚡ FAST (Haiku) — 무료 (분류, 상담)
- 💡 SMART (Sonnet 4.6) — 1,000~1,500cr
- 🚀 PRO (Opus) — 3,000~5,000cr

[안전]
1. 사용자 [확인] 없이 절대 수정 X
2. 모호하면 추측 X
3. 큰 작업 단계 분할 권장
4. 영향 받는 파일 자동 분석
5. 5,000cr 이상 → 강제 추가 확인

[금지]
- 코드 직접 보여주기 (사용자 비개발자!)
- 기술 용어 설명 없이 사용
- 사용자 동의 없이 변경
`;
}
```

---

## 🚦 Step 1-A-5: 도구 정의 (1시간)

```typescript
private getTools(): Anthropic.Tool[] {
  return [
    {
      name: 'read_file',
      description: '프로젝트 파일 읽기. 수정 전 반드시.',
      input_schema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path']
      }
    },
    {
      name: 'search_code',
      description: '코드베이스 키워드 검색. 영향 분석.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query']
      }
    },
    {
      name: 'propose_plan',
      description: '작업 계획 제시. 사용자 승인 후 실행.',
      input_schema: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          files_to_modify: { type: 'array', items: { type: 'string' } },
          files_to_create: { type: 'array', items: { type: 'string' } },
          estimated_credits: { type: 'number' },
          estimated_time_seconds: { type: 'number' },
          model_tier: { type: 'string', enum: ['fast', 'smart', 'pro'] },
          warnings: { type: 'array', items: { type: 'string' } }
        },
        required: ['description', 'files_to_modify', 'estimated_credits', 'model_tier']
      }
    },
    {
      name: 'modify_file',
      description: '파일 수정. propose_plan 후 승인 후만!',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' }
        },
        required: ['path', 'old_string', 'new_string']
      }
    },
    {
      name: 'create_file',
      description: '새 파일 생성. propose_plan 후 승인 후만!',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      }
    }
  ];
}
```

---

## 🚦 Step 1-A-6: chat 메서드 구현 (2시간)

```typescript
async chat(params: {
  projectId: string;
  userId: string;
  message: string;
  chatHistory: any[];
  language?: 'ko' | 'en';
}): Promise<ChatAgentResult> {
  
  const project = await this.prisma.project.findUnique({
    where: { id: params.projectId, userId: params.userId },
  });
  if (!project) throw new Error('프로젝트 없음');
  
  const projectFiles = JSON.parse(project.generatedCode || '[]');
  const projectInfo = {
    name: project.name,
    description: project.description,
    fileCount: projectFiles.length,
  };
  
  const response = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: this.getSystemPrompt(projectInfo, params.language),
    tools: this.getTools(),
    messages: [
      ...params.chatHistory,
      { role: 'user', content: params.message }
    ],
  });
  
  const toolCalls: ToolCall[] = [];
  let textResponse = '';
  let proposedPlan: ProposedPlan | undefined;
  let needsApproval = false;
  
  for (const block of response.content) {
    if (block.type === 'text') {
      textResponse += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, input: block.input });
      
      if (block.name === 'propose_plan') {
        needsApproval = true;
        proposedPlan = block.input as ProposedPlan;
      }
    }
  }
  
  this.logger.log(`[ChatAgent] 응답: text=${textResponse.length}자, toolCalls=${toolCalls.length}`);
  
  return { response: textResponse, toolCalls, needsApproval, proposedPlan };
}
```

---

## 🚦 Step 1-A-7: 컨트롤러 엔드포인트 (30분)

### `api/src/ai/ai.controller.ts` 수정

```typescript
import { ChatAgentService } from './chat-agent.service';

constructor(
  private aiService: AiService,
  private chatAgentService: ChatAgentService,  // ← 추가
) {}

@Post('chat-agent')
@UseGuards(AuthGuard('jwt'))
async chatAgent(
  @Req() req: any,
  @Body() body: {
    projectId: string;
    message: string;
    chatHistory: any[];
    language?: 'ko' | 'en';
  }
) {
  return this.chatAgentService.chat({
    ...body,
    userId: req.user.userId,
  });
}
```

### 검증
```bash
grep -n "chat-agent" api/src/ai/ai.controller.ts
# 예상: 1건
```

---

## 🚦 Step 1-A-8: 모듈 등록 (5분)

### `api/src/ai/ai.module.ts` 수정

```typescript
import { ChatAgentService } from './chat-agent.service';

@Module({
  providers: [
    AiService,
    ChatAgentService,  // ← 추가
    SmartAnalysisService,
    PrismaService,
  ],
})
```

### 검증
```bash
grep -n "ChatAgentService" api/src/ai/ai.module.ts
# 예상: 2건 (import + providers)
```

---

## 🚦 Step 1-A-9: tsc 검증 (5분)

```bash
npx tsc --noEmit -p api/tsconfig.build.json
# exit 0
```

### ❌ 에러 → 사장님 보고 + stop

---

## 🚦 Step 1-A-10: ✅ 부분 배포 + E2E (30분)

### 사장님 브리핑
```
사장님, 작업 A (Agent SDK 통합) 완료!

■ 변경
- 신규: api/src/ai/chat-agent.service.ts
- 수정: ai.controller.ts, ai.module.ts

■ 검증
- tsc 0 에러
- tool_use 응답 형식 확인됨

배포 후 채팅 테스트 진행할까요?
```

### 사장님 OK 후

```bash
git add api/src/ai/chat-agent.service.ts \
        api/src/ai/ai.controller.ts \
        api/src/ai/ai.module.ts

git commit -m "feat: Phase 1A — ChatAgentService 통합"
git push origin main
```

### E2E 테스트 — 실기능 5건 (명탐정 추가 ⭐)

**"코드 실행"이 아니라 "실제 작동" 확인. 5건 모두 통과해야 Phase 1B 진입!**

```bash
# JWT 토큰 발급 후 아래 5건 순차 실행
JWT="<test_jwt>"
URL="https://foundry.ai.kr/api/ai/chat-agent"
PROJ="<test-id>"

# 1) 기본 인사 — 의도 분류 동작
curl -X POST $URL -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJ\",\"message\":\"안녕\",\"chatHistory\":[]}"

# 2) 기능 추가 요청 — feature_add 의도 + propose_plan
curl -X POST $URL -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJ\",\"message\":\"회원가입 페이지 만들어줘\",\"chatHistory\":[]}"

# 3) 디자인 변경 요청 — design_change 의도
curl -X POST $URL -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJ\",\"message\":\"색상 빨강으로 바꿔줘\",\"chatHistory\":[]}"

# 4) 모호 의도 — confidence 낮음, 재질문 흐름
curl -X POST $URL -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJ\",\"message\":\"모르겠어\",\"chatHistory\":[]}"

# 5) 빌드 트리거 — build_trigger 의도 (또는 확인 플로우)
curl -X POST $URL -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJ\",\"message\":\"빌드해줘\",\"chatHistory\":[]}"
```

**예상 비용: Haiku 5회 ≈ $0.01 미만 (사실상 공짜)**

### ✅ Phase 1A 완료 조건 (전부 ✅ 되어야 Phase 1B 진입!)
- [ ] **tsc 0 에러**
- [ ] **배포 헬스체크 ok** (`curl /api/health`)
- [ ] **실기능 테스트 5건 전부 200 OK + 정상 응답** (위 5개 curl)
  - [ ] 1) 인사: 일반 응답
  - [ ] 2) 기능 추가: toolCalls에 `propose_plan` 또는 `read_file` 포함
  - [ ] 3) 디자인 변경: design_change 의도 분류됨
  - [ ] 4) 모호: confidence < 0.6 or 재질문 응답
  - [ ] 5) 빌드: build_trigger 의도 또는 확인 플로우
- [ ] **에러 로그 0건** (PM2 logs에서 exception 없음)
- [ ] **사장님 승인**

### ❌ 1건이라도 실패 → Phase 1B 진입 금지
- 실패 건 로그 분석
- 원인 파악 후 수정
- 재배포 + 5건 재테스트
- 5건 다 통과 전까지 대기

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 B — Phase 1B: Plan Mode + #27-A 통합 (2일, 9단계) ⭐⭐⭐
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🆕 #27-A 통합 사항 (명탐정 검증 후 추가)
사장님 4단 콤보 통찰 + 마누스 흡수:
- B-2 강화: 선택지 생성기 (자유 텍스트 X, 1~4 클릭)
- **B-2.5 NEW: "바로 생성" 자동 트리거 + 경고** ⭐ 어제 누락 버그 근본 해결!
- B-4 강화: 종합 확인 모달 (빌드 직전 [⬅️ 더 수정] / [✅ 만들기])
- SmartAnalysis 자동 트리거 (수동 → 자동)

## 시간
- 기존 Plan Mode: 1.5일
- #27-A 추가: +3.5h
- 총 약 2일

## 의존성
- ✅ SmartAnalysisService 이미 작동 (200cr)
- ✅ start/page.tsx:1680 SmartAnalysis 이미 호출 중 (트리거만 변경)
- ✅ start/page.tsx:1803 "바로 생성" 버튼 (경고 추가)
- ✅ checkSubdomainAvailable API 이미 존재
- ⚠️ 1932줄 재작성은 Phase 4 (#27-B)로 분리

## 🎯 목적
모호한 의도 → 추가 질문 → 정확한 요구서 → 사용자 확인 → 실행.

---

## 🚦 Step 1-B-1: 의도 분류기 — Haiku (3시간)

### chat-agent.service.ts 메서드 추가

```typescript
async classifyIntent(message: string, projectInfo: any): Promise<IntentResult> {
  const response = await this.anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',  // Haiku!
    max_tokens: 512,
    system: '사용자 메시지를 분류하는 AI. JSON으로만 응답.',
    messages: [{
      role: 'user',
      content: `프로젝트: ${projectInfo.name}
사용자 메시지: "${message}"

분류 (JSON):
{
  "intent": "consultation" | "design_change" | "feature_add" | "bug_fix" | "unclear",
  "confidence": 0.0~1.0,
  "reasoning": "이유",
  "needs_clarification": true | false,
  "estimated_scope": "small" | "medium" | "large"
}`
    }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}
```

---

## 🚦 Step 1-B-2: 추가 질문 생성기 (2시간)

```typescript
async generateClarifyingQuestions(message: string, intent: IntentResult): Promise<Question[]> {
  const numQuestions = intent.confidence < 0.5 ? 3 : intent.confidence < 0.7 ? 2 : 1;
  
  const response = await this.anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: '사용자 의도 명확화 객관식 질문 생성. 비개발자 친화 한국어.',
    messages: [{
      role: 'user',
      content: `메시지: "${message}"
의도: ${intent.intent}
신뢰도: ${intent.confidence}

${numQuestions}개 질문 (JSON):
{
  "questions": [
    {
      "id": "q1",
      "question": "질문",
      "options": [
        { "id": "a", "label": "선택지" }
      ],
      "allow_custom": true
    }
  ]
}`
    }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()).questions;
}
```

---

## 🚦 Step 1-B-2.5: ⭐ "바로 생성" 자동 트리거 + 경고 모달 (30분) — 명탐정 catch!

### 목적
**어제 심사위원 누락 버그 근본 해결!**
- 어제: "바로 생성" 클릭 → SmartAnalysis 안 됨 → reservation/booking 누락
- 해결: SmartAnalysis 안 했으면 → 경고 모달 → 사용자 동의 후만 진행

### 사전 확인

```bash
sed -n '1800,1810p' "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/web/src/app/start/page.tsx"
```

### ✅ 예상 (현재 코드)
```tsx
<button onClick={() => createProject()}>
  {smartAnalysis.results.optimization ? '🚀 분석 반영하여 생성' : '⚡ 바로 생성'}
</button>
```

### Step 1-B-2.5-A: 경고 모달 컴포넌트 (15분)

**파일:** `web/src/app/start/components/SmartAnalysisWarning.tsx` (신규)

```typescript
'use client';
export default function SmartAnalysisWarning({
  onProceed,
  onAnalyzeFirst,
  onCancel,
}: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-content border-2 border-yellow-400">
        <h3 className="text-xl font-bold mb-3">⚠️ AI 자동 설계를 건너뛰시겠어요?</h3>
        
        <div className="space-y-3 mb-4">
          <div className="p-3 border-2 border-blue-400 bg-blue-50 rounded">
            <strong>✅ 분석 후 생성 (+200cr)</strong>
            <p className="text-sm">결과 품질 3배 + 누락 방지</p>
            <p className="text-xs text-gray-600">
              어제 심사위원도 이거 안 눌러서 일부 기능 빠졌어요 ㅠㅠ
            </p>
          </div>
          
          <div className="p-3 border bg-gray-50 rounded">
            <strong>⚡ 바로 생성</strong>
            <p className="text-sm">빠르지만 누락 가능성 ↑</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={onAnalyzeFirst} className="flex-1 py-3 bg-blue-600 text-white rounded font-bold">
            ✅ 분석 후 생성 (추천)
          </button>
          <button onClick={onProceed} className="px-4 py-3 border rounded">
            ⚡ 그래도 바로
          </button>
          <button onClick={onCancel} className="px-4 py-3">
            ❌ 취소
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 1-B-2.5-B: 버튼 onClick 수정 (15분)

**파일:** `web/src/app/start/page.tsx` (라인 1803 근처)

#### Before
```tsx
<button onClick={() => createProject()}>
  {smartAnalysis.results.optimization ? '🚀 분석 반영하여 생성' : '⚡ 바로 생성'}
</button>
```

#### After
```tsx
const [showWarning, setShowWarning] = useState(false);

<button onClick={async () => {
  // SmartAnalysis 안 했으면 → 경고 모달
  if (!smartAnalysis.results.optimization) {
    setShowWarning(true);
    return;
  }
  await createProject();
}}>
  {smartAnalysis.results.optimization ? '🚀 분석 반영하여 생성' : '⚡ 바로 생성'}
</button>

{showWarning && (
  <SmartAnalysisWarning
    onAnalyzeFirst={async () => {
      setShowWarning(false);
      await runSmartAnalysis();
      // 분석 완료 후 자동으로 생성
    }}
    onProceed={async () => {
      setShowWarning(false);
      await createProject();
    }}
    onCancel={() => setShowWarning(false)}
  />
)}
```

### ✅ 완료 조건
- [ ] SmartAnalysisWarning 컴포넌트 생성
- [ ] 버튼 onClick 수정
- [ ] tsc 에러 0
- [ ] E2E: "바로 생성" 클릭 시 경고 모달 표시

### 효과
- ⭐ 어제 심사위원 버그 근본 해결!
- ⭐ 신규 사용자 누락 방지
- ⭐ Phase 0-14 (selectedFeatures 강제)와 시너지

---

## 🚦 Step 1-B-3: 요구서 정리기 (2시간)

```typescript
async buildRequirements(
  message: string,
  answers: Record<string, string>,
  projectFiles: string[]
): Promise<Requirements> {
  const response = await this.anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: '의도 + 답변 + 프로젝트 종합해 요구서 작성.',
    messages: [{
      role: 'user',
      content: `메시지: "${message}"
답변: ${JSON.stringify(answers)}
프로젝트 파일: ${projectFiles.slice(0, 50).join('\n')}

요구서 (JSON):
{
  "summary": "한 문장",
  "files_to_modify": ["..."],
  "files_to_create": ["..."],
  "files_to_delete": ["..."],
  "model_tier": "fast" | "smart" | "pro",
  "estimated_credits": 1500,
  "estimated_time_seconds": 60,
  "warnings": ["..."]
}

규칙:
- 5,000cr+ → 단계 분할 권장 → warnings
- 영향 5개+ → warnings
- 비개발자 친화 한국어`
    }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
}
```

---

## 🚦 Step 1-B-4: 사용자 확인 모달 (1.5시간)

### `web/src/app/builder/components/PlanApprovalCard.tsx` (신규)

```typescript
'use client';
export interface Plan {
  description: string;
  files_to_modify: string[];
  files_to_create: string[];
  estimated_credits: number;
  estimated_time_seconds: number;
  model_tier: 'fast' | 'smart' | 'pro';
  warnings: string[];
}

export default function PlanApprovalCard({
  plan, onApprove, onCancel
}: { plan: Plan; onApprove: () => void; onCancel: () => void }) {
  const tierColors = { fast: 'bg-green-500', smart: 'bg-yellow-500', pro: 'bg-red-500' };
  const tierNames = { fast: '⚡ FAST', smart: '💡 SMART', pro: '🚀 PRO' };
  const isLargeWork = plan.estimated_credits >= 5000;
  
  return (
    <div className="border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-3">
      <h3 className="text-lg font-bold mb-3">📋 작업 계획</h3>
      <p className="mb-3">{plan.description}</p>
      
      {plan.files_to_create?.length > 0 && (
        <div className="mb-2">
          <span className="text-green-600">📁 추가 ({plan.files_to_create.length}개):</span>
          <ul className="text-sm pl-4">
            {plan.files_to_create.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
      
      {plan.files_to_modify?.length > 0 && (
        <div className="mb-2">
          <span className="text-blue-600">📝 수정 ({plan.files_to_modify.length}개):</span>
          <ul className="text-sm pl-4">
            {plan.files_to_modify.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
      
      {plan.warnings?.length > 0 && (
        <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
          ⚠️ 주의:
          <ul className="text-sm pl-4">
            {plan.warnings.map(w => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-3 text-sm">
        <span className={`px-2 py-1 rounded text-white ${tierColors[plan.model_tier]}`}>
          {tierNames[plan.model_tier]}
        </span>
        <span>💰 {plan.estimated_credits.toLocaleString()}cr</span>
        <span>⏱️ {plan.estimated_time_seconds}초</span>
      </div>
      
      {isLargeWork && (
        <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded">
          ⚠️ 5,000cr 이상의 큰 작업입니다. 정말 진행하시겠어요?
        </div>
      )}
      
      <div className="flex gap-2">
        <button onClick={onApprove} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">
          {isLargeWork ? '⚠️ 정말 진행' : '✅ 진행'}
        </button>
        <button onClick={onCancel} className="px-4 py-3 border rounded-lg">❌ 취소</button>
      </div>
    </div>
  );
}
```

---

## 🚦 Step 1-B-5: tsc 검증 (5분)

```bash
npx tsc --noEmit -p api/tsconfig.build.json
npx tsc --noEmit -p web/tsconfig.json
```

---

## 🚦 Step 1-B-6: ✅ 부분 배포 + Step 1 단위 E2E (30분)

### 사장님 브리핑 + 배포

### Step 1 단위 E2E 시나리오 (비용 저렴, 반복 가능)
1. "회원가입 페이지 추가" → 추가 질문 1~2개
2. 답변 → 요구서 정리 → 확인 모달 표시
3. "확인" 클릭 → (실행은 작업 D)
4. "바로 생성" 버튼 클릭 → B-2.5 경고 모달 표시 확인

**비용: 회당 약 $0.15 (Haiku + 의도 분류만)** — 개발 중 반복 검증용.

---

## 🚦 Step 1-B-6.5: 🔴 풀 E2E 2회 (Phase 1B 최종 검증, 명탐정 추가 ⭐)

### 목적
"Step 1만 호출" 테스트는 의도/선택지 UI만 확인. 실제 **빌드 → 배포까지 전 과정**은 풀 E2E로만 검증 가능.

어제 누락 버그(reservation/booking)는 **빌드 결과물에서만 확인 가능** → 풀 E2E 필수.

### 시나리오 1: 어제 심사위원 재현 (필수)
```
입력:
- 템플릿: 건강관리
- 기능 7개 선택: dashboard, auth, goal, medication, tracking, report, reservation, booking
- "스마트 분석 후 생성" 클릭

확인:
✅ SmartAnalysis 200cr 차감 + 3분 실행
✅ 생성된 30개 파일에 reservation/booking 포함
✅ pages 배열에 7개 기능 전부 존재 (Phase 0-14 자체검증 효과 확인)
✅ F4 발생 < 10건 (앱 전체 기준, 경험치)
✅ 빌드 성공 (F6 3회 이내)
✅ 배포 성공 (app-xxxx.foundry.ai.kr 접속)

비용: 약 $5~7
```

### 🔴 F4 비정상 호출 = 시나리오 1 실패 판정
**판정 기준 (사장님 정책):**
- ✅ **합격: F4 < 10건**
- ❌ **실패: F4 ≥ 10건** → 시나리오 1 실패로 간주, Phase 1B 완료 X

### 실패 시 대응
1. 즉시 stop + 로그 수집 (PM2 logs에서 "[F4 이어서 생성]" grep)
2. 원인 분류:
   - (a) **Phase 0-14 프롬프트 효과 미흡** → 자체검증 루프에도 Sonnet이 긴 파일 생성하려 함 → 프롬프트에 "파일당 300줄 이내로 분할" 추가 지시
   - (b) **Sonnet 4.6 자체 잘림 증가** → prefill 제거 후 이어서 생성 품질 저하 (Phase 0-11.5 실패 재조사)
   - (c) **SmartAnalysis 결과가 파일 수 폭증 유발** → 기능 7개 모두 독립 페이지 요구로 30→50파일 생성 시도
3. 사장님 보고 + 대응 결정 (프롬프트 재조정 → 재배포 → 시나리오 1 재시도)
4. F4 < 10건 달성 전까지 Phase 1B 완료 X

### 시나리오 2: B-2.5 경고 트리거 (필수)
```
입력:
- 템플릿 선택
- 기능 3개 선택
- "스마트 분석" 건너뛰고 "바로 생성" 클릭 ← B-2.5 경고 모달 트리거

확인:
✅ B-2.5 경고 모달 표시 ("AI 자동 설계를 건너뛰시겠어요?")
✅ [취소] 클릭 → 원래 화면 복귀
✅ 재시도: [계속] 클릭 → 빌드 진행
✅ 생성 품질 = 스마트 분석 없이도 선택 기능 전부 포함

비용: 약 $5~7
```

### 비용 예산
- 시나리오 1 + 2 = **약 $10~14** (Phase 1B 최종 검증 1회)
- **사장님 사전 승인 필수** (크레딧 $50 이상 잔고 확인)

### ✅ Phase 1B 완료 조건
- [ ] Step 1-B-6 단위 E2E 통과
- [ ] **시나리오 1 풀 E2E 통과** (어제 버그 재발 X)
- [ ] **시나리오 2 풀 E2E 통과** (B-2.5 모달 동작)
- [ ] 사장님 최종 승인

### ❌ 실패 시
- 시나리오 1 실패: Phase 0-14 프롬프트 또는 Sonnet 4.6 호환성 재점검
- 시나리오 2 실패: B-2.5 경고 모달 UI 디버깅

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 C — Phase 1C: Vision (1일, 6단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 1-C-0: Supabase Storage 검증 ⭐ 신규! (10분)

### 목적
Phase 2에 Storage 404 이슈. Vision은 Storage 의존.

### 검증

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
SUPABASE_URL=$(grep '^SUPABASE_URL=' /root/launchpad/api/.env | cut -d= -f2 | tr -d '"')
SUPABASE_KEY=$(grep '^SUPABASE_SERVICE_KEY=' /root/launchpad/api/.env | cut -d= -f2 | tr -d '"')
curl -s -X GET "${SUPABASE_URL}/storage/v1/bucket" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "apikey: ${SUPABASE_KEY}"
EOF
```

### ✅ 케이스 1: 정상
```
[{"id":"...","name":"..."}]
```
→ Step 1-C-1로

### ❌ 케이스 2: 404 (Phase 2 이슈)
```
{"error":"Not Found"}
```
→ **임시 대안:**
- 옵션 A: 로컬 파일 시스템 (`/var/www/uploads/`)
- 옵션 B: Phase 2 Storage 디버깅 먼저
- 옵션 C: AWS S3 사용
→ 사장님 보고 + 결정

---

## 🚦 Step 1-C-1: 이미지 업로드 UI (3시간)

### ChatAgentPanel.tsx에 추가

```typescript
const [attachedImage, setAttachedImage] = useState<File | null>(null);

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('5MB 이하로!');
      return;
    }
    setAttachedImage(file);
  }
};

return (
  <div className="input-area">
    <label className="cursor-pointer p-2 hover:bg-gray-100 rounded">
      📷
      <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
    </label>
    
    {attachedImage && (
      <div className="attached-image">
        <img src={URL.createObjectURL(attachedImage)} className="w-20 h-20 object-cover" />
        <button onClick={() => setAttachedImage(null)}>✕</button>
      </div>
    )}
    
    <textarea value={input} onChange={e => setInput(e.target.value)} />
    <button onClick={sendMessage}>보내기</button>
  </div>
);
```

---

## 🚦 Step 1-C-2: Storage 업로드 API (2시간)

### `api/src/upload/upload.controller.ts` (신규)

```typescript
import { Controller, Post, UploadedFile, UseInterceptors, Req, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const filename = `${req.user.userId}_${Date.now()}_${file.originalname}`;
    
    // Step 1-C-0 결과에 따라:
    // 옵션 A: 로컬 (/var/www/uploads/)
    // 옵션 B: Supabase Storage
    // 옵션 C: S3
    
    return { url: `https://...`, filename };
  }
}
```

### 모듈 등록

```typescript
// api/src/app.module.ts
import { UploadController } from './upload/upload.controller';

@Module({
  controllers: [..., UploadController],
})
```

---

## 🚦 Step 1-C-3: Vision API 호출 (3시간)

### chat-agent.service.ts 메서드 추가

```typescript
async analyzeImage(imageUrl: string, userMessage: string, projectFiles: string[]): Promise<ImageAnalysis> {
  const imageResponse = await fetch(imageUrl);
  const buffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  
  const response = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: base64 },
        },
        {
          type: 'text',
          text: `사용자 메시지: "${userMessage}"

이 이미지에서 사용자가 가리키는 UI 요소 분석.
프로젝트 파일:
${projectFiles.slice(0, 30).join('\n')}

JSON:
{
  "ui_element": "버튼/카드/헤더",
  "location_in_image": "좌측 상단/중앙",
  "matched_file": "src/app/page.tsx",
  "matched_component": "HealthSummaryCard",
  "confidence": 0.0~1.0,
  "reasoning": "추론 이유"
}`
        }
      ]
    }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
}
```

---

## 🚦 Step 1-C-4: tsc 검증 (5분)

---

## 🚦 Step 1-C-5: ✅ 부분 배포 + E2E (30분)

### E2E 시나리오
1. 빌더에서 캡쳐 첨부
2. "이 버튼 색깔 빨강으로" 입력
3. AI Vision 분석 → 위치 추론
4. 정확한 수정 제안

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 D — Phase 1D: 메모리 + 검증 (1일, 4단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 1-D-1: 대화 메모리 (4시간)

### memory.service.ts (이미 존재) 확장

```typescript
async summarizeConversation(projectId: string, messages: any[]): Promise<string> {
  // 긴 대화 요약 → 다음 호출 컨텍스트
}
```

---

## 🚦 Step 1-D-2: 사용자 선호 감지 (2시간)

```typescript
async detectPreferences(projectId: string, userId: string, message: string): Promise<void> {
  // "미니멀하게", "비용 신경" 등 감지
  // user_memories 테이블에 저장
}
```

---

## 🚦 Step 1-D-3: E2E 테스트 시나리오 4개 (3시간)

### 시나리오 1: 회원가입 추가 (Plan Mode)
```
"회원가입 페이지 추가해줘"
→ 추가 질문: "이메일+비번? 카카오?"
→ 답변: "이메일+비번"
→ 요구서: signup/page.tsx 추가, 1,500cr
→ [확인] → 실행
→ ✅ 페이지 생성됨
```

### 시나리오 2: 메인 로고 변경 (영향 분석)
```
"메인 로고 빨강으로"
→ search_code "logo" → 3곳 사용 발견
→ 추가 질문: "모든 페이지의 로고? 메인만?"
→ 답변: "모든 페이지"
→ 요구서: 3개 파일 수정
→ [확인] → 정확히 3곳 모두 수정
→ ✅ 초기 사고 (다른 페이지만 변경) 재발 X
```

### 시나리오 3: 모호 (재질문)
```
"디자인 더 화려하게"
→ 의도: design_change, confidence 0.4 (낮음)
→ 추가 질문 3개
→ ...
```

### 시나리오 4: 캡쳐 첨부 (Vision)
```
캡쳐 첨부 + "이 버튼 색깔"
→ Vision 분석 → 위치 추론
→ 정확한 수정
```

---

## 🚦 Step 1-D-4: ✅ 통합 검증 (1시간)

채팅 통합 전체 작동 확인.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 E — 추천 카드 UI (1.5일, 5단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 1-E-1: 개선사항 분석기 (3시간)

### `api/src/ai/improvement-analyzer.service.ts` (신규)

```typescript
@Injectable()
export class ImprovementAnalyzerService {
  async analyzeImprovements(projectId: string): Promise<Improvement[]> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const files = JSON.parse(project.generatedCode);
    
    const improvements: Improvement[] = [];
    
    for (const file of files.slice(0, 20)) {
      const analysis = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: '파일 분석 → 비개발자 친화 개선 제안',
        messages: [{
          role: 'user',
          content: `파일: ${file.path}
내용 (200줄): ${file.content.split('\n').slice(0, 200).join('\n')}

JSON:
{
  "title": "한국어 제목",
  "category": "design" | "feature" | "quality" | "data",
  "category_emoji": "🎨" | "⚡" | "🔧" | "📊",
  "changes": ["변경 1", "변경 2"],
  "unchanged": ["변경 안 됨 1"],
  "estimated_credits": 1000,
  "estimated_time_seconds": 30,
  "model_tier": "fast" | "smart" | "pro",
  "skip_reason": null
}`
        }],
      });
      
      const text = analysis.content[0].type === 'text' ? analysis.content[0].text : '';
      improvements.push(JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()));
    }
    
    return improvements.filter(i => !i.skip_reason);
  }
}
```

---

## 🚦 Step 1-E-2: 카드 UI 컴포넌트 (5시간)

### `web/src/app/builder/components/ImprovementCard.tsx` (신규)

```typescript
export default function ImprovementCard({ improvement, onApply }: Props) {
  const tierColors = { fast: 'green', smart: 'yellow', pro: 'red' };
  
  return (
    <div className="improvement-card border rounded-xl p-4 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{improvement.category_emoji}</span>
        <div className="flex-1">
          <h3 className="font-bold mb-2">{improvement.title}</h3>
          
          <div className="text-sm mb-3">
            <div className="text-green-600 mb-1">
              <strong>변경 내용:</strong>
              <ul className="list-disc pl-5">
                {improvement.changes.map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
            
            {improvement.unchanged.length > 0 && (
              <div className="text-gray-500">
                <strong>변경 안 되는 것:</strong>
                <ul className="list-disc pl-5">
                  {improvement.unchanged.map(u => <li key={u}>{u}</li>)}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 mb-3 text-sm">
            <span className={`px-2 py-1 rounded bg-${tierColors[improvement.model_tier]}-500 text-white`}>
              {improvement.model_tier.toUpperCase()}
            </span>
            <span>💰 {improvement.estimated_credits}cr</span>
            <span>⏱️ {improvement.estimated_time_seconds}초</span>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => onApply(improvement)} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold">
              ✅ 개선하기
            </button>
            <button className="px-4 py-2 border rounded">건너뛰기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚦 Step 1-E-3: 적용 + 1-클릭 롤백 (3시간)

```typescript
async applyImprovement(improvement: Improvement) {
  // 1. 새 버전 저장 (versions 시스템)
  // 2. ChatAgentService로 코드 수정
  // 3. 빌드 트리거
  // 4. 결과: ✅ 완료! [변경 내용] [다른 방향] [이전으로 되돌리기]
}

async rollbackVersion(projectId: string, version: number) {
  // versions 배열에서 이전 코드 복원
  // 크레딧 환불 X (사장님 정책!)
}
```

---

## 🚦 Step 1-E-4: tsc 검증

---

## 🚦 Step 1-E-5: ✅ 부분 배포 + E2E

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 F — 한국어/영어 토글 (1.5일, 6단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 1-F-1: i18n 인프라 (2시간)

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/web"
npm install next-intl
```

---

## 🚦 Step 1-F-2: LanguageContext + Toggle (3시간)

### 다크모드 코드 그대로 복사 → Language로 변경

`web/src/contexts/LanguageContext.tsx` (신규, ThemeContext.tsx 복사)
`web/src/components/LanguageToggle.tsx` (신규, ThemeToggle.tsx 복사)

```typescript
// LanguageToggle.tsx
const [lang, setLang] = useState<'ko' | 'en'>('ko');

useEffect(() => {
  const saved = localStorage.getItem('foundry_language');
  if (saved) setLang(saved as 'ko' | 'en');
  else {
    const browserLang = navigator.language;
    setLang(browserLang.startsWith('ko') ? 'ko' : 'en');
  }
}, []);

const toggle = () => {
  const next = lang === 'ko' ? 'en' : 'ko';
  setLang(next);
  localStorage.setItem('foundry_language', next);
};

return (
  <button onClick={toggle}>
    {lang === 'ko' ? '🇰🇷 KO' : '🇺🇸 EN'}
  </button>
);
```

---

## 🚦 Step 1-F-3: 텍스트 추출 + 번역 (5시간)

### Step 1-F-3-A: 텍스트 추출

모든 페이지의 한국어 텍스트 → `web/messages/ko.json`

```json
{
  "header": {
    "start": "시작하기",
    "pricing": "가격",
    "credits": "크레딧 충전"
  },
  "builder": {
    "creating": "앱 생성 중입니다!",
    "complete": "앱 생성 완료!",
    "warning_banner": "🚨 앱 생성 중입니다! ..."
  }
}
```

### Step 1-F-3-B: 번역 (Claude Code로 무료!)

**사장님이 자비스에게:**
```
ko.json을 영어로 번역해서 en.json 만들어줘.
- SaaS 비개발자 친화 영어
- 자연스러운 표현
- 기술 용어는 표준 사용
```

→ Claude Code가 직접 번역 → 비용 0!

### Step 1-F-3-C: 컴포넌트에 t() 적용

```typescript
const t = useTranslations();
<button>{t('header.start')}</button>
```

---

## 🚦 Step 1-F-4: AI 시스템 프롬프트 다국어 (10분)

### chat-agent.service.ts (이미 language 파라미터 받음)

```typescript
private getSystemPrompt(projectInfo: any, language: 'ko' | 'en' = 'ko') {
  const lang = language === 'ko' ? '한국어' : 'English';
  return `... 응답 언어: ${lang} ...`;
}
```

### 컨트롤러 + 프론트에서 language 전달

```typescript
// 프론트
const lang = localStorage.getItem('foundry_language') || 'ko';
authFetch('/ai/chat-agent', {
  method: 'POST',
  body: JSON.stringify({ ...body, language: lang }),
});
```

---

## 🚦 Step 1-F-5: tsc 검증

---

## 🚦 Step 1-F-6: ✅ 부분 배포 + E2E

### E2E 시나리오
1. 한국어 모드 → 영어 토글
2. UI 텍스트 즉시 변경
3. AI 채팅 영어 입력 → 영어 응답
4. AI 채팅 한국어 입력 → 한국어 응답

---

# 🆘 Phase 1 비상 롤백

## 작업 단위 롤백
```bash
git revert <작업 커밋>
git push origin main
```

## Phase 1 전체 롤백
```bash
git reset --hard backup-before-phase0
git push origin main --force  # 사장님 승인!
```

## 트리거
- 채팅 응답 5회 연속 실패
- 비용 폭증 (시간당 $10+)
- API 에러율 30%+
- 사용자 클레임

---

# ✅ Phase 1 완료 체크리스트

## 작업 A (Agent SDK)
- [ ] 1-A-0. SDK 존재 검증 ⭐
- [ ] 1-A-1. tool_use 응답 검증 ⭐
- [ ] 1-A-2. 충돌 확인
- [ ] 1-A-3. ChatAgentService 생성
- [ ] 1-A-4. 시스템 프롬프트
- [ ] 1-A-5. 도구 정의
- [ ] 1-A-6. chat 메서드
- [ ] 1-A-7. 컨트롤러
- [ ] 1-A-8. 모듈 등록
- [ ] 1-A-9. tsc
- [ ] 1-A-10. 배포 + E2E

## 작업 B (Plan Mode)
- [ ] 1-B-1. 의도 분류기
- [ ] 1-B-2. 추가 질문 생성기
- [ ] 1-B-3. 요구서 정리기
- [ ] 1-B-4. 확인 모달
- [ ] 1-B-5. tsc
- [ ] 1-B-6. 배포 + E2E

## 작업 C (Vision)
- [ ] 1-C-0. Storage 검증 ⭐
- [ ] 1-C-1. 업로드 UI
- [ ] 1-C-2. Storage API
- [ ] 1-C-3. Vision API
- [ ] 1-C-4. tsc
- [ ] 1-C-5. 배포 + E2E

## 작업 D (메모리)
- [ ] 1-D-1. 대화 메모리
- [ ] 1-D-2. 선호 감지
- [ ] 1-D-3. E2E 4개
- [ ] 1-D-4. 통합 검증

## 작업 E (카드 UI)
- [ ] 1-E-1. 분석기
- [ ] 1-E-2. 카드 UI
- [ ] 1-E-3. 적용 + 롤백
- [ ] 1-E-4. tsc
- [ ] 1-E-5. 배포 + E2E

## 작업 F (글로벌)
- [ ] 1-F-1. i18n
- [ ] 1-F-2. Toggle
- [ ] 1-F-3. 번역 (Claude Code)
- [ ] 1-F-4. AI 다국어
- [ ] 1-F-5. tsc
- [ ] 1-F-6. 배포 + E2E

## 운영
- [ ] 24시간 모니터링 정상
- [ ] PM2 < 1.5GB
- [ ] 에러율 < 5%
- [ ] 사용자 클레임 0건

---

# 🚨 자비스 절대 금지 (Phase 1)

1. **외부 라이브러리 가정 X** (npm view 확인)
2. **tool_use 응답 형식 가정 X** (실제 호출)
3. **기존 채팅 코드 수정 X** (신규 파일만)
4. **사용자 동의 없이 수정 X**
5. **5,000cr+ 자동 진행 X** (강제 추가 확인)
6. **각 작업 끝나면 부분 배포 + E2E 필수**

---

**작성:** 자비스 mk9+ (2026-04-17 v2)
**핵심:** 단계별 검증 + 부분 배포 + 자비스 추측 금지
