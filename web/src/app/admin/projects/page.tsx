'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

type ProjectRow = {
  id: string; name: string; template: string; theme: string; status: string;
  userEmail: string; userName: string | null; createdAt: string;
};

const TEMPLATE_NAMES: Record<string, string> = {
  'beauty-salon': '미용실 POS', 'booking-crm': '범용 예약/CRM', 'ecommerce': '쇼핑몰/커머스',
  'o2o-matching': 'O2O 매칭', 'edutech': '에듀테크', 'facility-mgmt': '관리업체',
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<{ projects: ProjectRow[]; total: number; pages: number } | null>(null);
  const [filter, setFilter] = useState('');

  const load = (p: number, t?: string) => {
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (t || filter) params.set('template', t ?? filter);
    authFetch(`/admin/projects?${params}`).then(r => r.ok ? r.json() : null).then(d => d && setProjects(d));
  };

  useEffect(() => { load(1); }, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>프로젝트 관리</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => { setFilter(''); load(1, ''); }}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer', background: !filter ? '#3182f6' : 'var(--adm-surface-2)', color: !filter ? '#fff' : 'var(--adm-text-sec)' }}>
          전체
        </button>
        {Object.entries(TEMPLATE_NAMES).map(([id, name]) => (
          <button key={id} onClick={() => { setFilter(id); load(1, id); }}
            style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, cursor: 'pointer', background: filter === id ? '#3182f6' : 'var(--adm-surface-2)', color: filter === id ? '#fff' : 'var(--adm-text-sec)' }}>
            {name}
          </button>
        ))}
      </div>

      {projects && (
        <>
          <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--adm-surface-2)' }}>
                  {['프로젝트명', '템플릿', '상태', '사용자', '생성일'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--adm-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.projects.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--adm-border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '10px 16px' }}>{TEMPLATE_NAMES[p.template] || p.template}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: p.status === 'deployed' ? 'rgba(49,130,246,0.1)' : p.status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--adm-surface-2)',
                        color: p.status === 'deployed' ? '#3182f6' : p.status === 'active' ? '#22c55e' : 'var(--adm-text-sec)',
                      }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--adm-text-sec)' }}>{p.userEmail}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--adm-text-muted)', fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--adm-text-sec)' }}>총 {projects.total}개 프로젝트</div>
        </>
      )}
    </div>
  );
}
