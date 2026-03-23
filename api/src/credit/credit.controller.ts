import { Controller, Get, Post, Body, Query, UseGuards, Req, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreditService, CREDIT_PACKAGES } from './credit.service';
import { PrismaService } from '../prisma.service';
import type { PackageId, CreditAction } from './credit.service';

@Controller('credits')
@UseGuards(AuthGuard('jwt'))
export class CreditController {
  private readonly logger = new Logger(CreditController.name);

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

  // ── 토스 결제 승인 + 크레딧 충전 (실연동) ─────────
  @Post('confirm-payment')
  async confirmPayment(
    @Req() req: any,
    @Body() body: { paymentKey: string; orderId: string; amount: number },
  ) {
    const { paymentKey, orderId, amount } = body;
    if (!paymentKey || !orderId || !amount) {
      throw new BadRequestException('paymentKey, orderId, amount는 필수입니다');
    }

    // orderId 형식: credit-{packageId}-{timestamp}
    const parts = orderId.split('-');
    const packageId = parts[1] as PackageId;
    if (!['micro', 'mini', 'lite', 'standard', 'pro'].includes(packageId)) {
      throw new BadRequestException(`유효하지 않은 패키지: ${packageId}`);
    }

    // 결제금액 검증: 클라이언트가 보낸 amount가 패키지 가격과 일치하는지 확인
    const pkg = CREDIT_PACKAGES[packageId];
    if (amount !== pkg.price) {
      this.logger.error(`결제금액 불일치! 패키지: ${packageId}, 예상: ${pkg.price}, 실제: ${amount}`);
      throw new BadRequestException(`결제 금액이 올바르지 않습니다 (예상: ${pkg.price}원)`);
    }

    // 멱등성: 이미 처리된 결제인지 확인
    const existing = await this.prisma.creditTransaction.findFirst({
      where: { paymentRefId: paymentKey },
    });
    if (existing) {
      this.logger.warn(`중복 결제 요청 무시: ${paymentKey}`);
      const bal = await this.creditService.getBalance(req.user.userId);
      return { balance: bal.balance, charged: 0, message: '이미 처리된 결제입니다' };
    }

    // 토스페이먼츠 서버사이드 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다');
    }

    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!tossRes.ok) {
      const err = await tossRes.json().catch(() => ({}));
      this.logger.error(`토스 결제 승인 실패: ${JSON.stringify(err)}`);
      throw new BadRequestException(err.message || '결제 승인에 실패했습니다');
    }

    this.logger.log(`토스 결제 승인 성공: ${orderId} (${amount}원)`);

    // 크레딧 충전
    const result = await this.creditService.charge(req.user.userId, packageId, paymentKey);
    return result;
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
