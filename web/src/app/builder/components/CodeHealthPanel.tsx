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

type Props = {
  projectId: string;
  onRequestCleanup?: () => void;
};

const SEVERITY_COLORS = {
  low: { bg: 'bg-[#3b82f6]/20', text: 'text-[#60a5fa]', label: '낮음' },
  medium: { bg: 'bg-[#f59e0b]/20', text: 'text-[#fbbf24]', label: '보통' },
  high: { bg: 'bg-[#ef4444]/20', text: 'text-[#f87171]', label: '높음' },
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

export default function CodeHealthPanel({ projectId, onRequestCleanup }: Props) {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="bg-[#1e1e26] rounded-xl border border-[#2a2a35] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🩺</span>
          <span className="text-xs font-semibold text-[#f2f4f6]">코드 헬스체크</span>
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
          className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-[#2a2a35] hover:bg-[#33333f] text-[#8b8fa3] hover:text-[#f2f4f6] transition-colors disabled:opacity-50"
          onClick={runCheck}
          disabled={loading}
        >
          {loading ? '검사 중...' : result ? '다시 검사' : '검사하기'}
        </button>
      </div>

      {/* Result */}
      {result && expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Score Bar */}
          <div className="relative h-2 bg-[#17171c] rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{ width: `${result.score}%`, backgroundColor: getScoreColor(result.score) }}
            />
          </div>

          {/* Summary */}
          <p className="text-xs text-[#c0c4d0]">{result.summary}</p>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="space-y-1.5">
              {result.issues.map((issue, i) => {
                const sev = SEVERITY_COLORS[issue.severity];
                return (
                  <div key={i} className="flex items-center justify-between bg-[#17171c] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                      <span className="text-xs text-[#c0c4d0]">{issue.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cleanup Suggestion */}
          {result.suggestCleanup && onRequestCleanup && (
            <button
              className="w-full py-2.5 rounded-xl bg-[#6c5ce7]/20 hover:bg-[#6c5ce7]/30 text-[#a78bfa] text-xs font-semibold transition-colors border border-[#6c5ce7]/30"
              onClick={onRequestCleanup}
            >
              🧹 AI로 코드 정리하기 (크레딧 사용)
            </button>
          )}

          {result.issues.length === 0 && (
            <div className="text-center py-2">
              <span className="text-xs text-[#4ade80]">✅ 깨끗한 코드입니다!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
