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
      chatHistory: { role: string; content: string }[];
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

    const messages = body.chatHistory.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
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
}
