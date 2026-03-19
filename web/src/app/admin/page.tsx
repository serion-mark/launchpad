'use client';

import { useState, useEffect } from 'react';
import { authFetch, getUser } from '@/lib/api';

type Tab = 'dashboard' | 'users' | 'projects' | 'credits' | 'ai';

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

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  provider: string;
  credits: number;
  totalCharged: number;
  totalUsed: number;
  projectCount: number;
  createdAt: string;
};

type ProjectRow = {
  id: string;
  name: string;
  template: string;
  theme: string;
  status: string;
  userEmail: string;
  userName: string | null;
  createdAt: string;
};

type CreditRow = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  taskType: string | null;
  modelTier: string | null;
  userEmail: string;
  userName: string | null;
  createdAt: string;
};

const TEMPLATE_NAMES: Record<string, string> = {
  'beauty-salon': '✂️ 미용실 POS',
  'booking-crm': '📅 범용 예약/CRM',
  'ecommerce': '🛍 쇼핑몰/커머스',
  'o2o-matching': '🔗 O2O 매칭',
  'edutech': '🎓 에듀테크',
  'facility-mgmt': '🏢 관리업체',
};

const PLAN_NAMES: Record<string, string> = {
  free: '무료',
  starter: '스타터 (49,000)',
  pro: '프로 (99,000)',
};

