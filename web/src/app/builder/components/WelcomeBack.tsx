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
    <div className="bg-gradient-to-br from-[#1e1e26] to-[#23232e] rounded-2xl border border-[#2a2a35] p-5 mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#6c5ce7]/20 flex items-center justify-center text-lg">
          👋
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#f2f4f6]">
            다시 오셨군요!
          </h3>
          <p className="text-[11px] text-[#8b8fa3]">
            <b>{projectName}</b> 프로젝트 작업을 이어서 할 수 있습니다
          </p>
        </div>
      </div>

      {/* Last Action */}
      <div className="bg-[#17171c] rounded-xl p-3 mb-3">
        <div className="text-[10px] text-[#6b7080] mb-1">마지막 작업</div>
        <div className="text-xs text-[#c0c4d0]">{context.lastAction}</div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#17171c] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-[#6b7080]">버전</div>
          <div className="text-sm font-bold text-[#f2f4f6]">v{currentVersion}</div>
        </div>
        <div className="bg-[#17171c] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-[#6b7080]">수정 횟수</div>
          <div className="text-sm font-bold text-[#f2f4f6]">{totalModifications}회</div>
        </div>
        <div className="bg-[#17171c] rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-[#6b7080]">완료 기능</div>
          <div className="text-sm font-bold text-[#6c5ce7]">{completed.length}개</div>
        </div>
      </div>

      {/* Features Progress */}
      {(completed.length > 0 || pending.length > 0) && (
        <div className="mb-3">
          {completed.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-[#6b7080] mb-1">✅ 완료된 기능</div>
              <div className="flex flex-wrap gap-1">
                {completed.map((f, i) => (
                  <span key={i} className="text-[10px] bg-[#16a34a]/20 text-[#4ade80] px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}
          {pending.length > 0 && (
            <div>
              <div className="text-[10px] text-[#6b7080] mb-1">🔲 남은 기능</div>
              <div className="flex flex-wrap gap-1">
                {pending.map((f, i) => (
                  <span key={i} className="text-[10px] bg-[#f59e0b]/20 text-[#fbbf24] px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="flex-1 py-2.5 rounded-xl bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white text-xs font-semibold transition-colors"
          onClick={onContinue}
        >
          ▶ 이어서 작업하기
        </button>
        <button
          className="px-4 py-2.5 rounded-xl bg-[#2a2a35] hover:bg-[#33333f] text-[#8b8fa3] text-xs font-medium transition-colors"
          onClick={onStartFresh}
        >
          처음부터
        </button>
      </div>
    </div>
  );
}
