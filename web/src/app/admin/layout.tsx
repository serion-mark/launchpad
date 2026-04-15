'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, getUser, API_BASE } from '@/lib/api';
import AdminSidebar from './components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);
  // 로그인 폼
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    // 테마 복원
    const saved = localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);

    const user = getUser();
    if (!user) {
      setIsAdmin(false);
      setReady(true);
      return;
    }

    // 어드민 권한 확인
    authFetch('/admin/dashboard')
      .then(res => {
        if (res.ok) {
          setIsAdmin(true);
          // 미답변 문의 수 조회
          authFetch('/inquiry/pending').then(r => r.ok ? r.json() : null).then(d => {
            if (d) setPendingInquiryCount(d.count ?? 0);
          });
        } else {
          setIsAdmin(false);
        }
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.message || '로그인 실패'); return; }
      localStorage.setItem('launchpad_token', data.token);
      localStorage.setItem('launchpad_user', JSON.stringify({ userId: data.userId, email: data.email }));
      // 어드민 재확인
      const check = await authFetch('/admin/dashboard');
      if (check.ok) {
        setIsAdmin(true);
        authFetch('/inquiry/pending').then(r => r.ok ? r.json() : null).then(d => {
          if (d) setPendingInquiryCount(d.count ?? 0);
        });
      } else {
        setIsAdmin(false);
        setLoginError('관리자 권한이 없는 계정입니다.');
      }
    } catch {
      setLoginError('서버 연결 오류');
    } finally {
      setLoginLoading(false);
    }
  };

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // 어드민 전용 CSS 변수
  const vars = theme === 'light' ? {
    '--adm-bg': '#f5f5f7',
    '--adm-surface': '#ffffff',
    '--adm-surface-2': '#f0f0f5',
    '--adm-border': '#d8d8e3',
    '--adm-text': '#1a1a2e',
    '--adm-text-sec': '#4a4a6a',
    '--adm-text-muted': '#9a9ab0',
    '--adm-hover': 'rgba(99,102,241,0.06)',
  } : {
    '--adm-bg': '#0a0a0f',
    '--adm-surface': '#12121a',
    '--adm-surface-2': '#1a1a26',
    '--adm-border': '#2a2a3d',
    '--adm-text': '#f1f5f9',
    '--adm-text-sec': '#94a3b8',
    '--adm-text-muted': '#475569',
    '--adm-hover': 'rgba(99,102,241,0.04)',
  };

  // 로딩 중
  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f7', color: '#9a9ab0' }}>
        불러오는 중...
      </div>
    );
  }

  // 로그인 필요
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: theme === 'dark' ? '#0a0a0f' : '#f5f5f7', color: theme === 'dark' ? '#f1f5f9' : '#1a1a2e' }}>
        <div style={{ width: '100%', maxWidth: 380, padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
              background: 'linear-gradient(135deg, #3182f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 20,
            }}>F</div>
            <span style={{ display: 'inline-block', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 8 }}>ADMIN</span>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 16 }}>관리자 로그인</h1>
            <p style={{ fontSize: 14, color: theme === 'dark' ? '#94a3b8' : '#4a4a6a', marginTop: 4 }}>관리자 계정으로 로그인해주세요</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
              placeholder="관리자 이메일" required
              style={{ width: '100%', borderRadius: 12, border: `1px solid ${theme === 'dark' ? '#2a2a3d' : '#d8d8e3'}`, background: theme === 'dark' ? '#1a1a26' : '#f0f0f5', padding: '14px 16px', fontSize: 14, color: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <input
              type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
              placeholder="비밀번호" required
              style={{ width: '100%', borderRadius: 12, border: `1px solid ${theme === 'dark' ? '#2a2a3d' : '#d8d8e3'}`, background: theme === 'dark' ? '#1a1a26' : '#f0f0f5', padding: '14px 16px', fontSize: 14, color: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            {loginError && <p style={{ fontSize: 13, color: '#ef4444' }}>{loginError}</p>}
            <button type="submit" disabled={loginLoading} style={{
              width: '100%', borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff',
              padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: loginLoading ? 'not-allowed' : 'pointer', opacity: loginLoading ? 0.5 : 1,
            }}>
              {loginLoading ? '로그인 중...' : '어드민 로그인'}
            </button>
          </form>
          <a href="/" style={{ display: 'block', marginTop: 24, textAlign: 'center', fontSize: 14, color: theme === 'dark' ? '#475569' : '#9a9ab0', textDecoration: 'none' }}>
            ← 메인으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', ...vars as React.CSSProperties, background: 'var(--adm-bg)', color: 'var(--adm-text)' }}>
      <AdminSidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        pendingInquiryCount={pendingInquiryCount}
      />
      <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {children}
      </main>
    </div>
  );
}
