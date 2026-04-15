'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: '대시보드', icon: 'chart', exact: true },
  { href: '/admin/inquiries', label: '문의 관리', icon: 'mail' },
  { href: '/admin/users', label: '사용자', icon: 'users' },
  { href: '/admin/projects', label: '프로젝트', icon: 'folder' },
  { href: '/admin/credits', label: '크레딧/결제', icon: 'credit' },
  { href: '/admin/ai-usage', label: 'AI 사용량', icon: 'brain' },
  { href: '/admin/system', label: '서비스 상태', icon: 'monitor' },
  { href: '/admin/settings', label: '설정', icon: 'settings' },
];

const THEMES = {
  light: {
    bg: '#ffffff', bg2: '#f0f0f5', border: '#d8d8e3',
    text: '#1a1a2e', textSec: '#4a4a6a', textMuted: '#9a9ab0',
    active: 'rgba(99,102,241,0.10)',
  },
  dark: {
    bg: '#12121a', bg2: '#1a1a26', border: '#2a2a3d',
    text: '#f1f5f9', textSec: '#94a3b8', textMuted: '#475569',
    active: 'rgba(99,102,241,0.15)',
  },
};

// 아이콘 (lucide 대신 inline SVG — 의존성 추가 없이)
function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { width: size, height: size, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 } as const;
  switch (name) {
    case 'chart': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'mail': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
    case 'users': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg>;
    case 'folder': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>;
    case 'credit': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
    case 'brain': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'monitor': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    case 'settings': return <svg {...s} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    default: return <svg {...s}><circle cx="12" cy="12" r="10"/></svg>;
  }
}

interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  pendingInquiryCount?: number;
}

export default function AdminSidebar({ theme, onToggleTheme, pendingInquiryCount = 0 }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const c = THEMES[theme];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const handleLogout = () => {
    localStorage.removeItem('launchpad_token');
    localStorage.removeItem('launchpad_user');
    window.location.href = '/admin';
  };

  return (
    <>
      {/* 모바일 햄버거 */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 60,
          width: 40, height: 40, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: c.bg, border: `1px solid ${c.border}`, color: c.text,
          cursor: 'pointer',
        }}
        className="lg:hidden"
      >
        {mobileOpen ? '\u2715' : '\u2630'}
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }}
          className="lg:hidden"
        />
      )}

      {/* 사이드바 */}
      <aside
        style={{
          width: 240, minHeight: '100vh', background: c.bg,
          borderRight: `1px solid ${c.border}`, color: c.text,
          display: 'flex', flexDirection: 'column',
          position: mobileOpen ? 'fixed' : undefined,
          top: 0, left: 0, zIndex: mobileOpen ? 50 : undefined,
        }}
        className={`hidden lg:flex ${mobileOpen ? '!flex' : ''}`}
      >
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 16px', borderBottom: `1px solid ${c.border}` }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #3182f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 15,
          }}>F</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Foundry Admin</div>
            <div style={{ fontSize: 11, color: c.textMuted }}>관리 시스템</div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const active = isActive(item);
            const badge = item.href === '/admin/inquiries' ? pendingInquiryCount : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 18px', margin: '2px 8px', borderRadius: 8,
                  fontSize: 14, fontWeight: active ? 600 : 500,
                  color: active ? '#6366f1' : c.textSec,
                  background: active ? c.active : 'transparent',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {badge > 0 && (
                  <span style={{
                    marginLeft: 'auto', background: '#ef4444', color: '#fff',
                    fontSize: 11, fontWeight: 700, padding: '1px 7px',
                    borderRadius: 10, minWidth: 20, textAlign: 'center',
                  }}>{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 하단: 테마 + 로그아웃 */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${c.border}` }}>
          <button onClick={onToggleTheme} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${c.border}`,
            background: 'transparent', color: c.textSec, fontSize: 12,
            cursor: 'pointer', marginBottom: 6,
          }}>
            {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${c.border}`,
            background: 'transparent', color: c.textMuted, fontSize: 12,
            cursor: 'pointer',
          }}>
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
