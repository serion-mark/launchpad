import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

// Agent Mode system prompt에 합쳐질 .md 순서
// 핵심 → 세부로 내려가며, 가장 중요한 원칙이 위에 오도록
const PROMPT_FILES = [
  'agent-core.md',
  'intent-patterns.md',
  'vague-detection.md',
  'selection-triggers.md',
] as const;

const SEPARATOR = '\n\n---\n\n';

@Injectable()
export class PromptLoaderService implements OnModuleInit {
  private readonly logger = new Logger(PromptLoaderService.name);
  private cachedSystemPrompt: string | null = null;
  private cachedCharCount = 0;

  async onModuleInit() {
    await this.load();
  }

  async load(): Promise<string> {
    if (this.cachedSystemPrompt) return this.cachedSystemPrompt;

    const promptsDir = path.join(__dirname, 'prompts');
    const parts: string[] = [];
    for (const file of PROMPT_FILES) {
      const fullPath = path.join(promptsDir, file);
      const content = await fs.readFile(fullPath, 'utf8');
      parts.push(content.trim());
    }
    const combined = parts.join(SEPARATOR);
    this.cachedSystemPrompt = combined;
    this.cachedCharCount = combined.length;
    this.logger.log(
      `[prompt-loader] ${PROMPT_FILES.length}개 .md 로드 — ${this.cachedCharCount} chars (~${Math.round(this.cachedCharCount / 2)} tokens 추정)`,
    );
    return combined;
  }

  async getSystemPrompt(): Promise<string> {
    return this.cachedSystemPrompt ?? this.load();
  }

  getCharCount(): number {
    return this.cachedCharCount;
  }

  // 테스트/디버그용 — 캐시 무효화
  reset(): void {
    this.cachedSystemPrompt = null;
    this.cachedCharCount = 0;
  }
}
