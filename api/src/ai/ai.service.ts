import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { CreditService } from '../credit/credit.service';
import { PrismaService } from '../prisma.service';

// ── 모델 티어 ────────────────────────────────────────
type ModelTier = 'fast' | 'standard' | 'premium';

const MODELS: Record<ModelTier, { model: string; maxTokens: number }> = {
  fast:     { model: 'claude-haiku-4-5-20251001', maxTokens: 8192 },
  standard: { model: 'claude-sonnet-4-6-20260320', maxTokens: 16384 },
  premium:  { model: 'claude-opus-4-6-20260320', maxTokens: 16384 },
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

업종별 전문성:
- 미용실/살롱: 예약, 매출, 고객관리, 디자이너 정산
- 쇼핑몰/커머스: 상품, 장바구니, 결제, 배송
- 예약시스템: 캘린더, 고객CRM, 알림
- 학원/교육: 수강, 출결, 학비, 성적
- 음식점/카페: 주문, POS, 재고, 배달`;

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
        system: BUILDER_SYSTEM_PROMPT + (params.template ? `\n\n현재 선택된 템플릿: ${params.template}` : ''),
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
          content: `아래 대화 내역을 기반으로 앱 아키텍처를 설계해주세요.\n\n템플릿: ${params.template}\n\n대화 내역:\n${conversationSummary}`,
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
}
