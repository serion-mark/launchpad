'use client';

import { useState, useEffect, useRef } from 'react';
import { authFetch } from '@/lib/api';

type AgentStep = {
  step: number;
  totalSteps: number;
  action: string;
  message: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
};

interface AgentPanelProps {
  projectId: string;
  task: string;
  onComplete: (modifiedFiles: { path: string; content: string }[]) => void;
  onCancel: () => void;
}

export default function AgentPanel({ projectId, task, onComplete, onCancel }: AgentPanelProps) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [summary, setSummary] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    runAgent(controller.signal);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [steps]);

  const runAgent = async (signal: AbortSignal) => {
    try {
      const token = localStorage.getItem('launchpad_token');
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

      const res = await fetch(`${API_BASE}/ai/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId, task }),
        signal,
      });

      if (!res.ok || !res.body) {
        setIsRunning(false);
        setSummary('Agent 실행 실패');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'step') {
              setSteps(prev => {
                const existing = prev.findIndex(s => s.step === data.step);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = data;
                  return updated;
                }
                return [...prev, data];
              });
            } else if (data.type === 'done') {
              setIsRunning(false);
              setSummary(data.summary || '완료');
              if (data.modifiedFiles) {
                onComplete(data.modifiedFiles);
              }
            } else if (data.type === 'error') {
              setIsRunning(false);
              setSummary(`오류: ${data.message}`);
            }
          } catch { /* ignore parse error */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setIsRunning(false);
        setSummary('Agent 연결 실패');
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    onCancel();
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done': return '✅';
      case 'running': return '🔄';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'read_file': return '📖';
      case 'modify_file': return '✏️';
      case 'run_build': return '🔨';
      case 'done': return '🎉';
      case 'init': return '🚀';
      default: return '🔧';
    }
  };

  return (
    <div style={{
      background: '#1e1e26',
      border: '1px solid #3182f6',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <span style={{ color: '#f2f4f6', fontWeight: 600, fontSize: '14px' }}>Agent Mode</span>
          {isRunning && (
            <span style={{
              background: '#3182f6',
              color: 'white',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              animation: 'pulse 2s infinite',
            }}>
              실행 중
            </span>
          )}
        </div>
        {isRunning && (
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            중단
          </button>
        )}
      </div>

      {/* 작업 설명 */}
      <div style={{
        color: '#8b95a1',
        fontSize: '13px',
        marginBottom: '12px',
        padding: '8px 12px',
        background: '#16161c',
        borderRadius: '8px',
      }}>
        &quot;{task}&quot;
      </div>

      {/* 단계 목록 */}
      <div
        ref={scrollRef}
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '6px',
              background: s.status === 'running' ? '#1a2744' : 'transparent',
            }}
          >
            <span style={{ fontSize: '14px', flexShrink: 0 }}>
              {getStepIcon(s.status)}
            </span>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>
              {getActionIcon(s.action)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: s.status === 'error' ? '#ef4444' : '#f2f4f6',
                fontSize: '13px',
              }}>
                {s.message}
              </div>
              {s.detail && (
                <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                  {s.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 완료 요약 */}
      {!isRunning && summary && (
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: summary.startsWith('오류') ? '#2d1b1b' : '#1a2d1b',
          borderRadius: '8px',
          color: summary.startsWith('오류') ? '#fca5a5' : '#86efac',
          fontSize: '13px',
        }}>
          {summary}
        </div>
      )}
    </div>
  );
}
