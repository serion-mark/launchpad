import {
  Controller,
  Post,
  Body,
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
import type { AgentStreamEvent } from './stream-event.types';

// 신규 라우트: /api/ai/agent-build
// 기존 /builder 플로우와 격리 (CLAUDE.md 원칙)
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AgentBuilderController {
  private readonly logger = new Logger(AgentBuilderController.name);

  constructor(private readonly agentBuilder: AgentBuilderService) {}

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
}
