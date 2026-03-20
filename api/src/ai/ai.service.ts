import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { CreditService, type ModelTier as CreditModelTier } from '../credit/credit.service';
import { PrismaService } from '../prisma.service';

// ── 모델 티어 (레거시 호환) ─────────────────────────────
type ModelTier = 'fast' | 'standard' | 'premium';

// ── 새 모델 3단계 (코드 생성 엔진) ─────────────────────
type AppModelTier = 'flash' | 'smart' | 'pro';

const APP_MODELS: Record<AppModelTier, { model: string; maxTokens: number; label: string }> = {
  flash: { model: 'claude-haiku-4-5-20251001', maxTokens: 8192, label: 'Flash (빠르고 저렴)' },
  smart: { model: 'claude-3-5-sonnet-20241022', maxTokens: 8192, label: 'Smart (균형잡힌)' },   // ⚠️ 현재 404 → 폴백
  pro:   { model: 'claude-3-opus-20240229', maxTokens: 4096, label: 'Pro (최고 품질)' },         // ⚠️ 현재 404 → 폴백
};

// 레거시 모델맵 (기존 chat/generate 호환)
const MODELS: Record<ModelTier, { model: string; maxTokens: number }> = {
  fast:     { model: 'claude-haiku-4-5-20251001', maxTokens: 8192 },
  standard: { model: 'claude-haiku-4-5-20251001', maxTokens: 8192 },
  premium:  { model: 'claude-haiku-4-5-20251001', maxTokens: 8192 },
};

// ── 빌더 시스템 프롬프트 ─────────────────────────────
const BUILDER_SYSTEM_PROMPT = `당신은 Foundry AI 빌더 어시스턴트입니다.
사용자가 만들고 싶은 웹 애플리케이션을 대화를 통해 함께 설계합니다.

역할:
1. 사용자의 비즈니스 요구사항을 파악
2. 적절한 기능과 페이지 구성을 제안
3. 기술적 구현 방향을 한국어로 쉽게 설명
4. 추가 질문으로 요구사항을 구체화

규칙:
- 항상 한국어로 답변
- 마크다운 형식 사용 (**굵게**, - 목록, 코드블록)
- 답변은 간결하게 (200자 이내 권장, 필요시 더 길게)
- 기술 용어는 쉽게 풀어서 설명
- 사용자가 "생성해줘"라고 하면 구체적인 기능 목록을 정리하여 확인

⚠️ 중요: 반드시 현재 선택된 템플릿/업종에 맞는 용어와 기능만 이야기하세요.
다른 업종의 용어를 절대 섞지 마세요.`;

// ── 업종별 상세 프롬프트 ─────────────────────────────
const TEMPLATE_PROMPTS: Record<string, string> = {
  'beauty-salon': `이 프로젝트는 **미용실/살롱** 앱입니다.
관련 기능: 예약 관리, 디자이너 스케줄, 시술 메뉴, 매출/정산, 고객 CRM, 포인트 적립, 알림톡
관련 용어: 디자이너, 시술, 커트, 펌, 염색, 클리닉, 워크인, 노쇼, 재방문율, 지명율
절대 사용하지 말 것: 상품, 장바구니, 배송, 수강, 강의, 민원, 매칭`,

  'ecommerce': `이 프로젝트는 **쇼핑몰/커머스** 앱입니다.
관련 기능: 상품 등록, 장바구니, 주문/결제, 배송 관리, 재고 관리, 쿠폰/할인, 리뷰/평점, 회원 등급
관련 용어: 상품, 주문, 장바구니, 배송, 택배, 재고, SKU, 환불, 교환, CS
절대 사용하지 말 것: 예약, 노쇼, 오버부킹, 디자이너, 시술, 수강, 민원, 매칭`,

  'booking-crm': `이 프로젝트는 **범용 예약/CRM** 앱입니다.
관련 기능: 예약 캘린더, 고객 CRM, 매출 관리, 알림톡/SMS, 출석 체크, 통계 대시보드
관련 용어: 예약, 고객, 스태프, 매출, 정산, 알림, 일정
절대 사용하지 말 것: 상품, 장바구니, 배송, 매칭, 민원`,

  'o2o-matching': `이 프로젝트는 **O2O 매칭 플랫폼** 앱입니다.
관련 기능: 양면 마켓 (고객↔제공자), 매칭 알고리즘, 실시간 상태 추적, 지도 연동, 양방향 리뷰, 수수료 정산, 1:1 채팅
관련 용어: 매칭, 제공자, 수요자, 견적, 수수료, 에스크로, 실시간 추적, 평점
절대 사용하지 말 것: 예약, 노쇼, 디자이너, 시술, 상품, 장바구니, 민원, 수강`,

  'edutech': `이 프로젝트는 **에듀테크/LMS** 앱입니다.
관련 기능: 강의 관리, 수강생 대시보드, 진도율 추적, 퀴즈/시험, 수료증 발급, 결제/수강권, Q&A 게시판, 출석
관련 용어: 강의, 수강생, 진도율, 수료증, 퀴즈, 과제, 커리큘럼, VOD, 라이브, 수강권
절대 사용하지 말 것: 예약, 노쇼, 디자이너, 시술, 상품, 장바구니, 배송, 민원, 매칭`,

  'facility-mgmt': `이 프로젝트는 **관리업체/시설관리** 앱입니다.
관련 기능: 민원 접수/처리, 입주민 관리, 공지사항, 시설 보수, 시설 예약 (회의실/주차), 관리비 청구/수납, 전화 기록, 만족도 조사
관련 용어: 민원, 입주민, 세대, 동/호, 관리비, 하자보수, 층간소음, 공지, 시설 예약
절대 사용하지 말 것: 예약(고객), 노쇼, 디자이너, 시술, 상품, 장바구니, 배송, 수강, 매칭`,
};

