'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

type AiUsageData = {
  byTaskType: Record<string, { count: number; totalCredits: number }>;
  byModelTier: Record<string, { count: number; totalCredits: number }>;
  totalRequests: number;
};

export default function AdminAiUsagePage() {
  const [data, setData] = useState<AiUsageData | null>(null);

  useEffect(() => {
    authFetch('/admin/ai-usage').then(r => r.ok ? r.json() : null).then(d => d && setData(d));
  }, []);

  if (!data) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--adm-text-muted)' }}>불러오는 중...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>AI 사용량</h1>

      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--adm-text-sec)', marginBottom: 4 }}>총 AI 요청 수</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#3182f6' }}>{data.totalRequests.toLocaleString()}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>작업 유형별</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(data.byTaskType).map(([task, d]) => (
              <div key={task} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span>{task}</span>
                <div>
                  <span style={{ color: 'var(--adm-text-sec)' }}>{d.count}회</span>
                  <span style={{ marginLeft: 12, color: '#eab308', fontFamily: 'monospace' }}>{d.totalCredits.toLocaleString()} cr</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>모델 티어별</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(data.byModelTier).map(([tier, d]) => (
              <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: tier === 'premium' ? '#a855f7' : tier === 'standard' ? '#3182f6' : '#22c55e' }}>
                  {tier === 'fast' ? 'Fast (Haiku)' : tier === 'standard' ? 'Standard (Sonnet)' : tier === 'premium' ? 'Premium (Opus)' : tier}
                </span>
                <div>
                  <span style={{ color: 'var(--adm-text-sec)' }}>{d.count}회</span>
                  <span style={{ marginLeft: 12, color: '#eab308', fontFamily: 'monospace' }}>{d.totalCredits.toLocaleString()} cr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
