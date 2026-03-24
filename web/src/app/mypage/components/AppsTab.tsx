'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description: string | null;
  template: string;
  status: string;
  subdomain: string | null;
  deployedUrl: string | null;
  buildStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  deployed: { label: 'LIVE (배포중)', color: 'text-[#30d158]', dot: 'bg-[#30d158]' },
  active: { label: '활성', color: 'text-[#3182f6]', dot: 'bg-[#3182f6]' },
  generating: { label: '생성 중...', color: 'text-[#ffd60a]', dot: 'bg-[#ffd60a]' },
  draft: { label: '비공개', color: 'text-[#8b95a1]', dot: 'bg-[#8b95a1]' },
};

export default function AppsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await authFetch('/projects');
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3182f6] border-t-transparent" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">📱</p>
        <p className="text-[#8b95a1] mb-4">아직 만든 앱이 없습니다</p>
        <a href="/start" className="inline-block rounded-xl bg-[#3182f6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1b64da] transition-colors">
          첫 앱 만들기
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map(project => {
        const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
        return (
          <div key={project.id} className="rounded-2xl bg-[#17171c] border border-[#2c2c35] p-5 hover:border-[#3a3a45] transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-[#f2f4f6] truncate">{project.name}</h3>
                  <span className={`flex items-center gap-1 text-xs font-medium ${statusConf.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                    {statusConf.label}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-[#8b95a1] truncate mb-1">{project.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-[#6b7684]">
                  {project.subdomain && (
                    <span>URL: {project.subdomain}.foundry.ai.kr</span>
                  )}
                  <span>생성: {new Date(project.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <a
                  href={`/builder?project=${project.id}`}
                  className="rounded-lg bg-[#3182f6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1b64da] transition-colors"
                >
                  빌더 열기
                </a>
                {project.deployedUrl && (
                  <a
                    href={project.deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#2c2c35] px-4 py-2 text-xs font-medium text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors"
                  >
                    외부에서 보기
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
