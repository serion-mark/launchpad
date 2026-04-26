'use client';

// Phase D (2026-04-22): 마누스식 통합 확인 모달
//   - Phase 0 기능 유지: 크레딧 + 서브도메인 중복 확인 + 환불 안내
//   - Phase D 추가: 3층 정보 섹션 (spec primary / strategy 접힘 / raw 링크)
//   - Phase D 추가: [수정하고 싶음] 버튼 (프롬프트 재입력) — editCount 가이드
//   - Phase D 추가: Sonnet 요약 실패 시 fallback UI ([요약 없이 진행] / [직접 입력])
//
// 진입 케이스 3가지:
//   · isEditMode=true (기존 프로젝트 수정) — spec 생략, 크레딧+서브도메인만
//   · source='start' (새 앱 한 줄 프롬프트) — Haiku 요약 결과 표시
//   · source='meeting' (AI 회의실 보고서) — 요약 + "원본 보기" 링크

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

// ── 크레딧 단가 (credit.service.ts 와 동기화) ─────────
const CREDIT_COSTS = {
  app_generate: 6800,
  ai_modify_simple: 500,
  ai_modify_normal: 1000,
  ai_modify_complex: 1500,
  ai_consultation: 0,
} as const;

// ── 의도 분류 (credit.service.ts classifyIntent 와 동기화) ─────────
const COMPLEX_KEYWORDS = ['추가', '생성', '만들어', '연동', '결제', '페이지', '기능', 'db', '테이블', 'api', '반응형', '모바일', '삭제', '제거'];
const NORMAL_KEYWORDS = ['레이아웃', '구조', '스타일', '버튼', '폰트', '크기', '위치', '정렬', '간격', '여백', '디자인'];
const CONSULTATION_KEYWORDS = ['추천', '제안', '어떤', '어떻게', '뭐가', '무엇이', '분석', '의견', '평가', '조언', '리뷰', '살펴', '진단', '체크', '상담', '상의', '토론', '비교', '판단', '참고', '설명', '알려줘', '가르쳐', '궁금', '좋을까', '할만한', '있을까', '괜찮을까', '어울릴까', '어떨까', '뭘까', '할까', '필요할까'];
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

// ── 요약 결과 타입 (서버 summarizeToAgentSpec 과 동기화) ─────
export type AgentSpec = {
  appName: string;
  tagline: string;
  coreFeatures: string[];
  designTone: string;
  techHints: { supabase: boolean; requiresApiKey?: string; mobile?: boolean };
};

export type AgentStrategy = {
  targetUser: string;
  differentiator: string;
  mvpScope: { include: string[]; exclude: string[] };
  benchmarks?: string[];
  risks?: string[];
};

export type SpecBundle = {
  spec: AgentSpec | null;
  strategy: AgentStrategy | null;
  raw: string;
  sourceType: 'prompt' | 'meeting';
  confidence: number;
  fallbackRequired: boolean;
};

type SubdomainStatus = 'idle' | 'checking' | 'available' | 'unavailable';

interface Props {
  isOpen: boolean;
  isEditMode: boolean;       // 기존 프로젝트 수정 모드 (spec 요약 없음)
  prompt: string;            // 수정 모드 비용 계산용
  specBundle?: SpecBundle | null;  // 신규 모드 — Sonnet 요약 결과 (Phase D)
  summaryLoading?: boolean;  // 요약 호출 중 (Skeleton 표시)
  onConfirm: (customSubdomain?: string) => void;
  onCancel: () => void;
  onEdit?: () => void;       // [수정하고 싶음] — 프롬프트 재입력 (신규 모드만)
}

