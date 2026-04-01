'use client';

type ProjectContext = {
  completedFeatures?: string[];
  pendingFeatures?: string[];
  lastAction?: string;
  userPreferences?: {
    model?: string;
    theme?: string;
  };
  conversationSummary?: string;
};

type Props = {
  projectName: string;
  context: ProjectContext | null;
  currentVersion: number;
  totalModifications: number;
  onContinue: () => void;
  onStartFresh: () => void;
};

export default function WelcomeBack({
  projectName,
  context,
  currentVersion,
  totalModifications,
  onContinue,
  onStartFresh,
}: Props) {
  if (!context || !context.lastAction) return null;

  const completed = context.completedFeatures || [];
  const pending = context.pendingFeatures || [];

  return (
    <div className="bg-gradient-to-br from-[var(--bg-subtle)] to-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--toss-purple)]/20 flex items-center justify-center text-lg">
          👋
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            다시 오셨군요!
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)]">
            <b>{projectName}</b> 프로젝트 작업을 이어서 할 수 있습니다
          </p>
        </div>
      </div>

      {/* Last Action */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 mb-3">
        <div className="text-[10px] text-[var(--text-tertiary)] mb-1">마지막 작업</div>
        <div className="text-xs text-[var(--text-primary)]">{context.lastAction}</div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[var(--bg-card)] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-[var(--text-tertiary)]">버전</div>
          <div className="text-sm font-bold text-[var(--text-primary)]">v{currentVersion}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-[var(--text-tertiary)]">수정 횟수</div>
          <div className="text-sm font-bold text-[var(--text-primary)]">{totalModifications}회</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-[var(--text-tertiary)]">완료 기능</div>
          <div className="text-sm font-bold text-[var(--toss-purple)]">{completed.length}개</div>
        </div>
      </div>

      {/* Features Progress */}
      {(completed.length > 0 || pending.length > 0) && (
        <div className="mb-3">
          {completed.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-[var(--text-tertiary)] mb-1">✅ 완료된 기능</div>
              <div className="flex flex-wrap gap-1">
                {completed.map((f, i) => (
                  <span key={i} className="text-[10px] bg-[#16a34a]/20 text-[var(--toss-green)] px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}
          {pending.length > 0 && (
            <div>
              <div className="text-[10px] text-[var(--text-tertiary)] mb-1">🔲 남은 기능</div>
              <div className="flex flex-wrap gap-1">
                {pending.map((f, i) => (
                  <span key={i} className="text-[10px] bg-[var(--toss-yellow)]/20 text-[var(--toss-yellow)] px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="flex-1 py-2.5 rounded-xl bg-[var(--toss-purple)] hover:bg-[var(--toss-purple)] text-white text-xs font-semibold transition-colors"
          onClick={onContinue}
        >
          ▶ 이어서 작업하기
        </button>
        <button
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-medium transition-colors"
          onClick={onStartFresh}
        >
          처음부터
        </button>
      </div>
    </div>
  );
}
