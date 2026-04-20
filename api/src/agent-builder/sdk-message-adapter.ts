// SDK 메시지 → AgentStreamEvent 어댑터 (Day 1)
//
// Claude Agent SDK 의 query() async iterator 가 내보내는 SDKMessage 를
// 기존 프론트엔드 SSE 프로토콜(AgentStreamEvent) 로 변환.
//
// 원칙:
//   - 순수 함수로 유지 (NestJS DI 없음, 테스트 용이)
//   - 기존 수제 루프의 이벤트 계약 100% 호환 (프론트엔드 변경 X)
//   - Day 1 범위: start / iteration / assistant_text / tool_call / tool_result / complete / error
//   - Day 2 에서 foundry_progress(translator) 와 card_request(AskUser) 추가 예정

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AgentStreamEvent, FoundryStageId } from './stream-event.types';

// 이슈 #4 (Day 6): foundry_progress 이벤트를 SDK 경로에도 방출하기 위한 translate 콜백.
//   EventTranslatorService.translate() 의 반환 타입을 순수 함수 계약으로 좁힌 것.
//   service 가 this.translator.translate 를 바인딩해서 전달.
export type TranslateToolFn = (
  toolName: string,
  input: unknown,
) => { stage: FoundryStageId; label: string; emoji: string } | null;

export type AdapterContext = {
  start: number;                      // 세션 시작 ms
  sessionIdRef: { value: string };    // adaptSDKMessage 가 세팅
  iterRef: { value: number };         // assistant 메시지마다 ++
  totalCostRef: { value: number };    // result 단계에서 확정 (SDK 가 누적 반환)
  cacheReadRef?: { value: number };   // Day 5: 세션 전체 cache_read_input_tokens 누적
  cacheCreateRef?: { value: number }; // Day 5: 세션 전체 cache_creation_input_tokens 누적
  onCostLog?: (line: string) => void; // [cost] 서버 로그 기록 (optional)
  // 이슈 #4 (Day 6): tool_use → foundry_progress 변환용 콜백
  //   undefined 면 foundry_progress 방출 안 함 (Day 1 호환)
  translate?: TranslateToolFn;
  //   stage 별 percent (calcProgress 결과) — service 가 미리 계산해서 map 으로 전달
  stagePercent?: Record<string, number>;
};

