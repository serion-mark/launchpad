import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';
import { SessionStoreService } from './session-store.service';
import { AnswerParserService } from './answer-parser.service';
import { ProjectPersistenceService } from './project-persistence.service';
import { PrismaService } from '../prisma.service';
import { AgentToolExecutor, AGENT_TOOLS } from './agent-tools';
import { SupabaseService } from '../supabase/supabase.service';
import { DeployService } from '../project/deploy.service';
import { AgentDeployService } from './agent-deploy.service';
import { EventTranslatorService, STAGES } from './event-translator.service';
import {
  AgentStreamEvent,
  AGENT_MAX_ITERATIONS,
  CardRequest,
} from './stream-event.types';

const MODEL = 'claude-sonnet-4-6';

export type AgentBuilderInput = {
  userId: string | number;
  prompt: string;
  // 수정 모드: 기존 프로젝트 id — 있으면 sandbox 에 generatedCode 복원 + 새 draft 생성 스킵
  projectId?: string;
  onEvent: (event: AgentStreamEvent) => void;
};

@Injectable()
export class AgentBuilderService {
  private readonly logger = new Logger(AgentBuilderService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly sandbox: SandboxService,
    private readonly promptLoader: PromptLoaderService,
    private readonly sessionStore: SessionStoreService,
    private readonly parser: AnswerParserService,
    private readonly persistence: ProjectPersistenceService,
    private readonly supabase: SupabaseService,
    @Inject(forwardRef(() => DeployService))
    private readonly deploy: DeployService,
    private readonly translator: EventTranslatorService,
    private readonly agentDeploy: AgentDeployService,
    private readonly prisma: PrismaService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // Day 4.6: 단계별 진행률 추정 (사용자 체감용, 정확한 값 아님)
  private calcProgress(stage: string): number {
    const map: Record<string, number> = {
      intent: 10,
      setup: 25,
      design: 40,
      pages: 60,
      verify: 80,
      database: 90,
      deploy: 95,
    };
    return map[stage] ?? 50;
  }

  /**
   * 사용자 소유 모든 프로젝트에 대해 Supabase auto-confirm 활성화 (기존 앱 긴급 복구용)
   * - 기본값(Email Confirmation ON) 로 만들어진 앱들 가입 후 로그인 불가 문제 해결
   * - 각 프로젝트의 Supabase 프로젝트에 mailer_autoconfirm=true + 기존 미confirm 사용자 일괄 confirm
   */
  async fixAutoConfirmAll(userId: string): Promise<{
    total: number;
    successCount: number;
    failedCount: number;
    results: Array<{
      projectId: string;
      name: string;
      subdomain: string | null;
      ok: boolean;
      error?: string;
    }>;
  }> {
    const projects = await this.prisma.project.findMany({
      where: {
        userId,
        supabaseProjectRef: { not: null },
        supabaseStatus: 'active',
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        supabaseProjectRef: true,
      },
    });

    const results: Array<{
      projectId: string;
      name: string;
      subdomain: string | null;
      ok: boolean;
      error?: string;
    }> = [];

    for (const p of projects) {
      if (!p.supabaseProjectRef) continue;
      const r = await this.supabase.setAutoConfirm(p.supabaseProjectRef);
      results.push({
        projectId: p.id,
        name: p.name,
        subdomain: p.subdomain,
        ok: r.success,
        error: r.error,
      });
    }

    const successCount = results.filter((r) => r.ok).length;
    const failedCount = results.length - successCount;
    this.logger.log(
      `[fixAutoConfirmAll] userId=${userId} ${successCount}/${results.length} 성공`,
    );
    return { total: results.length, successCount, failedCount, results };
  }

  async run(input: AgentBuilderInput): Promise<void> {
    const { userId, prompt, projectId: editingProjectId, onEvent } = input;
    const start = Date.now();

    // 1. 샌드박스 세션 생성
    const { sessionId, cwd } = await this.sandbox.createSession(userId);
    onEvent({ type: 'start', sessionId, cwd });

    // 1-bis. 수정 모드: 기존 프로젝트의 generatedCode 를 sandbox 로 복원
    //        Agent 가 Read 도구로 기존 코드를 읽고 정확하게 진단/수정 할 수 있도록
    //        (사장님 실증 A: "샌드박스 외부라 코드 못 읽음" 해소)
    let restoredProjectName: string | undefined;
    if (editingProjectId && userId && userId !== 'anon') {
      try {
        const existing = await this.prisma.project.findFirst({
          where: { id: editingProjectId, userId: String(userId) },
          select: { id: true, name: true, generatedCode: true, subdomain: true },
        });
        if (!existing) {
          this.logger.warn(`[restore] project ${editingProjectId} 없음 또는 소유권 없음 — 신규 모드로 진행`);
        } else if (!existing.generatedCode) {
          this.logger.warn(`[restore] ${editingProjectId} generatedCode 비어있음 — 신규 모드로 진행`);
        } else {
          const files = existing.generatedCode as unknown as Array<{ path: string; content: string }>;
          const safeName = (existing.name || 'app').replace(/[^a-zA-Z0-9_\-가-힣]/g, '_').slice(0, 40) || 'app';
          const projectDir = path.join(cwd, safeName);
          await fs.mkdir(projectDir, { recursive: true });
          for (const file of files) {
            if (!file?.path || typeof file.content !== 'string') continue;
            const fullPath = path.join(projectDir, file.path);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, file.content, 'utf8');
          }
          restoredProjectName = existing.name;
          this.logger.log(`[restore] ${editingProjectId} "${existing.name}" → ${files.length} files 복원 (${projectDir})`);
        }
      } catch (err: any) {
        this.logger.error(`[restore] 실패: ${err?.message} — 신규 모드로 계속 진행`, err?.stack);
      }
    }

    // 2. projects 껍데기 — 수정 모드면 기존 projectId 재사용, 신규면 새 draft 생성
    //    실패해도 Agent loop 은 진행 (비로그인 사용자 등)
    let projectId: string | undefined;
    let projectName: string | undefined;
    let subdomain: string | undefined;
    if (editingProjectId && restoredProjectName !== undefined) {
      projectId = editingProjectId;
      projectName = restoredProjectName;
      this.logger.log(`[agent-builder] 수정 모드 — 기존 project ${projectId} 재사용`);
    } else {
      const startResult = await this.persistence.startProject(String(userId), prompt);
      projectId = startResult.ok ? startResult.projectId : undefined;
      projectName = startResult.ok ? startResult.projectName : undefined;
      subdomain = startResult.ok ? startResult.subdomain : undefined;
      if (projectId) {
        this.logger.log(`[agent-builder] project draft ${projectId} (name=${projectName})`);
      }
    }

    const executor = new AgentToolExecutor(this.sandbox, cwd, {
      supabase: this.supabase,
      deploy: this.deploy,
      agentDeploy: this.agentDeploy,
      persistence: this.persistence,
      prisma: this.prisma,
      userId: String(userId),
      projectId,
      userPrompt: prompt,
    });

    // 2. system prompt 로드 (agent-core + intent-patterns + vague-detection + selection-triggers)
    // cache_control 1h TTL 적용 — 13K+ 토큰이므로 캐시 효과 큼 (V-0 검증)
    const systemPrompt = await this.promptLoader.getSystemPrompt();

    // 3. 메시지 스택 초기화
    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    let iter = 0;
    let done = false;
    let totalCostUsd = 0;

    try {
      while (!done && iter < AGENT_MAX_ITERATIONS) {
        iter++;

        const res = await this.anthropic.messages.create({
          model: MODEL,
          max_tokens: 8192,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          tools: AGENT_TOOLS as any,
          messages,
        });

        onEvent({ type: 'iteration', n: iter, stopReason: res.stop_reason ?? undefined });

        // 비용 추정 (대략 계산 — Anthropic이 usage 응답)
        if (res.usage) {
          const costInput = (res.usage.input_tokens / 1_000_000) * 3;
          const costOutput = (res.usage.output_tokens / 1_000_000) * 15;
          totalCostUsd += costInput + costOutput;
        }

        // assistant 응답 전체를 messages에 그대로 push
        messages.push({ role: 'assistant', content: res.content });

        // content block 처리
        const toolUses: Anthropic.Messages.ToolUseBlock[] = [];
        for (const block of res.content) {
          if (block.type === 'text') {
            onEvent({ type: 'assistant_text', text: block.text });
          } else if (block.type === 'tool_use') {
            toolUses.push(block);
          }
        }

        if (res.stop_reason === 'tool_use' && toolUses.length > 0) {
          // 각 tool_use 실행 + 결과를 user 메시지로 묶어서 push
          const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            onEvent({
              type: 'tool_call',
              id: tu.id,
              name: tu.name,
              input: tu.input,
            });

            // Day 4.6: raw 도구 호출을 포비 어휘로 번역 → 사용자에게 high-level 이벤트
            const translated = this.translator.translate(tu.name, tu.input);
            if (translated) {
              onEvent({
                type: 'foundry_progress',
                stage: translated.stage,
                label: translated.label,
                emoji: translated.emoji,
                percent: this.calcProgress(translated.stage),
                elapsedMs: Date.now() - start,
              });
            }

            // AskUser는 SSE로 카드 방출 후 사용자 답변 대기 (pause/resume)
            if (tu.name === 'AskUser') {
              const askStart = Date.now();
              const input = tu.input as any;
              const card: CardRequest = {
                pendingId: tu.id,
                title: input.title ?? '',
                questions: Array.isArray(input.questions) ? input.questions : [],
                assumed: input.assumed,
                inputHint:
                  input.inputHint ?? '번호("1, 2, 1") 또는 자연어로 편하게 말씀해주세요.',
                quickStart: {
                  label: input.quickStartLabel ?? '추정값 그대로 바로 시작 →',
                  value: 'DEFAULT_ALL',
                },
                allowFreeText: true,
              };
              onEvent({ type: 'card_request', card });

              let resultContent: string;
              let resultOk = true;
              try {
                const userRaw = await this.sessionStore.waitForAnswer(sessionId, tu.id, card);
                const parsed = this.parser.parse(userRaw, card);
                resultContent = this.parser.summarize(parsed);
                onEvent({
                  type: 'card_answered',
                  pendingId: tu.id,
                  answerSummary: parsed.message,
                });
              } catch (err: any) {
                resultContent = `[AskUser 실패] ${err?.message ?? String(err)}`;
                resultOk = false;
              }

              onEvent({
                type: 'tool_result',
                id: tu.id,
                ok: resultOk,
                output: resultContent,
                durationMs: Date.now() - askStart,
              });

              toolResultBlocks.push({
                type: 'tool_result',
                tool_use_id: tu.id,
                content: resultContent,
                is_error: !resultOk,
              });
              continue;
            }

            const result = await executor.execute(tu.name, tu.input);

            onEvent({
              type: 'tool_result',
              id: tu.id,
              ok: result.ok,
              output: result.output,
              durationMs: result.durationMs,
            });

            toolResultBlocks.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: result.output,
              is_error: !result.ok,
            });
          }
          messages.push({ role: 'user', content: toolResultBlocks });
        } else {
          // end_turn 또는 max_tokens 등
          done = true;
        }
      }

      // 프로젝트 저장 — deploy_to_subdomain 도구가 이미 호출됐다면 finishProject 는 중복 실행되지만
      // 같은 generatedCode 로 덮어쓰기이므로 무해. 도구를 안 쓴 경우 여기서만 저장됨.
      const persistResult = projectId
        ? await this.persistence.finishProject({
            userId: String(userId),
            cwd,
            userPrompt: prompt,
            projectId,
          })
        : await this.persistence.persist({
            userId: String(userId),
            cwd,
            userPrompt: prompt,
          });

      // iframe 프리뷰 에 띄울 deployedUrl 조회 — deploy_to_subdomain 도구가 호출됐다면 set 됨
      let previewUrl: string | undefined;
      const finalProjectId = projectId ?? (persistResult.ok ? persistResult.projectId : undefined);
      if (finalProjectId) {
        const p = await this.prisma.project
          .findUnique({ where: { id: finalProjectId }, select: { deployedUrl: true } })
          .catch(() => null);
        previewUrl = p?.deployedUrl ?? undefined;
      }

      onEvent({
        type: 'complete',
        totalIterations: iter,
        totalCostUsd: Number(totalCostUsd.toFixed(6)),
        durationMs: Date.now() - start,
        projectId: finalProjectId,
        projectName: persistResult.ok ? persistResult.projectName : projectName,
        subdomain: persistResult.ok ? persistResult.subdomain : subdomain,
        fileCount: persistResult.ok ? persistResult.fileCount : undefined,
        previewUrl,
      });
    } catch (err: any) {
      this.logger.error(`[agent-builder] 실패: ${err?.message}`, err?.stack);
      onEvent({
        type: 'error',
        message: err?.message ?? String(err),
        where: `iter ${iter}`,
      });
    } finally {
      this.sessionStore.cancelSession(sessionId, 'run 종료');

      // 쓰레기 draft 자동 정리 — 상의 모드로 파일 한 개도 안 만들고 끝난 경우
      // startProject 로 만든 projects 레코드가 draft + generatedCode 없음 → 삭제
      // 이름도 프롬프트 앞부분 그대로라 "내 프로젝트" 에 노출되면 지저분
      if (projectId) {
        try {
          const p = await this.prisma.project
            .findUnique({
              where: { id: projectId },
              select: { status: true, generatedCode: true, name: true },
            })
            .catch(() => null);
          if (p && p.status === 'draft') {
            const files = (p.generatedCode as any) ?? null;
            const isEmpty =
              !files ||
              (Array.isArray(files) && files.length === 0) ||
              (typeof files === 'object' && Object.keys(files).length === 0);
            if (isEmpty) {
              await this.prisma.project.delete({ where: { id: projectId } }).catch(() => {});
              this.logger.log(`[cleanup-draft] ${projectId} 자동 삭제 (빈 draft: "${p.name}")`);
            }
          }
        } catch {
          // 정리 실패는 무시 — 메인 흐름 영향 없음
        }
      }

      // Day 1은 sandbox cwd 정리하지 않음 — 검증 편의. Day 5 이후 정리 크론 추가.
      // await this.sandbox.cleanup(cwd);
    }
  }
}
