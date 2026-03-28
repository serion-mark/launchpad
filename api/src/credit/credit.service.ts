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
  ai_modify_simple: 500,     // AI 수정 (단순: 색상/텍스트/문구/이미지) — 실측 $0.33
  ai_modify_normal: 1000,    // AI 수정 (보통: 레이아웃/스타일/버튼/폰트)
  ai_modify_complex: 1500,   // AI 수정 (복잡: 페이지추가/반응형/기능/DB/API) — 실측 $1.00
  ai_modify: 500,            // AI 수정 (레거시 호환)
  ai_chat: 30,               // AI 대화 (질문/일반대화)
  premium_theme: 1000,       // 프리미엄 테마 적용
  code_download: 10000,       // 코드 다운로드 (10,000cr — 스탠다드/프로/모두의창업은 무료)
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

/** AI 수정 단순/보통/복잡 3단계 구분 — 키워드 기반 (실측: 단순 $0.33, 복잡 $1.00) */
const COMPLEX_KEYWORDS = ['추가', '생성', '만들어', '연동', '결제', '페이지', '기능', 'db', '테이블', 'api', '반응형', '모바일', '삭제', '제거'];
const NORMAL_KEYWORDS = ['레이아웃', '구조', '스타일', '버튼', '폰트', '크기', '위치', '정렬', '간격', '여백', '디자인'];
const SIMPLE_KEYWORDS = ['색', '색상', '텍스트', '문구', '글자', '이미지', '사진', '로고', '이름', '제목', '바꿔', '변경'];

export function classifyModifyCost(message: string): number {
  const lower = message.toLowerCase();
  const isComplex = COMPLEX_KEYWORDS.some(kw => lower.includes(kw));
  const isNormal = NORMAL_KEYWORDS.some(kw => lower.includes(kw));
  const isSimple = SIMPLE_KEYWORDS.some(kw => lower.includes(kw));
  if (isComplex) return CREDIT_COSTS.ai_modify_complex;  // 복잡 1,500cr
  if (isNormal) return CREDIT_COSTS.ai_modify_normal;     // 보통 1,000cr
  return CREDIT_COSTS.ai_modify_simple;                    // 단순 500cr (기본)
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

  // ── 기간별 크레딧 히스토리 (충전+사용 통합) ────────
  async getHistory(userId: string, params: { from?: string; to?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const where: any = { userId };

    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to + 'T23:59:59.999Z');
    }

    const [logs, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditTransaction.count({ where }),
    ]);

    // 기간 합계
    const chargeWhere = { ...where, type: { in: ['CHARGE', 'SIGNUP_BONUS'] } };
    const useWhere = { ...where, type: 'USE' };
    const [chargeAgg, useAgg] = await Promise.all([
      this.prisma.creditTransaction.aggregate({ where: chargeWhere, _sum: { amount: true } }),
      this.prisma.creditTransaction.aggregate({ where: useWhere, _sum: { amount: true } }),
    ]);

    // 충전 원화 합계 (CHARGE 타입만)
    const chargeTransactions = await this.prisma.creditTransaction.findMany({
      where: { ...where, type: 'CHARGE' },
      select: { description: true, amount: true },
    });
    let chargedAmount = 0;
    for (const ct of chargeTransactions) {
      // description: "라이트팩 구매 (₩49,000)" 에서 가격 추출
      const match = ct.description?.match(/₩([\d,]+)/);
      if (match) chargedAmount += parseInt(match[1].replace(/,/g, ''), 10);
    }

    const bal = await this.getBalance(userId);

    return {
      balance: bal.balance,
      logs,
      summary: {
        totalCharged: chargeAgg._sum.amount || 0,
        totalUsed: Math.abs(useAgg._sum.amount || 0),
        chargedAmount,
      },
      pagination: { page, limit, total },
    };
  }

  // ── 충전 내역만 조회 ──────────────────────────────
  async getCharges(userId: string) {
    const charges = await this.prisma.creditTransaction.findMany({
      where: { userId, type: { in: ['CHARGE', 'SIGNUP_BONUS'] } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      charges: charges.map(c => {
        // 패키지명과 가격 추출
        let packageName = '회원가입 보너스';
        let price = 0;
        let method = '무료';

        if (c.type === 'CHARGE') {
          const descMatch = c.description?.match(/^(.+?)\s*구매/);
          packageName = descMatch ? descMatch[1] : c.description || '크레딧 충전';
          const priceMatch = c.description?.match(/₩([\d,]+)/);
          price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
          method = '카드결제';
        }

        return {
          date: c.createdAt,
          packageName,
          credits: c.amount,
          price,
          method,
          paymentRefId: c.paymentRefId,
        };
      }),
    };
  }

  // ── 이용내역서 데이터 생성 (PDF용) ─────────────────
  async getReportData(userId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59, 999);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true, name: true, company: true,
        businessName: true, businessNumber: true, representative: true,
        businessAddress: true, businessPhone: true,
      },
    });

    const where = { userId, createdAt: { gte: from, lte: to } };

    // 충전 내역
    const charges = await this.prisma.creditTransaction.findMany({
      where: { ...where, type: { in: ['CHARGE', 'SIGNUP_BONUS'] } },
      orderBy: { createdAt: 'asc' },
    });

    // 사용 내역
    const usages = await this.prisma.creditTransaction.findMany({
      where: { ...where, type: 'USE' },
      orderBy: { createdAt: 'asc' },
    });

    // 기능별 요약
    const featureSummary: Record<string, { count: number; credits: number }> = {};
    for (const u of usages) {
      const feature = u.taskType || u.description || '기타';
      if (!featureSummary[feature]) featureSummary[feature] = { count: 0, credits: 0 };
      featureSummary[feature].count++;
      featureSummary[feature].credits += Math.abs(u.amount);
    }

    // 충전 원화 합계
    let totalChargedAmount = 0;
    for (const c of charges) {
      const match = c.description?.match(/₩([\d,]+)/);
      if (match) totalChargedAmount += parseInt(match[1].replace(/,/g, ''), 10);
    }

    return {
      user,
      month,
      period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      charges: charges.map(c => ({
        date: c.createdAt,
        description: c.description,
        credits: c.amount,
      })),
      usages: usages.map(u => ({
        date: u.createdAt,
        description: u.description,
        taskType: u.taskType,
        projectId: u.projectId,
        credits: u.amount,
      })),
      featureSummary,
      totals: {
        totalCharged: charges.reduce((sum, c) => sum + c.amount, 0),
        totalUsed: usages.reduce((sum, u) => sum + Math.abs(u.amount), 0),
        totalChargedAmount,
      },
    };
  }

  // ── 패키지 목록 조회 ────────────────────────────────
  getPackages() {
    return CREDIT_PACKAGES;
  }
}
