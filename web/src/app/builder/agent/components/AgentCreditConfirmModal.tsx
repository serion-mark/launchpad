'use client';

// Phase 0 (2026-04-22): Agent Mode 시작 전 크레딧 확인 + 서브도메인 지정 모달
//
// 왜 필요한가:
//   1) Agent Mode 는 세션당 6,800cr (신규) / 500~1,500cr (수정) 소모 — 사용자 사전 인지
//   2) 기존 MVP 빌더 (/start) 의 subdomain 입력이 Agent Mode 에는 없었음 — 사용자가
//      원하는 URL 로 배포하려면 자동 할당 `app-xxxx` 대신 직접 지정
//   3) 잔액 부족 시 "시작" 막아서 세션 도중 실패 방지
//
// 환불 정책: 없음 (기존 빌더와 동일) — 세션 시작 시 사전 차감, 실패해도 복구 없음

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

// 서버 credit.service.ts 와 동일한 상수 (동기화 필수)
const CREDIT_COSTS = {
  app_generate: 6800,
  ai_modify_simple: 500,
  ai_modify_normal: 1000,
  ai_modify_complex: 1500,
  ai_consultation: 0,
} as const;

// 서버 classifyIntent 와 동일한 분류 로직 (동기화 필수)
//   상담(추천/분석/제안) = 0cr — 2026-04-22 사장님 정책
//   수정(복잡도 3단계) = 500/1000/1500cr
const COMPLEX_KEYWORDS = ['추가', '생성', '만들어', '연동', '결제', '페이지', '기능', 'db', '테이블', 'api', '반응형', '모바일', '삭제', '제거'];
const NORMAL_KEYWORDS = ['레이아웃', '구조', '스타일', '버튼', '폰트', '크기', '위치', '정렬', '간격', '여백', '디자인'];
const CONSULTATION_KEYWORDS = [
  '추천', '제안', '어떤', '어떻게', '뭐가', '무엇이', '분석', '의견', '평가',
  '조언', '리뷰', '살펴', '진단', '체크', '상담', '상의', '토론', '비교',
  '판단', '참고', '설명', '알려줘', '가르쳐', '궁금', '좋을까', '할만한',
  '있을까', '괜찮을까', '어울릴까', '어떨까', '뭘까', '할까', '필요할까',
];
const EXPLICIT_MODIFY_PREFIX = /^(추가해|만들어|바꿔|고쳐|수정해|변경해|삭제|제거|적용|배포)/;

type Intent = 'consultation' | 'simple' | 'normal' | 'complex';

function classifyIntent(message: string): Intent {
  const lower = message.toLowerCase();
  const hasConsultation = CONSULTATION_KEYWORDS.some((kw) => lower.includes(kw));
  const startsWithModify = EXPLICIT_MODIFY_PREFIX.test(lower);
  if (hasConsultation && !startsWithModify) return 'consultation';
  if (COMPLEX_KEYWORDS.some((kw) => lower.includes(kw))) return 'complex';
  if (NORMAL_KEYWORDS.some((kw) => lower.includes(kw))) return 'normal';
  return 'simple';
}

function intentCost(intent: Intent): number {
  if (intent === 'consultation') return CREDIT_COSTS.ai_consultation;
  if (intent === 'complex') return CREDIT_COSTS.ai_modify_complex;
  if (intent === 'normal') return CREDIT_COSTS.ai_modify_normal;
  return CREDIT_COSTS.ai_modify_simple;
}

function intentLabel(intent: Intent): string {
  switch (intent) {
    case 'consultation': return '💬 상담 (무료)';
    case 'complex': return '✏️ 수정 (복잡)';
    case 'normal': return '✏️ 수정 (보통)';
    case 'simple': return '✏️ 수정 (단순)';
  }
}

type SubdomainStatus = 'idle' | 'checking' | 'available' | 'unavailable';

interface Props {
  isOpen: boolean;
  isEditMode: boolean;
  prompt: string;          // 수정 모드 비용 계산용
  onConfirm: (customSubdomain?: string) => void;
  onCancel: () => void;
}

