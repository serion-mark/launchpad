'use client';

import { useEffect, useState } from 'react';

export default function KakaoCallbackPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userId = params.get('userId');
      const email = params.get('email');

      if (token && userId && email) {
        localStorage.setItem('launchpad_token', token);
        localStorage.setItem('launchpad_user', JSON.stringify({ userId, email }));
        // 약관 동의 여부 확인
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const user = await res.json();
            if (!user.termsAgreedAt) {
              window.location.href = '/agree';
              return;
            }
          }
        } catch { /* 약관 확인 실패 시 대시보드로 이동 */ }
        window.location.href = '/start';
      } else {
        setError('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
      }
    };
    handle();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-card)] px-5">
        <div className="text-center">
          <p className="text-[var(--toss-red)] mb-4">{error}</p>
          <a href="/login" className="text-[var(--toss-blue)] hover:underline text-sm">
            로그인 페이지로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-card)]">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--toss-blue)] border-t-transparent" />
        <p className="mt-4 text-[var(--text-secondary)] text-sm">카카오 로그인 처리 중...</p>
      </div>
    </div>
  );
}
