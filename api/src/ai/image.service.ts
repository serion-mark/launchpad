import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * AI 이미지 생성 (DALL-E 3)
   * Gemini Imagen 3 대신 DALL-E 3 사용 — API가 더 안정적
   */
  async generateImage(
    prompt: string,
    style?: string,
    projectId?: string,
  ): Promise<{ imageUrl: string; revisedPrompt: string }> {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다');
    }

    const fullPrompt = style
      ? `${prompt}. Style: ${style}`
      : `${prompt}. Style: modern, clean, professional, minimal`;

    this.logger.log(`[이미지 생성] 프롬프트: ${fullPrompt.slice(0, 100)}...`);

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0]?.url || '';
    const revisedPrompt = response.data[0]?.revised_prompt || prompt;

    this.logger.log(`[이미지 생성] 완료: ${imageUrl.slice(0, 80)}...`);

    return { imageUrl, revisedPrompt };
  }
}
