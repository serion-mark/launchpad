"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const PLAN_PRICES = {
    free: 0,
    starter: 150000,
    pro: 290000,
};
let SubscriptionService = class SubscriptionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCurrent(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, plan: true, planPrice: true, planExpiresAt: true, planStatus: true },
        });
        if (!user)
            throw new common_1.NotFoundException('사용자를 찾을 수 없습니다');
        const recentInvoices = await this.prisma.invoice.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 6,
        });
        return { ...user, invoices: recentInvoices };
    }
    async changePlan(userId, newPlan) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('사용자를 찾을 수 없습니다');
        if (user.plan === newPlan)
            throw new common_1.BadRequestException('이미 동일한 플랜입니다');
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
    async getInvoices(userId) {
        return this.prisma.invoice.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async markPaid(invoiceId, paymentMethod, paymentRefId) {
        const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice)
            throw new common_1.NotFoundException('청구서를 찾을 수 없습니다');
        if (invoice.status === 'PAID')
            throw new common_1.BadRequestException('이미 결제된 청구서입니다');
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
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map