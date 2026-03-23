/**
 * Launchpad 멀티 LLM 라우터
 *
 * Base44 벤치마킹: 작업 유형에 따라 최적의 AI 모델로 자동 라우팅
 * - UI/프론트엔드 → Claude Sonnet (UI 코드 품질 최고)
 * - 백엔드 로직 → Claude Sonnet (타입 안전한 코드)
 * - 간단한 수정/대화 → Haiku (빠르고 저렴)
 * - 복잡한 아키텍처 → Claude Opus (가끔만)
 * - 문서/설명 → Gemini Flash (가성비)
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── 모델 정의 ──────────────────────────────────────────
export type ModelTier = 'fast' | 'standard' | 'premium';

export interface ModelConfig {
    provider: 'anthropic' | 'openai' | 'google';
    model: string;
    inputCostPer1M: number;  // USD
    outputCostPer1M: number; // USD
    maxTokens: number;
    description: string;
}

export const MODELS: Record<ModelTier, ModelConfig> = {
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
        model: 'claude-sonnet-4-20250514',
        inputCostPer1M: 3,
        outputCostPer1M: 15,
        maxTokens: 16384,
        description: 'UI/백엔드 코드 생성, 메인 엔진',
    },
    premium: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        inputCostPer1M: 5,
        outputCostPer1M: 25,
        maxTokens: 16384,
        description: '복잡한 아키텍처 설계, 전체 앱 구조',
    },
};

// ── 작업 유형별 라우팅 규칙 ─────────────────────────────
export type TaskType =
    | 'architecture'      // 전체 앱 구조 설계
    | 'frontend'          // UI/페이지 생성
    | 'backend'           // API/서비스 로직
    | 'schema'            // DB 스키마 설계
    | 'modify'            // 기존 코드 수정
    | 'chat'              // 대화/질문 응답
    | 'document';         // 문서/설명 생성

const TASK_ROUTING: Record<TaskType, ModelTier> = {
    architecture: 'premium',
    frontend: 'standard',
    backend: 'standard',
    schema: 'standard',
    modify: 'fast',
    chat: 'fast',
    document: 'fast',
};

// ── 크레딧 소모량 ──────────────────────────────────────
const CREDIT_COST: Record<TaskType, number> = {
    architecture: 500,
    frontend: 200,
    backend: 200,
    schema: 100,
    modify: 50,
    chat: 10,
    document: 30,
};

// ── AI 회의실 모델 매핑 ─────────────────────────────────
export const MEETING_MODELS = {
    standard: {
        claude: 'claude-sonnet-4-20250514',
        gpt: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
    },
    premium: {
        claude: 'claude-sonnet-4-20250514',  // Opus 크레딧 부족 시 Sonnet 사용
        gpt: 'gpt-4o',
        gemini: 'gemini-2.0-flash',
    },
} as const;

// ── LLM 라우터 ─────────────────────────────────────────
export class LLMRouter {
    private anthropic: Anthropic;
    private openai: OpenAI | null = null;
    private googleAI: GoogleGenerativeAI | null = null;

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }

        if (process.env.GEMINI_API_KEY) {
            this.googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
    }

    // ── 범용 프로바이더별 호출 메서드 (AI 회의실/스마트 분석용) ──

    async callAnthropic(system: string, user: string, model = 'claude-sonnet-4-20250514', maxTokens = 4096): Promise<string> {
        const response = await this.anthropic.messages.create({
            model,
            max_tokens: maxTokens,
            system,
            messages: [{ role: 'user', content: user }],
        });
        return response.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as Anthropic.TextBlock).text)
            .join('\n');
    }

    async callOpenAI(system: string, user: string, model = 'gpt-4o', maxTokens = 4096): Promise<string> {
        if (!this.openai) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다');
        const response = await this.openai.chat.completions.create({
            model,
            max_tokens: maxTokens,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
        });
        return response.choices[0]?.message?.content || '';
    }

    async callGoogle(system: string, user: string, model = 'gemini-2.0-flash', maxTokens = 4096): Promise<string> {
        if (!this.googleAI) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');
        const genModel = this.googleAI.getGenerativeModel({
            model,
            generationConfig: { maxOutputTokens: maxTokens },
            systemInstruction: system,
        });

        const maxRetries = 3;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // 연속 호출 시 rate limit 방지: 첫 호출도 2초 딜레이
                if (attempt > 0) {
                    const waitSec = Math.min(30, 10 * attempt); // 10s, 20s, 30s
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                } else {
                    await new Promise(r => setTimeout(r, 2000)); // 사전 2초 딜레이
                }
                const result = await genModel.generateContent(user);
                return result.response.text();
            } catch (error: any) {
                const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
                if (is429 && attempt < maxRetries) {
                    continue; // 재시도
                }
                throw error;
            }
        }
        throw new Error('Gemini API 호출 실패: 최대 재시도 횟수 초과');
    }

    /**
     * 작업 유형에 따라 최적의 모델로 라우팅하여 응답 생성
     */
    async generate(params: {
        taskType: TaskType;
        systemPrompt: string;
        userPrompt: string;
        templateContext?: string; // 업종 템플릿 코드 컨텍스트
        overrideTier?: ModelTier; // 수동 모델 선택
    }): Promise<{
        content: string;
        model: string;
        tier: ModelTier;
        inputTokens: number;
        outputTokens: number;
        estimatedCostUSD: number;
        creditsUsed: number;
    }> {
        const tier = params.overrideTier || TASK_ROUTING[params.taskType];
        const modelConfig = MODELS[tier];

        const messages: Anthropic.MessageParam[] = [
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
            .map((block) => (block as Anthropic.TextBlock).text)
            .join('\n');

        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const estimatedCostUSD =
            (inputTokens / 1_000_000) * modelConfig.inputCostPer1M +
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

    /**
     * 앱 전체 아키텍처를 설계 (premium 모델 사용)
     */
    async designArchitecture(params: {
        templateId: string;
        selectedFeatures: string[];
        customRequirements: string;
        templateConfig: object;
    }) {
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

    /**
     * 프론트엔드 페이지 코드 생성
     */
    async generateFrontend(params: {
        pageName: string;
        pageDescription: string;
        architecture: object;
        existingCode?: string;
    }) {
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

    /**
     * 백엔드 API 코드 생성
     */
    async generateBackend(params: {
        moduleName: string;
        moduleDescription: string;
        architecture: object;
        prismaSchema?: string;
    }) {
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

    /**
     * Prisma DB 스키마 생성
     */
    async generateSchema(params: {
        models: object[];
        existingSchema?: string;
    }) {
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

    /**
     * 기존 코드 수정 (빠른 모델 사용)
     */
    async modifyCode(params: {
        instruction: string;
        currentCode: string;
        filePath: string;
    }) {
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

    /**
     * 모델 정보 조회
     */
    getModelInfo(tier: ModelTier): ModelConfig {
        return MODELS[tier];
    }

    /**
     * 작업별 크레딧 소모량 조회
     */
    getCreditCost(taskType: TaskType): number {
        return CREDIT_COST[taskType];
    }
}
