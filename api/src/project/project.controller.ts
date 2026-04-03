import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { DeployService } from './deploy.service';
import { GitHubService } from './github.service';
import { CreditService } from '../credit/credit.service';
import { PrismaService } from '../prisma.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private deployService: DeployService,
    private githubService: GitHubService,
    private creditService: CreditService,
    private prisma: PrismaService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.projectService.list(req.user.userId);
  }

  // ★ A-5: 서브도메인 중복 확인 API (반드시 :id 경로 위에!)
  @Get('check-subdomain')
  checkSubdomain(@Query('name') name: string) {
    if (!name) return { available: false, reason: '서브도메인을 입력해주세요' };
    return this.projectService.checkSubdomainAvailable(name.toLowerCase().trim());
  }

  @Post()
  create(@Req() req: any, @Body() body: {
    name: string;
    description?: string;
    template: string;
    theme?: string;
    features?: any;
    subdomain?: string;
  }) {
    return this.projectService.create(req.user.userId, body);
  }

  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.projectService.getById(id, req.user.userId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: {
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
    return this.projectService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.projectService.remove(id, req.user.userId);
  }

  // ── 배포 ──────────────────────────────────────────
  @Post(':id/deploy')
  deploy(@Req() req: any, @Param('id') id: string) {
    return this.deployService.deploy(id, req.user.userId);
  }

  // ── 빌드 상태 조회 (프론트에서 폴링) ──
  @Get(':id/build-status')
  getBuildStatus(@Req() req: any, @Param('id') id: string) {
    return this.deployService.getBuildStatus(id, req.user.userId);
  }

  // ── 코드 다운로드 (플랜별 과금 → 매니페스트 조회 → 프론트에서 JSZip 조립) ──
  @Get(':id/download')
  async download(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // 스탠다드/프로/모두의창업 → 무료 다운로드
    const isFreeDownload =
      user?.plan === 'standard' || user?.plan === 'pro' ||
      (user?.planPrice && user.planPrice >= 490000);

    if (!isFreeDownload) {
      // 10,000cr 차감 (크레딧 부족 시 에러 throw)
      await this.creditService.deduct(userId, { action: 'code_download' as any, projectId: id });
    }

    return this.deployService.getDownloadManifest(id, userId);
  }

  // ── Sprint 3: 버전 히스토리 ───────────────────────
  @Get(':id/versions')
  getVersions(@Req() req: any, @Param('id') id: string) {
    return this.projectService.getVersions(id, req.user.userId);
  }

  @Post(':id/rollback')
  rollback(@Req() req: any, @Param('id') id: string, @Body() body: { version: number }) {
    return this.projectService.rollback(id, req.user.userId, body.version);
  }

  // ── Phase A-1: 인라인 편집 ───────────────────────────
  @Patch(':id/inline-edit')
  inlineEdit(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { filePath: string; oldText: string; newText: string },
  ) {
    return this.projectService.inlineEdit(id, req.user.userId, body);
  }

  // ── Phase 10: GitHub 연동 ───────────────────────────
  @Post(':id/github/push')
  pushToGitHub(@Req() req: any, @Param('id') id: string) {
    return this.githubService.pushToGitHub(id, req.user.userId);
  }

  // ── Phase 11: 호스팅 플랜 변경 ───────────────────────
  @Patch(':id/hosting')
  updateHosting(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { plan: 'free' | 'basic' | 'pro' },
  ) {
    return this.projectService.updateHostingPlan(id, req.user.userId, body.plan);
  }

  // ── 호스팅 현황 조회 ──
  @Get(':id/hosting')
  getHosting(@Req() req: any, @Param('id') id: string) {
    return this.projectService.getHostingInfo(id, req.user.userId);
  }
}
