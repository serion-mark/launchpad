import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentToolExecutor } from './agent-tools';
import type { SandboxService } from './sandbox.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { AgentDeployService } from './agent-deploy.service';
import type { ProjectPersistenceService } from './project-persistence.service';
import type { PrismaService } from '../prisma.service';
import type { SessionStoreService } from './session-store.service';
import type { AnswerParserService } from './answer-parser.service';
import type { AgentStreamEvent, CardRequest } from './stream-event.types';

// Day 2 — 파운더리 커스텀 도구 3개를 SDK tool() 빌더로 포팅
//
// 빌트인 대체 가능한 5개 (Read/Write/Edit/Bash/Glob/Grep) 는 allowedTools 로 이미 허용됨.
// 여기서는 파운더리 고유 도구만 MCP SDK server 로 묶어 query() 에 주입.
//
// AskUser 는 Day 3 에서 streamInput 기반으로 고급 통합.
// Day 2 에선 빌트인 AskUserQuestion 으로 대체 또는 stub 제공 (프롬프트에서 사용 지양).
//
// 핵심 구조:
//   createFoundryMcpServer(deps, ctx)  ← 세션마다 호출 (ctx 를 클로저에 가둠)
//   → query({ mcpServers: { foundry: <return value> } })
//   → Agent 는 'mcp__foundry__provision_supabase' 같은 이름으로 호출

export type FoundryToolContext = {
  userId: string;
  projectId?: string;
  userPrompt: string;
  cwd: string;
  sandboxSessionId: string;                     // SessionStore 대기/재개용 (SDK session_id 와 다름)
  onEvent: (event: AgentStreamEvent) => void;  // card_request / card_answered SSE 방출
};

export type FoundryToolDeps = {
  sandbox: SandboxService;
  supabase: SupabaseService;
  agentDeploy: AgentDeployService;
  persistence: ProjectPersistenceService;
  prisma: PrismaService;
  sessionStore: SessionStoreService;
  answerParser: AnswerParserService;
};

/**
 * 세션마다 새 MCP server 인스턴스 생성.
 * - ctx 를 handler 클로저에 가둠 (userId/projectId 가 세션마다 다름)
 * - AgentToolExecutor 를 재사용하여 기존 로직 이중 구현 방지
 */
