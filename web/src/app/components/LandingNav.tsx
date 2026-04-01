'use client';

import { useState, useEffect, useRef } from 'react';
import { getUser, logout } from '@/lib/api';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

const NAV_LINKS = [
  { href: '/#features', label: '기능' },
  { href: '/meeting', label: 'AI 회의실' },
  { href: '/portfolio', label: '포트폴리오' },
  { href: '/pricing', label: '가격표' },
  { href: '/guide', label: '사용법' },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const user = getUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 프로필 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-[var(--border-primary)] bg-[var(--bg-card)]/95 backdrop-blur-md' : 'border-transparent bg-transparent'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        {/* 로고 */}
        <a href="/" className="flex items-center gap-1.5">
          <Logo />
        </a>

        {/* 데스크톱 메뉴 */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 우측 버튼 */}
        <div className="hidden md:flex items-center gap-2.5">
          <ThemeToggle />
          {user ? (
            <>
              <a href="/dashboard" className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors">
                내 프로젝트
              </a>
              {/* 프로필 드롭다운 */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-[var(--toss-blue)]/20 text-[var(--toss-blue)] text-sm font-bold hover:bg-[var(--toss-blue)]/30 transition-colors"
                  title="마이페이지"
                >
                  {user.email.charAt(0).toUpperCase()}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-48 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl py-2 z-50">
                    <p className="px-4 py-2 text-xs text-[var(--text-tertiary)] truncate border-b border-[var(--border-primary)] mb-1">{user.email}</p>
                    <a href="/mypage" className="block px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                      마이페이지
                    </a>
                    <a href="/mypage#credit" className="block px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                      크레딧 관리
                    </a>
                    <a href="/mypage#billing" className="block px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                      정산
                    </a>
                    <div className="border-t border-[var(--border-primary)] mt-1 pt-1">
                      <button onClick={logout} className="block w-full text-left px-4 py-2.5 text-sm text-[var(--toss-red)] hover:bg-[var(--bg-elevated)] transition-colors">
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a href="/login" className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                로그인
              </a>
              <a href="/start" className="rounded-xl bg-[var(--toss-blue)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors">
                시작하기
              </a>
            </>
          )}
        </div>

        {/* 모바일: 테마 토글 + 햄버거 */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            className="flex flex-col gap-1.5 p-2"
          aria-label="메뉴"
        >
          <span className={`block h-0.5 w-5 bg-[var(--text-secondary)] transition-all ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-5 bg-[var(--text-secondary)] transition-all ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-5 bg-[var(--text-secondary)] transition-all ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {open && (
        <div className="md:hidden border-t border-[var(--border-primary)] bg-[var(--bg-card)] px-5 py-4 space-y-1">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="border-t border-[var(--border-primary)] pt-3 mt-3 space-y-2">
            {user ? (
              <>
                <a href="/dashboard" className="block rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm font-semibold text-center text-[var(--text-primary)]">내 프로젝트</a>
                <a href="/mypage" className="block rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm font-semibold text-center text-[var(--text-primary)]">마이페이지</a>
                <button onClick={logout} className="block w-full text-sm text-[var(--text-tertiary)] py-2">로그아웃</button>
              </>
            ) : (
              <>
                <a href="/login" className="block rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-center text-[var(--text-secondary)]">로그인</a>
                <a href="/start" className="block rounded-xl bg-[var(--toss-blue)] px-4 py-3 text-sm font-bold text-center text-white">시작하기</a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
