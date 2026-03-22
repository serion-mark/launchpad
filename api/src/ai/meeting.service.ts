import { Injectable, Logger } from '@nestjs/common';
import { LLMRouter, MEETING_MODELS } from '../llm-router';

// ── 타입 정의 ──────────────────────────────────────────

export type MeetingTier = 'standard' | 'premium';

export type MeetingPreset =
  | 'business_plan'    // 사업계획서 평가
  | 'market_analysis'  // 시장 분석
  | 'idea_validation'  // 아이디어 검증
  | 'ir_feedback'      // IR 피드백
  | 'competitor'       // 경쟁사 분석
  | 'free';            // 자유 주제

export type MeetingEvent =
  | { phase: 'pre_question'; content: string }
  | { phase: 'briefing'; content: string }
  | { phase: 'analysis'; ai: 'GPT' | 'Gemini' | 'Claude'; role: string; content: string }
  | { phase: 'debate'; dispute: string; responses: { ai: string; content: string }[] }
  | { phase: 'report'; content: string }
  | { phase: 'error'; message: string };

// ── 프리셋별 시스템 프롬프트 ────────────────────────────

const PRESET_PROMPTS: Record<MeetingPreset, string> = {
  business_plan: '사업계획서를 평가합니다. 시장성, 실행가능성, 수익모델, 팀 역량, 리스크를 중심으로 분석하세요.',
  market_analysis: '시장을 분석합니다. 시장 규모(TAM/SAM/SOM), 성장률, 주요 트렌드, 진입장벽, 기회를 중심으로 분석하세요.',
  idea_validation: '사업 아이디어를 검증합니다. 문제 정의, 솔루션 적합성, 차별점, 실현가능성, PMF 가능성을 평가하세요.',
  ir_feedback: 'IR 자료를 투자자 관점에서 평가합니다. 스토리텔링, 시장기회, 트랙션, 팀, 재무계획을 분석하세요.',
  competitor: '경쟁사를 분석합니다. 각 경쟁사의 강점/약점, 포지셔닝, 가격전략, 차별화 전략을 비교 분석하세요.',
  free: '주어진 주제를 다각도로 분석합니다. 핵심 쟁점을 파악하고 실행 가능한 인사이트를 도출하세요.',
};

// ── AI 역할 정의 ────────────────────────────────────────

