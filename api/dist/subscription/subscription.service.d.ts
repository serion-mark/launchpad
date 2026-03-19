import { PrismaService } from '../prisma.service';
export declare class SubscriptionService {
    private prisma;
    constructor(prisma: PrismaService);
    getCurrent(userId: string): Promise<{
        invoices: {
            id: string;
            plan: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            userId: string;
            month: string;
            amount: number;
            dueDate: Date;
            paidAt: Date | null;
            paidAmount: number | null;
            paymentMethod: string | null;
            paymentRefId: string | null;
            memo: string | null;
        }[];
        id: string;
        email: string;
        plan: string;
        planPrice: number;
        planExpiresAt: Date;
        planStatus: string;
    }>;
    changePlan(userId: string, newPlan: string): Promise<{
        plan: string;
        planPrice: number;
        planExpiresAt: Date;
        invoiceId: string;
    }>;
    getInvoices(userId: string): Promise<{
        id: string;
        plan: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        userId: string;
        month: string;
        amount: number;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: number | null;
        paymentMethod: string | null;
        paymentRefId: string | null;
        memo: string | null;
    }[]>;
    markPaid(invoiceId: string, paymentMethod: string, paymentRefId?: string): Promise<{
        id: string;
        plan: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        userId: string;
        month: string;
        amount: number;
        dueDate: Date;
        paidAt: Date | null;
        paidAmount: number | null;
        paymentMethod: string | null;
        paymentRefId: string | null;
        memo: string | null;
    }>;
    getPlanPrices(): Record<string, number>;
}
