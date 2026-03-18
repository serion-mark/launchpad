'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      window.location.href = '/dashboard';
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#17171c] px-5">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-10 text-center">
          <a href="/">
            <img src="/logo.svg" alt="Foundry" className="h-9 mx-auto" />
          </a>
          <p className="mt-3 text-[#8b95a1]">AI로 MVP를 10분 만에 만드세요</p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-8">
          {/* 탭 */}
          <div className="mb-7 flex rounded-xl bg-[#2c2c35] p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#8b95a1]">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#8b95a1]">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#8b95a1]">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8자 이상"
                required
                minLength={8}
                className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-[#f45452]/10 border border-[#f45452]/20 px-4 py-3 text-sm text-[#f45452]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white hover:bg-[#1b64da] transition-colors disabled:opacity-40"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 소셜 로그인 */}
          <div className="mt-7">
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2c2c35]" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[#1b1b21] px-3 text-[#6b7684]">간편 로그인</span></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button disabled className="flex items-center justify-center rounded-xl bg-[#03C75A] py-3 text-white opacity-40 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">N</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-xl bg-[#FEE500] py-3 text-black opacity-40 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">K</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-xl bg-white py-3 text-black opacity-40 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">G</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-xl bg-black py-3 text-white border border-[#2c2c35] opacity-40 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold"></span>
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-[#6b7684]">소셜 로그인은 준비 중입니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
