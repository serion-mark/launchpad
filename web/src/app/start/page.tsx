'use client';

// Phase C (2026-04-22): /start 대수술 — 한 줄 프롬프트 입력 + "시작" 만 남김
//   · 질문지 2단계~N단계 (업종/매장명/디자인/기능/테마) 전부 제거 (사장님 지시)
//   · 템플릿 버튼 제거 (placeholder 예시 텍스트로만)
//   · POST /projects 제거 — 프로젝트 생성은 /builder/agent 진입 후 모달 확인 시점으로 이동
//     (취소 시 쓰레기 draft 방지)
//   · 로그인 가드: 비로그인 → /login?redirect=... (입력한 prompt 는 sessionStorage 로 복원)
//
// 흐름:
//   1. 사용자가 한 줄 입력 → [시작]
//   2. 비로그인: /login?redirect=/start?prompt=X (복귀 후 input 자동 복원)
//   3. 로그인: /builder/agent?prompt=X&fromStart=1 → Haiku 요약 + 확인 모달
//
// 크레딧 표시: 기존 잔액 배너 유지 ("N cr | 앱 약 M개 제작 가능")

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, getUser, getToken } from '@/lib/api';
import Logo from '@/app/components/Logo';

const CREDIT_PER_APP = 6800;  // app_generate 단가 (credit.service.ts 와 동기화)

function StartContent() {
  const router = useRouter();
  const params = useSearchParams();
  const urlPrompt = params?.get('prompt') ?? '';

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 초기 진입 — 로그인 + 잔액 + 복원
  useEffect(() => {
    const u = getUser();
    setUser(u as any);

    // URL 쿼리 prompt 가 있으면 우선 반영 (로그인 리다이렉트 복귀 케이스)
    if (urlPrompt) {
      setInput(urlPrompt);
    } else if (typeof window !== 'undefined') {
      // sessionStorage 복원 (비로그인 상태에서 입력 후 로그인 진입 시)
      const saved = sessionStorage.getItem('start_draft_prompt');
      if (saved) setInput(saved);
    }

    // 크레딧 잔액
    if (u) {
      authFetch('/credits/balance')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setBalance(data.balance ?? 0);
        })
        .catch(() => {});
    }
  }, [urlPrompt]);

  const handleStart = () => {
    const prompt = input.trim();
    if (!prompt) return;
    if (submitting) return;
    setSubmitting(true);

    // 비로그인 → 로그인 후 돌아오도록 (입력 보존)
    if (!user || !getToken()) {
      sessionStorage.setItem('start_draft_prompt', prompt);
      const redirect = `/start?prompt=${encodeURIComponent(prompt)}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    // 로그인 완료 → /builder/agent 로 이동. Haiku 요약 + 확인 모달은 거기서.
    // 프로젝트 생성은 모달 [이대로 시작] 시점에 runWithSDK 내부 startProject 가 담당.
    sessionStorage.removeItem('start_draft_prompt');
    router.push(
      `/builder/agent?prompt=${encodeURIComponent(prompt)}&fromStart=1`,
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };

  const possibleApps = balance !== null ? Math.floor(balance / CREDIT_PER_APP) : null;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 상단 */}
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

      {/* 본문 */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-5 py-16 md:py-24">
        {/* 인사 배너 */}
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

        {/* 타이틀 */}
        <h1 className="mb-3 text-center text-3xl font-extrabold tracking-tight md:text-5xl">
          어떤 앱을 만들까요?
        </h1>
        <p className="mb-10 text-center text-base text-[var(--text-secondary)] md:text-lg">
          아이디어를 입력해 주세요. 포비가 바로 만들어 드립니다.
        </p>

        {/* 입력창 */}
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
        </div>

        {/* 회의실 안내 */}
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