export function adaptSDKMessage(
  msg: SDKMessage,
  ctx: AdapterContext,
): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = [];

  // ── system.init ─────────────────────────────
  if (msg.type === 'system' && (msg as any).subtype === 'init') {
    const sys = msg as any;
    if (sys.session_id) ctx.sessionIdRef.value = sys.session_id;
    events.push({
      type: 'start',
      sessionId: sys.session_id ?? '',
      cwd: sys.cwd ?? '',
    });
    return events;
  }

  // ── system.compact_boundary / api_retry / status / session_state_changed ──
  // Day 1: 모두 감춤 (서버 로그로만 관찰)
  if (msg.type === 'system') return events;

  // ── assistant ────────────────────────────────
  if (msg.type === 'assistant') {
    ctx.iterRef.value += 1;
    const asst = msg as any;
    events.push({ type: 'iteration', n: ctx.iterRef.value });

    const content = asst.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        if (block.type === 'text' && typeof block.text === 'string') {
          events.push({ type: 'assistant_text', text: block.text });
        } else if (block.type === 'tool_use') {
          events.push({
            type: 'tool_call',
            id: String(block.id ?? ''),
            name: String(block.name ?? ''),
            input: block.input,
          });
          // 이슈 #4 (Day 6): tool_use → foundry_progress 방출
          //   기존 수제 루프 (agent-builder.service.ts:407~417) 와 동일 로직
          //   → 프론트 단계 UI (의도/셋업/디자인/페이지/빌드/DB/배포) 가 하이라이트됨
          if (ctx.translate) {
            const translated = ctx.translate(String(block.name ?? ''), block.input);
            if (translated) {
              events.push({
                type: 'foundry_progress',
                stage: translated.stage,
                label: translated.label,
                emoji: translated.emoji,
                percent: ctx.stagePercent?.[translated.stage] ?? 50,
                elapsedMs: Date.now() - ctx.start,
              });
            }
          }
        }
      }
    }
    return events;
  }

  // ── user (tool_result 포함) ──────────────────
  if (msg.type === 'user') {
    const usr = msg as any;
    const content = usr.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        if (block.type === 'tool_result') {
          // tool_result.content 는 string 또는 [{type:'text', text}] 배열
          let output = '';
          if (typeof block.content === 'string') output = block.content;
          else if (Array.isArray(block.content)) {
            output = block.content
              .map((c: any) => (typeof c?.text === 'string' ? c.text : ''))
              .join('');
          }
          events.push({
            type: 'tool_result',
            id: String(block.tool_use_id ?? ''),
            ok: !block.is_error,
            output: output.slice(0, 10_000), // 과도한 출력 방어
            durationMs: 0, // SDK 는 duration 제공 안 함
          });
        }
      }
    }
    return events;
  }

  // ── result (final) ───────────────────────────
  if (msg.type === 'result') {
    const res = msg as any;
    if (typeof res.total_cost_usd === 'number') {
      ctx.totalCostRef.value = res.total_cost_usd;
    }

    // Day 5: SDK result 에는 세션 전체 usage 가 들어 있으므로 그 값을 최종값으로 설정
    const u = res.usage ?? {};
    if (ctx.cacheReadRef) ctx.cacheReadRef.value = u.cache_read_input_tokens ?? 0;
    if (ctx.cacheCreateRef) ctx.cacheCreateRef.value = u.cache_creation_input_tokens ?? 0;

    // [cost] 로그 — iter 중간 관찰용 (END 는 service 가 별도 방출)
    if (ctx.onCostLog) {
      ctx.onCostLog(
        `[cost] session=${ctx.sessionIdRef.value.slice(0, 8)} ` +
          `SDK_RESULT iter=${res.num_turns ?? ctx.iterRef.value} ` +
          `in=${u.input_tokens ?? 0}tok out=${u.output_tokens ?? 0}tok ` +
          `cache_read=${u.cache_read_input_tokens ?? 0} cache_create=${u.cache_creation_input_tokens ?? 0} ` +
          `$${Number(res.total_cost_usd ?? 0).toFixed(6)} ` +
          `duration=${res.duration_ms ?? 0}ms subtype=${res.subtype ?? 'unknown'}`,
      );
    }

    if (res.subtype === 'success') {
      events.push({
        type: 'complete',
        totalIterations: res.num_turns ?? ctx.iterRef.value,
        durationMs: Date.now() - ctx.start,
      });
    } else {
      // error_max_turns / error_during_execution / error_max_budget_usd / error_max_structured_output_retries
      const errList: string[] = Array.isArray(res.errors) ? res.errors : [];
      events.push({
        type: 'error',
        message: `[SDK ${res.subtype}] ${errList.join('; ') || '세션 실패'}`,
        where: `iter ${res.num_turns ?? ctx.iterRef.value}`,
      });
    }
    return events;
  }

  // ── stream_event / partial_assistant / rate_limit_event / hook_* ──
  // Day 1: 감춤 (includePartialMessages:false 기본값이라 거의 안 오지만 방어)
  return events;
}

/**
 * 편의: 여러 SDKMessage 를 순차 변환 (Day 1 E2E 검증용).
 * 실제 서비스에서는 adaptSDKMessage 를 async iterator 루프에서 직접 호출.
 */
export function adaptAll(
  messages: SDKMessage[],
  ctx: AdapterContext,
): AgentStreamEvent[] {
  const out: AgentStreamEvent[] = [];
  for (const m of messages) out.push(...adaptSDKMessage(m, ctx));
  return out;
}
