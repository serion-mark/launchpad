import { SubscriptionService } from './subscription.service';
export declare class SubscriptionController {
    private subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    getCurrent(req: any): Promise<{
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
    changePlan(req: any, body: {
        plan: string;
    }): Promise<{
        plan: string;
        planPrice: number;
        planExpiresAt: Date;
        invoiceId: string;
    }>;
    getInvoices(req: any): Promise<{
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
    markPaid(req: any, id: string, body: {
        paymentMethod: string;
        paymentRefId?: string;
    }): Promise<{
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
    getPlans(): Record<string, number>;
}
