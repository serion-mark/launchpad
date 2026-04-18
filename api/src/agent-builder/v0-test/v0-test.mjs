// Day 0 V-0 — Agent SDK 실존 검증 (15분, $0.10 예상)
// 목표: query() 호출 가능 + 응답 수신 확인
// 격리: agent-builder/ 디렉토리 내 일회용 검증 스크립트

import { query } from "@anthropic-ai/claude-agent-sdk";

console.log("🧪 Day 0 V-0 — Agent SDK 실존 검증");
console.log("📦 SDK: @anthropic-ai/claude-agent-sdk@0.2.114");
console.log("🎯 목표: query() 호출 + 응답 메시지 스트림 수신\n");

const startTime = Date.now();
let messageCount = 0;
let lastMessage = null;
const typeCounts = {};

try {
  const q = query({
    prompt:
      "Reply with exactly: 'V-0 PASSED'. Do not call any tools.",
    options: {
      maxTurns: 1,
    },
  });

  for await (const message of q) {
    messageCount++;
    const t = message.type || "unknown";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
    lastMessage = message;
    console.log(`[${messageCount}] type=${t}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ V-0 통과`);
  console.log(`   총 메시지: ${messageCount}`);
  console.log(`   type별: ${JSON.stringify(typeCounts)}`);
  console.log(`   소요: ${elapsed}s`);

  if (lastMessage?.type === "result") {
    console.log(`   ✓ result 메시지 수신`);
    if (lastMessage.result)
      console.log(`   응답: ${String(lastMessage.result).slice(0, 300)}`);
    if (lastMessage.total_cost_usd !== undefined)
      console.log(`   💰 비용: $${lastMessage.total_cost_usd}`);
    if (lastMessage.duration_ms)
      console.log(`   ⏱️  latency: ${lastMessage.duration_ms}ms`);
    if (lastMessage.usage)
      console.log(`   📊 토큰: ${JSON.stringify(lastMessage.usage)}`);
    if (lastMessage.num_turns !== undefined)
      console.log(`   🔄 turns: ${lastMessage.num_turns}`);
  }
  process.exit(0);
} catch (err) {
  console.error("\n❌ V-0 실패");
  console.error(err);
  process.exit(1);
}
