import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// ── 크레딧 패키지 정의 (2026-03-24 실측 기반 재설계) ─────
export const CREDIT_PACKAGES = {
  lite: { credits: 5000, price: 49000, label: '라이트팩' },
  standard: { credits: 20000, price: 149000, label: '스탠다드팩' },
  pro: { credits: 50000, price: 299000, label: '프로팩' },
} as const;

export type PackageId = keyof typeof CREDIT_PACKAGES;

// ── 크레딧 소모 기준 (2026-03-24 API 실측 기반) ─────────
export const CREDIT_COSTS = {
  app_generate: 6800,        // 앱 생성 ($2.45 → 마진95% → 6,800cr)
  ai_modify_simple: 100,     // AI 수정 (단순: 텍스트/색상/이미지)
  ai_modify_complex: 500,    // AI 수정 (복잡: 페이지/기능/DB/API)
  ai_modify: 500,            // AI 수정 (레거시 호환)
  ai_chat: 30,               // AI 대화 (질문/일반대화)
  premium_theme: 1000,       // 프리미엄 테마 적용
  code_download: 5000,       // 코드 다운로드
  server_deploy: 0,          // 서버 배포 (24시간 무료 체험 → 월 과금)
  free_trial: 0,             // 맛보기 설계안 (무료 1회)
  // AI 회의실 + 스마트 분석 + 이미지 생성
  meeting_standard: 300,     // AI 회의실 스탠다드
  meeting_premium: 1000,     // AI 회의실 프리미엄 (1,500→1,000)
  smart_analysis_standard: 300,  // 스마트 분석 (200→300)
  smart_analysis_premium: 1000,  // 스마트 분석 프리미엄
  image_generate: 200,       // AI 이미지 생성
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ── 모델별 크레딧 단가 (토큰 기반 과금) ─────────────────
export type ModelTier = 'flash' | 'smart' | 'pro';

export const MODEL_CREDIT_COSTS: Record<ModelTier, { perFile: number; base: number; label: string }> = {
  flash:  { perFile: 1,  base: 50,  label: 'Flash (빠르고 저렴)' },
  smart:  { perFile: 3,  base: 150, label: 'Smart (균형잡힌)' },
  pro:    { perFile: 10, base: 500, label: 'Pro (최고 품질)' },
};

/** 모델 + 파일 수 기반 동적 크레딧 계산 */
export function calculateModelCost(tier: ModelTier, fileCount: number): number {
  const costs = MODEL_CREDIT_COSTS[tier];
  return costs.base + (costs.perFile * fileCount);
}

/** AI 수정 단순/복잡 구분 — 키워드 기반 */
const COMPLEX_KEYWORDS = ['추가', '생성', '만들어', '연동', '결제', '페이지', '기능', 'db', '테이블', 'api', '레이아웃', '구조', '삭제', '제거'];
const SIMPLE_KEYWORDS = ['색', '색상', '텍스트', '문구', '글자', '이미지', '사진', '로고', '폰트', '크기', '바꿔', '변경'];

export function classifyModifyCost(message: string): number {
  const lower = message.toLowerCase();
  const isComplex = COMPLEX_KEYWORDS.some(kw => lower.includes(kw));
  const isSimple = SIMPLE_KEYWORDS.some(kw => lower.includes(kw));
  // 복잡 키워드가 있으면 복잡, 단순만 있으면 단순, 둘 다 없으면 단순
  if (isComplex && !isSimple) return CREDIT_COSTS.ai_modify_complex;
  if (isSimple && !isComplex) return CREDIT_COSTS.ai_modify_simple;
  if (isComplex && isSimple) return CREDIT_COSTS.ai_modify_complex; // 둘 다 있으면 복잡
  return CREDIT_COSTS.ai_modify_simple; // 기본 단순
}

const SIGNUP_BONUS = 1000;   // 회원가입 보너스 크레딧 (체험용 1,000cr)

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  // ── 잔액 조회 (없으면 자동 생성) ────────────────────
  async getBalance(userId: string) {
    let bal = await this.prisma.creditBalance.findUnique({
      where: { userId },
    });

    if (!bal) {
      bal = await this.prisma.creditBalance.create({
        data: {
          userId,
          balance: SIGNUP_BONUS,
          totalCharged: SIGNUP_BONUS,
        },
      });
      // 가입 보너스 트랜잭션 기록
      await this.prisma.creditTransaction.create({
        data: {
          userId,
          balanceId: bal.id,
          type: 'SIGNUP_BONUS',
          amount: SIGNUP_BONUS,
          balanceAfter: SIGNUP_BONUS,
          description: '회원가입 보너스 1,000 크레딧',
        },
      });
    }

    return bal;
  }

  // ── 크레딧 충전 (결제 완료 후 호출) ─────────────────
  async charge(userId: string, packageId: PackageId, paymentRefId?: string) {
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) throw new BadRequestException('유효하지 않은 패키지입니다');

    const bal = await this.getBalance(userId);

    const updated = await this.prisma.creditBalance.update({
      where: { id: bal.id },
      data: {
        balance: { increment: pkg.credits },
        totalCharged: { increment: pkg.credits },
      },
    });

    await this.prisma.creditTransaction.create({
      data: {
        userId,
        balanceId: bal.id,
        type: 'CHARGE',
        amount: pkg.credits,
        balanceAfter: updated.balance,
        description: `${pkg.label} 구매 (₩${pkg.price.toLocaleString()})`,
        paymentRefId,
      },
    });

    return { balance: updated.balance, charged: pkg.credits, package: pkg.label };
  }

  // ── 크레딧 차감 ─────────────────────────────────────
  async deduct(userId: string, params: {
    action: CreditAction;
    projectId?: string;
    taskType?: string;
    modelTier?: string;
    description?: string;
  }) {
    const cost = CREDIT_COSTS[params.action];
    const bal = await this.getBalance(userId);

    // 맛보기 설계안: 무료 1회
    if (params.action === 'free_trial') {
      if (bal.freeTrialUsed) {
        throw new BadRequestException('맛보기 설계안은 1회만 무료입니다');
      }
      await this.prisma.creditBalance.update({
        where: { id: bal.id },
        data: { freeTrialUsed: true },
      });
      await this.prisma.creditTransaction.create({
        data: {
          userId,
          balanceId: bal.id,
          type: 'FREE_TRIAL',
          amount: 0,
          balanceAfter: bal.balance,
          description: params.description || '맛보기 설계안 (무료 1회)',
          projectId: params.projectId,
          taskType: params.taskType,
          modelTier: params.modelTier,
        },
      });
      return { balance: bal.balance, cost: 0, remaining: bal.balance };
    }

    // 잔액 부족 사전 체크
    if (bal.balance < cost) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_CREDITS',
        required: cost,
        current: bal.balance,
        message: `크레딧이 부족합니다 (필요: ${cost}, 잔액: ${bal.balance})`,
      });
    }

    // Race Condition 방지: DB 레벨에서 잔액 >= cost 조건 보장
    const result = await this.prisma.creditBalance.updateMany({
      where: { id: bal.id, balance: { gte: cost } },
      data: {
        balance: { decrement: cost },
        totalUsed: { increment: cost },
      },
    });

    if (result.count === 0) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_CREDITS',
        required: cost,
        current: bal.balance,
        message: `크레딧이 부족합니다 (동시 요청으로 잔액 변경됨)`,
      });
    }

    // 차감 후 잔액 계산 (updateMany는 레코드를 반환하지 않으므로)
    const newBalance = bal.balance - cost;

    await this.prisma.creditTransaction.create({
      data: {
        userId,
        balanceId: bal.id,
        type: 'USE',
        amount: -cost,
        balanceAfter: newBalance,
        description: params.description || params.action,
        projectId: params.projectId,
        taskType: params.taskType,
        modelTier: params.modelTier,
      },
    });

    return { balance: newBalance, cost, remaining: newBalance };
  }

  // ── 모델 기반 동적 차감 (코드 생성 엔진용) ──────────
  async deductByModel(userId: string, params: {
    tier: ModelTier;
    fileCount: number;
    projectId?: string;
    taskType?: string;
    description?: string;
    minCost?: number;
  }) {
    const baseCost = calculateModelCost(params.tier, params.fileCount);
    const cost = params.minCost ? Math.max(baseCost, params.minCost) : baseCost;
    const bal = await this.getBalance(userId);

    if (bal.balance < cost) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_CREDITS',
        required: cost,
        current: bal.balance,
        tier: params.tier,
        message: `크레딧이 부족합니다 (필요: ${cost}, 잔액: ${bal.balance})`,
      });
    }

    // Race Condition 방지: DB 레벨에서 잔액 >= cost 조건 보장
    const result = await this.prisma.creditBalance.updateMany({
      where: { id: bal.id, balance: { gte: cost } },
      data: {
        balance: { decrement: cost },
        totalUsed: { increment: cost },
      },
    });

    if (result.count === 0) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_CREDITS',
        required: cost,
        current: bal.balance,
        message: `크레딧이 부족합니다 (동시 요청으로 잔액 변경됨)`,
      });
    }

    const newBalance = bal.balance - cost;

    await this.prisma.creditTransaction.create({
      data: {
        userId,
        balanceId: bal.id,
        type: 'USE',
        amount: -cost,
        balanceAfter: newBalance,
        description: params.description || `${params.tier} 모델 사용 (${params.fileCount}파일)`,
        projectId: params.projectId,
        taskType: params.taskType,
        modelTier: params.tier,
      },
    });

    return { balance: newBalance, cost, remaining: newBalance, tier: params.tier, fileCount: params.fileCount };
  }

  /** 예상 비용 조회 (차감 없이) */
  estimateCost(tier: ModelTier, fileCount: number) {
    return {
      tier,
      fileCount,
      cost: calculateModelCost(tier, fileCount),
      breakdown: MODEL_CREDIT_COSTS[tier],
    };
  }

  // ── 트랜잭션 이력 조회 ──────────────────────────────
  async getTransactions(userId: string, limit = 30) {
    return this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── 패키지 목록 조회 ────────────────────────────────
  getPackages() {
    return CREDIT_PACKAGES;
  }
}
