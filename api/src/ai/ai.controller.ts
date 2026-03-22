import { Controller, Post, Get, Body, Param, UseGuards, Req, Res, Sse, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { AgentService } from './agent.service';
import { MeetingService } from './meeting.service';
import { SmartAnalysisService } from './smart-analysis.service';
import { ImageService } from './image.service';
import type { GenerationProgress } from './ai.service';
import type { AgentStepEvent } from './agent.service';
import type { MeetingTier, MeetingPreset } from './meeting.service';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private aiService: AiService,
    private agentService: AgentService,
    private meetingService: MeetingService,
    private smartAnalysisService: SmartAnalysisService,
    private imageService: ImageService,
  ) {}

  // ── 빌더 채팅 (실시간 AI 대화) ─────────────────────
  @Post('chat')
  chat(
    @Req() req: any,
    @Body() body: {
      projectId: string;
      message: string;
      chatHistory: { role: string; content: string }[];
      template?: string;
    },
  ) {
    return this.aiService.chat(req.user.userId, body);
  }

  // ── 앱 아키텍처 생성 (레거시) ──────────────────────
  @Post('generate')
  generate(
    @Req() req: any,
    @Body() body: {
      projectId: string;
      chatHistory: { role: string; content: string }[];
      template: string;
    },
  ) {
    return this.aiService.generateArchitecture(req.user.userId, body);
  }

  // ══════════════════════════════════════════════════════
  // ── Sprint 2: 코드 생성 엔진 API ─────────────────────
  // ══════════════════════════════════════════════════════

  // ── 전체 앱 생성 (5단계 파이프라인) ────────────────
  @Post('generate-app')
  generateApp(
    @Req() req: any,
    @Body() body: {
      projectId: string;
      template: string;
      answers: Record<string, string | string[]>;
      selectedFeatures: string[];
      modelTier: 'flash' | 'smart' | 'pro';
      theme?: string;
      chatHistory?: { role: string; content: string }[];
    },
  ) {
    return this.aiService.generateFullApp(req.user.userId, body);
  }

  // ── F7: SSE 스트리밍 앱 생성 ─────────────────────
  @Post('generate-app-sse')
  generateAppSSE(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: {
      projectId: string;
      template: string;
      answers: Record<string, string | string[]>;
      selectedFeatures: string[];
      modelTier: 'flash' | 'smart' | 'pro';
      theme?: string;
      chatHistory?: { role: string; content: string }[];
    },
  ) {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx 버퍼링 비활성화
    res.flushHeaders();

    const emitter = this.aiService.generateFullAppSSE(req.user.userId, body);

    // 진행상황 전송
    emitter.on('progress', (data: GenerationProgress) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`);
    });

    // 완료
    emitter.on('done', (result: any) => {
      res.write(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`);
      res.end();
    });

    // 에러
    emitter.on('error', (err: any) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message?.slice(0, 200) })}\n\n`);
      res.end();
    });

    // 클라이언트 연결 끊김 처리
    req.on('close', () => {
      emitter.removeAllListeners();
    });
  }

  // ── 채팅 기반 코드 수정 ───────────────────────────
  @Post('modify-files')
  modifyFiles(
    @Req() req: any,
    @Body() body: {
      projectId: string;
      message: string;
      modelTier: 'flash' | 'smart' | 'pro';
      targetFiles?: string[];
    },
  ) {
    return this.aiService.modifyFiles(req.user.userId, body);
  }

  // start-chat은 StartChatController로 분리 (JWT 불필요)

  // ══════════════════════════════════════════════════════
  // ── Phase 10: Agent Mode (자율 수정) ──────────────────
  // ══════════════════════════════════════════════════════

  @Post('agent')
  runAgent(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { projectId: string; task: string },
  ) {
    // SSE 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const emitter = this.agentService.runAgentSSE(req.user.userId, body.projectId, body.task);

    // 각 단계 전송
    emitter.on('step', (data: AgentStepEvent) => {
      res.write(`data: ${JSON.stringify({ type: 'step', ...data })}\n\n`);
    });

    // 완료
    emitter.on('done', (result: any) => {
      res.write(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`);
      res.end();
    });

    // 에러
    emitter.on('error', (err: any) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message?.slice(0, 300) })}\n\n`);
      res.end();
    });

    // 클라이언트 연결 끊김
    req.on('close', () => {
      emitter.removeAllListeners();
    });
  }

  // ── 사용 가능한 모델 목록 ─────────────────────────
  @Get('models')
  getModels() {
    return this.aiService.getAvailableModels();
  }

  // ── 예상 비용 계산 ────────────────────────────────
  @Post('estimate-cost')
  estimateCost(
    @Body() body: {
      modelTier: 'flash' | 'smart' | 'pro';
      estimatedFileCount: number;
    },
  ) {
    return this.aiService.estimateGenerationCost(body.modelTier, body.estimatedFileCount);
  }

  // ══════════════════════════════════════════════════════
  // ── Sprint 4: 코드 헬스체크 API ─────────────────────
  // ══════════════════════════════════════════════════════

  @Get('health-check/:projectId')
  healthCheck(@Req() req: any, @Param('projectId') projectId: string) {
    return this.aiService.healthCheck(req.user.userId, projectId);
  }

  // ── Sprint 5: AI 코드 정리 ─────────────────────────
  @Post('cleanup')
  cleanup(
    @Req() req: any,
    @Body() body: {
      projectId: string;
      modelTier: 'flash' | 'smart' | 'pro';
    },
  ) {
    return this.aiService.cleanupCode(req.user.userId, body);
  }

  // ══════════════════════════════════════════════════════
  // ── Phase 11: AI 회의실 + 스마트 분석 + 이미지 생성 ────
  // ══════════════════════════════════════════════════════

  // ── AI 회의실 SSE ────────────────────────────────────
  @Post('meeting-sse')
  async meetingSSE(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: {
      topic: string;
      file?: string;
      tier: MeetingTier;
      preset?: MeetingPreset;
    },
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.logger.log(`[AI 회의실] 시작: ${body.topic} (${body.tier})`);

    try {
      for await (const event of this.meetingService.runMeeting(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ phase: 'error', message: err.message })}\n\n`);
    }

    res.end();

    req.on('close', () => {
      this.logger.log('[AI 회의실] 클라이언트 연결 끊김');
    });
  }

  // ── 스마트 분석 SSE ──────────────────────────────────
  @Post('smart-analysis-sse')
  async smartAnalysisSSE(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: {
      template: string;
      answers: Record<string, string | string[]>;
      features: string[];
      tier: 'standard' | 'premium';
    },
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.smartAnalysisService.runAnalysis(body)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ phase: 'error', message: err.message })}\n\n`);
    }

    res.end();
  }

  // ── AI 이미지 생성 ───────────────────────────────────
  @Post('generate-image')
  generateImage(
    @Req() req: any,
    @Body() body: {
      prompt: string;
      style?: string;
      projectId?: string;
    },
  ) {
    return this.imageService.generateImage(body.prompt, body.style, body.projectId);
  }
}
