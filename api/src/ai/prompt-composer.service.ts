import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

type PageType = 'dashboard' | 'list' | 'form' | 'detail';
type PatternName = 'tailwind' | 'supabase-auth';

@Injectable()
export class PromptComposerService {
  private readonly logger = new Logger(PromptComposerService.name);
  private readonly promptsDir = path.join(__dirname, 'prompts');
  private cache = new Map<string, string>();

  /**
   * 코어 규칙 (공통, 항상 로드)
   */
  async loadCore(): Promise<string> {
    return this.loadCached('core.md');
  }

  /**
   * 페이지 타입별 전용 지침
   */
  async loadPageTemplate(type: PageType): Promise<string> {
    return this.loadCached(`pages/${type}.md`);
  }

  /**
   * 패턴 지침 (tailwind, supabase-auth)
   */
  async loadPattern(name: PatternName): Promise<string> {
    return this.loadCached(`patterns/${name}.md`);
  }

  /**
   * 페이지 생성용 프롬프트 조합
   * core + page + tailwind + supabase-auth
   */
  async composeForPage(pageType: string): Promise<string> {
    const type = this.normalizeType(pageType);
    const [core, page, tailwind, supabase] = await Promise.all([
      this.loadCore(),
      this.loadPageTemplate(type),
      this.loadPattern('tailwind'),
      this.loadPattern('supabase-auth'),
    ]);
    return [core, page, tailwind, supabase].join('\n\n---\n\n');
  }

  /**
   * 고정 템플릿 (AI 생성 X, 그대로 복붙)
   */
  async loadFixedTemplate(name: 'supabase-client.ts' | 'layout.tsx' | 'next.config.ts'): Promise<string> {
    const fullPath = path.join(this.promptsDir, 'fixed-templates', name);
    return fs.readFile(fullPath, 'utf-8');
  }

  /**
   * 페이지 타입 추론 (architecture.json의 page.name/path 기반)
   */
  normalizeType(input: string): PageType {
    const lower = (input || '').toLowerCase();
    if (lower.includes('dashboard') || lower.includes('대시보드') || lower.includes('통계') || lower.includes('분석')) {
      return 'dashboard';
    }
    if (
      lower.includes('form') ||
      lower.includes('폼') ||
      lower.includes('등록') ||
      lower.includes('추가') ||
      lower.includes('작성') ||
      lower.includes('edit') ||
      lower.includes('수정')
    ) {
      return 'form';
    }
    if (lower.includes('detail') || lower.includes('상세') || lower.includes('[id]')) {
      return 'detail';
    }
    return 'list';
  }

  private async loadCached(relativePath: string): Promise<string> {
    if (this.cache.has(relativePath)) return this.cache.get(relativePath)!;
    const fullPath = path.join(this.promptsDir, relativePath);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      this.cache.set(relativePath, content);
      return content;
    } catch (err: any) {
      this.logger.error(`프롬프트 파일 로드 실패: ${fullPath} — ${err.message}`);
      throw err;
    }
  }

  /**
   * 캐시 초기화 (hot reload 지원)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
