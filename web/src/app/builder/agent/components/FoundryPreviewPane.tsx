'use client';

// 사이드 프리뷰 — 배포된 앱을 iframe 으로 옆에서 보면서 수정 요청
// 배포 전: 포비 작업 중 개발 과정 UI (Phase 2, 2026-04-22)
//   · streaming + 도구 호출 有 : FoundryProgress (7단계 + 진행도) + 파일 카운트 + 경과 시간
//   · streaming + 도구 호출 無 : 상담 모드 (무료) — 채팅만 진행 중 표시
//   · awaiting_answer : 답지 카드 답변 안내
//   · idle : 시작 안내
// 배포 후: iframe + URL 바 + 📱/🖥 토글
//
// PC 모드: viewport simulator
//   iframe 실제 width = 1280 고정 → 앱이 자기를 PC 로 인식 (lg: 브레이크포인트 발동)
//   transform: scale(containerWidth / 1280) → 프리뷰 영역에 꽉 채움 (빈 공간 0)
//   iframe 은 absolute positioning → 부모 flex 계산을 밀지 않음

import { useEffect, useRef, useState } from 'react';
import FoundryProgress, { type StageId } from './FoundryProgress';

type DeviceMode = 'desktop' | 'mobile';

// PC 앱이 `lg:` (>=1024px) 반응형을 발동할 수 있는 기준 viewport
const DESKTOP_VIEWPORT_WIDTH = 1280;

interface Props {
  previewUrl: string | null;
  projectName?: string | null;
  status: 'idle' | 'streaming' | 'awaiting_answer' | 'complete' | 'error';
  lastActivity?: string;
  // Phase 2 (2026-04-22): 개발 과정 표시용
  currentStage?: StageId | null;
  currentLabel?: string;
  completedStages?: Set<StageId>;
  percent?: number;
  toolCount?: number;
  writeFileCount?: number;   // Write/Edit 도구 호출 수 (생성/수정 파일 추정)
  hasToolCall?: boolean;     // 상담(무료) vs 작업(유료) 구분
  elapsedMs?: number;
}

export default function FoundryPreviewPane({
  previewUrl,
  projectName,
  status,
  lastActivity,
  currentStage = null,
  currentLabel = '',
  completedStages,
  percent = 0,
  toolCount = 0,
  writeFileCount = 0,
  hasToolCall = false,
  elapsedMs = 0,
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
    // Phase 2 (2026-04-22): streaming + 도구 호출 있을 때 개발 과정 뷰 (기존 MVP 빌더와 동일 UX)
    //   FoundryProgress 가 왼쪽 채팅에도 인라인으로 나오지만, 오른쪽 큰 영역에서도 상세 표시.
    //   도구 호출 0 (= 상담/채팅만) 인 경우엔 간단한 상태 카드만.
    if (status === 'streaming' && hasToolCall) {
      return (
        <div className="flex h-full w-full flex-col overflow-auto bg-slate-50 p-4 dark:bg-slate-900/40 sm:p-6">
          <div className="mx-auto w-full max-w-lg">
            <FoundryProgress
              currentStage={currentStage}
              currentLabel={currentLabel}
              completed={completedStages ?? new Set<StageId>()}
              percent={percent}
              elapsedMs={elapsedMs}
            />

            {/* 파일 카운트 + 마지막 활동 */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">📂 생성/수정</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                    {writeFileCount}<span className="ml-0.5 text-xs text-slate-400">개</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">🔧 도구 호출</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                    {toolCount}<span className="ml-0.5 text-xs text-slate-400">회</span>
                  </div>
                </div>
              </div>
              {lastActivity && (
                <div className="mt-3 truncate border-t border-slate-100 pt-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {lastActivity}
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              ⏳ 보통 7~10분 소요됩니다. 완성되면 여기에 앱이 바로 뜹니다.
            </p>
          </div>
        </div>
      );
    }

    // streaming 이지만 도구 호출 X (상담 모드) — 간단한 채팅 인디케이터
    if (status === 'streaming' && !hasToolCall) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-900/40">
          <div className="mb-3 text-5xl">💬</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            포비가 답변 중...
          </p>
          <p className="mt-2 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            {lastActivity || '상담/추천/분석 요청은 무료예요'}
          </p>
        </div>
      );
    }

    if (status === 'awaiting_answer') {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-slate-900/40">
          <div className="mb-3 text-5xl">💭</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            답지 카드에 답변해 주세요
          </p>
          <p className="mt-2 text-xs text-slate-400">
            👆 왼쪽 채팅의 번호를 골라주시면 이어서 만들어요
          </p>
        </div>
      );
    }

    // idle / error / fallback
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-400 dark:bg-slate-900/40">
        <div className="mb-3 text-5xl">🌐</div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          배포 완료 후 여기에 앱이 실시간으로 뜹니다
        </p>
        <p className="mt-2 text-xs text-slate-400">
          왼쪽에서 만들고 싶은 앱을 말씀해주세요
        </p>
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
