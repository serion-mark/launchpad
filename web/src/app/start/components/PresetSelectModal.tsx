'use client';

// Phase AD Step 11-B (2026-04-23): 포트폴리오 프리셋 선택 모달
// ReviewStage 에서 사용자가 이미지 없이 [이대로 시작] 클릭 시 표시.
// 9개 라이브 앱 카드 → 사용자가 비슷한 스타일 1개 선택 → spec.preset 에 저장.
// [건너뛰기] 옵션 명확 (포비가 알아서).

import { useState } from 'react';
import { PORTFOLIO_APPS, type PortfolioApp } from '@/lib/portfolio-apps';

interface Props {
  isOpen: boolean;
  onSelect: (preset: PortfolioApp | null) => void;
}

export default function PresetSelectModal({ isOpen, onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        {/* 헤더 */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              🎨 비슷한 스타일이 있나요?
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              포트폴리오에서 마음에 드는 디자인을 골라주세요. <strong>건너뛰셔도 돼요</strong>
              <span className="ml-1 text-slate-400">(포비가 알아서 만들어요 😊)</span>
            </p>
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              💡 <strong>디자인만 참조됩니다.</strong> 위 스펙의 기능을 이 디자인 골격에 맞춰 만들어요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="ml-4 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            ✕ 닫기
          </button>
        </div>

        {/* 9개 카드 그리드 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PORTFOLIO_APPS.map((app) => (
            <div
              key={app.name}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              onMouseEnter={() => setHovered(app.name)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* 썸네일 */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={app.screenshot}
                  alt={app.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                {/* 호버 시 라이브 보기 링크 */}
                {hovered === app.name && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] text-white hover:bg-black/90"
                  >
                    라이브 보기 →
                  </a>
                )}
              </div>
              {/* 정보 */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {app.name}
                  </h4>
                  <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {app.layout}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {app.desc}
                </p>
                <button
                  type="button"
                  onClick={() => onSelect(app)}
                  className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  이 스타일로 →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 — 건너뛰기 */}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            건너뛰기 — 포비가 알아서 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
