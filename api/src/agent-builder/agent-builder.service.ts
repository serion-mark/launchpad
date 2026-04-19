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

  // 대화 이력을 Anthropic API 호출 가능한 상태로 정리
  // Anthropic 제약:
  //   - 첫 메시지는 반드시 role=user
  //   - assistant 가 tool_use 블록 보내면 다음 user 는 tool_result 를 모두 포함해야
  //   - user 가 tool_result 보낸 뒤에는 assistant 가 반드시 응답해야
  // run() 이 중간에 끊긴 경우 위 제약이 깨진 상태로 DB 에 저장될 수 있음 → 안전하게 잘라냄
  private sanitizeMessageHistory(
    prior: Anthropic.Messages.MessageParam[],
  ): Anthropic.Messages.MessageParam[] {
    if (!Array.isArray(prior) || prior.length === 0) return [];

    const hasToolUse = (msg: Anthropic.Messages.MessageParam): boolean => {
      if (typeof msg.content === 'string') return false;
      if (!Array.isArray(msg.content)) return false;
      return msg.content.some((b: any) => b?.type === 'tool_use');
    };
    const hasToolResult = (msg: Anthropic.Messages.MessageParam): boolean => {
      if (typeof msg.content === 'string') return false;
      if (!Array.isArray(msg.content)) return false;
      return msg.content.some((b: any) => b?.type === 'tool_result');
    };
    const getToolUseIds = (msg: Anthropic.Messages.MessageParam): string[] => {
      if (typeof msg.content === 'string') return [];
      if (!Array.isArray(msg.content)) return [];
      return msg.content
        .filter((b: any) => b?.type === 'tool_use')
        .map((b: any) => b.id);
    };
    const getToolResultIds = (msg: Anthropic.Messages.MessageParam): string[] => {
      if (typeof msg.content === 'string') return [];
      if (!Array.isArray(msg.content)) return [];
      return msg.content
        .filter((b: any) => b?.type === 'tool_result')
        .map((b: any) => b.tool_use_id);
    };

    // 1) "일반 user 메시지"로 시작하는 첫 지점 찾기
    //    tool_result 포함 user 는 앞 assistant(tool_use) 가 있어야 짝이 맞으므로 시작점 불가
    let start = 0;
    while (start < prior.length) {
      const m = prior[start];
      if (m?.role === 'user' && !hasToolResult(m)) break;
      start++;
    }
    const msgs = prior.slice(start);

    // 2) 앞에서부터 훑으며 "짝이 맞는 지점까지만" 보존
    //    - assistant(tool_use 포함) → 바로 다음 메시지가 user(tool_result) 여야 하며 모든 tool_use id 커버되어야
    //    - user(tool_result) → result 마지막에 assistant(tool_use) 있어야 하고 매칭돼야
    //    - 이 중 하나라도 깨지면 즉시 break (그 이후는 모두 버림)
    //    Agent 의 assistant 는 거의 항상 [text + tool_use] 혼합 → 짝 맞춤 검증이 핵심
    const result: Anthropic.Messages.MessageParam[] = [];
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];

      if (m.role === 'assistant') {
        if (hasToolUse(m)) {
          // 다음 메시지가 짝 맞는 user(tool_result) 인지 확인
          const next = msgs[i + 1];
          if (!next || next.role !== 'user' || !hasToolResult(next)) break;
          const useIds = getToolUseIds(m);
          const resIds = getToolResultIds(next);
          // 모든 tool_use 에 대해 tool_result 가 있어야
          const allCovered = useIds.every((id) => resIds.includes(id));
          if (!allCovered) break;
          // 쌍 추가하고 i 한 번 더 증가
          result.push(m);
          result.push(next);
          i++;
          continue;
        }
        // tool_use 없는 assistant (text only) — 깨끗한 메시지
        result.push(m);
        continue;
      }

      if (m.role === 'user') {
        if (hasToolResult(m)) {
          // 위의 assistant(tool_use) 케이스에서 이미 pair 로 소비됐어야 함
          // 여기까지 왔다는 건 앞 assistant 없는 고아 tool_result → break
          break;
        }
        // 일반 user (text) — 깨끗한 메시지
        result.push(m);
        continue;
      }
    }

    // 3) 최종 검증: 첫 메시지가 일반 user 가 아니면 버림
    if (result.length === 0) return [];
    const first = result[0];
    if (first.role !== 'user' || hasToolResult(first)) return [];
    return result;
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

    // 3. 메시지 스택 초기화 — 기존 프로젝트면 과거 대화 이력 로드
    //    "그것도 고쳐줘" 같은 참조형 대화가 세션간 이어지도록
    const messages: Anthropic.Messages.MessageParam[] = [];
    if (editingProjectId && userId && userId !== 'anon') {
      try {
        const p = await this.prisma.project.findFirst({
          where: { id: editingProjectId, userId: String(userId) },
          select: { agentMessages: true },
        });
        if (p?.agentMessages && Array.isArray(p.agentMessages)) {
          const prior = p.agentMessages as unknown as Anthropic.Messages.MessageParam[];
          const sanitized = this.sanitizeMessageHistory(prior.slice(-20));
          if (sanitized.length > 0) {
            messages.push(...sanitized);
            this.logger.log(
              `[agent-history] ${editingProjectId} → 과거 ${sanitized.length}턴 로드 (원본 ${prior.length}턴)`,
            );
          } else {
            this.logger.log(
              `[agent-history] ${editingProjectId} → 과거 이력 sanitize 결과 0턴 (새 대화 시작)`,
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(`[agent-history] 로드 실패 (새 대화로 진행): ${err?.message}`);
      }
    }
    messages.push({ role: 'user', content: prompt });

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

        // 비용 추정 (Sonnet 4.6 단가: input $3/Mtok, output $15/Mtok)
        // ⚠️ 서버 로그만 기록 — 고객 SSE 에 전송 금지 (complete 이벤트에서 빠짐)
        if (res.usage) {
          const costInput = (res.usage.input_tokens / 1_000_000) * 3;
          const costOutput = (res.usage.output_tokens / 1_000_000) * 15;
          const costTotal = costInput + costOutput;
          totalCostUsd += costTotal;
          this.logger.log(
            `[cost] session=${sessionId.slice(0, 8)} iter=${iter} ` +
              `in=${res.usage.input_tokens}tok out=${res.usage.output_tokens}tok ` +
              `$${costTotal.toFixed(6)} (session_total=$${totalCostUsd.toFixed(6)})`,
          );
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

      // ⚠️ totalCostUsd 는 complete 이벤트에 포함 X — 고객에게 비용 노출 금지
      // 서버 로그(아래 logger.log + iter별 [cost] 로그)에만 기록
      // userId/email 포함 → 어드민에서 누가 얼마 썼는지 집계 가능
      let ownerEmail: string | undefined;
      if (userId && userId !== 'anon') {
        const u = await this.prisma.user
          .findUnique({ where: { id: String(userId) }, select: { email: true } })
          .catch(() => null);
        ownerEmail = u?.email;
      }
      this.logger.log(
        `[cost] session=${sessionId.slice(0, 8)} END ` +
          `userId=${userId ?? 'anon'} ` +
          `email="${ownerEmail ?? ''}" ` +
          `projectId=${finalProjectId ?? 'none'} ` +
          `name="${persistResult.ok ? persistResult.projectName : projectName ?? ''}" ` +
          `iter=${iter} total=$${totalCostUsd.toFixed(6)} durationMs=${Date.now() - start} ` +
          `isEdit=${!!editingProjectId} fileCount=${persistResult.ok ? persistResult.fileCount ?? 0 : 0}`,
      );

      // 대화 이력 저장 — 다음 세션에서 "그것도 고쳐줘" 같은 참조형 대화 유지
      // 전체 sanitize 먼저 (짝 검증) → cycle 단위로 앞에서부터 제거
      //   cycle = "일반 user text + 그 이후 tool_use/result 사이클 전체"
      //   이렇게 해야 truncate 결과도 항상 "일반 user 로 시작" 보장
      if (finalProjectId) {
        try {
          const MAX_CYCLES_BYTES = 30_000; // 30KB
          const MAX_BACKOFF = 50; // 안전 루프 제한

          const isPlainUser = (m: Anthropic.Messages.MessageParam): boolean => {
            if (m.role !== 'user') return false;
            if (typeof m.content === 'string') return true;
            if (!Array.isArray(m.content)) return false;
            return !m.content.some((b: any) => b?.type === 'tool_result');
          };

          let tail = this.sanitizeMessageHistory(messages);
          let serialized = JSON.stringify(tail);
          let loops = 0;
          while (serialized.length > MAX_CYCLES_BYTES && tail.length > 1 && loops++ < MAX_BACKOFF) {
            // 첫 cycle 끝 찾기 — index 1 부터 다음 plain user 까지
            let nextCycle = 1;
            while (nextCycle < tail.length && !isPlainUser(tail[nextCycle])) {
              nextCycle++;
            }
            if (nextCycle >= tail.length) break; // 더 자를 cycle 없음
            tail = tail.slice(nextCycle);
            serialized = JSON.stringify(tail);
          }

          await this.prisma.project.update({
            where: { id: finalProjectId },
            data: { agentMessages: tail as any },
          });
          this.logger.log(
            `[agent-history] ${finalProjectId} → ${tail.length}턴 저장 (${serialized.length}B, messages 원본 ${messages.length}턴)`,
          );
        } catch (err: any) {
          this.logger.warn(`[agent-history] 저장 실패 (무시): ${err?.message}`);
        }
      }

      onEvent({
        type: 'complete',
        totalIterations: iter,
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
