'use client';

// Phase C (2026-04-22): /start 대수술 — 한 줄 프롬프트 입력 + "시작" 만 남김
// Phase P (2026-04-22): 대화형 인터뷰 + 확인 스테이지 state 머신 확장
//
// state 머신:
//   'input'     — 한 줄 입력 (최초 진입)
//     ↓ [시작]
//   'choice'    — 선택 모달 (🚀바로 / 💬상의)
//     ├─ 🚀바로 → 'summarizing'  (Sonnet 요약만)
//     └─ 💬상의 → 'interview'    (포비 3~6턴)
//         ↓ onComplete(finalSpec)
//   'summarizing' → 'review'  (finalSpec 받은 후 확인 스테이지)
//   'interview'   → 'review'
//   'review'    — 스펙 카드 + 채팅 수정 (ReviewStage)
//     ├─ [이대로 시작] → /builder/agent?fromStart=1 (finalSpec sessionStorage 전달)
//     └─ [취소] → 'input' (입력 보존)
//
// 회의실과 철학 일관: 각 진입점에서 스펙 정리 → 포비에게 넘김
//
// 안전성:
//   - 기존 sessionStorage start_draft_prompt 유지 (로그인 복귀 복원)
//   - finalSpec 은 별도 키 start_final_spec (/builder/agent 가 소비 후 삭제)
//   - 각 state 전환마다 guard clause (비로그인/빈 prompt/loading 방지)

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, getUser, getToken } from '@/lib/api';
import Logo from '@/app/components/Logo';
import ChoiceModal from './components/ChoiceModal';
import InterviewChat from './components/InterviewChat';
import ReviewStage, { type SpecBundle } from './components/ReviewStage';

const CREDIT_PER_APP = 6800;
const FINAL_SPEC_KEY = 'start_final_spec';

type StartMode = 'input' | 'choice' | 'interview' | 'summarizing' | 'review';

