import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SandboxService } from './sandbox.service';
import { AgentToolExecutor, AGENT_TOOLS } from './agent-tools';
import {
  AgentStreamEvent,
  AGENT_MAX_ITERATIONS,
} from './stream-event.types';

// Day 1 최소 system prompt — Day 2에서 agent-core.md로 교체 예정
const DAY1_SYSTEM_PROMPT = `당신은 Foundry Agent입니다.
사용자 요청을 받으면 샌드박스 디렉토리에서 도구(Bash, Write, Read, Glob, Grep)를 써서 작업을 수행하세요.

원칙:
- 한 번에 작은 단위로 진행 (파일 1개, 명령 1개)
- 각 단계마다 결과를 확인 (Read 또는 Bash로 검증)
- 에러가 나면 원인을 파악하고 수정
- 작업이 끝나면 최종 결과를 한 줄로 보고
- 추가 질문 없이 주어진 지시를 그대로 수행 (Day 2부터 답지 모델로 고도화됨)`;

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

  constructor(private readonly sandbox: SandboxService) {
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

    const executor = new AgentToolExecutor(this.sandbox, cwd);

    // 2. 메시지 스택 초기화
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
          system: DAY1_SYSTEM_PROMPT,
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

      onEvent({
        type: 'complete',
        totalIterations: iter,
        totalCostUsd: Number(totalCostUsd.toFixed(6)),
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      this.logger.error(`[agent-builder] 실패: ${err?.message}`, err?.stack);
      onEvent({
        type: 'error',
        message: err?.message ?? String(err),
        where: `iter ${iter}`,
      });
    } finally {
      // Day 1은 정리하지 않음 — 검증 편의. Day 5 이후 정리 크론 추가.
      // await this.sandbox.cleanup(cwd);
    }
  }
}
