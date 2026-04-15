'use client';

import { getUser } from '@/lib/api';

export default function AdminSettingsPage() {
  const user = typeof window !== 'undefined' ? getUser() : null;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>설정</h1>

      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px', marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>관리자 정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0' }}>
            <span style={{ color: 'var(--adm-text-muted)' }}>이메일</span>
            <span style={{ fontWeight: 500 }}>{user?.email || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0' }}>
            <span style={{ color: 'var(--adm-text-muted)' }}>역할</span>
            <span style={{ fontWeight: 500, color: '#ef4444' }}>관리자 (ADMIN)</span>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>관리자 화이트리스트</h3>
        <p style={{ fontSize: 13, color: 'var(--adm-text-sec)', lineHeight: 1.7 }}>
          관리자 계정은 서버 환경변수(ADMIN_EMAILS)로 관리됩니다.<br />
          현재 등록: admin@serion.ai.kr, mark@serion.ai.kr, mark@foundry.kr
        </p>
      </div>
    </div>
  );
}
