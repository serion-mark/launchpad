import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ── 대시보드 통계 ────────────────────────────────
  async getDashboardStats() {
    const [
      totalUsers,
      todayUsers,
      totalProjects,
      activeProjects,
      totalRevenue,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'active' } }),
      this.prisma.creditTransaction.aggregate({
        where: { type: 'CHARGE' },
        _sum: { amount: true },
      }),
      this.prisma.creditTransaction.aggregate({
        where: {
          type: 'CHARGE',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // 템플릿별 프로젝트 분포
    const templateDistribution = await this.prisma.project.groupBy({
      by: ['template'],
      _count: true,
      orderBy: { _count: { template: 'desc' } },
    });

    // 최근 7일 가입자 추이
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailySignups: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailySignups[d.toISOString().slice(0, 10)] = 0;
    }
    recentUsers.forEach(u => {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (dailySignups[key] !== undefined) dailySignups[key]++;
    });

    // 플랜별 사용자 분포
    const planDistribution = await this.prisma.user.groupBy({
      by: ['plan'],
      _count: true,
    });

    return {
      totalUsers,
      todayUsers,
      totalProjects,
      activeProjects,
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      templateDistribution: templateDistribution.map(t => ({
        template: t.template,
        count: t._count,
      })),
      dailySignups,
      planDistribution: planDistribution.map(p => ({
        plan: p.plan,
        count: p._count,
      })),
    };
  }

  // ── 사용자 목록 ────────────────────────────────
  async getUsers(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          creditBalance: { select: { balance: true, totalCharged: true, totalUsed: true } },
          _count: { select: { projects: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        provider: u.provider,
        credits: u.creditBalance?.balance ?? 0,
        totalCharged: u.creditBalance?.totalCharged ?? 0,
        totalUsed: u.creditBalance?.totalUsed ?? 0,
        projectCount: u._count.projects,
        createdAt: u.createdAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // ── 프로젝트 목록 ────────────────────────────────
  async getProjects(page = 1, limit = 20, template?: string) {
    const where = template ? { template } : {};

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          user: { select: { email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        template: p.template,
        theme: p.theme,
        status: p.status,
        userEmail: p.user.email,
        userName: p.user.name,
        createdAt: p.createdAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // ── 크레딧 거래 내역 ────────────────────────────
  async getCreditTransactions(page = 1, limit = 30) {
    const [transactions, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        include: {
          balance: {
            include: { user: { select: { email: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditTransaction.count(),
    ]);

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        taskType: t.taskType,
        modelTier: t.modelTier,
        userEmail: t.balance.user.email,
        userName: t.balance.user.name,
        createdAt: t.createdAt,
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // ── AI 사용량 통계 ────────────────────────────────
  async getAiUsageStats() {
    const aiTransactions = await this.prisma.creditTransaction.findMany({
      where: { type: 'USE', taskType: { not: null } },
      select: { taskType: true, modelTier: true, amount: true, createdAt: true },
    });

    const byTaskType: Record<string, { count: number; totalCredits: number }> = {};
    const byModelTier: Record<string, { count: number; totalCredits: number }> = {};

    aiTransactions.forEach(t => {
      const task = t.taskType || 'unknown';
      if (!byTaskType[task]) byTaskType[task] = { count: 0, totalCredits: 0 };
      byTaskType[task].count++;
      byTaskType[task].totalCredits += Math.abs(t.amount);

      const model = t.modelTier || 'unknown';
      if (!byModelTier[model]) byModelTier[model] = { count: 0, totalCredits: 0 };
      byModelTier[model].count++;
      byModelTier[model].totalCredits += Math.abs(t.amount);
    });

    return { byTaskType, byModelTier, totalRequests: aiTransactions.length };
  }
}
