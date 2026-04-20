// Day 0 Z안 POC — V3 Z안 (Claude Agent SDK 재설계) 핵심 3항목 실측
//
// 검증 항목:
//   1. model: 'claude-sonnet-4-6' alias 호출 성공 여부
//   2. systemPrompt preset 구조 (type: 'preset', preset: 'claude_code', append, excludeDynamicSections)
//   3. 빌트인 Read 도구로 package.json 읽기 + cwd 옵션 동작
//
// 비용 예상: ~$0.05
// 마스터 플랜: memory/phases/20260420_PLAN_Z_AgentSDK_재설계.md Day 0

import { query } from "@anthropic-ai/claude-agent-sdk";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// api/ 를 cwd 로 설정 — Read 로 api/package.json 접근 가능
const apiDir = path.resolve(__dirname, "../../..");

console.log("🧪 Day 0 Z안 POC — 3항목 실측");
console.log("📦 SDK: @anthropic-ai/claude-agent-sdk@0.2.114");
console.log("📁 cwd:", apiDir);
console.log("🎯 1) model alias, 2) systemPrompt preset, 3) Read 도구\n");

const startTime = Date.now();
const messages = [];
const typeCounts = {};
let sessionId = null;
let lastResult = null;

try {
  const q = query({
    prompt:
      "Read api/package.json in the current working directory and tell me the package name. Respond with only the name.",
    options: {
      model: "claude-sonnet-4-6",
      cwd: apiDir,
      maxTurns: 5,
      allowedTools: ["Read"],
      permissionMode: "bypassPermissions",
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: "You are a test POC. Respond concisely.",
        excludeDynamicSections: true,
      },
    },
  });

  for await (const message of q) {
    const t = message.type || "unknown";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
    messages.push(message);

    if (t === "system" && message.subtype === "init") {
      sessionId = message.session_id;
      console.log(
        `[init] session=${sessionId?.slice(0, 8)} model=${message.model} tools=${message.tools?.length}`,
      );
    } else if (t === "assistant") {
      const contentBlocks = message.message?.content || [];
      for (const b of contentBlocks) {
        if (b.type === "text") console.log(`[assistant.text] ${b.text.slice(0, 200)}`);
        else if (b.type === "tool_use") console.log(`[assistant.tool_use] ${b.name}(${JSON.stringify(b.input).slice(0, 80)})`);
      }
    } else if (t === "user") {
      // tool_result 담김
      const content = message.message?.content || [];
      for (const b of content) {
        if (b.type === "tool_result") {
          const text = Array.isArray(b.content) ? b.content.map((c) => c.text).join("") : String(b.content);
          console.log(`[user.tool_result] ${text.slice(0, 120)}`);
        }
      }
    } else if (t === "result") {
      lastResult = message;
    } else {
      console.log(`[${t}] subtype=${message.subtype || "-"}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n📊 통계");
  console.log(`   총 메시지: ${messages.length}`);
  console.log(`   type별: ${JSON.stringify(typeCounts)}`);
  console.log(`   소요: ${elapsed}s`);
  console.log(`   세션ID: ${sessionId}`);

  if (lastResult) {
    console.log(`\n💰 비용: $${lastResult.total_cost_usd}`);
    console.log(`   turns: ${lastResult.num_turns}`);
    console.log(`   stop_reason: ${lastResult.stop_reason}`);
    console.log(`   subtype: ${lastResult.subtype}`);
    if (lastResult.usage) {
      const u = lastResult.usage;
      console.log(`   📦 cache_creation=${u.cache_creation_input_tokens} cache_read=${u.cache_read_input_tokens} in=${u.input_tokens} out=${u.output_tokens}`);
    }
    if (lastResult.result) console.log(`   최종 응답: "${String(lastResult.result).slice(0, 200)}"`);
  }

  // 게이트 판정
  console.log("\n🚦 검증 게이트");
  const gate1 = typeCounts.assistant > 0 && lastResult?.subtype === "success";
  const gate2 = lastResult?.usage?.cache_creation_input_tokens > 0;
  const toolUsed = messages.some((m) =>
    (m.message?.content || []).some((b) => b.type === "tool_use" && b.name === "Read"),
  );
  console.log(`   [1] model: 'claude-sonnet-4-6' 호출 성공: ${gate1 ? "✅" : "❌"}`);
  console.log(`   [2] systemPrompt preset 캐시 생성: ${gate2 ? "✅" : "❌"}`);
  console.log(`   [3] 빌트인 Read 도구 호출: ${toolUsed ? "✅" : "❌"}`);

  process.exit(gate1 && gate2 && toolUsed ? 0 : 2);
} catch (err) {
  console.error("\n❌ POC 실패");
  console.error(err?.message || err);
  if (err?.stack) console.error(err.stack.split("\n").slice(0, 5).join("\n"));
  process.exit(1);
}
