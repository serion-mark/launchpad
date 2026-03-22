'use client';

import { useState, useEffect } from 'react';
import { getUser, logout } from '@/lib/api';

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
  const user = getUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-[#2c2c35] bg-[#17171c]/95 backdrop-blur-md' : 'border-transparent bg-transparent'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        {/* 로고 */}
        <a href="/" className="flex items-center gap-1.5">
          <img src="/logo.svg" alt="Foundry" className="h-7 md:h-8" />
        </a>

        {/* 데스크톱 메뉴 */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#2c2c35] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 우측 버튼 */}
        <div className="hidden md:flex items-center gap-2.5">
          {user ? (
            <>
              <a href="/dashboard" className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm font-semibold text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
                내 프로젝트
              </a>
              <button onClick={logout} className="text-sm text-[#6b7684] hover:text-[#8b95a1] transition-colors">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] transition-colors">
                로그인
              </a>
              <a href="/start" className="rounded-xl bg-[#3182f6] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors">
                시작하기
              </a>
            </>
          )}
        </div>

        {/* 모바일 햄버거 */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="메뉴"
        >
          <span className={`block h-0.5 w-5 bg-[#8b95a1] transition-all ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-5 bg-[#8b95a1] transition-all ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-5 bg-[#8b95a1] transition-all ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {open && (
        <div className="md:hidden border-t border-[#2c2c35] bg-[#17171c] px-5 py-4 space-y-1">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#2c2c35] transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="border-t border-[#2c2c35] pt-3 mt-3 space-y-2">
            {user ? (
              <>
                <a href="/dashboard" className="block rounded-xl bg-[#2c2c35] px-4 py-3 text-sm font-semibold text-center text-[#f2f4f6]">내 프로젝트</a>
                <button onClick={logout} className="block w-full text-sm text-[#6b7684] py-2">로그아웃</button>
              </>
            ) : (
              <>
                <a href="/login" className="block rounded-xl bg-[#2c2c35] px-4 py-3 text-sm font-medium text-center text-[#8b95a1]">로그인</a>
                <a href="/start" className="block rounded-xl bg-[#3182f6] px-4 py-3 text-sm font-bold text-center text-white">시작하기</a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
