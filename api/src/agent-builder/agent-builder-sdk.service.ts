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
    @Inject(forwardRef(() => MemoryService))
    private readonly memory: MemoryService,
    private readonly prisma: PrismaService,
  ) {}

  async runWithSDK(input: AgentSdkInput): Promise<void> {
    const { userId, prompt, onEvent } = input;
    const start = Date.now();
    const editingProjectId = input.projectId;
    const hasUser = !!userId && userId !== 'anon';

    // 1. 샌드박스 세션 (기존 SandboxService 재사용)
    const { sessionId, cwd } = await this.sandbox.createSession(userId);

    // 1-bis. 수정 모드: 기존 프로젝트의 generatedCode 를 sandbox 로 복원
    //   + 이전 SDK 세션 UUID (resume 후보) 조회
    //   + memoryService 로 프로젝트/사용자 컨텍스트 조립
    let resumeSessionId: string | undefined;
    let memoryContext = '';
    let projectName = '';
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
        projectId: input.projectId,
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
          allowedTools: [
            'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
            ...FOUNDRY_MCP_TOOL_NAMES,
          ],
          mcpServers: { foundry: foundryMcp },
          permissionMode: 'bypassPermissions',
          // SDK 타입 정의 (sdk.d.ts:L1417) 공식 명시:
          //   Must be set to 'true' when using permissionMode: 'bypassPermissions'
          allowDangerouslySkipPermissions: true,
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
        });
        for (const ev of evs) {
          // Day 1 은 start 를 sandbox sessionId 로 이미 방출했으므로 SDK 의 start 는 스킵
          if (ev.type === 'start') continue;
          onEvent(ev);
        }
      }

      // ── Day 4: 메모리 저장 + SDK 세션 UUID 기록 (세션 종료 후 fire-and-forget) ──
      // editingProjectId 있을 때만 (신규 프로젝트는 Day 5 이후 persistence 이후에 연결)
      if (editingProjectId && hasUser) {
        // (a) SDK session_id 저장 — 다음 세션에서 resume 으로 이어받기
        if (sdkSessionIdRef.value) {
          const newSid = sdkSessionIdRef.value;
          this.prisma.project
            .update({ where: { id: editingProjectId }, data: { agentSessionId: newSid } })
            .then(() => this.logger.log(`[memory] ${editingProjectId} agentSessionId=${newSid.slice(0, 8)} 저장`))
            .catch((err: any) =>
              this.logger.warn(`[memory] agentSessionId 저장 실패: ${err?.message}`),
            );
        }

        // (b) 대화 요약 (Haiku) + 선호 감지 — fire-and-forget (응답 지연 없음)
        //     summarizeAndSave 는 role/content 문자열 쌍 기대 → 단순 wrapper
        const summarySeed = [
          { role: 'user', content: prompt },
          { role: 'assistant', content: '(SDK 세션 완료 — 상세는 resume 복원)' },
        ];
        this.memory.summarizeAndSave(editingProjectId, summarySeed).catch(() => {});
        this.memory.detectPreferences(editingProjectId, String(userId), prompt).catch(() => {});
        // recordModification 은 버전 정보 필요 → Day 5 persist 쪽에서 호출이 적절 (여기선 스킵)
      }

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
          `projectId=${editingProjectId ?? 'none'} ` +
          `name="${projectName}" ` +
          `iter=${iterRef.value} total=$${totalCostRef.value.toFixed(6)} ` +
          `durationMs=${Date.now() - start} ` +
          `isEdit=${!!editingProjectId} ` +
          `fileCount=0 ` +                                    // SDK 경로는 아직 persist 미포함 (Day 2 tool 쪽에서만 저장)
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
    }
  }
}
