// Day 5 E2E — 실제 앱 빌드 시나리오 (로컬)
// 목표: AgentBuilderService가 실제로 Next.js 앱을 만들고 빌드까지 성공하는가
//
// 시나리오 선택 (CLI 인자):
//   npx ts-node day5-e2e.ts todo       — 할일 관리 앱 (선택지 없이 바로)
//   npx ts-node day5-e2e.ts reservation — 미용실 예약앱 (카드 → 시작)
//   npx ts-node day5-e2e.ts vague      — "뭐 하나 만들어줘" (카드 검증)

import { SandboxService } from '../sandbox.service';
import { AgentBuilderService } from '../agent-builder.service';
import { PromptLoaderService } from '../prompt-loader.service';
import { SessionStoreService } from '../session-store.service';
import { AnswerParserService } from '../answer-parser.service';
import type { AgentStreamEvent } from '../stream-event.types';

type Scenario = {
  id: string;
  name: string;
  prompt: string;
  autoAnswer?: string; // 카드 나오면 이걸로 자동 응답
  expectBuildSuccess: boolean;
  maxIterations?: number;
};

const SCENARIOS: Record<string, Scenario> = {
  todo: {
    id: 'todo',
    name: '시나리오 1: 할일 관리 앱 (단순, 선택지 없이)',
    prompt:
      '간단한 할일 관리 정적 HTML 앱을 만들어줘. Next.js 같은 프레임워크 쓰지 말고 index.html 한 파일로만. Tailwind는 CDN으로. ' +
      '기능: 할일 추가 / 체크 / 삭제 (localStorage 저장). 모바일 반응형. ' +
      '빌드 검증은 ls로 파일 확인 + cat으로 html 문법 대충만 확인. npm install/build 하지 말고 HTML 1개만 만들어서 완료 선언해.',
    expectBuildSuccess: true,
    maxIterations: 15,
  },
  reservation: {
    id: 'reservation',
    name: '시나리오 2: 미용실 예약앱 (카드 → 시작)',
    prompt:
      '예쁜 미용실 예약앱 정적 HTML 1 페이지로 만들어줘. Tailwind CDN. ' +
      '참고 사이트 + 디자인 톤은 AskUser 도구로 한 번만 물어봐. ' +
      '답변 받으면 바로 index.html 만들고 끝. npm 쓰지 X.',
    autoAnswer: '시작',
    expectBuildSuccess: true,
    maxIterations: 15,
  },
  vague: {
    id: 'vague',
    name: '시나리오 4: "뭐 하나" (카드 검증, 파일 X)',
    prompt: '뭐 하나 만들어줘. 지금은 파일 만들지 말고 AskUser 카드로 어떤 앱 만들지만 물어봐.',
    autoAnswer: '할일 관리 앱',
    expectBuildSuccess: false, // 작업 없으니 빌드 기대 X
    maxIterations: 5,
  },
};

