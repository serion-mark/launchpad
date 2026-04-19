'use client';

// 사이드 프리뷰 — 배포된 앱을 iframe 으로 옆에서 보면서 수정 요청
// 배포 전: 포비 작업 중 플레이스홀더
// 배포 후: iframe + URL 바 + 📱/🖥 토글
//
// PC 모드: viewport simulator
//   iframe 실제 width = 1280 고정 → 앱이 자기를 PC 로 인식 (lg: 브레이크포인트 발동)
//   transform: scale(containerWidth / 1280) → 프리뷰 영역에 꽉 채움 (빈 공간 0)
//   iframe 은 absolute positioning → 부모 flex 계산을 밀지 않음

import { useEffect, useRef, useState } from 'react';

type DeviceMode = 'desktop' | 'mobile';

// PC 앱이 `lg:` (>=1024px) 반응형을 발동할 수 있는 기준 viewport
const DESKTOP_VIEWPORT_WIDTH = 1280;

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
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const desktopWrapperRef = useRef<HTMLDivElement>(null);

  // PC 모드: 프리뷰 컨테이너 실제 크기 측정 → iframe scale 계산
  useEffect(() => {
    if (device !== 'desktop') return;
    const el = desktopWrapperRef.current;
    if (!el) return;
    const update = () => {
      setDims({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device, previewUrl]);

  // scale 제한 없음 — 좁은 화면은 축소, 넓은 화면은 확대해 꽉 채움
  const desktopScale = dims.w > 0 ? dims.w / DESKTOP_VIEWPORT_WIDTH : 1;
  const desktopIframeHeight = dims.h > 0 && desktopScale > 0 ? dims.h / desktopScale : 0;

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

      {/* iframe — 디바이스 모드별 */}
      {device === 'mobile' ? (
        <div className="flex flex-1 items-center justify-center overflow-auto bg-gradient-to-b from-slate-200 to-slate-300 p-4 dark:from-slate-800 dark:to-slate-900">
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
        </div>
      ) : (
        // PC: iframe width 1280 고정 + scale 로 컨테이너에 꽉 채움
        <div
          ref={desktopWrapperRef}
          className="relative flex-1 overflow-hidden bg-white"
          style={{ minWidth: 0 }}
        >
          {dims.w > 0 && (
            <iframe
              src={previewUrl}
              title={projectName ?? 'desktop preview'}
              className="absolute left-0 top-0 border-0"
              style={{
                width: `${DESKTOP_VIEWPORT_WIDTH}px`,
                height: `${desktopIframeHeight}px`,
                transform: `scale(${desktopScale})`,
                transformOrigin: 'top left',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
