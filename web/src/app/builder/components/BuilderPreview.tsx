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
  onStartTutorial?: () => void;
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
  onStartTutorial,
}: BuilderPreviewProps) {

  const isPreviewFocused = buildPhase === 'done' || buildPhase === 'generating';
  const [showTutorial, setShowTutorial] = useState(false);

  // ── 비주얼 에디터: 편집 모드 ──
  const [editMode, setEditMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const pendingEditMode = useRef<boolean | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // iframe src 바뀌면 editorReady 리셋
  useEffect(() => {
    setEditorReady(false);
  }, [iframeKey]);

  // iframe에 편집 모드 메시지 전송
  const sendEditModeToIframe = useCallback((enable: boolean) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: enable ? 'enable-edit-mode' : 'disable-edit-mode' },
        '*'
      );
    }
  }, []);

  const toggleEditMode = useCallback(() => {
    const next = !editMode;
    setEditMode(next);
    if (!next) setSelectedElement(null);
    if (editorReady) {
      sendEditModeToIframe(next);
    } else {
      // editor 아직 로드 안 됨 → 큐에 넣고 ready 되면 전송
      pendingEditMode.current = next;
    }
    // 온보딩: 처음 편집 모드 켤 때만
    if (next && typeof window !== 'undefined' && !localStorage.getItem('foundry-edit-onboarded')) {
      setShowOnboarding(true);
      localStorage.setItem('foundry-edit-onboarded', '1');
      setTimeout(() => setShowOnboarding(false), 4000);
    }
  }, [editMode, editorReady, setSelectedElement, sendEditModeToIframe]);

  // iframe에서 foundry-editor-ready + element-clicked 수신
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'foundry-editor-ready') {
        setEditorReady(true);
        // 큐에 대기 중인 editMode 메시지 전송
        if (pendingEditMode.current !== null) {
          sendEditModeToIframe(pendingEditMode.current);
          pendingEditMode.current = null;
        }
      }
      if (e.data?.type === 'element-clicked' && e.data.element) {
        setSelectedElement(e.data.element);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setSelectedElement, sendEditModeToIframe]);

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
    <div data-tutorial="preview" className={`hidden lg:flex flex-col border-l border-[var(--border-secondary)] bg-[var(--bg-primary)] transition-all duration-500 ease-in-out ${isPreviewFocused ? 'flex-1' : 'w-[45%]'}`}>
      {/* 미리보기 헤더 */}
      <div className="flex items-center justify-between border-b border-[var(--border-secondary)] bg-[var(--bg-header)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
            {buildPhase === 'done' ? (deployedUrl ? '실시간 미리보기' : '배포 준비 중') : '미리보기'}
          </span>
          {buildPhase === 'done' && isRedeploying && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--toss-yellow)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--toss-yellow)] animate-pulse" />
              재배포 중...
            </span>
          )}
          <div className="flex rounded-md bg-[var(--bg-subtle)] p-0.5">
            <button onClick={() => setPreviewMode('mobile')} className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${previewMode === 'mobile' ? 'bg-[var(--toss-blue)] text-white' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>📱</button>
            <button onClick={() => setPreviewMode('desktop')} className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${previewMode === 'desktop' ? 'bg-[var(--toss-blue)] text-white' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>🖥</button>
          </div>
          {buildPhase === 'done' && deployedUrl && (
            <button
              onClick={toggleEditMode}
              className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${editMode ? 'bg-[#ff6b35] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
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
            <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[var(--bg-subtle)] px-2.5 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              외부에서 보기 ↗
            </a>
          )}
          <button
            onClick={() => setShowTutorial(true)}
            className="rounded-md bg-[var(--toss-blue)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--toss-blue)] hover:bg-[var(--toss-blue)]/20 transition-colors"
            title="사용법 보기"
          >
            사용법
          </button>
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

        {/* ── done: 배포 중 (buildStatus가 아직 done이 아닐 때) ── */}
        {buildPhase === 'done' && deployedUrl && project?.buildStatus !== 'done' && project?.status !== 'deployed' && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-[320px]">
              <div className="mb-4 text-4xl animate-spin">⏳</div>
              <p className="text-sm font-medium text-[var(--text-primary)]">서버에 배포 중입니다...</p>
              <p className="text-xs mt-2 text-[var(--text-tertiary)]">약 2~3분 소요됩니다. 잠시만 기다려주세요.</p>
              <p className="text-xs mt-1 text-[var(--text-disabled)]">완료되면 자동으로 미리보기가 표시됩니다</p>
            </div>
          </div>
        )}

        {/* ── done: 배포 URL iframe (배포 완료 후에만!) ── */}
        {buildPhase === 'done' && deployedUrl && (project?.buildStatus === 'done' || project?.status === 'deployed') && (
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
            {/* 404/빈 화면 안내 배너 — 배포 직후 표시, 10초 후 자동 숨김 */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 rounded-xl bg-[var(--bg-secondary)]/95 border border-[var(--toss-blue)]/30 px-5 py-3 text-center shadow-lg max-w-[320px] animate-fade-in" style={{ animation: 'fadeInOut 15s forwards' }}>
              <p className="text-xs font-medium text-[var(--text-primary)] mb-1">서버에 앱을 게시하고 있습니다</p>
              <p className="text-[10px] text-[var(--text-secondary)]">화면이 보이지 않으면 2~3분 후<br/><button onClick={() => { if (iframeRef.current) iframeRef.current.src = deployedUrl + '?t=' + Date.now(); }} className="text-[var(--toss-blue)] font-bold underline">여기를 눌러 새로고침</button> 해주세요</p>
            </div>
            <style>{`@keyframes fadeInOut { 0% { opacity: 0; } 5% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; pointer-events: none; } }`}</style>
            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />{editMode ? 'EDIT' : 'LIVE'}
            </div>
            {/* 온보딩 툴팁 */}
            {showOnboarding && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[var(--toss-blue)] px-4 py-2.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
                요소를 클릭하면 직접 수정할 수 있습니다
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--toss-blue)] rotate-45" />
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
              <p className="text-sm font-medium text-[var(--text-primary)]">배포 준비 중...</p>
              <p className="text-xs mt-2 text-[var(--text-tertiary)]">24시간 체험 배포를 진행하고 있습니다</p>
              <p className="text-xs mt-1 text-[var(--text-disabled)]">약 2~5분 소요됩니다</p>
              <button
                onClick={() => { if (projectId) authFetch(`/projects/${projectId}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setProject(d); }); }}
                className="mt-4 rounded-lg bg-[var(--bg-elevated)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--border-hover)]"
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
          <div className="flex h-full items-center justify-center text-center text-[var(--text-disabled)]">
            <div>
              <div className="mb-4 text-5xl">⚠️</div>
              <p className="text-sm font-medium text-[var(--text-primary)]">앱 생성에 실패했습니다</p>
              <p className="text-xs mt-2 text-[var(--text-tertiary)]">크레딧을 확인하고 다시 시도해주세요</p>
              <a href="/credits" className="mt-4 inline-block rounded-lg bg-[var(--toss-blue)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--toss-blue)] transition-colors">
                크레딧 충전하기
              </a>
            </div>
          </div>
        )}

        {/* idle 빈 상태 */}
        {buildPhase === 'idle' && !hasError && (
          <div className="flex h-full items-center justify-center text-center text-[var(--text-disabled)]">
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
        <div className="border-t border-[var(--border-secondary)] bg-[var(--bg-header)] px-4 py-3 space-y-2">
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
      {/* ── 사용법 모달 ── */}
      {showTutorial && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowTutorial(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', width: '92%', maxWidth: 560, maxHeight: '85vh', overflow: 'auto', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', padding: '32px 32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <button onClick={() => setShowTutorial(false)} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-tertiary)', lineHeight: 1 }}>&times;</button>

            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Foundry 빌더 사용법</h2>
            </div>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 10 }}>아래 순서대로 진행하면 나만의 앱이 만들어집니다!</p>

            {/* 튜토리얼 체험 버튼 */}
            {onStartTutorial && (
              <button
                onClick={() => { setShowTutorial(false); onStartTutorial(); }}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, marginBottom: 24,
                  border: '2px solid var(--toss-blue)', background: 'rgba(49,130,246,0.06)', color: 'var(--toss-blue)',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>&#9654;</span> 인터랙티브 튜토리얼 체험하기
              </button>
            )}

            {/* 단계별 안내 */}
            {[
              { step: 1, icon: '💬', title: 'AI와 대화하기', desc: '왼쪽 채팅창에서 질문에 답하세요. 업종, 기능, 디자인을 AI가 물어봅니다.' },
              { step: 2, icon: '🤖', title: '앱 자동 생성', desc: '질문이 끝나면 AI가 앱을 자동으로 만듭니다. 약 20~40분 소요되며, 오른쪽 미리보기에서 실시간으로 확인 가능합니다.' },
              { step: 3, icon: '📱', title: '미리보기 확인', desc: '생성 완료 후 오른쪽에서 앱을 확인하세요. 모바일/데스크톱 전환도 가능합니다.' },
              { step: 4, icon: '✏️', title: '직접 수정 (편집 모드)', desc: '상단 "편집" 버튼을 켜면 미리보기에서 텍스트, 색상, 이미지를 직접 클릭해 수정할 수 있습니다.' },
              { step: 5, icon: '🧠', title: 'AI에게 수정 요청', desc: '복잡한 수정은 채팅으로 AI에게 요청하세요. "메뉴 추가해줘", "색상 바꿔줘" 등 자연어로 가능!' },
              { step: 6, icon: '🌐', title: '온라인 게시 (배포)', desc: '수정이 끝나면 왼쪽 하단 "온라인 게시"를 눌러주세요. 실제 URL에 반영됩니다! 게시 안 하면 미리보기에서만 보입니다.' },
              { step: 7, icon: '📦', title: '다운로드', desc: '코드를 ZIP으로 다운로드할 수 있습니다. 소유권은 100% 고객님 것!' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--toss-blue)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700,
                }}>{item.step}</div>
                <div style={{ paddingTop: 2 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{item.icon}</span> {item.title}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              </div>
            ))}

            {/* 하단 팁 */}
            <div style={{ marginTop: 8, padding: '14px 18px', borderRadius: 12, background: 'rgba(49,130,246,0.06)', border: '1px solid rgba(49,130,246,0.15)', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--toss-blue)', fontWeight: 600 }}>
                궁금한 점이 있으면 언제든 채팅으로 AI에게 물어보세요!
              </p>
            </div>

            <button onClick={() => setShowTutorial(false)} style={{
              width: '100%', marginTop: 16, padding: '14px 0', borderRadius: 14,
              border: 'none', background: 'var(--toss-blue)', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
              확인
            </button>
          </div>
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
          <p className="text-sm font-medium text-[var(--text-primary)]">채팅으로 앱을 설계하세요</p>
          <p className="text-xs mt-2 text-[var(--text-tertiary)]">질문에 답하면 여기에 앱 구조가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border-secondary)] bg-[var(--bg-header)] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3182f6] to-[#a855f7] text-lg">📱</div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{appName}</h3>
            <p className="text-[10px] text-[var(--text-tertiary)]">앱 구조</p>
          </div>
        </div>
        <div className="mb-4">
          <h4 className="mb-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">📄 페이지</h4>
          <div className="space-y-1.5">
            {pages.map((page, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]">
                <span className="text-[var(--toss-blue)]">📄</span>
                <span>{page}</span>
              </div>
            ))}
          </div>
        </div>
        {displayFeatures.length > 0 && (
          <div>
            <h4 className="mb-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">🔧 기능</h4>
            <div className="space-y-1.5">
              {displayFeatures.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]">
                  <span className="text-[var(--toss-purple)]">·</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {Object.keys(answers).length > 1 && (
          <div className="mt-4 border-t border-[var(--border-secondary)] pt-3">
            <h4 className="mb-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">📝 설정</h4>
            <div className="space-y-1">
              {Object.entries(answers).filter(([k]) => k !== 'features' && k !== 'biz_name').slice(0, 5).map(([k, v]) => (
                <div key={k} className="text-[10px] text-[var(--text-tertiary)]">
                  <span className="text-[var(--text-secondary)]">{k}:</span> {typeof v === 'string' ? v.slice(0, 50) : String(v)}
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
          <h3 className="mt-4 text-lg font-bold text-[var(--text-primary)]">AI가 앱을 생성하고 있습니다</h3>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">풀스택 앱 생성 중 — 약 20~40분 소요</p>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#a855f7] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
          </div>
          {genFileCount > 0 && (
            <p className="mt-2 text-xs text-[var(--text-tertiary)] text-center">{genFileCount}개 파일 생성됨{genTotalFiles > 0 ? ` / 예상 ${genTotalFiles}개` : ''}</p>
          )}
        </div>
        <div className="space-y-3">
          {stepOrder.map((step, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx;
            return (
              <div key={step} className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${isActive ? 'bg-[var(--bg-subtle)] ring-1 ring-[#3182f6]/30' : isDone ? 'bg-[var(--bg-subtle)]/50' : 'opacity-40'}`}>
                <span className="text-lg">{isDone ? '✅' : icons[step]}</span>
                <span className={`text-sm ${isActive ? 'text-[var(--text-primary)] font-medium' : isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-disabled)]'}`}>{labels[step]}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--toss-blue)] animate-pulse" />}
              </div>
            );
          })}
        </div>
        <div className="mt-6 w-full max-w-md">
          <div className="rounded-xl border border-[var(--border-primary)]/50 bg-[var(--bg-secondary)]/50 p-3 text-center">
            <span className="text-xs text-[var(--text-tertiary)]">💬 왼쪽 채팅에서 궁금한 점을 물어보세요!</span>
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
    <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-header)]/90 backdrop-blur-sm px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-2 w-2 rounded-full bg-[var(--toss-blue)] animate-pulse" />
        <span className="text-xs text-[var(--text-secondary)]">
          {generateStep === 'frontend' ? `페이지 생성 중... (${streamingFiles.filter(f => f.path.includes('page.tsx')).length}개 완료)` :
           generateStep === 'quality' ? '코드 품질 검증 중...' :
           generateStep === 'config' ? '설정 파일 생성 중...' :
           'AI가 코드를 생성하고 있습니다...'}
        </span>
        <span className="ml-auto text-xs font-medium text-[var(--toss-blue)]">
          {streamingFiles.length}개 파일
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#a855f7] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
