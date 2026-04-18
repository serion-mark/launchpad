// Day 3 Gate — 종합 카드 pause/resume + 답변 파서 3중 입력 검증
//
// Part A: AnswerParser 단위 테스트 (LLM 호출 없음)
// Part B: Agent AskUser → 답변 주입 → Agent 재개 통합 검증 (1회 LLM 호출)

import { SandboxService } from '../sandbox.service';
import { AgentBuilderService } from '../agent-builder.service';
import { PromptLoaderService } from '../prompt-loader.service';
import { SessionStoreService } from '../session-store.service';
import { AnswerParserService } from '../answer-parser.service';
import type { CardRequest, AgentStreamEvent } from '../stream-event.types';

// ── Part A: 파서 단위 테스트 ───────────────────────────

function makeCard(): CardRequest {
  return {
    pendingId: 'p1',
    title: '미용실 예약앱 만들어드릴게요!',
    questions: [
      {
        id: 'benchmarkSites',
        question: '참고할 사이트 있나요?',
        options: [
          { num: 1, label: '없음', value: 'none' },
          { num: 2, label: '카카오헤어샵', value: 'kakao-hairshop' },
          { num: 3, label: '네이버 예약', value: 'naver-booking' },
        ],
      },
      {
        id: 'designRef',
        question: '디자인 톤?',
        options: [
          { num: 1, label: '모던 화이트', value: 'modern-white' },
          { num: 2, label: '핑크 우아', value: 'pink-elegant' },
          { num: 3, label: '다크 럭셔리', value: 'dark-luxury' },
        ],
      },
    ],
    assumed: { corePages: '시술목록, 예약폼, 캘린더' },
    inputHint: '번호("1, 2") 또는 자연어로 편하게',
    quickStart: { label: '추정값 그대로 시작 →', value: 'DEFAULT_ALL' },
    allowFreeText: true,
  };
}

type ParserCase = {
  name: string;
  input: string;
  expectKind: 'default_all' | 'numbers' | 'free_text';
  expectPicks?: Record<string, number>; // id → num
};

const PARSER_CASES: ParserCase[] = [
  { name: '"시작" 키워드', input: '시작', expectKind: 'default_all' },
  { name: '"ㄱㄱ" 키워드', input: 'ㄱㄱ', expectKind: 'default_all' },
  { name: '빈 입력', input: '', expectKind: 'default_all' },
  { name: '"그대로"', input: '그대로', expectKind: 'default_all' },
  {
    name: '번호 "1, 2"',
    input: '1, 2',
    expectKind: 'numbers',
    expectPicks: { benchmarkSites: 1, designRef: 2 },
  },
  {
    name: '번호 "3 1" (공백)',
    input: '3 1',
    expectKind: 'numbers',
    expectPicks: { benchmarkSites: 3, designRef: 1 },
  },
  {
    name: '단일 번호 "2"',
    input: '2',
    expectKind: 'numbers',
    expectPicks: { benchmarkSites: 2 },
  },
  { name: '자연어 "야놀자 스타일"', input: '야놀자 스타일', expectKind: 'free_text' },
  { name: '자연어 "모던하게 해줘"', input: '모던하게 해줘', expectKind: 'free_text' },
];

function runParserTests(parser: AnswerParserService): { pass: number; fail: number } {
  console.log('\n━━ Part A: AnswerParser 단위 테스트 ━━');
  let pass = 0;
  let fail = 0;
  const card = makeCard();

  for (const c of PARSER_CASES) {
    const result = parser.parse(c.input, card);
    let ok = result.kind === c.expectKind;
    const detail: string[] = [];

    if (c.expectPicks && result.kind === 'numbers') {
      for (const [id, expectedNum] of Object.entries(c.expectPicks)) {
        const got = result.picks[id]?.num;
        if (got !== expectedNum) {
          ok = false;
          detail.push(`${id} 기대=${expectedNum} 실제=${got}`);
        }
      }
    }

    if (ok) {
      console.log(`  ✓ ${c.name.padEnd(25)} → ${result.kind}`);
      pass++;
    } else {
      console.log(`  ✗ ${c.name.padEnd(25)} → ${result.kind} (기대 ${c.expectKind}) ${detail.join(', ')}`);
      fail++;
    }
  }
  console.log(`\n  파서 ${pass} pass / ${fail} fail`);
  return { pass, fail };
}

// ── Part B: pause/resume 통합 ───────────────────────────

