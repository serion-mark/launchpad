'use client';

// Agent가 도구를 호출할 때 채팅창에 표시되는 블록
// "💻 Bash: npm install" 같은 시각화 + 펼치기/접기

import { useState } from 'react';

interface Props {
  name: string;
  input: unknown;
  output?: string;
  ok?: boolean;
  durationMs?: number;
}

const TOOL_ICON: Record<string, string> = {
  Bash: '💻',
  Write: '📝',
  Read: '📖',
  Glob: '🔍',
  Grep: '🔎',
  AskUser: '❓',
};

function formatInput(name: string, input: any): string {
  if (!input || typeof input !== 'object') return '';
  switch (name) {
    case 'Bash':
      return input.command ?? '';
    case 'Write':
      return `${input.path ?? '?'} (${String(input.content ?? '').length} bytes)`;
    case 'Read':
    case 'Glob':
      return input.path ?? input.pattern ?? '';
    case 'Grep':
      return `"${input.pattern ?? ''}" ${input.path ? `in ${input.path}` : ''}`;
    case 'AskUser':
      return input.title ?? '(카드 발동)';
    default:
      return JSON.stringify(input).slice(0, 100);
  }
}

export default function ToolCallBlock({ name, input, output, ok, durationMs }: Props) {
  const [expanded, setExpanded] = useState(false);
  const icon = TOOL_ICON[name] ?? '🔧';
  const summary = formatInput(name, input);
  const running = output === undefined;

  const statusColor = running
    ? 'text-slate-400 dark:text-slate-500'
    : ok
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';
  const statusIcon = running ? '…' : ok ? '✓' : '✗';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 text-sm dark:border-slate-800 dark:bg-slate-900/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-base" aria-hidden>
          {icon}
        </span>
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {name}
        </span>
        <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400">
          {summary}
        </span>
        <span className={`font-mono text-xs ${statusColor}`}>{statusIcon}</span>
        {durationMs !== undefined && (
          <span className="text-xs text-slate-400">{durationMs}ms</span>
        )}
        <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && output !== undefined && (
        <pre className="max-h-64 overflow-auto border-t border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {output.slice(0, 4000)}
          {output.length > 4000 && '\n... (생략)'}
        </pre>
      )}
    </div>
  );
}
