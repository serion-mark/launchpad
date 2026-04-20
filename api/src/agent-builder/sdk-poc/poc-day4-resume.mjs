// Day 4 mock E2E — SDK session resume 실측
//
// 마스터 플랜 Day 4 핵심 가설:
//   "같은 projectId 로 2회차 세션 → Agent 가 1회차 맥락 정확히 참조"
//   "DB project_memories.chatSummary 업데이트 확인"
//   "cache_read_input_tokens > 0 로 캐시 공유 증명"
//
// 본 POC 는 NestJS/Prisma 없이 SDK 의 resume 자체 동작만 검증:
//   (1) 세션 1: "My favorite color is sky blue." → session_id 획득
//   (2) 세션 2: resume: <session_id1> + "What was my favorite color?"
//       → Agent 가 "sky blue" 로 정확히 응답해야 통과
//   (3) 2회차 usage.cache_read_input_tokens > 0 확인 → 캐시 공유 증명

import { query } from '@anthropic-ai/claude-agent-sdk';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, '../../..');

const BASE_OPTIONS = {
  model: 'claude-sonnet-4-6',
  cwd: apiDir,
  maxTurns: 3,
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
  systemPrompt: {
    type: 'preset',
    preset: 'claude_code',
    append: 'You are a test POC. Respond concisely.',
    excludeDynamicSections: true,
  },
  settingSources: [],
};

async function runSession(label, prompt, extraOptions = {}) {
  console.log(`\n▶️  ${label}`);
  console.log(`   prompt: "${prompt}"`);
  let sessionId = null;
  let lastResult = null;
  let assistantTexts = [];

  const q = query({
    prompt,
    options: { ...BASE_OPTIONS, ...extraOptions },
  });

  for await (const msg of q) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      sessionId = msg.session_id;
    } else if (msg.type === 'assistant') {
      for (const b of msg.message?.content || []) {
        if (b.type === 'text') assistantTexts.push(b.text);
      }
    } else if (msg.type === 'result') {
      lastResult = msg;
    }
  }
  const reply = assistantTexts.join(' ').trim();
  const u = lastResult?.usage || {};
  console.log(`   session_id: ${sessionId?.slice(0, 8)}`);
  console.log(`   assistant: "${reply.slice(0, 150)}"`);
  console.log(
    `   usage: in=${u.input_tokens || 0} out=${u.output_tokens || 0} ` +
      `cache_create=${u.cache_creation_input_tokens || 0} cache_read=${u.cache_read_input_tokens || 0}`,
  );
  console.log(`   cost: $${lastResult?.total_cost_usd}`);
  return { sessionId, reply, usage: u, cost: lastResult?.total_cost_usd };
}

console.log('🧪 Day 4 — SDK session resume 실측\n');

let s1, s2;
try {
  s1 = await runSession(
    '세션 1 (신규)',
    'Remember this fact: my favorite color is "sky blue" (한국어로는 하늘색). Just acknowledge with one short sentence.',
  );

  if (!s1.sessionId) throw new Error('session 1 session_id 없음');

  // SDK 가 세션을 디스크에 저장하는 시간을 위해 짧은 대기
  await new Promise((r) => setTimeout(r, 500));

  s2 = await runSession(
    '세션 2 (resume — 1회차 맥락 참조)',
    'What color did I tell you I like? Reply with just the color name, no extra words.',
    { resume: s1.sessionId },
  );
} catch (err) {
  console.error('\n❌ 실패:', err?.message || err);
  process.exit(1);
}

console.log('\n🚦 Day 4 검증 게이트');
const gate1 = !!s1.sessionId;
const gate2 = !!s2.sessionId;
const gate3 = /sky\s*blue|하늘색|blue/i.test(s2.reply);
const gate4 = (s2.usage.cache_read_input_tokens || 0) > 0;

console.log(`   [1] 세션 1 session_id 수신: ${gate1 ? '✅' : '❌'}`);
console.log(`   [2] 세션 2 resume 정상 시작: ${gate2 ? '✅' : '❌'}`);
console.log(`   [3] 1회차 맥락 참조 (답변에 "sky blue/하늘색/blue"): ${gate3 ? '✅' : '❌'}`);
console.log(`       세션 2 답변: "${s2.reply.slice(0, 100)}"`);
console.log(`   [4] 세션 2 cache_read_input_tokens > 0: ${gate4 ? '✅' : '❌'} (${s2.usage.cache_read_input_tokens})`);

const allPass = gate1 && gate2 && gate3 && gate4;
console.log(
  `\n${allPass ? '✅ Day 4 resume 게이트 전부 통과' : '❌ 일부 실패'}`,
);
console.log(`   총 비용: $${((s1.cost || 0) + (s2.cost || 0)).toFixed(6)}`);
process.exit(allPass ? 0 : 2);
