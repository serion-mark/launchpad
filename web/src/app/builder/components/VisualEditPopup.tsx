'use client';

import { useState } from 'react';

interface VisualEditPopupProps {
  element: {
    tagName: string;
    className: string;
    textContent: string;
    component: string | null;
    rect: { x: number; y: number; width: number; height: number };
  };
  projectId: string;
  modelTier: string;
  onAiEdit: (message: string) => void;
  onClose: () => void;
}

export default function VisualEditPopup({
  element,
  projectId,
  modelTier,
  onAiEdit,
  onClose,
}: VisualEditPopupProps) {
  const [editText, setEditText] = useState(element.textContent.trim());
  const [editColor, setEditColor] = useState('#3182f6');
  const [customRequest, setCustomRequest] = useState('');
  const [mode, setMode] = useState<'quick' | 'custom'>('quick');

  const handleAiQuickEdit = () => {
    const parts: string[] = [];
    const target = element.component
      ? `"${element.component}" 컴포넌트`
      : `<${element.tagName.toLowerCase()}> 요소`;

    if (editText !== element.textContent.trim()) {
      parts.push(`텍스트를 "${editText}"로 변경`);
    }
    if (editColor !== '#3182f6') {
      parts.push(`배경색을 ${editColor}로 변경`);
    }

    if (parts.length === 0) {
      parts.push('스타일을 개선');
    }

    onAiEdit(`${target}의 ${parts.join(', ')}해주세요`);
  };

  const handleAiCustomEdit = () => {
    if (!customRequest.trim()) return;
    const target = element.component
      ? `"${element.component}" 컴포넌트`
      : `<${element.tagName.toLowerCase()}> 요소`;
    onAiEdit(`${target}: ${customRequest}`);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        background: '#1e1e26',
        border: '1px solid #3182f6',
        borderRadius: '16px',
        padding: '20px',
        width: '320px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ color: '#f2f4f6', fontSize: '14px', fontWeight: 600 }}>
            요소 수정
          </div>
          <div style={{ color: '#6b7684', fontSize: '11px', marginTop: '2px' }}>
            &lt;{element.tagName.toLowerCase()}&gt;
            {element.component && ` — ${element.component}`}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b7684',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          &times;
        </button>
      </div>

      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <button
          onClick={() => setMode('quick')}
          style={{
            flex: 1,
            padding: '6px',
            fontSize: '12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: mode === 'quick' ? '#3182f6' : '#2c2c35',
            color: mode === 'quick' ? 'white' : '#8b95a1',
          }}
        >
          빠른 수정
        </button>
        <button
          onClick={() => setMode('custom')}
          style={{
            flex: 1,
            padding: '6px',
            fontSize: '12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: mode === 'custom' ? '#3182f6' : '#2c2c35',
            color: mode === 'custom' ? 'white' : '#8b95a1',
          }}
        >
          AI에게 요청
        </button>
      </div>

      {mode === 'quick' ? (
        <>
          {/* 텍스트 편집 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#8b95a1', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
              텍스트
            </label>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #2c2c35',
                background: '#16161c',
                color: '#f2f4f6',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* 배경색 편집 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#8b95a1', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
              배경색
            </label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
              />
              <span style={{ color: '#8b95a1', fontSize: '12px' }}>{editColor}</span>
            </div>
          </div>

          {/* 빠른 수정 버튼 */}
          <button
            onClick={handleAiQuickEdit}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #3182f6, #2563eb)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            AI에게 수정 요청
          </button>
          <p style={{ fontSize: '10px', color: '#8b95a1', textAlign: 'center', marginTop: '4px', lineHeight: '1.4' }}>
            버튼을 누르면 채팅창에 좌표가 입력됩니다.<br/>좌표 뒤에 원하는 변경사항을 적어주세요!
          </p>
        </>
      ) : (
        <>
          {/* 자유 요청 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#8b95a1', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
              수정 요청
            </label>
            <textarea
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              placeholder="예: 버튼을 더 크게, 그림자 추가, 둥근 모서리..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #2c2c35',
                background: '#16161c',
                color: '#f2f4f6',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <button
            onClick={handleAiCustomEdit}
            disabled={!customRequest.trim()}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: customRequest.trim()
                ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                : '#2c2c35',
              color: customRequest.trim() ? 'white' : '#6b7684',
              fontSize: '13px',
              fontWeight: 600,
              cursor: customRequest.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            AI에게 요청
          </button>
        </>
      )}
    </div>
  );
}
