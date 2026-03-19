import { CreditService } from './credit.service';
import type { PackageId, CreditAction } from './credit.service';
export declare class CreditController {
    private creditService;
    constructor(creditService: CreditService);
    getBalance(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        balance: number;
        totalCharged: number;
        totalUsed: number;
        freeTrialUsed: boolean;
    }>;
    getPackages(): {
        readonly lite: {
            readonly credits: 5000;
            readonly price: 49000;
            readonly label: "라이트팩";
        };
        readonly standard: {
            readonly credits: 15000;
            readonly price: 99000;
            readonly label: "스탠다드팩";
        };
        readonly pro: {
            readonly credits: 50000;
            readonly price: 249000;
            readonly label: "프로팩";
        };
    };
    charge(req: any, body: {
        packageId: PackageId;
        paymentRefId?: string;
    }): Promise<{
        balance: number;
        charged: 5000 | 15000 | 50000;
        package: "라이트팩" | "스탠다드팩" | "프로팩";
    }>;
    deduct(req: any, body: {
        action: CreditAction;
        projectId?: string;
        taskType?: string;
        modelTier?: string;
        description?: string;
    }): Promise<{
        balance: number;
        cost: number;
        remaining: number;
    }>;
    getTransactions(req: any, limit?: string): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        description: string | null;
        userId: string;
        amount: number;
        paymentRefId: string | null;
        balanceAfter: number;
        projectId: string | null;
        taskType: string | null;
        modelTier: string | null;
        balanceId: string;
    }[]>;
}