// ── Prisma 스키마 생성 프롬프트 ─────────────────────
const SCHEMA_SYSTEM_PROMPT = `당신은 Prisma ORM 전문가입니다.
주어진 모델 정의를 기반으로 완전한 Prisma 스키마를 생성합니다.

규칙:
- PostgreSQL 데이터소스 사용
- 모든 모델에 id (cuid), createdAt, updatedAt 필드 포함
- 관계(relation)는 명확하게 정의
- @@map으로 테이블명은 소문자 복수형
- 인덱스와 유니크 제약조건 적절히 추가
- enum은 필요한 경우만 사용
- 코드 블록 없이 순수 Prisma 스키마만 출력`;

// ── 백엔드 모듈 생성 프롬프트 ───────────────────────
const BACKEND_SYSTEM_PROMPT = `당신은 NestJS 백엔드 전문가입니다.
주어진 엔드포인트 정의를 기반으로 NestJS 모듈(Controller + Service)을 생성합니다.

규칙:
- NestJS + Prisma 패턴 사용
- Controller: @Controller, @Get/@Post/@Patch/@Delete, DTO 타입 정의
- Service: @Injectable, PrismaService 주입, 비즈니스 로직
- 에러 처리: NotFoundException, BadRequestException 등 적절히 사용
- 각 파일을 [FILE: 경로] 형식으로 구분하여 출력

출력 형식:
[FILE: controller.ts]
(컨트롤러 코드)

[FILE: service.ts]
(서비스 코드)

[FILE: dto.ts]
(DTO 정의)`;

// ── 프론트엔드 페이지 생성 프롬프트 ─────────────────
const FRONTEND_SYSTEM_PROMPT = `당신은 Next.js 16 프론트엔드 전문가입니다.
주어진 페이지 정의를 기반으로 Next.js App Router 페이지를 생성합니다.

규칙:
- 'use client' 디렉티브 필수 (상태 사용 시)
- TypeScript + Tailwind CSS 사용
- 반응형 디자인 (모바일 우선)
- fetch로 API 호출 (process.env.NEXT_PUBLIC_API_URL 기반)
- 한국어 UI 텍스트
- 컴포넌트는 같은 파일에 정의 (작은 경우) 또는 [FILE:] 태그로 분리
- 모던하고 깔끔한 UI (rounded-xl, shadow-sm, 적절한 패딩)
- 로딩/에러 상태 처리 포함

출력 형식:
[FILE: page.tsx]
(페이지 코드)`;

// ── 코드 수정 프롬프트 ──────────────────────────────
const MODIFY_SYSTEM_PROMPT = `당신은 풀스택 코드 수정 전문가입니다.
사용자의 수정 요청에 따라 기존 코드를 수정합니다.

규칙:
- 수정된 파일만 [FILE: 경로] 형식으로 출력
- 수정하지 않은 파일은 출력하지 마세요
- 기존 코드 스타일과 패턴을 유지
- TypeScript 타입 안전성 유지
- 한국어 주석/UI 텍스트 유지

출력 형식:
[FILE: 수정된파일경로]
(수정된 전체 코드)`;

