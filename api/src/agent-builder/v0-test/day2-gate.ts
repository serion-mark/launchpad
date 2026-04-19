// Day 2 Gate — 답지 모델 + 자연어 이해 정성 검증
// 시나리오 1: 명확한 요구 ("예쁜 미용실 예약앱") → 답지 자동 채움 + 최소 질문
// 시나리오 2: 완전 모호 ("뭐 하나 만들어줘") → 한 가지만 질문
//
// 파일 생성은 하지 않고 Agent의 "첫 응답 행동" 관찰
// (실제 앱 생성은 Day 5 E2E)

import { SandboxService } from '../sandbox.service';
import { AgentBuilderService } from '../agent-builder.service';
import { PromptLoaderService } from '../prompt-loader.service';
import { SessionStoreService } from '../session-store.service';
import { AnswerParserService } from '../answer-parser.service';
import type { AgentStreamEvent } from '../stream-event.types';

type Scenario = {
  name: string;
  prompt: string;
  expect: {
    // 도구 호출 0 (질문 단계이므로 파일 생성 X)
    maxToolCalls: number;
    // assistant_text에 반드시 포함돼야 할 단어들 (최소 1개 매칭)
    anyKeywords: string[];
    // 번호 선택지 [1] [2] 패턴 포함 여부
    shouldHaveNumberedOptions: boolean;
    // 질문 개수 상한 (너무 많이 물으면 fail)
    maxQuestions: number;
  };
};

const SCENARIOS: Scenario[] = [
  {
    name: '시나리오 1: 명확한 요구 — "예쁜 미용실 예약앱"',
    prompt:
      '예쁜 미용실 예약앱 만들고 싶어. 지금은 바로 파일을 만들지 말고, ' +
      '어떻게 진행할지와 확인할 게 있으면 한 번에 물어봐줘.',
    expect: {
      maxToolCalls: 0,
      anyKeywords: ['미용실', '예약'],
      shouldHaveNumberedOptions: true,
      maxQuestions: 3,
    },
  },
  {
    name: '시나리오 2: 완전 모호 — "뭐 하나 만들어줘"',
    prompt:
      '뭐 하나 만들어줘. 지금은 바로 파일을 만들지 말고, ' +
      '어떻게 진행할지 편하게 대화해줘.',
    expect: {
      maxToolCalls: 0,
      anyKeywords: ['어떤', '종류', '무엇', '말씀', '만드'],
      shouldHaveNumberedOptions: false, // 한 가지만 묻는 게 자연스러움 (선택지는 있어도 됨)
      maxQuestions: 2,
    },
  },
];

async function runScenario(
  service: AgentBuilderService,
  scenario: Scenario,
): Promise<{ pass: boolean; reasons: string[]; text: string; toolCalls: number }> {
  const events: AgentStreamEvent[] = [];
  const texts: string[] = [];

  await service.run({
    userId: `day2-${scenario.name.slice(0, 10)}`,
    prompt: scenario.prompt,
    onEvent: (e) => {
      events.push(e);
      if (e.type === 'assistant_text') texts.push(e.text);
    },
  });

  const toolCalls = events.filter((e) => e.type === 'tool_call').length;
  const allText = texts.join('\n').toLowerCase();

  const reasons: string[] = [];
  let pass = true;

  if (toolCalls > scenario.expect.maxToolCalls) {
    pass = false;
    reasons.push(`도구 호출 ${toolCalls} > ${scenario.expect.maxToolCalls} (질문 단계인데 파일 생성 시도)`);
  }

  const kwMatch = scenario.expect.anyKeywords.some((kw) => allText.includes(kw.toLowerCase()));
  if (!kwMatch) {
    pass = false;
    reasons.push(`핵심 키워드 미포함: ${scenario.expect.anyKeywords.join(', ')}`);
  }

  const hasNumbered = /\[\d+\]/.test(allText) || /^\s*\d+\.\s/m.test(allText);
  if (scenario.expect.shouldHaveNumberedOptions && !hasNumbered) {
    pass = false;
    reasons.push('번호 선택지 ([1] [2] / 1. 2.) 미포함');
  }

  // 질문 개수 = 마크다운 번호 헤딩 (1. 2. 3. 또는 **1. 2. 3.**) — 옵션 내 '?' 제외
  // [1] [2] 같은 옵션 번호는 섹션 구분 아님
  const sectionHeadings =
    (allText.match(/^\s*\*?\*?\d+\.\s+[^[]/gm) || []).length ||
    (allText.match(/^\*\*\d+\./gm) || []).length;
  if (sectionHeadings > scenario.expect.maxQuestions) {
    pass = false;
    reasons.push(
      `질문 섹션 ${sectionHeadings} > ${scenario.expect.maxQuestions} (한 번에 너무 많이 물음)`,
    );
  }

  return { pass, reasons, text: texts.join('\n\n'), toolCalls };
}

async function main() {
  console.log('🧪 Day 2 Gate — 답지 모델 정성 검증\n');

  const sandbox = new SandboxService();
  const promptLoader = new PromptLoaderService();
  await promptLoader.load();
  const sessionStore = new SessionStoreService();
  const parser = new AnswerParserService();
  const stubPersistence = {
    startProject: async () => ({ ok: false as const, reason: 'test-stub' }),
    finishProject: async () => ({ ok: false as const, reason: 'test-stub' }),
    persist: async () => ({ ok: false as const, reason: 'test-stub' }),
  } as any;
  const stubSupabase = { provisionForProject: async () => ({ success: false, error: 'stub' }) } as any;
  const stubDeploy = { deployTrial: async () => null } as any;
  const stubTranslator = { translate: () => null, sanitizeOutput: (s: string) => s } as any;
  const service = new AgentBuilderService(sandbox, promptLoader, sessionStore, parser, stubPersistence, stubSupabase, stubDeploy, stubTranslator);

  const results: { scenario: Scenario; pass: boolean; reasons: string[]; text: string; toolCalls: number }[] = [];

  for (const scenario of SCENARIOS) {
    console.log(`\n━━ ${scenario.name} ━━`);
    console.log(`📝 prompt: "${scenario.prompt.slice(0, 80)}..."`);
    const r = await runScenario(service, scenario);
    results.push({ scenario, ...r });

    console.log('\n[Agent 응답]');
    console.log(r.text.slice(0, 600) + (r.text.length > 600 ? '\n... (생략)' : ''));
    console.log(`\n[도구 호출: ${r.toolCalls}]`);

    if (r.pass) {
      console.log('\n✅ 통과');
    } else {
      console.log('\n❌ 실패');
      for (const reason of r.reasons) console.log(`   - ${reason}`);
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Day 2 Gate 최종');
  const passed = results.filter((r) => r.pass).length;
  console.log(`   통과: ${passed} / ${results.length}`);

  if (passed === results.length) {
    console.log('\n✅ Day 2 GATE 통과');
    process.exit(0);
  } else {
    console.log('\n❌ Day 2 GATE 실패');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('🔥 예외:', err);
  process.exit(2);
});
