import { Injectable, Logger } from '@nestjs/common';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';
import { ProjectPersistenceService } from './project-persistence.service';
import { AgentDeployService } from './agent-deploy.service';
import { SessionStoreService } from './session-store.service';
import { AnswerParserService } from './answer-parser.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma.service';
import {
  AgentStreamEvent,
  AGENT_MAX_ITERATIONS,
} from './stream-event.types';
import { adaptSDKMessage } from './sdk-message-adapter';
import { createFoundryMcpServer, FOUNDRY_MCP_TOOL_NAMES } from './sdk-tools';

// Day 1 범위: 최소 SDK Agent 루프 POC
//   - query() 호출 + async iterator → SSE 이벤트 변환
//   - 빌트인 도구만 사용 (Read/Write/Edit/Bash/Glob/Grep)
//   - systemPrompt.preset + excludeDynamicSections 로 캐시 공유 극대화
//   - 기존 memoryService / Supabase / deploy / AskUser 는 Day 2~3 에서 연결
//   - feature flag: AGENT_SDK_ENABLED=true 시에만 controller 가 이쪽 라우팅

const MODEL = 'claude-sonnet-4-6';

export type AgentSdkInput = {
  userId: string | number;
  prompt: string;
  projectId?: string;                       // Day 4 에서 resume 기반 재구성 (Day 1 은 무시)
  onEvent: (event: AgentStreamEvent) => void;
};

@Injectable()
export class AgentBuilderSdkService {
  private readonly logger = new Logger(AgentBuilderSdkService.name);

  constructor(
    private readonly sandbox: SandboxService,
    private readonly promptLoader: PromptLoaderService,
    private readonly persistence: ProjectPersistenceService,
    private readonly agentDeploy: AgentDeployService,
    private readonly supabase: SupabaseService,
    private readonly sessionStore: SessionStoreService,
    private readonly answerParser: AnswerParserService,
    private readonly prisma: PrismaService,
  ) {}

  async runWithSDK(input: AgentSdkInput): Promise<void> {
    const { userId, prompt, onEvent } = input;
    const start = Date.now();

    // 1. 샌드박스 세션 (기존 SandboxService 재사용)
    const { sessionId, cwd } = await this.sandbox.createSession(userId);

    // 2. 파운더리 고유 system prompt (agent-core + intent + vague + selection)
    //    SDK 기본 Claude Code preset 뒤에 append 하여 두 가지 모두 활용
    const foundrySystemPrompt = await this.promptLoader.getSystemPrompt();

    // 3. adapter 컨텍스트
    const sessionIdRef = { value: sessionId };
    const iterRef = { value: 0 };
    const totalCostRef = { value: 0 };

    // SDK 의 system.init 가 실제 UUID 를 주기 전까지 sandbox sessionId 로 대체
    onEvent({ type: 'start', sessionId, cwd });

    // 파운더리 커스텀 도구 4개를 MCP SDK server 로 묶음 (세션별 context)
    const foundryMcp = createFoundryMcpServer(
      {
        sandbox: this.sandbox,
        supabase: this.supabase,
        agentDeploy: this.agentDeploy,
        persistence: this.persistence,
        prisma: this.prisma,
        sessionStore: this.sessionStore,
        answerParser: this.answerParser,
      },
      {
        userId: String(userId),
        projectId: input.projectId,
        userPrompt: prompt,
        cwd,
        sandboxSessionId: sessionId,
        onEvent,
      },
    );

    try {
      const q = query({
        prompt,
        options: {
          model: MODEL,
          cwd,
          maxTurns: AGENT_MAX_ITERATIONS,
          allowedTools: [
            'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
            ...FOUNDRY_MCP_TOOL_NAMES,
          ],
          mcpServers: { foundry: foundryMcp },
          permissionMode: 'bypassPermissions',
          // SDK 타입 정의 (sdk.d.ts:L1417) 공식 명시:
          //   Must be set to 'true' when using permissionMode: 'bypassPermissions'
          allowDangerouslySkipPermissions: true,
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: foundrySystemPrompt,
            // cwd/git/date/memory 를 system → first user 로 이동 → 크로스 세션 캐시 공유
            excludeDynamicSections: true,
          },
          settingSources: [],  // 파운더리는 자체 프롬프트 체계 → 프로젝트 CLAUDE.md 간섭 방지
        },
      });

      for await (const sdkMsg of q) {
        const evs = adaptSDKMessage(sdkMsg, {
          start,
          sessionIdRef,
          iterRef,
          totalCostRef,
          onCostLog: (line) => this.logger.log(line),
        });
        for (const ev of evs) {
          // Day 1 은 start 를 sandbox sessionId 로 이미 방출했으므로 SDK 의 start 는 스킵
          if (ev.type === 'start') continue;
          onEvent(ev);
        }
      }

      // 세션 전체 [cost] 요약 (admin 파싱 호환)
      this.logger.log(
        `[cost] session=${sessionIdRef.value.slice(0, 8)} END ` +
          `userId=${userId ?? 'anon'} ` +
          `projectId=${input.projectId ?? 'none'} ` +
          `iter=${iterRef.value} total=$${totalCostRef.value.toFixed(6)} ` +
          `durationMs=${Date.now() - start} ` +
          `via=SDK`,
      );
    } catch (err: any) {
      this.logger.error(`[agent-sdk] 실패: ${err?.message}`, err?.stack);
      onEvent({
        type: 'error',
        message: err?.message ?? String(err),
        where: 'runWithSDK',
      });
    } finally {
      // AskUser 대기 중인 pending 을 정리 (세션 종료 시 Promise leak 방지)
      this.sessionStore.cancelSession(sessionId, 'runWithSDK 종료');
    }
  }
}
