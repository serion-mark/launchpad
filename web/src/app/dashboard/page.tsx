'use client';

import { useState, useEffect } from 'react';
import { authFetch, getUser, logout } from '@/lib/api';

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
  draft: { label: '초안', bg: 'bg-[#2c2c35]', text: 'text-[#8b95a1]' },
  generating: { label: '생성 중', bg: 'bg-[#ffd60a]/15', text: 'text-[#ffd60a]' },
  active: { label: '활성', bg: 'bg-[#30d158]/15', text: 'text-[#30d158]' },
  deployed: { label: '배포됨', bg: 'bg-[#3182f6]/15', text: 'text-[#3182f6]' },
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
      <div className="flex min-h-screen items-center justify-center bg-[#17171c] text-[#f2f4f6]">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-spin">⚙️</div>
          <p className="text-[#8b95a1]">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      {/* 헤더 */}
      <header className="border-b border-[#2c2c35] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/">
            <img src="/logo.svg" alt="Foundry" className="h-7 md:h-8" />
          </a>
          <div className="flex items-center gap-3">
            {creditBalance !== null && (
              <a href="/credits" className="rounded-xl bg-[#ffd60a]/10 border border-[#ffd60a]/20 px-4 py-2 text-sm font-bold text-[#ffd60a] hover:bg-[#ffd60a]/20 transition-colors">
                💰 {creditBalance.toLocaleString()}cr
              </a>
            )}
            <a href="/meeting" className="rounded-xl bg-[#2c2c35] px-4 py-2 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
              🧠 AI 회의실
            </a>
            <a href="/credits" className="rounded-xl bg-[#2c2c35] px-4 py-2 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
              충전하기
            </a>
            <span className="text-sm text-[#6b7684] hidden md:inline">{user?.email}</span>
            <button onClick={logout} className="rounded-xl bg-[#2c2c35] px-4 py-2 text-sm text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
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
            <p className="mt-1.5 text-sm text-[#8b95a1]">{projects.length}개의 프로젝트</p>
          </div>
          <a
            href="/"
            className="rounded-xl bg-[#3182f6] px-5 py-3 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> 새 프로젝트
          </a>
        </div>

        {/* 프로젝트 목록 */}
        {projects.length === 0 && !showNew ? (
          <div className="mt-24 text-center">
            <div className="mb-6 text-6xl">🚀</div>
            <h2 className="mb-3 text-xl font-bold">아직 프로젝트가 없습니다</h2>
            <p className="mb-7 text-[#8b95a1]">AI가 풀스택 MVP를 만들어드립니다. 첫 프로젝트를 시작하세요!</p>
            <a
              href="/"
              className="rounded-xl bg-[#3182f6] px-7 py-3.5 text-[15px] font-bold text-white hover:bg-[#1b64da] transition-colors inline-block"
            >
              첫 프로젝트 만들기
            </a>
          </div>
        ) : (
          <div className="grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* 새 프로젝트 카드 */}
            {showNew && (
              <div className="rounded-2xl border-2 border-dashed border-[#3182f6]/30 bg-[#3182f6]/5 p-6">
                <h3 className="mb-5 text-lg font-bold">새 프로젝트</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b95a1]">프로젝트 이름</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="내 미용실 앱"
                      autoFocus
                      className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b95a1]">템플릿</label>
                    <select
                      value={newTemplate}
                      onChange={e => setNewTemplate(e.target.value)}
                      className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3 text-sm text-[#f2f4f6] outline-none focus:border-[#3182f6] transition-colors"
                    >
                      <option value="beauty-salon">✂️ 미용실 POS</option>
                      <option value="booking-crm">📅 범용 예약/CRM</option>
                      <option value="ecommerce">🛒 쇼핑몰</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#8b95a1]">설명 (선택)</label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="프로젝트 간단 설명"
                      className="w-full rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-3 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors"
                    />
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); }}
                      className="flex-1 rounded-xl border border-[#2c2c35] py-2.5 text-sm font-medium text-[#8b95a1] hover:bg-[#2c2c35] hover:text-[#f2f4f6] transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim() || creating}
                      className="flex-1 rounded-xl bg-[#3182f6] py-2.5 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors disabled:opacity-40"
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
                  className="group rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 transition-all hover:border-[#3a3a45]"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meta.icon}</span>
                      <div>
                        <h3 className="font-bold text-[#f2f4f6]">{project.name}</h3>
                        <p className="text-xs text-[#6b7684]">{meta.label}</p>
                      </div>
                    </div>
                    <span className={`rounded-lg ${badge.bg} px-2.5 py-1 text-xs font-medium ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  {project.description && (
                    <p className="mb-4 text-sm text-[#8b95a1] line-clamp-2">{project.description}</p>
                  )}

                  <div className="mb-4 text-xs text-[#6b7684]">
                    {new Date(project.updatedAt).toLocaleDateString('ko-KR')} 수정
                  </div>

                  {project.buildStatus && project.buildStatus !== 'done' && (
                    <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${
                      project.buildStatus === 'failed' ? 'bg-[#ff453a]/15 text-[#ff453a]' : 'bg-[#ffd60a]/15 text-[#ffd60a]'
                    }`}>
                      {BUILD_STATUS_LABELS[project.buildStatus] || project.buildStatus}
                    </div>
                  )}

                  {project.deployedUrl && project.buildStatus === 'done' && (
                    <a
                      href={project.deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-3 block truncate text-xs text-[#3182f6] hover:underline"
                    >
                      {project.deployedUrl}
                    </a>
                  )}

                  {/* 호스팅 + 방문자 */}
                  {project.deployedUrl && project.buildStatus === 'done' && (
                    <div className="mb-4 flex items-center justify-between rounded-lg bg-[#2c2c35]/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6b7684]">📊 이번 달</span>
                        <span className="text-xs font-medium text-[#f2f4f6]">{(project.monthlyVisitors || 0).toLocaleString()}명</span>
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        project.hostingPlan === 'pro' ? 'bg-[#a855f7]/20 text-[#a855f7]' :
                        project.hostingPlan === 'basic' ? 'bg-[#3182f6]/20 text-[#3182f6]' :
                        'bg-[#2c2c35] text-[#6b7684]'
                      }`}>
                        {project.hostingPlan === 'pro' ? 'PRO' : project.hostingPlan === 'basic' ? 'BASIC' : 'FREE'}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <a
                      href={`/builder?projectId=${project.id}`}
                      className="flex-1 rounded-xl bg-[#3182f6] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#1b64da] transition-colors"
                    >
                      {project.status === 'draft' ? '빌드하기' : '수정하기'}
                    </a>
                    {(project.status === 'active' || project.status === 'deployed') && (
                      <a
                        href={`/preview?projectId=${project.id}`}
                        className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors"
                      >
                        미리보기
                      </a>
                    )}
                    <button
                      onClick={() => setDeleteId(project.id)}
                      className="rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm text-[#6b7684] hover:bg-[#f45452]/10 hover:text-[#f45452] transition-colors"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 독립 패키지 안내 */}
                  {(project.status === 'active' || project.status === 'deployed') && project.buildStatus === 'done' && (
                    <div className="mt-4 rounded-xl border border-[#2c2c35] bg-[#2c2c35]/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">🚀</span>
                        <span className="text-xs font-bold text-[#f2f4f6]">이 앱을 독립시키기</span>
                      </div>
                      <p className="text-xs text-[#6b7684] mb-3">사업이 성장했나요? 내 도메인으로 독립 운영하세요.</p>
                      <div className="flex gap-2">
                        <a href="/credits?tab=independence" className="flex-1 rounded-lg bg-[#2c2c35] py-2 text-center text-xs font-medium text-[#8b95a1] hover:bg-[#3a3a45] transition-colors">
                          📦 코드팩 99만
                        </a>
                        <a href="/credits?tab=independence" className="flex-1 rounded-lg bg-[#2c2c35] py-2 text-center text-xs font-medium text-[#8b95a1] hover:bg-[#3a3a45] transition-colors">
                          📦 프로팩 199만
                        </a>
                        <a href="/credits?tab=independence" className="flex-1 rounded-lg bg-[#2c2c35] py-2 text-center text-xs font-medium text-[#ffd60a] hover:bg-[#3a3a45] transition-colors">
                          📦 엔터 499만
                        </a>
                      </div>
                      <p className="text-[10px] text-[#6b7684] mt-2 text-center">💡 정부사업비로 정산 가능 (세금계산서 발행)</p>
                    </div>
                  )}

                  {deleteId === project.id && (
                    <div className="mt-4 rounded-xl border border-[#f45452]/20 bg-[#f45452]/8 p-4">
                      <p className="mb-3 text-xs text-[#f45452]">정말 삭제하시겠습니까? 복구할 수 없습니다.</p>
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setDeleteId(null)}
                          className="flex-1 rounded-lg bg-[#2c2c35] py-2 text-xs font-medium text-[#8b95a1] hover:bg-[#3a3a45] transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="flex-1 rounded-lg bg-[#f45452] py-2 text-xs font-bold text-white hover:bg-[#d63031] transition-colors"
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
