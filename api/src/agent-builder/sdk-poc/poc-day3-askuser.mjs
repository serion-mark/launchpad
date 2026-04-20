// Day 3 mock E2E — AskUser pause/resume 시뮬레이션
//
// 실제 파운더리 흐름:
//   Agent 가 AskUser 호출 → SSE card_request 방출 → 사용자 POST /answer → SessionStore resolve → Agent 재개
//
// 본 POC 는 NestJS 런타임 없이 tool handler 레벨에서 동일 구조를 재현:
//   - handler 는 Promise 를 반환하고 외부 resolver 로 대기
//   - setTimeout 으로 "사용자 답변 도착" 시뮬레이션 (500ms 후 자동 resolve)
//   - Agent 가 tool_result 를 받고 최종 응답 생성하는지 검증

import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, '../../..');

console.log('🧪 Day 3 mock E2E — AskUser pause/resume\n');

// 외부 "사용자 답변" 시뮬레이터 — 실제론 POST /answer 가 이 역할
let pendingResolve = null;
let pendingCard = null;

// 500ms 후 자동으로 "1, 2" 응답 시뮬레이션
function scheduleAutoAnswer(answerAfterMs = 500) {
  setTimeout(() => {
    if (pendingResolve) {
      console.log(`[사용자-sim] "1, 2" 답변 전송 (${answerAfterMs}ms 경과)`);
      const parsed = `사용자 답변: [번호 선택]\n  - theme: [1] 블루\n  - feature: [2] 공유기능`;
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(parsed);
    }
  }, answerAfterMs);
}

// AskUser mock tool — 실제 구현의 await sessionStore.waitForAnswer 와 동일 구조
const askUserMock = tool(
  'AskUser',
  '답지 카드. 호출 시 pending 에 진입하고 외부 resolver 기다림.',
  {
    title: z.string(),
    questions: z.array(
      z.object({
        id: z.string(),
        question: z.string(),
        options: z.array(
          z.object({ num: z.number(), label: z.string(), value: z.string() }),
        ),
      }),
    ),
    inputHint: z.string(),
    quickStartLabel: z.string(),
  },
  async (args) => {
    console.log(`[AskUser] 호출 — title="${args.title}" 질문=${args.questions.length}개`);
    pendingCard = args;
    scheduleAutoAnswer(500);

    const summary = await new Promise((resolve) => {
      pendingResolve = resolve;
      console.log('[AskUser] 답변 대기 중...');
    });
    console.log('[AskUser] 답변 수신 → tool_result 반환');

    return { content: [{ type: 'text', text: String(summary) }] };
  },
);

const mockMcp = createSdkMcpServer({
  name: 'foundry',
  version: '0.0.1-test',
  tools: [askUserMock],
});

const emittedToolUses = [];
let cardRequestObserved = false;
let finalResult = null;

try {
  const q = query({
    prompt:
      'Call mcp__foundry__AskUser exactly once with: title="테마 선택", 2 questions each with 2 options, inputHint="번호로 입력", quickStartLabel="그대로 시작". After receiving the answer, reply with "DONE" and stop.',
    options: {
      model: 'claude-sonnet-4-6',
      cwd: apiDir,
      maxTurns: 5,
      allowedTools: ['mcp__foundry__AskUser'],
      mcpServers: { foundry: mockMcp },
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: 'You are a test POC. Follow instructions literally.',
        excludeDynamicSections: true,
      },
      settingSources: [],
    },
  });

  for await (const msg of q) {
    if (msg.type === 'assistant') {
      for (const b of msg.message?.content || []) {
        if (b.type === 'tool_use') {
          emittedToolUses.push(b.name);
          if (b.name === 'mcp__foundry__AskUser') {
            cardRequestObserved = true;
            console.log(`[Agent → tool_use] ${b.name}`);
          }
        } else if (b.type === 'text') {
          console.log(`[Agent → text] "${b.text.slice(0, 80)}"`);
        }
      }
    } else if (msg.type === 'user') {
      for (const b of msg.message?.content || []) {
        if (b.type === 'tool_result') {
          const out = typeof b.content === 'string' ? b.content : (b.content || []).map((c) => c.text || '').join('');
          console.log(`[Agent ← tool_result] ${out.slice(0, 120)}`);
        }
      }
    } else if (msg.type === 'result') {
      finalResult = msg;
    }
  }
} catch (err) {
  console.error('❌ 실패:', err?.message || err);
  process.exit(1);
}

console.log('\n🚦 Day 3 검증 게이트');
const gate1 = cardRequestObserved;
const gate2 = !!pendingCard && pendingCard.questions?.length >= 2;
const gate3 = pendingResolve === null;  // resolve 가 실행됐으면 null 로 clear 됨
const gate4 = finalResult?.subtype === 'success';

console.log(`   [1] Agent 가 mcp__foundry__AskUser 호출: ${gate1 ? '✅' : '❌'}`);
console.log(`   [2] 카드 구조 (questions >=2) 정상 전달: ${gate2 ? '✅' : '❌'}`);
console.log(`   [3] 외부 resolver 호출 완료 (pending cleared): ${gate3 ? '✅' : '❌'}`);
console.log(`   [4] Agent 답변 받고 session success 로 종료: ${gate4 ? '✅' : '❌'}`);
if (finalResult) console.log(`       turns=${finalResult.num_turns} cost=$${finalResult.total_cost_usd}`);

const allPass = gate1 && gate2 && gate3 && gate4;
console.log(`\n${allPass ? '✅ Day 3 AskUser 게이트 전부 통과' : '❌ 일부 실패'}`);
process.exit(allPass ? 0 : 2);