const TYPE_COLORS: Record<string, string> = {
  CHARGE: 'text-[#30d158]',
  USE: 'text-[#f45452]',
  REFUND: 'text-[#ffd60a]',
  SIGNUP_BONUS: 'text-[#3182f6]',
  FREE_TRIAL: 'text-[#a855f7]',
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<{ users: UserRow[]; total: number; pages: number } | null>(null);
  const [projects, setProjects] = useState<{ projects: ProjectRow[]; total: number; pages: number } | null>(null);
  const [credits, setCredits] = useState<{ transactions: CreditRow[]; total: number; pages: number } | null>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const user = getUser();
    if (!user) { setIsAdmin(false); return; }
    // 어드민 체크: dashboard API 호출해서 403이면 비어드민
    authFetch('/admin/dashboard').then(res => {
      if (res.ok) {
        setIsAdmin(true);
        res.json().then(setDashboard);
      } else {
        setIsAdmin(false);
      }
    }).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setPage(1);
    if (tab === 'dashboard' && !dashboard) {
      authFetch('/admin/dashboard').then(r => r.ok ? r.json() : null).then(d => d && setDashboard(d));
    }
    if (tab === 'users') loadUsers(1);
    if (tab === 'projects') loadProjects(1);
    if (tab === 'credits') loadCredits(1);
    if (tab === 'ai') {
      authFetch('/admin/ai-usage').then(r => r.ok ? r.json() : null).then(d => d && setAiUsage(d));
    }
  }, [tab, isAdmin]);

  const loadUsers = (p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (userSearch) params.set('search', userSearch);
    authFetch(`/admin/users?${params}`).then(r => r.ok ? r.json() : null).then(d => d && setUsers(d));
  };

  const loadProjects = (p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: '20' });
    if (templateFilter) params.set('template', templateFilter);
    authFetch(`/admin/projects?${params}`).then(r => r.ok ? r.json() : null).then(d => d && setProjects(d));
  };

  const loadCredits = (p: number) => {
    authFetch(`/admin/credits?page=${p}&limit=30`).then(r => r.ok ? r.json() : null).then(d => d && setCredits(d));
  };

  if (isAdmin === null) return (
    <div className="flex h-screen items-center justify-center bg-[#17171c] text-[#f2f4f6]">
      <div className="text-4xl animate-spin">⚙️</div>
    </div>
  );

  if (isAdmin === false) return (
    <div className="flex h-screen items-center justify-center bg-[#17171c] text-[#f2f4f6]">
      <div className="text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">접근 권한 없음</h1>
        <p className="text-[#8b95a1]">관리자 계정으로 로그인해주세요.</p>
        <a href="/login" className="mt-4 inline-block rounded-xl bg-[#3182f6] px-6 py-3 text-sm font-semibold text-white">로그인</a>
      </div>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: '대시보드', icon: '📊' },
    { id: 'users', label: '사용자', icon: '👥' },
    { id: 'projects', label: '프로젝트', icon: '📁' },
    { id: 'credits', label: '크레딧', icon: '💰' },
    { id: 'ai', label: 'AI 사용량', icon: '🤖' },
  ];

  const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
      <div className="text-xs text-[#8b95a1] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || 'text-[#f2f4f6]'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-[#6b7684] mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      {/* 헤더 */}
      <header className="border-b border-[#2c2c35] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/"><img src="/logo.svg" alt="Foundry" className="h-7" /></a>
            <span className="rounded-lg bg-[#f45452]/15 px-2.5 py-1 text-xs font-bold text-[#f45452]">ADMIN</span>
          </div>
          <a href="/" className="text-sm text-[#8b95a1] hover:text-[#f2f4f6]">← 메인으로</a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {/* 탭 */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-[#3182f6] text-white' : 'bg-[#2c2c35] text-[#8b95a1] hover:text-[#f2f4f6]'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── 대시보드 ─────────────────── */}
        {tab === 'dashboard' && dashboard && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="전체 사용자" value={dashboard.totalUsers} sub={`오늘 +${dashboard.todayUsers}`} color="text-[#3182f6]" />
              <StatCard label="전체 프로젝트" value={dashboard.totalProjects} sub={`활성 ${dashboard.activeProjects}`} color="text-[#30d158]" />
              <StatCard label="누적 매출 (크레딧)" value={dashboard.totalRevenue} color="text-[#ffd60a]" />
              <StatCard label="이번달 매출" value={dashboard.monthlyRevenue} color="text-[#a855f7]" />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* 7일 가입자 추이 */}
              <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
                <h3 className="text-sm font-bold mb-4">최근 7일 가입자</h3>
                <div className="flex items-end gap-2 h-32">
                  {Object.entries(dashboard.dailySignups).map(([date, count]) => {
                    const max = Math.max(...Object.values(dashboard.dailySignups), 1);
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-[#8b95a1]">{count}</span>
                        <div
                          className="w-full rounded-t-lg bg-[#3182f6] transition-all"
                          style={{ height: `${(count / max) * 80}px`, minHeight: count > 0 ? '4px' : '0' }}
                        />
                        <span className="text-[10px] text-[#6b7684]">{date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 템플릿 분포 */}
              <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
                <h3 className="text-sm font-bold mb-4">템플릿별 프로젝트</h3>
                <div className="space-y-3">
                  {dashboard.templateDistribution.map(t => {
                    const total = dashboard.totalProjects || 1;
                    return (
                      <div key={t.template}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{TEMPLATE_NAMES[t.template] || t.template}</span>
                          <span className="text-[#8b95a1]">{t.count}개</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#2c2c35]">
                          <div className="h-2 rounded-full bg-[#3182f6]" style={{ width: `${(t.count / total) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 플랜 분포 */}
            <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
              <h3 className="text-sm font-bold mb-4">플랜별 사용자</h3>
              <div className="flex gap-4">
                {dashboard.planDistribution.map(p => (
                  <div key={p.plan} className="flex-1 text-center rounded-xl bg-[#2c2c35] p-4">
                    <div className="text-2xl font-bold text-[#3182f6]">{p.count}</div>
                    <div className="text-xs text-[#8b95a1] mt-1">{PLAN_NAMES[p.plan] || p.plan}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 사용자 ─────────────────── */}
        {tab === 'users' && (
          <div>
            <div className="flex gap-3 mb-4">
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadUsers(1)}
                placeholder="이메일 또는 이름 검색..."
                className="flex-1 rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-2.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] focus:border-[#3182f6] focus:outline-none"
              />
              <button onClick={() => loadUsers(1)} className="rounded-xl bg-[#3182f6] px-5 py-2.5 text-sm font-semibold text-white">검색</button>
            </div>

            {users && (
              <>
                <div className="rounded-2xl border border-[#2c2c35] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1b1b21] text-[#8b95a1] text-left">
                        <th className="px-4 py-3 font-medium">이메일</th>
                        <th className="px-4 py-3 font-medium">이름</th>
                        <th className="px-4 py-3 font-medium">플랜</th>
                        <th className="px-4 py-3 font-medium text-right">크레딧</th>
                        <th className="px-4 py-3 font-medium text-right">프로젝트</th>
                        <th className="px-4 py-3 font-medium">가입일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.users.map(u => (
                        <tr key={u.id} className="border-t border-[#2c2c35] hover:bg-[#1b1b21]/50">
                          <td className="px-4 py-3 text-[#f2f4f6]">{u.email}</td>
                          <td className="px-4 py-3 text-[#8b95a1]">{u.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                              u.plan === 'pro' ? 'bg-[#a855f7]/15 text-[#a855f7]' :
                              u.plan === 'starter' ? 'bg-[#3182f6]/15 text-[#3182f6]' :
                              'bg-[#2c2c35] text-[#8b95a1]'
                            }`}>{PLAN_NAMES[u.plan] || u.plan}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[#ffd60a]">{u.credits.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{u.projectCount}</td>
                          <td className="px-4 py-3 text-[#6b7684]">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-between items-center text-sm text-[#8b95a1]">
                  <span>총 {users.total}명</span>
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(users.pages, 10) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => { setPage(i + 1); loadUsers(i + 1); }}
                        className={`rounded-lg px-3 py-1.5 text-xs ${page === i + 1 ? 'bg-[#3182f6] text-white' : 'bg-[#2c2c35] hover:bg-[#3a3a45]'}`}
                      >{i + 1}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 프로젝트 ─────────────────── */}
        {tab === 'projects' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <button onClick={() => { setTemplateFilter(''); loadProjects(1); }}
                className={`rounded-xl px-4 py-2 text-sm ${!templateFilter ? 'bg-[#3182f6] text-white' : 'bg-[#2c2c35] text-[#8b95a1]'}`}>전체</button>
              {Object.entries(TEMPLATE_NAMES).map(([id, name]) => (
                <button key={id} onClick={() => { setTemplateFilter(id); setTimeout(() => loadProjects(1), 0); }}
                  className={`rounded-xl px-4 py-2 text-sm ${templateFilter === id ? 'bg-[#3182f6] text-white' : 'bg-[#2c2c35] text-[#8b95a1]'}`}>{name}</button>
              ))}
            </div>

            {projects && (
              <>
                <div className="rounded-2xl border border-[#2c2c35] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1b1b21] text-[#8b95a1] text-left">
                        <th className="px-4 py-3 font-medium">프로젝트명</th>
                        <th className="px-4 py-3 font-medium">템플릿</th>
                        <th className="px-4 py-3 font-medium">상태</th>
                        <th className="px-4 py-3 font-medium">사용자</th>
                        <th className="px-4 py-3 font-medium">생성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.projects.map(p => (
                        <tr key={p.id} className="border-t border-[#2c2c35] hover:bg-[#1b1b21]/50">
                          <td className="px-4 py-3 font-medium text-[#f2f4f6]">{p.name}</td>
                          <td className="px-4 py-3">{TEMPLATE_NAMES[p.template] || p.template}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                              p.status === 'active' ? 'bg-[#30d158]/15 text-[#30d158]' :
                              p.status === 'deployed' ? 'bg-[#3182f6]/15 text-[#3182f6]' :
                              'bg-[#2c2c35] text-[#8b95a1]'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-[#8b95a1]">{p.userEmail}</td>
                          <td className="px-4 py-3 text-[#6b7684]">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-[#8b95a1]">총 {projects.total}개 프로젝트</div>
              </>
            )}
          </div>
        )}

        {/* ── 크레딧 거래 ─────────────────── */}
        {tab === 'credits' && credits && (
          <div>
            <div className="rounded-2xl border border-[#2c2c35] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1b1b21] text-[#8b95a1] text-left">
                    <th className="px-4 py-3 font-medium">타입</th>
                    <th className="px-4 py-3 font-medium text-right">금액</th>
                    <th className="px-4 py-3 font-medium text-right">잔액</th>
                    <th className="px-4 py-3 font-medium">설명</th>
                    <th className="px-4 py-3 font-medium">사용자</th>
                    <th className="px-4 py-3 font-medium">일시</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.transactions.map(t => (
                    <tr key={t.id} className="border-t border-[#2c2c35] hover:bg-[#1b1b21]/50">
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs font-bold ${TYPE_COLORS[t.type] || 'text-[#8b95a1]'}`}>{t.type}</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${t.amount > 0 ? 'text-[#30d158]' : 'text-[#f45452]'}`}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#8b95a1]">{t.balanceAfter.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#8b95a1] max-w-[200px] truncate">{t.description || '-'}</td>
                      <td className="px-4 py-3 text-[#6b7684]">{t.userEmail}</td>
                      <td className="px-4 py-3 text-[#6b7684]">{new Date(t.createdAt).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-[#8b95a1]">총 {credits.total}건</div>
          </div>
        )}

        {/* ── AI 사용량 ─────────────────── */}
        {tab === 'ai' && aiUsage && (
          <div>
            <StatCard label="총 AI 요청 수" value={aiUsage.totalRequests} color="text-[#3182f6]" />

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
                <h3 className="text-sm font-bold mb-4">작업 유형별</h3>
                <div className="space-y-3">
                  {Object.entries(aiUsage.byTaskType as Record<string, { count: number; totalCredits: number }>).map(([task, data]) => (
                    <div key={task} className="flex justify-between items-center text-sm">
                      <span className="text-[#f2f4f6]">{task}</span>
                      <div className="text-right">
                        <span className="text-[#8b95a1]">{data.count}회</span>
                        <span className="ml-3 text-[#ffd60a] font-mono">{data.totalCredits.toLocaleString()} cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-5">
                <h3 className="text-sm font-bold mb-4">모델 티어별</h3>
                <div className="space-y-3">
                  {Object.entries(aiUsage.byModelTier as Record<string, { count: number; totalCredits: number }>).map(([tier, data]) => (
                    <div key={tier} className="flex justify-between items-center text-sm">
                      <span className={`font-medium ${
                        tier === 'premium' ? 'text-[#a855f7]' :
                        tier === 'standard' ? 'text-[#3182f6]' :
                        'text-[#30d158]'
                      }`}>{tier === 'fast' ? '⚡ Fast (Haiku)' : tier === 'standard' ? '🔵 Standard (Sonnet)' : tier === 'premium' ? '🟣 Premium (Opus)' : tier}</span>
                      <div className="text-right">
                        <span className="text-[#8b95a1]">{data.count}회</span>
                        <span className="ml-3 text-[#ffd60a] font-mono">{data.totalCredits.toLocaleString()} cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
