'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authFetch, getUser, getToken, API_BASE } from '@/lib/api';
import { QUESTIONNAIRES } from './constants';
import BuilderChat from './components/BuilderChat';
import BuilderPreview from './components/BuilderPreview';
import type { SelectedElement } from './components/BuilderPreview';
import CreditConfirmModal from './components/CreditConfirmModal';
import BuilderTutorial from './components/BuilderTutorial';
import type { Message, BuildPhase, ProjectData } from './components/BuilderChat';

type AppModelTier = 'flash' | 'smart' | 'pro';

// ── API 함수 ──────────────────────────────────────
async function callGenerateApp(params: {
  projectId: string;
  template: string;
  answers: Record<string, string | string[]>;
  selectedFeatures: string[];
  modelTier: AppModelTier;
  theme?: string;
  chatHistory?: { role: string; content: string }[];
}): Promise<{
  success: boolean;
  files: { path: string; content: string }[];
  architecture: any;
  fileCount: number;
  totalCredits: number;
  actualTier: string;
  fellBack: boolean;
  assessment: { confidence: number; incompleteFeatures: string[]; suggestions: string[] };
  steps: { step: string; status: string; fileCount: number }[];
} | null> {
  try {
    const res = await authFetch('/ai/generate-app', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function BuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[var(--bg-card)] text-[var(--text-primary)]">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    }>
      <BuilderContent />
    </Suspense>
  );
}

function BuilderContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  // ── 핵심 상태 ──────────────────────────────────
  const [project, setProject] = useState<ProjectData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [projectFeatures, setProjectFeatures] = useState<string[]>([]);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [showCostModal, setShowCostModal] = useState<'deploy' | 'download' | 'generate' | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [showSaveToast, setShowSaveToast] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── 튜토리얼 상태 ──────────────────────────────
  const [showTutorial, setShowTutorial] = useState(false);

  // ── 생성 관련 상태 ──────────────────────────────
  const [generateProgress, setGenerateProgress] = useState<string[]>([]);
  const [generateStep, setGenerateStep] = useState<string>('');
  const [genFileCount, setGenFileCount] = useState(0);
  const [genTotalFiles, setGenTotalFiles] = useState(0);
  const [streamingFiles, setStreamingFiles] = useState<{ path: string; content: string }[]>([]);
  // ── iframe 리로드 + 재배포 상태 ──────────────────
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isRedeploying, setIsRedeploying] = useState(false);
  // 비주얼 에디터: 선택된 요소 + 미저장 변경사항
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [unsavedCount, setUnsavedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const selectedModelTier: AppModelTier = 'smart';
  const templateId = project?.template || 'custom';

  // ── 초기화 ──────────────────────────────────────
  useEffect(() => {
    if (!getUser()) { window.location.href = '/login'; return; }
    if (!projectId) { window.location.href = '/dashboard'; return; }

    authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setCreditBalance(d.balance);
    }).catch(() => {});

    (async () => {
      try {
        const res = await authFetch(`/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
          if (data.features?.selected) {
            setProjectFeatures(data.features.selected);
          }

          if (data.chatHistory && Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
            setMessages(data.chatHistory);
            if (data.status === 'active' || data.status === 'deployed') {
              setBuildPhase('done');
              if (data.projectContext?.lastAction || data.totalModifications > 0) {
                setShowWelcomeBack(true);
              }
            } else if (data.status === 'generating') {
              setBuildPhase('generating');
            } else {
              setBuildPhase('designing');
            }
          } else if (data.status === 'active' || data.status === 'deployed') {
            // chatHistory가 없어도 완료된 프로젝트면 done으로 복원
            setBuildPhase('done');
            setMessages([{
              id: '1', role: 'assistant',
              content: `**${data.name}** 프로젝트가 준비되어 있습니다.\n수정이 필요하시면 말씀해주세요!`,
              timestamp: new Date().toISOString(), type: 'text',
            }]);
          } else if (data.features?.readyToGenerate && data.features?.answers) {
            setMessages([{
              id: '1', role: 'assistant',
              content: `**${data.name}** 프로젝트 코드 생성을 시작합니다!${data.features?.smartAnalysisResults ? '\n\n🧠 스마트 분석 결과가 반영됩니다.' : ''}`,
              timestamp: new Date().toISOString(), type: 'text',
            }]);
            setAnswers(data.features.answers);
            setProjectFeatures(data.features.selected || []);
            setAutoGenerate(true);
          } else {
            const tmpl = data.template || 'custom';
            const qs = QUESTIONNAIRES[tmpl] || QUESTIONNAIRES['custom'];
            const firstQ = qs[0];
            setMessages([{
              id: '1', role: 'assistant',
              content: `**${data.name}** 프로젝트를 함께 만들어볼게요!\n\n몇 가지 질문에 답해주시면 맞춤 앱을 설계해드립니다.\n아래 보기를 클릭하거나 직접 입력하세요.`,
              timestamp: new Date().toISOString(), type: 'text',
            }, {
              id: '2', role: 'assistant',
              content: `**Q1.** ${firstQ.question}`,
              timestamp: new Date().toISOString(), type: 'text',
              chips: firstQ.chips,
            }]);
            setBuildPhase('questionnaire');
            setQuestionIndex(0);
          }
        }
      } catch { /* */ }
    })();
  }, [projectId]);

  // 튜토리얼: buildPhase=done + 첫 방문 + 새 프로젝트
  useEffect(() => {
    if (buildPhase === 'done' && !localStorage.getItem('foundry_tutorial_done')) {
      // 새로 생성 완료된 프로젝트 (수정 이력 없음)
      if (project && (!project.totalModifications || project.totalModifications === 0)) {
        const timer = setTimeout(() => setShowTutorial(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [buildPhase, project]);

  // 앱 생성 중 페이지 이탈 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    if (buildPhase === 'generating') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [buildPhase]);

  // /start에서 넘어온 경우: 자동 코드 생성
  useEffect(() => {
    if (autoGenerate && Object.keys(answers).length > 0 && projectId) {
      setAutoGenerate(false);
      handleGenerate();
    }
  }, [autoGenerate, answers, projectId]);

  // ── 채팅 저장 ──────────────────────────────────
  const saveChatHistory = (msgs: Message[], showToast = false) => {
    if (!projectId || msgs.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await authFetch(`/projects/${projectId}`, {
          method: 'PATCH',
          body: JSON.stringify({ chatHistory: msgs }),
        });
        const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setLastSaved(now);
        if (showToast) {
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 2000);
        }
      } catch { /* */ }
      setSaving(false);
    }, showToast ? 0 : 2000);
  };

  const handleManualSave = () => { saveChatHistory(messages, true); };

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => { saveChatHistory(messages); }, 30000);
    return () => clearInterval(interval);
  }, [messages]);

  // ── 앱 생성 (SSE) ──────────────────────────────
  const handleGenerate = async () => {
    if (!projectId) return;
    setBuildPhase('generating');
    setHasError(false);
    setGenerateProgress([]);
    setGenerateStep('');
    setGenFileCount(0);
    setGenTotalFiles(0);
    setStreamingFiles([]);

    const statusMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: statusMsgId, role: 'system',
      content: `🚀 **AI가 앱을 생성합니다** (${selectedModelTier.toUpperCase()} 모델)\n\n📐 아키텍처 설계 중...`,
      timestamp: new Date().toISOString(), type: 'status',
    }]);

    const chatHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const token = localStorage.getItem('launchpad_token');

    try {
      const response = await fetch(`${(await import('@/lib/api')).API_BASE}/ai/generate-app-sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId,
          template: templateId,
          answers,
          selectedFeatures: projectFeatures,
          modelTier: selectedModelTier,
          theme: project?.theme || 'basic-light',
          chatHistory: chatHistory.slice(-10),
        }),
      });

      if (!response.ok || !response.body) {
        const result = await callGenerateApp({
          projectId,
          template: templateId,
          answers,
          selectedFeatures: projectFeatures,
          modelTier: selectedModelTier,
          theme: project?.theme || 'basic-light',
          chatHistory: chatHistory.slice(-10),
        });
        if (result) {
          handleGenerateComplete(result);
        } else {
          const hasCode = project?.generatedCode && Array.isArray(project.generatedCode) && project.generatedCode.length > 0;
          setBuildPhase(hasCode ? 'done' : 'designing');
          if (!hasCode) setHasError(true);
          setMessages(prev => [...prev, {
            id: Date.now().toString(), role: 'assistant',
            content: hasCode
              ? '추가 생성에 실패했습니다. 기존 앱은 유지됩니다.\n\n채팅으로 수정하거나 [배포] 버튼을 이용하세요.'
              : '⚠️ 앱 생성에 실패했습니다.\n\n크레딧을 확인하고 다시 시도해주세요. [크레딧 충전하기 →](/credits)',
            timestamp: new Date().toISOString(), type: 'text',
          }]);
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const stepLabels: Record<string, string> = {
        architecture: '📐 아키텍처 설계',
        schema: '🗄️ DB 스키마 생성',
        supabase: '☁️ Supabase 프로비저닝',
        frontend: '🎨 프론트엔드 생성',
        config: '📦 설정 파일 생성',
        quality: '🔍 코드 품질 검증',
        credits: '💳 크레딧 정산',
        complete: '✅ 완료',
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                const label = stepLabels[data.step] || data.step;
                const msg = data.detail ? `${label}: ${data.detail}` : `${label} (${data.progress})`;
                setGenerateProgress(prev => [...prev, msg]);
                setGenerateStep(data.step);
                if (data.fileCount) setGenFileCount(data.fileCount);
                if (data.totalFiles) setGenTotalFiles(data.totalFiles);

                if (data.generatedFiles && Array.isArray(data.generatedFiles)) {
                  setStreamingFiles(prev => {
                    const updated = [...prev];
                    for (const newFile of data.generatedFiles) {
                      const idx = updated.findIndex(f => f.path === newFile.path);
                      if (idx >= 0) updated[idx] = newFile;
                      else updated.push(newFile);
                    }
                    return updated;
                  });
                }

                const fileInfo = data.fileCount ? ` — ${data.fileCount}개 파일` : '';
                setMessages(prev => prev.map(m =>
                  m.id === statusMsgId
                    ? { ...m, content: `🚀 **AI가 앱을 생성합니다** (${selectedModelTier.toUpperCase()} 모델)\n\n${label} 중...${fileInfo}\n\n${data.message || ''}` }
                    : m
                ));
              }

              if (data.type === 'done') {
                handleGenerateComplete(data);
              }

              if (data.type === 'error') {
                const hasCode = streamingFiles.length > 0 || (project?.generatedCode && Array.isArray(project.generatedCode) && project.generatedCode.length > 0);
                setBuildPhase(hasCode ? 'done' : 'designing');
                if (!hasCode) setHasError(true);
                setMessages(prev => [...prev, {
                  id: Date.now().toString(), role: 'assistant',
                  content: hasCode
                    ? `생성 중 오류가 발생했습니다.\n\n생성된 파일은 유지됩니다. 채팅으로 수정하거나 [배포] 버튼을 이용하세요.`
                    : `⚠️ 앱 생성에 실패했습니다.\n\n다시 시도해주세요.`,
                  timestamp: new Date().toISOString(), type: 'text',
                }]);
              }
            } catch { /* JSON 파싱 실패 무시 */ }
          }
        }
      } finally {
        buffer = '';
        reader.releaseLock();
      }
    } catch {
      const hasCode = streamingFiles.length > 0 || (project?.generatedCode && Array.isArray(project.generatedCode) && project.generatedCode.length > 0);
      setBuildPhase(hasCode ? 'done' : 'designing');
      if (!hasCode) {
        setHasError(true);
        setGenerateProgress([]);
        setStreamingFiles([]);
      }
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: hasCode
          ? '네트워크 오류가 발생했습니다. 생성된 파일은 유지됩니다.'
          : '⚠️ 네트워크 오류가 발생했습니다.\n\n다시 시도해주세요.',
        timestamp: new Date().toISOString(), type: 'text',
      }]);
    }
  };

  const handleGenerateComplete = (result: any) => {
    authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setCreditBalance(d.balance);
    }).catch(() => {});

    if (projectId) {
      authFetch(`/projects/${projectId}`).then(r => r.ok ? r.json() : null).then(d => {
        if (d) setProject(d);
      }).catch(() => {});
    }

    setBuildPhase('done');
    const arch = result.architecture;
    const assess = result.assessment || { confidence: 80, incompleteFeatures: [], suggestions: [] };

    const dbTables = arch?.dbTables || arch?.dbModels || [];
    let completionMsg = `✅ **앱 생성 완료!**\n\n`;
    completionMsg += `**${arch?.appName || '앱'}** — ${arch?.description || ''}\n\n`;
    completionMsg += `📊 **생성 결과:**\n`;
    completionMsg += `- 총 ${result.fileCount}개 파일 생성\n`;
    completionMsg += `- 페이지: ${(arch?.pages || []).length}개\n`;
    completionMsg += `- DB 테이블: ${dbTables.length}개 (Supabase)\n`;
    completionMsg += `- 인증: Supabase Auth ✅\n`;
    completionMsg += `- 사용 모델: ${(result.actualTier || '').toUpperCase()}`;
    if (result.fellBack) completionMsg += ` (Flash로 자동 전환됨)`;
    completionMsg += `\n`;
    if (result.totalCredits > 0) completionMsg += `- 사용 크레딧: ${result.totalCredits.toLocaleString()} cr\n`;
    completionMsg += `\n`;

    completionMsg += `✨ **기본 구조 완성!** 채팅으로 기능을 추가하거나 수정할 수 있습니다.\n`;
    if (assess.incompleteFeatures && assess.incompleteFeatures.length > 0) {
      completionMsg += `\n💡 **추천 개선사항:**\n`;
      completionMsg += assess.incompleteFeatures.map((f: string) => `  - ${f}`).join('\n') + '\n';
    }
    if (result.trialDeploy) {
      completionMsg += `\n🎉 **24시간 무료 체험 배포 중!**\n`;
      completionMsg += `🔗 ${result.trialDeploy.deployedUrl}\n`;
      completionMsg += `⏰ 체험 종료: ${new Date(result.trialDeploy.trialExpiresAt).toLocaleString('ko-KR')}\n`;
      completionMsg += `\n지금 바로 앱을 확인해보세요!\n`;
    }
    completionMsg += `\n⚠️ **미리보기 안내:** 서버 배포에 2~3분 소요됩니다. 우측 미리보기에 오류가 표시되면 잠시 후 자동으로 갱신됩니다. 새로고침 하시면 바로 확인 가능합니다.\n`;
    completionMsg += `\n수정이 필요하면 채팅으로 말씀해주세요.`;
    if (!result.trialDeploy) {
      completionMsg += `\n완료되면 **"다운로드"** 또는 **"온라인 게시"** 버튼을 이용하세요!`;
    }

    const pendingMsg = pendingRequests.length > 0
      ? `\n\n💬 **생성 중 요청하신 내용이 있습니다:**\n${pendingRequests.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}\n\n아래 **"대화 내용 반영하기"** 버튼을 누르면 위 내용을 앱에 적용합니다!`
      : '';

    setMessages(prev => {
      const msgs = [...prev, {
        id: Date.now().toString(), role: 'assistant' as const,
        content: completionMsg + pendingMsg,
        timestamp: new Date().toISOString(), type: 'text' as const,
      }];
      saveChatHistory(msgs);
      return msgs;
    });
  };

  // ── 배포 ──────────────────────────────────────
  const handleDeploy = async () => {
    if (!projectId) return;
    try {
      const res = await authFetch(`/projects/${projectId}/deploy`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `빌드를 시작합니다...\n\n**서브도메인**: ${data.subdomain}\n**URL**: ${data.deployedUrl}\n\n빌드 진행 중... (약 2~5분 소요)`,
        timestamp: new Date().toISOString(), type: 'text',
      }]);

      const maxAttempts = 100;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const statusRes = await authFetch(`/projects/${projectId}/build-status`);
          if (!statusRes.ok) continue;
          const status = await statusRes.json();

          if (status.buildStatus === 'done') {
            setMessages(prev => [...prev, {
              id: Date.now().toString(), role: 'assistant',
              content: `배포가 완료되었습니다!\n\n**URL**: [${status.deployedUrl}](${status.deployedUrl})\n\n클릭하면 배포된 앱을 확인할 수 있습니다.`,
              timestamp: new Date().toISOString(), type: 'text',
            }]);
            return;
          }
          if (status.buildStatus === 'failed') {
            setMessages(prev => [...prev, {
              id: Date.now().toString(), role: 'assistant',
              content: `빌드에 실패했습니다.\n\n\`\`\`\n${(status.buildLog || '').split('\n').slice(-5).join('\n')}\n\`\`\`\n\n코드를 수정한 후 다시 배포해주세요.`,
              timestamp: new Date().toISOString(), type: 'text',
            }]);
            return;
          }
          if (status.buildStatus === 'queued' && status.queuePosition) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.content?.includes('대기열')) {
                return [...prev.slice(0, -1), {
                  ...last,
                  content: `⏳ 빌드 대기열 **${status.queuePosition}번째** — 약 ${status.estimatedMinutes}분 소요 예상`,
                }];
              }
              return [...prev, {
                id: 'queue-' + Date.now(), role: 'assistant' as const,
                content: `⏳ 빌드 대기열 **${status.queuePosition}번째** — 약 ${status.estimatedMinutes}분 소요 예상`,
                timestamp: new Date().toISOString(), type: 'text' as const,
              }];
            });
          }
        } catch { /* 계속 폴링 */ }
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: '빌드 시간이 초과되었습니다. 잠시 후 대시보드에서 확인해주세요.',
        timestamp: new Date().toISOString(), type: 'text',
      }]);
    } catch { /* */ }
  };

  // ── 다운로드 ──────────────────────────────────
  const handleDownload = async () => {
    if (!projectId) return;
    try {
      const res = await authFetch(`/projects/${projectId}/download`);
      if (!res.ok) return;
      const manifest = await res.json();
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const file of manifest.files) zip.file(file.path, file.content);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${manifest.projectName}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* */ }
  };

  // ── 수정 완료 후 자동 재배포 ──────────────────────
  const handleModifyComplete = async () => {
    if (!projectId) return;
    setIsRedeploying(true);
    try {
      const res = await authFetch(`/projects/${projectId}/deploy`, { method: 'POST' });
      if (!res.ok) {
        setIsRedeploying(false);
        return;
      }
      // 빌드 완료 대기 (폴링)
      const maxAttempts = 100;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          const statusRes = await authFetch(`/projects/${projectId}/build-status`);
          if (!statusRes.ok) continue;
          const status = await statusRes.json();
          if (status.buildStatus === 'done') {
            // 프로젝트 갱신 + iframe 리로드
            const projRes = await authFetch(`/projects/${projectId}`);
            if (projRes.ok) {
              const projData = await projRes.json();
              setProject(projData);
            }
            setIframeKey(Date.now());
            setMessages(prev => [...prev, {
              id: Date.now().toString(), role: 'assistant' as const,
              content: '🎉 **미리보기가 업데이트되었습니다!**',
              timestamp: new Date().toISOString(), type: 'text' as const,
            }]);
            break;
          }
          if (status.buildStatus === 'failed') {
            setMessages(prev => [...prev, {
              id: Date.now().toString(), role: 'assistant' as const,
              content: '⚠️ 빌드 에러 발생. 자동 수정을 시도합니다.\n\n다시 수정을 요청하거나 잠시 후 시도해주세요.',
              timestamp: new Date().toISOString(), type: 'text' as const,
            }]);
            break;
          }
        } catch { /* 폴링 계속 */ }
      }
    } catch { /* */ }
    setIsRedeploying(false);
    setUnsavedCount(0);
  };

  // ── generatedFiles 계산 ──────────────────────────
  const generatedFiles = useMemo(() => {
    if (buildPhase === 'generating' && streamingFiles.length > 0) {
      return streamingFiles;
    }
    if (buildPhase === 'done') {
      if (project?.generatedCode && Array.isArray(project.generatedCode) && project.generatedCode.length > 0) {
        return project.generatedCode as { path: string; content: string }[];
      }
      if (streamingFiles.length > 0) return streamingFiles;
    }
    if (!project?.generatedCode || !Array.isArray(project.generatedCode)) return [];
    return project.generatedCode as { path: string; content: string }[];
  }, [project?.generatedCode, streamingFiles, buildPhase]);

  // iframe 메뉴 클릭 이벤트
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'menu') { /* no-op: 템플릿 미리보기 제거 */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!projectId) return null;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 앱 생성 중 경고 배너 (하단 고정 — 상단 탭/생성 정보 가리지 않음) */}
      {buildPhase === "generating" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "#ef4444", color: "#fff", padding: "12px 20px", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
          🚨 앱 생성 중입니다! 보통 20분 ~ MVP 설계가 클수록 시간이 길어집니다. 새로고침·뒤로가기·창 닫기 시 모든 생성이 취소됩니다!
        </div>
      )}

      {/* 왼쪽: 채팅 */}
      <BuilderChat
        projectId={projectId}
        project={project}
        setProject={setProject}
        messages={messages}
        setMessages={setMessages}
        buildPhase={buildPhase}
        setBuildPhase={setBuildPhase}
        answers={answers}
        setAnswers={setAnswers}
        questionIndex={questionIndex}
        setQuestionIndex={setQuestionIndex}
        projectFeatures={projectFeatures}
        creditBalance={creditBalance}
        setCreditBalance={setCreditBalance}
        hasError={hasError}
        setHasError={setHasError}
        pendingRequests={pendingRequests}
        setPendingRequests={setPendingRequests}
        isTyping={isTyping}
        setIsTyping={setIsTyping}
        input={input}
        setInput={setInput}
        selectedModelTier={selectedModelTier}
        templateId={templateId}
        showWelcomeBack={showWelcomeBack}
        setShowWelcomeBack={setShowWelcomeBack}
        generateStep={generateStep}
        saveChatHistory={saveChatHistory}
        handleGenerate={() => setShowCostModal('generate')}
        handleDeploy={handleDeploy}
        handleDownload={handleDownload}
        handleManualSave={handleManualSave}
        saving={saving}
        lastSaved={lastSaved}
        showCostModal={showCostModal}
        setShowCostModal={setShowCostModal}
        onModifyComplete={handleModifyComplete}
        selectedElement={selectedElement}
        unsavedCount={unsavedCount}
        isSaving={isSaving}
      />

      {/* 오른쪽: 미리보기 */}
      <BuilderPreview
        projectId={projectId}
        project={project}
        setProject={setProject}
        buildPhase={buildPhase}
        messages={messages}
        setMessages={setMessages}
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        generatedFiles={generatedFiles}
        streamingFiles={streamingFiles}
        generateStep={generateStep}
        genFileCount={genFileCount}
        genTotalFiles={genTotalFiles}
        hasError={hasError}
        selectedModelTier={selectedModelTier}
        creditBalance={creditBalance}
        setCreditBalance={setCreditBalance}
        saveChatHistory={saveChatHistory}
        answers={answers}
        projectFeatures={projectFeatures}
        iframeKey={iframeKey}
        isRedeploying={isRedeploying}
        selectedElement={selectedElement}
        setSelectedElement={setSelectedElement}
        onModifyComplete={() => { handleModifyComplete(); }}
        onSendToChat={(ctx) => {
          setInput(`📍 ${ctx}\n`);
        }}
        unsavedCount={unsavedCount}
        onInlineEditSaved={() => setUnsavedCount(c => c + 1)}
        isSaving={isSaving}
        onSavingChange={setIsSaving}
        onStartTutorial={() => setShowTutorial(true)}
        isTyping={isTyping}
      />

      {/* 빌더 튜토리얼 (첫 방문 가이드) */}
      {showTutorial && (
        <BuilderTutorial onComplete={() => setShowTutorial(false)} />
      )}

      {/* 저장 완료 토스트 */}
      {showSaveToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[var(--toss-green)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg animate-bounce">
          💾 저장 완료!
        </div>
      )}

      {/* 비용 안내 모달 */}
      {showCostModal && (
        <CreditConfirmModal
          showCostModal={showCostModal}
          setShowCostModal={setShowCostModal}
          creditBalance={creditBalance}
          projectName={project?.name || ''}
          deployedUrl={project?.deployedUrl}
          onGenerate={handleGenerate}
          onDeploy={handleDeploy}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
