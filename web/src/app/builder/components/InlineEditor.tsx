'use client';

import { useState, useRef, useEffect, RefObject } from 'react';
import { authFetch } from '@/lib/api';
import type { SelectedElement } from './BuilderPreview';

interface InlineEditorProps {
  selectedElement: SelectedElement;
  projectId: string;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
  onSendToChat: (prompt: string) => void;
}

export default function InlineEditor({
  selectedElement,
  projectId,
  iframeRef,
  onClose,
  onSendToChat,
}: InlineEditorProps) {
  const el = selectedElement;

  // 텍스트 편집
  const [text, setText] = useState(el.innerText || el.textContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 색상 편집
  const [textColor, setTextColor] = useState(el.styles.color || '');
  const [bgColor, setBgColor] = useState(el.styles.backgroundColor || '');

  // 이미지 편집
  const [imageSrc, setImageSrc] = useState(el.imageSrc || '');

  // selectedElement 바뀌면 state 리셋
  useEffect(() => {
    setText(el.innerText || el.textContent);
    setTextColor(el.styles.color || '');
    setBgColor(el.styles.backgroundColor || '');
    setImageSrc(el.imageSrc || '');
    setSaved(false);
  }, [el]);

  // iframe에 postMessage 전송
  const postToIframe = (msg: Record<string, unknown>) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, '*');
    }
  };

  // 텍스트 즉시 적용
  const applyText = async () => {
    postToIframe({ type: 'update-text', value: text });
    await saveToDb(el.innerText || el.textContent, text);
  };

  // 색상 즉시 적용
  const applyColor = (property: string, value: string) => {
    postToIframe({ type: 'update-style', property, value });
  };

  // 이미지 즉시 적용
  const applyImage = () => {
    postToIframe({ type: 'update-image', value: imageSrc });
  };

  // DB에 저장 (inline-edit API)
  const saveToDb = async (oldText: string, newText: string) => {
    if (!el.file || oldText === newText) return;
    setSaving(true);
    try {
      await authFetch(`/projects/${projectId}/inline-edit`, {
        method: 'PATCH',
        body: JSON.stringify({
          filePath: el.file,
          oldText: oldText.trim(),
          newText: newText.trim(),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // 실패해도 DOM 변경은 유지 (다음 재배포 시 반영 안 됨)
    }
    setSaving(false);
  };

  // AI에게 수정 요청
  const handleSendToChat = () => {
    const ctx = el.component
      ? `[${el.component}] ${el.file || ''}`
      : el.file || el.tagName;
    onSendToChat(ctx);
  };

  // 요소 타입에 따른 라벨
  const elementLabel = el.component || el.tagName;
  const hasFile = !!el.file;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-50 rounded-xl border border-[#2c2c35] bg-[#1e1e26] shadow-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-[#2c2c35] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#3182f6]">{elementLabel}</span>
          <span className="text-[10px] text-[#4e5968]">{el.tagName}</span>
          {hasFile && (
            <span className="text-[10px] text-[#4e5968] truncate max-w-[200px]">{el.file}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[10px] text-emerald-400">저장됨</span>}
          {saving && <span className="text-[10px] text-[#ffd60a]">저장 중...</span>}
          <button onClick={onClose} className="text-[#6b7684] hover:text-[#f2f4f6] text-sm">
            x
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* 텍스트 편집 */}
        {el.isText && (
          <div>
            <label className="text-[10px] font-medium text-[#8b95a1] uppercase tracking-wider">텍스트</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 rounded-lg bg-[#13131a] border border-[#2c2c35] px-3 py-2 text-xs text-[#f2f4f6] focus:border-[#3182f6] focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter') applyText(); }}
              />
              <button
                onClick={applyText}
                disabled={saving}
                className="rounded-lg bg-[#3182f6] px-3 py-2 text-xs font-medium text-white hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* 색상 편집 */}
        <div className="flex gap-4">
          <div>
            <label className="text-[10px] font-medium text-[#8b95a1] uppercase tracking-wider">글자색</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(textColor)}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  applyColor('color', e.target.value);
                }}
                className="h-8 w-8 cursor-pointer rounded border border-[#2c2c35] bg-transparent"
              />
              <span className="text-[10px] text-[#6b7684]">{textColor}</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-[#8b95a1] uppercase tracking-wider">배경색</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(bgColor)}
                onChange={(e) => {
                  setBgColor(e.target.value);
                  applyColor('backgroundColor', e.target.value);
                }}
                className="h-8 w-8 cursor-pointer rounded border border-[#2c2c35] bg-transparent"
              />
              <span className="text-[10px] text-[#6b7684]">{bgColor}</span>
            </div>
          </div>
        </div>

        {/* 이미지 편집 */}
        {el.isImage && (
          <div>
            <label className="text-[10px] font-medium text-[#8b95a1] uppercase tracking-wider">이미지 URL</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={imageSrc}
                onChange={(e) => setImageSrc(e.target.value)}
                className="flex-1 rounded-lg bg-[#13131a] border border-[#2c2c35] px-3 py-2 text-xs text-[#f2f4f6] focus:border-[#3182f6] focus:outline-none"
                placeholder="https://..."
              />
              <button
                onClick={applyImage}
                className="rounded-lg bg-[#3182f6] px-3 py-2 text-xs font-medium text-white hover:bg-[#2563eb] transition-colors"
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* AI 수정 요청 버튼 */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSendToChat}
            className="flex-1 rounded-lg bg-[#2c2c35] px-3 py-2 text-xs font-medium text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors"
          >
            AI에게 수정 요청
          </button>
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
