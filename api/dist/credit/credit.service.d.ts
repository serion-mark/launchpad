import { PrismaService } from '../prisma.service';
export declare const CREDIT_PACKAGES: {
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
export type PackageId = keyof typeof CREDIT_PACKAGES;
export declare const CREDIT_COSTS: {
    readonly app_generate: 3000;
    readonly ai_modify: 500;
    readonly premium_theme: 1000;
    readonly code_download: 5000;
    readonly server_deploy: 8000;
    readonly free_trial: 0;
};
export type CreditAction = keyof typeof CREDIT_COSTS;
export declare class CreditService {
    private prisma;
    constructor(prisma: PrismaService);
    getBalance(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        balance: number;
        totalCharged: number;
        totalUsed: number;
        freeTrialUsed: boolean;
    }>;
    charge(userId: string, packageId: PackageId, paymentRefId?: string): Promise<{
        balance: number;
        charged: 5000 | 15000 | 50000;
        package: "라이트팩" | "스탠다드팩" | "프로팩";
    }>;
    deduct(userId: string, params: {
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
    getTransactions(userId: string, limit?: number): Promise<{
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
}
