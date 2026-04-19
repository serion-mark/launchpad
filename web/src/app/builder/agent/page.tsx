'use client';

// /builder/agent — Agent Mode 메인 페이지
// 기존 /builder와 격리된 신규 라우트
// ?projectId=xxx 쿼리 파라미터가 있으면 "수정 모드"로 진입 (기존 프로젝트 이어서 작업)

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { authFetch, getUser } from '@/lib/api';
import { useAgentStream } from './useAgentStream';
import AgentChat from './components/AgentChat';
import FoundryPreviewPane from './components/FoundryPreviewPane';

function BuilderAgentContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const projectId = params?.get('projectId') ?? null;
  const { state, start, submitAnswer, cancel, resumeProject } = useAgentStream();
  const [editingProject, setEditingProject] = useState<{ name: string; subdomain?: string | null; template: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

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
  const handleStart = (userText: string) => {
    const effectiveProjectId = projectId ?? state.projectId ?? null;
    const effectiveProjectName = editingProject?.name ?? state.projectName ?? null;
    const effectiveSubdomain = editingProject?.subdomain ?? state.subdomain ?? null;
    const isEdit = !!(effectiveProjectId && effectiveProjectName);

    if (isEdit) {
      const wrapped =
        `[기존 프로젝트 "${effectiveProjectName}" 작업 중]\n` +
        `- projectId: ${effectiveProjectId}\n` +
        (effectiveSubdomain ? `- subdomain: ${effectiveSubdomain}\n` : '') +
        `- 사용자 발화: ${userText}\n\n` +
        `이 앱은 이미 배포된 상태입니다.\n` +
        `- 질문/추천/상의 요청이면 → 자연어로 답변 (기존 코드 Read 해서 맥락 기반).\n` +
        `- 수정/추가 요청이면 → 요청된 부분만 수정/추가 후 deploy_to_subdomain 으로 재배포.\n` +
        `- 맥락은 네가 판단. 처음부터 만들지는 말 것.`;
      start(wrapped, userText, effectiveProjectId);
    } else {
      start(userText);
    }
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
            isEditingMode={!!((projectId && editingProject) || state.projectId)}
          />
        </div>
        <div className="hidden min-w-0 flex-1 border-l border-slate-200 lg:flex dark:border-slate-800">
          <FoundryPreviewPane
            previewUrl={state.previewUrl}
            projectName={state.projectName}
            status={state.status}
            lastActivity={state.lastActivity}
          />
        </div>
      </main>
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
