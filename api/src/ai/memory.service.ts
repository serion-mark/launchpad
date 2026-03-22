import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic();
  }

  // ── 프로젝트 메모리 로드 (없으면 auto-create) ──────────
  async getProjectMemory(projectId: string) {
    let memory = await this.prisma.projectMemory.findUnique({
      where: { projectId },
    });
    if (!memory) {
      memory = await this.prisma.projectMemory.create({
        data: { projectId },
      });
    }
    return memory;
  }

  // ── 사용자 메모리 로드 (없으면 auto-create) ──────────
  async getUserMemory(userId: string) {
    let memory = await this.prisma.userMemory.findUnique({
      where: { userId },
    });
    if (!memory) {
      memory = await this.prisma.userMemory.create({
        data: { userId },
      });
    }
    return memory;
  }

  // ── 대화 요약 후 저장 (Haiku, 비동기) ──────────────────
  async summarizeAndSave(
    projectId: string,
    messages: { role: string; content: string }[],
  ): Promise<void> {
    try {
      // 최근 10개 메시지만 요약 (비용 절감)
      const recentMessages = messages.slice(-10);
      const chatText = recentMessages
        .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
        .join('\n');

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `다음 대화에서 프로젝트 개발에 중요한 정보를 3줄로 요약하세요. 한국어로 작성하세요.\n\n${chatText}`,
          },
        ],
      });

      const summary =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // 기존 요약에 append (최대 2000자 유지)
      const memory = await this.getProjectMemory(projectId);
      const existingSummary = memory.chatSummary || '';
      const newSummary = existingSummary
        ? `${existingSummary}\n---\n${summary}`.slice(-2000)
        : summary;

      await this.prisma.projectMemory.update({
        where: { projectId },
        data: { chatSummary: newSummary },
      });

      this.logger.log(`프로젝트 ${projectId} 대화 요약 저장 완료`);
    } catch (error) {
      // 요약 실패는 무시 (핵심 기능 아님)
      this.logger.warn(`대화 요약 실패: ${error}`);
    }
  }

  // ── 사용자 선호 자동 감지 ──────────────────────────────
  async detectPreferences(
    projectId: string,
    userId: string,
    message: string,
  ): Promise<void> {
    try {
      const colorMatch = message.match(
        /(파란|빨간|초록|보라|분홍|노란|검정|하얀|주황|연두|남색|하늘|핑크|민트|그린|블루|레드|퍼플|오렌지|골드|실버)(색|빛|톤|계열)?/g,
      );
      const styleMatch = message.match(
        /(미니멀|모던|클래식|귀여운|깔끔한|심플|화려한|고급|럭셔리|빈티지|레트로|다크|밝은)/g,
      );
      const fontMatch = message.match(
        /(둥근|각진|산세리프|세리프|손글씨|고딕|명조|나눔|프리텐|Pretendard)/g,
      );

      if (!colorMatch && !styleMatch && !fontMatch) return;

      const memory = await this.getProjectMemory(projectId);
      const prefs = (memory.preferences as Record<string, unknown>) || {};

      if (colorMatch) prefs.colors = colorMatch;
      if (styleMatch) prefs.style = styleMatch[0];
      if (fontMatch) prefs.fonts = fontMatch;

      await this.prisma.projectMemory.update({
        where: { projectId },
        data: { preferences: prefs as any },
      });

      // UserMemory도 업데이트 (프로젝트 공통)
      if (colorMatch || styleMatch) {
        const userMemory = await this.getUserMemory(userId);
        const userPrefs =
          (userMemory.designPref as Record<string, unknown>) || {};
        if (colorMatch) userPrefs.colors = colorMatch;
        if (styleMatch) userPrefs.style = styleMatch[0];

        await this.prisma.userMemory.update({
          where: { userId },
          data: { designPref: userPrefs as any },
        });
      }
    } catch (error) {
      this.logger.warn(`선호 감지 실패: ${error}`);
    }
  }

  // ── 수정 히스토리 기록 ──────────────────────────────────
  async recordModification(
    projectId: string,
    change: string,
    version: number,
  ): Promise<void> {
    try {
      const memory = await this.getProjectMemory(projectId);
      const history = (memory.modHistory as any[]) || [];

      history.push({
        version,
        change: change.slice(0, 200),
        date: new Date().toISOString(),
      });

      // 최근 20개만 유지
      const trimmed = history.slice(-20);

      await this.prisma.projectMemory.update({
        where: { projectId },
        data: { modHistory: trimmed as any },
      });
    } catch (error) {
      this.logger.warn(`수정 히스토리 기록 실패: ${error}`);
    }
  }

  // ── 메모리 → AI 시스템 프롬프트 조합 ──────────────────
  async buildContextPrompt(
    projectId: string,
    userId: string,
  ): Promise<string> {
    try {
      const [projectMemory, userMemory] = await Promise.all([
        this.getProjectMemory(projectId),
        this.getUserMemory(userId),
      ]);

      const parts: string[] = [];

      // 프로젝트 메모리
      if (projectMemory.chatSummary) {
        parts.push(`[이전 대화 요약]\n${projectMemory.chatSummary}`);
      }
      if (projectMemory.preferences) {
        const prefs = projectMemory.preferences as Record<string, unknown>;
        const prefStr = Object.entries(prefs)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(', ');
        parts.push(`[프로젝트 선호] ${prefStr}`);
      }
      if (
        projectMemory.modHistory &&
        (projectMemory.modHistory as any[]).length > 0
      ) {
        const recent = (projectMemory.modHistory as any[]).slice(-5);
        const historyStr = recent
          .map((h: any) => `v${h.version}: ${h.change}`)
          .join('\n');
        parts.push(`[최근 수정 히스토리]\n${historyStr}`);
      }

      // 사용자 메모리
      if (userMemory.domain) {
        parts.push(`[사용자 업종] ${userMemory.domain}`);
      }
      if (userMemory.designPref) {
        const dp = userMemory.designPref as Record<string, unknown>;
        const dpStr = Object.entries(dp)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(', ');
        parts.push(`[사용자 디자인 선호] ${dpStr}`);
      }

      return parts.length > 0
        ? `\n\n═══ 프로젝트 메모리 ═══\n${parts.join('\n\n')}\n═══════════════════\n`
        : '';
    } catch (error) {
      this.logger.warn(`컨텍스트 프롬프트 생성 실패: ${error}`);
      return '';
    }
  }
}
