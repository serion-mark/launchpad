'use client';

import { useState, useEffect } from 'react';
import { authFetch, getUser, logout } from '@/lib/api';
import Logo from '@/app/components/Logo';
import ThemeToggle from '@/app/components/ThemeToggle';

type Project = {
  id: string;
  name: string;
  description: string | null;
  template: string;
  theme: string;
  status: string;
  subdomain: string | null;
  deployedUrl: string | null;
  buildStatus: string | null;
  hostingPlan: string;
  monthlyVisitors: number;
  createdAt: string;
  updatedAt: string;
};

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  'beauty-salon': { icon: '✂️', label: '미용실 POS' },
  'booking-crm': { icon: '📅', label: '예약/CRM' },
  'ecommerce': { icon: '🛒', label: '쇼핑몰' },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: '초안', bg: 'bg-[var(--bg-elevated)]', text: 'text-[var(--text-secondary)]' },
  generating: { label: '생성 중', bg: 'bg-[var(--toss-yellow)]/15', text: 'text-[var(--toss-yellow)]' },
  active: { label: '활성', bg: 'bg-[var(--toss-green)]/15', text: 'text-[var(--toss-green)]' },
  deployed: { label: '배포됨', bg: 'bg-[var(--toss-blue)]/15', text: 'text-[var(--toss-blue)]' },
};

