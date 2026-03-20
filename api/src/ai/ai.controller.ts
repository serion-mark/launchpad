import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private aiService: AiService) {}

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

  // ── AI 코드 수정 (레거시) ─────────────────────────
  @Post('modify')
  modify(
    @Req() req: any,
    @Body() body: {
      projectId: string;
      instruction: string;
      currentCode?: string;
    },
  ) {
    return this.aiService.modifyCode(req.user.userId, body);
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
}
