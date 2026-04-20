import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { query } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

// Claude Code native binary 자동 감지
// Anthropic SDK 내부 감지가 Ubuntu(glibc) 서버를 musl 로 오판하는 버그 회피
// 2026-04-20 파운더리 서버 실측: SDK 가 linux-x64-musl 선택 → binary 없음
//                                  실제로는 linux-x64/claude (236MB, glibc) 에 존재
// require.resolve 로 각 optional deps 의 package.json 찾아 첫 번째 존재 binary 사용
function resolveClaudeBinary(log: (msg: string) => void): string | undefined {
  const candidates = [
    '@anthropic-ai/claude-agent-sdk-linux-x64/package.json',
    '@anthropic-ai/claude-agent-sdk-linux-arm64/package.json',
    '@anthropic-ai/claude-agent-sdk-linux-x64-musl/package.json',
    '@anthropic-ai/claude-agent-sdk-linux-arm64-musl/package.json',
    '@anthropic-ai/claude-agent-sdk-darwin-arm64/package.json',
    '@anthropic-ai/claude-agent-sdk-darwin-x64/package.json',
  ];
  for (const pkg of candidates) {
    try {
      const pkgJsonPath = require.resolve(pkg);
      const binPath = path.join(path.dirname(pkgJsonPath), 'claude');
      if (fsSync.existsSync(binPath)) {
        log(`[sdk] claude binary 자동 감지: ${binPath}`);
        return binPath;
      }
    } catch {
      /* 이 플랫폼 아님 — 다음 후보 */
    }
  }
  log('[sdk] claude binary 후보 전부 탐색 실패 — SDK 내부 감지에 맡김');
  return undefined;
}
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';
import { ProjectPersistenceService } from './project-persistence.service';
import { AgentDeployService } from './agent-deploy.service';
import { SessionStoreService } from './session-store.service';
import { AnswerParserService } from './answer-parser.service';
import { EventTranslatorService } from './event-translator.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MemoryService } from '../ai/memory.service';
import { PrismaService } from '../prisma.service';
import {
  AgentStreamEvent,
  AGENT_MAX_ITERATIONS,
} from './stream-event.types';
import { adaptSDKMessage } from './sdk-message-adapter';
import { createFoundryMcpServer, FOUNDRY_MCP_TOOL_NAMES } from './sdk-tools';

// Day 1 범위: 최소 SDK Agent 루프 POC
//   - query() 호출 + async iterator → SSE 이벤트 변환
//   - 빌트인 도구만 사용 (Read/Write/Edit/Bash/Glob/Grep)
//   - systemPrompt.preset + excludeDynamicSections 로 캐시 공유 극대화
//   - 기존 memoryService / Supabase / deploy / AskUser 는 Day 2~3 에서 연결
//   - feature flag: AGENT_SDK_ENABLED=true 시에만 controller 가 이쪽 라우팅

const MODEL = 'claude-sonnet-4-6';

export type AgentSdkInput = {
  userId: string | number;
  prompt: string;
  projectId?: string;                       // Day 4 에서 resume 기반 재구성 (Day 1 은 무시)
  onEvent: (event: AgentStreamEvent) => void;
};

@Injectable()
export class AgentBuilderSdkService {
  private readonly logger = new Logger(AgentBuilderSdkService.name);

  constructor(
    private readonly sandbox: SandboxService,
    private readonly promptLoader: PromptLoaderService,
    private readonly persistence: ProjectPersistenceService,
    private readonly agentDeploy: AgentDeployService,
    private readonly supabase: SupabaseService,
    private readonly sessionStore: SessionStoreService,
    private readonly answerParser: AnswerParserService,
    private readonly translator: EventTranslatorService,
    @Inject(forwardRef(() => MemoryService))
    private readonly memory: MemoryService,
    private readonly prisma: PrismaService,
  ) {}

