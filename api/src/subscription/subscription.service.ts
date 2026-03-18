import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 150000,
  pro: 290000,
};

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getCurrent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, plan: true, planPrice: true, planExpiresAt: true, planStatus: true },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');

    const recentInvoices = await this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return { ...user, invoices: recentInvoices };
  }

  async changePlan(userId: string, newPlan: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');
    if (user.plan === newPlan) throw new BadRequestException('이미 동일한 플랜입니다');

    const newPrice = PLAN_PRICES[newPlan] ?? 0;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const expiresAt = newPlan === 'free' ? null : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const [updatedUser, invoice] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { plan: newPlan, planPrice: newPrice, planExpiresAt: expiresAt, planStatus: 'ACTIVE' },
      }),
      this.prisma.invoice.create({
        data: {
          userId,
          month,
          plan: newPlan,
          amount: newPrice,
          status: newPrice === 0 ? 'PAID' : 'PENDING',
          dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
          paidAt: newPrice === 0 ? now : null,
          paidAmount: newPrice === 0 ? 0 : null,
          memo: `플랜 변경: ${user.plan} → ${newPlan}`,
        },
      }),
    ]);

    await this.prisma.paymentEvent.create({
      data: {
        userId,
        invoiceId: invoice.id,
        eventType: 'PLAN_CHANGE',
        amount: newPrice,
        description: `${user.plan} → ${newPlan} (₩${newPrice.toLocaleString()}/월)`,
      },
    });

    return {
      plan: updatedUser.plan,
      planPrice: updatedUser.planPrice,
      planExpiresAt: updatedUser.planExpiresAt,
      invoiceId: invoice.id,
    };
  }

  async getInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markPaid(invoiceId: string, paymentMethod: string, paymentRefId?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('청구서를 찾을 수 없습니다');
    if (invoice.status === 'PAID') throw new BadRequestException('이미 결제된 청구서입니다');

    const [updated] = await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date(), paidAmount: invoice.amount, paymentMethod, paymentRefId },
      }),
      this.prisma.paymentEvent.create({
        data: { userId: invoice.userId, invoiceId, eventType: 'PAYMENT_SUCCESS', amount: invoice.amount, description: `${paymentMethod} 결제 완료` },
      }),
    ]);

    return updated;
  }

  getPlanPrices() {
    return PLAN_PRICES;
  }
}
