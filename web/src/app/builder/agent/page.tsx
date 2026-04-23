'use client';

// /builder/agent — Agent Mode 메인 페이지
// 기존 /builder와 격리된 신규 라우트
// ?projectId=xxx 쿼리 파라미터가 있으면 "수정 모드"로 진입 (기존 프로젝트 이어서 작업)

import Link from 'next/link';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { authFetch, getUser } from '@/lib/api';
import { useAgentStream } from './useAgentStream';
import AgentChat from './components/AgentChat';
import FoundryPreviewPane from './components/FoundryPreviewPane';
import AgentCreditConfirmModal, { type SpecBundle } from './components/AgentCreditConfirmModal';

// Phase E (2026-04-22): Sonnet 요약 결과(spec+strategy) 를 Agent system prompt append 용 문자열로 변환
//   Agent 가 즉시 작업 시작할 수 있도록 핵심 정보를 구조화해서 전달.
function buildWrappedFromSpec(bundle: SpecBundle): string {
  const { spec, strategy, sourceType, raw } = bundle;
  if (!spec) return buildWrappedFromRaw(raw, sourceType);

  const features = spec.coreFeatures.map((f, i) => `  ${i + 1}. ${f}`).join('\n');
  const include = strategy?.mvpScope?.include?.join(', ') ?? '';
  const exclude = strategy?.mvpScope?.exclude?.join(', ') ?? '';
  const benchmarks = strategy?.benchmarks?.join(', ') ?? '';

  return [
    `[${sourceType === 'meeting' ? 'AI 회의실 정리본' : '사용자 요청'} — 포비 작업 지시]`,
    '',
    '## 📝 앱 스펙 (primary — 이대로 만들어야 할 것)',
    `- 이름: ${spec.appName}`,
    spec.tagline ? `- 한 줄: ${spec.tagline}` : '',
    '- 핵심 기능:',
    features,
    `- 디자인 톤: ${spec.designTone}`,
    spec.techHints?.supabase ? '- Supabase 연결 필요' : '',
    spec.techHints?.requiresApiKey ? `- 외부 API 키 필요: ${spec.techHints.requiresApiKey}` : '',
    '',
    strategy ? '## 📊 전략 컨텍스트 (secondary — 설계 방향 참고)' : '',
    strategy?.targetUser ? `- 타겟: ${strategy.targetUser}` : '',
    strategy?.differentiator ? `- 차별화: ${strategy.differentiator}` : '',
    include ? `- MVP 포함: ${include}` : '',
    exclude ? `- 제외 (V2 이후): ${exclude}` : '',
    benchmarks ? `- 참고: ${benchmarks}` : '',
    '',
    '## 룰 (중요)',
    '- 위 스펙 기반으로 즉시 작업 시작. AskUser 도구 사용 금지 (모든 정보 여기 있음).',
    '- 부족한 정보는 합리적 기본값 (agent-core.md 11번 룰).',
    '- 완료 후 ✅ 완성 메시지 + 번호 제안 포맷 (agent-core.md 12번).',
  ]
    .filter(Boolean)
    .join('\n');
}

// Fallback: Sonnet 요약 실패 시 원본 그대로 + 경고 삽입
function buildWrappedFromRaw(raw: string, sourceType: 'prompt' | 'meeting'): string {
  return [
    `[${sourceType === 'meeting' ? 'AI 회의실 보고서' : '사용자 요청'} — 요약 실패, 원본 직접 해석]`,
    '',
    '⚠️ AI 요약이 실패했으므로 아래 원본을 포비가 직접 해석해서 작업.',
    'AskUser 도구는 1회만 허용 (핵심 누락된 정보가 있을 때만).',
    '',
    '=== 원본 ===',
    raw,
    '============',
  ].join('\n');
}

