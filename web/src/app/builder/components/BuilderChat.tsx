'use client';

import { useState, useRef, useEffect } from 'react';
import { authFetch, getToken, API_BASE } from '@/lib/api';
import { QUESTIONNAIRES } from '../constants';
import type { Question } from '../constants';
import MarkdownRenderer from '@/app/components/MarkdownRenderer';
import WelcomeBack from './WelcomeBack';
import AgentPanel from './AgentPanel';

// ── 타입 ──────────────────────────────────────────
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'code' | 'preview' | 'status' | 'question';
  chips?: string[];
};

export type BuildPhase = 'idle' | 'questionnaire' | 'designing' | 'generating' | 'done';

export type ProjectData = {
  id: string;
  name: string;
  description?: string;
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
  deployedUrl?: string;
  subdomain?: string;
};

type AppModelTier = 'flash' | 'smart' | 'pro';

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

export async function callModifyFiles(params: {
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

// ── Props ──────────────────────────────────────────
interface BuilderChatProps {
  projectId: string;
  project: ProjectData | null;
  setProject: (p: ProjectData | null) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  buildPhase: BuildPhase;
  setBuildPhase: (p: BuildPhase) => void;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  questionIndex: number;
  setQuestionIndex: (i: number) => void;
  projectFeatures: string[];
  creditBalance: number | null;
  setCreditBalance: (b: number | null) => void;
  hasError: boolean;
  setHasError: (e: boolean) => void;
  pendingRequests: string[];
  setPendingRequests: React.Dispatch<React.SetStateAction<string[]>>;
  isTyping: boolean;
  setIsTyping: (t: boolean) => void;
  input: string;
  setInput: (i: string) => void;
  selectedModelTier: AppModelTier;
  templateId: string;
  showWelcomeBack: boolean;
  setShowWelcomeBack: (s: boolean) => void;
  generateStep: string;
  saveChatHistory: (msgs: Message[], showToast?: boolean) => void;
  handleGenerate: () => void;
  handleDeploy: () => void;
  handleDownload: () => void;
  handleManualSave: () => void;
  saving: boolean;
  lastSaved: string;
  showCostModal: 'deploy' | 'download' | 'generate' | null;
  setShowCostModal: (m: 'deploy' | 'download' | 'generate' | null) => void;
  onModifyComplete: () => void; // 수정 완료 후 자동 재배포 트리거
  // 비주얼 에디터
  selectedElement?: { component?: string; file?: string; tagName?: string; textContent?: string } | null;
}

export default function BuilderChat({
  projectId, project, setProject,
  messages, setMessages,
  buildPhase, setBuildPhase,
  answers, setAnswers,
  questionIndex, setQuestionIndex,
  projectFeatures,
  creditBalance, setCreditBalance,
  hasError, setHasError,
  pendingRequests, setPendingRequests,
  isTyping, setIsTyping,
  input, setInput,
  selectedModelTier, templateId,
  showWelcomeBack, setShowWelcomeBack,
  generateStep,
  saveChatHistory, handleGenerate, handleDeploy, handleDownload,
  handleManualSave, saving, lastSaved,
  showCostModal, setShowCostModal,
  onModifyComplete,
  selectedElement,
}: BuilderChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'build' | 'discuss'>('build');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentTask, setAgentTask] = useState('');

  // 칩 선택 상태
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customChips, setCustomChips] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const [tokenUsed, setTokenUsed] = useState(0);

  const questions = QUESTIONNAIRES[templateId] || QUESTIONNAIRES['custom'];

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
      const summary = Object.entries(newAnswers)
        .map(([k, v]) => `- **${questions.find(q => q.id === k)?.question.replace(/\?|!|뭔가요|인가요|되나요|할까요/g, '')}**: ${v}`)
        .join('\n');

      const completeMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `질문지 완료! 답변을 정리했습니다:\n\n${summary}\n\n수정하고 싶은 부분이 있으면 아래 채팅으로 자유롭게 말씀해주세요.\n(예: "고객 관리에 포인트 기능도 추가해줘", "색상을 좀 더 밝게")\n\n만족하시면 **"앱 생성하기"** 버튼을 누르면 AI가 실제 코드를 만들어드립니다!`,
        timestamp: new Date().toISOString(), type: 'text',
      };
      const updated = [...messages, userMsg, completeMsg];
      setMessages(updated);
      setBuildPhase('designing');
      saveChatHistory(updated);
    }
  };

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

  const handleGoBack = () => {
    if (questionIndex <= 0 || buildPhase !== 'questionnaire') return;
    setMessages(prev => prev.slice(0, -2));
    const prevIdx = questionIndex - 1;
    setQuestionIndex(prevIdx);
    const prevQ = questions[prevIdx];
    setAnswers(prev => { const n = { ...prev }; delete n[prevQ.id]; return n; });
    setSelectedChips([]);
    setCustomChips([]);
  };

  // ── 생성 중 대기 채팅 ────────────────────────────
  const sendGeneratingChat = async (question?: string) => {
    const q = (question || input).trim();
    if (!q || isTyping) return;
    setInput('');

    const isFeatureRequest = /추가|만들어|넣어|바꿔|변경|수정|기능|페이지|화면|버튼|디자인|색|레이아웃/.test(q);
    if (isFeatureRequest) {
      setPendingRequests(prev => [...prev, q]);
    }

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      content: q, timestamp: new Date().toISOString(), type: 'text',
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const token = getToken();
      const projectContext = [
        `[현재 프로젝트 정보]`,
        `프로젝트명: ${project?.name || ''}`,
        `앱 설명: ${project?.description || answers?.description || ''}`,
        answers && Object.keys(answers).length > 0 ? `질문지 답변: ${JSON.stringify(answers)}` : '',
        project?.features?.smartAnalysisResults ? `스마트 분석 결과: ${typeof project.features.smartAnalysisResults === 'string' ? project.features.smartAnalysisResults.slice(0, 2000) : JSON.stringify(project.features.smartAnalysisResults).slice(0, 2000)}` : '',
        projectFeatures.length > 0 ? `선택된 기능: ${projectFeatures.join(', ')}` : '',
        `템플릿: ${project?.template || ''}`,
        `테마: ${project?.theme || ''}`,
        `현재 상태: 앱 코드 생성 중`,
        `\n이 정보를 기반으로 사용자의 질문에 답변하세요. 수익모델, 마케팅 전략, 타겟 사용자 등을 조언해주세요.`,
        `'이전 대화를 모른다'고 하지 마세요. 위 프로젝트 정보가 있습니다.`,
      ].filter(Boolean).join('\n');

      const res = await fetch(`${API_BASE}/ai/meeting-chat-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          question: q,
          context: projectContext,
          history: messages.filter(m => m.role !== 'system').slice(-6).map(m => ({ role: m.role === 'assistant' ? 'ai' : m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant' as const,
        content: data.reply, timestamp: new Date().toISOString(), type: 'text' as const,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant' as const,
        content: '답변 생성에 실패했습니다. 다시 시도해주세요.', timestamp: new Date().toISOString(), type: 'text' as const,
      }]);
    }
    setIsTyping(false);
  };

  // ── 메시지 전송 ────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || isTyping || !projectId) return;

    if (buildPhase === 'generating') {
      sendGeneratingChat();
      return;
    }

    if (buildPhase === 'questionnaire') {
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

    // 이미지 생성 키워드 감지
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

    // done이 아닌데 수정 키워드 감지 → 안내 (할루시네이션 방지!)
    const modifyKeywords = ['수정', '변경', '바꿔', '바꾸', '추가', '삭제', '제거', '고쳐', '고치', '색상', '색깔', '텍스트', '문구', '버튼', '이미지', '크기', '위치', '레이아웃', '반응형', '모바일', 'fix', 'change', 'add', 'remove', 'update', 'modify'];
    const isModifyRequest = modifyKeywords.some(kw => userMsg.content.toLowerCase().includes(kw));

    if (buildPhase !== 'done' && projectId && isModifyRequest) {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: '앱 생성이 완료된 후에 수정할 수 있습니다.\n현재 상태에서는 설계 관련 대화가 가능합니다.\n\n앱 생성을 먼저 완료해주세요!',
        timestamp: new Date().toISOString(), type: 'text',
      };
      setMessages([...newMessages, aiMsg]);
      setIsTyping(false);
      return;
    }

    // done 상태: 수정 vs 일반 대화
    if (buildPhase === 'done' && projectId) {
      if (isModifyRequest) {
        // 단계별 진행 상태 표시 (같은 메시지 ID로 content 업데이트)
        const statusMsgId = `modify-${Date.now()}`;
        const updateStatus = (content: string) => {
          setMessages(prev => {
            const existing = prev.find(m => m.id === statusMsgId);
            if (existing) {
              return prev.map(m => m.id === statusMsgId ? { ...m, content } : m);
            }
            return [...prev, { id: statusMsgId, role: 'assistant' as const, content, timestamp: new Date().toISOString(), type: 'text' as const }];
          });
        };

        // 1단계: 수정 요청 접수
        updateStatus('✏️ 수정 요청 접수\n⏱️ 약 5~8분 소요');

        try {
          // 2단계: 코드 수정 중
          setTimeout(() => updateStatus('🔄 코드 수정 중... (1/3)\n⏱️ 약 2~3분'), 3000);

          const modifyResult = await callModifyFiles({
            projectId,
            message: selectedElement?.component
              ? `[${selectedElement.component}] ${selectedElement.file || ''}\n${userMsg.content}`
              : userMsg.content,
            modelTier: selectedModelTier,
            targetFiles: selectedElement?.file ? [selectedElement.file] : undefined,
          });

          authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
            if (d) setCreditBalance(d.balance);
          }).catch(() => {});

          if (modifyResult && modifyResult.modifiedFiles.length > 0) {
            if (project) {
              const existingFiles = Array.isArray(project.generatedCode) ? [...project.generatedCode] : [];
              for (const mod of modifyResult.modifiedFiles) {
                const idx = existingFiles.findIndex((f: any) => f.path === mod.path);
                if (idx >= 0) existingFiles[idx] = mod;
                else existingFiles.push(mod);
              }
              setProject({ ...project, generatedCode: existingFiles });
            }

            // 3단계: 재배포 중
            updateStatus('📦 재배포 중... (2/3)\n⏱️ 약 3~5분');

            // 자동 재배포 트리거
            onModifyComplete();

            // 4단계: 완료 (약간 딜레이로 재배포 단계 보여주기)
            setTimeout(() => {
              const paths = modifyResult.modifiedFiles.map(f => f.path).join(', ');
              let replyContent = `✅ **수정 완료!** (3/3)\n\n`;
              replyContent += `수정된 파일 (${modifyResult.modifiedFiles.length}개): ${paths}\n`;
              if (modifyResult.totalCredits > 0) replyContent += `💰 ${modifyResult.totalCredits}cr 사용 | 잔액: ${creditBalance !== null ? (creditBalance - modifyResult.totalCredits).toLocaleString() : '?'}cr\n`;
              if (modifyResult.fellBack) replyContent += `⚠️ Flash 모델로 자동 전환됨\n`;
              replyContent += `\n🔄 미리보기에 반영 중입니다. (약 2~3분)\n추가 수정이 필요하면 말씀해주세요!`;
              updateStatus(replyContent);
              setIsTyping(false);
              setMessages(prev => {
                saveChatHistory(prev);
                return prev;
              });
            }, 2000);
          } else if (modifyResult) {
            updateStatus('요청을 분석했지만 수정할 코드를 찾지 못했습니다. 좀 더 구체적으로 말씀해주세요.\n\n예: "메인 페이지 배경색을 파란색으로 바꿔줘"');
            setIsTyping(false);
          } else {
            updateStatus('좀 더 구체적으로 말씀해주세요. 예: "메인 페이지 배경색을 파란색으로 바꿔줘"');
            setIsTyping(false);
          }
        } catch (err) {
          console.error('Modify API error:', err);
          updateStatus('⚠️ 코드 수정에 실패했습니다.\n\n다시 시도하거나 좀 더 구체적으로 요청해주세요.\n예: "메인 페이지 배경색을 파란색으로 바꿔줘"');
          setIsTyping(false);
        }
        return; // 무조건 return! 일반 채팅으로 절대 빠지지 않게!
      }
    }

    // designing 상태: AI 채팅 (수정 기능 없음! 설계 상담만!)
    const chatHistory = newMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const aiResult = await callAiChat({
      projectId,
      message: userMsg.content,
      chatHistory: chatHistory.slice(-10),
      template: templateId,
    });

    authFetch('/credits/balance').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setCreditBalance(d.balance);
    }).catch(() => {});

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
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.chips);
  const currentChips = buildPhase === 'questionnaire' ? lastAssistantMsg?.chips || [] : [];
  const currentQ = buildPhase === 'questionnaire' ? questions[questionIndex] : null;

  const isPreviewFocused = buildPhase === 'done' || buildPhase === 'generating';

  return (
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
          {buildPhase === 'designing' && !hasError && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#3182f6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3182f6] animate-pulse" />설계 중
            </span>
          )}
          {buildPhase === 'designing' && hasError && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#ef4444]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />생성 실패
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
              <button onClick={() => setMode('discuss')} className={`rounded px-2.5 py-1 text-[10px] font-semibold transition-colors ${mode === 'discuss' ? 'bg-[#a855f7] text-white' : 'text-[#6b7684]'}`}>AI채팅</button>
            </div>
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3 max-w-none">
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
                const qs = QUESTIONNAIRES[tmpl] || QUESTIONNAIRES['custom'];
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
                {msg.role === 'assistant'
                  ? <MarkdownRenderer content={msg.content} />
                  : msg.content.split('\n').map((line, i) => {
                    if (line.trim() === '') return <div key={i} className="h-2" />;
                    return <div key={i}>{line}</div>;
                  })
                }
              </div>
            </div>
          ))}

          {/* 예시 답변 칩 */}
          {currentChips.length > 0 && !isTyping && (
            <div className="space-y-2 pl-2">
              {questionIndex > 0 && (
                <button onClick={handleGoBack} className="rounded-lg border border-[#2c2c35] px-3 py-1.5 text-xs text-[#8b95a1] hover:text-[#f2f4f6] hover:border-[#3a3a45] transition-colors">
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
                {currentQ?.multi && !showCustomInput && (
                  <button onClick={() => setShowCustomInput(true)} className="rounded-xl border border-dashed border-[#4e5968] px-4 py-2 text-sm text-[#8b95a1] hover:border-[#3182f6] hover:text-[#3182f6] transition-colors">
                    + 직접 추가
                  </button>
                )}
              </div>
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
              {currentQ?.multi && (selectedChips.length > 0 || customChips.length > 0) && (
                <button onClick={submitMultiChips} className="rounded-xl bg-[#3182f6] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors">
                  선택 완료 ({selectedChips.length + customChips.length}개)
                </button>
              )}
            </div>
          )}

          {/* 생성 중 추천 질문 */}
          {buildPhase === 'generating' && !isTyping && (
            <div className="space-y-2 pl-2">
              <div className="flex items-center gap-2 text-xs text-[#6b7684]">
                <span>💬</span>
                <span className="font-medium">생성 중에도 질문할 수 있어요!</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['이 앱의 수익모델은?', '타겟 사용자 분석', '출시 후 마케팅 전략', '정부지원사업 정산 방법'].map(q => (
                  <button key={q} onClick={() => sendGeneratingChat(q)} className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#3182f6]/30 text-[#93c5fd] hover:bg-[#3182f6]/10 transition-colors">{q}</button>
                ))}
              </div>
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

      {/* 액션 버튼 */}
      {(buildPhase === 'designing' || buildPhase === 'done') && (
        <div className="border-t border-[#1e1e28] bg-[#13131a] px-4 py-2.5">
          <div className="flex gap-2">
            {buildPhase === 'designing' && !hasError && (
              <button onClick={() => setShowCostModal('generate')} className="flex-1 rounded-xl bg-gradient-to-r from-[#30d158] to-[#28c840] px-4 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-[#30d158]/20 transition-all">
                앱 생성하기
              </button>
            )}
            {buildPhase === 'designing' && hasError && (
              <button onClick={() => setShowCostModal('generate')} className="flex-1 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] px-4 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-[#ef4444]/20 transition-all">
                🔄 다시 시도하기
              </button>
            )}
            {buildPhase === 'done' && pendingRequests.length > 0 && (
              <button
                onClick={async () => {
                  if (!projectId) return;
                  const combinedRequest = pendingRequests.join('\n');
                  setIsTyping(true);
                  setMessages(prev => [...prev, {
                    id: Date.now().toString(), role: 'assistant' as const,
                    content: `🔄 생성 중 요청하신 내용을 반영하고 있습니다...\n\n${pendingRequests.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
                    timestamp: new Date().toISOString(), type: 'text' as const,
                  }]);
                  const result = await callModifyFiles({ projectId, message: combinedRequest, modelTier: 'smart' as AppModelTier });
                  if (result && project && result.modifiedFiles.length > 0) {
                    const existingFiles = Array.isArray(project.generatedCode) ? [...project.generatedCode] : [];
                    for (const mod of result.modifiedFiles) {
                      const idx = existingFiles.findIndex((f: any) => f.path === mod.path);
                      if (idx >= 0) existingFiles[idx] = mod;
                      else existingFiles.push(mod);
                    }
                    setProject({ ...project, generatedCode: existingFiles });
                    onModifyComplete(); // 자동 재배포
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(), role: 'assistant' as const,
                      content: `✅ **대화 내용 반영 완료!** ${result.modifiedFiles.length}개 파일 수정됨\n\n🔄 재배포 중... 미리보기가 약 2~3분 후 업데이트됩니다.`,
                      timestamp: new Date().toISOString(), type: 'text' as const,
                    }]);
                  } else if (result) {
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(), role: 'assistant' as const,
                      content: '대화 내용을 분석했지만 코드에 반영할 수정 사항을 찾지 못했습니다. 채팅으로 구체적인 수정을 요청해주세요.',
                      timestamp: new Date().toISOString(), type: 'text' as const,
                    }]);
                  } else {
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(), role: 'assistant' as const,
                      content: '좀 더 구체적으로 수정 요청을 해주세요. 예: "메인 페이지 배경색을 파란색으로 바꿔줘"',
                      timestamp: new Date().toISOString(), type: 'text' as const,
                    }]);
                  }
                  setPendingRequests([]);
                  setIsTyping(false);
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-3 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-[#f59e0b]/20 transition-all animate-pulse"
              >
                💬 대화 내용 반영하기 ({pendingRequests.length}건)
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
            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && sendMessage()}
            placeholder={buildPhase === 'questionnaire' ? '직접 입력하거나 보기를 클릭...' : buildPhase === 'generating' ? '생성 중 궁금한 점을 물어보세요...' : buildPhase === 'done' ? '"버튼 색 바꿔줘", "로그인 추가해줘"...' : '수정사항을 말씀해주세요...'}
            className="flex-1 rounded-xl border border-[#1e1e28] bg-[#1a1a24] px-4 py-3 text-sm text-[#f2f4f6] placeholder-[#4e5968] outline-none focus:border-[#3182f6]/50 transition-colors"
            disabled={isTyping}
          />
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
  );
}
