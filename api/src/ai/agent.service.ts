import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma.service';
import { MemoryService } from './memory.service';

// ── Agent 행동 타입 ──────────────────────────────────
type AgentAction =
  | { type: 'read_file'; path: string; reason: string }
  | { type: 'modify_file'; path: string; content: string; reason: string }
  | { type: 'run_build'; reason: string }
  | { type: 'done'; summary: string };

type AgentStep = {
  step: number;
  action: AgentAction;
  result: string;
  timestamp: string;
};

export type AgentStepEvent = {
  step: number;
  totalSteps: number;
  action: string;
  message: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
};

// ── Agent 시스템 프롬프트 ────────────────────────────
const AGENT_SYSTEM_PROMPT = `당신은 Foundry Agent입니다. 사용자의 웹 앱 코드를 자율적으로 분석하고 수정합니다.

가능한 행동 (반드시 JSON으로 반환):
1. {"type": "read_file", "path": "src/app/page.tsx", "reason": "메인 페이지 구조 확인"}
2. {"type": "modify_file", "path": "src/app/page.tsx", "content": "전체 코드 내용", "reason": "로그인 버튼 추가"}
3. {"type": "run_build", "reason": "수정 후 빌드 검증"}
4. {"type": "done", "summary": "로그인 페이지 추가 완료. 이메일/비밀번호 입력 폼과 소셜 로그인 버튼 포함."}

규칙:
- 반드시 하나의 JSON 객체만 반환 (마크다운, 설명 없이 순수 JSON만)
- 파일 수정 시 전체 파일 내용을 content에 포함 (부분 수정 불가)
- 모든 코드는 'use client' 필수, TypeScript + Tailwind CSS 사용
- 주요 컴포넌트에 data-component 속성 추가
- lucide-react 아이콘 사용 가능
- 수정 후에는 반드시 run_build로 검증
- 최대한 적은 단계로 완료 (효율적으로)`;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private anthropic: Anthropic;

  constructor(
    private prisma: PrismaService,
    private memoryService: MemoryService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ── Agent SSE 실행 (EventEmitter 반환) ─────────────────
  runAgentSSE(userId: string, projectId: string, task: string): EventEmitter {
    const emitter = new EventEmitter();
    this._runAgentLoop(emitter, userId, projectId, task).catch((err) => {
      emitter.emit('error', { message: err.message?.slice(0, 300) || 'Agent 실행 실패' });
    });
    return emitter;
  }

  // ── Agent 루프 (핵심) ──────────────────────────────────
  private async _runAgentLoop(
    emitter: EventEmitter,
    userId: string,
    projectId: string,
    task: string,
  ): Promise<void> {
    const MAX_STEPS = 10;
    const steps: AgentStep[] = [];
    const readFiles: Record<string, string> = {};

    // 프로젝트 코드 로드
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { generatedCode: true, modelUsed: true, name: true },
    });
    if (!project?.generatedCode) {
      emitter.emit('error', { message: '프로젝트 코드가 없습니다. 먼저 앱을 생성하세요.' });
      return;
    }

    const files = project.generatedCode as { path: string; content: string }[];
    const fileList = files.map((f) => f.path).join('\n');

    // 메모리 컨텍스트
    const memoryContext = await this.memoryService.buildContextPrompt(projectId, userId);

    emitter.emit('step', {
      step: 0,
      totalSteps: MAX_STEPS,
      action: 'init',
      message: `Agent 시작: "${task}"`,
      status: 'running',
    } as AgentStepEvent);

    for (let i = 0; i < MAX_STEPS; i++) {
      try {
        // ── 1. AI에게 다음 행동 결정 요청 ──
        const contextStr = this.buildContext(steps, readFiles, fileList, memoryContext);
        const action = await this.decideAction(task, contextStr);

        if (!action) {
          emitter.emit('step', {
            step: i + 1,
            totalSteps: MAX_STEPS,
            action: 'error',
            message: 'AI 응답을 파싱할 수 없습니다',
            status: 'error',
          } as AgentStepEvent);
          break;
        }

        // ── 2. 행동 실행 ──
        let result = '';
        const actionMsg = this.getActionMessage(action);

        emitter.emit('step', {
          step: i + 1,
          totalSteps: MAX_STEPS,
          action: action.type,
          message: actionMsg,
          status: 'running',
          detail: 'path' in action ? action.path : undefined,
        } as AgentStepEvent);

        switch (action.type) {
          case 'read_file': {
            const file = files.find((f) => f.path === action.path || f.path.endsWith(action.path));
            if (file) {
              readFiles[file.path] = file.content;
              result = `파일 읽기 완료 (${file.content.length}자)`;
            } else {
              result = `파일을 찾을 수 없습니다: ${action.path}`;
            }
            break;
          }

          case 'modify_file': {
            const idx = files.findIndex((f) => f.path === action.path || f.path.endsWith(action.path));
            if (idx >= 0) {
              files[idx] = { path: files[idx].path, content: action.content };
              result = `파일 수정 완료: ${files[idx].path}`;
            } else {
              // 새 파일 추가
              files.push({ path: action.path, content: action.content });
              result = `새 파일 추가: ${action.path}`;
            }
            // DB 즉시 저장
            await this.prisma.project.update({
              where: { id: projectId },
              data: { generatedCode: files as any },
            });
            break;
          }

          case 'run_build': {
            // 빌드 테스트는 실제 deploy.service 호출이 필요하므로
            // 여기서는 코드 유효성 검사만 수행
            result = this.quickValidate(files);
            break;
          }

          case 'done': {
            // 최종 수정된 코드 DB 저장
            await this.prisma.project.update({
              where: { id: projectId },
              data: {
                generatedCode: files as any,
                totalModifications: { increment: 1 },
              },
            });

            // 메모리에 수정 히스토리 기록
            this.memoryService
              .recordModification(projectId, action.summary, steps.length)
              .catch(() => {});

            emitter.emit('step', {
              step: i + 1,
              totalSteps: MAX_STEPS,
              action: 'done',
              message: action.summary,
              status: 'done',
            } as AgentStepEvent);

            emitter.emit('done', {
              success: true,
              steps: steps.length + 1,
              summary: action.summary,
              modifiedFiles: files,
            });
            return;
          }
        }

        steps.push({
          step: i + 1,
          action,
          result,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        this.logger.error(`Agent step ${i + 1} error: ${error.message}`);
        emitter.emit('step', {
          step: i + 1,
          totalSteps: MAX_STEPS,
          action: 'error',
          message: `오류: ${error.message?.slice(0, 100)}`,
          status: 'error',
        } as AgentStepEvent);
        break;
      }
    }

    // max steps 도달
    await this.prisma.project.update({
      where: { id: projectId },
      data: { generatedCode: files as any },
    });

    emitter.emit('done', {
      success: false,
      steps: steps.length,
      summary: '최대 단계 수에 도달했습니다. 일부 수정이 적용되었을 수 있습니다.',
      modifiedFiles: files,
    });
  }

  // ── AI에게 다음 행동 결정 요청 ─────────────────────────
  private async decideAction(task: string, context: string): Promise<AgentAction | null> {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      system: AGENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${context}\n\n사용자 요청: ${task}\n\n다음 행동을 JSON으로 반환하세요.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as Anthropic.TextBlock).text)
      .join('');

    // JSON 파싱
    try {
      // 마크다운 코드블록 내부 JSON 추출
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }
      // 순수 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn(`Agent JSON parse failed: ${text.slice(0, 200)}`);
    }

    return null;
  }

  // ── 컨텍스트 조합 ─────────────────────────────────────
  private buildContext(
    steps: AgentStep[],
    readFiles: Record<string, string>,
    fileList: string,
    memoryContext: string,
  ): string {
    let ctx = `프로젝트 파일 목록:\n${fileList}`;

    if (memoryContext) {
      ctx += `\n${memoryContext}`;
    }

    if (Object.keys(readFiles).length > 0) {
      ctx += '\n\n이미 읽은 파일:';
      for (const [path, content] of Object.entries(readFiles)) {
        ctx += `\n\n--- ${path} ---\n${content.slice(0, 3000)}`;
      }
    }

    if (steps.length > 0) {
      ctx += '\n\n이전 단계:';
      for (const step of steps) {
        ctx += `\n${step.step}. ${step.action.type} → ${step.result}`;
      }
    }

    return ctx;
  }

  // ── 행동별 사용자 메시지 ──────────────────────────────
  private getActionMessage(action: AgentAction): string {
    switch (action.type) {
      case 'read_file':
        return `파일 분석 중: ${action.path}`;
      case 'modify_file':
        return `코드 수정 중: ${action.path}`;
      case 'run_build':
        return '빌드 검증 중...';
      case 'done':
        return `완료: ${action.summary}`;
      default:
        return '처리 중...';
    }
  }

  // ── 간이 코드 검증 (빌드 없이) ─────────────────────────
  private quickValidate(files: { path: string; content: string }[]): string {
    const issues: string[] = [];

    for (const file of files) {
      if (!file.path.endsWith('.tsx') && !file.path.endsWith('.ts')) continue;

      // 'use client' 체크
      if (file.path.endsWith('page.tsx') && !file.content.includes("'use client'")) {
        issues.push(`${file.path}: 'use client' 누락`);
      }

      // 금지 import 체크
      const forbidden = ['@heroicons', 'framer-motion', 'react-icons', '@radix-ui', 'next/headers', 'next/server'];
      for (const pkg of forbidden) {
        if (file.content.includes(`from '${pkg}`) || file.content.includes(`from "${pkg}`)) {
          issues.push(`${file.path}: 금지 패키지 ${pkg} import`);
        }
      }

      // 기본 구문 체크 (괄호 매칭)
      const opens = (file.content.match(/\{/g) || []).length;
      const closes = (file.content.match(/\}/g) || []).length;
      if (Math.abs(opens - closes) > 2) {
        issues.push(`${file.path}: 중괄호 불일치 (열림: ${opens}, 닫힘: ${closes})`);
      }
    }

    if (issues.length === 0) {
      return '코드 검증 통과 (이슈 없음)';
    }
    return `이슈 ${issues.length}개 발견:\n${issues.join('\n')}`;
  }
}
