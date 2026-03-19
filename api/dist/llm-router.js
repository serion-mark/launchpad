"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMRouter = exports.MODELS = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
exports.MODELS = {
    fast: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        inputCostPer1M: 1,
        outputCostPer1M: 5,
        maxTokens: 8192,
        description: '빠른 수정, 대화, 간단한 코드 변경',
    },
    standard: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6-20260320',
        inputCostPer1M: 3,
        outputCostPer1M: 15,
        maxTokens: 16384,
        description: 'UI/백엔드 코드 생성, 메인 엔진',
    },
    premium: {
        provider: 'anthropic',
        model: 'claude-opus-4-6-20260320',
        inputCostPer1M: 5,
        outputCostPer1M: 25,
        maxTokens: 16384,
        description: '복잡한 아키텍처 설계, 전체 앱 구조',
    },
};
const TASK_ROUTING = {
    architecture: 'premium',
    frontend: 'standard',
    backend: 'standard',
    schema: 'standard',
    modify: 'fast',
    chat: 'fast',
    document: 'fast',
};
const CREDIT_COST = {
    architecture: 500,
    frontend: 200,
    backend: 200,
    schema: 100,
    modify: 50,
    chat: 10,
    document: 30,
};
class LLMRouter {
    constructor() {
        this.anthropic = new sdk_1.default({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }
    async generate(params) {
        const tier = params.overrideTier || TASK_ROUTING[params.taskType];
        const modelConfig = exports.MODELS[tier];
        const messages = [
            {
                role: 'user',
                content: params.templateContext
                    ? `[템플릿 컨텍스트]\n${params.templateContext}\n\n[요청]\n${params.userPrompt}`
                    : params.userPrompt,
            },
        ];
        const response = await this.anthropic.messages.create({
            model: modelConfig.model,
            max_tokens: modelConfig.maxTokens,
            system: params.systemPrompt,
            messages,
        });
        const content = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n');
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const estimatedCostUSD = (inputTokens / 1_000_000) * modelConfig.inputCostPer1M +
            (outputTokens / 1_000_000) * modelConfig.outputCostPer1M;
        return {
            content,
            model: modelConfig.model,
            tier,
            inputTokens,
            outputTokens,
            estimatedCostUSD,
            creditsUsed: CREDIT_COST[params.taskType],
        };
    }
    async designArchitecture(params) {
        const systemPrompt = `당신은 풀스택 웹 애플리케이션 아키텍트입니다.
주어진 업종 템플릿과 선택된 기능을 기반으로, 완전한 앱 아키텍처를 설계합니다.

기술 스택:
- 프론트엔드: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- 백엔드: NestJS + Prisma ORM
- DB: PostgreSQL
- 인증: JWT + bcrypt

출력 형식: JSON
{
  "pages": [{ "path": "/xxx", "name": "페이지명", "description": "설명" }],
  "apiEndpoints": [{ "method": "GET|POST|PATCH|DELETE", "path": "/api/xxx", "description": "설명" }],
  "dbModels": [{ "name": "ModelName", "fields": [{ "name": "fieldName", "type": "String|Int|DateTime|...", "relation": "optional" }] }],
  "features": ["feature1", "feature2"]
}`;
        return this.generate({
            taskType: 'architecture',
            systemPrompt,
            userPrompt: `업종 템플릿: ${params.templateId}
선택된 기능: ${params.selectedFeatures.join(', ')}
추가 요구사항: ${params.customRequirements}
템플릿 설정: ${JSON.stringify(params.templateConfig, null, 2)}`,
        });
    }
    async generateFrontend(params) {
        const systemPrompt = `당신은 Next.js 16 프론트엔드 개발자입니다.
주어진 아키텍처를 기반으로 페이지 컴포넌트를 생성합니다.

규칙:
- Next.js 16 App Router (app/ 디렉토리)
- TypeScript 필수
- Tailwind CSS로 스타일링 (다크/라이트 모드 지원)
- 'use client' 지시어는 상태/이벤트가 필요한 경우에만
- fetchJson() 유틸 함수로 API 호출
- 한국어 UI (라벨, 버튼 텍스트 등)
- 모바일 반응형 필수

코드만 출력하세요. 설명이나 마크다운 없이 순수 TypeScript/TSX 코드만.`;
        return this.generate({
            taskType: 'frontend',
            systemPrompt,
            userPrompt: `페이지: ${params.pageName}
설명: ${params.pageDescription}
아키텍처: ${JSON.stringify(params.architecture, null, 2)}`,
            templateContext: params.existingCode,
        });
    }
    async generateBackend(params) {
        const systemPrompt = `당신은 NestJS 백엔드 개발자입니다.
주어진 아키텍처를 기반으로 NestJS 모듈(Controller + Service)을 생성합니다.

규칙:
- NestJS + TypeScript
- Prisma ORM으로 DB 접근
- JWT 인증 Guard 적용
- DTO 클래스로 입력 검증
- 적절한 HTTP 상태 코드 반환
- 에러 처리 포함

출력 형식: 각 파일을 [FILE: 경로] 태그로 구분
[FILE: src/모듈명/모듈명.controller.ts]
... 코드 ...
[FILE: src/모듈명/모듈명.service.ts]
... 코드 ...
[FILE: src/모듈명/dto/create-모듈명.dto.ts]
... 코드 ...`;
        return this.generate({
            taskType: 'backend',
            systemPrompt,
            userPrompt: `모듈: ${params.moduleName}
설명: ${params.moduleDescription}
아키텍처: ${JSON.stringify(params.architecture, null, 2)}`,
            templateContext: params.prismaSchema,
        });
    }
    async generateSchema(params) {
        const systemPrompt = `당신은 Prisma ORM 전문가입니다.
주어진 모델 정의를 기반으로 schema.prisma 파일을 생성합니다.

규칙:
- PostgreSQL provider
- @id @default(cuid()) for primary keys
- @unique for unique fields
- @@index for frequently queried fields
- DateTime fields: @default(now()) for createdAt
- 관계(Relation)는 명확하게 정의
- enum은 별도로 정의

schema.prisma 코드만 출력하세요.`;
        return this.generate({
            taskType: 'schema',
            systemPrompt,
            userPrompt: `모델 정의:\n${JSON.stringify(params.models, null, 2)}`,
            templateContext: params.existingSchema,
        });
    }
    async modifyCode(params) {
        const systemPrompt = `당신은 코드 수정 전문가입니다.
사용자의 지시에 따라 기존 코드를 수정합니다.
수정된 전체 코드를 출력하세요. 변경 부분만이 아닌 전체 파일을 출력합니다.`;
        return this.generate({
            taskType: 'modify',
            systemPrompt,
            userPrompt: `파일: ${params.filePath}
수정 지시: ${params.instruction}`,
            templateContext: params.currentCode,
        });
    }
    getModelInfo(tier) {
        return exports.MODELS[tier];
    }
    getCreditCost(taskType) {
        return CREDIT_COST[taskType];
    }
}
exports.LLMRouter = LLMRouter;
//# sourceMappingURL=llm-router.js.map