'use client';

// 종합 카드 — 답지 빈 칸을 한 번에 표시
// 반응형: 모바일 1열 세로 (h-12 터치) / PC 2~3열 그리드
// 번호 입력 친화: 옵션마다 [1] [2] [3]
// 복수 선택 지원 + 기타 옵션 클릭 시 인라인 입력창
//
// Phase H (2026-04-22): "📎 참고 자료" 이미지 첨부 섹션 추가
// Phase AD Step 2 (2026-04-23): 이미지 업로드 UI 를 공용 ImageUploader 로 추출
//   - 동작 동일 (5MB/3장/PNG·JPG·WEBP)
//   - onUploadAttachment 외부 prop 그대로 ImageUploader.onUpload 에 위임

import { useState } from 'react';
import ImageUploader, { type UploadedAttachment } from '@/components/ImageUploader';
import type { CardRequest } from '../useAgentStream';

interface Props {
  card: CardRequest;
  onSubmit: (answer: string, attachments?: string[]) => void;
  onUploadAttachment?: (file: File) => Promise<UploadedAttachment>;
  disabled?: boolean;
}

export default function AnswerSheetCard({
  card,
  onSubmit,
  onUploadAttachment,
  disabled,
}: Props) {
  // 각 질문별 선택 상태 — 복수 선택 가능 (Set<번호>)
  const [picks, setPicks] = useState<Record<string, Set<number>>>({});
  // 기타 옵션 선택 시 각 질문별 자유 입력
  const [freeInputs, setFreeInputs] = useState<Record<string, string>>({});
  // 카드 전체 자유 입력 (하단)
  const [freeText, setFreeText] = useState('');
  // Phase AD Step 2 — ImageUploader 가 통지하는 업로드 경로 배열
  const [attachments, setAttachments] = useState<string[]>([]);

  const togglePick = (qId: string, num: number) => {
    setPicks((prev) => {
      const set = new Set(prev[qId] ?? []);
      if (set.has(num)) set.delete(num);
      else set.add(num);
      return { ...prev, [qId]: set };
    });
  };

  const isPicked = (qId: string, num: number) => picks[qId]?.has(num) ?? false;

  // 질문 하나에서 기타(needsInput) 옵션이 선택됐는지
  const hasFreeOption = (q: CardRequest['questions'][number]) =>
    (q.options ?? []).some((o) => o.needsInput && isPicked(q.id, o.num));

  const collectAttachmentPaths = (): string[] => attachments;

  const handleSubmitPicks = () => {
    // 복수 선택 지원 — 각 질문의 선택된 옵션 label을 "+" 로 연결한 자연어 조합 생성
    // Agent가 free_text로 재해석 (answer-parser.service.ts 규칙과 호환)
    const parts = card.questions
      .map((q) => {
        const selected = picks[q.id];
        if (!selected || selected.size === 0) return null;
        const labels = [...selected]
          .map((n) => {
            const opt = q.options.find((o) => o.num === n);
            if (!opt) return '';
            if (opt.needsInput) {
              const txt = (freeInputs[q.id] ?? '').trim();
              return txt ? `${opt.label}: ${txt}` : opt.label;
            }
            return opt.label;
          })
          .filter(Boolean);
        if (labels.length === 0) return null;
        return `${q.question} → ${labels.join(' + ')}`;
      })
      .filter(Boolean);

    if (parts.length === 0) return;
    onSubmit(parts.join('\n'), collectAttachmentPaths());
  };

  const handleSubmitFree = () => {
    if (!freeText.trim()) return;
    onSubmit(freeText.trim(), collectAttachmentPaths());
    setFreeText('');
  };

  const handleQuickStart = () =>
    onSubmit(card.quickStart.value, collectAttachmentPaths());

  // 질문마다 최소 1개 선택됐는지 (complete 기준 완화 — 복수 선택 가능하므로)
  const anyPicked = card.questions.some((q) => (picks[q.id]?.size ?? 0) > 0);
  const allPicked = card.questions.every((q) => (picks[q.id]?.size ?? 0) > 0);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      data-testid="answer-sheet-card"
    >
      {/* 제목 */}
      <h3 className="mb-3 text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
        {card.title}
      </h3>

      {/* AI 추정값 */}
      {card.assumed && Object.keys(card.assumed).length > 0 && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs dark:bg-emerald-950/30">
          <div className="mb-1 font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ 자동 추정한 항목
          </div>
          <ul className="space-y-0.5 text-emerald-800 dark:text-emerald-300">
            {Object.entries(card.assumed).map(([k, v]) => (
              <li key={k}>
                <span className="font-mono">{k}</span>: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 질문 섹션 */}
      <div className="space-y-5">
        {card.questions.map((q, idx) => (
          <div key={q.id}>
            <p className="mb-2 text-sm font-semibold text-slate-800 sm:text-base dark:text-slate-200">
              {idx + 1}. {q.emoji ?? ''} {q.question}{' '}
              <span className="ml-1 text-xs font-normal text-slate-400">
                (복수 선택 가능)
              </span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {q.options.map((opt) => {
                const picked = isPicked(q.id, opt.num);
                return (
                  <button
                    key={opt.num}
                    type="button"
                    onClick={() => togglePick(q.id, opt.num)}
                    disabled={disabled}
                    className={[
                      'flex min-h-12 items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      picked
                        ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500',
                    ].join(' ')}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      [{opt.num}]
                    </span>
                    <span className="flex-1">{opt.label}</span>
                    {picked && (
                      <span className="text-xs text-blue-500 dark:text-blue-400">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* "기타" 옵션이 선택됐으면 인라인 입력창 노출 */}
            {hasFreeOption(q) && (
              <input
                type="text"
                value={freeInputs[q.id] ?? ''}
                onChange={(e) =>
                  setFreeInputs((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                placeholder="직접 입력하세요 (예: 특정 사이트 이름, 색상 키워드 등)"
                disabled={disabled}
                style={{ fontSize: '16px' }}
                className="mt-2 w-full rounded-lg border border-blue-300 bg-blue-50/50 px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/20 dark:text-slate-100"
              />
            )}
          </div>
        ))}
      </div>

      {/* Phase AD Step 2 — 공용 ImageUploader 위임 */}
      {onUploadAttachment && (
        <div className="mt-5">
          <ImageUploader
            onUpload={onUploadAttachment}
            onChange={setAttachments}
            disabled={disabled}
          />
        </div>
      )}

      {/* 입력 안내 */}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        💬 {card.inputHint}
      </p>

      {/* 액션 버튼 */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSubmitPicks}
          disabled={disabled || !anyPicked}
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
        >
          선택 완료 → 진행{' '}
          {allPicked ? '' : anyPicked ? '(일부만 선택됨)' : ''}
        </button>
        <button
          type="button"
          onClick={handleQuickStart}
          disabled={disabled}
          className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {card.quickStart.label}
        </button>
      </div>

      {/* 자유 입력 (항상) */}
      <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row dark:border-slate-800">
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitFree();
          }}
          placeholder="또는 자연어로 직접 입력 (예: 야놀자 스타일)"
          disabled={disabled}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          style={{ fontSize: '16px' }}
        />
        <button
          type="button"
          onClick={handleSubmitFree}
          disabled={disabled || !freeText.trim()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 sm:text-base dark:bg-slate-700"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