  // 이슈 #4 (Day 6): 기존 수제 루프의 calcProgress 와 동일. stage → percent 추정치.
  //   tool_use 마다 foundry_progress 에 percent 넣어서 프론트 프로그레스 바 업데이트.
  private static readonly STAGE_PERCENT: Record<string, number> = {
    intent: 10,
    setup: 25,
    design: 40,
    pages: 60,
    verify: 80,
    database: 90,
    deploy: 95,
  };

  async runWithSDK(input: AgentSdkInput): Promise<void> {
    const { userId, prompt, onEvent } = input;
    const start = Date.now();
    const editingProjectId = input.projectId;
    const hasUser = !!userId && userId !== 'anon';

    // 1. 샌드박스 세션 (기존 SandboxService 재사용)
    const { sessionId, cwd } = await this.sandbox.createSession(userId);

    // Day 6 hotfix — projectId 확정 (신규는 startProject, 수정은 input 그대로)
    //   이게 없으면 MCP tool ctx.projectId=undefined → provision_supabase /
    //   deploy_to_subdomain 도구들이 "projectId 없음" 으로 실패 → Agent 가
    //   수동 가이드로 fallback. 기존 agent-builder.service.ts 의 패턴 이식.
    let projectId: string | undefined = editingProjectId;
    let projectName = '';
    let subdomain: string | undefined;
    if (!editingProjectId && hasUser) {
      const startResult = await this.persistence.startProject(
        String(userId),
        prompt,
      );
      if (startResult.ok) {
        projectId = startResult.projectId;
        projectName = startResult.projectName;
        subdomain = startResult.subdomain;
        this.logger.log(
          `[agent-sdk] project draft ${projectId} (name=${projectName})`,
        );
      }
    }

    // 1-bis. 수정 모드: 기존 프로젝트의 generatedCode 를 sandbox 로 복원
    //   + 이전 SDK 세션 UUID (resume 후보) 조회
    //   + memoryService 로 프로젝트/사용자 컨텍스트 조립
    let resumeSessionId: string | undefined;
    let memoryContext = '';
    if (editingProjectId && hasUser) {
      try {
        const existing = await this.prisma.project.findFirst({
          where: { id: editingProjectId, userId: String(userId) },
          select: { id: true, name: true, generatedCode: true, agentSessionId: true },
        });
        if (existing) {
          projectName = existing.name ?? '';
          if (existing.agentSessionId) {
            resumeSessionId = existing.agentSessionId;
            this.logger.log(`[restore] ${editingProjectId} → SDK resume=${resumeSessionId.slice(0, 8)}`);
          }
          if (existing.generatedCode) {
            const files = existing.generatedCode as unknown as Array<{ path: string; content: string }>;
            const safeName = (existing.name || 'app').replace(/[^a-zA-Z0-9_\-가-힣]/g, '_').slice(0, 40) || 'app';
            const projectDir = path.join(cwd, safeName);
            await fs.mkdir(projectDir, { recursive: true });
            for (const file of files) {
              if (!file?.path || typeof file.content !== 'string') continue;
              const full = path.join(projectDir, file.path);
              await fs.mkdir(path.dirname(full), { recursive: true });
              await fs.writeFile(full, file.content, 'utf8');
            }
            this.logger.log(`[restore] ${editingProjectId} → ${files.length} files 복원 (${projectDir})`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`[restore] 실패 (무시): ${err?.message}`);
      }

      // memoryService: 프로젝트 요약 + 선호 + 수정 이력 → systemPrompt append 에 주입
      try {
        memoryContext = await this.memory.buildContextPrompt(editingProjectId, String(userId));
        if (memoryContext) {
          this.logger.log(`[memory] ${editingProjectId} context=${memoryContext.length}chars 주입`);
        }
      } catch (err: any) {
        this.logger.warn(`[memory] buildContextPrompt 실패 (무시): ${err?.message}`);
      }
    }

    // 2. 파운더리 고유 system prompt (agent-core + intent + vague + selection)
    //    SDK 기본 Claude Code preset 뒤에 append 하여 두 가지 모두 활용
    //    + memoryContext (수정 모드에서만 보강)
    const foundrySystemPrompt = await this.promptLoader.getSystemPrompt();
    const systemAppend = memoryContext
      ? `${foundrySystemPrompt}\n\n${memoryContext}`
      : foundrySystemPrompt;

    // 3. adapter 컨텍스트
    const sessionIdRef = { value: sessionId };
    const iterRef = { value: 0 };
    const totalCostRef = { value: 0 };
    const sdkSessionIdRef: { value: string | null } = { value: null };  // SDK 실제 UUID
    const cacheReadRef = { value: 0 };   // Day 5: 세션 전체 누적 cache_read
    const cacheCreateRef = { value: 0 }; // Day 5: 세션 전체 누적 cache_creation

    // SDK 의 system.init 가 실제 UUID 를 주기 전까지 sandbox sessionId 로 대체
    onEvent({ type: 'start', sessionId, cwd });

    // 파운더리 커스텀 도구 4개를 MCP SDK server 로 묶음 (세션별 context)
    const foundryMcp = createFoundryMcpServer(
      {
        sandbox: this.sandbox,
        supabase: this.supabase,
        agentDeploy: this.agentDeploy,
        persistence: this.persistence,
        prisma: this.prisma,
        sessionStore: this.sessionStore,
        answerParser: this.answerParser,
      },
      {
        userId: String(userId),
        projectId,   // Day 6 hotfix: startProject 로 확정된 projectId 전달
                     //   → MCP tool handler 가 provision_supabase / deploy_to_subdomain
                     //     호출 시 AgentToolExecutor.deps.projectId 채워짐
        userPrompt: prompt,
        cwd,
        sandboxSessionId: sessionId,
        onEvent,
      },
    );

    const claudeBinaryPath = resolveClaudeBinary((msg) => this.logger.log(msg));

    try {
      const q = query({
        prompt,
        options: {
          model: MODEL,
          cwd,
          maxTurns: AGENT_MAX_ITERATIONS,
          ...(claudeBinaryPath ? { pathToClaudeCodeExecutable: claudeBinaryPath } : {}),
          // Node process.env 를 child (claude binary) 에 명시적 전달
          // - PM2 환경에서 SDK 기본 env 상속이 ANTHROPIC_API_KEY 를 누락하는 현상 해결
          //   (2026-04-20 실측: pm2 /proc/PID/environ 에는 키 없지만 runtime process.env 에는 있음)
          // - 명시적 전달로 확실하게 API 키 + .env 전체 상속
          env: process.env as Record<string, string | undefined>,
          allowedTools: [
            'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
            ...FOUNDRY_MCP_TOOL_NAMES,
          ],
          mcpServers: { foundry: foundryMcp },
          // permissionMode: 'dontAsk' — root 환경 대응 + allowedTools 화이트리스트 강제
          //   ① root/sudo 환경은 bypassPermissions 거부 (GitHub Issue #9184, 공식 보안 설계)
          //   ② bypassPermissions 는 allowedTools 를 무시함 (Issue #12232) — 의도한
          //      화이트리스트 제한이 원래부터 무효였음
          //   ③ dontAsk: allowedTools 에 pre-approved 안 되면 거부, canUseTool 호출 없음
          //   → 위 3개 allowedTools 에 필요 도구(Read/Write/Edit/Bash/Glob/Grep + MCP 4개)
          //     전부 등록돼 있으므로 기능적 동등 + 보안 강화 보너스
          permissionMode: 'dontAsk',
          // 수정 모드: 이전 SDK 세션 UUID 로 이어받기 (대화 이력 자동 복원)
          //   → V2 5번 디버깅한 agentMessages sanitize/cycle-truncate 전체 대체
          ...(resumeSessionId ? { resume: resumeSessionId } : {}),
          systemPrompt: {
            type: 'preset',
            preset: 'claude_code',
            append: systemAppend,
            // cwd/git/date/memory 를 system → first user 로 이동 → 크로스 세션 캐시 공유
            excludeDynamicSections: true,
          },
          settingSources: [],  // 파운더리는 자체 프롬프트 체계 → 프로젝트 CLAUDE.md 간섭 방지
        },
      });

      for await (const sdkMsg of q) {
        // SDK 실제 UUID 를 system.init 에서 캡처 → agentSessionId 저장에 사용
        if (
          (sdkMsg as any).type === 'system' &&
          (sdkMsg as any).subtype === 'init' &&
          typeof (sdkMsg as any).session_id === 'string'
        ) {
          sdkSessionIdRef.value = (sdkMsg as any).session_id;
        }

        const evs = adaptSDKMessage(sdkMsg, {
          start,
          sessionIdRef,
          iterRef,
          totalCostRef,
          cacheReadRef,
          cacheCreateRef,
          onCostLog: (line) => this.logger.log(line),
          // 이슈 #4: tool_use → foundry_progress 변환 연결
          translate: (name, input) => this.translator.translate(name, input),
          stagePercent: AgentBuilderSdkService.STAGE_PERCENT,
        });
        for (const ev of evs) {
          // Day 1 은 start 를 sandbox sessionId 로 이미 방출했으므로 SDK 의 start 는 스킵
          if (ev.type === 'start') continue;
          // Day 6 hotfix: complete 이벤트는 service 가 persist 후 풀 페이로드로 방출
          if (ev.type === 'complete') continue;
          onEvent(ev);
        }
      }

      // ── Day 6 hotfix: 세션 종료 직후 persistence — sandbox → DB 저장 ──
      //   deploy_to_subdomain 도구가 이미 호출됐다면 generatedCode 중복 저장이지만
      //   같은 내용이므로 무해. 도구 안 쓴 경우 여기서만 DB 반영.
      //
      //   Day 6 bugfix 2: 조건은 editingProjectId 가 아니라 projectId (startProject 결과
      //   포함) 으로 분기해야 함. 이전 버전은 신규 세션에서 persist() 가 startProject
      //   가 만든 draft 를 무시하고 새 projectId + 새 subdomain 을 또 생성 →
      //   deploy 는 A 에 하고 DB 는 B 에 저장되는 불일치 유발.
      let persistedFileCount: number | undefined;
      if (projectId && hasUser) {
        try {
          // startProject 로 확보한 projectId 가 있으면 무조건 finishProject(projectId)
          // persist() 는 startProject 없이 시작한 경우 전용 (현재 경로엔 도달 안 함)
          const persistResult = await this.persistence.finishProject({
            userId: String(userId),
            cwd,
            userPrompt: prompt,
            projectId,
          });
          if (persistResult.ok) {
            persistedFileCount = persistResult.fileCount;
            // 신규 persist() 가 새 projectId 만들어낸 경우 갱신
            if (!editingProjectId && persistResult.projectId && persistResult.projectId !== projectId) {
              projectId = persistResult.projectId;
            }
            if (persistResult.projectName) projectName = persistResult.projectName;
            if (persistResult.subdomain) subdomain = persistResult.subdomain;
            this.logger.log(
              `[persist] ${projectId} files=${persistResult.fileCount} name="${projectName}"`,
            );
          } else {
            this.logger.warn(`[persist] 실패: ${persistResult.reason ?? 'unknown'}`);
          }
        } catch (err: any) {
          this.logger.warn(`[persist] 예외: ${err?.message}`);
        }
      }

      // ── Day 4: 메모리 + SDK session UUID 저장 (projectId 확보된 이후 실행) ──
      //   신규/수정 모두 projectId 있으면 기록 (V2 는 editing 만 했지만 Z안은 양쪽)
      if (projectId && hasUser) {
        if (sdkSessionIdRef.value) {
          const newSid = sdkSessionIdRef.value;
          this.prisma.project
            .update({ where: { id: projectId }, data: { agentSessionId: newSid } })
            .then(() => this.logger.log(`[memory] ${projectId} agentSessionId=${newSid.slice(0, 8)} 저장`))
            .catch((err: any) =>
              this.logger.warn(`[memory] agentSessionId 저장 실패: ${err?.message}`),
            );
        }

        const summarySeed = [
          { role: 'user', content: prompt },
          { role: 'assistant', content: '(SDK 세션 완료 — 상세는 resume 복원)' },
        ];
        this.memory.summarizeAndSave(projectId, summarySeed).catch(() => {});
        this.memory.detectPreferences(projectId, String(userId), prompt).catch(() => {});
      }

      // ── Day 6 hotfix: complete 이벤트 풀 페이로드 방출 ──
      //   deployedUrl 조회 (deploy_to_subdomain 도구가 세션 중 호출됐다면 set 됨)
      let previewUrl: string | undefined;
      if (projectId) {
        try {
          const p = await this.prisma.project
            .findUnique({ where: { id: projectId }, select: { deployedUrl: true } })
            .catch(() => null);
          previewUrl = p?.deployedUrl ?? undefined;
        } catch {
          /* 무시 */
        }
      }
      onEvent({
        type: 'complete',
        totalIterations: iterRef.value,
        durationMs: Date.now() - start,
        projectId,
        projectName: projectName || undefined,
        subdomain,
        fileCount: persistedFileCount,
        previewUrl,
      });

      // 세션 전체 [cost] END — admin.service.ts:getAgentCostLogs 파싱 포맷 100% 호환
      // 기존 필드(email/name/isEdit/fileCount) 유지 + SDK 전용 필드(via/cache_*) 끝에 추가
      let ownerEmail = '';
      if (hasUser) {
        try {
          const u = await this.prisma.user
            .findUnique({ where: { id: String(userId) }, select: { email: true } })
            .catch(() => null);
          ownerEmail = u?.email ?? '';
        } catch {
          /* 무시 */
        }
      }
      const cacheRead = cacheReadRef.value;
      const cacheCreate = cacheCreateRef.value;
      const cacheTotal = cacheRead + cacheCreate;
      // hit ratio = read / (read + create)  (create 도 input 으로 집계되지만 결제됨)
      const hitRatio = cacheTotal > 0 ? (cacheRead / cacheTotal) * 100 : 0;
      this.logger.log(
        `[cost] session=${sessionIdRef.value.slice(0, 8)} END ` +
          `userId=${userId ?? 'anon'} ` +
          `email="${ownerEmail}" ` +
          `projectId=${projectId ?? 'none'} ` +
          `name="${projectName}" ` +
          `iter=${iterRef.value} total=$${totalCostRef.value.toFixed(6)} ` +
          `durationMs=${Date.now() - start} ` +
          `isEdit=${!!editingProjectId} ` +
          `fileCount=${persistedFileCount ?? 0} ` +
          `via=SDK ` +
          `cache_read=${cacheRead} cache_create=${cacheCreate} hit_ratio=${hitRatio.toFixed(1)}%`,
      );
    } catch (err: any) {
      this.logger.error(`[agent-sdk] 실패: ${err?.message}`, err?.stack);
      onEvent({
        type: 'error',
        message: err?.message ?? String(err),
        where: 'runWithSDK',
      });
    } finally {
      // AskUser 대기 중인 pending 을 정리 (세션 종료 시 Promise leak 방지)
      this.sessionStore.cancelSession(sessionId, 'runWithSDK 종료');

      // Day 6 hotfix: 쓰레기 draft 자동 정리 (기존 agent-builder.service.ts 와 동일 로직)
      //   상의 모드로 파일 한 개도 안 만들고 끝난 경우 startProject 로 만든 draft 삭제
      //   → 사용자 "내 프로젝트" 에 빈 draft 노출 방지
      if (projectId && !editingProjectId) {
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
              await this.prisma.project
                .delete({ where: { id: projectId } })
                .catch(() => {});
              this.logger.log(
                `[cleanup-draft] ${projectId} 자동 삭제 (빈 draft: "${p.name}")`,
              );
            }
          }
        } catch {
          /* 정리 실패는 무시 — 메인 흐름 영향 없음 */
        }
      }
    }
  }
}
