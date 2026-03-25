'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import LivePreview from './LivePreview';
import VersionHistory from './VersionHistory';
import CodeHealthPanel from './CodeHealthPanel';
import InlineEditor from './InlineEditor';
import type { Message, BuildPhase, ProjectData } from './BuilderChat';

type AppModelTier = 'flash' | 'smart' | 'pro';

// 비주얼 에디터: 클릭된 요소 정보
export interface SelectedElement {
  tagName: string;
  textContent: string;
  innerText: string;
  className: string;
  id: string;
  openingTag: string; // 맥락 치환용 (예: <h1 className="text-3xl font-bold">)
  component: string;
  file: string;
  rect: { x: number; y: number; width: number; height: number };
  styles: Record<string, string>;
  isImage: boolean;
  imageSrc: string;
  isText: boolean;
}

interface BuilderPreviewProps {
  projectId: string;
  project: ProjectData | null;
  setProject: (p: ProjectData | null) => void;
  buildPhase: BuildPhase;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  previewMode: 'mobile' | 'desktop';
  setPreviewMode: (m: 'mobile' | 'desktop') => void;
  generatedFiles: { path: string; content: string }[];
  streamingFiles: { path: string; content: string }[];
  generateStep: string;
  genFileCount: number;
  genTotalFiles: number;
  hasError: boolean;
  selectedModelTier: AppModelTier;
  creditBalance: number | null;
  setCreditBalance: (b: number | null) => void;
  saveChatHistory: (msgs: Message[], showToast?: boolean) => void;
  answers: Record<string, string>;
  projectFeatures: string[];
  // iframe 리로드용
  iframeKey: number;
  // 재배포 상태
  isRedeploying: boolean;
  // 비주얼 에디터
  selectedElement: SelectedElement | null;
  setSelectedElement: (el: SelectedElement | null) => void;
  onModifyComplete: () => void;
  onSendToChat: (ctx: string) => void;
  unsavedCount: number;
  onInlineEditSaved: () => void;
  isSaving: boolean;
  onSavingChange: (saving: boolean) => void;
}

