'use client';

import { useState, useEffect } from 'react';
import { authFetch, getUser } from '@/lib/api';
import Logo from '@/app/components/Logo';
import ThemeToggle from '@/app/components/ThemeToggle';

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
  starter: '크레딧 충전',
  pro: '크레딧 충전',
};

const TYPE_COLORS: Record<string, string> = {
  CHARGE: 'text-[var(--toss-green)]',
  USE: 'text-[var(--toss-red)]',
  REFUND: 'text-[var(--toss-yellow)]',
  SIGNUP_BONUS: 'text-[var(--toss-blue)]',
  FREE_TRIAL: 'text-[var(--toss-purple)]',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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
  // 어드민 전용 로그인
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  const tryAdminAccess = () => {
    authFetch('/admin/dashboard').then(res => {
      if (res.ok) {
        setIsAdmin(true);
        res.json().then(setDashboard);
      } else {
        setIsAdmin(false);
      }
    }).catch(() => setIsAdmin(false));
  };

  useEffect(() => {
    const user = getUser();
    if (!user) { setNeedLogin(true); return; }
    tryAdminAccess();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.message || '로그인 실패'); return; }
      localStorage.setItem('launchpad_token', data.token);
      localStorage.setItem('launchpad_user', JSON.stringify({ userId: data.userId, email: data.email }));
      setNeedLogin(false);
      tryAdminAccess();
    } catch {
      setLoginError('서버 연결 오류');
    } finally {
      setLoginLoading(false);
    }
  };

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

  // 어드민 전용 로그인 폼
  if (needLogin || isAdmin === false) return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-card)] text-[var(--text-primary)] px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo className="h-8 mx-auto mb-3" />
          <span className="rounded-lg bg-[var(--toss-red)]/15 px-2.5 py-1 text-xs font-bold text-[var(--toss-red)]">ADMIN</span>
          <h1 className="text-2xl font-bold mt-4">관리자 로그인</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">관리자 계정으로 로그인해주세요</p>
        </div>
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <input
            type="email"
            value={adminEmail}
            onChange={e => setAdminEmail(e.target.value)}
            placeholder="관리자 이메일"
            required
            className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--toss-blue)] focus:outline-none"
          />
          <input
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--toss-blue)] focus:outline-none"
          />
          {loginError && <p className="text-sm text-[var(--toss-red)]">{loginError}</p>}
          {isAdmin === false && <p className="text-sm text-[var(--toss-red)]">관리자 권한이 없는 계정입니다.</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full rounded-xl bg-[var(--toss-red)] py-3.5 text-[15px] font-bold text-white hover:bg-[var(--toss-red)] disabled:opacity-50"
          >
            {loginLoading ? '로그인 중...' : '어드민 로그인'}
          </button>
        </form>
        <a href="/" className="block mt-6 text-center text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">← 메인으로 돌아가기</a>
      </div>
    </div>
  );

  if (isAdmin === null) return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-card)] text-[var(--text-primary)]">
      <div className="text-4xl animate-spin">⚙️</div>
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
    <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
      <div className="text-xs text-[var(--text-secondary)] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || 'text-[var(--text-primary)]'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-[var(--text-tertiary)] mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-card)] text-[var(--text-primary)]">
      {/* 헤더 */}
      <header className="border-b border-[var(--border-primary)] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/"><Logo className="h-7" /></a>
            <span className="rounded-lg bg-[var(--toss-red)]/15 px-2.5 py-1 text-xs font-bold text-[var(--toss-red)]">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← 메인으로</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {/* 탭 */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto" role="tablist">
          {tabs.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-[var(--toss-blue)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
              <StatCard label="전체 사용자" value={dashboard.totalUsers} sub={`오늘 +${dashboard.todayUsers}`} color="text-[var(--toss-blue)]" />
              <StatCard label="전체 프로젝트" value={dashboard.totalProjects} sub={`활성 ${dashboard.activeProjects}`} color="text-[var(--toss-green)]" />
              <StatCard label="누적 매출 (크레딧)" value={dashboard.totalRevenue} color="text-[var(--toss-yellow)]" />
              <StatCard label="이번달 매출" value={dashboard.monthlyRevenue} color="text-[var(--toss-purple)]" />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* 7일 가입자 추이 */}
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
                <h3 className="text-sm font-bold mb-4">최근 7일 가입자</h3>
                <div className="flex items-end gap-2 h-32">
                  {Object.entries(dashboard.dailySignups).map(([date, count]) => {
                    const max = Math.max(...Object.values(dashboard.dailySignups), 1);
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-[var(--text-secondary)]">{count}</span>
                        <div
                          className="w-full rounded-t-lg bg-[var(--toss-blue)] transition-all"
                          style={{ height: `${(count / max) * 80}px`, minHeight: count > 0 ? '4px' : '0' }}
                        />
                        <span className="text-[10px] text-[var(--text-tertiary)]">{date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 템플릿 분포 */}
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
                <h3 className="text-sm font-bold mb-4">템플릿별 프로젝트</h3>
                <div className="space-y-3">
                  {dashboard.templateDistribution.map(t => {
                    const total = dashboard.totalProjects || 1;
                    return (
                      <div key={t.template}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{TEMPLATE_NAMES[t.template] || t.template}</span>
                          <span className="text-[var(--text-secondary)]">{t.count}개</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-elevated)]">
                          <div className="h-2 rounded-full bg-[var(--toss-blue)]" style={{ width: `${(t.count / total) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 플랜 분포 */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
              <h3 className="text-sm font-bold mb-4">플랜별 사용자</h3>
              <div className="flex gap-4">
                {dashboard.planDistribution.map(p => (
                  <div key={p.plan} className="flex-1 text-center rounded-xl bg-[var(--bg-elevated)] p-4">
                    <div className="text-2xl font-bold text-[var(--toss-blue)]">{p.count}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{PLAN_NAMES[p.plan] || p.plan}</div>
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
                className="flex-1 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--toss-blue)] focus:outline-none"
              />
              <button onClick={() => loadUsers(1)} className="rounded-xl bg-[var(--toss-blue)] px-5 py-2.5 text-sm font-semibold text-white">검색</button>
            </div>

            {users && (
              <>
                <div className="rounded-2xl border border-[var(--border-primary)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-left">
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
                        <tr key={u.id} className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]/50">
                          <td className="px-4 py-3 text-[var(--text-primary)]">{u.email}</td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{u.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                              u.plan === 'pro' ? 'bg-[var(--toss-purple)]/15 text-[var(--toss-purple)]' :
                              u.plan === 'starter' ? 'bg-[var(--toss-blue)]/15 text-[var(--toss-blue)]' :
                              'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                            }`}>{PLAN_NAMES[u.plan] || u.plan}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[var(--toss-yellow)]">{u.credits.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{u.projectCount}</td>
                          <td className="px-4 py-3 text-[var(--text-tertiary)]">{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-between items-center text-sm text-[var(--text-secondary)]">
                  <span>총 {users.total}명</span>
                  <div className="flex gap-2">
                    {Array.from({ length: Math.min(users.pages, 10) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => { setPage(i + 1); loadUsers(i + 1); }}
                        className={`rounded-lg px-3 py-1.5 text-xs ${page === i + 1 ? 'bg-[var(--toss-blue)] text-white' : 'bg-[var(--bg-elevated)] hover:bg-[var(--border-hover)]'}`}
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
                className={`rounded-xl px-4 py-2 text-sm ${!templateFilter ? 'bg-[var(--toss-blue)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>전체</button>
              {Object.entries(TEMPLATE_NAMES).map(([id, name]) => (
                <button key={id} onClick={() => { setTemplateFilter(id); setTimeout(() => loadProjects(1), 0); }}
                  className={`rounded-xl px-4 py-2 text-sm ${templateFilter === id ? 'bg-[var(--toss-blue)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>{name}</button>
              ))}
            </div>

            {projects && (
              <>
                <div className="rounded-2xl border border-[var(--border-primary)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-left">
                        <th className="px-4 py-3 font-medium">프로젝트명</th>
                        <th className="px-4 py-3 font-medium">템플릿</th>
                        <th className="px-4 py-3 font-medium">상태</th>
                        <th className="px-4 py-3 font-medium">사용자</th>
                        <th className="px-4 py-3 font-medium">생성일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.projects.map(p => (
                        <tr key={p.id} className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]/50">
                          <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{p.name}</td>
                          <td className="px-4 py-3">{TEMPLATE_NAMES[p.template] || p.template}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                              p.status === 'active' ? 'bg-[var(--toss-green)]/15 text-[var(--toss-green)]' :
                              p.status === 'deployed' ? 'bg-[var(--toss-blue)]/15 text-[var(--toss-blue)]' :
                              'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{p.userEmail}</td>
                          <td className="px-4 py-3 text-[var(--text-tertiary)]">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-sm text-[var(--text-secondary)]">총 {projects.total}개 프로젝트</div>
              </>
            )}
          </div>
        )}

        {/* ── 크레딧 거래 ─────────────────── */}
        {tab === 'credits' && credits && (
          <div>
            <div className="rounded-2xl border border-[var(--border-primary)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-left">
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
                    <tr key={t.id} className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-secondary)]/50">
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs font-bold ${TYPE_COLORS[t.type] || 'text-[var(--text-secondary)]'}`}>{t.type}</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${t.amount > 0 ? 'text-[var(--toss-green)]' : 'text-[var(--toss-red)]'}`}>
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--text-secondary)]">{t.balanceAfter.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">{t.description || '-'}</td>
                      <td className="px-4 py-3 text-[var(--text-tertiary)]">{t.userEmail}</td>
                      <td className="px-4 py-3 text-[var(--text-tertiary)]">{new Date(t.createdAt).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-[var(--text-secondary)]">총 {credits.total}건</div>
          </div>
        )}

        {/* ── AI 사용량 ─────────────────── */}
        {tab === 'ai' && aiUsage && (
          <div>
            <StatCard label="총 AI 요청 수" value={aiUsage.totalRequests} color="text-[var(--toss-blue)]" />

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
                <h3 className="text-sm font-bold mb-4">작업 유형별</h3>
                <div className="space-y-3">
                  {Object.entries(aiUsage.byTaskType as Record<string, { count: number; totalCredits: number }>).map(([task, data]) => (
                    <div key={task} className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-primary)]">{task}</span>
                      <div className="text-right">
                        <span className="text-[var(--text-secondary)]">{data.count}회</span>
                        <span className="ml-3 text-[var(--toss-yellow)] font-mono">{data.totalCredits.toLocaleString()} cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
                <h3 className="text-sm font-bold mb-4">모델 티어별</h3>
                <div className="space-y-3">
                  {Object.entries(aiUsage.byModelTier as Record<string, { count: number; totalCredits: number }>).map(([tier, data]) => (
                    <div key={tier} className="flex justify-between items-center text-sm">
                      <span className={`font-medium ${
                        tier === 'premium' ? 'text-[var(--toss-purple)]' :
                        tier === 'standard' ? 'text-[var(--toss-blue)]' :
                        'text-[var(--toss-green)]'
                      }`}>{tier === 'fast' ? '⚡ Fast (Haiku)' : tier === 'standard' ? '🔵 Standard (Sonnet)' : tier === 'premium' ? '🟣 Premium (Opus)' : tier}</span>
                      <div className="text-right">
                        <span className="text-[var(--text-secondary)]">{data.count}회</span>
                        <span className="ml-3 text-[var(--toss-yellow)] font-mono">{data.totalCredits.toLocaleString()} cr</span>
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
