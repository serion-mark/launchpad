import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreditService } from './credit.service';
import type { PackageId, CreditAction } from './credit.service';

@Controller('credits')
@UseGuards(AuthGuard('jwt'))
export class CreditController {
  constructor(private creditService: CreditService) {}

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
  deduct(
    @Req() req: any,
    @Body() body: {
      action: CreditAction;
      projectId?: string;
      taskType?: string;
      modelTier?: string;
      description?: string;
    },
  ) {
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