export function createFoundryMcpServer(
  deps: FoundryToolDeps,
  ctx: FoundryToolContext,
) {
  const executor = new AgentToolExecutor(deps.sandbox, ctx.cwd, {
    supabase: deps.supabase,
    agentDeploy: deps.agentDeploy,
    persistence: deps.persistence,
    prisma: deps.prisma,
    userId: ctx.userId,
    projectId: ctx.projectId,
    userPrompt: ctx.userPrompt,
  });

  const provisionSupabase = tool(
    'provision_supabase',
    '답지에서 "Supabase 연결" 옵션을 고른 경우에만 호출. 새 Supabase 프로젝트를 자동 생성하고 SQL 스키마를 push 한 뒤 .env.local 을 자동 작성한다. 테스트 계정 1개 자동 생성. 사용자에게 "Supabase 붙일까요?" 같은 추가 질문은 금지.',
    {
      sqlSchema: z
        .string()
        .describe('CREATE TABLE ... 형태의 풀 SQL. RLS 정책 포함.'),
    },
    async ({ sqlSchema }) => {
      const result = await executor.execute('provision_supabase', { sqlSchema });
      return {
        content: [{ type: 'text' as const, text: result.output }],
        isError: !result.ok,
      };
    },
  );

  const deployToSubdomain = tool(
    'deploy_to_subdomain',
    '답지에서 "서브도메인 배포 (1일 무료)" 옵션을 고른 경우에만 호출. 현재 sandbox 에 쌓인 코드를 projects.generatedCode 로 저장하고 SSR 배포 파이프라인(복사→npm install→next build→pm2→nginx)을 실행한다. 성공 시 HTTPS previewUrl 반환.',
    {},
    async () => {
      const result = await executor.execute('deploy_to_subdomain', {});
      return {
        content: [{ type: 'text' as const, text: result.output }],
        isError: !result.ok,
      };
    },
  );

  const checkBuild = tool(
    'check_build',
    '현재 sandbox 프로젝트에서 `npm run build` 를 실행해 빌드 가능 여부를 검증. 실패 시 에러 메시지를 받아 바로 수정하라.',
    {},
    async () => {
      const result = await executor.execute('check_build', {});
      return {
        content: [{ type: 'text' as const, text: result.output }],
        isError: !result.ok,
      };
    },
  );

  // AskUser — 답지 카드 (파운더리 독자 UX)
  //   선택지 A: 기존 SessionStore + AnswerParser 재활용. handler 안에서
  //   (1) card_request SSE 방출 → (2) 사용자가 POST /answer 전송 →
  //   (3) SessionStore 의 Promise resolve → (4) parser.summarize 결과를 tool_result 로 반환.
  //   → Agent 는 자동 재개 (SDK tool handler 가 끝날 때까지 await).
  const askUser = tool(
    'AskUser',
    '사용자에게 종합 카드로 한 번에 물어본다. 답지의 빈 칸이 여러 개일 때 사용 (꼬리 질문 금지, 원샷 1번만). 옵션마다 번호를 붙여 번호/클릭/자연어 3중 입력을 받는다. 작업 중에는 절대 사용하지 말고, 작업 시작 전에만 사용하라.',
    {
      title: z.string().describe('카드 상단 한 줄 인사'),
      questions: z
        .array(
          z.object({
            id: z.string(),
            question: z.string(),
            emoji: z.string().optional(),
            options: z.array(
              z.object({
                num: z.number(),
                label: z.string(),
                value: z.string(),
                needsInput: z.boolean().optional(),
              }),
            ),
          }),
        )
        .describe('최대 2~3개의 질문. 각 질문은 2~4개 옵션 + "기타" 포함.'),
      assumed: z
        .record(z.string(), z.string())
        .optional()
        .describe('AI 가 미리 추정한 답지 칸'),
      inputHint: z.string().describe('사용자 안내 (예: "1, 2, 1 같이 번호로")'),
      quickStartLabel: z.string().describe('"그대로 시작" 버튼 라벨'),
    },
    async (args, extra) => {
      // Anthropic SDK tool_use 는 id 를 handler 에 직접 노출하지 않음.
      // extra.toolUseId (or extra._meta) 로 접근 가능 — 방어적으로 fallback.
      const extraAny = extra as any;
      const pendingId: string =
        extraAny?.toolUseId ??
        extraAny?.tool_use_id ??
        `ask-${ctx.sandboxSessionId.slice(0, 8)}-${Date.now()}`;

      const card: CardRequest = {
        pendingId,
        title: args.title,
        questions: args.questions as CardRequest['questions'],
        assumed: args.assumed,
        inputHint: args.inputHint,
        quickStart: { label: args.quickStartLabel, value: 'DEFAULT_ALL' },
        allowFreeText: true,
      };

      ctx.onEvent({ type: 'card_request', card });

      try {
        const userRaw = await deps.sessionStore.waitForAnswer(
          ctx.sandboxSessionId,
          pendingId,
          card,
        );
        const parsed = deps.answerParser.parse(userRaw, card);
        const summary = deps.answerParser.summarize(parsed);
        ctx.onEvent({
          type: 'card_answered',
          pendingId,
          answerSummary: parsed.message,
        });
        return {
          content: [{ type: 'text' as const, text: summary }],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `[AskUser 실패] ${err?.message ?? String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return createSdkMcpServer({
    name: 'foundry',
    version: '1.0.0',
    tools: [provisionSupabase, deployToSubdomain, checkBuild, askUser],
  });
}

/**
 * query() 의 allowedTools 에 넣을 파운더리 MCP 도구 이름 목록.
 * 규칙: mcp__<server_name>__<tool_name>
 */
export const FOUNDRY_MCP_TOOL_NAMES = [
  'mcp__foundry__provision_supabase',
  'mcp__foundry__deploy_to_subdomain',
  'mcp__foundry__check_build',
  'mcp__foundry__AskUser',
];
