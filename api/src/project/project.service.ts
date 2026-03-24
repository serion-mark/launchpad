import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        template: true,
        theme: true,
        status: true,
        subdomain: true,
        deployedUrl: true,
        buildStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getById(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  async create(userId: string, data: {
    name: string;
    description?: string;
    template: string;
    theme?: string;
    features?: any;
  }) {
    return this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        template: data.template,
        theme: data.theme || 'basic-light',
        features: data.features ?? undefined,
        status: 'draft',
        userId,
      },
    });
  }

  async update(id: string, userId: string, data: {
    name?: string;
    description?: string;
    theme?: string;
    features?: any;
    status?: string;
    chatHistory?: any;
    generatedCode?: any;
    subdomain?: string;
    deployedUrl?: string;
  }) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }

  // ── Sprint 3: 버전 히스토리 ───────────────────────

  async getVersions(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true, versions: true, currentVersion: true },
    });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    return {
      currentVersion: project.currentVersion || 1,
      versions: (project.versions as any[]) || [],
    };
  }

  async rollback(id: string, userId: string, targetVersion: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    const versions = (project.versions as any[]) || [];
    const target = versions.find(v => v.version === targetVersion);
    if (!target) throw new NotFoundException('해당 버전을 찾을 수 없습니다');
    if (!target.snapshot) throw new NotFoundException('이 버전에는 스냅샷이 없습니다');

    // 현재 상태를 새 버전으로 저장 (롤백 전 백업)
    const newVersion = (project.currentVersion || 1) + 1;
    versions.push({
      version: newVersion,
      createdAt: new Date().toISOString(),
      description: `v${targetVersion}으로 롤백`,
      snapshot: project.generatedCode,
      fileCount: (project.generatedCode as any[])?.length || 0,
    });

    await this.prisma.project.update({
      where: { id },
      data: {
        generatedCode: target.snapshot as any,
        currentVersion: newVersion,
        versions: versions as any,
        totalModifications: { increment: 1 },
        projectContext: {
          ...(project.projectContext as any || {}),
          lastAction: `v${targetVersion}으로 롤백`,
        } as any,
      },
    });

    return {
      success: true,
      currentVersion: newVersion,
      restoredFrom: targetVersion,
    };
  }

  // ── Phase 11: 호스팅 과금 ─────────────────────────

  static readonly HOSTING_PLANS = {
    free: { price: 0, visitorLimit: 1000, label: '무료', features: ['foundry.ai.kr 서브도메인', '월 1,000명 방문자'] },
    basic: { price: 29000, visitorLimit: -1, label: '호스팅 ₩29,000/월', features: ['무제한 방문자', 'SSL 자동 적용', '빠른 응답 속도'] },
    pro: { price: 29000, visitorLimit: -1, label: '호스팅 ₩29,000/월', features: ['무제한 방문자', 'SSL 자동 적용', '우선 지원'] },
  } as const;

  async updateHostingPlan(id: string, userId: string, plan: 'free' | 'basic' | 'pro') {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    const expiresAt = plan !== 'free'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일
      : null;

    const updated = await this.prisma.project.update({
      where: { id },
      data: { hostingPlan: plan, hostingExpiresAt: expiresAt },
    });

    return {
      plan: updated.hostingPlan,
      expiresAt: updated.hostingExpiresAt,
      ...ProjectService.HOSTING_PLANS[plan],
    };
  }

  async getHostingInfo(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true, hostingPlan: true, hostingExpiresAt: true, monthlyVisitors: true, visitorResetAt: true, deployedUrl: true, subdomain: true },
    });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    const plan = (project.hostingPlan || 'free') as 'free' | 'basic' | 'pro';
    const planInfo = ProjectService.HOSTING_PLANS[plan];
    const isOverLimit = plan === 'free' && project.monthlyVisitors > planInfo.visitorLimit;

    return {
      plan,
      ...planInfo,
      monthlyVisitors: project.monthlyVisitors,
      isOverLimit,
      expiresAt: project.hostingExpiresAt,
      deployedUrl: project.deployedUrl,
      subdomain: project.subdomain,
      plans: ProjectService.HOSTING_PLANS,
    };
  }
}
