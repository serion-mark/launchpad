export type ModelTier = 'fast' | 'standard' | 'premium';
export interface ModelConfig {
    provider: 'anthropic' | 'openai' | 'google';
    model: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
    maxTokens: number;
    description: string;
}
export declare const MODELS: Record<ModelTier, ModelConfig>;
export type TaskType = 'architecture' | 'frontend' | 'backend' | 'schema' | 'modify' | 'chat' | 'document';
export declare class LLMRouter {
    private anthropic;
    constructor();
    generate(params: {
        taskType: TaskType;
        systemPrompt: string;
        userPrompt: string;
        templateContext?: string;
        overrideTier?: ModelTier;
    }): Promise<{
        content: string;
        model: string;
        tier: ModelTier;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUSD: number;
        creditsUsed: number;
    }>;
    designArchitecture(params: {
        templateId: string;
        selectedFeatures: string[];
        customRequirements: string;
        templateConfig: object;
    }): Promise<{
        content: string;
        model: string;
        tier: ModelTier;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUSD: number;
        creditsUsed: number;
    }>;
    generateFrontend(params: {
        pageName: string;
        pageDescription: string;
        architecture: object;
        existingCode?: string;
    }): Promise<{
        content: string;
        model: string;
        tier: ModelTier;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUSD: number;
        creditsUsed: number;
    }>;
    generateBackend(params: {
        moduleName: string;
        moduleDescription: string;
        architecture: object;
        prismaSchema?: string;
    }): Promise<{
        content: string;
        model: string;
        tier: ModelTier;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUSD: number;
        creditsUsed: number;
    }>;
    generateSchema(params: {
        models: object[];
        existingSchema?: string;
    }): Promise<{
        content: string;
        model: string;
        tier: ModelTier;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUSD: number;
        creditsUsed: number;
    }>;
    modifyCode(params: {
        instruction: string;
        currentCode: string;
        filePath: string;
    }): Promise<{
        content: string;
        model: string;
        tier: ModelTier;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUSD: number;
        creditsUsed: number;
    }>;
    getModelInfo(tier: ModelTier): ModelConfig;
    getCreditCost(taskType: TaskType): number;
}
