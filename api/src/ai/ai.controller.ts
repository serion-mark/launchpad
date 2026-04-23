import { Controller, Post, Get, Body, Param, UseGuards, Req, Res, Sse, Logger, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { AgentService } from './agent.service';
import { MeetingService } from './meeting.service';
import { SmartAnalysisService } from './smart-analysis.service';
import { ImageService } from './image.service';
import { CreditService } from '../credit/credit.service';
import { DeployService } from '../project/deploy.service';
import { PrismaService } from '../prisma.service';
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
    private creditService: CreditService,
    private deployService: DeployService,
    private prisma: PrismaService,
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

  // Phase A (2026-04-22): Agent Mode 진입 전 입력 요약
  //   body: { raw: string, sourceType: 'prompt' | 'meeting' }
  //   return: { spec, strategy, raw, sourceType, confidence, fallbackRequired }
  //   사용자 과금 없음 (내부 부담)
  @Post('summarize-to-agent-spec')
  summarizeToAgentSpec(
    @Body() body: { raw: string; sourceType: 'prompt' | 'meeting' },
  ) {
    if (!body?.raw || typeof body.raw !== 'string') {
      return { spec: null, strategy: null, raw: '', sourceType: 'prompt', confidence: 0, fallbackRequired: true };
    }
    const source: 'prompt' | 'meeting' = body.sourceType === 'meeting' ? 'meeting' : 'prompt';
    return this.aiService.summarizeToAgentSpec(body.raw, source);
  }

  // ── Phase L (2026-04-22): /start 대화형 인터뷰 ──────────────────
  //   body: { initialPrompt: string, history: [{role, content}] }
  //   return: { message, options?, done, turnCount, finalSpec? }
  //   사용자 과금 없음 (진입 유도 투자)
  @Post('interview')
  interview(
    @Body() body: {
      initialPrompt: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    },
  ) {
    if (!body?.initialPrompt || typeof body.initialPrompt !== 'string') {
      return {
        message: 'initialPrompt 필수',
        done: true,
        turnCount: 0,
      };
    }
    const history = Array.isArray(body.history) ? body.history : [];
    // history 길이 상한 (방어): 12개 초과 시 잘라냄 (6턴 = 12 메시지)
    const safeHistory = history.slice(-12);
    return this.aiService.interviewNextTurn({
      initialPrompt: body.initialPrompt,
      history: safeHistory,
    });
  }

  // ── Phase AD Step 10-1 (2026-04-23): 레퍼런스 이미지 자동 분석 ───────
  //   body: { imagePath: string, currentSpec: any }
  //   return: { detected, conflicts, suggestedMessage }
  //   사용자 과금 없음 (~$0.02/회 내부 부담)
  //   보안: imagePath 는 본인 pre-session 폴더만 (service 에서 검증)
  @Post('analyze-reference-image')
  analyzeReferenceImage(
    @Req() req: any,
    @Body() body: { imagePath: string; currentSpec: any },
  ) {
    const userId = String(req.user?.userId ?? '');
    if (!userId || userId === 'anon') {
      return { detected: { colors: {}, layout: '', tone: '', featureElements: [] }, conflicts: { toneConflict: false, featureMismatches: [] }, suggestedMessage: '로그인 필요' };
    }
    if (!body?.imagePath || typeof body.imagePath !== 'string') {
      return { detected: { colors: {}, layout: '', tone: '', featureElements: [] }, conflicts: { toneConflict: false, featureMismatches: [] }, suggestedMessage: 'imagePath 필수' };
    }
    return this.aiService.analyzeReferenceImage({
      userId,
      imagePath: body.imagePath,
      currentSpec: body.currentSpec ?? null,
    });
  }

  // ── Phase L (2026-04-22): 확인 스테이지 채팅 수정 ──────────────────
  //   body: { currentSpec, userRequest, chatHistory }
  //   return: { message, updatedSpec, changes }
  //   사용자 과금 없음
  @Post('refine-spec')
  refineSpec(
    @Body() body: {
      currentSpec: any;
      userRequest: string;
      chatHistory?: { role: 'user' | 'assistant'; content: string }[];
    },
  ) {
    if (!body?.currentSpec || !body?.userRequest) {
      return {
        message: 'currentSpec 과 userRequest 필수',
        updatedSpec: body?.currentSpec ?? null,
        changes: [],
      };
    }
    const chatHistory = Array.isArray(body.chatHistory) ? body.chatHistory.slice(-20) : [];
    return this.aiService.refineSpec({
      currentSpec: body.currentSpec,
      userRequest: body.userRequest,
      chatHistory,
    });
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

    // 완료 → 24시간 체험 배포 자동 트리거
    emitter.on('done', async (result: any) => {
      let trialDeploy = null;
      try {
        trialDeploy = await this.deployService.deployTrial(body.projectId, req.user.userId);
      } catch (err) {
        this.logger.warn(`체험 배포 실패: ${err}`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done', ...result, trialDeploy })}\n\n`);
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

  // ── PDF 텍스트 추출 ─────────────────────────────────
  @Post('parse-pdf')
  @UseInterceptors(FileInterceptor('file'))
  async parsePdf(@UploadedFile() file: Express.Multer.File) {
    const { BadRequestException } = await import('@nestjs/common');
    if (!file) throw new BadRequestException('파일이 없습니다');
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('PDF 파일만 지원합니다');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('파일 크기는 10MB 이하만 가능합니다');
    }
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { execSync } = await import('child_process');
      const os = await import('os');

      // 임시 파일에 저장 → pdftotext 실행 → 텍스트 추출
      const tmpPath = path.join(os.tmpdir(), `pdf-${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, file.buffer);

      const text = execSync(`pdftotext "${tmpPath}" -`, {
        encoding: 'utf-8',
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      // 임시 파일 삭제
      fs.unlinkSync(tmpPath);

      return { text: text.trim(), info: file.originalname };
    } catch (err: any) {
      this.logger.error(`[PDF 파싱 실패] ${err.message}`);
      throw new BadRequestException('PDF를 읽을 수 없습니다. 다른 형식으로 변환 후 업로드해주세요.');
    }
  }

  // ── AI 회의실 채팅: Claude 일반 대화 ─────────────────
  @Post('meeting-chat-simple')
  async meetingChatSimple(
    @Body() body: { question: string; context: string; history?: { role: string; content: string }[] },
  ) {
    const reply = await this.meetingService.simpleChat(body);
    return { reply };
  }

  // ── AI 회의실 추가 분석: 의도 확인 ─────────────────
  @Post('meeting-chat-direction')
  async meetingChatDirection(
    @Body() body: { question: string; context: string; history?: { role: string; content: string }[] },
  ) {
    const direction = await this.meetingService.generateFollowUpDirection(body);
    return { direction };
  }

  // ── AI 회의실 추가 분석: 3AI 핑퐁 ─────────────────
  @Post('meeting-chat')
  async meetingChat(
    @Req() req: any,
    @Body() body: { question: string; context: string; direction?: string; history?: { role: string; content: string }[] },
  ) {
    // 후속 핑퐁은 스탠다드 비용 차감
    await this.creditService.deduct(req.user.userId, {
      action: 'meeting_standard',
      description: 'AI 회의실 추가 분석',
    });
    const replies = await this.meetingService.followUpChat(body);
    return replies;
  }

  // ── AI 회의실 사전 질문 ─────────────────────────────
  @Post('meeting-pre-question')
  async meetingPreQuestion(
    @Body() body: { topic: string; preset?: MeetingPreset; fileLength?: number },
  ) {
    const questions = await this.meetingService.generatePreQuestions(body);
    return { questions };
  }

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
      preAnswers?: string;
    },
  ) {
    // 크레딧 선차감 (SSE 시작 전)
    const creditAction = body.tier === 'premium' ? 'meeting_premium' : 'meeting_standard';
    try {
      await this.creditService.deduct(req.user.userId, {
        action: creditAction as any,
        description: `AI 회의실 (${body.tier === 'premium' ? '프리미엄' : '스탠다드'})`,
      });
    } catch (err: any) {
      // 크레딧 부족 시 JSON 응답 (SSE 시작 전이므로 일반 에러)
      const parsed = (() => { try { return JSON.parse(err.message); } catch { return null; } })();
      if (parsed?.code === 'INSUFFICIENT_CREDITS') {
        res.status(403).json({ code: 'INSUFFICIENT_CREDITS', required: parsed.required, current: parsed.current, message: parsed.message });
      } else {
        res.status(500).json({ message: '크레딧 처리 중 오류가 발생했습니다' });
      }
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.logger.log(`[AI 회의실] 시작: ${body.topic} (${body.tier})`);

    const allEvents: any[] = [];
    try {
      for await (const event of this.meetingService.runMeeting(body)) {
        allEvents.push(event);
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ phase: 'error', message: err.message })}\n\n`);
    }

    // 회의 완료 후 DB 자동 저장
    try {
      const report = allEvents.find(e => e.phase === 'report')?.content || null;
      await this.prisma.meetingHistory.create({
        data: {
          userId: req.user.userId,
          topic: body.topic,
          preset: body.preset || 'free',
          tier: body.tier,
          messages: allEvents as any,
          report,
          creditUsed: body.tier === 'premium' ? 1000 : 300,
        },
      });
      this.logger.log(`[AI 회의실] 기록 저장 완료: ${body.topic}`);
    } catch (saveErr: any) {
      this.logger.error(`[AI 회의실] 기록 저장 실패: ${saveErr.message}`);
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
    // 크레딧 선차감
    const creditAction = body.tier === 'premium' ? 'smart_analysis_premium' : 'smart_analysis_standard';
    try {
      await this.creditService.deduct(req.user.userId, {
        action: creditAction as any,
        description: `스마트 분석 (${body.tier === 'premium' ? '프리미엄' : '스탠다드'})`,
      });
    } catch (err: any) {
      const parsed = (() => { try { return JSON.parse(err.message); } catch { return null; } })();
      if (parsed?.code === 'INSUFFICIENT_CREDITS') {
        res.status(403).json({ code: 'INSUFFICIENT_CREDITS', required: parsed.required, current: parsed.current, message: parsed.message });
      } else {
        res.status(500).json({ message: '크레딧 처리 중 오류가 발생했습니다' });
      }
      return;
    }

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
  async generateImage(
    @Req() req: any,
    @Body() body: {
      prompt: string;
      style?: string;
      projectId?: string;
    },
  ) {
    // 크레딧 선차감
    await this.creditService.deduct(req.user.userId, {
      action: 'image_generate',
      projectId: body.projectId,
      description: 'AI 이미지 생성',
    });
    return this.imageService.generateImage(body.prompt, body.style, body.projectId);
  }

  // ── 회의 히스토리 API ─────────────────────────────────
  @Get('meeting-history')
  async getMeetingHistory(@Req() req: any) {
    const histories = await this.prisma.meetingHistory.findMany({
      where: { userId: req.user.userId },
      select: { id: true, topic: true, preset: true, tier: true, creditUsed: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return histories;
  }

  @Get('meeting-history/:id')
  async getMeetingHistoryDetail(@Req() req: any, @Param('id') id: string) {
    const history = await this.prisma.meetingHistory.findUnique({ where: { id } });
    if (!history || history.userId !== req.user.userId) {
      return { error: 'not_found' };
    }
    return history;
  }

  @Post('meeting-history/:id/delete')
  async deleteMeetingHistory(@Req() req: any, @Param('id') id: string) {
    const history = await this.prisma.meetingHistory.findUnique({ where: { id } });
    if (!history || history.userId !== req.user.userId) {
      return { error: 'not_found' };
    }
    await this.prisma.meetingHistory.delete({ where: { id } });
    return { success: true };
  }
}
