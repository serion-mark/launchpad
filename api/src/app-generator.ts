/**
 * Launchpad 앱 생성 엔진
 *
 * 전체 흐름:
 * 1. 고객이 업종 + 기능 선택
 * 2. 템플릿 로드 → AI가 아키텍처 설계
 * 3. DB 스키마 생성
 * 4. 백엔드 API 생성
 * 5. 프론트엔드 페이지 생성
 * 6. 빌드 → 미리보기 or 배포
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { LLMRouter } from './llm-router';

const logger = new Logger('AppGenerator');

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
    estimatedCredits: { base: number; allFeatures: number };
}

interface GenerationResult {
    step: string;
    files: { path: string; content: string }[];
    creditsUsed: number;
    model: string;
    costUSD: number;
}

export class AppGenerator {
    private llm: LLMRouter;
    private templatesDir: string;

    constructor() {
        this.llm = new LLMRouter();
        this.templatesDir = path.resolve(__dirname, '../../templates');
    }

    /**
     * 사용 가능한 템플릿 목록 조회
     */
    listTemplates(): TemplateConfig[] {
        const templates: TemplateConfig[] = [];
        const dirs = fs.readdirSync(this.templatesDir);

        for (const dir of dirs) {
            const configPath = path.join(this.templatesDir, dir, 'config', 'template.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                templates.push(config);
            }
        }

        return templates;
    }

    /**
     * 특정 템플릿 상세 조회
     */
    getTemplate(templateId: string): TemplateConfig | null {
        const configPath = path.join(this.templatesDir, templateId, 'config', 'template.json');
        if (!fs.existsSync(configPath)) return null;
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }

    /**
     * 필요 크레딧 계산
     */
    calculateCredits(templateId: string, selectedFeatureIds: string[]): {
        baseCredits: number;
        featureCredits: number;
        totalCredits: number;
        breakdown: { feature: string; credits: number }[];
    } {
        const template = this.getTemplate(templateId);
        if (!template) throw new Error(`Template not found: ${templateId}`);

        const breakdown: { feature: string; credits: number }[] = [];
        let featureCredits = 0;

        for (const featureId of selectedFeatureIds) {
            const feature = template.features.find((f) => f.id === featureId);
            if (feature && !feature.required) {
                breakdown.push({ feature: feature.name, credits: feature.credits });
                featureCredits += feature.credits;
            }
        }

        return {
            baseCredits: template.estimatedCredits.base,
            featureCredits,
            totalCredits: template.estimatedCredits.base + featureCredits,
            breakdown,
        };
    }

    /**
     * MVP 앱 전체 생성 (메인 파이프라인)
     */
    async generateApp(params: {
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
    }> {
        const template = this.getTemplate(params.templateId);
        if (!template) throw new Error(`Template not found: ${params.templateId}`);

        const results: GenerationResult[] = [];
        let totalCredits = 0;
        let totalCostUSD = 0;

        // 출력 디렉토리 생성
        const outDir = path.join(params.outputDir, params.projectName);
        fs.mkdirSync(outDir, { recursive: true });

        // ── Step 1: 아키텍처 설계 (Opus) ────────────────────
        logger.log('Step 1: 아키텍처 설계...');
        const archResult = await this.llm.designArchitecture({
            templateId: params.templateId,
            selectedFeatures: params.selectedFeatures,
            customRequirements: params.customRequirements,
            templateConfig: template,
        });

        let architecture: object;
        try {
            // JSON 블록 추출
            const jsonMatch = archResult.content.match(/\{[\s\S]*\}/);
            architecture = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch {
            architecture = { raw: archResult.content };
        }

        const archFile = { path: '_architecture.json', content: JSON.stringify(architecture, null, 2) };
        fs.writeFileSync(path.join(outDir, archFile.path), archFile.content);

        results.push({
            step: 'architecture',
            files: [archFile],
            creditsUsed: archResult.creditsUsed,
            model: archResult.model,
            costUSD: archResult.estimatedCostUSD,
        });
        totalCredits += archResult.creditsUsed;
        totalCostUSD += archResult.estimatedCostUSD;

        // ── Step 2: DB 스키마 생성 (Sonnet) ─────────────────
        logger.log('Step 2: DB 스키마 생성...');
        const dbModels = (architecture as any).dbModels || [];
        const schemaResult = await this.llm.generateSchema({ models: dbModels });

        const schemaFile = { path: 'prisma/schema.prisma', content: schemaResult.content };
        const schemaDir = path.join(outDir, 'prisma');
        fs.mkdirSync(schemaDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, schemaFile.path), schemaFile.content);

        results.push({
            step: 'schema',
            files: [schemaFile],
            creditsUsed: schemaResult.creditsUsed,
            model: schemaResult.model,
            costUSD: schemaResult.estimatedCostUSD,
        });
        totalCredits += schemaResult.creditsUsed;
        totalCostUSD += schemaResult.estimatedCostUSD;

        // ── Step 3: 백엔드 API 생성 (Sonnet) ────────────────
        logger.log('Step 3: 백엔드 API 생성...');
        const apiEndpoints = (architecture as any).apiEndpoints || [];
        const modules = this.groupEndpointsByModule(apiEndpoints);

        for (const [moduleName, endpoints] of Object.entries(modules)) {
            const backendResult = await this.llm.generateBackend({
                moduleName,
                moduleDescription: `${moduleName} 모듈: ${(endpoints as any[]).map((e: any) => e.description).join(', ')}`,
                architecture,
                prismaSchema: schemaResult.content,
            });

            const files = this.parseFileOutput(backendResult.content);
            for (const file of files) {
                const fullPath = path.join(outDir, file.path);
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, file.content);
            }

            results.push({
                step: `backend-${moduleName}`,
                files,
                creditsUsed: backendResult.creditsUsed,
                model: backendResult.model,
                costUSD: backendResult.estimatedCostUSD,
            });
            totalCredits += backendResult.creditsUsed;
            totalCostUSD += backendResult.estimatedCostUSD;
        }

        // ── Step 4: 프론트엔드 페이지 생성 (Sonnet) ─────────
        logger.log('Step 4: 프론트엔드 페이지 생성...');
        const pages = (architecture as any).pages || [];

        for (const page of pages) {
            const frontendResult = await this.llm.generateFrontend({
                pageName: page.name,
                pageDescription: page.description,
                architecture,
            });

            const pagePath = `src/app${page.path}/page.tsx`;
            const files = [{ path: pagePath, content: frontendResult.content }];

            const fullPath = path.join(outDir, pagePath);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, frontendResult.content);

            results.push({
                step: `frontend-${page.name}`,
                files,
                creditsUsed: frontendResult.creditsUsed,
                model: frontendResult.model,
                costUSD: frontendResult.estimatedCostUSD,
            });
            totalCredits += frontendResult.creditsUsed;
            totalCostUSD += frontendResult.estimatedCostUSD;
        }

        logger.log(`생성 완료! 총 크레딧: ${totalCredits}, 예상 비용: $${totalCostUSD.toFixed(2)}`);

        return {
            success: true,
            results,
            totalCredits,
            totalCostUSD,
            outputDir: outDir,
        };
    }

    /**
     * API 엔드포인트를 모듈 단위로 그룹핑
     */
    private groupEndpointsByModule(endpoints: any[]): Record<string, any[]> {
        const modules: Record<string, any[]> = {};
        for (const ep of endpoints) {
            // /api/reservations/xxx → reservations
            const parts = ep.path.split('/').filter(Boolean);
            const moduleName = parts[1] || parts[0] || 'main';
            if (!modules[moduleName]) modules[moduleName] = [];
            modules[moduleName].push(ep);
        }
        return modules;
    }

    /**
     * [FILE: path] 태그로 구분된 AI 출력을 파싱
     */
    private parseFileOutput(output: string): { path: string; content: string }[] {
        const files: { path: string; content: string }[] = [];
        const regex = /\[FILE:\s*(.+?)\]\s*\n([\s\S]*?)(?=\[FILE:|$)/g;
        let match;

        while ((match = regex.exec(output)) !== null) {
            files.push({
                path: match[1].trim(),
                content: match[2].trim(),
            });
        }

        // [FILE:] 태그가 없으면 전체를 하나의 파일로
        if (files.length === 0 && output.trim()) {
            files.push({ path: 'output.ts', content: output.trim() });
        }

        return files;
    }
}