function StartContent() {
  const router = useRouter();
  const params = useSearchParams();
  const urlPrompt = params?.get('prompt') ?? '';

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<StartMode>('input');
  const [submitting, setSubmitting] = useState(false);
  const [finalSpec, setFinalSpec] = useState<SpecBundle | null>(null);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  // 초기 진입 — 로그인 + 잔액 + 복원
  useEffect(() => {
    const u = getUser();
    setUser(u as any);

    if (urlPrompt) {
      setInput(urlPrompt);
    } else if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('start_draft_prompt');
      if (saved) setInput(saved);
    }

    if (u) {
      authFetch('/credits/balance')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setBalance(data.balance ?? 0);
        })
        .catch(() => {});
    }
  }, [urlPrompt]);

  // ── handlers ───────────────────────────────────────────

  const handleStart = () => {
    const prompt = input.trim();
    if (!prompt) return;
    if (submitting) return;
    if (mode !== 'input') return;
    setSubmitting(true);

    // 비로그인 → 로그인 후 복귀 (입력 보존)
    if (!user || !getToken()) {
      sessionStorage.setItem('start_draft_prompt', prompt);
      const redirect = `/start?prompt=${encodeURIComponent(prompt)}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    // 선택 모달 오픈
    sessionStorage.removeItem('start_draft_prompt');
    setMode('choice');
    setSubmitting(false);
  };

  // 🚀 바로 만들기 — 인터뷰 스킵 + Sonnet 요약만
  const handleSelectDirect = async () => {
    setMode('summarizing');
    setSummarizeError(null);
    try {
      const res = await authFetch('/ai/summarize-to-agent-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: input.trim(), sourceType: 'prompt' }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const data = await res.json();
      if (data.fallbackRequired) {
        setSummarizeError('스펙 추출 실패 — 더 구체적으로 입력해주세요.');
        setMode('input');
        return;
      }
      setFinalSpec(data as SpecBundle);
      setMode('review');
    } catch (e: any) {
      setSummarizeError(e?.message ?? '요약 오류');
      setMode('input');
    }
  };

  // 💬 상의 — 인터뷰 진입
  const handleSelectInterview = () => {
    setMode('interview');
  };

  // 인터뷰 완료 콜백
  const handleInterviewComplete = (
    spec: SpecBundle | undefined,
  ) => {
    if (!spec) {
      // finalSpec 누락 → 입력으로 복귀
      setMode('input');
      setSummarizeError('인터뷰 결과를 받지 못했어요. 다시 시도해주세요.');
      return;
    }
    setFinalSpec(spec);
    setMode('review');
  };

  // 인터뷰 중단 → 선택 모달로 복귀 (입력 유지)
  const handleInterviewCancel = () => {
    setMode('input');
  };

  // 확인 스테이지 — [이대로 시작]
  const handleReviewConfirm = (spec: SpecBundle) => {
    // finalSpec 을 sessionStorage 에 저장하고 /builder/agent 로 점프
    // /builder/agent 의 Phase Q 분기가 이를 읽어서 확인 모달 스킵 + 바로 Agent 실행
    try {
      sessionStorage.setItem(FINAL_SPEC_KEY, JSON.stringify(spec));
    } catch {}
    router.push(
      `/builder/agent?prompt=${encodeURIComponent(
        input.trim(),
      )}&fromStart=1&hasFinalSpec=1`,
    );
  };

  // 확인 스테이지 — [취소] (입력 모드 복귀, spec 초기화)
  const handleReviewCancel = () => {
    setFinalSpec(null);
    setMode('input');
  };

  // 선택 모달 닫기
  const handleChoiceClose = () => {
    setMode('input');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };

  const possibleApps = balance !== null ? Math.floor(balance / CREDIT_PER_APP) : null;

  // ── 렌더 분기 ──────────────────────────────────────────

  // review 모드 — 전체 화면 점유
  if (mode === 'review' && finalSpec) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] py-6 text-[var(--text-primary)]">
        <header className="mx-auto mb-4 flex max-w-6xl items-center justify-between px-5">
          <a href="/">
            <Logo />
          </a>
          <span className="text-xs text-slate-500">
            스펙 확인 & 수정 (무료)
          </span>
        </header>
        <div className="mx-auto h-[calc(100vh-120px)] max-w-6xl px-5">
          <ReviewStage
            initialSpec={finalSpec}
            balance={balance}
            onConfirm={handleReviewConfirm}
            onCancel={handleReviewCancel}
          />
        </div>
      </main>
    );
  }

  // interview 모드 — 채팅 화면
  if (mode === 'interview') {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] py-6 text-[var(--text-primary)]">
        <header className="mx-auto mb-4 flex max-w-2xl items-center justify-between px-5">
          <a href="/">
            <Logo />
          </a>
          <span className="text-xs text-slate-500">상의 중 (무료)</span>
        </header>
        <div className="mx-auto h-[calc(100vh-120px)] max-w-2xl px-5">
          <InterviewChat
            initialPrompt={input.trim()}
            onComplete={handleInterviewComplete}
            onCancel={handleInterviewCancel}
          />
        </div>
      </main>
    );
  }

  // summarizing 모드 — 로딩
  if (mode === 'summarizing') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="text-center">
          <div className="mb-4 text-5xl">🧠</div>
          <div className="text-base font-semibold">포비가 아이디어를 정리 중...</div>
          <div className="mt-2 text-sm text-slate-500">3~5초 정도 걸려요</div>
        </div>
      </main>
    );
  }

  // input / choice 모드 — 기본 홈 화면
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
        <a href="/">
          <Logo />
        </a>
        <div className="flex items-center gap-3">
          {user ? (
            <a
              href="/dashboard"
              className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
            >
              내 프로젝트
            </a>
          ) : (
            <a
              href="/login"
              className="rounded-xl bg-[var(--toss-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--toss-blue-hover)] transition-colors"
            >
              로그인
            </a>
          )}
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-5 py-16 md:py-24">
        {user && (
          <div className="mb-8 w-full max-w-xl rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)]/80 p-5">
            <div className="flex items-center gap-2 text-base font-bold">
              👋 환영합니다! AI가 앱을 만들어 드립니다
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              아래에 만들고 싶은 앱을 한 줄로 설명해 주세요.
            </p>
            {balance !== null && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--toss-blue)]/10 px-3 py-1.5 text-sm font-semibold text-[var(--toss-blue)]">
                ⚡ {balance.toLocaleString()} 크레딧
                {possibleApps !== null && (
                  <span className="text-[var(--text-secondary)]">
                    | 앱 약 {possibleApps}개 제작 가능
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <h1 className="mb-3 text-center text-3xl font-extrabold tracking-tight md:text-5xl">
          어떤 앱을 만들까요?
        </h1>
        <p className="mb-10 text-center text-base text-[var(--text-secondary)] md:text-lg">
          아이디어를 입력해 주세요. 포비가 바로 만들어 드립니다.
        </p>

        <div className="w-full max-w-2xl rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)]/70 p-5 shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="예: 반려동물 돌봄 매칭 앱 / 학원 관리 시스템 / 동네 커뮤니티 게시판"
            rows={3}
            className="w-full resize-none bg-transparent text-base outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[var(--text-tertiary)]">
              Enter 로 바로 시작 · Shift+Enter 줄바꿈
            </p>
            <button
              onClick={handleStart}
              disabled={!input.trim() || submitting}
              className="rounded-2xl bg-[var(--toss-blue)] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--toss-blue-hover)] disabled:cursor-not-allowed disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-tertiary)]"
            >
              {submitting ? '이동 중...' : '시작 →'}
            </button>
          </div>

          {summarizeError && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              ⚠️ {summarizeError}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-[var(--text-tertiary)]">
          🧠 사업계획서나 전략을 정리하고 싶으시다면{' '}
          <a
            href="/meeting"
            className="font-semibold text-[var(--toss-purple)] hover:underline"
          >
            AI 회의실
          </a>{' '}
          에서 토론 후 넘어오세요.
        </div>
      </section>

      {/* 선택 모달 */}
      <ChoiceModal
        isOpen={mode === 'choice'}
        prompt={input.trim()}
        balance={balance}
        onClose={handleChoiceClose}
        onSelectDirect={handleSelectDirect}
        onSelectInterview={handleSelectInterview}
      />
    </main>
  );
}

export default function StartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-tertiary)]">
          로딩...
        </div>
      }
    >
      <StartContent />
    </Suspense>
  );
}
