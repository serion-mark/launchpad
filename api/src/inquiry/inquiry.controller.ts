import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InquiryService } from './inquiry.service';
import { PrismaService } from '../prisma.service';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@serion.ai.kr,mark@serion.ai.kr,mark@foundry.kr')
  .split(',').map(e => e.trim()).filter(Boolean);

@Controller('inquiry')
export class InquiryController {
  constructor(
    private inquiryService: InquiryService,
    private prisma: PrismaService,
  ) {}

  private async checkAdmin(req: { user: { userId: string } }) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      throw new ForbiddenException('Admin access only');
    }
    return user;
  }

  /** 문의 등록 — 인증 불필요 (비로그인도 가능) */
  @Post()
  async create(
    @Body() body: {
      name: string;
      email: string;
      phone?: string;
      content: string;
      source?: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    if (!body.name?.trim()) throw new BadRequestException('이름을 입력해주세요.');
    if (!body.email?.trim()) throw new BadRequestException('이메일을 입력해주세요.');
    if (!body.content?.trim()) throw new BadRequestException('문의 내용을 입력해주세요.');
    return this.inquiryService.create({
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim(),
      content: body.content.trim(),
      source: body.source || 'chatbot',
      userId: body.userId,
      metadata: body.metadata,
    });
  }

  /** 미답변 수 (어드민 뱃지용) */
  @Get('pending')
  @UseGuards(AuthGuard('jwt'))
  async countPending(@Request() req: { user: { userId: string } }) {
    await this.checkAdmin(req);
    const count = await this.inquiryService.countPending();
    return { count };
  }

  /** 문의 목록 (어드민) */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Request() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    await this.checkAdmin(req);
    return this.inquiryService.findAll(
      parseInt(page || '1'),
      parseInt(limit || '20'),
      status,
    );
  }

  /** 문의 상세 (어드민) */
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    await this.checkAdmin(req);
    return this.inquiryService.findOne(id);
  }

  /** 답변 등록 (어드민) */
  @Patch(':id/reply')
  @UseGuards(AuthGuard('jwt'))
  async reply(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { reply: string },
  ) {
    const admin = await this.checkAdmin(req);
    if (!body.reply?.trim()) throw new BadRequestException('답변 내용을 입력해주세요.');
    return this.inquiryService.reply(id, {
      reply: body.reply.trim(),
      repliedBy: admin.email,
    });
  }

  /** 상태 변경 (어드민) */
  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  async updateStatus(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    await this.checkAdmin(req);
    return this.inquiryService.updateStatus(id, body.status);
  }
}
