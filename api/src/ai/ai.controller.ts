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

  // ── /start 대화형 앱 기획 채팅 (Haiku, 인증 불필요) ──
  @Post('start-chat')
  @UseGuards()  // 클래스 레벨 JWT 가드 오버라이드 — 비로그인도 허용
  async startChat(
    @Body() body: {
      message: string;
      chatHistory: { role: string; content: string }[];
    },
  ) {
    const { LLMRouter } = await import('../llm-router');
    const router = new LLMRouter();

    const systemPrompt = `당신은 Foundry AI MVP 빌더의 앱 기획 도우미입니다.
사용자가 만들고 싶은 앱에 대해 대화하며 요구사항을 파악합니다.

규칙:
- 한국어로 친근하게 대화하세요
- 한 번에 1~2개 질문만 하세요 (너무 많이 묻지 마세요)
- 핵심 파악 항목: 업종/서비스 유형, 핵심 기능 2~3개, 타겟 사용자
- 3~5턴 대화로 충분한 정보가 모이면, 마지막에 반드시 다음 형식으로 요약하세요:

[APP_READY]
앱 이름: {이름}
업종: {업종}
핵심 기능: {기능1}, {기능2}, {기능3}
타겟: {타겟 사용자}
상세: {한줄 요약}
[/APP_READY]

- [APP_READY] 태그는 충분한 정보가 모였을 때만 포함하세요
- 사용자가 질문만 하면 (예: "뭘 할 수 있어?") 친절하게 설명하고 앱 아이디어를 제안하세요
- 응답은 짧고 핵심적으로 (3~5줄 이내)`;

    const messages = body.chatHistory.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
    const userPrompt = messages ? `${messages}\n사용자: ${body.message}` : `사용자: ${body.message}`;

    const content = await router.callAnthropic(
      systemPrompt,
      userPrompt,
      'claude-haiku-4-5-20251001',
      1024,
    );

    const isReady = content.includes('[APP_READY]');
    let appSpec: Record<string, string> | null = null;

    if (isReady) {
      const match = content.match(/\[APP_READY\]([\s\S]*?)\[\/APP_READY\]/);
      if (match) {
        appSpec = {};
        for (const line of match[1].trim().split('\n')) {
          const [key, ...vals] = line.split(':');
          if (key && vals.length) appSpec[key.trim()] = vals.join(':').trim();
        }
      }
    }

    const cleanContent = content.replace(/\[APP_READY\][\s\S]*?\[\/APP_READY\]/, '').trim();

    return { content: cleanContent, isReady, appSpec };
  }

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
