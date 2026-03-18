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

      // 토큰 저장 + 리다이렉트
      localStorage.setItem('launchpad_token', data.token);
      localStorage.setItem('launchpad_user', JSON.stringify({ userId: data.userId, email: data.email }));
      window.location.href = '/builder';
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <a href="/" className="text-3xl font-bold text-white">
            <span className="text-blue-400">Launch</span>pad
          </a>
          <p className="mt-2 text-gray-400">AI로 MVP를 10분 만에 만드세요</p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-gray-700/50 bg-gray-800/80 p-8 backdrop-blur">
          {/* 탭 */}
          <div className="mb-6 flex rounded-lg bg-gray-900/50 p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === 'login' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === 'signup' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-sm text-gray-400">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-lg bg-gray-900/50 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-400">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full rounded-lg bg-gray-900/50 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8자 이상"
                required
                minLength={8}
                className="w-full rounded-lg bg-gray-900/50 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-500 transition disabled:opacity-50"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 소셜 로그인 (추후 연동) */}
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-gray-800 px-2 text-gray-500">간편 로그인</span></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button disabled className="flex items-center justify-center rounded-lg bg-[#03C75A] py-2.5 text-white opacity-50 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">N</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-lg bg-[#FEE500] py-2.5 text-black opacity-50 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">K</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-lg bg-white py-2.5 text-black opacity-50 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold">G</span>
              </button>
              <button disabled className="flex items-center justify-center rounded-lg bg-black py-2.5 text-white border border-gray-600 opacity-50 cursor-not-allowed" title="준비 중">
                <span className="text-sm font-bold"></span>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-600">소셜 로그인은 준비 중입니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