const BUILD_STATUS_LABELS: Record<string, string> = {
  pending: '빌드 대기',
  building: '빌드 중...',
  exporting: '내보내기 중...',
  done: '빌드 완료',
  failed: '빌드 실패',
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('beauty-salon');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const user = getUser();

  const fetchProjects = async () => {
    try {
      const res = await authFetch('/projects');
      if (res.ok) setProjects(await res.json());
    } catch { /* redirect handled by authFetch */ }
    setLoading(false);
  };

  const fetchBalance = async () => {
    try {
      const res = await authFetch('/credits/balance');
      if (res.ok) { const d = await res.json(); setCreditBalance(d.balance); }
    } catch { /* */ }
  };

  useEffect(() => {
    if (!user) { window.location.href = '/login'; return; }
    fetchProjects();
    fetchBalance();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), template: newTemplate, description: newDesc.trim() || undefined }),
      });
      if (res.ok) {
        const project = await res.json();
        window.location.href = `/builder?projectId=${project.id}`;
      }
    } catch { /* */ }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
        setDeleteId(null);
      }
    } catch { /* */ }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-card)] text-[var(--text-primary)]">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-spin">⚙️</div>
          <p className="text-[var(--text-secondary)]">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-card)] text-[var(--text-primary)]">
      {/* 헤더 */}
      <header className="border-b border-[var(--border-primary)] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/">
            <Logo />
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {creditBalance !== null && (
              <a href="/credits" className="rounded-xl bg-[var(--toss-yellow)]/10 border border-[var(--toss-yellow)]/20 px-4 py-2 text-sm font-bold text-[var(--toss-yellow)] hover:bg-[var(--toss-yellow)]/20 transition-colors">
                💰 {creditBalance.toLocaleString()}cr
              </a>
            )}
            <a href="/meeting" className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors">
              🧠 AI 회의실
            </a>
            <a href="/credits" className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors">
              충전하기
            </a>
            <span className="text-sm text-[var(--text-tertiary)] hidden md:inline">{user?.email}</span>
            <button onClick={logout} className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        {/* 타이틀 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">내 프로젝트</h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{projects.length}개의 프로젝트</p>
          </div>
          <a
            href="/"
            className="rounded-xl bg-[var(--toss-blue)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> 새 프로젝트
          </a>
        </div>

        {/* 프로젝트 목록 */}
        {projects.length === 0 && !showNew ? (
          <div className="mt-24 text-center">
            <div className="mb-6 text-6xl">🚀</div>
            <h2 className="mb-3 text-xl font-bold">아직 프로젝트가 없습니다</h2>
            <p className="mb-7 text-[var(--text-secondary)]">AI가 풀스택 MVP를 만들어드립니다. 첫 프로젝트를 시작하세요!</p>
            <a
              href="/"
              className="rounded-xl bg-[var(--toss-blue)] px-7 py-3.5 text-[15px] font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors inline-block"
            >
              첫 프로젝트 만들기
            </a>
          </div>
        ) : (
          <div className="grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* 새 프로젝트 카드 */}
            {showNew && (
              <div className="rounded-2xl border-2 border-dashed border-[var(--toss-blue)]/30 bg-[var(--toss-blue)]/5 p-6">
                <h3 className="mb-5 text-lg font-bold">새 프로젝트</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">프로젝트 이름</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="내 미용실 앱"
                      autoFocus
                      className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--toss-blue)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">템플릿</label>
                    <select
                      value={newTemplate}
                      onChange={e => setNewTemplate(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--toss-blue)] transition-colors"
                    >
                      <option value="beauty-salon">✂️ 미용실 POS</option>
                      <option value="booking-crm">📅 범용 예약/CRM</option>
                      <option value="ecommerce">🛒 쇼핑몰</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">설명 (선택)</label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="프로젝트 간단 설명"
                      className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--toss-blue)] transition-colors"
                    />
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); }}
                      className="flex-1 rounded-xl border border-[var(--border-primary)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim() || creating}
                      className="flex-1 rounded-xl bg-[var(--toss-blue)] py-2.5 text-sm font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors disabled:opacity-40"
                    >
                      {creating ? '생성 중...' : '생성'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 프로젝트 카드 */}
            {projects.map(project => {
              const meta = TEMPLATE_META[project.template] || { icon: '📦', label: project.template };
              const badge = STATUS_BADGE[project.status] || STATUS_BADGE.draft;
              return (
                <div
                  key={project.id}
                  className="group rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6 transition-all hover:border-[var(--border-hover)]"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meta.icon}</span>
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)]">{project.name}</h3>
                        <p className="text-xs text-[var(--text-tertiary)]">{meta.label}</p>
                      </div>
                    </div>
                    <span className={`rounded-lg ${badge.bg} px-2.5 py-1 text-xs font-medium ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  {project.description && (
                    <p className="mb-4 text-sm text-[var(--text-secondary)] line-clamp-2">{project.description}</p>
                  )}

                  <div className="mb-4 text-xs text-[var(--text-tertiary)]">
                    {new Date(project.updatedAt).toLocaleDateString('ko-KR')} 수정
                  </div>

                  {project.buildStatus && project.buildStatus !== 'done' && (
                    <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${
                      project.buildStatus === 'failed' ? 'bg-[var(--toss-red)]/15 text-[var(--toss-red)]' : 'bg-[var(--toss-yellow)]/15 text-[var(--toss-yellow)]'
                    }`}>
                      {BUILD_STATUS_LABELS[project.buildStatus] || project.buildStatus}
                    </div>
                  )}

                  {project.deployedUrl && project.buildStatus === 'done' && (
                    <a
                      href={project.deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 block truncate text-xs text-[var(--toss-blue)] hover:underline"
                    >
                      {project.deployedUrl}
                    </a>
                  )}

                  {/* 호스팅 + 방문자 */}
                  {project.deployedUrl && project.buildStatus === 'done' && (
                    <div className="mb-4 flex items-center justify-between rounded-lg bg-[var(--bg-elevated)]/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)]">📊 이번 달</span>
                        <span className="text-xs font-medium text-[var(--text-primary)]">{(project.monthlyVisitors || 0).toLocaleString()}명</span>
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        project.hostingPlan === 'pro' ? 'bg-[var(--toss-purple)]/20 text-[var(--toss-purple)]' :
                        project.hostingPlan === 'basic' ? 'bg-[var(--toss-blue)]/20 text-[var(--toss-blue)]' :
                        'bg-[var(--bg-elevated)] text-[var(--text-tertiary)]'
                      }`}>
                        {project.hostingPlan === 'pro' ? 'PRO' : project.hostingPlan === 'basic' ? 'BASIC' : 'FREE'}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <a
                      href={`/builder?projectId=${project.id}`}
                      className="flex-1 rounded-xl bg-[var(--toss-blue)] py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--toss-blue-hover)] transition-colors"
                    >
                      {project.status === 'draft' ? '빌드하기' : '수정하기'}
                    </a>
                    {(project.status === 'active' || project.status === 'deployed') && (
                      <a
                        href={project.deployedUrl || `/preview?projectId=${project.id}`}
                        target={project.deployedUrl ? '_blank' : undefined}
                        rel={project.deployedUrl ? 'noopener noreferrer' : undefined}
                        className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-hover)] transition-colors"
                      >
                        미리보기
                      </a>
                    )}
                    <button
                      onClick={() => setDeleteId(project.id)}
                      className="rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-tertiary)] hover:bg-[var(--toss-red)]/10 hover:text-[var(--toss-red)] transition-colors"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 독립 패키지 안내 */}
                  {(project.status === 'active' || project.status === 'deployed') && project.buildStatus === 'done' && (
                    <div className="mt-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)]/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">🚀</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">이 앱을 독립시키기</span>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-3">사업이 성장했나요? 내 도메인으로 독립 운영하세요.</p>
                      <div className="flex gap-2">
                        <a href="/credits?tab=independence" className="flex-1 rounded-lg bg-[var(--bg-elevated)] py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-hover)] transition-colors">
                          📦 코드팩 99만
                        </a>
                        <a href="/credits?tab=independence" className="flex-1 rounded-lg bg-[var(--bg-elevated)] py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-hover)] transition-colors">
                          📦 프로팩 199만
                        </a>
                        <a href="/credits?tab=independence" className="flex-1 rounded-lg bg-[var(--bg-elevated)] py-2 text-center text-xs font-medium text-[var(--toss-yellow)] hover:bg-[var(--border-hover)] transition-colors">
                          📦 엔터 499만
                        </a>
                      </div>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-2 text-center">💡 정부사업비로 정산 가능 (세금계산서 발행)</p>
                    </div>
                  )}

                  {deleteId === project.id && (
                    <div className="mt-4 rounded-xl border border-[var(--toss-red)]/20 bg-[var(--toss-red)]/8 p-4">
                      <p className="mb-3 text-xs text-[var(--toss-red)]">정말 삭제하시겠습니까? 복구할 수 없습니다.</p>
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setDeleteId(null)}
                          className="flex-1 rounded-lg bg-[var(--bg-elevated)] py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-hover)] transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="flex-1 rounded-lg bg-[var(--toss-red)] py-2 text-xs font-bold text-white hover:bg-[var(--toss-red)] transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
