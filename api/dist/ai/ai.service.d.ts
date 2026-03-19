import { CreditService } from '../credit/credit.service';
import { PrismaService } from '../prisma.service';
export declare class AiService {
    private creditService;
    private prisma;
    private anthropic;
    private readonly logger;
    constructor(creditService: CreditService, prisma: PrismaService);
    chat(userId: string, params: {
        projectId: string;
        message: string;
        chatHistory: {
            role: string;
            content: string;
        }[];
        template?: string;
    }): Promise<{
        content: string;
        model: string;
        tier: "fast";
        inputTokens: number;
        outputTokens: number;
    }>;
    generateArchitecture(userId: string, params: {
        projectId: string;
        chatHistory: {
            role: string;
            content: string;
        }[];
        template: string;
    }): Promise<{
        architecture: any;
        isFreeTrial: boolean;
        model: string;
        inputTokens: number;
        outputTokens: number;
    }>;
    modifyCode(userId: string, params: {
        projectId: string;
        instruction: string;
        currentCode?: string;
    }): Promise<{
        content: string;
        model: string;
    }>;
}
