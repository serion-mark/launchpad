import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
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

  // ── 앱 아키텍처 생성 ───────────────────────────────
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

  // ── AI 코드 수정 ──────────────────────────────────
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
}
