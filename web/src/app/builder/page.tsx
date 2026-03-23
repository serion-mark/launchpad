'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authFetch, getUser } from '@/lib/api';
import { QUESTIONNAIRES, THEME_MAP, getFeatLabel } from './constants';
import type { Question } from './constants';
import { getDemoData } from './demo-data';
// ModelSelector 제거 — Phase 11: Smart(Sonnet) 고정
type AppModelTier = 'flash' | 'smart' | 'pro';
import VersionHistory from './components/VersionHistory';
import WelcomeBack from './components/WelcomeBack';
import CodeHealthPanel from './components/CodeHealthPanel';
import LivePreview from './components/LivePreview';
import AgentPanel from './components/AgentPanel';
import VisualEditPopup from './components/VisualEditPopup';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'code' | 'preview' | 'status' | 'question';
  chips?: string[]; // 예시 답변 칩
};

type BuildPhase = 'idle' | 'questionnaire' | 'designing' | 'generating' | 'done';

type ProjectData = {
  id: string;
  name: string;
  template: string;
  theme: string;
  features: any;
  status: string;
  chatHistory: Message[] | null;
  generatedCode: any;
  projectContext?: any;
  currentVersion?: number;
  totalModifications?: number;
  modelUsed?: string;
};

// ── AI API 호출 ──────────────────────────────────────
async function callAiChat(params: {
  projectId: string;
  message: string;
  chatHistory: { role: string; content: string }[];
  template?: string;
}): Promise<{ content: string; responseType: 'question' | 'code_change' | 'explanation' }> {
  try {
    const res = await authFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.ok) return { content: `AI 응답 오류 (${res.status}). 다시 시도해주세요.`, responseType: 'explanation' };
    const data = await res.json();
    return { content: data.content, responseType: data.responseType || 'explanation' };
  } catch {
    return { content: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', responseType: 'explanation' };
  }
}

