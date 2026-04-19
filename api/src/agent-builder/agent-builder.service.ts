import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';
import { SessionStoreService } from './session-store.service';
import { AnswerParserService } from './answer-parser.service';
import { ProjectPersistenceService } from './project-persistence.service';
import { AgentToolExecutor, AGENT_TOOLS } from './agent-tools';
import { SupabaseService } from '../supabase/supabase.service';
import { DeployService } from '../project/deploy.service';
import {
  AgentStreamEvent,
  AGENT_MAX_ITERATIONS,
  CardRequest,
} from './stream-event.types';

const MODEL = 'claude-sonnet-4-6';

export type AgentBuilderInput = {
  userId: string | number;
  prompt: string;
  onEvent: (event: AgentStreamEvent) => void;
};

@Injectable()
export class AgentBuilderService {
  private readonly logger = new Logger(AgentBuilderService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly sandbox: SandboxService,
    private readonly promptLoader: PromptLoaderService,
    private readonly sessionStore: SessionStoreService,
    private readonly parser: AnswerParserService,
    private readonly persistence: ProjectPersistenceService,
    private readonly supabase: SupabaseService,
    @Inject(forwardRef(() => DeployService))
    private readonly deploy: DeployService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async run(input: AgentBuilderInput): Promise<void> {
    const { userId, prompt, onEvent } = input;
    const start = Date.now();

    // 1. 샌드박스 세션 생성
    const { sessionId, cwd } = await this.sandbox.createSession(userId);
    onEvent({ type: 'start', sessionId, cwd });

    // 2. projects 껍데기 먼저 생성 (도구에서 projectId 필요)
    //    실패해도 Agent loop 은 진행 (비로그인 사용자 등)
    const startResult = await this.persistence.startProject(String(userId), prompt);
    const projectId = startResult.ok ? startResult.projectId : undefined;
    if (projectId) {
      this.logger.log(`[agent-builder] project draft ${projectId} (name=${startResult.projectName})`);
    }

    const executor = new AgentToolExecutor(this.sandbox, cwd, {
      supabase: this.supabase,
      deploy: this.deploy,
      persistence: this.persistence,
      userId: String(userId),
      projectId,
      userPrompt: prompt,
    });

    // 2. system prompt 로드 (agent-core + intent-patterns + vague-detection + selection-triggers)
    // cache_control 1h TTL 적용 — 13K+ 토큰이므로 캐시 효과 큼 (V-0 검증)
    const systemPrompt = await this.promptLoader.getSystemPrompt();

    // 3. 메시지 스택 초기화
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    let iter = 0;
    let done = false;
    let totalCostUsd = 0;

    try {
      while (!done && iter < AGENT_MAX_ITERATIONS) {
        iter++;

        const res = await this.anthropic.messages.create({
          model: MODEL,
          max_tokens: 8192,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          tools: AGENT_TOOLS as any,
          messages,
        });

        onEvent({ type: 'iteration', n: iter, stopReason: res.stop_reason ?? undefined });

        // 비용 추정 (대략 계산 — Anthropic이 usage 응답)
        if (res.usage) {
          const costInput = (res.usage.input_tokens / 1_000_000) * 3;
          const costOutput = (res.usage.output_tokens / 1_000_000) * 15;
          totalCostUsd += costInput + costOutput;
        }

        // assistant 응답 전체를 messages에 그대로 push
        messages.push({ role: 'assistant', content: res.content });

        // content block 처리
        const toolUses: Anthropic.Messages.ToolUseBlock[] = [];
        for (const block of res.content) {
          if (block.type === 'text') {
            onEvent({ type: 'assistant_text', text: block.text });
          } else if (block.type === 'tool_use') {
            toolUses.push(block);
          }
        }

        if (res.stop_reason === 'tool_use' && toolUses.length > 0) {
          // 각 tool_use 실행 + 결과를 user 메시지로 묶어서 push
          const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            onEvent({
              type: 'tool_call',
              id: tu.id,
              name: tu.name,
              input: tu.input,
            });

            // AskUser는 SSE로 카드 방출 후 사용자 답변 대기 (pause/resume)
            if (tu.name === 'AskUser') {
              const askStart = Date.now();
              const input = tu.input as any;
              const card: CardRequest = {
                pendingId: tu.id,
                title: input.title ?? '',
                questions: Array.isArray(input.questions) ? input.questions : [],
                assumed: input.assumed,
                inputHint:
                  input.inputHint ?? '번호("1, 2, 1") 또는 자연어로 편하게 말씀해주세요.',
                quickStart: {
                  label: input.quickStartLabel ?? '추정값 그대로 바로 시작 →',
                  value: 'DEFAULT_ALL',
                },
                allowFreeText: true,
              };
              onEvent({ type: 'card_request', card });

              let resultContent: string;
              let resultOk = true;
              try {
                const userRaw = await this.sessionStore.waitForAnswer(sessionId, tu.id, card);
                const parsed = this.parser.parse(userRaw, card);
                resultContent = this.parser.summarize(parsed);
                onEvent({
                  type: 'card_answered',
                  pendingId: tu.id,
                  answerSummary: parsed.message,
                });
              } catch (err: any) {
                resultContent = `[AskUser 실패] ${err?.message ?? String(err)}`;
                resultOk = false;
              }

              onEvent({
                type: 'tool_result',
                id: tu.id,
                ok: resultOk,
                output: resultContent,
                durationMs: Date.now() - askStart,
              });

              toolResultBlocks.push({
                type: 'tool_result',
                tool_use_id: tu.id,
                content: resultContent,
                is_error: !resultOk,
              });
              continue;
            }

            const result = await executor.execute(tu.name, tu.input);

            onEvent({
              type: 'tool_result',
              id: tu.id,
              ok: result.ok,
              output: result.output,
              durationMs: result.durationMs,
            });

            toolResultBlocks.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: result.output,
              is_error: !result.ok,
            });
          }
          messages.push({ role: 'user', content: toolResultBlocks });
        } else {
          // end_turn 또는 max_tokens 등
          done = true;
        }
      }

      // 프로젝트 저장 — deploy_to_subdomain 도구가 이미 호출됐다면 finishProject 는 중복 실행되지만
      // 같은 generatedCode 로 덮어쓰기이므로 무해. 도구를 안 쓴 경우 여기서만 저장됨.
      const persistResult = projectId
        ? await this.persistence.finishProject({
            userId: String(userId),
            cwd,
            userPrompt: prompt,
            projectId,
          })
        : await this.persistence.persist({
            userId: String(userId),
            cwd,
            userPrompt: prompt,
          });

      onEvent({
        type: 'complete',
        totalIterations: iter,
        totalCostUsd: Number(totalCostUsd.toFixed(6)),
        durationMs: Date.now() - start,
        projectId: projectId ?? (persistResult.ok ? persistResult.projectId : undefined),
        projectName: persistResult.ok ? persistResult.projectName : startResult.projectName,
        subdomain: persistResult.ok ? persistResult.subdomain : startResult.subdomain,
        fileCount: persistResult.ok ? persistResult.fileCount : undefined,
      });
    } catch (err: any) {
      this.logger.error(`[agent-builder] 실패: ${err?.message}`, err?.stack);
      onEvent({
        type: 'error',
        message: err?.message ?? String(err),
        where: `iter ${iter}`,
      });
    } finally {
      this.sessionStore.cancelSession(sessionId, 'run 종료');
      // Day 1은 정리하지 않음 — 검증 편의. Day 5 이후 정리 크론 추가.
      // await this.sandbox.cleanup(cwd);
    }
  }
}
