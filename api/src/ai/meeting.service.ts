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
    fileLength?: number;
  }): Promise<string> {
    const { topic, preset = 'free', fileLength = 0 } = params;
    const presetPrompt = PRESET_PROMPTS[preset];

    const fileSizeWarning = fileLength > 8000
      ? `\n\n⚠️ 첨부 자료가 큰 편입니다 (${(fileLength / 1000).toFixed(0)}K자). 앞부분 8,000자를 중심으로 분석되며, 크레딧 소모가 다소 높을 수 있습니다.`
      : '';

    const result = await this.llmRouter.callAnthropic(
      `당신은 전문 퍼실리테이터입니다. 사용자가 요청한 분석 주제를 보고, 더 나은 회의를 위해 2~3개의 확인 질문을 한국어로 만드세요.
질문은 분석의 방향성, 중점 평가 항목, 특별히 신경 쓸 부분을 확인하는 것이어야 합니다.
형식: 번호 매긴 질문 리스트. 마지막에 "답변 없이 바로 시작해도 괜찮아요! 🚀" 한 줄 추가.`,
      `주제: ${topic}\n분석 유형: ${presetPrompt}`,
      'claude-haiku-4-5-20251001',
      1024,
    );

    return result + fileSizeWarning;
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

      const preAnswerContext = preAnswers ? `\n[사용자 요청 방향]\n${preAnswers}` : '';

      // ── Phase 1: 브리핑 (분석 X, 요약+요청 정리만) ──────────
      const briefing = await this.llmRouter.callAnthropic(
        `당신은 회의 준비 담당입니다. 분석하지 마세요. 아래 2가지만 정리하세요:
1. 📄 자료 요약: 첨부 파일이 있으면 핵심 내용을 5줄 이내로 요약. 없으면 주제만 정리.
2. 🎯 분석 요청: 사용자가 원하는 분석 방향과 프리셋을 1~2줄로 정리.
절대 평가/의견/점수를 내지 마세요. 사실만 정리하세요. 한국어로.`,
        `주제: ${topic}\n분석 유형: ${presetPrompt}${preAnswerContext}\n${trimmedFile ? `\n[첨부 파일 내용]\n${trimmedFile}` : ''}`,
        'claude-haiku-4-5-20251001',
        1024,
      );
      yield { phase: 'briefing', content: briefing };

      // ── Phase 2: 각 AI가 원본 자료를 직접 보고 독립 분석 ──────

      // 원본 자료 컨텍스트 (각 AI에게 직접 전달)
      const rawContext = `[주제]\n${topic}\n\n[분석 유형]\n${presetPrompt}${preAnswerContext}${trimmedFile ? `\n\n[원본 자료]\n${trimmedFile}` : ''}`;

      // 2-1: Gemini (원본 자료 직접 분석, 실패 시 건너뛰기)
      let geminiAnalysis = '';
      try {
        geminiAnalysis = await this.llmRouter.callGoogle(
          `당신은 ${AI_ROLES.gemini.role}입니다. ${AI_ROLES.gemini.instruction} 한국어로 분석하세요.`,
          rawContext,
          models.gemini,
          4096,
        );
        yield { phase: 'analysis', ai: 'Gemini', role: AI_ROLES.gemini.role, content: geminiAnalysis };
      } catch (err: any) {
        this.logger.warn(`[Gemini 패스] ${err.message}`);
      }

      // 2-2: GPT 2차 분석 (원본 + Gemini 누적)
      const gptInput = geminiAnalysis
        ? `${rawContext}\n\n[Gemini ${AI_ROLES.gemini.role}의 1차 분석]\n${geminiAnalysis}`
        : rawContext;
      const gptSystemPrompt = geminiAnalysis
        ? `당신은 ${AI_ROLES.gpt.role}입니다. Gemini(${AI_ROLES.gemini.role})의 1차 분석을 읽었습니다.
반드시 아래 형식으로 답변하세요:

## ✅ Gemini 분석에 공감하는 부분
- (Gemini가 말한 내용 중 동의하는 것과 이유)

## ❌ Gemini 분석에 반박하는 부분
- (Gemini가 놓치거나 틀린 부분, 대안적 근거 제시)

## 💡 새로운 관점 (Gemini가 다루지 않은 것)
- (추가 분석)

## 📊 나의 분석
${AI_ROLES.gpt.instruction} 한국어로.`
        : `당신은 ${AI_ROLES.gpt.role}입니다. ${AI_ROLES.gpt.instruction} 한국어로 분석하세요.`;
      const gptAnalysis = await this.llmRouter.callOpenAI(
        gptSystemPrompt,
        gptInput,
        models.gpt,
        4096,
      );
      yield { phase: 'analysis', ai: 'GPT', role: AI_ROLES.gpt.role, content: gptAnalysis };

      // 2-3: Claude 3차 분석 (순차 누적 — 원본 + Gemini + GPT 전부 읽고)
      const claudeInput = geminiAnalysis
        ? `${rawContext}\n\n[Gemini ${AI_ROLES.gemini.role}의 1차 분석]\n${geminiAnalysis}\n\n[GPT ${AI_ROLES.gpt.role}의 2차 분석]\n${gptAnalysis}`
        : `${rawContext}\n\n[GPT ${AI_ROLES.gpt.role}의 분석]\n${gptAnalysis}`;
      const prevAIs = geminiAnalysis ? 'Gemini와 GPT' : 'GPT';
      const claudeAnalysis = await this.llmRouter.callAnthropic(
        `당신은 ${AI_ROLES.claude.role}입니다. ${prevAIs}의 분석을 모두 읽었습니다.
반드시 아래 형식으로 답변하세요:

## ✅ 이전 AI들과 공감하는 부분
- (누구의 어떤 분석에 동의하는지 명시)

## ❌ 이전 AI들에 반박하는 부분
- (누구의 어떤 주장에 반박하는지 + 대안 근거)

## 💡 놓친 관점 보완
- (이전 AI들이 모두 다루지 않은 새로운 관점)

## 🎯 종합 판단 및 실행 제안
- (전체를 종합한 최종 의견과 구체적 액션 아이템)

한국어로 분석하세요.`,
        claudeInput,
        models.claude,
        4096,
      );
      yield { phase: 'analysis', ai: 'Claude', role: AI_ROLES.claude.role, content: claudeAnalysis };

      // 2-4: Claude 최종 종합 (전체 누적 결과를 한 번 더 정리)
      const allAnalyses = [
        geminiAnalysis ? `[Gemini ${AI_ROLES.gemini.role}]\n${geminiAnalysis}` : '',
        `[GPT ${AI_ROLES.gpt.role}]\n${gptAnalysis}`,
        `[Claude ${AI_ROLES.claude.role}]\n${claudeAnalysis}`,
      ].filter(Boolean).join('\n\n');

      const claudeFinal = await this.llmRouter.callAnthropic(
        `당신은 최종 종합 담당입니다. 3개 AI의 순차 누적 분석 결과를 바탕으로 최종 정리하세요:
## 합의점 — 모든 AI가 동의한 핵심 사항
## 쟁점 — 의견이 갈리는 부분과 각 입장
## 보완 — 추가로 고려해야 할 관점
## 최종 결론 및 액션 아이템
한국어로, 간결하고 실행 가능하게.`,
        `${rawContext}\n\n${allAnalyses}`,
        'claude-haiku-4-5-20251001',
        3072,
      );
      yield { phase: 'analysis', ai: 'Claude', role: '최종 종합', content: claudeFinal };

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

          let geminiRebuttal = '';
          try {
            geminiRebuttal = await this.llmRouter.callGoogle(
              `당신은 ${AI_ROLES.gemini.role}입니다. 쟁점에 대해 데이터로 검증하고 최종 의견을 제시하세요. 한국어로.`,
              `쟁점: "${dispute}"\nGPT 추가 반론: ${gptRebuttal}`,
              models.gemini,
              1024,
            );
          } catch {
            // Gemini 실패 시 GPT 반론만으로 진행
          }

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
      const msg = error.message || '';
      let userMessage = 'AI 회의 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      if (msg.includes('429') || msg.includes('rate_limit')) {
        userMessage = 'AI 요청이 많아요. 1~2분 후 다시 시도해주세요.';
      } else if (msg.includes('401') || msg.includes('API_KEY')) {
        userMessage = 'AI 서비스 인증 오류입니다. 관리자에게 문의해주세요.';
      } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
        userMessage = 'AI 응답 시간이 초과되었습니다. 다시 시도해주세요.';
      }
      yield { phase: 'error', message: userMessage };
    }
  }

  /**
   * 일반 채팅: Claude가 자연스럽게 대화 (분석 모드 아님)
   */
  async simpleChat(params: {
    question: string;
    context: string;
    history?: { role: string; content: string }[];
  }): Promise<string> {
    const { question, context, history = [] } = params;

    const historyText = history.length > 0
      ? history.slice(-6).map(h => `${h.role}: ${h.content}`).join('\n\n')
      : '';

    return this.llmRouter.callAnthropic(
      `당신은 친절한 비즈니스 어시스턴트입니다. 아래 회의 결과를 참고하여 사용자와 자연스럽게 대화하세요.
- 질문에 직접적으로 답변하세요 (확인 질문이나 방향 질문 하지 마세요)
- 간결하고 실용적으로 답변하세요
- 한국어로 작성하세요

[회의 결과 참고]
${context.slice(0, 4000)}`,
      `${historyText ? `[이전 대화]\n${historyText}\n\n` : ''}${question}`,
      'claude-haiku-4-5-20251001',
      2048,
    );
  }

  /**
   * 추가 분석: 의도 확인 질문 생성 — Claude가 이전 대화를 정리하고 분석 방향을 물어봄
   */
  async generateFollowUpDirection(params: {
    question: string;
    context: string;
    history?: { role: string; content: string }[];
  }): Promise<string> {
    const { question, context, history = [] } = params;

    const historyText = history.length > 0
      ? history.map(h => `${h.role}: ${h.content}`).join('\n\n')
      : '';

    return this.llmRouter.callAnthropic(
      `당신은 AI 회의 퍼실리테이터입니다. 사용자가 후속 질문을 했습니다.
이전 회의 결과와 대화를 빠르게 요약한 뒤, 더 좋은 답변을 위해 1~2개의 방향 확인 질문을 하세요.
간결하게 3~5줄로 작성하세요. 한국어로.

형식:
📌 이전 논의: (1줄 요약)
🤔 확인 질문: (1~2개)
💡 답변 없이 바로 분석해도 괜찮아요!

[회의 결과]
${context.slice(0, 4000)}`,
      `${historyText ? `[이전 대화]\n${historyText}\n\n` : ''}[사용자 질문]\n${question}`,
      'claude-haiku-4-5-20251001',
      1024,
    );
  }

  /**
   * 추가 채팅: 3개 AI 미니 핑퐁 답변
   */
  async followUpChat(params: {
    question: string;
    context: string;
    direction?: string;
    history?: { role: string; content: string }[];
  }): Promise<{ gemini: string; gpt: string; claude: string }> {
    const { question, context, direction, history = [] } = params;

    const historyText = history.length > 0
      ? history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n\n')
      : '';

    const systemBase = `아래 회의 결과를 바탕으로 사용자의 후속 질문에 답변하세요.
간결하고 실용적으로 3~5줄 이내로 답변. 한국어로.
${direction ? `\n사용자 방향: ${direction}` : ''}

[회의 결과 요약]
${context.slice(0, 3000)}`;

    const userPrompt = `${historyText ? `[이전 대화]\n${historyText}\n\n` : ''}[사용자 질문]\n${question}`;

    // Gemini 먼저 (실패 시 빈값으로 GPT+Claude만 진행)
    let gemini = '';
    try {
      gemini = await this.llmRouter.callGoogle(
        `당신은 ${AI_ROLES.gemini.role}입니다. ${systemBase}`,
        userPrompt,
        'gemini-2.0-flash',
        1024,
      );
    } catch {
      // Gemini 실패 시 조용히 넘어감
    }

    const gptSystem = gemini
      ? `당신은 ${AI_ROLES.gpt.role}입니다. ${systemBase}\n\n[Gemini 의견]\n${gemini}`
      : `당신은 ${AI_ROLES.gpt.role}입니다. ${systemBase}`;
    const gpt = await this.llmRouter.callOpenAI(
      gptSystem,
      userPrompt,
      'gpt-4o',
      1024,
    );

    const claude = await this.llmRouter.callAnthropic(
      `당신은 ${AI_ROLES.claude.role}입니다. 두 AI의 답변을 종합하고 최종 의견을 제시하세요. ${systemBase}\n\n[Gemini]\n${gemini}\n\n[GPT]\n${gpt}`,
      userPrompt,
      'claude-haiku-4-5-20251001',
      1024,
    );

    return { gemini, gpt, claude };
  }
}