// ── 앱 생성 시스템 프롬프트 ──────────────────────────
const GENERATE_SYSTEM_PROMPT = `당신은 풀스택 웹 앱 아키텍트입니다.
사용자의 대화 내역을 기반으로, 완전한 앱 아키텍처를 설계합니다.

기술 스택:
- 프론트엔드: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- 백엔드: NestJS + Prisma ORM
- DB: PostgreSQL
- 인증: JWT + bcrypt

반드시 아래 JSON 형식으로만 출력하세요 (다른 텍스트 없이):
{
  "appName": "앱 이름",
  "description": "한줄 설명",
  "pages": [{ "path": "/xxx", "name": "페이지명", "description": "설명", "components": ["컴포넌트1"] }],
  "apiEndpoints": [{ "method": "GET|POST|PATCH|DELETE", "path": "/api/xxx", "description": "설명" }],
  "dbModels": [{ "name": "ModelName", "fields": [{ "name": "fieldName", "type": "String|Int|DateTime|Boolean|Json", "optional": false }] }],
  "features": ["기능1", "기능2"],
  "estimatedPages": 5,
  "estimatedApis": 12
}`;

@Injectable()
export class AiService {
  private anthropic: Anthropic;
  private readonly logger = new Logger('AiService');

  constructor(
    private creditService: CreditService,
    private prisma: PrismaService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ── 빌더 채팅 (실시간 대화) ────────────────────────
  async chat(userId: string, params: {
    projectId: string;
    message: string;
    chatHistory: { role: string; content: string }[];
    template?: string;
  }) {
    // 크레딧 차감 (chat = 10 크레딧 → 빌더 대화는 무료로 처리)
    // 대화는 무료, 실제 생성에서만 과금
    const tier: ModelTier = 'fast';
    const model = MODELS[tier];

    // 대화 히스토리를 Anthropic 형식으로 변환
    const messages: Anthropic.MessageParam[] = params.chatHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // 현재 메시지 추가
    messages.push({ role: 'user', content: params.message });

    try {
      const response = await this.anthropic.messages.create({
        model: model.model,
        max_tokens: model.maxTokens,
        system: BUILDER_SYSTEM_PROMPT + '\n\n' + (TEMPLATE_PROMPTS[params.template || ''] || `현재 선택된 템플릿: ${params.template || 'unknown'}`),
        messages,
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        content,
        model: model.model,
        tier,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error: any) {
      this.logger.error(`AI Chat error: ${error.message}`);
      throw error;
    }
  }

  // ── 앱 아키텍처 생성 (크레딧 차감) ─────────────────
  async generateArchitecture(userId: string, params: {
    projectId: string;
    chatHistory: { role: string; content: string }[];
    template: string;
  }) {
    // 맛보기 체크 (freeTrialUsed가 false면 무료)
    const balance = await this.creditService.getBalance(userId);
    const isFreeTria = !balance.freeTrialUsed;

    if (isFreeTria) {
      await this.creditService.deduct(userId, {
        action: 'free_trial',
        projectId: params.projectId,
        taskType: 'architecture',
        modelTier: 'standard',
        description: `맛보기 설계안: ${params.template}`,
      });
    } else {
      await this.creditService.deduct(userId, {
        action: 'app_generate',
        projectId: params.projectId,
        taskType: 'architecture',
        modelTier: 'standard',
        description: `앱 생성: ${params.template}`,
      });
    }

    const tier: ModelTier = 'standard';
    const model = MODELS[tier];

    // 대화 히스토리에서 요구사항 추출
    const conversationSummary = params.chatHistory
      .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n');

    try {
      const response = await this.anthropic.messages.create({
        model: model.model,
        max_tokens: model.maxTokens,
        system: GENERATE_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `아래 대화 내역을 기반으로 앱 아키텍처를 설계해주세요.\n\n템플릿: ${params.template}\n${TEMPLATE_PROMPTS[params.template] || ''}\n\n대화 내역:\n${conversationSummary}`,
        }],
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      // JSON 파싱 시도
      let architecture: any;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        architecture = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
      } catch {
        architecture = { raw: content };
      }

      // 프로젝트에 생성 결과 저장
      await this.prisma.project.update({
        where: { id: params.projectId },
        data: {
          generatedCode: architecture,
          status: 'active',
        },
      });

      return {
        architecture,
        isFreeTrial: isFreeTria,
        model: model.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error: any) {
      this.logger.error(`AI Generate error: ${error.message}`);
      throw error;
    }
  }

  // ── AI 코드 수정 (크레딧 차감) ─────────────────────
  async modifyCode(userId: string, params: {
    projectId: string;
    instruction: string;
    currentCode?: string;
  }) {
    await this.creditService.deduct(userId, {
      action: 'ai_modify',
      projectId: params.projectId,
      taskType: 'modify',
      modelTier: 'fast',
      description: `AI 수정: ${params.instruction.slice(0, 50)}`,
    });

    const tier: ModelTier = 'fast';
    const model = MODELS[tier];

    const response = await this.anthropic.messages.create({
      model: model.model,
      max_tokens: model.maxTokens,
      system: '코드 수정 전문가입니다. 사용자의 요청에 따라 코드를 수정합니다. 수정된 전체 코드를 출력하세요.',
      messages: [{
        role: 'user',
        content: `수정 요청: ${params.instruction}\n\n현재 코드:\n${params.currentCode || '(없음)'}`,
      }],
    });

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');

    return { content, model: model.model };
  }

  // ══════════════════════════════════════════════════════
  // ── 코드 생성 엔진 (Sprint 1~) ──────────────────────
  // ══════════════════════════════════════════════════════

  /** 모델별 폴백 호출 — Sonnet/Opus 404 시 Haiku로 자동 폴백 + 크레딧 보정 */
  private async callWithFallback(
    tier: AppModelTier,
    system: string,
    messages: Anthropic.MessageParam[],
  ): Promise<{ content: string; actualTier: AppModelTier; inputTokens: number; outputTokens: number; fellBack: boolean }> {
    const model = APP_MODELS[tier];

    try {
      const response = await this.anthropic.messages.create({
        model: model.model,
        max_tokens: model.maxTokens,
        system,
        messages,
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        content,
        actualTier: tier,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        fellBack: false,
      };
    } catch (error: any) {
      // 404 또는 모델 접근 불가 → Haiku(flash)로 폴백
      if (tier !== 'flash' && (error.status === 404 || error.status === 403 || error.message?.includes('model'))) {
        this.logger.warn(`${tier} 모델 사용 불가 (${error.status}), flash로 폴백합니다`);

        const fallbackModel = APP_MODELS.flash;
        const response = await this.anthropic.messages.create({
          model: fallbackModel.model,
          max_tokens: fallbackModel.maxTokens,
          system,
          messages,
        });

        const content = response.content
          .filter(block => block.type === 'text')
          .map(block => (block as Anthropic.TextBlock).text)
          .join('\n');

        return {
          content,
          actualTier: 'flash',
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          fellBack: true,
        };
      }
      throw error;
    }
  }

  /** 사용 가능한 모델 목록 조회 (프론트 ModelSelector용) */
  getAvailableModels() {
    return Object.entries(APP_MODELS).map(([tier, config]) => ({
      tier,
      label: config.label,
      model: config.model,
      // ⚠️ Sonnet/Opus는 현재 사용 불가 → 표시만 하되 폴백 안내
      available: tier === 'flash', // TODO: API 키 확보 후 true로 변경
      fallbackNote: tier !== 'flash' ? '현재 Flash로 자동 전환됩니다 (비용은 Flash 기준)' : undefined,
    }));
  }

  /** 예상 크레딧 비용 계산 (차감 없이) */
  estimateGenerationCost(tier: AppModelTier, estimatedFileCount: number) {
    return this.creditService.estimateCost(tier as CreditModelTier, estimatedFileCount);
  }

  // ══════════════════════════════════════════════════════
  // ── Sprint 2: 코드 생성 파이프라인 ────────────────────
  // ══════════════════════════════════════════════════════

  /**
   * 전체 앱 생성 (5단계 파이프라인)
   * 1. 아키텍처 설계 → JSON
   * 2. Prisma 스키마 생성
   * 3. 백엔드 모듈 생성 (NestJS)
   * 4. 프론트엔드 페이지 생성 (Next.js)
   * 5. 설정 파일 생성 (package.json, .env 등)
   */
  async generateFullApp(userId: string, params: {
    projectId: string;
    template: string;
    answers: Record<string, string | string[]>;
    selectedFeatures: string[];
    modelTier: AppModelTier;
    theme?: string;
    chatHistory?: { role: string; content: string }[];
  }): Promise<{
    success: boolean;
    files: { path: string; content: string }[];
    architecture: any;
    fileCount: number;
    totalCredits: number;
    actualTier: AppModelTier;
    fellBack: boolean;
    assessment: { confidence: number; incompleteFeatures: string[]; suggestions: string[] };
    steps: { step: string; status: string; fileCount: number }[];
  }> {
    const steps: { step: string; status: string; fileCount: number }[] = [];
    const allFiles: { path: string; content: string }[] = [];
    let totalCredits = 0;
    let fellBack = false;
    const tier = params.modelTier;

    // 프로젝트 상태 → generating
    await this.prisma.project.update({
      where: { id: params.projectId },
      data: { status: 'generating', modelUsed: tier },
    });

    try {
      // ── Step 1: 아키텍처 설계 ──────────────────────
      this.logger.log(`[${params.projectId}] Step 1: 아키텍처 설계 (${tier})`);
      steps.push({ step: 'architecture', status: 'in_progress', fileCount: 0 });

      const answersText = Object.entries(params.answers)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');

      const chatSummary = params.chatHistory
        ?.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
        .join('\n') || '';

      const archResult = await this.callWithFallback(tier, GENERATE_SYSTEM_PROMPT, [{
        role: 'user',
        content: `앱 아키텍처를 설계해주세요.

템플릿: ${params.template}
${TEMPLATE_PROMPTS[params.template] || ''}

사용자 답변:
${answersText}

선택한 기능: ${params.selectedFeatures.join(', ')}
테마: ${params.theme || 'basic-light'}

${chatSummary ? `대화 내역:\n${chatSummary}` : ''}`,
      }]);

      if (archResult.fellBack) fellBack = true;

      let architecture: any;
      try {
        const jsonMatch = archResult.content.match(/\{[\s\S]*\}/);
        architecture = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: archResult.content };
      } catch {
        architecture = { raw: archResult.content };
      }

      const archFile = { path: '_architecture.json', content: JSON.stringify(architecture, null, 2) };
      allFiles.push(archFile);
      steps[0] = { step: 'architecture', status: 'completed', fileCount: 1 };

      // ── Step 2: Prisma 스키마 생성 ─────────────────
      this.logger.log(`[${params.projectId}] Step 2: DB 스키마 생성`);
      steps.push({ step: 'schema', status: 'in_progress', fileCount: 0 });

      const dbModels = architecture.dbModels || [];
      const schemaResult = await this.callWithFallback(tier, SCHEMA_SYSTEM_PROMPT, [{
        role: 'user',
        content: `아래 모델 정의를 기반으로 Prisma 스키마를 생성해주세요.

DB 모델:
${JSON.stringify(dbModels, null, 2)}

앱 이름: ${architecture.appName || params.answers['biz_name'] || 'MyApp'}
기능: ${params.selectedFeatures.join(', ')}`,
      }]);

      if (schemaResult.fellBack) fellBack = true;

      const schemaContent = this.extractCodeBlock(schemaResult.content, 'prisma') || schemaResult.content;
      allFiles.push({ path: 'prisma/schema.prisma', content: schemaContent });
      steps[1] = { step: 'schema', status: 'completed', fileCount: 1 };

      // ── Step 3: 백엔드 모듈 생성 ──────────────────
      this.logger.log(`[${params.projectId}] Step 3: 백엔드 API 생성`);
      steps.push({ step: 'backend', status: 'in_progress', fileCount: 0 });

      const apiEndpoints = architecture.apiEndpoints || [];
      const modules = this.groupEndpointsByModule(apiEndpoints);
      let backendFileCount = 0;

      for (const [moduleName, endpoints] of Object.entries(modules)) {
        const backendResult = await this.callWithFallback(tier, BACKEND_SYSTEM_PROMPT, [{
          role: 'user',
          content: `NestJS 모듈을 생성해주세요.

모듈명: ${moduleName}
엔드포인트:
${JSON.stringify(endpoints, null, 2)}

Prisma 스키마:
${schemaContent}

앱 아키텍처:
${JSON.stringify({ appName: architecture.appName, features: architecture.features }, null, 2)}`,
        }]);

        if (backendResult.fellBack) fellBack = true;

        const backendFiles = this.parseFileOutput(backendResult.content, `src/${moduleName}`);
        allFiles.push(...backendFiles);
        backendFileCount += backendFiles.length;
      }

      // 공통 모듈 (app.module, prisma.service, auth)
      allFiles.push(...this.generateCommonBackendFiles(architecture, Object.keys(modules)));
      backendFileCount += 3; // app.module + prisma.service + main.ts
      steps[2] = { step: 'backend', status: 'completed', fileCount: backendFileCount };

      // ── Step 4: 프론트엔드 페이지 생성 ────────────
      this.logger.log(`[${params.projectId}] Step 4: 프론트엔드 페이지 생성`);
      steps.push({ step: 'frontend', status: 'in_progress', fileCount: 0 });

      const pages = architecture.pages || [];
      let frontendFileCount = 0;

      for (const page of pages) {
        const frontendResult = await this.callWithFallback(tier, FRONTEND_SYSTEM_PROMPT, [{
          role: 'user',
          content: `Next.js 페이지를 생성해주세요.

페이지: ${page.name} (${page.path})
설명: ${page.description}
컴포넌트: ${(page.components || []).join(', ')}

앱 이름: ${architecture.appName || ''}
테마: ${params.theme || 'basic-light'}
API 엔드포인트: ${JSON.stringify(apiEndpoints.filter((e: any) =>
  e.path?.includes(page.path?.replace('/', '')) || e.description?.includes(page.name)
), null, 2)}`,
        }]);

        if (frontendResult.fellBack) fellBack = true;

        const frontendFiles = this.parseFileOutput(frontendResult.content, `src/app${page.path}`);
        if (frontendFiles.length === 0) {
          // AI가 [FILE:] 태그 없이 코드만 준 경우
          allFiles.push({ path: `src/app${page.path}/page.tsx`, content: frontendResult.content });
          frontendFileCount++;
        } else {
          allFiles.push(...frontendFiles);
          frontendFileCount += frontendFiles.length;
        }
      }

      // 레이아웃 + 글로벌 CSS
      allFiles.push(...this.generateCommonFrontendFiles(architecture, params.theme || 'basic-light'));
      frontendFileCount += 2;
      steps[3] = { step: 'frontend', status: 'completed', fileCount: frontendFileCount };

      // ── Step 5: 설정 파일 생성 ────────────────────
      this.logger.log(`[${params.projectId}] Step 5: 설정 파일 생성`);
      steps.push({ step: 'config', status: 'in_progress', fileCount: 0 });

      const configFiles = this.generateConfigFiles(architecture, params.template);
      allFiles.push(...configFiles);
      steps[4] = { step: 'config', status: 'completed', fileCount: configFiles.length };

      // ── 크레딧 차감 (모델 + 파일 수 기반) ─────────
      const fileCount = allFiles.length;
      const actualTier: CreditModelTier = fellBack ? 'flash' : (tier as CreditModelTier);

      // 맛보기 체크
      const balance = await this.creditService.getBalance(userId);
      if (!balance.freeTrialUsed) {
        await this.creditService.deduct(userId, {
          action: 'free_trial',
          projectId: params.projectId,
          taskType: 'generate_full_app',
          modelTier: actualTier,
          description: `맛보기 앱 생성: ${architecture.appName || params.template}`,
        });
      } else {
        const creditResult = await this.creditService.deductByModel(userId, {
          tier: actualTier,
          fileCount,
          projectId: params.projectId,
          taskType: 'generate_full_app',
          description: `앱 생성: ${architecture.appName || params.template} (${fileCount}파일, ${actualTier})`,
        });
        totalCredits = creditResult.cost;
      }

      // ── AI 자기 평가 추출 ─────────────────────────
      const assessment = this.extractAssessment(allFiles);

      // ── DB 저장 ───────────────────────────────────
      await this.prisma.project.update({
        where: { id: params.projectId },
        data: {
          generatedCode: allFiles as any,
          status: 'active',
          modelUsed: actualTier,
          currentVersion: 1,
          versions: [{
            version: 1,
            createdAt: new Date().toISOString(),
            description: '최초 생성',
            fileCount,
          }] as any,
          projectContext: {
            completedFeatures: architecture.features || params.selectedFeatures,
            pendingFeatures: assessment.incompleteFeatures,
            lastAction: '앱 생성 완료',
            userPreferences: { model: actualTier, theme: params.theme || 'basic-light' },
            architecture: { appName: architecture.appName, pages: (architecture.pages || []).length, apis: (architecture.apiEndpoints || []).length },
          } as any,
        },
      });

      this.logger.log(`[${params.projectId}] ✅ 생성 완료! ${fileCount}파일, ${totalCredits}cr`);

      return {
        success: true,
        files: allFiles,
        architecture,
        fileCount,
        totalCredits,
        actualTier: actualTier as AppModelTier,
        fellBack,
        assessment,
        steps,
      };
    } catch (error: any) {
      this.logger.error(`[${params.projectId}] 생성 실패: ${error.message}`);

      // 실패 시 상태 복원
      await this.prisma.project.update({
        where: { id: params.projectId },
        data: { status: 'draft' },
      });

      throw error;
    }
  }

  // ── 파일 수정 (채팅 기반) ─────────────────────────────
  async modifyFiles(userId: string, params: {
    projectId: string;
    message: string;
    modelTier: AppModelTier;
    targetFiles?: string[];
  }): Promise<{
    modifiedFiles: { path: string; content: string }[];
    totalCredits: number;
    actualTier: AppModelTier;
    fellBack: boolean;
  }> {
    // 기존 프로젝트 로드
    const project = await this.prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new Error('권한이 없습니다');

    const existingFiles = (project.generatedCode as { path: string; content: string }[]) || [];
    const tier = params.modelTier;

    // 수정 대상 파일 추출
    const targetFileContents = params.targetFiles
      ? existingFiles.filter(f => params.targetFiles!.some(t => f.path.includes(t)))
      : existingFiles.slice(0, 10); // 최대 10개

    const result = await this.callWithFallback(tier, MODIFY_SYSTEM_PROMPT, [{
      role: 'user',
      content: `수정 요청: ${params.message}

현재 파일:
${targetFileContents.map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n\n')}

프로젝트 컨텍스트:
${JSON.stringify(project.projectContext || {}, null, 2)}`,
    }]);

    const modifiedFiles = this.parseFileOutput(result.content, '');
    const actualTier: CreditModelTier = result.fellBack ? 'flash' : (tier as CreditModelTier);

    // 크레딧 차감
    const creditResult = await this.creditService.deductByModel(userId, {
      tier: actualTier,
      fileCount: modifiedFiles.length || 1,
      projectId: params.projectId,
      taskType: 'modify',
      description: `AI 수정: ${params.message.slice(0, 50)} (${modifiedFiles.length}파일)`,
    });

    // 기존 파일에 수정 적용
    const updatedFiles = [...existingFiles];
    for (const mod of modifiedFiles) {
      const idx = updatedFiles.findIndex(f => f.path === mod.path);
      if (idx >= 0) {
        updatedFiles[idx] = mod;
      } else {
        updatedFiles.push(mod);
      }
    }

    // 버전 + 수정 횟수 업데이트 (수정 전 스냅샷 저장 → 롤백 가능)
    const versions = (project.versions as any[]) || [];
    const newVersion = (project.currentVersion || 1) + 1;
    versions.push({
      version: newVersion,
      createdAt: new Date().toISOString(),
      description: params.message.slice(0, 100),
      fileCount: modifiedFiles.length,
      modifiedPaths: modifiedFiles.map(f => f.path),
      snapshot: existingFiles, // 수정 전 상태 저장 (롤백용)
    });

    await this.prisma.project.update({
      where: { id: params.projectId },
      data: {
        generatedCode: updatedFiles as any,
        currentVersion: newVersion,
        versions: versions as any,
        totalModifications: { increment: 1 },
        modelUsed: actualTier,
        projectContext: {
          ...(project.projectContext as any || {}),
          lastAction: `수정: ${params.message.slice(0, 50)}`,
        } as any,
      },
    });

    return {
      modifiedFiles,
      totalCredits: creditResult.cost,
      actualTier: actualTier as AppModelTier,
      fellBack: result.fellBack,
    };
  }

  // ══════════════════════════════════════════════════════
  // ── 유틸리티 메서드 ───────────────────────────────────
  // ══════════════════════════════════════════════════════

  /** [FILE: path] 태그로 구분된 AI 출력을 파싱 */
  private parseFileOutput(output: string, defaultDir: string): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
    const regex = /\[FILE:\s*(.+?)\]\s*\n([\s\S]*?)(?=\[FILE:|$)/g;
    let match;

    while ((match = regex.exec(output)) !== null) {
      let filePath = match[1].trim();
      // 상대 경로 보정
      if (defaultDir && !filePath.startsWith('src/') && !filePath.startsWith('prisma/') && !filePath.includes('/')) {
        filePath = `${defaultDir}/${filePath}`;
      }
      files.push({ path: filePath, content: match[2].trim() });
    }

    // [FILE:] 태그가 없으면 코드 블록 추출 시도
    if (files.length === 0 && output.trim()) {
      const codeBlock = this.extractCodeBlock(output, 'typescript') || this.extractCodeBlock(output, 'tsx') || output.trim();
      if (defaultDir) {
        files.push({ path: `${defaultDir}/index.ts`, content: codeBlock });
      }
    }

    return files;
  }

  /** 코드 블록 추출 (```lang ... ```) */
  private extractCodeBlock(text: string, lang: string): string | null {
    const regex = new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)```', 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  /** API 엔드포인트를 모듈 단위로 그룹핑 */
  private groupEndpointsByModule(endpoints: any[]): Record<string, any[]> {
    const modules: Record<string, any[]> = {};
    for (const ep of endpoints) {
      if (!ep.path) continue;
      const parts = ep.path.split('/').filter(Boolean);
      // /api/reservations/xxx → reservations
      const moduleName = parts[1] || parts[0] || 'main';
      if (!modules[moduleName]) modules[moduleName] = [];
      modules[moduleName].push(ep);
    }
    return modules;
  }

  /** AI 자기 평가 추출 */
  private extractAssessment(files: { path: string; content: string }[]): {
    confidence: number;
    incompleteFeatures: string[];
    suggestions: string[];
  } {
    let todoCount = 0;
    let placeholderCount = 0;
    const incompleteFeatures: string[] = [];

    for (const file of files) {
      const content = file.content;
      const todos = (content.match(/TODO|FIXME|HACK/g) || []).length;
      const placeholders = (content.match(/placeholder|lorem|dummy|sample/gi) || []).length;
      todoCount += todos;
      placeholderCount += placeholders;

      if (todos > 0 || placeholders > 0) {
        incompleteFeatures.push(file.path);
      }
    }

    const totalFiles = files.filter(f => !f.path.startsWith('_')).length;
    const cleanFiles = totalFiles - incompleteFeatures.length;
    const confidence = totalFiles > 0 ? Math.round((cleanFiles / totalFiles) * 100) : 50;

    const suggestions: string[] = [];
    if (confidence < 70) suggestions.push('더 정확한 결과를 위해 Smart 모델을 추천합니다');
    if (todoCount > 5) suggestions.push(`TODO가 ${todoCount}개 남아있습니다. 추가 수정이 필요합니다`);
    if (placeholderCount > 3) suggestions.push('플레이스홀더 데이터를 실제 데이터로 교체하세요');

    return { confidence: Math.min(confidence, 100), incompleteFeatures, suggestions };
  }

  /** 공통 백엔드 파일 생성 */
  private generateCommonBackendFiles(architecture: any, moduleNames: string[]): { path: string; content: string }[] {
    const appName = (architecture.appName || 'my-app').toLowerCase().replace(/[^a-z0-9]/g, '-');

    return [
      {
        path: 'src/main.ts',
        content: `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(process.env.PORT || 4000);
  console.log(\`🚀 \${process.env.npm_package_name || '${appName}'} API running on port \${process.env.PORT || 4000}\`);
}
bootstrap();`,
      },
      {
        path: 'src/app.module.ts',
        content: `import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
${moduleNames.map(m => `// import { ${this.capitalize(m)}Module } from './${m}/${m}.module';`).join('\n')}

@Module({
  imports: [
    ${moduleNames.map(m => `// ${this.capitalize(m)}Module,`).join('\n    ')}
  ],
  providers: [PrismaService],
})
export class AppModule {}`,
      },
      {
        path: 'src/prisma.service.ts',
        content: `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}`,
      },
    ];
  }

  /** 공통 프론트엔드 파일 생성 */
  private generateCommonFrontendFiles(architecture: any, theme: string): { path: string; content: string }[] {
    const appName = architecture.appName || 'My App';

    return [
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${appName}',
  description: '${architecture.description || 'Foundry AI로 생성된 앱'}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}`,
      },
      {
        path: 'src/app/globals.css',
        content: `@import "tailwindcss";

:root {
  --color-primary: #3182f6;
  --color-background: #ffffff;
  --color-foreground: #171717;
}`,
      },
    ];
  }

