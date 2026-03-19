"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGenerator = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const llm_router_1 = require("./llm-router");
class AppGenerator {
    constructor() {
        this.llm = new llm_router_1.LLMRouter();
        this.templatesDir = path.resolve(__dirname, '../../templates');
    }
    listTemplates() {
        const templates = [];
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
    getTemplate(templateId) {
        const configPath = path.join(this.templatesDir, templateId, 'config', 'template.json');
        if (!fs.existsSync(configPath))
            return null;
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    calculateCredits(templateId, selectedFeatureIds) {
        const template = this.getTemplate(templateId);
        if (!template)
            throw new Error(`Template not found: ${templateId}`);
        const breakdown = [];
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
    async generateApp(params) {
        const template = this.getTemplate(params.templateId);
        if (!template)
            throw new Error(`Template not found: ${params.templateId}`);
        const results = [];
        let totalCredits = 0;
        let totalCostUSD = 0;
        const outDir = path.join(params.outputDir, params.projectName);
        fs.mkdirSync(outDir, { recursive: true });
        console.log('📐 Step 1: 아키텍처 설계...');
        const archResult = await this.llm.designArchitecture({
            templateId: params.templateId,
            selectedFeatures: params.selectedFeatures,
            customRequirements: params.customRequirements,
            templateConfig: template,
        });
        let architecture;
        try {
            const jsonMatch = archResult.content.match(/\{[\s\S]*\}/);
            architecture = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        }
        catch {
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
        console.log('🗄️ Step 2: DB 스키마 생성...');
        const dbModels = architecture.dbModels || [];
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
        console.log('⚙️ Step 3: 백엔드 API 생성...');
        const apiEndpoints = architecture.apiEndpoints || [];
        const modules = this.groupEndpointsByModule(apiEndpoints);
        for (const [moduleName, endpoints] of Object.entries(modules)) {
            const backendResult = await this.llm.generateBackend({
                moduleName,
                moduleDescription: `${moduleName} 모듈: ${endpoints.map((e) => e.description).join(', ')}`,
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
        console.log('🎨 Step 4: 프론트엔드 페이지 생성...');
        const pages = architecture.pages || [];
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
        console.log(`✅ 생성 완료! 총 크레딧: ${totalCredits}, 예상 비용: $${totalCostUSD.toFixed(2)}`);
        return {
            success: true,
            results,
            totalCredits,
            totalCostUSD,
            outputDir: outDir,
        };
    }
    groupEndpointsByModule(endpoints) {
        const modules = {};
        for (const ep of endpoints) {
            const parts = ep.path.split('/').filter(Boolean);
            const moduleName = parts[1] || parts[0] || 'main';
            if (!modules[moduleName])
                modules[moduleName] = [];
            modules[moduleName].push(ep);
        }
        return modules;
    }
    parseFileOutput(output) {
        const files = [];
        const regex = /\[FILE:\s*(.+?)\]\s*\n([\s\S]*?)(?=\[FILE:|$)/g;
        let match;
        while ((match = regex.exec(output)) !== null) {
            files.push({
                path: match[1].trim(),
                content: match[2].trim(),
            });
        }
        if (files.length === 0 && output.trim()) {
            files.push({ path: 'output.ts', content: output.trim() });
        }
        return files;
    }
}
exports.AppGenerator = AppGenerator;
//# sourceMappingURL=app-generator.js.map