async function callAiGenerate(params: {
  projectId: string;
  chatHistory: { role: string; content: string }[];
  template: string;
}): Promise<{ architecture: any; isFreeTrial: boolean } | null> {
  try {
    const res = await authFetch('/ai/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Sprint 2: 전체 앱 생성 API ──────────────────────
async function callGenerateApp(params: {
  projectId: string;
  template: string;
  answers: Record<string, string | string[]>;
  selectedFeatures: string[];
  modelTier: 'flash' | 'smart' | 'pro';
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

// ── Sprint 3: 코드 수정 API ─────────────────────────
async function callModifyFiles(params: {
  projectId: string;
  message: string;
  modelTier: 'flash' | 'smart' | 'pro';
  targetFiles?: string[];
}): Promise<{
  modifiedFiles: { path: string; content: string }[];
  totalCredits: number;
  actualTier: string;
  fellBack: boolean;
  suggestHealthCheck?: boolean;
  totalModifications?: number;
} | null> {
  try {
    const res = await authFetch('/ai/modify-files', {
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
      <div className="flex h-screen items-center justify-center bg-[#17171c] text-[#f2f4f6]">
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
  const [project, setProject] = useState<ProjectData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [mode, setMode] = useState<'build' | 'discuss'>('build');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [tokenUsed, setTokenUsed] = useState(0); // 이번 세션 토큰 사용량
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showCostModal, setShowCostModal] = useState<'deploy' | 'download' | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [projectFeatures, setProjectFeatures] = useState<string[]>([]); // 랜딩에서 선택한 기능
  const [activeMenu, setActiveMenu] = useState<string>('dashboard'); // 미리보기 활성 메뉴
  const [showWelcomeBack, setShowWelcomeBack] = useState(false); // Sprint 3: 이어서 하기
  // ── Phase 10: Agent Mode + Visual Edits ──
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentTask, setAgentTask] = useState('');
  const [visualEditMode, setVisualEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    tagName: string;
    className: string;
    textContent: string;
    component: string | null;
    rect: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const templateId = previewTemplate || project?.template || 'beauty-salon';
  const questions = QUESTIONNAIRES[templateId] || QUESTIONNAIRES['beauty-salon'];

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
          setPreviewTemplate(data.template);
          // 랜딩에서 선택한 기능 로드
          if (data.features?.selected) {
            setProjectFeatures(data.features.selected);
          }

          if (data.chatHistory && Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
            setMessages(data.chatHistory);
            if (data.status === 'active' || data.status === 'deployed') {
              setBuildPhase('done');
              // Sprint 3: 이전 작업이 있으면 WelcomeBack 표시
              if (data.projectContext?.lastAction || data.totalModifications > 0) {
                setShowWelcomeBack(true);
              }
            } else if (data.status === 'generating') {
              setBuildPhase('generating');
            } else {
              setBuildPhase('designing');
            }
          } else {
            // 질문지 시작
            const tmpl = data.template || 'beauty-salon';
            const qs = QUESTIONNAIRES[tmpl] || QUESTIONNAIRES['beauty-salon'];
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

  // 수동 저장
  const handleManualSave = () => {
    saveChatHistory(messages, true);
  };

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => {
      saveChatHistory(messages);
    }, 30000);
    return () => clearInterval(interval);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 질문지 답변 처리 ──────────────────────────────
  const handleAnswer = (answer: string) => {
    if (buildPhase !== 'questionnaire') return;

    const currentQ = questions[questionIndex];
    const newAnswers = { ...answers, [currentQ.id]: answer };
    setAnswers(newAnswers);

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      content: answer, timestamp: new Date().toISOString(), type: 'text',
    };

    const nextIdx = questionIndex + 1;

    if (nextIdx < questions.length) {
      // 다음 질문
      const nextQ = questions[nextIdx];
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `**Q${nextIdx + 1}.** ${nextQ.question}`,
        timestamp: new Date().toISOString(), type: 'text',
        chips: nextQ.chips,
      };
      const updated = [...messages, userMsg, aiMsg];
      setMessages(updated);
      setQuestionIndex(nextIdx);
      saveChatHistory(updated);
    } else {
      // 질문지 완료 → 요약 + 자유 대화 모드
      const summary = Object.entries(newAnswers)
        .map(([k, v]) => `- **${questions.find(q => q.id === k)?.question.replace(/\?|!|뭔가요|인가요|되나요|할까요/g, '')}**: ${v}`)
        .join('\n');

      const completeMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `질문지 완료! 답변을 정리했습니다:\n\n${summary}\n\n**👉 오른쪽 미리보기에서 메뉴를 클릭해 각 화면을 체험해보세요! (무료)**\n\n수정하고 싶은 부분이 있으면 아래 채팅으로 자유롭게 말씀해주세요.\n(예: "고객 관리에 포인트 기능도 추가해줘", "색상을 좀 더 밝게")\n\n만족하시면 **"앱 생성하기"** 버튼을 누르면 AI가 실제 코드를 만들어드립니다!`,
        timestamp: new Date().toISOString(), type: 'text',
      };
      const updated = [...messages, userMsg, completeMsg];
      setMessages(updated);
      setBuildPhase('designing');
      saveChatHistory(updated);
    }
  };

  // ── 칩 클릭 (복수선택 + 직접추가 지원) ─────────────
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customChips, setCustomChips] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');

  const handleChipClick = (chip: string) => {
    const currentQ = questions[questionIndex];
    if (currentQ?.multi) {
      const newSelected = selectedChips.includes(chip)
        ? selectedChips.filter(c => c !== chip)
        : [...selectedChips, chip];
      setSelectedChips(newSelected);
    } else {
      handleAnswer(chip);
    }
  };

  const addCustomChip = () => {
    if (!customInputValue.trim()) return;
    setCustomChips(prev => [...prev, customInputValue.trim()]);
    setCustomInputValue('');
    setShowCustomInput(false);
  };

  const removeCustomChip = (chip: string) => {
    setCustomChips(prev => prev.filter(c => c !== chip));
  };

  const submitMultiChips = () => {
    const all = [...selectedChips, ...customChips];
    if (all.length > 0) {
      handleAnswer(all.join(', '));
      setSelectedChips([]);
      setCustomChips([]);
      setShowCustomInput(false);
    }
  };

  // ── 자유 대화 (AI 연동) ────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || isTyping || !projectId) return;

    // 질문지 모드에서 직접 입력
    if (buildPhase === 'questionnaire') {
      // 복수선택 중이면 입력값도 추가로 합침
      const currentQ = questions[questionIndex];
      if (currentQ?.multi && (selectedChips.length > 0 || customChips.length > 0)) {
        const all = [...selectedChips, ...customChips, input.trim()];
        handleAnswer(all.join(', '));
        setSelectedChips([]);
        setCustomChips([]);
        setInput('');
        return;
      }
      handleAnswer(input.trim());
      setInput('');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      content: input.trim(), timestamp: new Date().toISOString(), type: 'text',
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // ── Phase 11: 이미지 생성 키워드 감지 ────
    const imageKeywords = ['로고', '이미지', '아이콘', '배너', '그림', '일러스트', '사진'];
    const isImageRequest = imageKeywords.some(kw => userMsg.content.includes(kw)) &&
      ['만들어', '생성', '그려', '디자인'].some(kw => userMsg.content.includes(kw));

    if (isImageRequest) {
      try {
        const imgRes = await authFetch('/ai/generate-image', {
          method: 'POST',
          body: JSON.stringify({ prompt: userMsg.content, projectId }),
        });
        const imgData = await imgRes.json();
        const imgMsg: Message = {
          id: `img-${Date.now()}`, role: 'assistant',
          content: imgData.imageUrl
            ? `🎨 **이미지 생성 완료!**\n\n![생성된 이미지](${imgData.imageUrl})\n\n[다시 생성하려면 "다시 만들어줘"라고 입력하세요]`
            : `이미지 생성에 실패했습니다: ${imgData.message || '알 수 없는 오류'}`,
          timestamp: new Date().toISOString(), type: 'text',
        };
        setMessages(prev => [...prev, imgMsg]);
        setIsTyping(false);
        return;
      } catch (e: any) {
        const errMsg: Message = {
          id: `img-err-${Date.now()}`, role: 'assistant',
          content: `이미지 생성 오류: ${e.message}`, timestamp: new Date().toISOString(), type: 'text',
        };
        setMessages(prev => [...prev, errMsg]);
        setIsTyping(false);
        return;
      }
    }

    // ── Sprint 3: done 상태에서는 코드 수정 API 호출 ────
    if (buildPhase === 'done' && projectId) {
      const modifyResult = await callModifyFiles({
        projectId,
        message: userMsg.content,
        modelTier: selectedModelTier,
      });

      // 크레딧 잔액 새로고침
      authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
        if (d) setCreditBalance(d.balance);
      }).catch(() => {});

      if (modifyResult) {
        const paths = modifyResult.modifiedFiles.map(f => f.path).join(', ');
        let replyContent = `✅ **코드 수정 완료!**\n\n`;
        replyContent += `수정된 파일 (${modifyResult.modifiedFiles.length}개): ${paths}\n`;
        if (modifyResult.totalCredits > 0) replyContent += `사용 크레딧: ${modifyResult.totalCredits} cr\n`;
        if (modifyResult.fellBack) replyContent += `⚠️ Flash 모델로 자동 전환됨\n`;
        if (modifyResult.suggestHealthCheck) {
          replyContent += `\n🩺 **코드 건강 검진을 권장합니다!** (${modifyResult.totalModifications}회 수정)\n왼쪽 패널의 "코드 헬스체크"를 실행해보세요.\n`;
        }
        replyContent += `\n추가 수정이 필요하면 말씀해주세요!`;

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(), role: 'assistant',
          content: replyContent, timestamp: new Date().toISOString(), type: 'text',
        };
        const updatedMessages = [...newMessages, aiMsg];
        setMessages(updatedMessages);
        setIsTyping(false);
        saveChatHistory(updatedMessages);
      } else {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(), role: 'assistant',
          content: '수정에 실패했습니다. 크레딧을 확인하고 다시 시도해주세요.',
          timestamp: new Date().toISOString(), type: 'text',
        };
        setMessages([...newMessages, aiMsg]);
        setIsTyping(false);
      }
      return;
    }

    // ── designing 상태: AI 채팅 ─────────────────────────
    const chatHistory = newMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const aiResult = await callAiChat({
      projectId,
      message: userMsg.content,
      chatHistory: chatHistory.slice(-10),
      template: templateId,
    });

    // 크레딧 잔액 다시 조회
    authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setCreditBalance(d.balance);
    }).catch(() => {});

    // 토큰 사용량 추정 (메시지 길이 기반)
    const estimatedTokens = Math.ceil((userMsg.content.length + aiResult.content.length) / 3);
    setTokenUsed(prev => prev + estimatedTokens);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(), role: 'assistant',
      content: aiResult.content, timestamp: new Date().toISOString(),
      type: aiResult.responseType === 'question' ? 'question' : 'text',
    };
    const updatedMessages = [...newMessages, aiMsg];
    setMessages(updatedMessages);
    setIsTyping(false);
    saveChatHistory(updatedMessages);

    // code_change 응답 → done 상태에서 자동 수정 트리거
    if (aiResult.responseType === 'code_change' && buildPhase === 'done' && projectId) {
      callModifyFiles({
        projectId,
        message: userMsg.content,
        modelTier: selectedModelTier,
      });
    }
  };

  // ── 앱 생성 (F7: SSE 스트리밍 파이프라인) ────────────
  const [generateProgress, setGenerateProgress] = useState<string[]>([]);
  const [generateStep, setGenerateStep] = useState<string>('');
  const [genFileCount, setGenFileCount] = useState(0);
  const [genTotalFiles, setGenTotalFiles] = useState(0);
  const [genStartTime, setGenStartTime] = useState(0);
  // 실시간 미리보기: SSE에서 생성된 파일을 즉시 LivePreview에 전달
  const [streamingFiles, setStreamingFiles] = useState<{ path: string; content: string }[]>([]);

  const handleGenerate = async () => {
    if (!projectId) return;
    setBuildPhase('generating');
    setGenerateProgress([]);
    setGenerateStep('');
    setGenFileCount(0);
    setGenTotalFiles(0);
    setGenStartTime(Date.now());
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
      // F7: SSE 스트리밍으로 앱 생성
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
        // SSE 실패 시 기존 API로 폴백
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
          setBuildPhase('designing');
          setMessages(prev => [...prev, {
            id: Date.now().toString(), role: 'assistant',
            content: '크레딧이 부족하거나 생성에 실패했습니다.\n\n[크레딧 충전하기 →](/credits)',
            timestamp: new Date().toISOString(), type: 'text',
          }]);
        }
        return;
      }

      // SSE 스트림 읽기
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

              // 실시간 미리보기: SSE에서 생성된 파일을 LivePreview에 즉시 반영
              if (data.generatedFiles && Array.isArray(data.generatedFiles)) {
                setStreamingFiles(prev => {
                  const updated = [...prev];
                  for (const newFile of data.generatedFiles) {
                    const idx = updated.findIndex(f => f.path === newFile.path);
                    if (idx >= 0) {
                      updated[idx] = newFile;
                    } else {
                      updated.push(newFile);
                    }
                  }
                  return updated;
                });
              }

              // 상태 메시지 업데이트
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
              setBuildPhase('designing');
              setMessages(prev => [...prev, {
                id: Date.now().toString(), role: 'assistant',
                content: `생성 실패: ${data.message}\n\n다시 시도해주세요.`,
                timestamp: new Date().toISOString(), type: 'text',
              }]);
            }
          } catch { /* JSON 파싱 실패 무시 */ }
        }
      }
    } catch {
      setBuildPhase('designing');
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString(), type: 'text',
      }]);
    }
  };

  /** 앱 생성 완료 처리 (SSE/폴백 공용) */
  const handleGenerateComplete = (result: any) => {
    // 크레딧 잔액 새로고침
    authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setCreditBalance(d.balance);
    }).catch(() => {});

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

    completionMsg += `🤖 **AI 품질 평가:** ${assess.confidence}점/100점\n`;
    if (assess.incompleteFeatures.length > 0) {
      completionMsg += `\n⚠️ **추가 작업 필요:**\n`;
      completionMsg += assess.incompleteFeatures.map((f: string) => `  - ${f}`).join('\n') + '\n';
    }
    completionMsg += `\n수정이 필요하면 채팅으로 말씀해주세요.\n`;
    completionMsg += `완료되면 **"다운로드"** 또는 **"배포"** 버튼을 이용하세요!`;

    setMessages(prev => {
      const final = [...prev, {
        id: Date.now().toString(), role: 'assistant' as const,
        content: completionMsg,
        timestamp: new Date().toISOString(), type: 'text' as const,
      }];
      saveChatHistory(final);
      return final;
    });
  };

  const handleDeploy = async () => {
    if (!projectId) return;
    try {
      const res = await authFetch(`/projects/${projectId}/deploy`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();

      // 즉시 응답: 빌드 시작 알림
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `빌드를 시작합니다...\n\n**서브도메인**: ${data.subdomain}\n**URL**: ${data.deployedUrl}\n\n빌드 진행 중... (약 2~5분 소요)`,
        timestamp: new Date().toISOString(), type: 'text',
      }]);

      // 빌드 상태 폴링 (3초 간격, 최대 5분)
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
          // building/exporting/fixing 상태면 계속 폴링
        } catch { /* 네트워크 에러 시 계속 폴링 */ }
      }

      // 타임아웃
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: '빌드 시간이 초과되었습니다. 잠시 후 대시보드에서 확인해주세요.',
        timestamp: new Date().toISOString(), type: 'text',
      }]);
    } catch { /* */ }
  };

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

  // ── 질문 되돌아가기 ─────────────────────────────────
  const handleGoBack = () => {
    if (questionIndex <= 0 || buildPhase !== 'questionnaire') return;
    // 마지막 2개 메시지 제거 (유저 답변 + AI 질문)
    setMessages(prev => prev.slice(0, -2));
    const prevIdx = questionIndex - 1;
    setQuestionIndex(prevIdx);
    // 이전 답변도 삭제
    const prevQ = questions[prevIdx];
    setAnswers(prev => { const n = { ...prev }; delete n[prevQ.id]; return n; });
    setSelectedChips([]);
    setCustomChips([]);
  };

  // ── 테마/라벨/데모데이터 (분리된 모듈에서 가져옴) ────
  const tm = THEME_MAP[project?.theme || 'basic-light'] || THEME_MAP['basic-light'];
  const industry = answers.industry || '';
  const FEAT_LABEL = getFeatLabel(templateId, industry);
  const demoData = getDemoData(templateId, industry);
  const { names: demoNames, services: demoServices, staffTitle: demoStaffTitle, staffNames: demoStaffNames } = demoData;

  // 업종별 부울 플래그 (미리보기 콘텐츠 생성용)
  const isBeauty = templateId === 'beauty-salon';
  const isCommerce = templateId === 'ecommerce';
  const isO2O = templateId === 'o2o-matching';
  const isEdutech = templateId === 'edutech';
  const isFacility = templateId === 'facility-mgmt';
  const isClinic = industry.includes('병원') || industry.includes('클리닉');
  const isFitness = industry.includes('피트니스') || industry.includes('요가') || industry.includes('헬스');
  const isEdu = isEdutech || industry.includes('학원') || industry.includes('교육');

  // 모델 선택 상태
  const selectedModelTier: AppModelTier = 'smart'; // Phase 11: Smart 고정

  // ── 메뉴별 화면 콘텐츠 생성 ──────────────────────────
  const generatePageContent = (menuId: string, accent: string): string => {
    const pages: Record<string, string> = {
      dashboard: `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:700;color:#1e293b">대시보드</h2>
        <span style="background:${accent};color:white;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:600">관리자</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">${isFacility ? '오늘 민원' : isO2O ? '오늘 매칭' : isEdutech ? '활성 수강생' : isEdu ? '이번 달 수강료' : isCommerce ? '오늘 주문' : '오늘 매출'}</div><div style="font-size:22px;font-weight:700;color:${accent}">${isFacility ? '7건' : isO2O ? '23건' : isEdutech ? '248명' : isEdu ? '₩4,200,000' : isCommerce ? '34건' : '₩1,280,000'}</div></div>
        <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">${isFacility ? '처리 완료' : isO2O ? '완료율' : isEdutech ? '오늘 수업' : isEdu ? '오늘 수업' : isFitness ? '오늘 클래스' : isCommerce ? '오늘 매출' : '오늘 예약'}</div><div style="font-size:22px;font-weight:700">${isFacility ? '5건' : isO2O ? '87%' : isEdutech ? '8강' : isEdu ? '8강' : isCommerce ? '₩2,340,000' : '12건'}</div></div>
        <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">${isFacility ? '미처리' : isO2O ? '신규 제공자' : isEdutech ? '수료율' : isEdu ? '신규 등록' : isCommerce ? '신규 가입' : '신규 고객'}</div><div style="font-size:22px;font-weight:700;color:${isFacility ? '#f43f5e' : '#16a34a'}">${isFacility ? '2건' : isO2O ? '+5명' : isEdutech ? '67%' : '+3명'}</div></div>
      </div>
      <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px">${isFacility ? '최근 민원' : isO2O ? '최근 매칭' : isEdutech ? '오늘 수업' : isEdu ? '오늘 수업 일정' : isCommerce ? '최근 주문' : '오늘 일정'}</div>
        <div style="font-size:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span><b style="color:${accent}">10:00</b> ${demoNames[0]} · ${demoServices[0]}</span><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:10px">확정</span></div>
        <div style="font-size:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span><b style="color:${accent}">11:30</b> ${demoNames[1]} · ${demoServices[1]}</span><span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:10px;font-size:10px">진행중</span></div>
        <div style="font-size:12px;padding:10px 0;display:flex;justify-content:space-between"><span><b style="color:${accent}">14:00</b> ${demoNames[2]} · ${demoServices[2]}</span><span style="background:#fef9c3;color:#ca8a04;padding:2px 8px;border-radius:10px;font-size:10px">대기</span></div>
      </div>`,
      reservation: `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:700;color:#1e293b">${FEAT_LABEL['reservation'] || '📅 예약'} 관리</h2>
        <button style="background:${accent};color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">+ 새 ${isEdu ? '수강' : '예약'}</button>
      </div>
      <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="display:grid;grid-template-columns:60px 1fr 1fr 80px;padding:10px 16px;background:#f8fafc;font-size:11px;color:#64748b;font-weight:600">
          <div>시간</div><div>${isEdu ? '학생' : isClinic ? '환자' : '고객'}</div><div>${isEdu ? '과목' : '서비스'}</div><div>상태</div>
        </div>
        <div style="display:grid;grid-template-columns:60px 1fr 1fr 80px;padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;align-items:center">
          <div style="font-weight:700;color:${accent}">09:00</div><div>${demoNames[0]}</div><div>${demoServices[0]}</div><div><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:10px">확정</span></div>
        </div>
        <div style="display:grid;grid-template-columns:60px 1fr 1fr 80px;padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;align-items:center">
          <div style="font-weight:700;color:${accent}">10:30</div><div>${demoNames[1]}</div><div>${demoServices[1]}</div><div><span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:10px;font-size:10px">진행중</span></div>
        </div>
        <div style="display:grid;grid-template-columns:60px 1fr 1fr 80px;padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;align-items:center">
          <div style="font-weight:700;color:${accent}">11:00</div><div>${demoNames[2]}</div><div>${demoServices[2]}</div><div><span style="background:#fef9c3;color:#ca8a04;padding:2px 8px;border-radius:10px;font-size:10px">대기</span></div>
        </div>
        <div style="display:grid;grid-template-columns:60px 1fr 1fr 80px;padding:12px 16px;font-size:12px;align-items:center">
          <div style="font-weight:700;color:${accent}">14:00</div><div>${demoNames[3]}</div><div>${demoServices[3]}</div><div><span style="background:#f3e8ff;color:#9333ea;padding:2px 8px;border-radius:10px;font-size:10px">예정</span></div>
        </div>
      </div>`,
      customer: `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:700;color:#1e293b">${FEAT_LABEL['customer'] || '👥 고객'}</h2>
        <div style="display:flex;gap:8px">
          <input style="border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:12px;width:200px" placeholder="${isEdu ? '학생' : '고객'} 검색..." />
          <button style="background:${accent};color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">+ ${isEdu ? '학생' : '고객'} 등록</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        ${demoNames.map((n, i) => `<div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="width:36px;height:36px;border-radius:50%;background:${[accent+'20','#f43f5e20','#16a34a20','#d9770620'][i]};display:flex;align-items:center;justify-content:center;font-size:14px">${n[0]}</div><div><div style="font-size:13px;font-weight:600">${n}</div><div style="font-size:11px;color:#94a3b8">010-${1234+i*1111}-${5678-i*1111}</div></div></div>
          <div style="font-size:11px;color:#64748b">${isEdu ? `수강 ${[3,2,1,4][i]}과목` : `방문 ${[12,8,3,5][i]}회`} · ${['VIP','일반','신규','일반'][i]}</div>
        </div>`).join('')}
      </div>`,
      sales: `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:700;color:#1e293b">💰 ${isEdu ? '수강료' : '매출'} 관리</h2>
        <span style="font-size:12px;color:#64748b">2026년 3월</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        <div style="background:white;padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">오늘</div><div style="font-size:16px;font-weight:700;color:${accent}">₩1,280,000</div></div>
        <div style="background:white;padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">이번 주</div><div style="font-size:16px;font-weight:700">₩5,420,000</div></div>
        <div style="background:white;padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">이번 달</div><div style="font-size:16px;font-weight:700">₩18,750,000</div></div>
        <div style="background:white;padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">전월 대비</div><div style="font-size:16px;font-weight:700;color:#16a34a">+12%</div></div>
      </div>
      <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px">최근 ${isEdu ? '수납' : '결제'}</div>
        ${demoNames.slice(0,3).map((n,i) => `<div style="font-size:12px;padding:10px 0;${i<2?'border-bottom:1px solid #f1f5f9;':''}display:flex;justify-content:space-between"><span>${n} · ${demoServices[i]}</span><span style="font-weight:700">₩${['85,000','350,000','120,000'][i]}</span></div>`).join('')}
      </div>`,
      staff: `<div style="margin-bottom:16px"><h2 style="font-size:18px;font-weight:700;color:#1e293b">${FEAT_LABEL['staff'] || '👤 스태프'} 관리</h2></div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        ${demoStaffNames.map((n, i) => `<div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:40px;height:40px;border-radius:50%;background:${i===0?accent:'#f43f5e'};display:flex;align-items:center;justify-content:center;color:white;font-weight:700">${n[0]}</div><div><div style="font-size:14px;font-weight:600">${n}</div><div style="font-size:11px;color:${i===0?accent:'#f43f5e'}">${i===0?(isBeauty?'원장':isEdu?'수석강사':'팀장'):(isBeauty?'시니어':isEdu?'강사':'담당자')}</div></div></div>
          <div style="font-size:11px;color:#64748b">오늘 ${isEdu?'수업':'예약'} ${5-i}건 · 매출 ₩${i===0?'680,000':'520,000'}</div>
          <div style="margin-top:8px;height:4px;background:#f1f5f9;border-radius:2px"><div style="height:100%;width:${75-i*15}%;background:${i===0?accent:'#f43f5e'};border-radius:2px"></div></div>
        </div>`).join('')}
      </div>`,
      'online-booking': `<div style="margin-bottom:16px"><h2 style="font-size:18px;font-weight:700;color:#1e293b">🌐 온라인 예약</h2></div>
      <div style="background:white;padding:20px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);max-width:360px;margin:0 auto">
        <div style="text-align:center;margin-bottom:16px"><div style="font-size:16px;font-weight:700;color:#1e293b">예약하기</div><div style="font-size:12px;color:#94a3b8">원하시는 날짜와 시간을 선택하세요</div></div>
        <div style="margin-bottom:12px"><div style="font-size:11px;color:#64748b;margin-bottom:4px">날짜 선택</div><div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:13px">📅 2026년 3월 20일 (금)</div></div>
        <div style="margin-bottom:12px"><div style="font-size:11px;color:#64748b;margin-bottom:4px">시간 선택</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${['09:00','10:00','11:00','14:00','15:00','16:00'].map((t,i) => `<div style="border:1px solid ${i===1?accent:'#e2e8f0'};border-radius:8px;padding:8px;text-align:center;font-size:12px;${i===1?`background:${accent}15;color:${accent};font-weight:600`:''};cursor:pointer">${t}</div>`).join('')}</div></div>
        <button style="width:100%;background:${accent};color:white;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">예약 확인</button>
      </div>`,
      alimtalk: `<div style="margin-bottom:16px"><h2 style="font-size:18px;font-weight:700;color:#1e293b">💬 알림톡</h2></div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
        <div style="background:white;padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">오늘 발송</div><div style="font-size:20px;font-weight:700;color:${accent}">23건</div></div>
        <div style="background:white;padding:14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:10px;color:#64748b">성공률</div><div style="font-size:20px;font-weight:700;color:#16a34a">98%</div></div>
      </div>
      <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px">최근 발송</div>
        <div style="font-size:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span>김지현 · 예약 확인</span><span style="color:#16a34a">✓ 성공</span></div>
        <div style="font-size:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between"><span>이서윤 · 리마인더</span><span style="color:#16a34a">✓ 성공</span></div>
        <div style="font-size:12px;padding:10px 0;display:flex;justify-content:space-between"><span>박민준 · 부재중 안내</span><span style="color:#16a34a">✓ 성공</span></div>
      </div>`,
      settlement: `<div style="margin-bottom:16px"><h2 style="font-size:18px;font-weight:700;color:#1e293b">📋 정산</h2></div>
      <div style="background:white;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px">스태프별 정산 (3월)</div>
        <div style="display:grid;grid-template-columns:1fr 100px 100px 80px;padding:8px 0;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0"><div>스태프</div><div>매출</div><div>인센티브</div><div>지급액</div></div>
        <div style="display:grid;grid-template-columns:1fr 100px 100px 80px;padding:10px 0;font-size:12px;border-bottom:1px solid #f1f5f9"><div style="font-weight:600">정원장</div><div>₩8,200,000</div><div>40%</div><div style="font-weight:700;color:${accent}">₩3,280,000</div></div>
        <div style="display:grid;grid-template-columns:1fr 100px 100px 80px;padding:10px 0;font-size:12px"><div style="font-weight:600">김디자이너</div><div>₩5,600,000</div><div>35%</div><div style="font-weight:700;color:${accent}">₩1,960,000</div></div>
      </div>`,
    };
    // booking은 reservation과 동일
    pages['booking'] = pages['reservation'];
    pages['notification'] = pages['alimtalk'];
    pages['admin-dashboard'] = pages['dashboard'];
    pages['payment'] = pages['sales'];
    // 기타 메뉴 기본 화면
    return pages[menuId] || `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;color:#94a3b8">
      <div style="font-size:48px;margin-bottom:16px">${FEAT_LABEL[menuId]?.slice(0,2) || '📄'}</div>
      <div style="font-size:16px;font-weight:600;color:#1e293b">${FEAT_LABEL[menuId]?.slice(3) || menuId}</div>
      <div style="font-size:12px;margin-top:4px">이 기능이 앱에 포함됩니다</div>
    </div>`;
  };

  // ── 인터랙티브 미리보기 HTML 생성 ─────────────────────
  const generateDynamicPreview = (): string => {
    const name = answers.biz_name || project?.name || '내 서비스';
    const allFeatureIds = projectFeatures.length > 0 ? projectFeatures : [];
    const answerFeatures = (answers.features || '').split(', ').filter(Boolean);
    const featureNames = answerFeatures.length > 0 ? answerFeatures :
      allFeatureIds.map(id => FEAT_LABEL[id]?.replace(/^.{2}/, '') || id);
    const icon = templateId === 'beauty-salon' ? '✂️' : templateId === 'ecommerce' ? '🛍' : '📅';
    const sub = templateId === 'beauty-salon' ? (answers.target || '') + ' · ' + (answers.staff || '') :
                templateId === 'ecommerce' ? (answers.product || '상품') + ' 전문' :
                (answers.industry || '예약') + ' · ' + (answers.booking_type || '');

    // 메뉴 목록: dashboard + 선택된 기능
    const menuItems = ['dashboard', ...allFeatureIds.filter(id => id !== 'dashboard')];
    const pageContent = generatePageContent(activeMenu, tm.accent);

    // ── PC: 사이드바 + 메인 (클릭 가능) ──────────────
    if (previewMode === 'desktop') {
      const sideMenu = menuItems.map(id =>
        `<div onclick="parent.postMessage({type:'menu',id:'${id}'},'*')" style="padding:10px 16px;font-size:12px;cursor:pointer;border-radius:8px;margin:2px 8px;transition:all .15s;${activeMenu === id ? `background:${tm.accent};color:white;font-weight:600` : 'color:#64748b'}" onmouseover="if('${activeMenu}'!=='${id}')this.style.background='#f1f5f9'" onmouseout="if('${activeMenu}'!=='${id}')this.style.background='transparent'">${FEAT_LABEL[id] || id}</div>`
      ).join('');

      return `<div style="font-family:system-ui;display:flex;min-height:100vh;background:#f1f5f9">
        <div style="width:200px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;flex-shrink:0">
          <div style="padding:16px;border-bottom:1px solid #e2e8f0">
            <div style="font-size:15px;font-weight:800;color:#1e293b">${icon} ${name}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px">${sub}</div>
          </div>
          <div style="padding:8px 0;flex:1;overflow-y:auto">${sideMenu || '<div style="padding:16px;font-size:11px;color:#94a3b8">질문에 답하면<br/>메뉴가 추가됩니다</div>'}</div>
          <div style="padding:12px 16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8">Powered by Foundry</div>
        </div>
        <div style="flex:1;padding:20px;overflow-y:auto">${pageContent}</div>
      </div>`;
    }

    // ── 모바일: 헤더 + 콘텐츠 + 하단 탭 바 (클릭 가능) ──
    const bottomTabs = menuItems.slice(0, 5).map(id =>
      `<div onclick="parent.postMessage({type:'menu',id:'${id}'},'*')" style="flex:1;text-align:center;padding:8px 2px;font-size:10px;cursor:pointer;transition:all .15s;${activeMenu === id ? `color:${tm.accent};font-weight:700` : 'color:#94a3b8'}">${FEAT_LABEL[id] || id}</div>`
    ).join('');

    // 모바일용 간소화 콘텐츠
    const mobileContent = generatePageContent(activeMenu, tm.accent)
      .replace(/grid-template-columns:repeat\(3,1fr\)/g, 'grid-template-columns:repeat(2,1fr)')
      .replace(/grid-template-columns:repeat\(4,1fr\)/g, 'grid-template-columns:repeat(2,1fr)')
      .replace(/font-size:18px/g, 'font-size:16px')
      .replace(/font-size:22px/g, 'font-size:18px');

    return `<div style="font-family:system-ui;background:#f8fafc;min-height:100vh;display:flex;flex-direction:column">
      <div style="background:${tm.grad};padding:20px 16px;color:white">
        <h1 style="font-size:18px;font-weight:800;margin-bottom:2px">${icon} ${name}</h1>
        <p style="font-size:11px;opacity:.8">${sub}</p>
      </div>
      <div style="flex:1;padding:14px;overflow-y:auto">${mobileContent}</div>
      ${bottomTabs ? `<div style="border-top:1px solid #e2e8f0;display:flex;padding:4px 8px;background:white;position:sticky;bottom:0">${bottomTabs}</div>` : ''}
    </div>`;
  };

  // iframe → 부모 메뉴 클릭 이벤트 수신
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'menu') setActiveMenu(e.data.id);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const previewHtml = generateDynamicPreview();

  // 현재 질문의 칩 (마지막 assistant 메시지)
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.chips);
  const currentChips = buildPhase === 'questionnaire' ? lastAssistantMsg?.chips || [] : [];
  const currentQ = buildPhase === 'questionnaire' ? questions[questionIndex] : null;

  // 생성된 코드 파일 추출 (LivePreview용)
  // generating 중에는 streamingFiles, 완료 후에는 project.generatedCode 사용
  const generatedFiles = useMemo(() => {
    if (buildPhase === 'generating' && streamingFiles.length > 0) {
      return streamingFiles;
    }
    if (!project?.generatedCode || !Array.isArray(project.generatedCode)) return [];
    return project.generatedCode as { path: string; content: string }[];
  }, [project?.generatedCode, streamingFiles, buildPhase]);

  // 실시간 미리보기에서 페이지 네비게이션 + Visual Edit 클릭 수신
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'navigate') {
        // LivePreview 내부에서 처리됨
      }
      if (e.data?.type === 'element-clicked' && visualEditMode) {
        setSelectedElement(e.data.element);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [visualEditMode]);

  // generating 중 streamingFiles가 있으면 미리보기 표시
  const showLivePreview = (buildPhase === 'done' && generatedFiles.length > 0) || (buildPhase === 'generating' && streamingFiles.length > 0);

  // 레이아웃: done 시 Lovable처럼 미리보기 중심 (왼쪽 채팅 좁게 + 오른쪽 미리보기 넓게)
  const isPreviewFocused = showLivePreview || buildPhase === 'generating';

  return (
    <div className="flex h-screen bg-[#0f0f14] text-[#f2f4f6]">
      {/* ── 왼쪽: 채팅 패널 ──────────────────────── */}
      <div className={`flex flex-col transition-all duration-500 ease-in-out ${isPreviewFocused ? 'w-[380px] min-w-[380px]' : 'flex-1'}`}>
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-[#1e1e28] bg-[#13131a] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <a href="/dashboard"><img src="/logo.svg" alt="Foundry" className="h-5 opacity-80 hover:opacity-100 transition-opacity" /></a>
            {project && (
              <span className="max-w-[120px] truncate rounded-md bg-[#1e1e28] px-2 py-1 text-[11px] text-[#8b95a1]">{project.name}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Phase 11: 모델선택 제거, Smart 고정 */}
            {creditBalance !== null && (
              <a href="/credits" className="flex items-center gap-1 rounded-md bg-[#1e1e28] px-2 py-1 text-[11px] font-medium text-[#ffd60a] hover:bg-[#282835] transition-colors">
                <span>⚡</span><span>{creditBalance.toLocaleString()}</span>
              </a>
            )}
            <button onClick={handleManualSave} className="rounded-md bg-[#1e1e28] px-2 py-1 text-[11px] text-[#6b7684] hover:text-[#f2f4f6] transition-colors">
              {saving ? '저장중' : lastSaved ? `${lastSaved}` : '저장'}
            </button>
          </div>
        </header>

        {/* 상태 바 */}
        <div className="flex items-center justify-between border-b border-[#1e1e28] bg-[#13131a]/80 px-4 py-2">
          <div className="flex items-center gap-2">
            {buildPhase === 'questionnaire' && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {questions.map((_, i) => (
                    <div key={i} className={`h-1 w-4 rounded-full transition-colors ${i <= questionIndex ? 'bg-[#a855f7]' : 'bg-[#2c2c35]'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-[#a855f7] font-medium">{questionIndex + 1}/{questions.length}</span>
              </div>
            )}
            {buildPhase === 'designing' && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#3182f6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3182f6] animate-pulse" />설계 중
              </span>
            )}
            {buildPhase === 'done' && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#30d158]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#30d158]" />생성 완료
              </span>
            )}
            {buildPhase === 'generating' && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#ffd60a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffd60a] animate-pulse" />생성 중{generateStep ? ` — ${generateStep}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {buildPhase !== 'questionnaire' && (
              <div className="flex rounded-md bg-[#1e1e28] p-0.5">
                <button onClick={() => setMode('build')} className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors ${mode === 'build' ? 'bg-[#3182f6] text-white' : 'text-[#6b7684]'}`}>빌드</button>
                <button onClick={() => setMode('discuss')} className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors ${mode === 'discuss' ? 'bg-[#a855f7] text-white' : 'text-[#6b7684]'}`}>토론</button>
              </div>
            )}
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3 max-w-none">
            {/* Sprint 3: 이어서 하기 카드 */}
            {showWelcomeBack && project && (
              <WelcomeBack
                projectName={project.name}
                context={project.projectContext as any}
                currentVersion={(project as any).currentVersion || 1}
                totalModifications={(project as any).totalModifications || 0}
                onContinue={() => setShowWelcomeBack(false)}
                onStartFresh={() => {
                  setShowWelcomeBack(false);
                  setBuildPhase('questionnaire');
                  setQuestionIndex(0);
                  setAnswers({});
                  const tmpl = project.template || 'beauty-salon';
                  const qs = QUESTIONNAIRES[tmpl] || QUESTIONNAIRES['beauty-salon'];
                  setMessages([{
                    id: '1', role: 'assistant',
                    content: `**${project.name}** 프로젝트를 처음부터 다시 만들어볼게요!\n\n몇 가지 질문에 답해주시면 맞춤 앱을 설계해드립니다.`,
                    timestamp: new Date().toISOString(), type: 'text',
                  }, {
                    id: '2', role: 'assistant',
                    content: `**Q1.** ${qs[0].question}`,
                    timestamp: new Date().toISOString(), type: 'text',
                    chips: qs[0].chips,
                  }]);
                }}
              />
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3182f6] to-[#a855f7] text-[10px]">F</div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                  msg.role === 'user' ? 'bg-[#3182f6] text-white'
                    : msg.type === 'status' ? 'bg-[#1e1e28] text-[#6b7684] text-xs py-2'
                    : 'bg-[#1a1a24] border border-[#1e1e28] text-[#e5e7eb]'
                }`}>
                  {msg.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) return <div key={i} className="font-bold mt-2 mb-1">{line.replace(/\*\*/g, '')}</div>;
                    if (line.startsWith('- **')) {
                      const parts = line.match(/- \*\*(.+?)\*\*: (.+)/);
                      if (parts) return <div key={i} className="ml-2"><span className="font-semibold">{parts[1]}:</span> {parts[2]}</div>;
                    }
                    if (line.startsWith('- ')) return <div key={i} className="ml-2">• {line.slice(2)}</div>;
                    if (line.trim() === '') return <div key={i} className="h-2" />;
                    return <div key={i}>{line}</div>;
                  })}
                </div>
              </div>
            ))}

            {/* 예시 답변 칩 */}
            {currentChips.length > 0 && !isTyping && (
              <div className="space-y-2 pl-2">
                {/* 되돌아가기 버튼 */}
                {questionIndex > 0 && (
                  <button
                    onClick={handleGoBack}
                    className="rounded-lg border border-[#2c2c35] px-3 py-1.5 text-xs text-[#8b95a1] hover:text-[#f2f4f6] hover:border-[#3a3a45] transition-colors"
                  >
                    ← 이전 질문
                  </button>
                )}
                <div className="flex flex-wrap gap-2">
                  {currentChips.map(chip => (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                        selectedChips.includes(chip)
                          ? 'border-[#3182f6] bg-[#3182f6]/20 text-[#3182f6]'
                          : 'border-[#2c2c35] bg-[#2c2c35] text-[#f2f4f6] hover:border-[#3182f6] hover:bg-[#3182f6]/10'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                  {/* 직접 추가 버튼 */}
                  {currentQ?.multi && !showCustomInput && (
                    <button
                      onClick={() => setShowCustomInput(true)}
                      className="rounded-xl border border-dashed border-[#4e5968] px-4 py-2 text-sm text-[#8b95a1] hover:border-[#3182f6] hover:text-[#3182f6] transition-colors"
                    >
                      + 직접 추가
                    </button>
                  )}
                </div>
                {/* 직접 추가 입력 */}
                {showCustomInput && (
                  <div className="flex gap-2">
                    <input
                      value={customInputValue}
                      onChange={e => setCustomInputValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomChip()}
                      placeholder="추가할 항목 입력..."
                      className="flex-1 rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-4 py-2 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:border-[#3182f6]"
                      autoFocus
                    />
                    <button onClick={addCustomChip} className="rounded-xl bg-[#3182f6] px-4 py-2 text-sm font-bold text-white">추가</button>
                    <button onClick={() => setShowCustomInput(false)} className="rounded-xl bg-[#2c2c35] px-3 py-2 text-sm text-[#8b95a1]">취소</button>
                  </div>
                )}
                {/* 직접 추가된 칩들 */}
                {customChips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customChips.map(chip => (
                      <span key={chip} className="flex items-center gap-1.5 rounded-xl border border-[#30d158] bg-[#30d158]/15 px-3 py-1.5 text-sm text-[#30d158]">
                        {chip}
                        <button onClick={() => removeCustomChip(chip)} className="text-xs opacity-60 hover:opacity-100">✕</button>
                      </span>
                    ))}
                  </div>
                )}
                {/* 선택 완료 버튼 */}
                {currentQ?.multi && (selectedChips.length > 0 || customChips.length > 0) && (
                  <button
                    onClick={submitMultiChips}
                    className="rounded-xl bg-[#3182f6] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors"
                  >
                    선택 완료 ({selectedChips.length + customChips.length}개)
                  </button>
                )}
              </div>
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[#1b1b21] border border-[#2c2c35] px-5 py-3.5">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[#6b7684]" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[#6b7684]" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[#6b7684]" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Agent Mode 패널 */}
        {isAgentRunning && projectId && (
          <div className="px-4 py-2">
            <AgentPanel
              projectId={projectId}
              task={agentTask}
              onComplete={(modifiedFiles) => {
                setIsAgentRunning(false);
                if (project) {
                  setProject({ ...project, generatedCode: modifiedFiles });
                }
              }}
              onCancel={() => setIsAgentRunning(false)}
            />
          </div>
        )}

        {/* 액션 버튼 (생성/배포/다운로드) */}
        {(buildPhase === 'designing' || buildPhase === 'done') && (
          <div className="border-t border-[#1e1e28] bg-[#13131a] px-4 py-2.5">
            <div className="flex gap-2">
              {buildPhase === 'designing' && (
                <button onClick={handleGenerate} className="flex-1 rounded-xl bg-gradient-to-r from-[#30d158] to-[#28c840] px-4 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-[#30d158]/20 transition-all">
                  앱 생성하기
                </button>
              )}
              {buildPhase === 'done' && (
                <>
                  <button onClick={() => setShowCostModal('deploy')} className="flex-1 rounded-xl bg-gradient-to-r from-[#3182f6] to-[#2563eb] px-3 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-[#3182f6]/20 transition-all">배포</button>
                  <button onClick={() => setShowCostModal('download')} className="flex-1 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#9333ea] px-3 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-[#a855f7]/20 transition-all">다운로드</button>
                  <button
                    onClick={async () => {
                      if (!projectId) return;
                      try {
                        const res = await authFetch(`/projects/${projectId}/github/push`, { method: 'POST' });
                        if (res.ok) {
                          const data = await res.json();
                          window.open(data.repoUrl, '_blank');
                        } else {
                          const err = await res.json();
                          if (err.message?.includes('GitHub 연결')) {
                            window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/github`;
                          } else {
                            alert(err.message || 'GitHub push 실패');
                          }
                        }
                      } catch { alert('GitHub 연결 오류'); }
                    }}
                    className="rounded-xl bg-[#24292e] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#1b1f23] transition-all"
                    title="GitHub로 내보내기"
                  >
                    <svg className="h-4 w-4 inline-block" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 입력 */}
        <div className="border-t border-[#1e1e28] bg-[#13131a] px-4 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={buildPhase === 'questionnaire' ? '직접 입력하거나 보기를 클릭...' : buildPhase === 'done' ? '"버튼 색 바꿔줘", "로그인 추가해줘"...' : '수정사항을 말씀해주세요...'}
              className="flex-1 rounded-xl border border-[#1e1e28] bg-[#1a1a24] px-4 py-3 text-sm text-[#f2f4f6] placeholder-[#4e5968] outline-none focus:border-[#3182f6]/50 transition-colors"
              disabled={isTyping}
            />
            {/* Agent 모드 토글 */}
            {buildPhase === 'done' && (
              <button
                onClick={() => {
                  if (input.trim() && projectId) {
                    setAgentTask(input.trim());
                    setIsAgentRunning(true);
                    setInput('');
                  }
                }}
                disabled={!input.trim() || isTyping || isAgentRunning}
                title="Agent 모드 (AI가 자율적으로 수정)"
                className="rounded-xl bg-[#8b5cf6] px-3 py-3 text-sm font-semibold text-white hover:bg-[#7c3aed] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                🤖
              </button>
            )}
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="rounded-xl bg-[#3182f6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1b64da] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── 오른쪽: 미리보기 패널 ──────────────────── */}
      <div className={`hidden lg:flex flex-col border-l border-[#1e1e28] bg-[#0c0c12] transition-all duration-500 ease-in-out ${isPreviewFocused ? 'flex-1' : 'w-[45%]'}`}>
        {/* 미리보기 헤더 */}
        <div className="flex items-center justify-between border-b border-[#1e1e28] bg-[#13131a] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-medium text-[#6b7684]">{showLivePreview ? '실시간 미리보기' : '미리보기'}</span>
            {buildPhase === 'done' && (
              <button
                onClick={() => { setVisualEditMode(!visualEditMode); setSelectedElement(null); }}
                className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${visualEditMode ? 'bg-[#f59e0b] text-white' : 'bg-[#1e1e28] text-[#6b7684] hover:text-[#f2f4f6]'}`}
                title="Visual Edit 모드"
              >
                {visualEditMode ? '✏️ 편집 중' : '✏️ 편집'}
              </button>
            )}
            <div className="flex rounded-md bg-[#1e1e28] p-0.5">
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${previewMode === 'mobile' ? 'bg-[#3182f6] text-white' : 'text-[#6b7684] hover:text-[#f2f4f6]'}`}
              >📱</button>
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${previewMode === 'desktop' ? 'bg-[#3182f6] text-white' : 'text-[#6b7684] hover:text-[#f2f4f6]'}`}
              >🖥</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {buildPhase === 'done' && project && (
              <a href={`https://${(project.name || 'app').toLowerCase().replace(/\s+/g, '-')}.foundry.ai.kr`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-[#1e1e28] px-2.5 py-1 text-[10px] text-[#8b95a1] hover:text-[#f2f4f6] transition-colors">
                외부에서 보기 ↗
              </a>
            )}
          </div>
        </div>

        {/* 미리보기 영역 */}
        <div className="flex-1 overflow-auto">
          {/* 생성 중 → streamingFiles가 있으면 LivePreview + 오버레이 프로그레스, 없으면 풀 프로그레스 */}
          {buildPhase === 'generating' && streamingFiles.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-8">
              <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                  <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3182f6] to-[#a855f7] text-4xl shadow-lg shadow-[#3182f6]/20">
                    {generateStep === 'architecture' ? '📐' : generateStep === 'schema' ? '🗄️' : generateStep === 'supabase' ? '☁️' : generateStep === 'frontend' ? '🎨' : generateStep === 'quality' ? '🔍' : generateStep === 'complete' ? '✅' : '⚙️'}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#f2f4f6]">AI가 앱을 생성하고 있습니다</h3>
                  <p className="mt-1 text-sm text-[#6b7684]">AI가 코드를 생성하고 있습니다</p>
                </div>
                {/* 퍼센트 프로그레스 바 */}
                {(() => {
                  const stepOrder = ['architecture', 'schema', 'supabase', 'frontend', 'config', 'quality'];
                  const currentIdx = stepOrder.indexOf(generateStep);
                  const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stepOrder.length) * 100) : 0;
                  const elapsed = genStartTime ? Math.round((Date.now() - genStartTime) / 1000) : 0;
                  const perStep = currentIdx > 0 ? elapsed / (currentIdx + 1) : 15;
                  const remaining = Math.max(0, Math.round(perStep * (stepOrder.length - currentIdx - 1)));
                  return (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#f2f4f6]">{pct}%</span>
                        <span className="text-xs text-[#6b7684]">
                          {remaining > 60 ? `약 ${Math.ceil(remaining / 60)}분 남음` : remaining > 0 ? `약 ${remaining}초 남음` : '거의 완료...'}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#2c2c35] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#a855f7] transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                      {genFileCount > 0 && (
                        <p className="mt-2 text-xs text-[#6b7684] text-center">{genFileCount}개 파일 생성됨{genTotalFiles > 0 ? ` / 예상 ${genTotalFiles}개` : ''}</p>
                      )}
                    </div>
                  );
                })()}
                {/* 단계별 프로그레스 */}
                <div className="space-y-3">
                  {['architecture', 'schema', 'supabase', 'frontend', 'config', 'quality'].map((step, i) => {
                    const labels: Record<string, string> = { architecture: '아키텍처 설계', schema: 'DB 스키마 생성', supabase: 'Supabase 설정', frontend: '프론트엔드 생성', config: '설정 파일', quality: '품질 검증' };
                    const icons: Record<string, string> = { architecture: '📐', schema: '🗄️', supabase: '☁️', frontend: '🎨', config: '📦', quality: '🔍' };
                    const stepOrder = ['architecture', 'schema', 'supabase', 'frontend', 'config', 'quality'];
                    const currentIdx = stepOrder.indexOf(generateStep);
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
              </div>
            </div>
          )}

          {/* 생성 중 + streamingFiles 있음 → 실시간 LivePreview + 미니 프로그레스 오버레이 */}
          {buildPhase === 'generating' && streamingFiles.length > 0 && (
            <div className="relative h-full">
              <LivePreview files={streamingFiles} previewMode={previewMode} visualEditMode={false} />
              {/* 미니 프로그레스 오버레이 */}
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-[#2c2c35] bg-[#13131a]/90 backdrop-blur-sm px-4 py-3 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-2 w-2 rounded-full bg-[#3182f6] animate-pulse" />
                  <span className="text-xs text-[#8b95a1]">
                    {generateStep === 'frontend' ? `페이지 생성 중... (${streamingFiles.filter(f => f.path.includes('page.tsx')).length}개 완료)` :
                     generateStep === 'quality' ? '코드 품질 검증 중...' :
                     generateStep === 'config' ? '설정 파일 생성 중...' :
                     'AI가 코드를 생성하고 있습니다...'}
                  </span>
                  <span className="ml-auto text-xs font-medium text-[#3182f6]">{streamingFiles.length}개 파일</span>
                </div>
                {(() => {
                  const stepOrder = ['architecture', 'schema', 'supabase', 'frontend', 'config', 'quality'];
                  const currentIdx = stepOrder.indexOf(generateStep);
                  const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stepOrder.length) * 100) : 0;
                  return (
                    <div className="h-1.5 rounded-full bg-[#2c2c35] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#3182f6] to-[#a855f7] transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 생성 완료 → 실제 코드 미리보기 */}
          {showLivePreview && buildPhase !== 'generating' && (
            <>
              <LivePreview files={generatedFiles} previewMode={previewMode} visualEditMode={visualEditMode} />
              {/* Visual Edit 팝업 */}
              {selectedElement && visualEditMode && projectId && (
                <VisualEditPopup
                  element={selectedElement}
                  projectId={projectId}
                  modelTier={selectedModelTier}
                  onAiEdit={(message) => {
                    callModifyFiles({ projectId, message, modelTier: selectedModelTier });
                    setSelectedElement(null);
                  }}
                  onClose={() => setSelectedElement(null)}
                />
              )}
            </>
          )}

          {/* 설계 중 → 인터랙티브 미리보기 */}
          {!showLivePreview && buildPhase !== 'generating' && previewTemplate && (
            <div className="flex flex-col items-center gap-3 p-5">
              {(projectFeatures.length > 0 || Object.keys(answers).length >= 3) && (
                <div className="flex items-center gap-2 rounded-xl bg-[#3182f6]/8 border border-[#3182f6]/15 px-3 py-2 text-xs">
                  <span>👆</span>
                  <span className="text-[#3182f6]">메뉴를 클릭해 각 화면을 체험하세요</span>
                </div>
              )}
              <div
                className={`overflow-hidden border border-[#1e1e28] bg-white shadow-2xl transition-all duration-300 ${
                  previewMode === 'mobile' ? 'w-[375px] rounded-[2.5rem]' : 'w-full max-w-[800px] rounded-xl'
                }`}
                style={{ height: previewMode === 'mobile' ? '700px' : '600px' }}
              >
                {previewMode === 'mobile' && (
                  <div className="flex h-[44px] items-center justify-center bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <div className="h-[5px] w-[120px] rounded-full bg-[#1b1b21]" />
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}div{transition:background .15s}</style></head><body>${previewHtml}</body></html>`}
                  className="w-full border-0"
                  style={{ height: previewMode === 'mobile' ? '656px' : '600px' }}
                  title="Live Preview"
                />
              </div>
            </div>
          )}

          {/* 빈 상태 */}
          {!showLivePreview && buildPhase !== 'generating' && !previewTemplate && (
            <div className="flex h-full items-center justify-center text-center text-[#4e5968]">
              <div>
                <div className="mb-4 text-5xl opacity-60">📱</div>
                <p className="text-sm font-medium">앱을 설명하면</p>
                <p className="text-xs mt-1">여기서 실시간으로 미리볼 수 있습니다</p>
              </div>
            </div>
          )}
        </div>

        {/* 하단: 버전 히스토리 + 코드 헬스 (done 상태에서만) */}
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
                  msg += cleanupResult.improvements.map(s => `• ${s}`).join('\n');
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

      {/* 저장 완료 토스트 */}
      {showSaveToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#30d158] px-5 py-2.5 text-sm font-semibold text-white shadow-lg animate-bounce">
          💾 저장 완료!
        </div>
      )}

      {/* 배포/다운로드 비용 안내 모달 */}
      {showCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCostModal(null)}>
          <div className="w-[480px] max-w-[90vw] rounded-2xl bg-[#1b1b21] border border-[#2c2c35] p-6" onClick={e => e.stopPropagation()}>
            {showCostModal === 'deploy' ? (
              <>
                <h3 className="text-lg font-bold text-[#f2f4f6] mb-1">🚀 배포하기</h3>
                <p className="text-sm text-[#8b95a1] mb-4">Foundry 서버에 앱을 배포하면 바로 사용할 수 있습니다.</p>
                <div className="rounded-xl bg-[#2c2c35] p-4 mb-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">호스팅 비용</span><span className="text-[#ffd60a] font-bold">월 9,900원</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">서브도메인</span><span className="text-[#f2f4f6]">{project?.name || 'myapp'}.foundry.kr</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">배포 후 수정</span><span className="text-[#30d158]">✅ 채팅으로 언제든 수정 가능</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">SSL/HTTPS</span><span className="text-[#30d158]">✅ 자동 적용</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[#2c2c35] py-3 text-sm font-medium text-[#8b95a1] hover:bg-[#3a3a45]">취소</button>
                  <button onClick={() => { setShowCostModal(null); handleDeploy(); }} className="flex-1 rounded-xl bg-[#3182f6] py-3 text-sm font-bold text-white hover:bg-[#1b64da]">월 9,900원 배포하기</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-[#f2f4f6] mb-1">📦 소스코드 다운로드</h3>
                <p className="text-sm text-[#8b95a1] mb-4">전체 소스코드를 ZIP으로 다운로드합니다. 코드 소유권 100% 보장.</p>
                <div className="rounded-xl bg-[#2c2c35] p-4 mb-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">다운로드 비용</span><span className="text-[#ffd60a] font-bold">3,000 크레딧</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">포함 내용</span><span className="text-[#f2f4f6]">프론트+백엔드+DB 전체</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">ERD + API 명세</span><span className="text-[#30d158]">✅ 포함</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#8b95a1]">코드 소유권</span><span className="text-[#30d158]">✅ 100% 사용자 소유</span></div>
                </div>
                <div className="rounded-xl bg-[#ffd60a]/10 border border-[#ffd60a]/20 p-3 mb-4">
                  <p className="text-xs text-[#ffd60a]">💡 <b>절약 팁:</b> 배포(월 9,900원)로 먼저 사용해보고, 만족하면 다운로드하세요. 배포 중에도 수정이 가능합니다!</p>
                </div>
                {creditBalance !== null && creditBalance < 3000 && (
                  <div className="rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/20 p-3 mb-4">
                    <p className="text-xs text-[#f43f5e]">⚠️ 크레딧 부족 (현재 {creditBalance.toLocaleString()}) — <a href="/credits" className="underline font-bold">충전하러 가기</a></p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setShowCostModal(null)} className="flex-1 rounded-xl bg-[#2c2c35] py-3 text-sm font-medium text-[#8b95a1] hover:bg-[#3a3a45]">취소</button>
                  <button onClick={() => { setShowCostModal(null); handleDownload(); }} className="flex-1 rounded-xl bg-[#a855f7] py-3 text-sm font-bold text-white hover:bg-[#9333ea]" disabled={creditBalance !== null && creditBalance < 3000}>3,000 크레딧 다운로드</button>
                </div>
              </>
            )}

            {/* 다중 앱 비용 안내 */}
            <div className="mt-4 pt-4 border-t border-[#2c2c35]">
              <p className="text-xs text-[#6b7684] mb-2">💼 여러 앱이 필요하신가요?</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-[#2c2c35] p-3">
                  <div className="font-bold text-[#f2f4f6] mb-1">프로 플랜</div>
                  <div className="text-[#ffd60a] font-bold">₩99,000/월</div>
                  <div className="text-[#8b95a1]">앱 5개 + 10,000 크레딧</div>
                </div>
                <div className="rounded-lg bg-[#2c2c35] p-3">
                  <div className="font-bold text-[#f2f4f6] mb-1">엔터프라이즈</div>
                  <div className="text-[#ffd60a] font-bold">₩249,000/월</div>
                  <div className="text-[#8b95a1]">무제한 앱 + 50,000 크레딧</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