  /** 설정 파일 생성 */
  private generateConfigFiles(architecture: any, template: string): { path: string; content: string }[] {
    const appName = (architecture.appName || template || 'my-app').toLowerCase().replace(/[^a-z0-9가-힣]/g, '-');

    return [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: appName,
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            'db:push': 'prisma db push',
            'db:studio': 'prisma studio',
          },
          dependencies: {
            next: '^16.0.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            typescript: '^5.0.0',
            tailwindcss: '^4.0.0',
            '@prisma/client': '^6.0.0',
          },
          devDependencies: {
            prisma: '^6.0.0',
            '@types/node': '^22.0.0',
            '@types/react': '^19.0.0',
          },
        }, null, 2),
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'es2017',
            lib: ['dom', 'es2017'],
            jsx: 'preserve',
            module: 'esnext',
            moduleResolution: 'bundler',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            paths: { '@/*': ['./src/*'] },
          },
          include: ['**/*.ts', '**/*.tsx'],
          exclude: ['node_modules'],
        }, null, 2),
      },
      {
        path: '.env.example',
        content: `DATABASE_URL="postgresql://user:password@localhost:5432/${appName}"
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
JWT_SECRET="your-jwt-secret-here"
PORT=4000`,
      },
      {
        path: 'README.md',
        content: `# ${architecture.appName || appName}

${architecture.description || 'Foundry AI MVP 빌더로 생성된 프로젝트입니다.'}

## 기술 스택
- **프론트엔드**: Next.js 16 + TypeScript + Tailwind CSS
- **백엔드**: NestJS + Prisma ORM
- **DB**: PostgreSQL

## 실행 방법
\`\`\`bash
npm install
cp .env.example .env    # 환경변수 설정
npx prisma db push      # DB 스키마 적용
npm run dev             # 개발 서버 실행
\`\`\`

## 생성 정보
- 템플릿: ${template}
- 페이지 수: ${(architecture.pages || []).length}
- API 수: ${(architecture.apiEndpoints || []).length}
- DB 모델 수: ${(architecture.dbModels || []).length}
`,
      },
    ];
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
