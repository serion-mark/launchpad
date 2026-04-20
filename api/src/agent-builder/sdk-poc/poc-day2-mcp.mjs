// Day 2 mock E2E — mcpServers 주입 검증
//
// 실제 Supabase API + 파운더리 서버(/var/www/apps, PM2, nginx) 는 로컬에서 작동 X.
// 따라서 Day 2 게이트는:
//   (1) createSdkMcpServer + tool() 이 에러 없이 생성됨
//   (2) query() options.mcpServers 주입 시 init 메시지의 tools 배열에
//       'mcp__foundry__*' 가 포함됨 (SDK 가 도구를 인식했다는 증거)
//   (3) Agent 가 MCP 도구 이름을 프롬프트 지시 시 실제로 호출 시도함
// 실제 도구 실행 검증은 Day 6 staging 에서.

import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, '../../..');

console.log('🧪 Day 2 mock E2E — mcpServers 주입 검증\n');

// Mock foundry tool — 호출 시 즉시 "ok" 반환 (부작용 0)
const mockProbe = tool(
  'probe',
  'Day 2 검증용 mock 도구. 호출 시 즉시 ok 를 반환한다.',
  { note: z.string().describe('임의 메모') },
  async ({ note }) => ({
    content: [{ type: 'text', text: `mock-probe-ok: ${note}` }],
  }),
);

const mockMcp = createSdkMcpServer({
  name: 'foundry',
  version: '0.0.1-test',
  tools: [mockProbe],
});

console.log('✅ createSdkMcpServer 성공 (tools=1)');
console.log('   name:', mockMcp.name);
console.log('   type:', mockMcp.type);
console.log('   instance 존재:', !!mockMcp.instance);

const ctx = { iter: 0, sessionId: null };
const initTools = [];
let probeCalled = false;
let probeResult = null;

try {
  const q = query({
    prompt:
      'Call the tool named "mcp__foundry__probe" with note="day2-test" and then stop.',
    options: {
      model: 'claude-sonnet-4-6',
      cwd: apiDir,
      maxTurns: 5,
      allowedTools: ['mcp__foundry__probe'],
      mcpServers: { foundry: mockMcp },
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: 'You are a test POC. Follow the user instruction literally.',
        excludeDynamicSections: true,
      },
      settingSources: [],
    },
  });

  for await (const msg of q) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      ctx.sessionId = msg.session_id;
      initTools.push(...(msg.tools || []));
      console.log(`\n[init] session=${msg.session_id?.slice(0, 8)} tools=${msg.tools?.length}`);
      const mcpTools = (msg.tools || []).filter((t) => String(t).startsWith('mcp__'));
      console.log(`   mcp__ 도구들: ${JSON.stringify(mcpTools)}`);
    } else if (msg.type === 'assistant') {
      for (const b of msg.message?.content || []) {
        if (b.type === 'tool_use') {
          console.log(`[tool_use] ${b.name}(${JSON.stringify(b.input).slice(0, 80)})`);
          if (b.name === 'mcp__foundry__probe') probeCalled = true;
        } else if (b.type === 'text') {
          console.log(`[text] "${b.text.slice(0, 80)}"`);
        }
      }
    } else if (msg.type === 'user') {
      for (const b of msg.message?.content || []) {
        if (b.type === 'tool_result') {
          const out = typeof b.content === 'string' ? b.content : (b.content || []).map((c) => c.text || '').join('');
          console.log(`[tool_result] ${out.slice(0, 120)}`);
          if (out.includes('mock-probe-ok')) probeResult = out;
        }
      }
    } else if (msg.type === 'result') {
      console.log(`\n[result] subtype=${msg.subtype} turns=${msg.num_turns} cost=$${msg.total_cost_usd}`);
    }
  }
} catch (err) {
  console.error('❌ 실패:', err?.message || err);
  process.exit(1);
}

console.log('\n🚦 Day 2 검증 게이트');
const gate1 = initTools.some((t) => t === 'mcp__foundry__probe');
const gate2 = probeCalled;
const gate3 = !!probeResult;

console.log(`   [1] init.tools 에 mcp__foundry__probe 등장: ${gate1 ? '✅' : '❌'}`);
console.log(`   [2] Agent 가 mcp__foundry__probe 호출: ${gate2 ? '✅' : '❌'}`);
console.log(`   [3] mock handler 응답 tool_result 반환: ${gate3 ? '✅' : '❌'}`);
if (probeResult) console.log(`       응답: "${probeResult}"`);

const allPass = gate1 && gate2 && gate3;
console.log(`\n${allPass ? '✅ Day 2 mock 게이트 전부 통과' : '❌ 일부 실패'}`);
process.exit(allPass ? 0 : 2);