async function runIntegration(
  service: AgentBuilderService,
  sessionStore: SessionStoreService,
): Promise<{ pass: boolean; reasons: string[] }> {
  console.log('\n━━ Part B: AskUser pause/resume 통합 ━━');

  const events: AgentStreamEvent[] = [];
  let sessionId = '';
  let cardReceivedAt = 0;
  let answerInjectedAt = 0;

  await service.run({
    userId: 'day3-integration',
    prompt:
      '미용실 예약앱 만들어줘. 실제 파일은 아직 만들지 마. ' +
      '먼저 참고 사이트 + 디자인 톤을 확인하고 싶으니 AskUser 도구를 써서 ' +
      '종합 카드로 한 번에 물어봐. 2가지 질문만. 답변 받으면 "답변 감사합니다" 한 줄로 끝.',
    onEvent: (e) => {
      events.push(e);
      const tag = e.type.padEnd(16);
      if (e.type === 'start') {
        sessionId = e.sessionId;
        console.log(`  [${tag}] sessionId=${sessionId.slice(0, 8)}...`);
      } else if (e.type === 'tool_call') {
        console.log(`  [${tag}] ${e.name}`);
      } else if (e.type === 'card_request') {
        cardReceivedAt = Date.now();
        console.log(`  [${tag}] 카드 ${e.card.questions.length}개 질문, 번호=${e.card.pendingId.slice(0, 6)}...`);
        // 300ms 후 "시작" 자동 주입 (default_all)
        setTimeout(() => {
          const result = sessionStore.submitAnswer(sessionId, e.card.pendingId, '시작');
          answerInjectedAt = Date.now();
          console.log(`  [inject         ] "시작" 주입 → ${JSON.stringify(result)}`);
        }, 300);
      } else if (e.type === 'card_answered') {
        console.log(`  [${tag}] ${e.answerSummary}`);
      } else if (e.type === 'assistant_text') {
        console.log(`  [${tag}] ${e.text.slice(0, 80)}`);
      } else if (e.type === 'iteration') {
        console.log(`  [${tag}] iter=${e.n} stop=${e.stopReason}`);
      } else if (e.type === 'complete') {
        console.log(`  [${tag}] iters=${e.totalIterations} cost=$${e.totalCostUsd} ${e.durationMs}ms`);
      } else if (e.type === 'error') {
        console.log(`  [${tag}] ${e.message}`);
      }
    },
  });

  const reasons: string[] = [];
  let pass = true;

  const cardEvent = events.find((e) => e.type === 'card_request');
  if (!cardEvent) {
    pass = false;
    reasons.push('card_request 이벤트 미발생 (Agent가 AskUser 호출 안 함)');
  }

  const answeredEvent = events.find((e) => e.type === 'card_answered');
  if (!answeredEvent) {
    pass = false;
    reasons.push('card_answered 이벤트 미발생 (pause/resume 실패)');
  }

  const completeEvent = events.find((e) => e.type === 'complete');
  if (!completeEvent) {
    pass = false;
    reasons.push('complete 이벤트 미발생 (Agent loop 정상 종료 X)');
  }

  const errorEvents = events.filter((e) => e.type === 'error');
  if (errorEvents.length > 0) {
    pass = false;
    reasons.push(`에러 발생: ${(errorEvents[0] as any).message}`);
  }

  if (pass && cardReceivedAt && answerInjectedAt) {
    console.log(`\n  카드 수신 → 답변 주입: ${answerInjectedAt - cardReceivedAt}ms (기대 ~300ms)`);
  }

  return { pass, reasons };
}

async function main() {
  console.log('🧪 Day 3 Gate — 종합 카드 pause/resume + 파서');

  const sandbox = new SandboxService();
  const promptLoader = new PromptLoaderService();
  await promptLoader.load();
  const sessionStore = new SessionStoreService();
  const parser = new AnswerParserService();
  const service = new AgentBuilderService(sandbox, promptLoader, sessionStore, parser);

  // Part A
  const parserResult = runParserTests(parser);

  // Part B
  const integrationResult = await runIntegration(service, sessionStore);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Day 3 Gate 최종');
  console.log(`   파서 단위: ${parserResult.pass} pass / ${parserResult.fail} fail`);
  console.log(`   통합: ${integrationResult.pass ? '✅' : '❌'}`);
  if (!integrationResult.pass) {
    for (const r of integrationResult.reasons) console.log(`     - ${r}`);
  }

  const allPass = parserResult.fail === 0 && integrationResult.pass;
  if (allPass) {
    console.log('\n✅ Day 3 GATE 통과');
    process.exit(0);
  } else {
    console.log('\n❌ Day 3 GATE 실패');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('🔥 예외:', err);
  process.exit(2);
});
