'use client';

// Phase O (2026-04-22): /start 확인 스테이지 — 스펙 + 채팅 수정 2분할 UI
//   좌측: 앱 스펙 카드 (정체성 / 타겟 / 핵심 기능 / 디자인 / 전략)
//   우측: 포비 채팅창 — "여기 수정해줘" 자연어 → Sonnet in-place 스펙 업데이트
//   하단: [이대로 시작] (Agent 실행) / [취소]
//
// 데이터 흐름:
//   - 초기 finalSpec (인터뷰 또는 summarizeToAgentSpec 결과) 주입
//   - 사용자가 채팅으로 "결제 추가" 요청 → POST /ai/refine-spec → updatedSpec
//   - 좌측 스펙 카드 실시간 반영
//   - [이대로 시작] 누르면 onConfirm(spec) 호출 → 상위 page.tsx 가 /builder/agent 이동

import { useCallback, useEffect, useRef, useState } from 'react';
import { authFetch, API_BASE, getToken } from '@/lib/api';
import ImageUploader, { type UploadedAttachment } from '@/components/ImageUploader';
import PresetSelectModal from './PresetSelectModal';
import type { PortfolioApp } from '@/lib/portfolio-apps';

export interface SpecBundle {
  spec: {
    appName?: string;
    tagline?: string;
    coreFeatures?: string[];
    designTone?: string;
    techHints?: {
      supabase?: boolean;
      requiresApiKey?: string;
      mobile?: boolean;
    };
  } | null;
  strategy: {
    targetUser?: string;
    differentiator?: string;
    mvpScope?: { include?: string[]; exclude?: string[] };
    benchmarks?: string[];
    risks?: string[];
  } | null;
  raw: string;
  sourceType: 'prompt' | 'meeting';
  confidence: number;
  fallbackRequired?: boolean;
  // Phase AD Step 3 (2026-04-23): 사용자 업로드 레퍼런스 이미지 절대 경로
  // /tmp/foundry-attachments/pre-session-<userId>-<ts>/<uuid>.<ext>
  // /builder/agent 진입 시 wrappedPrompt 에 §14 룰대로 주입됨
  attachments?: string[];
  // Phase AD Step 11-B/C (2026-04-23): 포트폴리오 프리셋 (이미지 없이 디자인 골격 선택)
  preset?: {
    name: string;
    url: string;
    layout: string;
    screenshot: string;
  };
}

type ChatMessage =
  | { role: 'assistant'; text: string; ts: number }
  | { role: 'user'; text: string; ts: number };

const CREDIT_PER_APP = 6800;

interface Props {
  initialSpec: SpecBundle;
  balance: number | null;
  onConfirm: (finalSpec: SpecBundle) => void;
  onCancel: () => void;
}

