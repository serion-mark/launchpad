'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/api';

export default function AgreePage() {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [refund, setRefund] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allRequired = terms && privacy && refund;
  const allChecked = terms && privacy && refund && marketing;

  const toggleAll = () => {
    const next = !allChecked;
    setTerms(next);
    setPrivacy(next);
    setRefund(next);
    setMarketing(next);
  };

  const handleSubmit = async () => {
    if (!allRequired) return;
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/auth/agree', {
        method: 'POST',
        body: JSON.stringify({ terms, privacy, refund, marketing }),
      });
      if (res.ok) {
        window.location.href = '/start';
      } else {
        const data = await res.json();
        setError(data.message || '약관 동의 처리에 실패했습니다');
      }
    } catch {
      setError('서버에 연결할 수 없습니다');
    }
    setLoading(false);
  };

  const CheckBox = ({ checked, onChange, required, label, linkText, linkHref }: {
    checked: boolean; onChange: () => void; required?: boolean; label: string; linkText: string; linkHref: string;
  }) => (
    <button
      onClick={onChange}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        checked ? 'border-[#3182f6] bg-[#3182f6]/5' : 'border-[#2c2c35] hover:border-[#3a3a45]'
      }`}
    >
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
        checked ? 'border-[#3182f6] bg-[#3182f6]' : 'border-[#4e5968]'
      }`}>
        {checked && (
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${checked ? 'text-[#f2f4f6]' : 'text-[#8b95a1]'}`}>
            {label}
          </span>
          {required ? (
            <span className="rounded bg-[#f45452]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#f45452]">필수</span>
          ) : (
            <span className="rounded bg-[#2c2c35] px-1.5 py-0.5 text-[10px] font-medium text-[#6b7684]">선택</span>
          )}
        </div>
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="mt-1 inline-block text-xs text-[#6b7684] hover:text-[#3182f6] underline"
        >
          {linkText} 보기 &rarr;
        </a>
      </div>
    </button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#17171c] px-5">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-10 text-center">
          <a href="/">
            <img src="/logo.svg" alt="Foundry" className="h-9 mx-auto" />
          </a>
          <p className="mt-3 text-[#8b95a1]">서비스 이용을 위해 약관에 동의해주세요</p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-8">
          {/* 전체 동의 */}
          <button
            onClick={toggleAll}
            className={`mb-5 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
              allChecked ? 'border-[#30d158] bg-[#30d158]/5' : 'border-[#2c2c35] hover:border-[#3a3a45]'
            }`}
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              allChecked ? 'border-[#30d158] bg-[#30d158]' : 'border-[#4e5968]'
            }`}>
              {allChecked && (
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[15px] font-bold text-[#f2f4f6]">전체 동의하기</span>
          </button>

          <div className="space-y-3">
            <CheckBox checked={terms} onChange={() => setTerms(!terms)} required label="이용약관 동의" linkText="이용약관 전문" linkHref="/terms" />
            <CheckBox checked={privacy} onChange={() => setPrivacy(!privacy)} required label="개인정보 처리방침 동의" linkText="개인정보 처리방침 전문" linkHref="/privacy" />
            <CheckBox checked={refund} onChange={() => setRefund(!refund)} required label="환불 정책 및 코드 소유권 동의" linkText="환불 정책 전문" linkHref="/refund" />
            <CheckBox checked={marketing} onChange={() => setMarketing(!marketing)} label="마케팅 정보 수신 동의" linkText="마케팅 수신 안내" linkHref="/terms" />
          </div>

          {error && (
            <div className="mt-5 rounded-xl bg-[#f45452]/10 border border-[#f45452]/20 px-4 py-3 text-sm text-[#f45452]">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!allRequired || loading}
            className="mt-6 w-full rounded-xl bg-[#3182f6] py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#1b64da] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : '동의하고 시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
