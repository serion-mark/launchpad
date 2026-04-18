import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AgentBuilderService } from './agent-builder.service';
import { SessionStoreService } from './session-store.service';
import type { AgentStreamEvent } from './stream-event.types';

// 신규 라우트: /api/ai/agent-build
// 기존 /builder 플로우와 격리 (CLAUDE.md 원칙)
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AgentBuilderController {
  private readonly logger = new Logger(AgentBuilderController.name);

  constructor(
    private readonly agentBuilder: AgentBuilderService,
    private readonly sessionStore: SessionStoreService,
  ) {}

  @Post('agent-build')
  agentBuild(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { prompt: string },
  ) {
    if (process.env.AGENT_MODE_ENABLED !== 'true') {
      throw new HttpException(
        'Agent Mode 비활성화됨 (AGENT_MODE_ENABLED=true 필요)',
        HttpStatus.FORBIDDEN,
      );
    }
    if (!body?.prompt || typeof body.prompt !== 'string') {
      throw new HttpException('prompt 필수 (string)', HttpStatus.BAD_REQUEST);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const userId = req.user?.userId ?? 'anon';
    let closed = false;

    const write = (event: AgentStreamEvent) => {
      if (closed) return;
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err: any) {
        this.logger.warn(`[agent-build] SSE write 실패: ${err?.message}`);
      }
    };

    req.on('close', () => {
      closed = true;
    });

    this.agentBuilder
      .run({ userId, prompt: body.prompt, onEvent: write })
      .catch((err) => {
        write({
          type: 'error',
          message: err?.message ?? String(err),
          where: 'controller',
        });
      })
      .finally(() => {
        if (!closed) res.end();
      });
  }

  // 종합 카드 답변 수신 — SSE 스트림은 그대로 열려 있고, 이 엔드포인트는 별도 HTTP POST
  // 사용자가 "1, 2, 1" / "시작" / "자연어" 중 하나를 보내면 Agent loop이 재개됨
  @Post('agent-build/:sessionId/answer')
  submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: { answer: string; pendingId?: string },
  ) {
    if (process.env.AGENT_MODE_ENABLED !== 'true') {
      throw new HttpException('Agent Mode 비활성화됨', HttpStatus.FORBIDDEN);
    }
    if (!body || typeof body.answer !== 'string') {
      throw new HttpException('answer 필수 (string)', HttpStatus.BAD_REQUEST);
    }
    const result = this.sessionStore.submitAnswer(
      sessionId,
      body.pendingId ?? null,
      body.answer,
    );
    if (result.ok === false) {
      throw new HttpException(`답변 전달 실패: ${result.reason}`, HttpStatus.NOT_FOUND);
    }
    return { ok: true };
  }
}
