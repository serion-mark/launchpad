import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { query, getSessionMessages } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

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
import {
  CreditService,
  CREDIT_COSTS,
  classifyModifyCost,
} from '../credit/credit.service';
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
  customSubdomain?: string;                  // Phase 0 (2026-04-22): 사용자 지정 서브도메인
                                             //   (사전 확인 모달에서 중복 확인 통과한 값)
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
    private readonly creditService: CreditService,
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

    // ── Phase 0 (2026-04-22): 크레딧 사전 차감 ────────────────
    //   기존 /builder (수제 루프) 와 동일 정책 — 세션 시작 직전 1회 차감, 환불 없음.
    //     - 비로그인(anon): 차감 없이 계속 (기존 정책 준수)
    //     - 신규 세션 + freeTrialUsed=false → free_trial (0cr, 1회)
    //     - 신규 세션 + freeTrialUsed=true  → app_generate (6,800cr)
    //     - 수정 세션 → classifyModifyCost(prompt) → simple 500 / normal 1000 / complex 1500
    //   잔액 부족 시 ForbiddenException 발생 → controller catch → HTTP 402
    let creditsDeducted = 0;
    let creditAction: string = 'none';
    if (hasUser) {
      try {
        const balance = await this.creditService.getBalance(String(userId));
        if (!editingProjectId) {
          // 신규 세션
          if (!balance.freeTrialUsed) {
            await this.creditService.deduct(String(userId), {
              action: 'free_trial',
              projectId: editingProjectId,
              taskType: 'agent_generate',
              modelTier: 'sdk',
              description: `Agent Mode 앱 생성 (맛보기 무료 1회) — ${prompt.slice(0, 50)}`,
            });
            creditAction = 'free_trial';
            creditsDeducted = 0;
          } else {
            await this.creditService.deduct(String(userId), {
              action: 'app_generate',
              projectId: editingProjectId,
              taskType: 'agent_generate',
              modelTier: 'sdk',
              description: `Agent Mode 앱 생성 — ${prompt.slice(0, 50)}`,
            });
            creditAction = 'app_generate';
            creditsDeducted = CREDIT_COSTS.app_generate;
          }
        } else {
          // 수정 세션 — 복잡도 분류
          const cost = classifyModifyCost(prompt);
          const action =
            cost === CREDIT_COSTS.ai_modify_complex
              ? 'ai_modify_complex'
              : cost === CREDIT_COSTS.ai_modify_normal
                ? 'ai_modify_normal'
                : 'ai_modify_simple';
          await this.creditService.deduct(String(userId), {
            action: action as any,
            projectId: editingProjectId,
            taskType: 'agent_modify',
            modelTier: 'sdk',
            description: `Agent Mode 수정 (${action}) — ${prompt.slice(0, 50)}`,
          });
          creditAction = action;
          creditsDeducted = cost;
        }
        this.logger.log(
          `[credit] userId=${userId} action=${creditAction} deducted=${creditsDeducted}cr`,
        );
      } catch (err: any) {
        // 잔액 부족 등 과금 실패는 전체 중단
        const code = err?.response?.code ?? err?.code;
        if (code === 'INSUFFICIENT_CREDITS') {
          this.logger.warn(
            `[credit] 잔액 부족 — userId=${userId} required=${err?.response?.required} current=${err?.response?.current}`,
          );
        }
        // ForbiddenException 그대로 throw → controller 가 402/403 처리
        throw err;
      }
    }

    // ── Phase 1: projectId 먼저 확정 (sandbox cwd 를 projectId 기반으로 고정하기 위해) ──
    //   (기존 구조의 문제: sandbox.createSession 이 UUID cwd 를 매번 만들어 SDK
    //    session 저장소 경로(`~/.claude/projects/<cwd-slug>/*.jsonl`) 가
    //    세션마다 달라져 resume 불가능. → 같은 projectId 로 여러 세션 진입 시
    //    같은 cwd 를 재사용하여 jsonl 이 한 디렉토리에 누적되게 함.)
    let projectId: string | undefined = editingProjectId;
    let projectName = '';
    let subdomain: string | undefined;
    if (!editingProjectId && hasUser) {
      const startResult = await this.persistence.startProject(
        String(userId),
        prompt,
        input.customSubdomain,  // Phase 0: 사용자 지정 서브도메인
      );
      if (startResult.ok) {
        projectId = startResult.projectId;
        projectName = startResult.projectName;
        subdomain = startResult.subdomain;
        this.logger.log(
          `[agent-sdk] project draft ${projectId} (name=${projectName}, subdomain=${subdomain ?? 'auto'})`,
        );
      }
    }

    // ── Phase 2: 샌드박스 세션 생성 (projectId 있으면 고정 cwd) ──
    const { sessionId, cwd } = await this.sandbox.createSession(userId, { projectId });

    // ── Phase 3: 수정 모드 — 이전 프로젝트 DB 정보 로드 + sandbox cwd 청소 + 복원 + memoryContext ──
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
            this.logger.log(`[restore] ${editingProjectId} → SDK resume 후보=${resumeSessionId.slice(0, 8)}`);
          }
          if (existing.generatedCode) {
            // project-<id> cwd 는 이전 세션 잔재가 남아있을 수 있음.
            // 안전을 위해 cwd 내부를 한 번 비우고 DB 의 최신 generatedCode 로 복원.
            // (cwd 자체는 삭제하지 않음 — SandboxService 가 mkdir 후 반환한 디렉토리 유지)
            try {
              const entries = await fs.readdir(cwd);
              for (const entry of entries) {
                await fs.rm(path.join(cwd, entry), { recursive: true, force: true });
              }
            } catch (cleanErr: any) {
              this.logger.warn(`[restore] cwd 청소 일부 실패 (무시): ${cleanErr?.message}`);
            }

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

    // ── Phase 4: Resume 3단계 방어선 ──────────────────────────────────
    //   Layer 1 (Primary): resumeSessionId 있으면 query() 에 resume 옵션 전달.
    //     SDK 가 `~/.claude/projects/<cwd-slug>/<sessionId>.jsonl` 에서 로드.
    //   Layer 2 (Pre-check): jsonl 파일 실존 확인 → 없으면 resume 옵션 생략하고
    //     Layer 3 으로 위임 (불필요한 SDK 내부 실패 방지 + 로그 노이즈 감소).
    //   Layer 3 (Official Fallback): getSessionMessages(sessionId) 로 공식 API
    //     사용 — dir 생략 시 전체 projects 디렉토리 스캔 → 과거 cwd 에 있던
    //     jsonl 도 찾음. 메시지 배열을 텍스트로 요약해 systemPrompt.append 에 주입.
    //     (resume 옵션은 쓰지 않고 새 세션으로 시작하되 이전 맥락을 prompt 에 태움)
    let finalResumeSessionId: string | undefined = undefined;
    let resumeFallbackText = '';
    if (resumeSessionId) {
      // Layer 2: 새 cwd slug 기준 jsonl 존재 체크
      const cwdSlug = cwd.replace(/\//g, '-');
      const expectedJsonl = path.join(
        os.homedir(),
        '.claude',
        'projects',
        cwdSlug,
        `${resumeSessionId}.jsonl`,
      );
      if (fsSync.existsSync(expectedJsonl)) {
        finalResumeSessionId = resumeSessionId;
        this.logger.log(`[restore] resume jsonl 발견 → SDK resume 사용 (${resumeSessionId.slice(0, 8)})`);
      } else {
        this.logger.log(`[restore] resume jsonl 없음 (${expectedJsonl}) → Layer 3 fallback 시도`);
        // Layer 3: 공식 API 로 과거 메시지 로드 (dir 생략 → 전체 스캔)
        try {
          const priorMessages = await getSessionMessages(resumeSessionId);
          if (priorMessages && priorMessages.length > 0) {
            // user/assistant text 추출 → 간결한 대화 이력으로 포맷
            const lines: string[] = [];
            for (const m of priorMessages as any[]) {
              const role = m?.message?.role ?? m?.type ?? '';
              const content = m?.message?.content;
              let text = '';
              if (typeof content === 'string') {
                text = content;
              } else if (Array.isArray(content)) {
                text = content
                  .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
                  .map((b: any) => b.text)
                  .join('\n');
              }
              if (text.trim()) {
                lines.push(`[${role}] ${text.slice(0, 500)}`); // 한 턴당 500자 제한
              }
            }
            if (lines.length > 0) {
              // 너무 길면 앞부분 요약 + 최근 몇 턴만 (SDK 가 캐싱할 수 있도록 고정 형식)
              const joined = lines.join('\n---\n');
              const truncated = joined.length > 30_000
                ? joined.slice(-30_000) // 최근 30K 자 유지
                : joined;
              resumeFallbackText = `\n\n═══ 이전 세션 대화 이력 (${lines.length}턴) ═══\n${truncated}\n═══════════════════════════════════════\n`;
              this.logger.log(
                `[restore] fallback 성공 — 이전 ${lines.length}턴 복원, ${truncated.length} chars 주입`,
              );
            } else {
              this.logger.log(`[restore] fallback — 공식 API 는 세션 찾았으나 내용 없음 (새 세션 시작)`);
            }
          } else {
            this.logger.log(`[restore] fallback — 공식 API 로도 세션 못 찾음 (새 세션 시작)`);
          }
        } catch (err: any) {
          this.logger.warn(`[restore] fallback 실패 (새 세션 시작): ${err?.message}`);
        }
      }
    }

    // ── Phase 5: 파운더리 고유 system prompt 조립 ────────────────────
    //   순서: foundry 핵심 프롬프트 + memoryContext + resumeFallbackText
    //   resumeFallbackText 는 Layer 3 복원 시에만 비어있지 않음
    const foundrySystemPrompt = await this.promptLoader.getSystemPrompt();
    const systemAppend = [foundrySystemPrompt, memoryContext, resumeFallbackText]
      .filter((s) => s && s.trim())
      .join('\n\n');

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
          //   → finalResumeSessionId 는 Phase 4 Pre-check 통과한 경우만 set.
          //     실패 시 resumeFallbackText 가 systemPrompt 에 주입돼 있으므로
          //     resume 옵션 없이 새 세션으로 시작해도 맥락 유지됨.
          ...(finalResumeSessionId ? { resume: finalResumeSessionId } : {}),
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
          `cache_read=${cacheRead} cache_create=${cacheCreate} hit_ratio=${hitRatio.toFixed(1)}% ` +
          `creditAction=${creditAction} creditsDeducted=${creditsDeducted}`,
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
