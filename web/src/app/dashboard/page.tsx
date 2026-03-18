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
  createdAt: string;
  updatedAt: string;
};

const TEMPLATE_META: Record<string, { icon: string; label: string }> = {
  'beauty-salon': { icon: '✂️', label: '미용실 POS' },
  'booking-crm': { icon: '📅', label: '예약/CRM' },
  'ecommerce': { icon: '🛒', label: '쇼핑몰' },
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-gray-600' },
  generating: { label: '생성 중', color: 'bg-yellow-600 animate-pulse' },
  active: { label: '활성', color: 'bg-green-600' },
  deployed: { label: '배포됨', color: 'bg-blue-600' },
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
  const user = getUser();

  const fetchProjects = async () => {
    try {
      const res = await authFetch('/projects');
      if (res.ok) setProjects(await res.json());
    } catch { /* redirect handled by authFetch */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { window.location.href = '/login'; return; }
    fetchProjects();
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
        // 프로젝트 생성 후 빌더로 이동
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
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-spin">⚙️</div>
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-700/50 px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-xl md:text-2xl font-bold">
            <span className="text-blue-400">Launch</span>pad
          </a>
          <div className="flex items-center gap-3">
            <a href="/credits" className="rounded-lg bg-gray-700/50 px-3 py-1.5 text-xs md:text-sm hover:bg-gray-600 transition">
              요금제
            </a>
            <span className="text-sm text-gray-400 hidden md:inline">{user?.email}</span>
            <button onClick={logout} className="rounded-lg bg-gray-700/50 px-3 py-1.5 text-xs md:text-sm text-gray-400 hover:text-white hover:bg-gray-600 transition">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        {/* 타이틀 + 새 프로젝트 버튼 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">내 프로젝트</h1>
            <p className="mt-1 text-sm text-gray-400">{projects.length}개의 프로젝트</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold hover:bg-blue-500 transition flex items-center gap-2"
          >
            <span className="text-lg">+</span> 새 프로젝트
          </button>
        </div>

        {/* 프로젝트 목록 */}
        {projects.length === 0 && !showNew ? (
          <div className="mt-20 text-center">
            <div className="mb-6 text-6xl">🚀</div>
            <h2 className="mb-2 text-xl font-bold">아직 프로젝트가 없습니다</h2>
            <p className="mb-6 text-gray-400">AI가 풀스택 MVP를 만들어드립니다. 첫 프로젝트를 시작하세요!</p>
            <button
              onClick={() => setShowNew(true)}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-500 transition"
            >
              첫 프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* 새 프로젝트 모달 카드 */}
            {showNew && (
              <div className="rounded-2xl border-2 border-dashed border-blue-500/50 bg-blue-500/5 p-6">
                <h3 className="mb-4 text-lg font-bold">새 프로젝트</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">프로젝트 이름</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="내 미용실 앱"
                      autoFocus
                      className="w-full rounded-lg bg-gray-800/80 px-3 py-2 text-sm outline-none ring-1 ring-gray-700 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">템플릿</label>
                    <select
                      value={newTemplate}
                      onChange={e => setNewTemplate(e.target.value)}
                      className="w-full rounded-lg bg-gray-800/80 px-3 py-2 text-sm outline-none ring-1 ring-gray-700 focus:ring-blue-500"
                    >
                      <option value="beauty-salon">✂️ 미용실 POS</option>
                      <option value="booking-crm">📅 범용 예약/CRM</option>
                      <option value="ecommerce">🛒 쇼핑몰</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">설명 (선택)</label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="프로젝트 간단 설명"
                      className="w-full rounded-lg bg-gray-800/80 px-3 py-2 text-sm outline-none ring-1 ring-gray-700 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); }}
                      className="flex-1 rounded-lg border border-gray-600 py-2 text-sm hover:bg-gray-700 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim() || creating}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-bold hover:bg-blue-500 transition disabled:opacity-50"
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
                  className="group rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 transition-all hover:border-gray-600 hover:bg-gray-800/80"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meta.icon}</span>
                      <div>
                        <h3 className="font-bold">{project.name}</h3>
                        <p className="text-xs text-gray-500">{meta.label}</p>
                      </div>
                    </div>
                    <span className={`rounded-full ${badge.color} px-2.5 py-0.5 text-xs text-white`}>
                      {badge.label}
                    </span>
                  </div>

                  {project.description && (
                    <p className="mb-4 text-sm text-gray-400 line-clamp-2">{project.description}</p>
                  )}

                  <div className="mb-4 text-xs text-gray-500">
                    {new Date(project.updatedAt).toLocaleDateString('ko-KR')} 수정
                  </div>

                  {project.deployedUrl && (
                    <a
                      href={project.deployedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 block truncate text-xs text-blue-400 hover:underline"
                    >
                      {project.deployedUrl}
                    </a>
                  )}

                  <div className="flex gap-2">
                    <a
                      href={`/builder?projectId=${project.id}`}
                      className="flex-1 rounded-lg bg-blue-600/80 py-2 text-center text-sm font-medium hover:bg-blue-500 transition"
                    >
                      {project.status === 'draft' ? '빌드하기' : '수정하기'}
                    </a>
                    {project.status === 'active' || project.status === 'deployed' ? (
                      <a
                        href={`/preview?projectId=${project.id}`}
                        className="rounded-lg bg-gray-700/50 px-3 py-2 text-sm hover:bg-gray-600 transition"
                      >
                        미리보기
                      </a>
                    ) : null}
                    <button
                      onClick={() => setDeleteId(project.id)}
                      className="rounded-lg bg-gray-700/50 px-3 py-2 text-sm text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 삭제 확인 */}
                  {deleteId === project.id && (
                    <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      <p className="mb-2 text-xs text-red-400">정말 삭제하시겠습니까? 복구할 수 없습니다.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteId(null)}
                          className="flex-1 rounded bg-gray-700 py-1 text-xs hover:bg-gray-600"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="flex-1 rounded bg-red-600 py-1 text-xs font-bold hover:bg-red-500"
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
