import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AgentBuilderV2Service } from './agent-builder-v2.service';
import { AgentBuilderSdkV2Service } from './agent-builder-sdk-v2.service';
import { SessionStoreService } from '../agent-builder/session-store.service';
import { AttachmentService } from '../agent-builder/attachment.service';
import type { AgentStreamEvent } from '../agent-builder/stream-event.types';

// 신규 라우트: /api/ai/agent-build
// 기존 /builder 플로우와 격리 (CLAUDE.md 원칙)
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AgentBuilderV2Controller {
  private readonly logger = new Logger(AgentBuilderV2Controller.name);

  constructor(
    private readonly agentBuilder: AgentBuilderV2Service,
    private readonly agentBuilderSdk: AgentBuilderSdkV2Service,
    private readonly sessionStore: SessionStoreService,
    private readonly attachment: AttachmentService,
  ) {}

  @Post('agent-build-v2')
  agentBuild(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: { prompt: string; projectId?: string; customSubdomain?: string },
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
    const editingProjectId =
      typeof body.projectId === 'string' && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : undefined;
    const customSubdomain =
      typeof body.customSubdomain === 'string' && body.customSubdomain.trim().length > 0
        ? body.customSubdomain.trim()
        : undefined;

    const userId = req.user?.userId ?? 'anon';

    // Phase 0 (2026-04-22): 크레딧/서브도메인 사전 오류는 service 내부에서 throw
    //   → .catch 블록이 error 이벤트로 전달 (프론트가 error.message 로 분기)
    //   프론트는 fetch 전에 모달에서 GET /credits/balance 로 잔액 UX 표시 (이중 안전)

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

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
      .run({
        userId,
        prompt: body.prompt,
        projectId: editingProjectId,
        customSubdomain,
        onEvent: write,
      })
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

  // ── Day 1 Z안: Claude Agent SDK 기반 신규 라우트 ────────────────
  // feature flag: AGENT_SDK_ENABLED=true 일 때만 호출 가능
  // 기존 /agent-build 와 병행 동작 (간섭 X). Day 6~7 에서 기본 경로 전환 예정.
  @Post('agent-build-v2-sdk')
  agentBuildSdk(
    @Req() req: any,
    @Res() res: Response,
    @Body() body: {
      prompt: string;
      projectId?: string;
      customSubdomain?: string;
      skipAskUser?: boolean;   // Phase F (2026-04-22)
    },
  ) {
    if (process.env.AGENT_SDK_ENABLED !== 'true') {
      throw new HttpException(
        'Agent SDK 비활성화됨 (AGENT_SDK_ENABLED=true 필요)',
        HttpStatus.FORBIDDEN,
      );
    }
    if (!body?.prompt || typeof body.prompt !== 'string') {
      throw new HttpException('prompt 필수 (string)', HttpStatus.BAD_REQUEST);
    }
    const editingProjectId =
      typeof body.projectId === 'string' && body.projectId.trim().length > 0
        ? body.projectId.trim()
        : undefined;
    const customSubdomain =
      typeof body.customSubdomain === 'string' && body.customSubdomain.trim().length > 0
        ? body.customSubdomain.trim()
        : undefined;
    const skipAskUser = body.skipAskUser === true;

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
        this.logger.warn(`[agent-build-sdk] SSE write 실패: ${err?.message}`);
      }
    };

    req.on('close', () => {
      closed = true;
    });

    this.agentBuilderSdk
      .runWithSDK({
        userId,
        prompt: body.prompt,
        projectId: editingProjectId,
        customSubdomain,
        skipAskUser,
        onEvent: write,
      })
      .catch((err) => {
        write({
          type: 'error',
          message: err?.message ?? String(err),
          where: 'controller-sdk',
        });
      })
      .finally(() => {
        if (!closed) res.end();
      });
  }

  // 긴급 복구: 사용자 소유 모든 프로젝트의 Supabase auto-confirm 일괄 활성화
  // 기존(Email Confirmation=ON 으로 생성된) 앱에서 "Email not confirmed" 에러 해결용
  @Post('agent-build-v2/fix-autoconfirm')
  async fixAutoconfirm(@Req() req: any) {
    if (process.env.AGENT_MODE_ENABLED !== 'true') {
      throw new HttpException('Agent Mode 비활성화됨', HttpStatus.FORBIDDEN);
    }
    const userId = String(req.user?.userId ?? '');
    if (!userId || userId === 'anon') {
      throw new HttpException('로그인 필요', HttpStatus.UNAUTHORIZED);
    }
    return this.agentBuilder.fixAutoConfirmAll(userId);
  }

  // Phase AD Step 1 (2026-04-23): 세션 시작 전 이미지 업로드
  //   /start ReviewStage 또는 /meeting 종합보고서에서 Agent 시작 전에 사용.
  //   - 첫 호출: form-data 에 sessionFolder 없음 → 백엔드가 새 폴더 생성 + 응답
  //   - 두번째부터: 첫 응답의 sessionFolder 를 form-data 에 동봉해서 같은 폴더 누적
  //   - 동일 제한: 5MB / 장, 3장 / 세션, PNG/JPG/WEBP
  //   - 저장 경로: /tmp/foundry-attachments/pre-session-<userId>-<timestamp>/<uuid>.<ext>
  //   - 24h 후 cron cleanup (별도 작업)
  @Post('agent-build-v2/pre-session-attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadPreSession(
    @Req() req: any,
    @UploadedFile() file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    @Body() body: { sessionFolder?: string },
  ) {
    if (!file) {
      throw new HttpException('파일 필수', HttpStatus.BAD_REQUEST);
    }
    const userId = String(req.user?.userId ?? '');
    if (!userId || userId === 'anon') {
      throw new HttpException('로그인 필요', HttpStatus.UNAUTHORIZED);
    }
    const existingFolder =
      typeof body?.sessionFolder === 'string' && body.sessionFolder.trim().length > 0
        ? body.sessionFolder.trim()
        : undefined;
    try {
      const saved = await this.attachment.savePreSession(userId, file, existingFolder);
      return {
        ok: true,
        path: saved.path,
        filename: saved.filename,
        originalName: saved.originalName,
        size: saved.size,
        sessionFolder: saved.sessionFolder,
      };
    } catch (err: any) {
      throw new HttpException(
        err?.message ?? '업로드 실패',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Phase I (2026-04-22): 답지 카드 이미지 첨부 업로드 (Agent 진행 중 AskUser 경로)
  //   /builder/agent 세션 중 사용자가 레퍼런스 스크린샷을 올릴 때 사용.
  //   - sandboxSessionId: SSE 세션에서 받은 sessionId
  //   - form-data file: image/png,jpg,webp (5MB 이하, 세션당 3장)
  //   저장 경로는 /tmp/foundry-attachments/<sessionId>/<uuid>.<ext>
  //   답변 전송 시 submitAnswer body 에 attachments: [{ path, ... }] 로 참조.
  @Post('agent-build-v2/:sessionId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAttachment(
    @Param('sessionId') sessionId: string,
    @UploadedFile() file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    if (!sessionId) {
      throw new HttpException('sessionId 필수', HttpStatus.BAD_REQUEST);
    }
    if (!file) {
      throw new HttpException('파일 필수', HttpStatus.BAD_REQUEST);
    }
    try {
      const saved = await this.attachment.save(sessionId, file);
      return {
        ok: true,
        path: saved.path,
        filename: saved.filename,
        originalName: saved.originalName,
        size: saved.size,
      };
    } catch (err: any) {
      throw new HttpException(
        err?.message ?? '업로드 실패',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // 종합 카드 답변 수신 — SSE 스트림은 그대로 열려 있고, 이 엔드포인트는 별도 HTTP POST
  // 사용자가 "1, 2, 1" / "시작" / "자연어" 중 하나를 보내면 Agent loop이 재개됨
  @Post('agent-build-v2/:sessionId/answer')
  submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: { answer: string; pendingId?: string; attachments?: string[] },
  ) {
    if (process.env.AGENT_MODE_ENABLED !== 'true') {
      throw new HttpException('Agent Mode 비활성화됨', HttpStatus.FORBIDDEN);
    }
    if (!body || typeof body.answer !== 'string') {
      throw new HttpException('answer 필수 (string)', HttpStatus.BAD_REQUEST);
    }
    // Phase I (2026-04-22): attachments 는 선택 — 업로드된 이미지 절대 경로 배열
    //   attachments 는 프론트가 /attachments 엔드포인트 응답 path 를 그대로 수집해 보냄
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const result = this.sessionStore.submitAnswer(
      sessionId,
      body.pendingId ?? null,
      body.answer,
      attachments,
    );
    if (result.ok === false) {
      throw new HttpException(`답변 전달 실패: ${result.reason}`, HttpStatus.NOT_FOUND);
    }
    return { ok: true };
  }
}
