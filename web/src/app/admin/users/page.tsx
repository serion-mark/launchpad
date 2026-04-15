'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

type UserRow = {
  id: string; email: string; name: string | null; plan: string; provider: string;
  credits: number; totalCharged: number; totalUsed: number; projectCount: number; createdAt: string;
};

const PLAN_NAMES: Record<string, string> = { free: '무료', starter: '크레딧 충전', pro: '크레딧 충전' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<{ users: UserRow[]; total: number; pages: number } | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = (p: number, s?: string) => {
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (s || search) params.set('search', s ?? search);
    authFetch(`/admin/users?${params}`).then(r => r.ok ? r.json() : null).then(d => d && setUsers(d));
  };

  useEffect(() => { load(1); }, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>사용자 관리</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (setPage(1), load(1))}
          placeholder="이메일 또는 이름 검색..."
          style={{ flex: 1, borderRadius: 12, border: '1px solid var(--adm-border)', background: 'var(--adm-surface-2)', padding: '10px 16px', fontSize: 14, color: 'var(--adm-text)', outline: 'none' }}
        />
        <button onClick={() => { setPage(1); load(1); }} style={{ borderRadius: 12, border: 'none', background: '#3182f6', color: '#fff', padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>검색</button>
      </div>

      {users && (
        <>
          <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--adm-surface-2)' }}>
                  {['이메일', '이름', '플랜', '크레딧', '프로젝트', '가입일'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--adm-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.users.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--adm-border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500 }}>{u.email}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--adm-text-sec)' }}>{u.name || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: u.plan === 'free' ? 'var(--adm-surface-2)' : 'rgba(49,130,246,0.1)', color: u.plan === 'free' ? 'var(--adm-text-sec)' : '#3182f6' }}>
                        {PLAN_NAMES[u.plan] || u.plan}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#eab308' }}>{u.credits.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px' }}>{u.projectCount}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--adm-text-muted)', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: 'var(--adm-text-sec)' }}>
            <span>총 {users.total}명</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: Math.min(users.pages, 10) }, (_, i) => (
                <button key={i} onClick={() => { setPage(i + 1); load(i + 1); }}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', background: page === i + 1 ? '#3182f6' : 'var(--adm-surface-2)', color: page === i + 1 ? '#fff' : 'var(--adm-text-sec)' }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
