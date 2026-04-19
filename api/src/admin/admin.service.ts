import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
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

  // ── Agent Mode 세션 비용 로그 (PM2 out.log 파싱) ────────────────────────
  // agent-builder.service.ts 의 `[cost] ... END` 라인을 파싱해 세션별로 집계
  // 원본 라인 예:
  //   [cost] session=12345678 END projectId=cmo5xxx name="localpick" iter=12
  //     total=$1.234 durationMs=120000 isEdit=true fileCount=27
  async getAgentCostLogs(limit = 200): Promise<{
    total: number;
    entries: Array<{
      ts: string;
      sessionId: string;
      userId: string | null;
      email: string | null;
      projectId: string | null;
      name: string;
      iter: number;
      totalUsd: number;
      durationMs: number;
      isEdit: boolean;
      fileCount: number;
    }>;
    summary: {
      totalSessions: number;
      totalUsd: number;
      createSessions: { count: number; totalUsd: number };
      editSessions: { count: number; totalUsd: number };
      avgUsdPerSession: number;
      byUser: Array<{
        userId: string | null;
        email: string | null;
        sessions: number;
        createCount: number;
        editCount: number;
        totalUsd: number;
      }>;
    };
  }> {
    const logger = new Logger(AdminService.name);
    const logPath = process.env.AGENT_LOG_PATH || '/root/.pm2/logs/launchpad-api-out.log';

    let text = '';
    try {
      text = await fs.readFile(logPath, 'utf8');
    } catch (err: any) {
      logger.warn(`[agent-cost-logs] 로그 파일 읽기 실패: ${err?.message}`);
      return {
        total: 0,
        entries: [],
        summary: {
          totalSessions: 0,
          totalUsd: 0,
          createSessions: { count: 0, totalUsd: 0 },
          editSessions: { count: 0, totalUsd: 0 },
          avgUsdPerSession: 0,
          byUser: [],
        },
      };
    }

    // PM2 로그 포맷: "...MM/DD/YYYY, HH:MM:SS AM/PM LOG [AgentBuilderService] [cost] session=... END ..."
    // ANSI 컬러 코드 제거 + 라인별 파싱
    const noAnsi = text.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = noAnsi.split('\n').filter((l) => l.includes('[cost]') && l.includes('END'));

    const tsRe = /(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/;
    // 신포맷 (userId + email 포함): 98d7263 이후 배포 버전부터
    const reNew =
      /\[cost\] session=(\S+) END userId=(\S+) email="([^"]*)" projectId=(\S+) name="([^"]*)" iter=(\d+) total=\$([0-9.]+) durationMs=(\d+) isEdit=(true|false) fileCount=(\d+)/;
    // 구포맷 호환 (userId/email 없이 저장된 초창기 로그)
    const reOld =
      /\[cost\] session=(\S+) END projectId=(\S+) name="([^"]*)" iter=(\d+) total=\$([0-9.]+) durationMs=(\d+) isEdit=(true|false) fileCount=(\d+)/;

    const entries: Awaited<ReturnType<AdminService['getAgentCostLogs']>>['entries'] = [];
    for (const line of lines) {
      const mNew = line.match(reNew);
      const ts = line.match(tsRe);
      if (mNew) {
        entries.push({
          ts: ts ? `${ts[1]} ${ts[2]}` : '',
          sessionId: mNew[1],
          userId: mNew[2] === 'anon' ? null : mNew[2],
          email: mNew[3] || null,
          projectId: mNew[4] === 'none' ? null : mNew[4],
          name: mNew[5],
          iter: parseInt(mNew[6], 10),
          totalUsd: parseFloat(mNew[7]),
          durationMs: parseInt(mNew[8], 10),
          isEdit: mNew[9] === 'true',
          fileCount: parseInt(mNew[10], 10),
        });
        continue;
      }
      const mOld = line.match(reOld);
      if (mOld) {
        entries.push({
          ts: ts ? `${ts[1]} ${ts[2]}` : '',
          sessionId: mOld[1],
          userId: null,
          email: null,
          projectId: mOld[2] === 'none' ? null : mOld[2],
          name: mOld[3],
          iter: parseInt(mOld[4], 10),
          totalUsd: parseFloat(mOld[5]),
          durationMs: parseInt(mOld[6], 10),
          isEdit: mOld[7] === 'true',
          fileCount: parseInt(mOld[8], 10),
        });
      }
    }

    // 최근순 정렬 + limit
    entries.reverse();
    const recent = entries.slice(0, limit);

    // 전체 기간 요약(limit 무관, 전체 로그 기준)
    const totalSessions = entries.length;
    const totalUsd = entries.reduce((sum, e) => sum + e.totalUsd, 0);
    const created = entries.filter((e) => !e.isEdit);
    const edited = entries.filter((e) => e.isEdit);

    // 사용자별 집계 — email 기준 (신포맷 로그만 집계됨, 구포맷은 email 없음)
    const userMap = new Map<
      string,
      { userId: string | null; email: string | null; sessions: number; createCount: number; editCount: number; totalUsd: number }
    >();
    for (const e of entries) {
      const key = e.email || e.userId || '(anon)';
      const agg =
        userMap.get(key) ??
        {
          userId: e.userId,
          email: e.email,
          sessions: 0,
          createCount: 0,
          editCount: 0,
          totalUsd: 0,
        };
      agg.sessions++;
      if (e.isEdit) agg.editCount++;
      else agg.createCount++;
      agg.totalUsd += e.totalUsd;
      userMap.set(key, agg);
    }
    const byUser = Array.from(userMap.values())
      .map((u) => ({ ...u, totalUsd: Number(u.totalUsd.toFixed(6)) }))
      .sort((a, b) => b.totalUsd - a.totalUsd);

    return {
      total: entries.length,
      entries: recent,
      summary: {
        totalSessions,
        totalUsd: Number(totalUsd.toFixed(6)),
        createSessions: {
          count: created.length,
          totalUsd: Number(created.reduce((s, e) => s + e.totalUsd, 0).toFixed(6)),
        },
        editSessions: {
          count: edited.length,
          totalUsd: Number(edited.reduce((s, e) => s + e.totalUsd, 0).toFixed(6)),
        },
        avgUsdPerSession: totalSessions > 0 ? Number((totalUsd / totalSessions).toFixed(6)) : 0,
        byUser,
      },
    };
  }
}
