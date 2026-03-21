import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { DeployService } from './deploy.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private deployService: DeployService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.projectService.list(req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() body: {
    name: string;
    description?: string;
    template: string;
    theme?: string;
    features?: any;
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

  // ── 코드 다운로드 (매니페스트 조회 → 프론트에서 JSZip 조립) ──
  @Get(':id/download')
  download(@Req() req: any, @Param('id') id: string) {
    return this.deployService.getDownloadManifest(id, req.user.userId);
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
}