export default function BuilderPreview({
  projectId, project, setProject,
  buildPhase,
  messages, setMessages,
  previewMode, setPreviewMode,
  generatedFiles, streamingFiles,
  generateStep, genFileCount, genTotalFiles,
  hasError,
  selectedModelTier,
  creditBalance, setCreditBalance,
  saveChatHistory,
  answers, projectFeatures,
  iframeKey, isRedeploying,
  selectedElement, setSelectedElement,
  onModifyComplete,
  onSendToChat,
  unsavedCount,
  onInlineEditSaved,
  isSaving,
  onSavingChange,
}: BuilderPreviewProps) {

  const isPreviewFocused = buildPhase === 'done' || buildPhase === 'generating';

  // ── 비주얼 에디터: 편집 모드 ──
  const [editMode, setEditMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // iframe에 편집 모드 메시지 전송
  const toggleEditMode = useCallback(() => {
    const next = !editMode;
    setEditMode(next);
    if (!next) setSelectedElement(null);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: next ? 'enable-edit-mode' : 'disable-edit-mode' },
        '*'
      );
    }
    // 온보딩: 처음 편집 모드 켤 때만
    if (next && typeof window !== 'undefined' && !localStorage.getItem('foundry-edit-onboarded')) {
      setShowOnboarding(true);
      localStorage.setItem('foundry-edit-onboarded', '1');
      setTimeout(() => setShowOnboarding(false), 4000);
    }
  }, [editMode, setSelectedElement]);

  // iframe에서 element-clicked 수신
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'element-clicked' && e.data.element) {
        setSelectedElement(e.data.element);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setSelectedElement]);

  // done 상태 배포 URL 결정
  const deployedUrl = project?.deployedUrl || null;

  // done이면 deployedUrl 없어도 3초 간격으로 프로젝트 re-fetch (체험 배포 완료 대기)
  useEffect(() => {
    if (buildPhase !== 'done' || !projectId) return;
    if (deployedUrl && project?.status === 'deployed') return; // 이미 배포됨
    let attempts = 0;
    const maxAttempts = 60; // 최대 3분 대기 (3초 × 60)
    const interval = setInterval(() => {
      attempts++;
      authFetch(`/projects/${projectId}`).then(r => r.ok ? r.json() : null).then(d => {
        if (d) {
          setProject(d);
          if (d.deployedUrl && d.status === 'deployed') {
            clearInterval(interval);
          }
        }
      }).catch(() => {});
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [buildPhase, projectId, deployedUrl, project?.status]);

  return (
    <div className={`hidden lg:flex flex-col border-l border-[#1e1e28] bg-[#0c0c12] transition-all duration-500 ease-in-out ${isPreviewFocused ? 'flex-1' : 'w-[45%]'}`}>
      {/* 미리보기 헤더 */}
      <div className="flex items-center justify-between border-b border-[#1e1e28] bg-[#13131a] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium text-[#6b7684]">
            {buildPhase === 'done' ? (deployedUrl ? '실시간 미리보기' : '배포 준비 중') : '미리보기'}
          </span>
          {buildPhase === 'done' && isRedeploying && (
            <span className="flex items-center gap-1 text-[10px] text-[#ffd60a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffd60a] animate-pulse" />
              재배포 중...
            </span>
          )}
          <div className="flex rounded-md bg-[#1e1e28] p-0.5">
            <button onClick={() => setPreviewMode('mobile')} className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${previewMode === 'mobile' ? 'bg-[#3182f6] text-white' : 'text-[#6b7684] hover:text-[#f2f4f6]'}`}>📱</button>
            <button onClick={() => setPreviewMode('desktop')} className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${previewMode === 'desktop' ? 'bg-[#3182f6] text-white' : 'text-[#6b7684] hover:text-[#f2f4f6]'}`}>🖥</button>
          </div>
          {buildPhase === 'done' && deployedUrl && (
            <button
              onClick={toggleEditMode}
              className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${editMode ? 'bg-[#ff6b35] text-white' : 'bg-[#1e1e28] text-[#6b7684] hover:text-[#f2f4f6]'}`}
              title={editMode ? '편집 모드 끄기' : '편집 모드 켜기'}
            >
              {editMode ? '✏️ 편집 중' : '✏️ 편집'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {buildPhase === 'done' && deployedUrl && unsavedCount > 0 && (
            <button
              onClick={onModifyComplete}
              disabled={isRedeploying || isSaving}
              className="rounded-md bg-[#ff6b35] px-3 py-1 text-[10px] font-bold text-white hover:bg-[#e55a2b] disabled:opacity-50 transition-colors animate-pulse"
            >
              {isRedeploying ? '적용 중...' : isSaving ? '저장 중...' : `수정사항 적용 (${unsavedCount})`}
            </button>
          )}
          {buildPhase === 'done' && deployedUrl && (
            <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[#1e1e28] px-2.5 py-1 text-[10px] text-[#8b95a1] hover:text-[#f2f4f6] transition-colors">
              외부에서 보기 ↗
            </a>
          )}
        </div>
      </div>

      {/* 미리보기 영역 */}
      <div className="flex-1 overflow-auto">
        {/* ── generating: 프로그레스 뷰 ── */}
        {buildPhase === 'generating' && streamingFiles.length === 0 && (
          <GeneratingProgress generateStep={generateStep} genFileCount={genFileCount} genTotalFiles={genTotalFiles} />
        )}

        {buildPhase === 'generating' && streamingFiles.length > 0 && (
          <div className="relative h-full">
            <LivePreview files={streamingFiles} previewMode={previewMode} visualEditMode={false} />
            <MiniProgress generateStep={generateStep} streamingFiles={streamingFiles} />
          </div>
        )}

        {/* ── done: 배포 URL iframe (핵심!!) ── */}
        {buildPhase === 'done' && deployedUrl && (
          <div className="relative h-full w-full flex items-center justify-center">
            <div
              className={`h-full overflow-hidden ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full'}`}
              style={previewMode === 'mobile' ? { maxWidth: '375px' } : undefined}
            >
              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={deployedUrl}
                className="h-full w-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="앱 미리보기"
              />
            </div>
            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />{editMode ? 'EDIT' : 'LIVE'}
            </div>
            {/* 온보딩 툴팁 */}
            {showOnboarding && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#3182f6] px-4 py-2.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
                요소를 클릭하면 직접 수정할 수 있습니다
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#3182f6] rotate-45" />
              </div>
            )}
            {/* 비주얼 에디터: InlineEditor */}
            {editMode && selectedElement && (
              <InlineEditor
                selectedElement={selectedElement}
                projectId={projectId}
                iframeRef={iframeRef}
                onClose={() => setSelectedElement(null)}
                onSendToChat={(ctx) => {
                  onSendToChat(ctx);
                  setSelectedElement(null);
                  setEditMode(false);
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({ type: 'disable-edit-mode' }, '*');
                  }
                }}
                onInlineEditSaved={onInlineEditSaved}
                onSavingChange={onSavingChange}
              />
            )}
          </div>
        )}

        {/* ── done: 배포 URL 없음 → 배포 준비 중 ── */}
        {buildPhase === 'done' && !deployedUrl && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-[300px]">
              <div className="mb-4 text-4xl animate-spin">⏳</div>
              <p className="text-sm font-medium text-[#f2f4f6]">배포 준비 중...</p>
              <p className="text-xs mt-2 text-[#6b7684]">24시간 체험 배포를 진행하고 있습니다</p>
              <p className="text-xs mt-1 text-[#4e5968]">약 2~5분 소요됩니다</p>
              <button
                onClick={() => { if (projectId) authFetch(`/projects/${projectId}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setProject(d); }); }}
                className="mt-4 rounded-lg bg-[#2c2c35] px-4 py-2 text-xs font-medium text-[#8b95a1] hover:bg-[#3a3a45]"
              >
                새로고침
              </button>
            </div>
          </div>
        )}

        {/* ── designing/questionnaire: 구조 시각화 ── */}
        {buildPhase !== 'done' && buildPhase !== 'generating' && !hasError && (buildPhase === 'designing' || buildPhase === 'questionnaire') && (
          <StructureVisualization answers={answers} projectFeatures={projectFeatures} project={project} />
        )}

        {/* 에러 상태 */}
        {hasError && buildPhase === 'designing' && (
          <div className="flex h-full items-center justify-center text-center text-[#4e5968]">
            <div>
              <div className="mb-4 text-5xl">⚠️</div>
              <p className="text-sm font-medium text-[#f2f4f6]">앱 생성에 실패했습니다</p>
              <p className="text-xs mt-2 text-[#6b7684]">크레딧을 확인하고 다시 시도해주세요</p>
              <a href="/credits" className="mt-4 inline-block rounded-lg bg-[#3182f6] px-4 py-2 text-xs font-medium text-white hover:bg-[#2563eb] transition-colors">
                크레딧 충전하기
              </a>
            </div>
          </div>
        )}

        {/* idle 빈 상태 */}
        {buildPhase === 'idle' && !hasError && (
          <div className="flex h-full items-center justify-center text-center text-[#4e5968]">
            <div>
              <div className="mb-4 text-5xl opacity-60">📱</div>
              <p className="text-sm font-medium">앱을 설명하면</p>
              <p className="text-xs mt-1">여기서 실시간으로 미리볼 수 있습니다</p>
            </div>
          </div>
        )}
      </div>

      {/* 하단: 버전 히스토리 + 코드 헬스 */}
      {buildPhase === 'done' && projectId && (
        <div className="border-t border-[#1e1e28] bg-[#13131a] px-4 py-3 space-y-2">
          <VersionHistory
            projectId={projectId}
            onRollback={(ver) => {
              setMessages(prev => [...prev, {
                id: Date.now().toString(), role: 'system' as const,
                content: `↩ v${ver}으로 롤백되었습니다. 미리보기가 업데이트됩니다.`,
                timestamp: new Date().toISOString(), type: 'status' as const,
              }]);
              authFetch(`/projects/${projectId}`).then(r => r.ok ? r.json() : null).then(d => {
                if (d) setProject(d);
              });
            }}
          />
          <CodeHealthPanel
            projectId={projectId}
            modelTier={selectedModelTier}
            onCleanupComplete={(cleanupResult) => {
              authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
                if (d) setCreditBalance(d.balance);
              }).catch(() => {});
              authFetch(`/projects/${projectId}`).then(r => r.ok ? r.json() : null).then(d => {
                if (d) setProject(d);
              });
              let msg = `🧹 **코드 정리 완료!**\n\n`;
              msg += `정리된 파일: ${cleanupResult.cleanedFiles.length}개\n`;
              if (cleanupResult.totalCredits > 0) msg += `사용 크레딧: ${cleanupResult.totalCredits} cr\n`;
              if (cleanupResult.improvements.length > 0) {
                msg += `\n**개선 사항:**\n`;
                msg += cleanupResult.improvements.map((s: string) => `• ${s}`).join('\n');
              }
              setMessages(prev => [...prev, {
                id: Date.now().toString(), role: 'assistant' as const,
                content: msg, timestamp: new Date().toISOString(), type: 'text' as const,
              }]);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── 구조 시각화 (designing 상태) ──────────────────────
function StructureVisualization({ answers, projectFeatures, project }: {
  answers: Record<string, string>;
  projectFeatures: string[];
  project: ProjectData | null;
}) {
  const appName = answers.biz_name || project?.name || '내 앱';
  const features = projectFeatures.length > 0 ? projectFeatures : [];
  const answerFeatures = (answers.features || '').split(', ').filter(Boolean);
  const displayFeatures = answerFeatures.length > 0 ? answerFeatures : features;
  const pages = ['홈', ...displayFeatures.filter(f => f.length > 1).slice(0, 8)];
  const hasContent = Object.keys(answers).length > 0 || projectFeatures.length > 0;

  if (!hasContent) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="max-w-[280px]">
          <div className="mb-4 text-5xl opacity-60">📱</div>
          <p className="text-sm font-medium text-[#f2f4f6]">채팅으로 앱을 설계하세요</p>
          <p className="text-xs mt-2 text-[#6b7684]">질문에 답하면 여기에 앱 구조가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="w-full max-w-[400px] rounded-2xl border border-[#1e1e28] bg-[#13131a] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3182f6] to-[#a855f7] text-lg">📱</div>
          <div>
            <h3 className="text-sm font-bold text-[#f2f4f6]">{appName}</h3>
            <p className="text-[10px] text-[#6b7684]">앱 구조</p>
          </div>
        </div>
        <div className="mb-4">
          <h4 className="mb-2 text-[11px] font-semibold text-[#8b95a1] uppercase tracking-wider">📄 페이지</h4>
          <div className="space-y-1.5">
            {pages.map((page, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[#1a1a24] px-3 py-2 text-xs text-[#e5e7eb]">
                <span className="text-[#3182f6]">📄</span>
                <span>{page}</span>
              </div>
            ))}
          </div>
        </div>
        {displayFeatures.length > 0 && (
          <div>
            <h4 className="mb-2 text-[11px] font-semibold text-[#8b95a1] uppercase tracking-wider">🔧 기능</h4>
            <div className="space-y-1.5">
              {displayFeatures.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-[#1a1a24] px-3 py-2 text-xs text-[#e5e7eb]">
                  <span className="text-[#a855f7]">·</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {Object.keys(answers).length > 1 && (
          <div className="mt-4 border-t border-[#1e1e28] pt-3">
            <h4 className="mb-2 text-[11px] font-semibold text-[#8b95a1] uppercase tracking-wider">📝 설정</h4>
            <div className="space-y-1">
              {Object.entries(answers).filter(([k]) => k !== 'features' && k !== 'biz_name').slice(0, 5).map(([k, v]) => (
                <div key={k} className="text-[10px] text-[#6b7684]">
                  <span className="text-[#8b95a1]">{k}:</span> {typeof v === 'string' ? v.slice(0, 50) : String(v)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 생성 중 프로그레스 ──────────────────────────────
function GeneratingProgress({ generateStep, genFileCount, genTotalFiles }: {
  generateStep: string;
  genFileCount: number;
  genTotalFiles: number;
}) {
  const stepOrder = ['architecture', 'schema', 'supabase', 'frontend', 'config', 'quality'];
  const currentIdx = stepOrder.indexOf(generateStep);
  const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stepOrder.length) * 100) : 0;
  const labels: Record<string, string> = { architecture: '아키텍처 설계', schema: 'DB 스키마 생성', supabase: 'Supabase 설정', frontend: '프론트엔드 생성', config: '설정 파일', quality: '품질 검증' };
  const icons: Record<string, string> = { architecture: '📐', schema: '🗄️', supabase: '☁️', frontend: '🎨', config: '📦', quality: '🔍' };

  return (
    <div className="flex h-full flex-col items-center justify-center px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3182f6] to-[#a855f7] text-4xl shadow-lg shadow-[#3182f6]/20">
            {icons[generateStep] || '⚙️'}
          </div>
          <h3 className="mt-4 text-lg font-bold text-[#f2f4f6]">AI가 앱을 생성하고 있습니다</h3>
          <p className="mt-1 text-sm text-[#6b7684]">풀스택 앱 생성 중 — 약 20~40분 소요</p>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#f2f4f6]">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#2c2c35] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#a855f7] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
          </div>
          {genFileCount > 0 && (
            <p className="mt-2 text-xs text-[#6b7684] text-center">{genFileCount}개 파일 생성됨{genTotalFiles > 0 ? ` / 예상 ${genTotalFiles}개` : ''}</p>
          )}
        </div>
        <div className="space-y-3">
          {stepOrder.map((step, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx;
            return (
              <div key={step} className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${isActive ? 'bg-[#1e1e28] ring-1 ring-[#3182f6]/30' : isDone ? 'bg-[#1e1e28]/50' : 'opacity-40'}`}>
                <span className="text-lg">{isDone ? '✅' : icons[step]}</span>
                <span className={`text-sm ${isActive ? 'text-[#f2f4f6] font-medium' : isDone ? 'text-[#8b95a1]' : 'text-[#4e5968]'}`}>{labels[step]}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3182f6] animate-pulse" />}
              </div>
            );
          })}
        </div>
        <div className="mt-6 w-full max-w-md">
          <div className="rounded-xl border border-[#2c2c35]/50 bg-[#1b1b21]/50 p-3 text-center">
            <span className="text-xs text-[#6b7684]">💬 왼쪽 채팅에서 궁금한 점을 물어보세요!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 미니 프로그레스 오버레이 ──────────────────────────
function MiniProgress({ generateStep, streamingFiles }: {
  generateStep: string;
  streamingFiles: { path: string; content: string }[];
}) {
  const stepOrder = ['architecture', 'schema', 'supabase', 'frontend', 'config', 'quality'];
  const currentIdx = stepOrder.indexOf(generateStep);
  const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stepOrder.length) * 100) : 0;

  return (
    <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-[#2c2c35] bg-[#13131a]/90 backdrop-blur-sm px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-2 w-2 rounded-full bg-[#3182f6] animate-pulse" />
        <span className="text-xs text-[#8b95a1]">
          {generateStep === 'frontend' ? `페이지 생성 중... (${streamingFiles.filter(f => f.path.includes('page.tsx')).length}개 완료)` :
           generateStep === 'quality' ? '코드 품질 검증 중...' :
           generateStep === 'config' ? '설정 파일 생성 중...' :
           'AI가 코드를 생성하고 있습니다...'}
        </span>
        <span className="ml-auto text-xs font-medium text-[#3182f6]">
          {streamingFiles.length}개 파일
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#2c2c35] overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#a855f7] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
