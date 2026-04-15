import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InquiryService {
  constructor(private prisma: PrismaService) {}

  /** 문의 등록 (비로그인 가능) */
  async create(data: {
    name: string;
    email: string;
    phone?: string;
    content: string;
    source?: string;
    userId?: string;
    metadata?: unknown;
  }) {
    return this.prisma.inquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        content: data.content,
        source: data.source || 'chatbot',
        userId: data.userId || null,
        metadata: (data.metadata ?? undefined) as never,
      },
    });
  }

  /** 문의 목록 (어드민) */
  async findAll(page = 1, limit = 20, status?: string) {
    const where = status ? { status } : {};
    const [inquiries, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inquiry.count({ where }),
    ]);
    return { inquiries, total, pages: Math.ceil(total / limit) };
  }

  /** 문의 상세 (어드민) */
  async findOne(id: string) {
    return this.prisma.inquiry.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
  }

  /** 답변 등록 (어드민) */
  async reply(id: string, data: { reply: string; repliedBy: string }) {
    return this.prisma.inquiry.update({
      where: { id },
      data: {
        reply: data.reply,
        repliedBy: data.repliedBy,
        repliedAt: new Date(),
        status: 'replied',
      },
    });
  }

  /** 상태 변경 (어드민) */
  async updateStatus(id: string, status: string) {
    return this.prisma.inquiry.update({
      where: { id },
      data: { status },
    });
  }

  /** 미답변 문의 수 (뱃지용) */
  async countPending() {
    return this.prisma.inquiry.count({ where: { status: 'pending' } });
  }
}
