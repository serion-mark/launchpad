'use client';

// Phase M (2026-04-22): /start 한 줄 입력 후 [시작] 누르면 뜨는 선택 모달
//   - [🚀 바로 만들기]: 한 줄 그대로 Sonnet 요약 → 확인 스테이지 (채팅 수정 가능)
//   - [💬 3~6번 상의]: 인터뷰 모드 진입
//   - 두 경로 모두 최종 크레딧 차감은 동일 (확인 스테이지에서 표시)
//
// 디자인 원칙:
//   - 사용자 흐름 중단 최소화 (큰 모달 대신 가벼운 오버레이)
//   - 두 선택지의 장단점 한 줄로 명시
//   - ESC / 배경 클릭 → 취소 (입력은 유지)
//
// 과금 안내:
//   - 인터뷰 자체는 무료
//   - 앱 생성 시점에 app_generate 크레딧 차감 (6,800cr — 경로 무관 동일)

import { useEffect } from 'react';

const CREDIT_PER_APP = 6800;

interface Props {
  isOpen: boolean;
  prompt: string;
  balance: number | null;
  onClose: () => void;
  onSelectDirect: () => void;    // 🚀 바로 만들기
  onSelectInterview: () => void; // 💬 3~6번 상의
}

export default function ChoiceModal({
  isOpen,
  prompt,
  balance,
  onClose,
  onSelectDirect,
  onSelectInterview,
}: Props) {
  // ESC 키 → 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const enough = balance === null || balance >= CREDIT_PER_APP;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-4 text-center">
          <div className="mb-2 text-3xl">🤔</div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            어떻게 진행할까요?
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            &ldquo;{prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt}&rdquo;
          </p>
        </div>

        {/* 옵션 2개 */}
        <div className="space-y-3">
          {/* 🚀 바로 만들기 */}
          <button
            type="button"
            onClick={onSelectDirect}
            className="w-full rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                바로 만들기
              </span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                빠름
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              한 줄 입력으로 바로 진행. 다음 화면에서 스펙 확인 + 채팅으로 조정 가능해요.
            </p>
          </button>

          {/* 💬 3~6번 상의 */}
          <button
            type="button"
            onClick={onSelectInterview}
            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-500 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-400 dark:hover:bg-blue-950/50"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">💬</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                포비와 3~6번 상의
              </span>
              <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                추천
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              포비가 번호 카드로 몇 가지 물어봐요. 스펙이 훨씬 정교해져서 완성도 ↑
            </p>
          </button>
        </div>

        {/* 크레딧 안내 (두 경로 공통) */}
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">
              💳 앱 생성 시 차감
            </span>
            <span
              className={
                enough
                  ? 'font-semibold text-slate-900 dark:text-slate-100'
                  : 'font-semibold text-rose-600 dark:text-rose-400'
              }
            >
              {CREDIT_PER_APP.toLocaleString()} 크레딧
              {balance !== null && (
                <span className="ml-1 font-normal text-slate-500">
                  (잔액 {balance.toLocaleString()})
                </span>
              )}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
            인터뷰·스펙 수정은 무료. 최종 확인 후 앱 생성 시점에만 차감돼요.
          </p>
          {!enough && (
            <p className="mt-1 text-[11px] font-semibold text-rose-600">
              ⚠️ 크레딧 부족 —{' '}
              <a href="/pricing" className="underline">
                충전하러 가기
              </a>
            </p>
          )}
        </div>

        {/* 취소 */}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-lg py-2 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          취소 (입력은 유지돼요)
        </button>
      </div>
    </div>
  );
}
