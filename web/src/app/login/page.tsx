'use client';

import { useState, useEffect } from 'react';
import Logo from '@/app/components/Logo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 카카오 로그인 실패 시 에러 표시
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kakaoError = params.get('error');
    if (kakaoError === 'kakao_denied') setError('카카오 로그인이 취소되었습니다');
    else if (kakaoError === 'kakao_failed') setError('카카오 로그인에 실패했습니다. 다시 시도해주세요');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || '오류가 발생했습니다');
        return;
      }

      localStorage.setItem('launchpad_token', data.token);
      localStorage.setItem('launchpad_user', JSON.stringify({ userId: data.userId, email: data.email }));
      const params = new URLSearchParams(window.location.search);
      // 회원가입 시 약관 동의 페이지로 이동
      if (mode === 'signup') {
        window.location.href = '/agree';
      } else {
        window.location.href = params.get('redirect') || '/start';
      }
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-card)] px-5">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-10 text-center">
          <a href="/">
            <Logo className="h-9 mx-auto" />
          </a>
          <p className="mt-3 text-[var(--text-secondary)]">AI로 MVP를 30분 만에 만드세요</p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8">
          {/* 탭 */}
          <div className="mb-7 flex rounded-xl bg-[var(--bg-elevated)] p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-[var(--toss-blue)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'bg-[var(--toss-blue)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--toss-blue)] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--toss-blue)] transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8자 이상"
                required
                minLength={8}
                className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--toss-blue)] transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-[var(--toss-red)]/10 border border-[var(--toss-red)]/20 px-4 py-3 text-sm text-[var(--toss-red)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--toss-blue)] py-3.5 text-[15px] font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors disabled:opacity-40"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 소셜 로그인 */}
          <div className="mt-7">
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-primary)]" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[var(--bg-secondary)] px-3 text-[var(--text-tertiary)]">간편 로그인</span></div>
            </div>
            {/* 카카오 로그인 */}
            <button
              onClick={() => { window.location.href = `${API_BASE}/auth/kakao`; }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3.5 text-[#191919] font-semibold text-sm hover:bg-[#F5DC00] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191919" d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18-.16.57-.58 2.07-.67 2.39-.1.4.15.39.31.28.13-.08 2.04-1.38 2.86-1.94.6.09 1.22.13 1.86.13 4.42 0 8-2.79 8-6.24S13.42 1 9 1"/></svg>
              카카오로 시작하기
            </button>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <button disabled className="flex items-center justify-center rounded-xl bg-[#03C75A] py-3 text-white opacity-40 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">N</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-xl bg-white py-3 text-black opacity-40 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">G</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-xl bg-black py-3 text-white border border-[var(--border-primary)] opacity-40 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">A</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
