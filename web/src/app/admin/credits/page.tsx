'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

type CreditRow = {
  id: string; type: string; amount: number; balanceAfter: number; description: string | null;
  taskType: string | null; modelTier: string | null; userEmail: string; userName: string | null; createdAt: string;
};

const TYPE_COLORS: Record<string, string> = {
  CHARGE: '#22c55e', USE: '#ef4444', REFUND: '#eab308', SIGNUP_BONUS: '#3182f6', FREE_TRIAL: '#a855f7',
};

export default function AdminCreditsPage() {
  const [credits, setCredits] = useState<{ transactions: CreditRow[]; total: number; pages: number } | null>(null);
  const [page, setPage] = useState(1);

  const load = (p: number) => {
    authFetch(`/admin/credits?page=${p}&limit=30`).then(r => r.ok ? r.json() : null).then(d => d && setCredits(d));
  };

  useEffect(() => { load(1); }, []);

  if (!credits) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--adm-text-muted)' }}>불러오는 중...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>크레딧/결제</h1>

      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--adm-surface-2)' }}>
              {['타입', '금액', '잔액', '설명', '사용자', '일시'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--adm-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {credits.transactions.map(t => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--adm-border)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: TYPE_COLORS[t.type] || 'var(--adm-text-sec)' }}>{t.type}</span>
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: t.amount > 0 ? '#22c55e' : '#ef4444' }}>
                  {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--adm-text-sec)' }}>{t.balanceAfter.toLocaleString()}</td>
                <td style={{ padding: '10px 16px', color: 'var(--adm-text-sec)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '-'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--adm-text-muted)' }}>{t.userEmail}</td>
                <td style={{ padding: '10px 16px', color: 'var(--adm-text-muted)', fontSize: 12 }}>{new Date(t.createdAt).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 13, color: 'var(--adm-text-sec)' }}>
        <span>총 {credits.total}건</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: Math.min(credits.pages, 10) }, (_, i) => (
            <button key={i} onClick={() => { setPage(i + 1); load(i + 1); }}
              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', background: page === i + 1 ? '#3182f6' : 'var(--adm-surface-2)', color: page === i + 1 ? '#fff' : 'var(--adm-text-sec)' }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
