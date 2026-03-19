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
exports.CreditService = exports.CREDIT_COSTS = exports.CREDIT_PACKAGES = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
exports.CREDIT_PACKAGES = {
    lite: { credits: 5000, price: 49000, label: '라이트팩' },
    standard: { credits: 15000, price: 99000, label: '스탠다드팩' },
    pro: { credits: 50000, price: 249000, label: '프로팩' },
};
exports.CREDIT_COSTS = {
    app_generate: 3000,
    ai_modify: 500,
    premium_theme: 1000,
    code_download: 5000,
    server_deploy: 8000,
    free_trial: 0,
};
const SIGNUP_BONUS = 500;
let CreditService = class CreditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBalance(userId) {
        let bal = await this.prisma.creditBalance.findUnique({
            where: { userId },
        });
        if (!bal) {
            bal = await this.prisma.creditBalance.create({
                data: {
                    userId,
                    balance: SIGNUP_BONUS,
                    totalCharged: SIGNUP_BONUS,
                },
            });
            await this.prisma.creditTransaction.create({
                data: {
                    userId,
                    balanceId: bal.id,
                    type: 'SIGNUP_BONUS',
                    amount: SIGNUP_BONUS,
                    balanceAfter: SIGNUP_BONUS,
                    description: '회원가입 보너스 500 크레딧',
                },
            });
        }
        return bal;
    }
    async charge(userId, packageId, paymentRefId) {
        const pkg = exports.CREDIT_PACKAGES[packageId];
        if (!pkg)
            throw new common_1.BadRequestException('유효하지 않은 패키지입니다');
        const bal = await this.getBalance(userId);
        const updated = await this.prisma.creditBalance.update({
            where: { id: bal.id },
            data: {
                balance: { increment: pkg.credits },
                totalCharged: { increment: pkg.credits },
            },
        });
        await this.prisma.creditTransaction.create({
            data: {
                userId,
                balanceId: bal.id,
                type: 'CHARGE',
                amount: pkg.credits,
                balanceAfter: updated.balance,
                description: `${pkg.label} 구매 (₩${pkg.price.toLocaleString()})`,
                paymentRefId,
            },
        });
        return { balance: updated.balance, charged: pkg.credits, package: pkg.label };
    }
    async deduct(userId, params) {
        const cost = exports.CREDIT_COSTS[params.action];
        const bal = await this.getBalance(userId);
        if (params.action === 'free_trial') {
            if (bal.freeTrialUsed) {
                throw new common_1.BadRequestException('맛보기 설계안은 1회만 무료입니다');
            }
            await this.prisma.creditBalance.update({
                where: { id: bal.id },
                data: { freeTrialUsed: true },
            });
            await this.prisma.creditTransaction.create({
                data: {
                    userId,
                    balanceId: bal.id,
                    type: 'FREE_TRIAL',
                    amount: 0,
                    balanceAfter: bal.balance,
                    description: params.description || '맛보기 설계안 (무료 1회)',
                    projectId: params.projectId,
                    taskType: params.taskType,
                    modelTier: params.modelTier,
                },
            });
            return { balance: bal.balance, cost: 0, remaining: bal.balance };
        }
        if (bal.balance < cost) {
            throw new common_1.ForbiddenException(JSON.stringify({
                code: 'INSUFFICIENT_CREDITS',
                required: cost,
                current: bal.balance,
                message: `크레딧이 부족합니다 (필요: ${cost}, 잔액: ${bal.balance})`,
            }));
        }
        const updated = await this.prisma.creditBalance.update({
            where: { id: bal.id },
            data: {
                balance: { decrement: cost },
                totalUsed: { increment: cost },
            },
        });
        await this.prisma.creditTransaction.create({
            data: {
                userId,
                balanceId: bal.id,
                type: 'USE',
                amount: -cost,
                balanceAfter: updated.balance,
                description: params.description || params.action,
                projectId: params.projectId,
                taskType: params.taskType,
                modelTier: params.modelTier,
            },
        });
        return { balance: updated.balance, cost, remaining: updated.balance };
    }
    async getTransactions(userId, limit = 30) {
        return this.prisma.creditTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    getPackages() {
        return exports.CREDIT_PACKAGES;
    }
};
exports.CreditService = CreditService;
exports.CreditService = CreditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CreditService);
//# sourceMappingURL=credit.service.js.map