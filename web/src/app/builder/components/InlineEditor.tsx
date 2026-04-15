'use client';

import { useState, useRef, useEffect, useCallback, RefObject } from 'react';
import { authFetch } from '@/lib/api';
import type { SelectedElement } from './BuilderPreview';

interface InlineEditorProps {
  selectedElement: SelectedElement;
  projectId: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
  onSendToChat: (prompt: string) => void;
  onInlineEditSaved: () => void;
  onSavingChange: (saving: boolean) => void; // 디바운스 저장 상태 → 경쟁 상태 방지
}

export default function InlineEditor({
  selectedElement,
  projectId,
  iframeRef,
  onClose,
  onSendToChat,
  onInlineEditSaved,
  onSavingChange,
}: InlineEditorProps) {
  const el = selectedElement;

  // 텍스트 편집
  const [text, setText] = useState(el.innerText || el.textContent);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');

  // 색상 편집
  const [textColor, setTextColor] = useState(el.styles.color || '');
  const [bgColor, setBgColor] = useState(el.styles.backgroundColor || '');

  // 이미지 편집
  const [imageSrc, setImageSrc] = useState(el.imageSrc || '');

  // 디바운스 타이머
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // selectedElement 바뀌면 state 리셋
  useEffect(() => {
    setText(el.innerText || el.textContent);
    setTextColor(el.styles.color || '');
    setBgColor(el.styles.backgroundColor || '');
    setImageSrc(el.imageSrc || '');
    setStatus('idle');
  }, [el]);

  // 언마운트 시 디바운스 클리어
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // iframe에 postMessage 전송
  const postToIframe = (msg: Record<string, unknown>) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, '*');
    }
  };

  // DB에 저장 (inline-edit API) — 실패 감지 포함
  const saveToDb = useCallback(async (oldText: string, newText: string) => {
    if (oldText === newText) return;
    // file이 없으면 전체 파일 검색으로 fallback
    setSaving(true);
    onSavingChange(true);
    try {
      const res = await authFetch(`/projects/${projectId}/inline-edit`, {
        method: 'PATCH',
        body: JSON.stringify({
          filePath: el.file,
          oldText: oldText.trim(),
          newText: newText.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.matchFound) {
          setStatus('saved');
          setTimeout(() => setStatus('idle'), 2000);
          onInlineEditSaved();
        } else {
          // 치환 실패: 소스코드에서 매칭 안 됨
          setStatus('failed');
        }
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
    setSaving(false);
    onSavingChange(false);
  }, [el.file, projectId, onInlineEditSaved, onSavingChange]);

  // 디바운스 저장 (색상용 — 500ms)
  const debouncedSaveToDb = useCallback((oldText: string, newText: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSavingChange(true); // 디바운스 대기 중에도 "저장 중" 표시
    debounceRef.current = setTimeout(() => {
      saveToDb(oldText, newText);
    }, 500);
  }, [saveToDb, onSavingChange]);

  // 텍스트 즉시 적용 — 순수 innerText 전송 (API에서 JSX 패턴 매칭)
  const applyText = async () => {
    postToIframe({ type: 'update-text', value: text });
    const oldText = el.innerText || el.textContent;
    await saveToDb(oldText, text);
  };

  // 색상 즉시 적용 + 디바운스 DB 저장
  const applyColor = (property: string, value: string, oldValue: string) => {
    postToIframe({ type: 'update-style', property, value });
    if (el.file && oldValue && oldValue !== value) {
      const oldHex = rgbToHex(oldValue);
      const newHex = value;
      if (oldHex !== newHex) {
        debouncedSaveToDb(oldHex, newHex);
      }
    }
  };

  // 이미지 즉시 적용 + DB 저장
  const applyImage = () => {
    postToIframe({ type: 'update-image', value: imageSrc });
    if (el.imageSrc && el.imageSrc !== imageSrc) {
      saveToDb(el.imageSrc, imageSrc);
    }
  };

  // AI에게 수정 요청
  const handleSendToChat = () => {
    const ctx = el.component
      ? `[${el.component}] ${el.file || ''}`
      : el.file || el.tagName;
    onSendToChat(ctx);
  };

  const elementLabel = el.component || el.tagName;
  const hasFile = !!el.file;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-50 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-subtle)] shadow-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--toss-blue)]">{elementLabel}</span>
          <span className="text-[10px] text-[var(--text-disabled)]">{el.tagName}</span>
          {hasFile && (
            <span className="text-[10px] text-[var(--text-disabled)] truncate max-w-[200px]">{el.file}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === 'saved' && <span className="text-[10px] text-emerald-400">저장됨</span>}
          {saving && <span className="text-[10px] text-[var(--toss-yellow)]">저장 중...</span>}
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm">x</button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* 치환 실패 경고 */}
        {status === 'failed' && (
          <div className="rounded-lg bg-[#ff6b35]/10 border border-[var(--toss-yellow)]/30 px-3 py-2 text-[11px] text-[var(--toss-yellow)]">
            소스코드에서 매칭되지 않아 저장에 실패했습니다. AI 수정을 이용해주세요.
          </div>
        )}

        {/* 텍스트 편집 */}
        {el.isText && (
          <div>
            <label className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">텍스트</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 rounded-lg bg-[var(--bg-header)] border border-[var(--border-primary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--toss-blue)] focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') applyText(); }}
              />
              <button
                onClick={applyText}
                disabled={saving}
                className="rounded-lg bg-[var(--toss-blue)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--toss-blue)] disabled:opacity-50 transition-colors"
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* 색상 편집 */}
        <div className="flex gap-4">
          <div>
            <label className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">글자색</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(textColor)}
                onChange={(e) => {
                  const oldVal = textColor;
                  setTextColor(e.target.value);
                  applyColor('color', e.target.value, oldVal);
                }}
                className="h-8 w-8 cursor-pointer rounded border border-[var(--border-primary)] bg-transparent"
              />
              <span className="text-[10px] text-[var(--text-tertiary)]">{textColor}</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">배경색</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(bgColor)}
                onChange={(e) => {
                  const oldVal = bgColor;
                  setBgColor(e.target.value);
                  applyColor('backgroundColor', e.target.value, oldVal);
                }}
                className="h-8 w-8 cursor-pointer rounded border border-[var(--border-primary)] bg-transparent"
              />
              <span className="text-[10px] text-[var(--text-tertiary)]">{bgColor}</span>
            </div>
          </div>
        </div>

        {/* 이미지 편집 */}
        {el.isImage && (
          <div>
            <label className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">이미지 URL</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={imageSrc}
                onChange={(e) => setImageSrc(e.target.value)}
                className="flex-1 rounded-lg bg-[var(--bg-header)] border border-[var(--border-primary)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--toss-blue)] focus:outline-none"
                placeholder="https://..."
              />
              <button
                onClick={applyImage}
                className="rounded-lg bg-[var(--toss-blue)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--toss-blue)] transition-colors"
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* AI 수정 요청 버튼 */}
        <div className="flex flex-col gap-1 pt-1">
          <button
            onClick={handleSendToChat}
            className="flex-1 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
          >
            AI에게 수정 요청
          </button>
          <p className="text-[10px] text-[var(--text-secondary)] text-center leading-tight">
            버튼을 누르면 채팅창에 좌표가 입력됩니다.<br/>좌표 뒤에 원하는 변경사항을 적어주세요!
          </p>
        </div>

        {/* 온라인 게시 안내 */}
        <div className="rounded-lg bg-[var(--toss-blue)]/5 border border-[var(--toss-blue)]/20 px-3 py-2.5">
          <p className="text-[10px] text-[var(--toss-blue)] leading-relaxed font-medium text-center">
            적용 후 <strong>&quot;온라인 게시&quot;</strong>를 눌러야<br/>실제 URL에도 변경이 반영됩니다!
          </p>
        </div>
      </div>
    </div>
  );
}

// rgb(r,g,b) → #hex 변환
function rgbToHex(rgb: string): string {
  if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return '#000000';
  const [r, g, b] = match.map(Number);
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
