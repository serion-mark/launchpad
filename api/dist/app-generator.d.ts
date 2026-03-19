interface TemplateConfig {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    features: {
        id: string;
        name: string;
        description: string;
        required: boolean;
        credits: number;
    }[];
    techStack: Record<string, string>;
    estimatedCredits: {
        base: number;
        allFeatures: number;
    };
}
interface GenerationResult {
    step: string;
    files: {
        path: string;
        content: string;
    }[];
    creditsUsed: number;
    model: string;
    costUSD: number;
}
export declare class AppGenerator {
    private llm;
    private templatesDir;
    constructor();
    listTemplates(): TemplateConfig[];
    getTemplate(templateId: string): TemplateConfig | null;
    calculateCredits(templateId: string, selectedFeatureIds: string[]): {
        baseCredits: number;
        featureCredits: number;
        totalCredits: number;
        breakdown: {
            feature: string;
            credits: number;
        }[];
    };
    generateApp(params: {
        templateId: string;
        selectedFeatures: string[];
        customRequirements: string;
        projectName: string;
        outputDir: string;
    }): Promise<{
        success: boolean;
        results: GenerationResult[];
        totalCredits: number;
        totalCostUSD: number;
        outputDir: string;
    }>;
    private groupEndpointsByModule;
    private parseFileOutput;
}
export {};
