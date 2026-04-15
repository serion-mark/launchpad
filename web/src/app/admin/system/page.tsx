'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api';

export default function AdminSystemPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const check = useCallback(async () => {
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('launchpad_token') || ''}` },
      });
      setLatency(Date.now() - start);
      setApiOk(res.ok);
    } catch {
      setApiOk(false);
      setLatency(null);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [check]);

  const card: React.CSSProperties = { background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px', marginBottom: 20 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>서비스 상태</h1>
        <button onClick={check} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 13, border: '1px solid var(--adm-border)', background: 'var(--adm-surface-2)', color: 'var(--adm-text-sec)', cursor: 'pointer' }}>
          새로고침
        </button>
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>서비스 연결 상태</h3>
        {[
          { name: 'API 서버', ok: apiOk, detail: latency ? `응답: ${latency}ms` : undefined },
          { name: '웹 서버 (Next.js)', ok: true, detail: '정상 (현재 페이지 로드됨)' },
          { name: 'PostgreSQL DB', ok: apiOk, detail: apiOk ? '연결됨 (API 정상 = DB 정상)' : '확인 불가' },
        ].map((svc, i) => (
          <div key={svc.name} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
            borderBottom: i < 2 ? '1px solid var(--adm-border)' : 'none',
          }}>
            <span style={{ fontSize: 14, color: svc.ok ? '#22c55e' : svc.ok === false ? '#ef4444' : 'var(--adm-text-muted)' }}>
              {svc.ok ? '●' : svc.ok === false ? '●' : '○'}
            </span>
            <span style={{ width: 160, fontWeight: 600, fontSize: 14 }}>{svc.name}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: svc.ok ? '#22c55e' : svc.ok === false ? '#ef4444' : 'var(--adm-text-muted)' }}>
              {svc.ok ? '정상' : svc.ok === false ? '이상' : '확인 중...'}
            </span>
            {svc.detail && <span style={{ fontSize: 12, color: 'var(--adm-text-muted)' }}>{svc.detail}</span>}
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>서버 정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: '도메인', value: 'foundry.ai.kr' },
            { label: 'API 서버', value: '175.45.200.162:4000' },
            { label: '웹 서버', value: '175.45.200.162:3000' },
            { label: '스택', value: 'Next.js + NestJS + PostgreSQL' },
            { label: 'AI', value: 'Claude Sonnet + GPT-4o + Gemini' },
            { label: '배포', value: 'GitHub Actions 자동 배포' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0' }}>
              <span style={{ color: 'var(--adm-text-muted)' }}>{row.label}</span>
              <span style={{ fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--adm-text-muted)' }}>
        마지막 확인: {new Date().toLocaleString('ko-KR')} (1분마다 자동 갱신)
      </div>
    </div>
  );
}
