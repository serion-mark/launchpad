import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

type PageType = 'dashboard' | 'list' | 'form' | 'detail';
type ComponentType = 'modal' | 'chart' | 'card' | 'list-item';
type PatternName = 'tailwind' | 'supabase-auth';

export type FileType = PageType | ComponentType;

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
   * 컴포넌트 타입별 전용 지침 (Phase 0.5 v2 신규!)
   */
  async loadComponentTemplate(type: ComponentType): Promise<string> {
    return this.loadCached(`components/${type}.md`);
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
   * 총 약 1,800줄 상당 = 약 30K 토큰
   */
  async composeForPage(pageType: string): Promise<string> {
    const type = this.normalizePageType(pageType);
    const [core, page, tailwind, supabase] = await Promise.all([
      this.loadCore(),
      this.loadPageTemplate(type),
      this.loadPattern('tailwind'),
      this.loadPattern('supabase-auth'),
    ]);
    return [core, page, tailwind, supabase].join('\n\n---\n\n');
  }

  /**
   * 컴포넌트 생성용 프롬프트 조합 (Phase 0.5 v2 신규!)
   * core + component + tailwind
   * 총 약 1,200줄 상당 = 약 20K 토큰
   */
  async composeForComponent(filePath: string): Promise<string> {
    const type = this.normalizeComponentType(filePath);
    const [core, component, tailwind] = await Promise.all([
      this.loadCore(),
      this.loadComponentTemplate(type),
      this.loadPattern('tailwind'),
    ]);
    return [core, component, tailwind].join('\n\n---\n\n');
  }

  /**
   * 파일 경로로 페이지 vs 컴포넌트 판별 (Phase 0.5 v2 핵심!)
   * /components/ 경로 감지 → 컴포넌트 프롬프트
   */
  isComponentFile(filePath: string): boolean {
    return (filePath || '').includes('/components/');
  }

  /**
   * 파일 경로 + 메타정보로 자동 조합
   */
  async composeForFile(filePath: string, pageNameHint: string = ''): Promise<string> {
    if (this.isComponentFile(filePath)) {
      return this.composeForComponent(filePath);
    }
    return this.composeForPage(`${pageNameHint} ${filePath}`);
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
  normalizePageType(input: string): PageType {
    const lower = (input || '').toLowerCase();
    if (
      lower.includes('dashboard') ||
      lower.includes('대시보드') ||
      lower.includes('통계') ||
      lower.includes('분석') ||
      lower.includes('report') ||
      lower.includes('리포트')
    ) {
      return 'dashboard';
    }
    if (
      lower.includes('form') ||
      lower.includes('폼') ||
      lower.includes('등록') ||
      lower.includes('추가') ||
      lower.includes('작성') ||
      lower.includes('/new') ||
      lower.includes('/edit') ||
      lower.includes('수정')
    ) {
      return 'form';
    }
    if (lower.includes('/detail') || lower.includes('상세') || lower.includes('[id]')) {
      return 'detail';
    }
    return 'list';
  }

  /**
   * 컴포넌트 타입 추론 (파일 이름 기반)
   */
  normalizeComponentType(filePath: string): ComponentType {
    const lower = (filePath || '').toLowerCase();
    const fileName = lower.split('/').pop() || '';
    if (fileName.includes('modal') || fileName.includes('dialog') || fileName.includes('popup')) {
      return 'modal';
    }
    if (fileName.includes('chart') || fileName.includes('graph') || fileName.includes('plot')) {
      return 'chart';
    }
    if (fileName.includes('row') || fileName.includes('-item') || fileName.includes('listitem')) {
      return 'list-item';
    }
    // 나머지 컴포넌트는 기본 card 패턴 (StatCard, ProjectCard, FeatureCard 등)
    return 'card';
  }

  /**
   * 기존 호환성용 (ai.service.ts에서 쓰던 방식)
   * @deprecated use composeForFile instead
   */
  normalizeType(input: string): PageType {
    return this.normalizePageType(input);
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
