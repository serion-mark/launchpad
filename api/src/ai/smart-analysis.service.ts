import { Injectable, Logger } from '@nestjs/common';
import { LLMRouter, MEETING_MODELS } from '../llm-router';

export type AnalysisTier = 'standard' | 'premium';

export type SmartAnalysisEvent =
  | { phase: 'market'; ai: string; content: string }
  | { phase: 'benchmark'; ai: string; content: string }
  | { phase: 'optimization'; ai: string; content: string }
  | { phase: 'complete'; summary: string }
  | { phase: 'error'; message: string };

@Injectable()
export class SmartAnalysisService {
  private readonly logger = new Logger(SmartAnalysisService.name);
  private llmRouter: LLMRouter;

  constructor() {
    this.llmRouter = new LLMRouter();
  }

  async *runAnalysis(params: {
    template: string;
    answers: Record<string, string | string[]>;
    features: string[];
    tier: AnalysisTier;
  }): AsyncGenerator<SmartAnalysisEvent> {
    const { template, answers, features, tier } = params;
    const models = MEETING_MODELS[tier];
    const context = `템플릿: ${template}\n답변: ${JSON.stringify(answers)}\n기능: ${features.join(', ')}`;

    try {
      this.logger.log(`[스마트 분석] 시작: ${template} (${tier})`);

      // Step 1: 시장 조사 (Gemini → GPT fallback)
      let marketResearch: string;
      let marketAi = 'Gemini';
      try {
        marketResearch = await this.llmRouter.callGoogle(
          '당신은 시장 조사 전문가입니다. 한국어로 분석하세요.',
          `다음 앱 기획을 기반으로 시장 조사를 수행하세요:\n${context}\n\n분석 항목:\n1. 유사 서비스 5개 (이름, 특징, 가격)\n2. 시장 규모 추정 (TAM/SAM)\n3. 핵심 트렌드 3가지\n4. 진입 기회`,
          models.gemini,
          3072,
        );
      } catch (geminiErr: any) {
        this.logger.warn(`[스마트 분석] Gemini 실패, GPT로 대체: ${geminiErr.message}`);
        marketAi = 'GPT';
        marketResearch = await this.llmRouter.callOpenAI(
          '당신은 시장 조사 전문가입니다. 한국어로 분석하세요.',
          `다음 앱 기획을 기반으로 시장 조사를 수행하세요:\n${context}\n\n분석 항목:\n1. 유사 서비스 5개 (이름, 특징, 가격)\n2. 시장 규모 추정 (TAM/SAM)\n3. 핵심 트렌드 3가지\n4. 진입 기회`,
          models.gpt,
          3072,
        );
      }
      yield { phase: 'market', ai: marketAi, content: marketResearch };

      // Step 2: GPT → UI/UX 벤치마크
      const benchmark = await this.llmRouter.callOpenAI(
        '당신은 UI/UX 분석가입니다. 한국어로 분석하세요.',
        `다음 앱 기획과 시장 조사 결과를 기반으로 UI/UX 벤치마크를 수행하세요:\n${context}\n\n[시장 조사 결과]\n${marketResearch}\n\n분석 항목:\n1. 유사 앱 UI 패턴 분석 (레이아웃, 네비게이션)\n2. 핵심 UX 플로우 추천\n3. 차별화된 UI 요소 제안\n4. 모바일 최적화 포인트`,
        models.gpt,
        3072,
      );
      yield { phase: 'benchmark', ai: 'GPT', content: benchmark };

      // Step 3: Claude → 아키텍처 설계 최적화
      const optimization = await this.llmRouter.callAnthropic(
        '당신은 풀스택 아키텍트입니다. 한국어로 분석하세요.',
        `다음 앱 기획, 시장 조사, UI/UX 분석을 종합하여 아키텍처를 최적화하세요:\n${context}\n\n[시장 조사]\n${marketResearch}\n\n[UI/UX 벤치마크]\n${benchmark}\n\n분석 항목:\n1. 추천 기능 우선순위 (MVP 핵심 vs 추후 추가)\n2. 기술 스택 최적화 제안\n3. DB 스키마 핵심 설계\n4. API 구조 추천\n5. 경쟁 차별화를 위한 핵심 기능`,
        models.claude,
        3072,
      );
      yield { phase: 'optimization', ai: 'Claude', content: optimization };

      const summary = `시장 조사, UI/UX 벤치마크, 아키텍처 최적화 완료. 이 분석 결과가 앱 생성에 자동 반영됩니다.`;
      yield { phase: 'complete', summary };

      this.logger.log(`[스마트 분석] 완료: ${template}`);
    } catch (error: any) {
      this.logger.error(`[스마트 분석 오류] ${error.message}`);
      yield { phase: 'error', message: '스마트 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
    }
  }
}
