'use client';

// Phase N (2026-04-22): /start 대화형 인터뷰 컴포넌트
//   - 포비 1명이 번호 카드 중심으로 3~6턴 질문
//   - 각 턴: 질문 메시지 + 번호 옵션 (1~4개) + "직접 입력" 백업
//   - 종료 시 finalSpec 생성 → 상위(page.tsx) 에서 review 모드로 전환
//
// 디자인:
//   - 카톡 느낌 말풍선 (포비=좌 회색, 사용자=우 파랑)
//   - 번호 옵션 그리드 (1열 모바일 / 2열 데스크)
//   - 턴 진행도 (3/6 같은 텍스트)
//   - 세션스토리지 복원 (페이지 새로고침 복원)
//
// 과금: 무료 (진입 유도)

import { useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/api';

export interface InterviewOption {
  num: number;
  label: string;
}

export interface InterviewTurnResponse {
  message: string;
  options?: InterviewOption[];
  done: boolean;
  turnCount: number;
  finalSpec?: {
    spec: any;
    strategy: any;
    raw: string;
    sourceType: 'prompt';
    confidence: number;
    fallbackRequired: false;
  };
}

type ChatMessage =
  | { role: 'assistant'; text: string; options?: InterviewOption[]; ts: number }
  | { role: 'user'; text: string; ts: number };

interface Props {
  initialPrompt: string;
  onComplete: (finalSpec: InterviewTurnResponse['finalSpec']) => void;
  onCancel: () => void; // 사용자가 중간에 접을 때 (입력 단계로 복귀)
}

const STORAGE_KEY = 'start_interview_history';
const MAX_TURNS = 6;

export default function InterviewChat({
  initialPrompt,
  onComplete,
  onCancel,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [showFreeInput, setShowFreeInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fetchedFirstRef = useRef(false);

  // 스크롤 자동 하단
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  // 복원 + 첫 턴 호출 (페이지 렌더 후 1회)
  useEffect(() => {
    if (fetchedFirstRef.current) return;
    fetchedFirstRef.current = true;

    // 세션스토리지 복원 시도
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.initialPrompt === initialPrompt && Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
          setTurnCount(parsed.turnCount ?? 0);
          return; // 복원 완료 — 첫 턴 호출 안 함
        }
      }
    } catch {}

    // 신규 — 첫 질문 호출
    requestTurn([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 메시지 변경 시 세션스토리지 저장
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ initialPrompt, messages, turnCount }),
      );
    } catch {}
  }, [messages, turnCount, initialPrompt]);

  // 인터뷰 종료 시 세션스토리지 정리
  const clearStorage = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // 서버에 다음 턴 요청
  const requestTurn = async (
    historyForApi: { role: 'user' | 'assistant'; content: string }[],
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialPrompt,
          history: historyForApi,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const data: InterviewTurnResponse = await res.json();
      setTurnCount(data.turnCount);

      // assistant 메시지 추가
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.message,
          options: data.options,
          ts: Date.now(),
        },
      ]);

      // 종료 케이스
      if (data.done && data.finalSpec) {
        clearStorage();
        // 약간 딜레이 (마지막 메시지 읽을 시간)
        setTimeout(() => onComplete(data.finalSpec), 600);
      }
    } catch (e: any) {
      setError(e?.message ?? '인터뷰 오류');
    } finally {
      setLoading(false);
      setPicks(new Set());
      setFreeText('');
      setShowFreeInput(false);
    }
  };

  // 사용자 답변 전송
  const submitAnswer = (text: string) => {
    if (!text.trim() || loading) return;
    const newUserMsg: ChatMessage = {
      role: 'user',
      text: text.trim(),
      ts: Date.now(),
    };
    const nextMessages = [...messages, newUserMsg];
    setMessages(nextMessages);

    // history = user-assistant 쌍 (initialPrompt 는 서버에서 prepend)
    const historyForApi = nextMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      }));

    requestTurn(historyForApi);
  };

  // 번호 선택 제출
  const submitPicks = () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant') as
      | (ChatMessage & { role: 'assistant' })
      | undefined;
    if (!lastAssistant?.options || picks.size === 0) return;

    const labels = [...picks]
      .map((n) => lastAssistant.options?.find((o) => o.num === n)?.label)
      .filter(Boolean);
    submitAnswer(labels.join(', '));
  };

  // 직접 입력 제출
  const submitFreeText = () => {
    submitAnswer(freeText);
  };

  const togglePick = (num: number, isFreeInputOption: boolean) => {
    if (isFreeInputOption) {
      setShowFreeInput(true);
      return;
    }
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  // 최신 assistant 메시지의 옵션
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant') as
    | (ChatMessage & { role: 'assistant' })
    | undefined;
  const activeOptions = lastAssistant?.options;
  const canSelect = !loading && !!activeOptions && activeOptions.length > 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      {/* 헤더 — 턴 진행도 + 취소 */}
      <div className="mb-3 flex items-center justify-between rounded-xl bg-white/70 px-4 py-3 shadow-sm dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              포비와 상의 중
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {turnCount > 0
                ? `${turnCount}/${MAX_TURNS} 턴 · 3~6턴에 완료`
                : '준비 중...'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            clearStorage();
            onCancel();
          }}
          className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          접기
        </button>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl bg-white/40 p-4 backdrop-blur-sm dark:bg-slate-900/40"
      >
        {/* 초기 — 사용자 첫 입력 버블 표시 */}
        <div className="mb-3 flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-2 text-sm text-white sm:text-base">
            {initialPrompt}
          </div>
        </div>

        {messages.map((m, i) => (
          <div key={i} className="mb-3">
            {m.role === 'assistant' ? (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2 text-sm text-slate-800 sm:text-base dark:bg-slate-800 dark:text-slate-100">
                  {m.text}
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-2 text-sm text-white sm:text-base">
                  {m.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]"></span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            ⚠️ {error}
            <button
              type="button"
              onClick={() => {
                const historyForApi = messages
                  .filter((m) => m.role === 'user' || m.role === 'assistant')
                  .map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.text,
                  }));
                requestTurn(historyForApi);
              }}
              className="ml-2 underline"
            >
              재시도
            </button>
          </div>
        )}
      </div>

      {/* 입력 영역 — 번호 카드 + 직접 입력 */}
      {canSelect && (
        <div className="mt-3 rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/80">
          {/* 번호 옵션 그리드 */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeOptions?.map((opt) => {
              const isFreeOpt = /기타|직접 입력/.test(opt.label);
              const picked = picks.has(opt.num);
              return (
                <button
                  key={opt.num}
                  type="button"
                  onClick={() => togglePick(opt.num, isFreeOpt)}
                  disabled={loading}
                  className={[
                    'flex min-h-12 items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    picked || (isFreeOpt && showFreeInput)
                      ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                  ].join(' ')}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    [{opt.num}]
                  </span>
                  <span className="flex-1">{opt.label}</span>
                  {picked && <span className="text-xs text-blue-500">✓</span>}
                </button>
              );
            })}
          </div>

          {/* 직접 입력창 */}
          {showFreeInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitFreeText();
                }}
                placeholder="직접 입력하세요..."
                disabled={loading}
                style={{ fontSize: '16px' }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                autoFocus
              />
              <button
                type="button"
                onClick={submitFreeText}
                disabled={loading || !freeText.trim()}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-slate-700"
              >
                보내기
              </button>
            </div>
          )}

          {/* 선택 전송 버튼 */}
          {!showFreeInput && (
            <button
              type="button"
              onClick={submitPicks}
              disabled={loading || picks.size === 0}
              className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {picks.size === 0
                ? '번호를 선택하세요 (복수 가능)'
                : `선택 완료 → 다음 질문 (${picks.size}개)`}
            </button>
          )}
        </div>
      )}

      {/* 로딩 중 + 옵션 없는 상태 — 자유 입력만 */}
      {!canSelect && !loading && messages.length > 0 && (
        <div className="mt-3 rounded-2xl bg-white/80 p-4 shadow-sm dark:bg-slate-900/80">
          <div className="flex gap-2">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitFreeText();
              }}
              placeholder="답변을 입력하세요..."
              style={{ fontSize: '16px' }}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={submitFreeText}
              disabled={!freeText.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              보내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
