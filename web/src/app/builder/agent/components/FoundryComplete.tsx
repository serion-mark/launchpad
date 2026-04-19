'use client';

// 완료 카드 — 포비 정체성 (Foundry 블루 그라데이션 + 인사이트 1개)

import Link from 'next/link';
import MarkdownRenderer from '@/app/components/MarkdownRenderer';

interface Props {
  projectName?: string;
  projectId?: string;
  previewUrl?: string;      // 서브도메인 배포됐다면 자동 설정
  insight?: string;          // 완료 후 제안 1개 (Agent가 보낸 텍스트)
  onEditClick: () => void;   // "추가 수정" — 채팅 입력 포커스
}

export default function FoundryComplete({
  projectName,
  projectId,
  previewUrl,
  insight,
  onEditClick,
}: Props) {
  return (
    <div
      className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 dark:border-blue-900 dark:from-blue-950/40 dark:to-slate-900"
      data-testid="foundry-complete"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl">✅</span>
        <h3 className="font-bold text-slate-900 dark:text-white">
          {projectName ? `${projectName} 완성!` : '완성됐어요!'}
        </h3>
      </div>

      {previewUrl && (
        <div className="my-3 rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-1 text-xs text-slate-500">🌐 작동하는 URL (1일 무료)</div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-mono text-blue-600 hover:underline dark:text-blue-400"
          >
            {previewUrl}
          </a>
        </div>
      )}

      {insight && (
        <div className="my-3 rounded-lg border border-amber-100 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            💡 한 가지 제안
          </div>
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <MarkdownRenderer content={insight} />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {projectId && (
          <Link
            href={`/builder/agent?projectId=${projectId}`}
            className="flex flex-1 items-center justify-center rounded-xl py-3 text-sm font-medium text-white transition hover:brightness-110"
            style={{ backgroundColor: '#3182F6' }}
          >
            📁 내 프로젝트에서 열기
          </Link>
        )}
        <button
          type="button"
          onClick={onEditClick}
          className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
        >
          💬 추가 수정
        </button>
      </div>
    </div>
  );
}