export default function AgentCreditConfirmModal({
  isOpen,
  isEditMode,
  prompt,
  specBundle,
  summaryLoading = false,
  onConfirm,
  onCancel,
  onEdit,
}: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [freeTrialUsed, setFreeTrialUsed] = useState<boolean>(true);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState<SubdomainStatus>('idle');
  const [subdomainMsg, setSubdomainMsg] = useState<string>('');

  const [strategyOpen, setStrategyOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingBalance(true);
    authFetch('/credits/balance')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBalance(data.balance ?? 0);
        setFreeTrialUsed(!!data.freeTrialUsed);
      })
      .catch(() => {
        setBalance(0);
        setFreeTrialUsed(true);
      })
      .finally(() => setLoadingBalance(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSubdomain('');
      setSubdomainStatus('idle');
      setSubdomainMsg('');
      setStrategyOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 비용 계산
  const editIntent: Intent | null = isEditMode ? classifyIntent(prompt) : null;
  const cost = isEditMode
    ? intentCost(editIntent!)
    : (freeTrialUsed ? CREDIT_COSTS.app_generate : 0);
  const costLabel = isEditMode
    ? intentLabel(editIntent!)
    : (freeTrialUsed ? '🚀 앱 생성' : '🎁 맛보기 무료 1회');
  const insufficient = balance !== null && balance < cost;
  const isConsultation = editIntent === 'consultation';

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
    } catch {
      setSubdomainStatus('unavailable');
      setSubdomainMsg('확인 실패 — 잠시 후 재시도');
    }
  };

  const handleConfirm = () => {
    const finalSubdomain = subdomain && subdomainStatus === 'available' ? subdomain.trim().toLowerCase() : undefined;
    onConfirm(finalSubdomain);
  };

  const canConfirm =
    !loadingBalance &&
    !insufficient &&
    !summaryLoading &&
    !specBundle?.fallbackRequired &&
    (!subdomain || subdomainStatus === 'available');

  const spec = specBundle?.spec;
  const strategy = specBundle?.strategy;
  const fallbackRequired = specBundle?.fallbackRequired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 my-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          🌗 {isEditMode ? '포비가 수정할게요' : '포비에게 맡기기'}
        </h2>

        {/* Phase D: 신규 모드 — Sonnet 요약 섹션 */}
        {!isEditMode && (
          <>
            {/* 요약 로딩 Skeleton */}
            {summaryLoading && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  🧠 AI 가 요청을 정리하는 중...
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            )}

            {/* Fallback 필요 — Sonnet 실패 */}
            {!summaryLoading && fallbackRequired && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="mb-2 font-semibold text-amber-700 dark:text-amber-300">
                  ⚠️ AI 요약 실패
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  일시적 AI 오류로 자동 정리에 실패했어요. 직접 다시 입력하거나, 요약 없이 원본으로 진행할 수 있어요.
                </p>
              </div>
            )}

            {/* Spec 섹션 — 성공 시 */}
            {!summaryLoading && !fallbackRequired && spec && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    📝 앱 스펙
                  </h3>
                  {specBundle && specBundle.confidence < 0.6 && (
                    <span className="text-[10px] text-amber-600">신뢰도 낮음 · 수정 권장</span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500">이름:</span>{' '}
                    <span className="font-semibold">{spec.appName}</span>
                  </div>
                  {spec.tagline && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {spec.tagline}
                    </div>
                  )}
                  <div className="mt-1">
                    <div className="text-slate-500">핵심 기능:</div>
                    <ul className="ml-4 mt-0.5 list-disc space-y-0.5 text-xs">
                      {spec.coreFeatures.slice(0, 5).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  {spec.designTone && (
                    <div className="mt-1">
                      <span className="text-slate-500">디자인:</span>{' '}
                      <span className="text-xs">{spec.designTone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Strategy 섹션 (접힘) */}
            {!summaryLoading && !fallbackRequired && strategy && (
              <details
                open={strategyOpen}
                onToggle={(e) => setStrategyOpen((e.target as HTMLDetailsElement).open)}
                className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                  📊 전략 컨텍스트 {strategyOpen ? '▲' : '▼'}
                </summary>
                <div className="border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-700 space-y-1.5">
                  {strategy.targetUser && (
                    <div>
                      <span className="text-slate-500">타겟:</span> {strategy.targetUser}
                    </div>
                  )}
                  {strategy.differentiator && (
                    <div>
                      <span className="text-slate-500">차별화:</span> {strategy.differentiator}
                    </div>
                  )}
                  {strategy.mvpScope?.include?.length > 0 && (
                    <div>
                      <span className="text-slate-500">MVP 포함:</span>{' '}
                      {strategy.mvpScope.include.join(', ')}
                    </div>
                  )}
                  {strategy.mvpScope?.exclude?.length > 0 && (
                    <div>
                      <span className="text-slate-500">제외 (나중):</span>{' '}
                      {strategy.mvpScope.exclude.join(', ')}
                    </div>
                  )}
                  {strategy.benchmarks && strategy.benchmarks.length > 0 && (
                    <div>
                      <span className="text-slate-500">참고:</span>{' '}
                      {strategy.benchmarks.join(', ')}
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* 원본 보기 (meeting 소스만) */}
            {!summaryLoading && specBundle?.sourceType === 'meeting' && (
              <details className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <summary className="cursor-pointer px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                  📜 AI 회의실 원본 보기
                </summary>
                <div className="max-h-48 overflow-y-auto border-t border-slate-200 px-4 py-3 text-xs whitespace-pre-wrap dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  {specBundle.raw}
                </div>
              </details>
            )}

            {/* [수정하고 싶음] */}
            {!summaryLoading && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="mb-4 w-full rounded-xl border border-slate-300 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ✏️ 수정하고 싶어요 (다시 입력)
              </button>
            )}
          </>
        )}

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
            {insufficient ? '잔액 부족' : summaryLoading ? '요약 중...' : fallbackRequired ? '요약 없이 진행' : '시작하기 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
