'use client';

// 사이드 프리뷰 — 배포된 앱을 iframe 으로 옆에서 보면서 수정 요청
// 배포 전: 포비 작업 중 플레이스홀더
// 배포 후: iframe + URL 바 + 📱/🖥 토글
//
// 레이아웃은 레거시 /builder 의 LivePreview 패턴을 그대로 이식 —
// PC: 컨테이너 가운데 정렬 + max-w 로 폭 제한 + iframe w-full h-full 로 꽉 채움
// Mobile: 고정 폭 기기 프레임 (390×844) + 노치

import { useState } from 'react';

type DeviceMode = 'desktop' | 'mobile';

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
  const [device, setDevice] = useState<DeviceMode>('desktop');

  if (!previewUrl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-400 dark:bg-slate-900/40">
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
    <div className="flex h-full w-full min-w-0 flex-col bg-white dark:bg-slate-950">
      {/* URL 바 + 디바이스 토글 */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
        <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
        <span className="flex-1 truncate font-mono text-slate-600 dark:text-slate-400">
          {previewUrl}
        </span>

        {/* 📱 / 🖥 토글 — 현재 모드가 즉시 보이도록 라벨 포함 */}
        <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            aria-label="모바일 보기"
            className={[
              'flex h-7 items-center justify-center gap-1 rounded px-2 text-[11px] font-medium transition',
              device === 'mobile'
                ? 'text-white shadow'
                : 'text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700',
            ].join(' ')}
            style={device === 'mobile' ? { backgroundColor: '#3182F6' } : undefined}
          >
            📱 <span className="hidden sm:inline">모바일</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            aria-label="PC 보기"
            className={[
              'flex h-7 items-center justify-center gap-1 rounded px-2 text-[11px] font-medium transition',
              device === 'desktop'
                ? 'text-white shadow'
                : 'text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700',
            ].join(' ')}
            style={device === 'desktop' ? { backgroundColor: '#3182F6' } : undefined}
          >
            🖥 <span className="hidden sm:inline">PC</span>
          </button>
        </div>

        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 rounded border border-slate-200 px-2 py-0.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
        >
          새 탭 ↗
        </a>
      </div>

      {/* iframe — 레거시 LivePreview 패턴: 중앙 정렬 + 디바이스별 wrapper */}
      <div
        className={[
          'flex flex-1 items-center justify-center overflow-auto p-4',
          device === 'mobile'
            ? 'bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900'
            : 'bg-slate-50 dark:bg-slate-900',
        ].join(' ')}
      >
        {device === 'mobile' ? (
          <div
            className="relative overflow-hidden rounded-[32px] border-[6px] border-slate-800 bg-white shadow-2xl ring-1 ring-black/10 dark:border-slate-700"
            style={{ width: '390px', height: '844px', maxWidth: '100%' }}
          >
            {/* 노치 */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-800 dark:bg-slate-700"
            />
            <iframe
              src={previewUrl}
              title={projectName ?? 'mobile preview'}
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700">
            <iframe
              src={previewUrl}
              title={projectName ?? 'desktop preview'}
              className="h-full w-full border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