// Phase AD Step 5 (2026-04-23): 사용자 업로드 레퍼런스 이미지를 wrappedPrompt 에 부착
//   - ReviewStage(spec.attachments) / /meeting(sessionStorage.meeting_attachments) 두 경로 공통 사용
//   - agent-core §14 룰: 디자인만 참조 / 기능은 스펙 기준
//   - Read 도구로 절대 경로 열람 지시 + 분석 체크리스트 환기
function buildAttachmentsBlock(attachments?: string[] | null): string {
  if (!attachments || attachments.length === 0) return '';
  return [
    '',
    '## 📎 사용자 업로드 레퍼런스 이미지 (agent-core §14 — 반드시 Read 로 열람)',
    '',
    '아래 절대 경로 이미지들을 Read 도구로 열람하고 §14 룰대로 분석하세요:',
    ...attachments.map((p) => `- ${p}`),
    '',
    '⚠️ 절대 원칙 — 디자인만 참조',
    '- 색상·레이아웃·타이포·컴포넌트·톤 추출 OK',
    '- 이미지 속 기능·메뉴·텍스트 복제 금지 (기능은 위 스펙 기준)',
    '- §14.1 5개 항목 (색상/레이아웃/타이포/컴포넌트/톤) 분석 결과를 메시지에 명시',
    '- 완료 보고에 "📎 반영한 레퍼런스" 블록 + "기능은 스펙 기준" 문구 필수 (§15)',
  ].join('\n');
}

// Phase AD Step 11-C (2026-04-23): 포트폴리오 프리셋 지시문
//   ReviewStage 에서 사용자가 포트폴리오 앱을 프리셋으로 선택한 경우
//   → agent-core §14.5 의 7가지 레이아웃 룰 중 해당 타입 엄격 준수
function buildPresetBlock(preset?: { name: string; url: string; layout: string } | null): string {
  if (!preset) return '';
  return [
    '',
    '## 🎨 디자인 프리셋 (agent-core §14.5 — 엄격 준수)',
    '',
    `- 레이아웃 타입: **${preset.layout}**`,
    `- 참고 앱: ${preset.name} (${preset.url})`,
    '',
    `포비는 agent-core §14.5 의 '${preset.layout}' 룰을 엄격 준수해서`,
    '레이아웃 골격(네비/그리드/주요 컴포넌트 위치)을 그대로 따르되,',
    '기능·내용은 위 스펙 기준으로 매핑하세요.',
    '',
    '⚠️ 프리셋도 §14 절대 원칙 동일: 디자인 골격만 참조, 기능은 스펙 기준.',
    '⚠️ 완료 보고에 §15.2 프리셋 포맷 사용 ("📎 디자인 프리셋: {타입} ({앱이름} 참고)")',
  ].join('\n');
}

function BuilderAgentContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const projectId = params?.get('projectId') ?? null;
  // Phase 4 (2026-04-22): AI 회의실에서 "포비에게 바로 맡기기" 버튼으로 진입 시
  //   sessionStorage.meeting_context 를 자동으로 첫 prompt 로 주입
  const fromMeeting = params?.get('fromMeeting') === '1';
  // Phase E (2026-04-22): /start 한 줄 입력 후 진입 시 ?prompt=X&fromStart=1
  const fromStart = params?.get('fromStart') === '1';
  // Phase Q (2026-04-22): /start 에서 ReviewStage 까지 거친 후 진입 = &hasFinalSpec=1
  //   sessionStorage.start_final_spec 에 SpecBundle 저장되어 있음
  //   → Sonnet 요약 호출 스킵 + 확인 모달 스킵 + 바로 Agent 실행 (skipAskUser=true)
  const hasFinalSpec = params?.get('hasFinalSpec') === '1';
  const initialPrompt = params?.get('prompt') ?? '';
  const { state, start, submitAnswer, cancel, resumeProject, uploadAttachment } =
    useAgentStream();
  const [editingProject, setEditingProject] = useState<{ name: string; subdomain?: string | null; template: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Phase 0 (2026-04-22): 과금 + 서브도메인 사전 확인 모달
  // Phase D 확장: specBundle (Sonnet 요약 결과) 포함
  const [pendingStart, setPendingStart] = useState<{
    wrappedPrompt: string;
    displayText: string;
    projectId: string | null;
    isEdit: boolean;
    specBundle: SpecBundle | null;   // Phase D
    summaryLoading: boolean;          // Phase D
  } | null>(null);

  // Phase E (2026-04-22): 한 번만 auto-start (새로고침/탭 전환 중복 방지)
  const autoStartedRef = useRef(false);

  // Phase 2 (2026-04-22): 세션 경과 시간 — FoundryProgress 에 표시
  const sessionStartRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (state.status === 'streaming' || state.status === 'awaiting_answer') {
      if (sessionStartRef.current === null) sessionStartRef.current = Date.now();
      const t = setInterval(() => {
        if (sessionStartRef.current !== null) {
          setElapsedMs(Date.now() - sessionStartRef.current);
        }
      }, 1000);
      return () => clearInterval(t);
    }
    if (state.status === 'complete' || state.status === 'error') {
      // 완료 시 시간 초기화 (다음 세션 위해)
      sessionStartRef.current = null;
      setElapsedMs(0);
    }
  }, [state.status]);

  // 비로그인 가드 — 토큰 없으면 /login 으로 리다이렉트 (redirect 쿼리 포함)
  // 포비는 프로젝트 저장/배포에 userId 가 필요해서 비로그인 사용 불가
  useEffect(() => {
    const user = getUser();
    if (!user) {
      const redirect = projectId
        ? `${pathname}?projectId=${encodeURIComponent(projectId)}`
        : pathname;
      router.replace(`/login?redirect=${encodeURIComponent(redirect ?? '/builder/agent')}`);
      return;
    }
    setAuthChecked(true);
  }, [router, pathname, projectId]);

  // Phase Q (2026-04-22): /start 에서 ReviewStage 까지 거친 경우 — 모달 스킵 + 즉시 실행
  //   sessionStorage.start_final_spec 에 SpecBundle 이 저장되어 있음
  //   기존 Sonnet 요약 + 확인 모달 플로우를 전부 건너뛴다 (이미 /start 에서 끝남)
  useEffect(() => {
    if (!authChecked || projectId || autoStartedRef.current) return;
    if (typeof window === 'undefined') return;
    if (!(fromStart && hasFinalSpec && initialPrompt)) return;

    try {
      const raw = sessionStorage.getItem('start_final_spec');
      if (!raw) {
        // /start 우회 직접 hasFinalSpec=1 만 붙여 들어온 경우 — fallback 으로 일반 fromStart 플로우
        return;
      }
      const spec: SpecBundle & {
        attachments?: string[];
        preset?: { name: string; url: string; layout: string };
      } = JSON.parse(raw);
      sessionStorage.removeItem('start_final_spec');
      autoStartedRef.current = true;

      const baseWrapped = spec.fallbackRequired
        ? buildWrappedFromRaw(spec.raw, spec.sourceType)
        : buildWrappedFromSpec(spec);
      // Phase AD Step 5/11-C — 레퍼런스 이미지 + 프리셋 지시 부착
      const wrappedPrompt =
        baseWrapped + buildAttachmentsBlock(spec.attachments) + buildPresetBlock(spec.preset);

      // 확인 모달 없이 바로 Agent 실행 — /start 의 ReviewStage 가 확인 역할 수행함
      // skipAskUser=true — 이미 스펙 확정됨
      start(wrappedPrompt, undefined, undefined, undefined, true);
    } catch (e) {
      // JSON 파싱 실패 — 일반 fromStart 플로우로 fallback (아래 useEffect 에서 처리)
      // 이 useEffect 만 skip
    }
  }, [authChecked, fromStart, hasFinalSpec, initialPrompt, projectId, start]);

  // Phase E (2026-04-22): fromStart 또는 fromMeeting 진입 시 Haiku 요약 + 모달 자동 팝업
  //   Phase Q 우회 조건: hasFinalSpec=1 + start_final_spec 로드 성공 시에는 위 useEffect 가 처리
  useEffect(() => {
    if (!authChecked || projectId || autoStartedRef.current) return;
    if (typeof window === 'undefined') return;

    // 소스 판별
    let rawInput = '';
    let sourceType: 'prompt' | 'meeting' = 'prompt';
    let displayText = '';

    // Phase AD Step 5 — fromMeeting 진입 시 sessionStorage 의 meeting_attachments 도 함께 읽음
    let meetingAttachments: string[] | undefined;
    if (fromMeeting) {
      const meetingContext = sessionStorage.getItem('meeting_context');
      if (!meetingContext) return;
      rawInput = meetingContext;
      sourceType = 'meeting';
      displayText = '🧠 AI 회의실 종합 보고서 기반으로 만들기';
      sessionStorage.removeItem('meeting_context');
      const rawAttachments = sessionStorage.getItem('meeting_attachments');
      if (rawAttachments) {
        try {
          const parsed = JSON.parse(rawAttachments);
          if (Array.isArray(parsed)) {
            meetingAttachments = parsed.filter((p): p is string => typeof p === 'string');
          }
        } catch {
          // 무시 — attachments 없이 진행
        }
        sessionStorage.removeItem('meeting_attachments');
      }
    } else if (fromStart && initialPrompt) {
      // Phase Q: hasFinalSpec 은 위 useEffect 에서 처리 — 여기는 fromStart 단독 진입만
      if (hasFinalSpec) return;
      rawInput = initialPrompt;
      sourceType = 'prompt';
      displayText = initialPrompt;
      // sessionStorage 정리
      sessionStorage.removeItem('start_draft_prompt');
    } else {
      return;  // 직접 진입 (쿼리 없음) — auto-start 안 함
    }

    autoStartedRef.current = true;

    // 1) 모달 즉시 표시 (요약 로딩 Skeleton)
    setPendingStart({
      wrappedPrompt: '',   // 요약 완료 후 채움
      displayText,
      projectId: null,
      isEdit: false,
      specBundle: null,
      summaryLoading: true,
    });

    // 2) Sonnet 요약 API 호출
    authFetch('/ai/summarize-to-agent-spec', {
      method: 'POST',
      body: JSON.stringify({ raw: rawInput, sourceType }),
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data: SpecBundle | null) => {
        // Phase AD Step 5 — 모든 분기에서 meetingAttachments 부착
        const attachBlock = buildAttachmentsBlock(meetingAttachments);
        if (!data) {
          // 네트워크 실패 — fallback UI 트리거
          setPendingStart((prev) => (prev ? {
            ...prev,
            summaryLoading: false,
            specBundle: {
              spec: null,
              strategy: null,
              raw: rawInput,
              sourceType,
              confidence: 0,
              fallbackRequired: true,
            },
            wrappedPrompt: buildWrappedFromRaw(rawInput, sourceType) + attachBlock,
          } : prev));
          return;
        }
        // 성공 — spec/strategy 주입
        const baseWrapped = data.fallbackRequired
          ? buildWrappedFromRaw(rawInput, sourceType)
          : buildWrappedFromSpec(data);
        setPendingStart((prev) => (prev ? {
          ...prev,
          summaryLoading: false,
          specBundle: data,
          wrappedPrompt: baseWrapped + attachBlock,
        } : prev));
      })
      .catch(() => {
        const attachBlock = buildAttachmentsBlock(meetingAttachments);
        setPendingStart((prev) => (prev ? {
          ...prev,
          summaryLoading: false,
          specBundle: {
            spec: null,
            strategy: null,
            raw: rawInput,
            sourceType,
            confidence: 0,
            fallbackRequired: true,
          },
          wrappedPrompt: buildWrappedFromRaw(rawInput, sourceType) + attachBlock,
        } : prev));
      });
  }, [authChecked, fromMeeting, fromStart, hasFinalSpec, initialPrompt, projectId]);

  useEffect(() => {
    if (!projectId || !authChecked) return;
    authFetch(`/projects/${projectId}`, { method: 'GET' })
      .then(async (res) => {
        if (!res.ok) return;
        const p = await res.json();
        setEditingProject({ name: p.name, subdomain: p.subdomain, template: p.template });
        // 이전 배포 URL + 프로젝트 메타를 useAgentStream 에 주입 —
        // FoundryComplete 카드 + iframe 프리뷰 즉시 복원 (사용자 "새로 시작?" 혼란 제거)
        resumeProject({
          projectId: p.id,
          projectName: p.name,
          subdomain: p.subdomain,
          previewUrl: p.deployedUrl,
        });
      })
      .catch(() => {});
  }, [projectId, authChecked, resumeProject]);

  // 단일 채팅 입력 — 토글 제거, Agent 가 맥락으로 판단 (사장님 철학: 제약→맥락)
  // "추가 기능 뭐 있을까?" 질문 → Agent 는 대화. "댓글 기능 추가해줘" → 도구 호출.
  //
  // 수정 모드 판정: URL ?projectId 또는 state.projectId (방금 생성 완료한 세션) 둘 중 하나라도 있으면.
  //   → 앱 생성 완료 후 같은 세션에서 이어서 대화해도 기존 앱 맥락 유지됨.
  // Phase 0 (2026-04-22): submit → 모달 → 확인 후 실제 start() 호출 흐름
  const handleStart = (userText: string) => {
    const effectiveProjectId = projectId ?? state.projectId ?? null;
    const effectiveProjectName = editingProject?.name ?? state.projectName ?? null;
    const effectiveSubdomain = editingProject?.subdomain ?? state.subdomain ?? null;
    const isEdit = !!(effectiveProjectId && effectiveProjectName);

    const wrappedPrompt = isEdit
      ? `[기존 프로젝트 "${effectiveProjectName}" 작업 중]\n` +
        `- projectId: ${effectiveProjectId}\n` +
        (effectiveSubdomain ? `- subdomain: ${effectiveSubdomain}\n` : '') +
        `- 사용자 발화: ${userText}\n\n` +
        `이 앱은 이미 배포된 상태입니다.\n` +
        `- 질문/추천/상의 요청이면 → 자연어로 답변 (기존 코드 Read 해서 맥락 기반).\n` +
        `- 수정/추가 요청이면 → 요청된 부분만 수정/추가 후 deploy_to_subdomain 으로 재배포.\n` +
        `- 맥락은 네가 판단. 처음부터 만들지는 말 것.`
      : userText;

    setPendingStart({
      wrappedPrompt,
      displayText: userText,
      projectId: effectiveProjectId,
      isEdit,
      // 수정 모드는 요약 불필요 — 기존 프로젝트 정보는 DB/resume 으로 복원됨
      specBundle: null,
      summaryLoading: false,
    });
  };

  // 모달 "시작" 확인 시 실제 fetch 트리거
  const handleConfirmStart = (customSubdomain?: string) => {
    if (!pendingStart) return;
    const { wrappedPrompt, displayText, projectId: pid, isEdit, specBundle } = pendingStart;
    setPendingStart(null);
    // Phase F (2026-04-22): specBundle 존재 = Sonnet 요약 + 사용자 확인 완료 → AskUser 차단
    //   (/start 한 줄 입력 후 확인 모달 거친 케이스, /meeting 회의실 요약 케이스)
    //   프롬프트·편집·수정 모드는 specBundle=null → 기존 AskUser 플로우 유지
    const skipAskUser = !!specBundle;
    start(wrappedPrompt, isEdit ? displayText : undefined, pid ?? undefined, customSubdomain, skipAskUser);
  };

  // 비로그인 사용자: 리다이렉트 진행 중 빈 화면 대신 간단한 로딩 표시
  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        로그인 확인 중...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950">
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400"
          >
            ← 내 프로젝트
          </Link>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
            🌗 포비
          </h1>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            BETA
          </span>
          {editingProject && (
            <span className="hidden rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 sm:inline dark:bg-blue-950/40 dark:text-blue-300">
              📝 {editingProject.name} 수정 중
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {state.status === 'streaming' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-blue-700 dark:text-blue-300"
              style={{ backgroundColor: '#3182F61A' }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: '#3182F6' }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: '#3182F6' }}
                />
              </span>
              <span className="hidden sm:inline">포비 작업 중</span>
            </span>
          )}
          {state.status === 'awaiting_answer' && !state.submittingAnswer && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              💬 <span className="hidden sm:inline">답변 대기</span>
            </span>
          )}
          {state.submittingAnswer && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="inline-block h-2 w-2 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="hidden sm:inline">전송 중</span>
            </span>
          )}
          {state.status === 'complete' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✅ <span className="hidden sm:inline">완료</span>
            </span>
          )}
          {state.sessionId && (
            <span className="hidden font-mono text-slate-500 sm:inline dark:text-slate-400">
              {state.sessionId.slice(0, 8)}
            </span>
          )}
          {(state.status === 'streaming' || state.status === 'awaiting_answer') && (
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
            >
              중단
            </button>
          )}
        </div>
      </header>

      {/* 수정 모드 안내 배너 */}
      {editingProject && state.status === 'idle' && (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <span className="font-medium">📝 &quot;{editingProject.name}&quot; 수정 모드</span>
          <span className="ml-2 text-xs opacity-80">
            어떻게 바꾸고 싶은지 자연어로 말씀해주세요 (예: &quot;헤더 색깔 부드럽게&quot;, &quot;로그인 버튼 추가&quot;)
          </span>
        </div>
      )}

      {/* 메인 영역 — PC 2열 (채팅 | 프리뷰), 모바일은 채팅만
          채팅 영역은 고정폭 제거, 비율 기반으로 자연스럽게 확장 (사장님 피드백) */}
      <main className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col lg:w-2/5 lg:flex-none lg:min-w-[440px] xl:w-[36%]">
          <AgentChat
            state={state}
            onStart={handleStart}
            onSubmitAnswer={submitAnswer}
            onUploadAttachment={uploadAttachment}
            isEditingMode={!!((projectId && editingProject) || state.projectId)}
          />
        </div>
        <div className="hidden min-w-0 flex-1 border-l border-slate-200 lg:flex dark:border-slate-800">
          <FoundryPreviewPane
            previewUrl={state.previewUrl}
            projectName={state.projectName}
            status={state.status}
            lastActivity={state.lastActivity}
            currentStage={state.currentStage}
            currentLabel={state.currentLabel}
            completedStages={state.completedStages}
            percent={state.percent}
            toolCount={state.toolCount}
            writeFileCount={state.writeFileCount}
            hasToolCall={state.hasToolCall}
            elapsedMs={elapsedMs}
          />
        </div>
      </main>

      {/* Phase 0 + D (2026-04-22): 크레딧 + 서브도메인 + spec/strategy 통합 모달 */}
      <AgentCreditConfirmModal
        isOpen={!!pendingStart}
        isEditMode={!!pendingStart?.isEdit}
        prompt={pendingStart?.displayText ?? ''}
        specBundle={pendingStart?.specBundle ?? null}
        summaryLoading={pendingStart?.summaryLoading ?? false}
        onConfirm={handleConfirmStart}
        onCancel={() => {
          setPendingStart(null);
          autoStartedRef.current = false;  // 취소 시 재진입 허용
          // Phase E 보호장치: fromStart/fromMeeting 모두 취소 시 /start 로 복귀
          if (fromStart || fromMeeting) {
            router.push('/start');
          }
        }}
        onEdit={() => {
          // 신규 모드에서만 의미 있음 — 사용자를 /start 로 돌려 보내 재입력
          if (pendingStart && !pendingStart.isEdit) {
            const backPrompt = encodeURIComponent(pendingStart.displayText);
            setPendingStart(null);
            autoStartedRef.current = false;
            router.push(`/start?prompt=${backPrompt}`);
          }
        }}
      />
    </div>
  );
}

export default function BuilderAgentPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">로딩...</div>}>
      <BuilderAgentContent />
    </Suspense>
  );
}
