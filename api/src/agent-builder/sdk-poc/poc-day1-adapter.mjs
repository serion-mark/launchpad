// Day 1 E2E — query() + adapter 통합 검증
//
// 마스터 플랜 Day 1 검증 게이트:
//   - POST /api/ai/agent-build-sdk 호출 → SSE 이벤트 5개 이상 정상 수신
//   - 기존 /api/ai/agent-build 와 병행 돌아감 (간섭 X)
//
// 본 스크립트는 NestJS 런타임 없이 adapter 를 직접 호출하여
// "AgentStreamEvent 가 5개 이상 생성되는가" 를 검증.
// controller/service 통합은 배포 환경에서 실측 (Day 6 staging).

import { query } from '@anthropic-ai/claude-agent-sdk';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, '../../..');

// adapter 는 TypeScript → .mjs 에서 직접 못 씀. 로직 복제 최소화 위해 핵심만 인라인.
// 실제 서비스는 agent-builder-sdk.service.ts 가 adaptSDKMessage() 호출.
function adapt(msg, ctx) {
  const events = [];
  if (msg.type === 'system' && msg.subtype === 'init') {
    ctx.sessionId = msg.session_id;
    events.push({ type: 'start', sessionId: msg.session_id, cwd: msg.cwd });
  } else if (msg.type === 'assistant') {
    ctx.iter += 1;
    events.push({ type: 'iteration', n: ctx.iter });
    for (const b of msg.message?.content || []) {
      if (b.type === 'text') events.push({ type: 'assistant_text', text: b.text });
      else if (b.type === 'tool_use') events.push({ type: 'tool_call', id: b.id, name: b.name, input: b.input });
    }
  } else if (msg.type === 'user') {
    for (const b of msg.message?.content || []) {
      if (b.type === 'tool_result') {
        const out = typeof b.content === 'string' ? b.content : (b.content || []).map(c => c.text || '').join('');
        events.push({ type: 'tool_result', id: b.tool_use_id, ok: !b.is_error, output: out.slice(0, 200), durationMs: 0 });
      }
    }
  } else if (msg.type === 'result') {
    if (msg.subtype === 'success') {
      events.push({ type: 'complete', totalIterations: msg.num_turns, durationMs: Date.now() - ctx.start });
    } else {
      events.push({ type: 'error', message: `[SDK ${msg.subtype}]`, where: `iter ${msg.num_turns}` });
    }
  }
  return events;
}

console.log('🧪 Day 1 E2E — query() + adapter 통합');
console.log('🎯 검증: SSE 이벤트 5개 이상 + 기존 이벤트 계약 호환\n');

const start = Date.now();
const ctx = { start, iter: 0, sessionId: null };
const emitted = [];

try {
  const q = query({
    prompt: 'Read api/package.json and report the package name in one word.',
    options: {
      model: 'claude-sonnet-4-6',
      cwd: apiDir,
      maxTurns: 5,
      allowedTools: ['Read'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: 'You are a test POC. Respond concisely.',
        excludeDynamicSections: true,
      },
      settingSources: [],
    },
  });

  for await (const msg of q) {
    const evs = adapt(msg, ctx);
    for (const ev of evs) {
      emitted.push(ev);
      const summary =
        ev.type === 'start'           ? `session=${ev.sessionId?.slice(0, 8)}` :
        ev.type === 'iteration'       ? `n=${ev.n}` :
        ev.type === 'assistant_text'  ? `"${ev.text.slice(0, 60)}"` :
        ev.type === 'tool_call'       ? `${ev.name}(...)` :
        ev.type === 'tool_result'     ? `ok=${ev.ok} len=${ev.output.length}` :
        ev.type === 'complete'        ? `iter=${ev.totalIterations} ms=${ev.durationMs}` :
        ev.type === 'error'           ? `"${ev.message}"` : '';
      console.log(`  [${emitted.length}] ${ev.type.padEnd(16)} ${summary}`);
    }
  }
} catch (err) {
  console.error('❌ E2E 실패:', err?.message || err);
  process.exit(1);
}

// ── 검증 게이트 ─────────────────────────────
console.log('\n🚦 Day 1 검증 게이트');
const typeCount = emitted.reduce((a, e) => ({ ...a, [e.type]: (a[e.type] || 0) + 1 }), {});
console.log(`   총 이벤트: ${emitted.length}`);
console.log(`   타입별: ${JSON.stringify(typeCount)}`);

const gate1 = emitted.length >= 5;
const gate2 = !!emitted.find(e => e.type === 'start');
const gate3 = !!emitted.find(e => e.type === 'tool_call' && e.name === 'Read');
const gate4 = !!emitted.find(e => e.type === 'complete');
const gate5 = !!emitted.find(e => e.type === 'assistant_text');

console.log(`   [1] SSE 이벤트 5개 이상: ${gate1 ? '✅' : '❌'} (${emitted.length}개)`);
console.log(`   [2] start 이벤트 수신: ${gate2 ? '✅' : '❌'}`);
console.log(`   [3] tool_call(Read) 수신: ${gate3 ? '✅' : '❌'}`);
console.log(`   [4] complete 이벤트 수신: ${gate4 ? '✅' : '❌'}`);
console.log(`   [5] assistant_text 수신: ${gate5 ? '✅' : '❌'}`);

const allPass = gate1 && gate2 && gate3 && gate4 && gate5;
console.log(`\n${allPass ? '✅ Day 1 검증 게이트 전부 통과' : '❌ 일부 실패'}`);
process.exit(allPass ? 0 : 2);
