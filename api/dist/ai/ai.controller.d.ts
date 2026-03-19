import { AiService } from './ai.service';
export declare class AiController {
    private aiService;
    constructor(aiService: AiService);
    chat(req: any, body: {
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
    generate(req: any, body: {
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
    modify(req: any, body: {
        projectId: string;
        instruction: string;
        currentCode?: string;
    }): Promise<{
        content: string;
        model: string;
    }>;
}
