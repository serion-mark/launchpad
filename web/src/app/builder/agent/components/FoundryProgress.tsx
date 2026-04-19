'use client';

// 포비가 작업 중 — Notion 풍 7단계 표 (클로드 냄새 0)
// 단계 이모지: 📋 의도 / 📦 셋업 / 🎨 디자인 / 📄 페이지 / 🔍 검증 / 🗄 DB / 🌐 배포
// Foundry 블루 #3182F6

export const STAGES = [
  { id: 'intent',   label: '의도 파악',    emoji: '📋' },
  { id: 'setup',    label: '프로젝트 셋업', emoji: '📦' },
  { id: 'design',   label: '디자인 시스템', emoji: '🎨' },
  { id: 'pages',    label: '페이지 작성',   emoji: '📄' },
  { id: 'verify',   label: '빌드 검증',     emoji: '🔍' },
  { id: 'database', label: '데이터베이스',  emoji: '🗄' },
  { id: 'deploy',   label: '서버 배포',     emoji: '🌐' },
] as const;

export type StageId = typeof STAGES[number]['id'];

interface Props {
  currentStage: StageId | null;
  currentLabel: string;
  completed: Set<StageId>;
  percent: number;
  elapsedMs: number;
  times?: Partial<Record<StageId, string>>;  // 각 단계 소요 시간 표시 (옵션)
}

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export default function FoundryProgress({
  currentStage,
  currentLabel,
  completed,
  percent,
  elapsedMs,
  times,
}: Props) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
      data-testid="foundry-progress"
    >
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">
          🌗 포비가 작업 중
        </h3>
        <span className="text-xs text-slate-500 tabular-nums">
          {fmtElapsed(elapsedMs)}
        </span>
      </div>

      {/* 진행률 바 (Foundry 블루) */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: '#3182F6' }}
        />
      </div>

      {/* 단계 표 (Notion 풍) */}
      <div className="space-y-1">
        {STAGES.map((stage) => {
          const isCompleted = completed.has(stage.id);
          const isCurrent = stage.id === currentStage;
          return (
            <div
              key={stage.id}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isCurrent ? 'bg-blue-50 dark:bg-blue-950/40' : '',
              ].join(' ')}
            >
              {/* 상태 아이콘 */}
              <div className="flex h-5 w-5 items-center justify-center text-sm">
                {isCompleted ? (
                  <span className="text-emerald-500">✓</span>
                ) : isCurrent ? (
                  <span className="animate-pulse">{stage.emoji}</span>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600">{stage.emoji}</span>
                )}
              </div>

              {/* 라벨 + 현재 상세 */}
              <div className="flex-1">
                <div
                  className={[
                    'text-sm font-medium',
                    isCompleted
                      ? 'text-slate-500 dark:text-slate-400'
                      : isCurrent
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500',
                  ].join(' ')}
                >
                  {stage.label}
                </div>
                {isCurrent && currentLabel && (
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    ↳ {currentLabel}
                  </div>
                )}
              </div>

              {/* 시간 */}
              <div className="text-xs tabular-nums text-slate-400">
                {times?.[stage.id] ?? ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
