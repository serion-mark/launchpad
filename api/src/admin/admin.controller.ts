import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';

// 어드민 이메일 화이트리스트 (환경변수 우선, 쉼표 구분)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@serion.ai.kr,mark@serion.ai.kr,mark@foundry.kr')
  .split(',').map(e => e.trim()).filter(Boolean);

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(
    private adminService: AdminService,
    private prisma: PrismaService,
  ) {}

  private async checkAdmin(req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      throw new ForbiddenException('Admin access only');
    }
  }

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    await this.checkAdmin(req);
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getUsers(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    await this.checkAdmin(req);
    return this.adminService.getUsers(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      search,
    );
  }

  @Get('projects')
  async getProjects(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('template') template?: string,
  ) {
    await this.checkAdmin(req);
    return this.adminService.getProjects(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      template,
    );
  }

  @Get('credits')
  async getCreditTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.checkAdmin(req);
    return this.adminService.getCreditTransactions(
      parseInt(page || '1'),
      parseInt(limit || '30'),
    );
  }

  @Get('ai-usage')
  async getAiUsage(@Request() req: any) {
    await this.checkAdmin(req);
    return this.adminService.getAiUsageStats();
  }

  // Agent Mode 세션별 비용 로그 — PM2 로그(`[cost] ... END`) 파싱
  // ⚠️ admin 전용, 고객 UI 에서는 접근 불가
  @Get('agent-cost-logs')
  async getAgentCostLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    await this.checkAdmin(req);
    return this.adminService.getAgentCostLogs(parseInt(limit || '200'));
  }
}
