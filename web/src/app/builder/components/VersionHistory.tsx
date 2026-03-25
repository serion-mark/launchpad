'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

type Version = {
  version: number;
  createdAt: string;
  description: string;
  fileCount?: number;
  modifiedPaths?: string[];
};

type Props = {
  projectId: string;
  onRollback?: (version: number) => void;
};

export default function VersionHistory({ projectId, onRollback }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchVersions = async () => {
    try {
      const res = await authFetch(`/projects/${projectId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
        setCurrentVersion(data.currentVersion || 1);
      }
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchVersions();
  }, [projectId]);

  const handleRollback = async (version: number) => {
    if (!confirm(`v${version}으로 되돌리시겠습니까? 현재 코드는 자동으로 백업됩니다.`)) return;
    setRolling(version);
    try {
      const res = await authFetch(`/projects/${projectId}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ version }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentVersion(data.currentVersion);
        await fetchVersions();
        onRollback?.(version);
      }
    } catch { /* */ }
    setRolling(null);
  };

  if (loading || versions.length === 0) return null;

  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const current = sorted.find(v => v.version === currentVersion) || sorted[0];

  return (
    <div className="bg-[#1e1e26] rounded-xl border border-[#2a2a35] overflow-hidden">
      {/* Header — 접힌 상태: 현재 버전 1줄만 표시 */}
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#23232e] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm">🕐</span>
          <span className="text-xs font-semibold text-[#f2f4f6]">버전 히스토리</span>
          <span className="text-[10px] text-[#8b8fa3] bg-[#2a2a35] px-2 py-0.5 rounded-full">
            v{currentVersion}
          </span>
          {!expanded && current && (
            <span className="text-[10px] text-[#6b7080] truncate">{current.description}</span>
          )}
        </div>
        <span className="text-[#8b8fa3] text-xs ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Version List — 펼쳤을 때만 표시 */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 max-h-[300px] overflow-y-auto">
          {sorted.map((v) => (
            <div
              key={v.version}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                v.version === currentVersion
                  ? 'bg-[#2a2a35] border border-[#6c5ce7]/50'
                  : 'bg-[#17171c] hover:bg-[#1e1e26]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#8b8fa3]">v{v.version}</span>
                  {v.version === currentVersion && (
                    <span className="text-[9px] bg-[#6c5ce7] text-white px-1.5 py-0.5 rounded">현재</span>
                  )}
                </div>
                <p className="text-[#c0c4d0] truncate mt-0.5">{v.description}</p>
                <div className="flex items-center gap-3 mt-1 text-[#6b7080]">
                  <span>{new Date(v.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  {v.fileCount != null && <span>{v.fileCount}개 파일</span>}
                </div>
              </div>

              {v.version !== currentVersion && (
                <button
                  className="ml-2 px-2.5 py-1.5 rounded-lg bg-[#2a2a35] hover:bg-[#6c5ce7]/30 text-[#8b8fa3] hover:text-[#f2f4f6] transition-colors text-[10px] font-medium whitespace-nowrap disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); handleRollback(v.version); }}
                  disabled={rolling !== null}
                >
                  {rolling === v.version ? '⏳' : '↩ 되돌리기'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
