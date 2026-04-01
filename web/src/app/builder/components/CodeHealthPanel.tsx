'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/api';

type HealthIssue = {
  type: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  description: string;
};

type HealthResult = {
  score: number;
  issues: HealthIssue[];
  summary: string;
  suggestCleanup: boolean;
};

type CleanupResult = {
  cleanedFiles: { path: string; content: string }[];
  totalCredits: number;
  improvements: string[];
  actualTier: string;
  fellBack: boolean;
};

type Props = {
  projectId: string;
  modelTier: 'flash' | 'smart' | 'pro';
  onCleanupComplete?: (result: CleanupResult) => void;
};

const SEVERITY_COLORS = {
  low: { bg: 'bg-[var(--toss-blue)]/20', text: 'text-[var(--toss-blue)]', label: '낮음' },
  medium: { bg: 'bg-[var(--toss-yellow)]/20', text: 'text-[var(--toss-yellow)]', label: '보통' },
  high: { bg: 'bg-[var(--toss-red)]/20', text: 'text-[var(--toss-red)]', label: '높음' },
};

function getScoreColor(score: number) {
  if (score >= 80) return '#4ade80';
  if (score >= 50) return '#fbbf24';
  return '#f87171';
}

function getScoreLabel(score: number) {
  if (score >= 90) return '우수';
  if (score >= 80) return '양호';
  if (score >= 60) return '보통';
  if (score >= 40) return '주의';
  return '위험';
}

export default function CodeHealthPanel({ projectId, modelTier, onCleanupComplete }: Props) {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/ai/health-check/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setExpanded(true);
      }
    } catch { /* */ }
    setLoading(false);
  };

  const runCleanup = async () => {
    if (!confirm('AI로 코드를 정리합니다. 크레딧이 차감됩니다. 진행하시겠습니까?')) return;
    setCleaning(true);
    try {
      const res = await authFetch('/ai/cleanup', {
        method: 'POST',
        body: JSON.stringify({ projectId, modelTier }),
      });
      if (res.ok) {
        const data: CleanupResult = await res.json();
        onCleanupComplete?.(data);
        // 정리 후 재검사
        await runCheck();
      }
    } catch { /* */ }
    setCleaning(false);
  };

  return (
    <div className="bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🩺</span>
          <span className="text-xs font-semibold text-[var(--text-primary)]">코드 헬스체크</span>
          {result && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${getScoreColor(result.score)}20`, color: getScoreColor(result.score) }}
            >
              {result.score}점 · {getScoreLabel(result.score)}
            </span>
          )}
        </div>
        <button
          className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          onClick={runCheck}
          disabled={loading || cleaning}
        >
          {loading ? '검사 중...' : result ? '다시 검사' : '검사하기'}
        </button>
      </div>

      {/* Result */}
      {result && expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Score Bar */}
          <div className="relative h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{ width: `${result.score}%`, backgroundColor: getScoreColor(result.score) }}
            />
          </div>

          {/* Summary */}
          <p className="text-xs text-[var(--text-primary)]">{result.summary}</p>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="space-y-1.5">
              {result.issues.map((issue, i) => {
                const sev = SEVERITY_COLORS[issue.severity];
                return (
                  <div key={i} className="flex items-center justify-between bg-[var(--bg-card)] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                      <span className="text-xs text-[var(--text-primary)]">{issue.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cleanup Button */}
          {result.suggestCleanup && (
            <button
              className="w-full py-2.5 rounded-xl bg-[var(--toss-purple)]/20 hover:bg-[var(--toss-purple)]/30 text-[var(--toss-purple)] text-xs font-semibold transition-colors border border-[var(--toss-purple)]/30 disabled:opacity-50"
              onClick={runCleanup}
              disabled={cleaning}
            >
              {cleaning ? '🔄 AI 정리 중...' : '🧹 AI로 코드 정리하기 (크레딧 사용)'}
            </button>
          )}

          {result.issues.length === 0 && (
            <div className="text-center py-2">
              <span className="text-xs text-[var(--toss-green)]">✅ 깨끗한 코드입니다!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
