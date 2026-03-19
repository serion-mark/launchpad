import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';

// 어드민 이메일 화이트리스트
const ADMIN_EMAILS = ['admin@serion.ai.kr', 'mark@serion.ai.kr', 'mark@foundry.kr'];

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
}
