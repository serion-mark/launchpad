import { Controller, Post, Body } from '@nestjs/common';
import { LLMRouter } from '../llm-router';

// JWT 가드 없음 — 비로그인 사용자도 대화 가능
@Controller('ai')
export class StartChatController {
  private router = new LLMRouter();

  @Post('start-chat')
  async startChat(
    @Body() body: {
      message: string;
      chatHistory?: { role: string; content: string }[];
      history?: { role: string; content: string }[];
    },
  ) {
    const systemPrompt = `당신은 Foundry AI MVP 빌더의 앱 기획 도우미입니다.
사용자가 만들고 싶은 앱에 대해 대화하며 요구사항을 파악합니다.

규칙:
- 한국어로 친근하게 대화하세요
- 한 번에 1~2개 질문만 하세요 (너무 많이 묻지 마세요)
- 핵심 파악 항목: 업종/서비스 유형, 핵심 기능 2~3개, 타겟 사용자
- 3~5턴 대화로 충분한 정보가 모이면, 마지막에 반드시 다음 형식으로 요약하세요:

[APP_READY]
앱 이름: {이름}
업종: {업종}
핵심 기능: {기능1}, {기능2}, {기능3}
타겟: {타겟 사용자}
상세: {한줄 요약}
[/APP_READY]

- [APP_READY] 태그는 충분한 정보가 모였을 때만 포함하세요
- 사용자가 질문만 하면 (예: "뭘 할 수 있어?") 친절하게 설명하고 앱 아이디어를 제안하세요
- 응답은 짧고 핵심적으로 (3~5줄 이내)`;

    const chatHistory = body.chatHistory || body.history || [];
    const messages = chatHistory.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
    const userPrompt = messages ? `${messages}\n사용자: ${body.message}` : `사용자: ${body.message}`;

    const content = await this.router.callAnthropic(
      systemPrompt,
      userPrompt,
      'claude-haiku-4-5-20251001',
      1024,
    );

    const isReady = content.includes('[APP_READY]');
    let appSpec: Record<string, string> | null = null;

    if (isReady) {
      const match = content.match(/\[APP_READY\]([\s\S]*?)\[\/APP_READY\]/);
      if (match) {
        appSpec = {};
        for (const line of match[1].trim().split('\n')) {
          const [key, ...vals] = line.split(':');
          if (key && vals.length) appSpec[key.trim()] = vals.join(':').trim();
        }
      }
    }

    const cleanContent = content.replace(/\[APP_READY\][\s\S]*?\[\/APP_READY\]/, '').trim();
    return { content: cleanContent, isReady, appSpec };
  }

  @Post('homepage-chat')
  async homepageChat(
    @Body() body: {
      message: string;
      chatHistory?: { role: string; content: string }[];
    },
  ) {
    const systemPrompt = `당신은 Foundry AI MVP 빌더의 홈페이지 상담 도우미입니다.

■ Foundry 소개 (이 내용을 기반으로 답변):
- AI와 대화하면 웹앱이 자동으로 만들어지는 MVP 빌더 플랫폼
- 비개발자도 30분이면 실제 작동하는 앱을 만들 수 있음
- 코드 + DB 설계를 ZIP으로 다운로드 가능 → 외주사/개발자에게 전달 가능
- AI 회의실: Claude + GPT + Gemini 3개 AI가 사업 아이디어를 다각도로 분석
- 비주얼 에디터: 텍스트 클릭하면 바로 수정 가능
- 사업계획서(PDF) 업로드하면 AI가 분석 후 MVP 자동 생성
- 실제 운영 중인 데모앱 9개: foundry.ai.kr/portfolio
- 정부지원사업비 정산 가능 (세금계산서 발행)
- 가격: 라이트 49만원 / 스탠다드 99만원 / 크레딧 충전도 가능

■ MVP를 먼저 만들어야 하는 이유:
- 외주사 미팅 시 견적 절감 효과 (MVP가 기획서 역할)
- 개발자 미팅 시 소통 비용 대폭 감소 (화면 보여주면 끝)
- 시장 검증: 돈 쓰기 전에 고객 반응 먼저 테스트
- 코드 인수인계: ZIP 다운로드 → 개발자에게 바로 전달

■ 규칙:
- 한국어로 친근하고 간결하게 답변 (3~5줄 이내)
- 기술적 내부 구현 방식은 공개하지 마세요 (어떤 AI 모델을 쓰는지, 내부 아키텍처, 서버 구조 등)
- "어떻게 만드나요?" 질문에는 기술 설명 대신 "AI와 대화하면 자동으로 만들어집니다" 수준으로
- 질문에 맞는 기능을 안내하고, 적절한 페이지를 추천해주세요:
  · 앱 만들기 → foundry.ai.kr/start
  · AI 회의실 → foundry.ai.kr/meeting
  · 포트폴리오 → foundry.ai.kr/portfolio
  · 가격표 → foundry.ai.kr/pricing
- 경쟁사 비교 질문에는 Foundry 장점만 말하고 경쟁사 비하하지 마세요
- 모르는 내용은 "자세한 내용은 mark@serion.ai.kr로 문의해주세요" 안내`;

    const chatHistory = body.chatHistory || [];
    const messages = chatHistory.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
    const userPrompt = messages ? `${messages}\n사용자: ${body.message}` : `사용자: ${body.message}`;

    try {
      const content = await this.router.callAnthropic(
        systemPrompt,
        userPrompt,
        'claude-haiku-4-5-20251001',
        512,
      );
      return { content };
    } catch {
      return { content: '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
    }
  }
}