export default function AgentCreditConfirmModal({
  isOpen,
  isEditMode,
  prompt,
  onConfirm,
  onCancel,
}: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [freeTrialUsed, setFreeTrialUsed] = useState<boolean>(true);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>('idle');
  const [subdomainMsg, setSubdomainMsg] = useState<string>('');

  // 모달 열릴 때 잔액 + freeTrialUsed 조회
  useEffect(() => {
    if (!isOpen) return;
    setLoadingBalance(true);
    authFetch('/credits/balance')
      .then(async (r) => {
        if (!r.ok) throw new Error('잔액 조회 실패');
        return r.json();
      })
      .then((data) => {
        setBalance(data.balance ?? 0);
        setFreeTrialUsed(!!data.freeTrialUsed);
      })
      .catch(() => {
        setBalance(0);
        setFreeTrialUsed(true);
      })
      .finally(() => setLoadingBalance(false));
  }, [isOpen]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSubdomain('');
      setSubdomainStatus('idle');
      setSubdomainMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 이번 세션 예상 비용
  //   수정 모드: 상담/수정 의도 분류 — 상담은 0cr
  //   신규 모드: 맛보기 여부에 따라 0 or 6,800cr
  const editIntent: Intent | null = isEditMode ? classifyIntent(prompt) : null;
  const cost = isEditMode
    ? intentCost(editIntent!)
    : (freeTrialUsed ? CREDIT_COSTS.app_generate : 0);
  const costLabel = isEditMode
    ? intentLabel(editIntent!)
    : (freeTrialUsed ? '🚀 앱 생성' : '🎁 맛보기 무료 1회');

  const insufficient = balance !== null && balance < cost;
  const isConsultation = editIntent === 'consultation';

  // 중복 확인
  const checkSubdomain = async () => {
    const clean = subdomain.trim().toLowerCase();
    if (clean.length < 3) {
      setSubdomainStatus('unavailable');
      setSubdomainMsg('3글자 이상 입력해주세요');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(clean)) {
      setSubdomainStatus('unavailable');
      setSubdomainMsg('영문소문자/숫자/하이픈(-)만 가능');
      return;
    }
    setSubdomainStatus('checking');
    setSubdomainMsg('확인 중...');
    try {
      const res = await authFetch(`/projects/check-subdomain?name=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.available) {
        setSubdomainStatus('available');
        setSubdomainMsg(`✓ 사용 가능: https://${clean}.foundry.ai.kr`);
      } else {
        setSubdomainStatus('unavailable');
        setSubdomainMsg(data.reason || '이미 사용 중인 주소입니다');
      }
    } catch (err: any) {
      setSubdomainStatus('unavailable');
      setSubdomainMsg('확인 실패 — 잠시 후 재시도');
    }
  };

  const handleConfirm = () => {
    // 서브도메인 선택 사항 — 입력됐으면 available 일 때만 전달
    const finalSubdomain = subdomain && subdomainStatus === 'available' ? subdomain.trim().toLowerCase() : undefined;
    onConfirm(finalSubdomain);
  };

  const canConfirm =
    !loadingBalance &&
    !insufficient &&
    (!subdomain || subdomainStatus === 'available');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          🌗 {isEditMode ? '포비가 수정할게요' : '포비에게 맡기기'}
        </h2>

        {/* 비용 요약 */}
        <div
          className={`mb-4 rounded-xl border p-4 ${
            isConsultation
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
              : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">{costLabel}</span>
            <span className={`text-lg font-bold ${isConsultation ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
              {cost === 0 ? '무료' : `${cost.toLocaleString()} cr`}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">잔액</span>
            <span className={`font-mono font-semibold ${insufficient ? 'text-rose-600' : 'text-emerald-600'}`}>
              {loadingBalance ? '조회 중...' : `${(balance ?? 0).toLocaleString()} cr`}
            </span>
          </div>
          {isConsultation && (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
              💡 상담/추천/분석 요청입니다. 코드 수정 없이 무료로 답변드려요.
            </p>
          )}
          {insufficient && (
            <p className="mt-2 text-xs text-rose-600">
              ⚠️ 크레딧 부족 —{' '}
              <a href="/credits" className="underline font-bold">
                크레딧 충전하기 →
              </a>
            </p>
          )}
        </div>

        {/* 서브도메인 입력 (신규 모드만) */}
        {!isEditMode && (
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              🌐 서브도메인 <span className="text-xs text-slate-400">(선택 — 비우면 자동 생성)</span>
            </label>
            <div className="flex gap-2">
              <div className="flex flex-1 items-center rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value);
                    setSubdomainStatus('idle');
                    setSubdomainMsg('');
                  }}
                  placeholder="my-app"
                  className="flex-1 bg-transparent py-2 text-sm outline-none dark:text-slate-100"
                />
                <span className="text-xs text-slate-400">.foundry.ai.kr</span>
              </div>
              <button
                type="button"
                onClick={checkSubdomain}
                disabled={!subdomain || subdomainStatus === 'checking'}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {subdomainStatus === 'checking' ? '확인 중' : '중복 확인'}
              </button>
            </div>
            {subdomainMsg && (
              <p className={`mt-1.5 text-xs ${subdomainStatus === 'available' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {subdomainMsg}
              </p>
            )}
          </div>
        )}

        {/* 안내 */}
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          💡 환불 정책: 세션 시작 시 사전 차감되며, 중단/실패 시에도 환불되지 않습니다.
        </p>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            {insufficient ? '잔액 부족' : '시작하기 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
