'use client';

// 사이드 프리뷰 — 배포된 앱을 iframe 으로 옆에서 보면서 수정 요청
// 배포 전: 포비 작업 중 플레이스홀더
// 배포 후: iframe + URL 바

interface Props {
  previewUrl: string | null;
  projectName?: string | null;
  status: 'idle' | 'streaming' | 'awaiting_answer' | 'complete' | 'error';
  lastActivity?: string;
}

export default function FoundryPreviewPane({
  previewUrl,
  projectName,
  status,
  lastActivity,
}: Props) {
  if (!previewUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-400 dark:bg-slate-900/40">
        <div className="mb-3 text-5xl">🌐</div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          배포 완료 후 여기에 앱이 실시간으로 뜹니다
        </p>
        {status === 'idle' && (
          <p className="mt-2 text-xs text-slate-400">
            왼쪽에서 만들고 싶은 앱을 말씀해주세요
          </p>
        )}
        {status === 'streaming' && (
          <p className="mt-2 max-w-xs truncate text-xs text-slate-400">
            {lastActivity || '✨ 포비가 작업 중이에요...'}
          </p>
        )}
        {status === 'awaiting_answer' && (
          <p className="mt-2 text-xs text-slate-400">
            👆 답지 카드에 답변하시면 포비가 이어서 만들어요
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-950">
      {/* URL 바 */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
        <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
        <span className="flex-1 truncate font-mono text-slate-600 dark:text-slate-400">
          {previewUrl}
        </span>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 rounded border border-slate-200 px-2 py-0.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
        >
          새 탭 ↗
        </a>
      </div>
      {/* iframe — 배포된 앱 */}
      <iframe
        src={previewUrl}
        className="h-full w-full flex-1 border-0 bg-white"
        title={projectName ?? 'preview'}
        // 서브도메인은 동일 origin 아니지만 iframe-ancestors 헤더가 self 허용해주면 OK
        // (agent-<sub>.conf 에 X-Frame-Options: SAMEORIGIN 이지만 foundry.ai.kr 은 부모 도메인이라 동작)
      />
    </div>
  );
}
