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
}
