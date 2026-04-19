'use client';

// 어드민 전용: Agent Mode 세션별 비용 로그
// 서버 PM2 로그의 [cost] END 라인을 파싱해서 표시
// ⚠️ 고객 UI 노출 금지 — admin 이메일 화이트리스트 통과해야 접근 가능

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

type CostEntry = {
  ts: string;
  sessionId: string;
  userId: string | null;
  email: string | null;
  projectId: string | null;
  name: string;
  iter: number;
  totalUsd: number;
  durationMs: number;
  isEdit: boolean;
  fileCount: number;
};

type UserAgg = {
  userId: string | null;
  email: string | null;
  sessions: number;
  createCount: number;
  editCount: number;
  totalUsd: number;
};

type CostData = {
  total: number;
  entries: CostEntry[];
  summary: {
    totalSessions: number;
    totalUsd: number;
    createSessions: { count: number; totalUsd: number };
    editSessions: { count: number; totalUsd: number };
    avgUsdPerSession: number;
    byUser: UserAgg[];
  };
};

function fmtDuration(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}초`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}분 ${s}초`;
}

export default function AdminAgentCostPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/admin/agent-cost-logs?limit=200');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message ?? '불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--adm-text-muted)' }}>불러오는 중...</div>;
  }
  if (error || !data) {
    return (
      <div style={{ padding: 40, color: 'var(--adm-text-muted)' }}>
        <div style={{ color: '#ef4444', marginBottom: 12 }}>에러: {error ?? 'no data'}</div>
        <button onClick={load} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-sec)', cursor: 'pointer' }}>
          다시 시도
        </button>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Agent Mode 비용</h1>
        <button onClick={load} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--adm-border)', background: 'transparent', color: 'var(--adm-text-sec)', fontSize: 12, cursor: 'pointer' }}>
          🔄 새로고침
        </button>
      </div>

      {/* 요약 카드 4개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <SummaryCard label="총 세션" value={`${s.totalSessions}회`} color="#3182f6" />
        <SummaryCard label="총 비용" value={`$${s.totalUsd.toFixed(4)}`} color="#eab308" />
        <SummaryCard label="앱 만들기" value={`${s.createSessions.count}회 · $${s.createSessions.totalUsd.toFixed(4)}`} color="#22c55e" />
        <SummaryCard label="수정" value={`${s.editSessions.count}회 · $${s.editSessions.totalUsd.toFixed(4)}`} color="#a855f7" />
      </div>

      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 24, fontSize: 13, flexWrap: 'wrap' }}>
        <div><span style={{ color: 'var(--adm-text-sec)' }}>평균 비용/세션:</span> <span style={{ fontFamily: 'monospace', marginLeft: 6 }}>${s.avgUsdPerSession.toFixed(4)}</span></div>
        <div><span style={{ color: 'var(--adm-text-sec)' }}>앱당 평균:</span> <span style={{ fontFamily: 'monospace', marginLeft: 6 }}>${s.createSessions.count > 0 ? (s.createSessions.totalUsd / s.createSessions.count).toFixed(4) : '0.0000'}</span></div>
        <div><span style={{ color: 'var(--adm-text-sec)' }}>수정당 평균:</span> <span style={{ fontFamily: 'monospace', marginLeft: 6 }}>${s.editSessions.count > 0 ? (s.editSessions.totalUsd / s.editSessions.count).toFixed(4) : '0.0000'}</span></div>
      </div>

      {/* 사용자별 집계 */}
      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--adm-border)', fontSize: 13, fontWeight: 600 }}>
          사용자별 집계 ({s.byUser.length}명)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--adm-bg2)', color: 'var(--adm-text-sec)' }}>
                <th style={th}>이메일</th>
                <th style={thNum}>세션</th>
                <th style={thNum}>🏗 만들기</th>
                <th style={thNum}>✏️ 수정</th>
                <th style={thNum}>총 비용 ($)</th>
                <th style={thNum}>세션당 평균 ($)</th>
              </tr>
            </thead>
            <tbody>
              {s.byUser.map((u, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--adm-border)' }}>
                  <td style={td}>
                    {u.email ? (
                      <span style={{ fontWeight: 500 }}>{u.email}</span>
                    ) : (
                      <span style={{ color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                        {u.userId ?? '(anon 또는 구포맷)'}
                      </span>
                    )}
                  </td>
                  <td style={tdNum}>{u.sessions}</td>
                  <td style={{ ...tdNum, color: '#22c55e' }}>{u.createCount}</td>
                  <td style={{ ...tdNum, color: '#a855f7' }}>{u.editCount}</td>
                  <td style={{ ...tdNum, color: '#eab308', fontWeight: 700 }}>${u.totalUsd.toFixed(4)}</td>
                  <td style={tdNum}>${u.sessions > 0 ? (u.totalUsd / u.sessions).toFixed(4) : '0.0000'}</td>
                </tr>
              ))}
              {s.byUser.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                    사용자별 집계 가능한 로그 없음 (신포맷 로그 쌓이면 자동 표시)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 세션 테이블 */}
      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--adm-border)', fontSize: 13, fontWeight: 600 }}>
          최근 세션 (최대 {data.entries.length}/{data.total}건)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--adm-bg2)', color: 'var(--adm-text-sec)' }}>
                <th style={th}>시각</th>
                <th style={th}>사용자</th>
                <th style={th}>유형</th>
                <th style={th}>이름</th>
                <th style={thNum}>iter</th>
                <th style={thNum}>파일</th>
                <th style={thNum}>소요</th>
                <th style={thNum}>비용 ($)</th>
                <th style={th}>projectId</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--adm-border)' }}>
                  <td style={td}>{e.ts}</td>
                  <td style={td}>
                    {e.email ? (
                      <span style={{ fontSize: 11 }}>{e.email}</span>
                    ) : (
                      <span style={{ color: 'var(--adm-text-muted)', fontSize: 11, fontStyle: 'italic' }}>
                        {e.userId ? e.userId.slice(-8) : 'anon'}
                      </span>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: e.isEdit ? '#a855f7' : '#22c55e', background: e.isEdit ? '#a855f71a' : '#22c55e1a' }}>
                      {e.isEdit ? '✏️ 수정' : '🏗 만들기'}
                    </span>
                  </td>
                  <td style={td}>{e.name || <span style={{ color: 'var(--adm-text-muted)' }}>(빈 draft)</span>}</td>
                  <td style={tdNum}>{e.iter}</td>
                  <td style={tdNum}>{e.fileCount}</td>
                  <td style={tdNum}>{fmtDuration(e.durationMs)}</td>
                  <td style={{ ...tdNum, color: '#eab308', fontWeight: 600 }}>${e.totalUsd.toFixed(4)}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 10, color: 'var(--adm-text-muted)' }}>{e.projectId ? e.projectId.slice(-12) : '—'}</td>
                </tr>
              ))}
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                    로그에 아직 Agent 세션이 없습니다. (배포 이후 새 Agent 세션 종료부터 기록됨)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, fontSize: 11, color: 'var(--adm-text-muted)', background: 'var(--adm-surface)', borderRadius: 10, border: '1px solid var(--adm-border)' }}>
        ⓘ 출처: <code>/root/.pm2/logs/launchpad-api-out.log</code> 의 <code>[cost] ... END</code> 라인.
        단가: Sonnet 4.6 (input $3 / output $15 per 1M tok).
        이 페이지는 admin 이메일 화이트리스트만 접근 가능하며, 고객 UI에서는 비용이 보이지 않습니다.
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: 'var(--adm-text-sec)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 11 };
const thNum: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 12 };
const tdNum: React.CSSProperties = { ...td, textAlign: 'right', fontFamily: 'monospace' };
