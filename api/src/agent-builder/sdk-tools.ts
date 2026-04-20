import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentToolExecutor } from './agent-tools';
import type { SandboxService } from './sandbox.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { AgentDeployService } from './agent-deploy.service';
import type { ProjectPersistenceService } from './project-persistence.service';
import type { PrismaService } from '../prisma.service';

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
};

export type FoundryToolDeps = {
  sandbox: SandboxService;
  supabase: SupabaseService;
  agentDeploy: AgentDeployService;
  persistence: ProjectPersistenceService;
  prisma: PrismaService;
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

  return createSdkMcpServer({
    name: 'foundry',
    version: '1.0.0',
    tools: [provisionSupabase, deployToSubdomain, checkBuild],
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
];
