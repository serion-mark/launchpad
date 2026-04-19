// Day 1 Gate — Agent loop이 실제로 도구 호출 루프를 돌리는가?
// 검증: "hello.txt 만들고 hi 써줘, Read로 확인" → Write + Read 최소 2회 + Bash 1회 = 3회 이상

import { SandboxService } from '../sandbox.service';
import { AgentBuilderService } from '../agent-builder.service';
import { PromptLoaderService } from '../prompt-loader.service';
import { SessionStoreService } from '../session-store.service';
import { AnswerParserService } from '../answer-parser.service';
import type { AgentStreamEvent } from '../stream-event.types';

// 테스트용 stub persistence — DB 접근 없이 no-op
const stubPersistence = {
  startProject: async () => ({ ok: false as const, reason: 'test-stub' }),
  finishProject: async () => ({ ok: false as const, reason: 'test-stub' }),
  persist: async () => ({ ok: false as const, reason: 'test-stub' }),
} as any;

async function main() {
  console.log('🧪 Day 1 Gate — Agent loop 도구 호출 검증\n');

  const sandbox = new SandboxService();
  const promptLoader = new PromptLoaderService();
  await promptLoader.load();
  const sessionStore = new SessionStoreService();
  const parser = new AnswerParserService();
  const stubSupabase = { provisionForProject: async () => ({ success: false, error: 'stub' }) } as any;
  const stubDeploy = { deployTrial: async () => null } as any;
  const stubTranslator = { translate: () => null, sanitizeOutput: (s: string) => s } as any;
  const stubAgentDeploy = { deployAgent: async () => ({ ok: false as const, error: 'stub', stage: 'stub' }) } as any;
  const stubPrisma = { project: { findUnique: async () => null } } as any;
  const service = new AgentBuilderService(sandbox, promptLoader, sessionStore, parser, stubPersistence, stubSupabase, stubDeploy, stubTranslator, stubAgentDeploy, stubPrisma);

  const events: AgentStreamEvent[] = [];
  const start = Date.now();

  await service.run({
    userId: 'day1-test',
    prompt:
      "다음 작업을 순서대로 수행해줘. 질문하지 말고 바로 실행.\n" +
      "1. Write 도구로 hello.txt 파일을 만들고 내용을 'hi from agent' 로 써라.\n" +
      "2. Read 도구로 hello.txt 내용을 읽어서 확인해라.\n" +
      "3. Bash 도구로 'ls -la' 실행해서 파일 목록을 확인해라.\n" +
      "작업 완료 후 결과를 한 줄로 보고해라.",
    onEvent: (e) => {
      events.push(e);
      const tag = e.type.padEnd(16);
      if (e.type === 'tool_call') {
        console.log(`[${tag}] ${e.name}  input=${JSON.stringify(e.input).slice(0, 80)}`);
      } else if (e.type === 'tool_result') {
        const preview = e.output.slice(0, 80).replace(/\n/g, ' ');
        console.log(`[${tag}] ok=${e.ok} ${e.durationMs}ms — ${preview}`);
      } else if (e.type === 'assistant_text') {
        console.log(`[${tag}] ${e.text.slice(0, 100)}`);
      } else if (e.type === 'iteration') {
        console.log(`[${tag}] iter=${e.n} stop=${e.stopReason}`);
      } else if (e.type === 'start') {
        console.log(`[${tag}] cwd=${e.cwd}`);
      } else if (e.type === 'complete') {
        console.log(`[${tag}] iters=${e.totalIterations} cost=$${e.totalCostUsd} ${e.durationMs}ms`);
      } else if (e.type === 'error') {
        console.log(`[${tag}] ${e.message}`);
      }
    },
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const toolCalls = events.filter((e) => e.type === 'tool_call');
  const toolResults = events.filter((e) => e.type === 'tool_result');
  const errors = events.filter((e) => e.type === 'error');
  const toolNames = new Set(toolCalls.map((e: any) => e.name));
  const okResults = toolResults.filter((e: any) => e.ok).length;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Day 1 Gate 결과 (${elapsed}s)`);
  console.log(`   도구 호출 수:  ${toolCalls.length}`);
  console.log(`   성공:          ${okResults}`);
  console.log(`   사용된 도구:   ${Array.from(toolNames).join(', ')}`);
  console.log(`   에러:          ${errors.length}`);

  const pass =
    toolCalls.length >= 3 &&
    okResults >= 3 &&
    errors.length === 0 &&
    toolNames.has('Write') &&
    toolNames.has('Read');

  if (pass) {
    console.log('\n✅ Day 1 GATE 통과');
    process.exit(0);
  } else {
    console.log('\n❌ Day 1 GATE 실패');
    console.log(`   조건: toolCalls >= 3 && okResults >= 3 && errors === 0 && Write+Read 포함`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('🔥 실행 중 예외:', err);
  process.exit(2);
});