async function runScenario(scenarioId: string) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) {
    console.error(`알 수 없는 시나리오: ${scenarioId}`);
    console.error(`사용 가능: ${Object.keys(SCENARIOS).join(', ')}`);
    process.exit(2);
  }

  console.log(`🧪 Day 5 E2E — ${scenario.name}\n`);

  const sandbox = new SandboxService();
  const promptLoader = new PromptLoaderService();
  await promptLoader.load();
  const sessionStore = new SessionStoreService();
  const parser = new AnswerParserService();
  const stubPersistence = {
    persist: async () => ({ ok: false as const, reason: 'test-stub' }),
  } as any;
  const stubSupabase = { provisionForProject: async () => ({ success: false, error: 'stub' }) } as any;
  const stubDeploy = { deployTrial: async () => null } as any;
  const service = new AgentBuilderService(sandbox, promptLoader, sessionStore, parser, stubPersistence, stubSupabase, stubDeploy);

  const events: AgentStreamEvent[] = [];
  let sessionId = '';
  let cwd = '';
  const start = Date.now();

  await service.run({
    userId: `e2e-${scenario.id}`,
    prompt: scenario.prompt,
    onEvent: (e) => {
      events.push(e);
      const tag = e.type.padEnd(16);
      if (e.type === 'start') {
        sessionId = e.sessionId;
        cwd = e.cwd;
        console.log(`[${tag}] ${sessionId.slice(0, 8)} cwd=${cwd}`);
      } else if (e.type === 'tool_call') {
        const input = e.input as any;
        let summary = '';
        if (e.name === 'Bash') summary = String(input.command ?? '').slice(0, 100);
        else if (e.name === 'Write') summary = `${input.path} (${String(input.content ?? '').length}b)`;
        else if (e.name === 'Read') summary = input.path ?? '';
        else if (e.name === 'AskUser') summary = `${input.questions?.length ?? 0}개 질문`;
        else summary = JSON.stringify(input).slice(0, 80);
        console.log(`[${tag}] ${e.name.padEnd(8)} ${summary}`);
      } else if (e.type === 'tool_result') {
        const preview = e.output.slice(0, 80).replace(/\n/g, ' ');
        console.log(`[${tag}] ok=${e.ok} ${e.durationMs}ms — ${preview}`);
      } else if (e.type === 'card_request') {
        console.log(`[${tag}] 카드 ${e.card.questions.length}개 질문`);
        if (scenario.autoAnswer) {
          setTimeout(() => {
            const r = sessionStore.submitAnswer(sessionId, e.card.pendingId, scenario.autoAnswer!);
            console.log(`[inject         ] "${scenario.autoAnswer}" → ${JSON.stringify(r)}`);
          }, 300);
        }
      } else if (e.type === 'card_answered') {
        console.log(`[${tag}] ${e.answerSummary}`);
      } else if (e.type === 'assistant_text') {
        console.log(`[${tag}] ${e.text.slice(0, 120).replace(/\n/g, ' ')}`);
      } else if (e.type === 'iteration') {
        console.log(`[${tag}] iter=${e.n} stop=${e.stopReason}`);
      } else if (e.type === 'complete') {
        console.log(`[${tag}] iters=${e.totalIterations} cost=$${e.totalCostUsd} ${e.durationMs}ms`);
      } else if (e.type === 'error') {
        console.log(`[${tag}] ${e.message}`);
      }
    },
  });

  // ── 결과 분석 ────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const toolCalls = events.filter((e) => e.type === 'tool_call');
  const toolResults = events.filter((e) => e.type === 'tool_result');
  const errors = events.filter((e) => e.type === 'error');
  const complete = events.find((e) => e.type === 'complete') as any;
  const cards = events.filter((e) => e.type === 'card_request');
  const toolOk = toolResults.filter((r: any) => r.ok).length;
  const toolFail = toolResults.filter((r: any) => !r.ok).length;

  // 도구별 카운트
  const toolCounts: Record<string, number> = {};
  for (const tc of toolCalls as any[]) {
    toolCounts[tc.name] = (toolCounts[tc.name] ?? 0) + 1;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 ${scenario.name}`);
  console.log(`   소요:          ${elapsed}s`);
  console.log(`   반복:          ${complete?.totalIterations ?? 0}`);
  console.log(`   도구 호출:     ${toolCalls.length} (성공 ${toolOk} / 실패 ${toolFail})`);
  console.log(`   도구별:        ${JSON.stringify(toolCounts)}`);
  console.log(`   카드 발동:     ${cards.length}회`);
  console.log(`   에러:          ${errors.length}`);
  console.log(`   💰 비용:       $${complete?.totalCostUsd ?? 0}`);
  console.log(`   cwd:           ${cwd}`);

  // ── Pass/Fail 판정 ────────────────────────
  let pass = true;
  const reasons: string[] = [];

  if (!complete) {
    pass = false;
    reasons.push('complete 이벤트 미발생');
  }
  if (errors.length > 0) {
    pass = false;
    reasons.push(`에러 ${errors.length}건: ${(errors[0] as any).message}`);
  }
  if ((complete?.totalIterations ?? 0) >= (scenario.maxIterations ?? 20)) {
    pass = false;
    reasons.push(`iteration 초과 (${complete?.totalIterations})`);
  }

  if (pass) {
    console.log(`\n✅ ${scenario.id} 통과`);
  } else {
    console.log(`\n❌ ${scenario.id} 실패`);
    for (const r of reasons) console.log(`   - ${r}`);
  }
  console.log(`\n🗂️  생성된 앱 확인: ls -la "${cwd}"`);

  process.exit(pass ? 0 : 1);
}

const id = process.argv[2] ?? 'todo';
runScenario(id).catch((err) => {
  console.error('🔥 예외:', err);
  process.exit(2);
});
