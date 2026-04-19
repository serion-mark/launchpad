'use client';

// 에러 표시 — raw 에러 절대 노출 X
// 포비가 "잠깐 다시 시도할게요" + 자동 회복 중임을 표시

interface Props {
  message?: string;    // 간략 사유 (선택)
}

export default function FoundryError({ message }: Props) {
  return (
    <div
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
      data-testid="foundry-error"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">⚠️</span>
        <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
          잠깐 다시 시도할게요
        </span>
      </div>
      <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
        포비가 자동으로 해결 중...
        {message && (
          <span className="ml-1 opacity-60">({message.slice(0, 60)})</span>
        )}
      </div>
    </div>
  );
}
