import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

/** 예약된 서브도메인 (사용 불가) */
const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'app', 'mail', 'smtp', 'ftp', 'ssh',
  'cdn', 'static', 'assets', 'img', 'images', 'docs', 'help',
  'support', 'blog', 'test', 'staging', 'dev', 'preview',
  'ns1', 'ns2', 'mx', 'pop', 'imap', 'status', 'health',
]);

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  /** 서브도메인 생성: "app-" + 4자리 랜덤 (unique 보장) */
  private async generateUniqueSubdomain(preferredName?: string): Promise<string> {
    const MAX_RETRIES = 5;

    // 사용자 지정 서브도메인이면 그대로 사용 (검증은 호출자가 수행)
    if (preferredName) {
      return preferredName;
    }

    for (let i = 0; i < MAX_RETRIES; i++) {
      const random = crypto.randomBytes(2).toString('hex'); // 4자리 hex
      const subdomain = `app-${random}`;

      const existing = await this.prisma.project.findUnique({
        where: { subdomain },
        select: { id: true },
      });
      if (!existing) return subdomain;
    }

    // 극히 드물지만 모두 충돌 시 6자리로 확장
    const fallback = crypto.randomBytes(3).toString('hex');
    return `app-${fallback}`;
  }

  /** 서브도메인 유효성 검증 */
  validateSubdomain(name: string): { valid: boolean; reason?: string } {
    if (name.length < 3 || name.length > 30) {
      return { valid: false, reason: '서브도메인은 3~30자여야 합니다' };
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
      return { valid: false, reason: '영문 소문자, 숫자, 하이픈만 사용 가능합니다 (시작/끝은 영문 또는 숫자)' };
    }
    if (RESERVED_SUBDOMAINS.has(name)) {
      return { valid: false, reason: '예약된 서브도메인입니다' };
    }
    return { valid: true };
  }

  /** 서브도메인 사용 가능 여부 확인 */
  async checkSubdomainAvailable(name: string): Promise<{ available: boolean; reason?: string }> {
    const validation = this.validateSubdomain(name);
    if (!validation.valid) {
      return { available: false, reason: validation.reason };
    }
    const existing = await this.prisma.project.findUnique({
      where: { subdomain: name },
      select: { id: true },
    });
    if (existing) {
      return { available: false, reason: '이미 사용 중인 서브도메인입니다' };
    }
    return { available: true };
  }

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
    subdomain?: string;
  }) {
    // ★ A-5: 앱 생성 시 subdomain 즉시 배정
    let subdomain: string;
    if (data.subdomain) {
      // 사용자 지정 서브도메인: 검증 + 중복 체크
      const check = await this.checkSubdomainAvailable(data.subdomain);
      if (!check.available) {
        throw new BadRequestException(check.reason || '서브도메인 사용 불가');
      }
      subdomain = data.subdomain;
    } else {
      subdomain = await this.generateUniqueSubdomain();
    }

    return this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        template: data.template,
        theme: data.theme || 'basic-light',
        features: data.features ?? undefined,
        status: 'draft',
        userId,
        subdomain,
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

  // ── Phase A-4: 인라인 편집 (범용 JSX 텍스트 치환) ──
  async inlineEdit(id: string, userId: string, body: { filePath: string; oldText: string; newText: string }) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new ForbiddenException();

    const files = (project.generatedCode as any[]) || [];
    const oldText = body.oldText?.trim();
    const newText = body.newText?.trim();
    if (!oldText || !newText || oldText === newText) {
      return { success: false, matchFound: false, filePath: body.filePath || 'unknown' };
    }

    // ★ 경로 정규화: 슬래시 중복 제거 (src/app//page.tsx → src/app/page.tsx)
    const normalizedPath = body.filePath?.replace(/\/+/g, '/').replace(/^\//, '');

    // 1단계: filePath로 파일 찾기 → 정규화된 경로로도 검색
    let fileIdx = normalizedPath
      ? files.findIndex((f: any) => f.path === normalizedPath || f.path.replace(/\/+/g, '/') === normalizedPath)
      : -1;

    // 2단계: 단순 includes 매칭 시도
    if (fileIdx >= 0 && files[fileIdx].content.includes(oldText)) {
      return this.doReplace(files, fileIdx, oldText, newText, id);
    }

    // 3단계: filePath 없거나 못 찾으면 전체 파일에서 단순 includes 검색
    if (fileIdx === -1) {
      fileIdx = files.findIndex((f: any) => f.content?.includes(oldText));
      if (fileIdx >= 0) {
        return this.doReplace(files, fileIdx, oldText, newText, id);
      }
    }

    // 4단계: JSX 텍스트 패턴 매칭 (DOM innerText ≠ JSX 소스 문제 해결)
    // >텍스트<, {"텍스트"}, {'텍스트'}, {`텍스트`} 패턴 검색
    const result = this.findAndReplaceJsxText(files, oldText, newText, body.filePath);
    if (result.success) {
      await this.prisma.project.update({
        where: { id },
        data: { generatedCode: files as any, totalModifications: { increment: 1 } },
      });
      // F6 보호: lastModifiedFiles에 기록
      await this.markFileAsUserModified(id, result.filePath);
      return { success: true, matchFound: true, filePath: result.filePath };
    }

    return { success: false, matchFound: false, filePath: body.filePath || 'unknown' };
  }

  // 단순 치환 실행 + lastModifiedFiles 기록 (F6 보호용)
  private async doReplace(files: any[], fileIdx: number, oldText: string, newText: string, projectId: string) {
    const before = files[fileIdx].content;
    files[fileIdx].content = files[fileIdx].content.replace(oldText, newText);
    if (before === files[fileIdx].content) {
      return { success: false, matchFound: false, filePath: files[fileIdx].path };
    }
    const modifiedPath = files[fileIdx].path;
    await this.prisma.project.update({
      where: { id: projectId },
      data: { generatedCode: files as any, totalModifications: { increment: 1 } },
    });
    // F6 보호: lastModifiedFiles에 기록
    await this.markFileAsUserModified(projectId, modifiedPath);
    return { success: true, matchFound: true, filePath: modifiedPath };
  }

  // JSX 내 텍스트를 범용 패턴으로 찾아서 치환
  private findAndReplaceJsxText(files: any[], oldText: string, newText: string, preferredPath?: string): { success: boolean; filePath: string } {
    // oldText에서 특수 정규식 문자 이스케이프
    const escaped = oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 공백/줄바꿈을 유연하게 매칭 (\s+ 또는 JSX 태그 허용)
    const flexiblePattern = escaped.replace(/\s+/g, '[\\s\\n]*(?:<[^>]*>)*[\\s\\n]*');

    // 패턴들: >텍스트</  >텍스트\n  {"텍스트"}  {'텍스트'}  {`텍스트`}
    const patterns = [
      new RegExp(`(>)${flexiblePattern}(</)`, 'g'),      // >텍스트</
      new RegExp(`(>)${flexiblePattern}(\\s*<)`, 'g'),    // >텍스트 <
      new RegExp(`({")${escaped}("})`, 'g'),              // {"텍스트"}
      new RegExp(`({')${escaped}('})`, 'g'),              // {'텍스트'}
      new RegExp(`({\`)${escaped}(\`})`, 'g'),            // {`텍스트`}
    ];

    // preferredPath 파일 우선 검색
    const searchOrder = preferredPath
      ? [files.findIndex((f: any) => f.path === preferredPath), ...files.map((_, i) => i)]
      : files.map((_, i) => i);
    const seen = new Set<number>();

    for (const idx of searchOrder) {
      if (idx < 0 || seen.has(idx)) continue;
      seen.add(idx);
      const file = files[idx];
      if (!file?.content) continue;

      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(file.content);
        if (match) {
          // 첫 매칭만 치환 (정확성)
          const fullMatch = match[0];
          const prefix = match[1]; // > 또는 {"
          const suffix = match[match.length - 1]; // </ 또는 "}
          const replacement = `${prefix}${newText}${suffix}`;
          file.content = file.content.replace(fullMatch, replacement);
          return { success: true, filePath: file.path };
        }
      }
    }

    return { success: false, filePath: preferredPath || 'unknown' };
  }

  // 인라인 편집된 파일을 projectContext.lastModifiedFiles에 기록 (F6 보호용)
  private async markFileAsUserModified(projectId: string, filePath: string) {
    try {
      const proj = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { projectContext: true },
      });
      const ctx = (proj?.projectContext as any) || {};
      const modified: string[] = ctx.lastModifiedFiles || [];
      if (!modified.includes(filePath)) {
        modified.push(filePath);
        // 최근 10개만 유지
        if (modified.length > 10) modified.shift();
      }
      await this.prisma.project.update({
        where: { id: projectId },
        data: { projectContext: { ...ctx, lastModifiedFiles: modified } },
      });
    } catch { /* 보호 실패해도 치명적이지 않음 */ }
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
