import { Controller, Get, Post, Body, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma.service';
import type { PackageId, CreditAction } from './credit.service';

@Controller('credits')
@UseGuards(AuthGuard('jwt'))
export class CreditController {
  constructor(
    private creditService: CreditService,
    private prisma: PrismaService,
  ) {}

  // ── 잔액 조회 ──────────────────────────────────────
  @Get('balance')
  getBalance(@Req() req: any) {
    return this.creditService.getBalance(req.user.userId);
  }

  // ── 크레딧 패키지 목록 ─────────────────────────────
  @Get('packages')
  getPackages() {
    return this.creditService.getPackages();
  }

  // ── 크레딧 충전 (결제 확인 후) ─────────────────────
  @Post('charge')
  charge(
    @Req() req: any,
    @Body() body: { packageId: PackageId; paymentRefId?: string },
  ) {
    return this.creditService.charge(req.user.userId, body.packageId, body.paymentRefId);
  }

  // ── 크레딧 차감 (내부 호출용) ──────────────────────
  @Post('deduct')
  async deduct(
    @Req() req: any,
    @Body() body: {
      action: CreditAction;
      projectId?: string;
      taskType?: string;
      modelTier?: string;
      description?: string;
    },
  ) {
    // projectId가 있으면 소유자 검증
    if (body.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: body.projectId } });
      if (project && project.userId !== req.user.userId) {
        throw new ForbiddenException('이 프로젝트에 대한 권한이 없습니다');
      }
    }
    return this.creditService.deduct(req.user.userId, body);
  }

  // ── 트랜잭션 이력 ─────────────────────────────────
  @Get('transactions')
  getTransactions(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.creditService.getTransactions(
      req.user.userId,
      limit ? parseInt(limit, 10) : 30,
    );
  }
}
