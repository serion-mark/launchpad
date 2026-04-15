'use client';

import { useState, useEffect } from 'react';
import Logo from '@/app/components/Logo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// 눈 아이콘 SVG
function EyeIcon({ open }: { open: boolean }) {
  if (open) return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  // 이메일 중복확인
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // 카카오 로그인 실패 시 에러 표시
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kakaoError = params.get('error');
    if (kakaoError === 'kakao_denied') setError('카카오 로그인이 취소되었습니다');
    else if (kakaoError === 'kakao_failed') setError('카카오 로그인에 실패했습니다. 다시 시도해주세요');
  }, []);

  // 이메일 변경 시 중복확인 초기화
  useEffect(() => {
    setEmailChecked(false);
    setEmailAvailable(null);
  }, [email]);

  const checkEmailDuplicate = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('유효한 이메일 주소를 입력해주세요');
      return;
    }
    setEmailChecking(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setEmailChecked(true);
      setEmailAvailable(data.available);
      if (!data.available) setError('이미 가입된 이메일입니다');
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setEmailChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 회원가입 추가 검증
    if (mode === 'signup') {
      if (!name.trim()) { setError('이름을 입력해주세요'); return; }
      if (!emailChecked || !emailAvailable) { setError('이메일 중복확인을 해주세요'); return; }
      if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다'); return; }
      if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다'); return; }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name, phone: phone.trim() || undefined };

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

  const inputClass = "w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--toss-blue)] transition-colors";

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
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mode === 'login' ? 'bg-[var(--toss-blue)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                mode === 'signup' ? 'bg-[var(--toss-blue)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 (회원가입) */}
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">이름 <span className="text-[var(--toss-red)]">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  className={inputClass}
                />
              </div>
            )}

            {/* 이메일 + 중복확인 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                이메일 {mode === 'signup' && <span className="text-[var(--toss-red)]">*</span>}
              </label>
              {mode === 'signup' ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={checkEmailDuplicate}
                    disabled={emailChecking || !email.trim()}
                    className={`shrink-0 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                      emailChecked && emailAvailable
                        ? 'bg-[var(--toss-green)]/10 text-[var(--toss-green)] border border-[var(--toss-green)]/30'
                        : 'bg-[var(--toss-blue)] text-white hover:bg-[var(--toss-blue-hover)] disabled:opacity-40'
                    }`}
                  >
                    {emailChecking ? '확인 중' : emailChecked && emailAvailable ? '사용 가능' : '중복확인'}
                  </button>
                </div>
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className={inputClass}
                />
              )}
              {mode === 'signup' && emailChecked && emailAvailable && (
                <p className="mt-1.5 text-xs text-[var(--toss-green)]">사용 가능한 이메일입니다</p>
              )}
            </div>

            {/* 전화번호 (회원가입) */}
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  전화번호 <span className="text-xs text-[var(--text-tertiary)]">(선택)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className={inputClass}
                />
              </div>
            )}

            {/* 비밀번호 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                비밀번호 {mode === 'signup' && <span className="text-[var(--toss-red)]">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8자 이상"
                  required
                  minLength={8}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* 비밀번호 확인 (회원가입) */}
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  비밀번호 확인 <span className="text-[var(--toss-red)]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호를 다시 입력"
                    required
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <EyeIcon open={showPasswordConfirm} />
                  </button>
                </div>
                {passwordConfirm && (
                  <p className={`mt-1.5 text-xs ${password === passwordConfirm ? 'text-[var(--toss-green)]' : 'text-[var(--toss-red)]'}`}>
                    {password === passwordConfirm ? '비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
                  </p>
                )}
              </div>
            )}

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

          {/* 소셜 로그인 — 카카오 심사 승인 후 활성화 예정 */}
          {/* <div className="mt-7">
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-primary)]" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[var(--bg-secondary)] px-3 text-[var(--text-tertiary)]">간편 로그인</span></div>
            </div>
            <button
              onClick={() => { window.location.href = `${API_BASE}/auth/kakao`; }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3.5 text-[#191919] font-semibold text-sm hover:bg-[#F5DC00] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191919" d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18-.16.57-.58 2.07-.67 2.39-.1.4.15.39.31.28.13-.08 2.04-1.38 2.86-1.94.6.09 1.22.13 1.86.13 4.42 0 8-2.79 8-6.24S13.42 1 9 1"/></svg>
              카카오로 시작하기
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