export default function ReviewStage({
  initialSpec,
  balance,
  onConfirm,
  onCancel,
}: Props) {
  const [spec, setSpec] = useState<SpecBundle>(initialSpec);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text:
        '아래가 정리된 스펙이에요. 수정하고 싶은 부분이 있으면 자연어로 말해주세요.\n' +
        '예: "결제 추가해줘" · "타겟을 30대로" · "디자인 다크모드로"\n\n' +
        '이대로 좋으면 [이대로 시작] 눌러주세요!',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastChanges, setLastChanges] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Phase AD Step 3 (2026-04-23): 세션 시작 전 이미지 업로드
  // sessionFolder = 첫 업로드 응답으로 받은 폴더 ID, 이후 업로드부터 동봉해서 같은 폴더 누적
  const [sessionFolder, setSessionFolder] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  // Phase AD Step 11-B (2026-04-23): 프리셋 선택 모달
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PortfolioApp | null>(null);

  const uploadPreSession = useCallback(
    async (file: File): Promise<UploadedAttachment> => {
      setUploadInProgress(true);
      try {
        const token = getToken();
        const fd = new FormData();
        fd.append('file', file);
        if (sessionFolder) fd.append('sessionFolder', sessionFolder);
        const res = await fetch(`${API_BASE}/ai/agent-build/pre-session-attachments`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => res.statusText);
          throw new Error(`업로드 실패: ${txt}`);
        }
        const data = await res.json();
        if (!sessionFolder && typeof data.sessionFolder === 'string') {
          setSessionFolder(data.sessionFolder);
        }
        return {
          path: data.path,
          filename: data.filename,
          originalName: data.originalName,
          size: data.size,
        };
      } finally {
        setUploadInProgress(false);
      }
    },
    [sessionFolder],
  );

  // Phase AD Step 10-2 (2026-04-23): 업로드 직후 자동 충돌 채팅
  // ImageUploader.onUploadComplete 가 호출 → 이미지 분석 API → 포비 메시지 자동 추가
  // 분석 실패해도 진행 가능 (이미지만 사용, 채팅 메시지 생략)
  const [analyzing, setAnalyzing] = useState(false);
  const handleImageAnalysis = useCallback(
    async (uploaded: UploadedAttachment) => {
      setAnalyzing(true);
      try {
        const res = await authFetch('/ai/analyze-reference-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: uploaded.path, currentSpec: spec }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (typeof data.suggestedMessage === 'string' && data.suggestedMessage.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: `📸 ${uploaded.originalName} 분석 완료\n\n${data.suggestedMessage}`,
              ts: Date.now(),
            },
          ]);
        }
      } catch (e: any) {
        // 분석 실패해도 이미지는 wrappedPrompt 에 포함됨 — 무성으로 진행
        // 단, 채팅에 짧은 안내 한 줄 (사용자 의문 방지)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `📸 ${uploaded.originalName} 받았어요. (분석은 일시 오류 — 포비가 직접 이미지 보고 만들게요)`,
            ts: Date.now(),
          },
        ]);
      } finally {
        setAnalyzing(false);
      }
    },
    [spec],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  const enoughCredit = balance === null || balance >= CREDIT_PER_APP;

  const submitRefine = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text, ts: Date.now() }]);
    setLoading(true);

    try {
      const res = await authFetch('/ai/refine-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSpec: spec,
          userRequest: text,
          chatHistory: messages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const data = await res.json();
      // 스펙 업데이트
      if (data.updatedSpec) {
        setSpec((prev) => ({
          ...prev,
          spec: data.updatedSpec.spec ?? prev.spec,
          strategy: data.updatedSpec.strategy ?? prev.strategy,
          confidence: data.updatedSpec.confidence ?? prev.confidence,
        }));
      }
      setLastChanges(data.changes ?? []);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.message ?? '업데이트 완료',
          ts: Date.now(),
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ 수정 실패: ${e?.message ?? '알 수 없는 오류'}. 다시 시도해주세요.`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitRefine();
    }
  };

  const coreFeatures = spec.spec?.coreFeatures ?? [];
  const mvpInclude = spec.strategy?.mvpScope?.include ?? [];

  return (
    <div className="mx-auto grid h-full w-full max-w-6xl gap-4 lg:grid-cols-[1fr_1fr]">
      {/* ═══ 좌측: 스펙 카드 ═══ */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            📝 정리된 스펙
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            신뢰도 {Math.round(spec.confidence * 100)}% · 우측 채팅으로 수정 가능
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {/* 앱 이름 + 태그라인 */}
          {spec.spec?.appName && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                앱 이름
              </div>
              <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {spec.spec.appName}
              </div>
              {spec.spec.tagline && (
                <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {spec.spec.tagline}
                </div>
              )}
            </div>
          )}

          {/* 타겟 */}
          {spec.strategy?.targetUser && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                👥 타겟 사용자
              </div>
              <div className="mt-1 text-slate-800 dark:text-slate-200">
                {spec.strategy.targetUser}
              </div>
            </div>
          )}

          {/* 차별점 */}
          {spec.strategy?.differentiator && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                🏆 차별점
              </div>
              <div className="mt-1 text-slate-800 dark:text-slate-200">
                {spec.strategy.differentiator}
              </div>
            </div>
          )}

          {/* 핵심 기능 */}
          {coreFeatures.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                ⚙️ 핵심 기능
              </div>
              <ul className="mt-1 space-y-1">
                {coreFeatures.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-slate-800 dark:text-slate-200"
                  >
                    <span className="text-blue-500">▸</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 디자인 톤 */}
          {spec.spec?.designTone && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                🎨 디자인 톤
              </div>
              <div className="mt-1 text-slate-800 dark:text-slate-200">
                {spec.spec.designTone}
              </div>
            </div>
          )}

          {/* MVP 범위 */}
          {(mvpInclude.length > 0 || (spec.strategy?.mvpScope?.exclude ?? []).length > 0) && (
            <details className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                📊 MVP 범위 (접기/펼치기)
              </summary>
              <div className="mt-2 space-y-2 text-xs">
                {mvpInclude.length > 0 && (
                  <div>
                    <div className="font-semibold text-emerald-600">✓ V1 포함</div>
                    <ul className="mt-1 ml-4 list-disc space-y-0.5 text-slate-700 dark:text-slate-300">
                      {mvpInclude.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(spec.strategy?.mvpScope?.exclude ?? []).length > 0 && (
                  <div>
                    <div className="font-semibold text-slate-400">
                      ⏭ V2 이후 (제외)
                    </div>
                    <ul className="mt-1 ml-4 list-disc space-y-0.5 text-slate-500 dark:text-slate-400">
                      {(spec.strategy?.mvpScope?.exclude ?? []).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* 최근 변경 알림 */}
          {lastChanges.length > 0 && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              <div className="font-semibold">🔄 방금 변경됨</div>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                {lastChanges.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Phase AD Step 3 — 참고 디자인 이미지 업로드 (디자인만 참조 안내) */}
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            📎 참고 디자인 이미지 (선택)
          </h3>
          <div className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            💡 <strong>디자인만 참조돼요</strong>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              <li>✅ 색상 / 레이아웃 / 폰트 / 컴포넌트 스타일</li>
              <li>❌ 이미지 속 기능·메뉴·텍스트는 복제 안 됨</li>
              <li>👉 &quot;네이버처럼&quot; 올리면 &quot;녹색 네비 톤&quot;만 가져옴 (뉴스/쇼핑 기능 X)</li>
            </ul>
            <div className="mt-1.5">기능 추가는 위의 <strong>스펙</strong>에 써주세요.</div>
          </div>
          <ImageUploader
            onUpload={uploadPreSession}
            onChange={setAttachments}
            onUploadComplete={handleImageAnalysis}
            disabled={loading}
            title=""
            helperText=""
          />
          {analyzing && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              🔍 포비가 이미지 분석 중... (약 5초)
            </p>
          )}
        </div>

        {/* 하단 — 크레딧 + 시작 버튼 */}
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">💳 앱 생성 시 차감</span>
            <span
              className={
                enoughCredit
                  ? 'font-bold text-slate-900 dark:text-slate-100'
                  : 'font-bold text-rose-600'
              }
            >
              {CREDIT_PER_APP.toLocaleString()} cr
              {balance !== null && (
                <span className="ml-1 font-normal text-slate-500">
                  (잔액 {balance.toLocaleString()})
                </span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                // Phase AD Step 11-B: 이미지·프리셋 둘 다 없으면 프리셋 모달 한 번 띄우기
                if (attachments.length === 0 && !selectedPreset) {
                  setPresetModalOpen(true);
                  return;
                }
                onConfirm({
                  ...spec,
                  attachments,
                  preset: selectedPreset
                    ? {
                        name: selectedPreset.name,
                        url: selectedPreset.url,
                        layout: selectedPreset.layout,
                        screenshot: selectedPreset.screenshot,
                      }
                    : undefined,
                });
              }}
              disabled={!enoughCredit || uploadInProgress}
              className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {!enoughCredit
                ? '⚠️ 크레딧 부족'
                : uploadInProgress
                  ? '⏳ 이미지 업로드 중...'
                  : '✅ 이대로 시작 →'}
            </button>
          </div>

          {/* 프리셋 선택 시 작은 안내 */}
          {selectedPreset && (
            <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
              🎨 디자인 프리셋: <strong>{selectedPreset.name}</strong> ({selectedPreset.layout})
              <button
                type="button"
                onClick={() => setSelectedPreset(null)}
                className="ml-2 text-blue-600 underline hover:text-blue-800"
              >
                해제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phase AD Step 11-B — 프리셋 모달 */}
      <PresetSelectModal
        isOpen={presetModalOpen}
        onSelect={(preset) => {
          setPresetModalOpen(false);
          setSelectedPreset(preset);
          // 모달에서 선택/건너뛰기 후 즉시 시작
          onConfirm({
            ...spec,
            attachments,
            preset: preset
              ? {
                  name: preset.name,
                  url: preset.url,
                  layout: preset.layout,
                  screenshot: preset.screenshot,
                }
              : undefined,
          });
        }}
      />

      {/* ═══ 우측: 채팅 수정 ═══ */}
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            💬 포비와 대화
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            자연어로 수정·추가·삭제 요청 가능 (무료)
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) =>
            m.role === 'assistant' ? (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  {m.text.split('\n').map((line, j) => (
                    <div key={j}>{line || <br />}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-2 text-sm text-white">
                  {m.text}
                </div>
              </div>
            ),
          )}
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
        </div>

        {/* 입력창 */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="예: 결제 기능 추가해줘 / 타겟을 20대로 바꿔"
              rows={2}
              disabled={loading}
              style={{ fontSize: '16px' }}
              className="flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={submitRefine}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? '...' : '보내기'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Enter 전송 · Shift+Enter 줄바꿈
          </p>
        </div>
      </div>
    </div>
  );
}