const AI_ROLES = {
  gpt: { name: 'GPT', role: '시장 분석가', color: '🟢', instruction: '시장성, 경쟁력, 수익 모델, 데이터 근거 중심으로 분석하세요. 구체적인 수치와 사례를 제시하세요.' },
  gemini: { name: 'Gemini', role: '데이터 분석가', color: '🔴', instruction: '앞선 분석에 공감하는 부분과 반박할 부분을 명확히 구분하고, 놓친 관점을 추가 제안하세요. 데이터와 트렌드로 뒷받침하세요.' },
  claude: { name: 'Claude', role: '전략 종합가', color: '🔵', instruction: '두 AI의 분석을 종합 평가하세요. 동의/반박 구분, 빠진 관점 추가, 최종 실행 제안을 포함하세요.' },
};

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);
  private llmRouter: LLMRouter;

  constructor() {
    this.llmRouter = new LLMRouter();
  }

  /**
   * 사전 질문 생성 — 회의 시작 전 AI가 확인 질문
   */
  async generatePreQuestions(params: {
    topic: string;
    preset?: MeetingPreset;
  }): Promise<string> {
    const { topic, preset = 'free' } = params;
    const presetPrompt = PRESET_PROMPTS[preset];

    const result = await this.llmRouter.callAnthropic(
      `당신은 전문 퍼실리테이터입니다. 사용자가 요청한 분석 주제를 보고, 더 나은 회의를 위해 2~3개의 확인 질문을 한국어로 만드세요.
질문은 분석의 방향성, 중점 평가 항목, 특별히 신경 쓸 부분을 확인하는 것이어야 합니다.
형식: 번호 매긴 질문 리스트. 마지막에 "답변 없이 바로 시작해도 괜찮아요! 🚀" 한 줄 추가.`,
      `주제: ${topic}\n분석 유형: ${presetPrompt}`,
      'claude-haiku-4-5-20251001',
      1024,
    );

    return result;
  }

  /**
   * AI 회의 실행 — AsyncGenerator로 SSE 이벤트 순차 생성
   */
  async *runMeeting(params: {
    topic: string;
    file?: string;
    tier: MeetingTier;
    preset?: MeetingPreset;
    preAnswers?: string;
  }): AsyncGenerator<MeetingEvent> {
    const { topic, file, tier, preset = 'free', preAnswers } = params;
    const models = MEETING_MODELS[tier];
    const presetPrompt = PRESET_PROMPTS[preset];

    try {
      // ── Phase 1: 브리핑 생성 (Haiku — 저렴) ──────────
      this.logger.log(`[회의 시작] 주제: ${topic}, 티어: ${tier}, 프리셋: ${preset}`);

      // 첨부 파일이 너무 길면 앞부분만 사용 (토큰 제한 방지)
      const maxFileLen = 8000;
      const trimmedFile = file && file.length > maxFileLen
        ? file.slice(0, maxFileLen) + `\n\n... (총 ${file.length.toLocaleString()}자 중 앞 ${maxFileLen.toLocaleString()}자만 분석)`
        : file;

      const preAnswerContext = preAnswers ? `\n[사용자 사전 요청]\n${preAnswers}` : '';
      const briefing = await this.llmRouter.callAnthropic(
        '당신은 브리핑 전문가입니다. 주어진 주제/파일의 핵심을 요약하고 분석 포인트를 추출하세요. 사용자의 사전 요청이 있으면 그 관점을 우선 반영하세요. 한국어로 작성하세요.',
        `주제: ${topic}\n${presetPrompt}${preAnswerContext}\n${trimmedFile ? `\n[첨부 파일 내용]\n${trimmedFile}` : ''}`,
        'claude-haiku-4-5-20251001',
        2048,
      );
      yield { phase: 'briefing', content: briefing };

      // ── Phase 2: 순차 누적 분석 ──────────────────────

      // 2-1: GPT (브리핑만 읽고 분석)
      const gptAnalysis = await this.llmRouter.callOpenAI(
        `당신은 ${AI_ROLES.gpt.role}입니다. ${AI_ROLES.gpt.instruction} 한국어로 분석하세요.`,
        `[분석 브리핑]\n${briefing}\n\n${presetPrompt}`,
        models.gpt,
        4096,
      );
      yield { phase: 'analysis', ai: 'GPT', role: AI_ROLES.gpt.role, content: gptAnalysis };

      // 2-2: Gemini (브리핑 + GPT 분석 둘 다 읽고)
      const geminiAnalysis = await this.llmRouter.callGoogle(
        `당신은 ${AI_ROLES.gemini.role}입니다. ${AI_ROLES.gemini.instruction} 한국어로 분석하세요.`,
        `[분석 브리핑]\n${briefing}\n\n[GPT ${AI_ROLES.gpt.role}의 분석]\n${gptAnalysis}\n\n${presetPrompt}`,
        models.gemini,
        4096,
      );
      yield { phase: 'analysis', ai: 'Gemini', role: AI_ROLES.gemini.role, content: geminiAnalysis };

      // 2-3: Claude (브리핑 + GPT + Gemini 전부 읽고 종합)
      const claudeAnalysis = await this.llmRouter.callAnthropic(
        `당신은 ${AI_ROLES.claude.role}입니다. ${AI_ROLES.claude.instruction} 한국어로 분석하세요.`,
        `[분석 브리핑]\n${briefing}\n\n[GPT ${AI_ROLES.gpt.role}]\n${gptAnalysis}\n\n[Gemini ${AI_ROLES.gemini.role}]\n${geminiAnalysis}\n\n${presetPrompt}`,
        models.claude,
        4096,
      );
      yield { phase: 'analysis', ai: 'Claude', role: AI_ROLES.claude.role, content: claudeAnalysis };

      // ── Phase 3: 쟁점 핑퐁 (프리미엄만) ──────────────
      if (tier === 'premium') {
        // 쟁점 추출 (Haiku — 저렴)
        const disputesRaw = await this.llmRouter.callAnthropic(
          '다음 3개 분석에서 의견이 갈리는 핵심 쟁점을 1~3개 추출하세요. 반드시 JSON 배열로만 반환하세요: ["쟁점1", "쟁점2"]',
          `GPT: ${gptAnalysis}\n\nGemini: ${geminiAnalysis}\n\nClaude: ${claudeAnalysis}`,
          'claude-haiku-4-5-20251001',
          1024,
        );

        let disputes: string[] = [];
        try {
          const jsonMatch = disputesRaw.match(/\[[\s\S]*?\]/);
          disputes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
          disputes = ['핵심 쟁점'];
        }

        for (const dispute of disputes.slice(0, 3)) {
          const gptRebuttal = await this.llmRouter.callOpenAI(
            `당신은 ${AI_ROLES.gpt.role}입니다. 쟁점에 대해 추가 반론 또는 수정된 의견을 간결하게 제시하세요. 한국어로.`,
            `쟁점: "${dispute}"\n\nGemini 의견: ${geminiAnalysis.slice(0, 500)}\nClaude 의견: ${claudeAnalysis.slice(0, 500)}`,
            models.gpt,
            1024,
          );

          const geminiRebuttal = await this.llmRouter.callGoogle(
            `당신은 ${AI_ROLES.gemini.role}입니다. 쟁점에 대해 데이터로 검증하고 최종 의견을 제시하세요. 한국어로.`,
            `쟁점: "${dispute}"\nGPT 추가 반론: ${gptRebuttal}`,
            models.gemini,
            1024,
          );

          yield {
            phase: 'debate',
            dispute,
            responses: [
              { ai: 'GPT', content: gptRebuttal },
              { ai: 'Gemini', content: geminiRebuttal },
            ],
          };
        }
      }

      // ── Phase 4: 종합 보고서 (Haiku — 저렴) ──────────
      const report = await this.llmRouter.callAnthropic(
        '당신은 보고서 작성 전문가입니다. AI 회의 내용을 깔끔한 종합 보고서로 정리하세요. 한국어로 마크다운 형식으로.',
        `주제: ${topic}\n\n` +
        `GPT 분석:\n${gptAnalysis}\n\n` +
        `Gemini 분석:\n${geminiAnalysis}\n\n` +
        `Claude 분석:\n${claudeAnalysis}\n\n` +
        `형식: ## 요약 (3줄) → ## 주요 발견 → ## 리스크 → ## 액션 아이템`,
        'claude-haiku-4-5-20251001',
        3072,
      );
      yield { phase: 'report', content: report };

      this.logger.log(`[회의 완료] 주제: ${topic}`);
    } catch (error: any) {
      this.logger.error(`[회의 오류] ${error.message}`);
      yield { phase: 'error', message: error.message || 'AI 회의 중 오류가 발생했습니다' };
    }
  }
}
