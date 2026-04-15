'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

type DashboardData = {
  totalUsers: number;
  todayUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  monthlyRevenue: number;
  templateDistribution: { template: string; count: number }[];
  dailySignups: Record<string, number>;
  planDistribution: { plan: string; count: number }[];
};

const TEMPLATE_NAMES: Record<string, string> = {
  'beauty-salon': '미용실 POS',
  'booking-crm': '범용 예약/CRM',
  'ecommerce': '쇼핑몰/커머스',
  'o2o-matching': 'O2O 매칭',
  'edutech': '에듀테크',
  'facility-mgmt': '관리업체',
};

const PLAN_NAMES: Record<string, string> = { free: '무료', starter: '크레딧 충전', pro: '크레딧 충전' };

const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px' }}>
    <div style={{ fontSize: 12, color: 'var(--adm-text-sec)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--adm-text)' }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--adm-text-muted)', marginTop: 4 }}>{sub}</div>}
  </div>
);

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    authFetch('/admin/dashboard').then(r => r.ok ? r.json() : null).then(d => d && setDashboard(d));
  }, []);

  if (!dashboard) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--adm-text-muted)' }}>불러오는 중...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>대시보드</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="전체 사용자" value={dashboard.totalUsers} sub={`오늘 +${dashboard.todayUsers}`} color="#3182f6" />
        <StatCard label="전체 프로젝트" value={dashboard.totalProjects} sub={`활성 ${dashboard.activeProjects}`} color="#22c55e" />
        <StatCard label="누적 매출 (크레딧)" value={dashboard.totalRevenue} color="#eab308" />
        <StatCard label="이번달 매출" value={dashboard.monthlyRevenue} color="#a855f7" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* 7일 가입자 추이 */}
        <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>최근 7일 가입자</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {Object.entries(dashboard.dailySignups).map(([date, count]) => {
              const max = Math.max(...Object.values(dashboard.dailySignups), 1);
              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--adm-text-sec)' }}>{count}</span>
                  <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: '#3182f6', height: `${(count / max) * 80}px`, minHeight: count > 0 ? 4 : 0, transition: 'height 0.3s' }} />
                  <span style={{ fontSize: 10, color: 'var(--adm-text-muted)' }}>{date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 템플릿 분포 */}
        <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>템플릿별 프로젝트</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dashboard.templateDistribution.map(t => {
              const total = dashboard.totalProjects || 1;
              return (
                <div key={t.template}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{TEMPLATE_NAMES[t.template] || t.template}</span>
                    <span style={{ color: 'var(--adm-text-sec)' }}>{t.count}개</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--adm-surface-2)' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: '#3182f6', width: `${(t.count / total) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 플랜 분포 */}
      <div style={{ background: 'var(--adm-surface)', borderRadius: 14, border: '1px solid var(--adm-border)', padding: '20px 24px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>플랜별 사용자</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          {dashboard.planDistribution.map(p => (
            <div key={p.plan} style={{ flex: 1, textAlign: 'center', borderRadius: 12, background: 'var(--adm-surface-2)', padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3182f6' }}>{p.count}</div>
              <div style={{ fontSize: 12, color: 'var(--adm-text-sec)', marginTop: 4 }}>{PLAN_NAMES[p.plan] || p.plan}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
