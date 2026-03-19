'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authFetch, getUser } from '@/lib/api';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'code' | 'preview' | 'status';
};

type BuildPhase = 'idle' | 'designing' | 'generating' | 'done';

type ProjectData = {
  id: string;
  name: string;
  template: string;
  theme: string;
  features: any;
  status: string;
  chatHistory: Message[] | null;
  generatedCode: any;
};

// AI 채팅 API 호출
async function callAiChat(params: {
  projectId: string;
  message: string;
  chatHistory: { role: string; content: string }[];
  template?: string;
}): Promise<string> {
  try {
    const res = await authFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('AI Chat error:', err);
      return `죄송합니다. AI 응답에 실패했습니다. 다시 시도해주세요.\n\n(오류: ${res.status})`;
    }
    const data = await res.json();
    return data.content;
  } catch (e: any) {
    console.error('AI Chat network error:', e);
    return '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}

// 앱 생성 API 호출
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
    if (!res.ok) {
      const err = await res.text();
      // 크레딧 부족 처리
      if (res.status === 403) {
        try {
          const parsed = JSON.parse(JSON.parse(err).message);
          if (parsed.code === 'INSUFFICIENT_CREDITS') {
            return null; // 크레딧 부족
          }
        } catch { /* */ }
      }
      console.error('AI Generate error:', err);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    console.error('AI Generate network error:', e);
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
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!getUser()) { window.location.href = '/login'; return; }
    if (!projectId) { window.location.href = '/dashboard'; return; }

    // 크레딧 잔액 조회
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

          if (data.chatHistory && Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
            setMessages(data.chatHistory);
            if (data.status === 'active' || data.status === 'deployed') {
              setBuildPhase('done');
            } else if (data.status === 'generating') {
              setBuildPhase('generating');
            } else {
              setBuildPhase('designing');
            }
          } else {
            setMessages([{
              id: '1', role: 'assistant',
              content: `프로젝트 "${data.name}"의 빌더에 오신 것을 환영합니다!\n\n**템플릿**: ${data.template === 'beauty-salon' ? '✂️ 미용실 POS' : data.template === 'ecommerce' ? '🛒 쇼핑몰' : '📅 예약/CRM'}\n\n어떤 기능을 추가하거나 커스터마이즈하고 싶으신가요? 자유롭게 설명해주세요.\n\n**예시:**\n- "고객별 포인트 적립 기능 추가해줘"\n- "예약 시 알림톡 보내는 기능"\n- "다크 모드 지원"`,
              timestamp: new Date().toISOString(), type: 'text',
            }]);
            setBuildPhase('designing');
          }
        }
      } catch { /* redirect by authFetch */ }
    })();
  }, [projectId]);

  const saveChatHistory = (msgs: Message[]) => {
    if (!projectId || msgs.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await authFetch(`/projects/${projectId}`, {
          method: 'PATCH',
          body: JSON.stringify({ chatHistory: msgs }),
        });
      } catch { /* silent */ }
      setSaving(false);
    }, 2000);
  };

  const handleDeploy = async () => {
    if (!projectId) return;
    try {
      const res = await authFetch(`/projects/${projectId}/deploy`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: Date.now().toString(), role: 'assistant',
          content: `배포가 완료되었습니다!\n\n**URL**: ${data.deployedUrl}\n**서브도메인**: ${data.subdomain}\n\n아직 실제 서버 배포는 준비 중이지만, 프로젝트가 "배포됨" 상태로 변경되었습니다.`,
          timestamp: new Date().toISOString(), type: 'text',
        }]);
        setBuildPhase('done');
      }
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

      for (const file of manifest.files) {
        zip.file(file.path, file.content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manifest.projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: `코드 다운로드가 시작되었습니다!\n\n**파일명**: ${manifest.projectName}.zip\n**파일 수**: ${manifest.files.length}개\n\n다운로드한 코드를 로컬에서 실행하려면:\n\`\`\`\nnpm install\nnpm run dev\n\`\`\``,
        timestamp: new Date().toISOString(), type: 'text',
      }]);
    } catch { /* */ }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping || !projectId) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      content: input.trim(), timestamp: new Date().toISOString(), type: 'text',
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // 미리보기 템플릿 자동 감지
    const lower = input.toLowerCase();
    if (lower.includes('미용실') || lower.includes('헤어') || lower.includes('살롱')) {
      setPreviewTemplate('beauty-salon');
    } else if (lower.includes('쇼핑몰') || lower.includes('커머스') || lower.includes('상품')) {
      setPreviewTemplate('ecommerce');
    } else if (lower.includes('예약') || lower.includes('병원') || lower.includes('피트니스')) {
      setPreviewTemplate('booking-crm');
    }

    // 실제 AI API 호출
    const chatHistory = newMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const aiContent = await callAiChat({
      projectId,
      message: input.trim(),
      chatHistory: chatHistory.slice(-10), // 최근 10개만 전송 (토큰 절약)
      template: previewTemplate || undefined,
    });

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(), role: 'assistant',
      content: aiContent, timestamp: new Date().toISOString(), type: 'text',
    };

    const updatedMessages = [...newMessages, aiMsg];
    setMessages(updatedMessages);
    setIsTyping(false);
    saveChatHistory(updatedMessages);
  };

  const handleGenerate = async () => {
    if (!projectId) return;
    setBuildPhase('generating');

    await authFetch(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'generating' }),
    });

    const statusMsg: Message = {
      id: Date.now().toString(), role: 'system',
      content: '📐 AI가 앱 아키텍처를 설계하고 있습니다...', timestamp: new Date().toISOString(), type: 'status',
    };
    setMessages(prev => [...prev, statusMsg]);

    // 대화 내역으로 AI 앱 생성 호출
    const chatHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const result = await callAiGenerate({
      projectId,
      chatHistory,
      template: previewTemplate || project?.template || 'beauty-salon',
    });

    if (!result) {
      // 크레딧 부족 or 오류
      setBuildPhase('designing');
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: '크레딧이 부족합니다! 앱을 생성하려면 크레딧을 충전해주세요.\n\n[크레딧 충전하기 →](/credits)',
        timestamp: new Date().toISOString(), type: 'text',
      }]);

      await authFetch(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'draft' }),
      });
      return;
    }

    setBuildPhase('done');

    const arch = result.architecture;
    const pages = arch.pages?.length || 0;
    const apis = arch.apiEndpoints?.length || 0;
    const models = arch.dbModels?.length || 0;

    const doneMsg: Message = {
      id: Date.now().toString(), role: 'assistant',
      content: `${result.isFreeTrial ? '**맛보기 설계안 (무료 1회)**\n\n' : ''}앱 아키텍처가 설계되었습니다!\n\n**${arch.appName || '앱'}**\n${arch.description || ''}\n\n**설계된 구성:**\n- 프론트엔드: ${pages}개 페이지\n- 백엔드: ${apis}개 API 엔드포인트\n- 데이터베이스: ${models}개 테이블\n- 주요 기능: ${(arch.features || []).join(', ')}\n\n**다음 단계:**\n1. 왼쪽 미리보기에서 앱 구성을 확인하세요\n2. 수정이 필요하면 채팅으로 말씀해주세요\n3. 완료되면 "배포" 또는 "다운로드" 버튼을 이용하세요`,
      timestamp: new Date().toISOString(), type: 'text',
    };

    setMessages(prev => {
      const final = [...prev, doneMsg];
      saveChatHistory(final);
      return final;
    });
  };

  const previewHtml: Record<string, string> = {
    'beauty-salon': `<div style="font-family:system-ui;background:#f8fafc;min-height:100vh;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h1 style="font-size:20px;font-weight:700">💇 미용실 POS</h1><span style="background:#3b82f6;color:white;padding:4px 12px;border-radius:6px;font-size:12px">관리자</span></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px"><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 매출</div><div style="font-size:22px;font-weight:700">₩1,280,000</div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:22px;font-weight:700">12건</div></div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:14px;font-weight:600;margin-bottom:12px">예약 현황</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">10:00 김지현 - 커트+염색</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">11:30 이서윤 - 디지털펌</div><div style="font-size:13px;padding:8px 0">13:00 박민준 - 남성 커트</div></div></div>`,
    'ecommerce': `<div style="font-family:system-ui;min-height:100vh"><div style="background:#1e293b;color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-size:14px"><span style="font-weight:700">🛍 STYLE SHOP</span><span>🛒 3</span></div><div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px 20px;text-align:center;color:white"><div style="font-size:24px;font-weight:700">SPRING SALE</div><div style="font-size:14px;opacity:.8;margin-top:4px">최대 30% OFF</div></div><div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px"><div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"><div style="background:#fef3c7;padding:32px;text-align:center;font-size:36px">👗</div><div style="padding:12px"><div style="font-weight:600;font-size:13px">린넨 원피스</div><div style="color:#ef4444;font-weight:700;font-size:14px">₩62,300</div></div></div><div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"><div style="background:#dbeafe;padding:32px;text-align:center;font-size:36px">👜</div><div style="padding:12px"><div style="font-weight:600;font-size:13px">미니 크로스백</div><div style="color:#ef4444;font-weight:700;font-size:14px">₩31,500</div></div></div></div></div>`,
    'booking-crm': `<div style="font-family:system-ui;background:#f0fdf4;min-height:100vh;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h1 style="font-size:20px;font-weight:700">🏥 예약 시스템</h1><span style="background:#16a34a;color:white;padding:4px 12px;border-radius:6px;font-size:12px">원장님</span></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px"><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:22px;font-weight:700">18건</div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">온라인 예약</div><div style="font-size:22px;font-weight:700">34%</div></div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:14px;font-weight:600;margin-bottom:12px">진료 일정</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">09:00 김철수 - 일반 진료</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">09:30 박영희 - 건강검진</div><div style="font-size:13px;padding:8px 0">10:00 이민호 - 재활치료</div></div></div>`,
  };

  return (
    <div className="flex h-screen bg-[#17171c] text-[#f2f4f6]">
      {/* 왼쪽: 실시간 미리보기 */}
      <div className="hidden w-[45%] flex-col border-r border-[#2c2c35] lg:flex">
        <div className="flex items-center justify-between border-b border-[#2c2c35] px-5 py-3.5">
          <span className="text-sm font-medium text-[#8b95a1]">실시간 미리보기</span>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-[#6b7684]">저장 중...</span>}
            {previewTemplate && (
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                buildPhase === 'done'
                  ? 'bg-[#30d158]/15 text-[#30d158]'
                  : buildPhase === 'generating'
                    ? 'bg-[#ffd60a]/15 text-[#ffd60a]'
                    : 'bg-[#3182f6]/15 text-[#3182f6]'
              }`}>
                {buildPhase === 'done' ? '생성 완료' : buildPhase === 'generating' ? '생성 중...' : '설계 중'}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#1b1b21] p-5">
          {previewTemplate ? (
            <div className="mx-auto w-[375px] overflow-hidden rounded-2xl border border-[#2c2c35] bg-white shadow-2xl" style={{ height: '700px' }}>
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}</style></head><body>${previewHtml[previewTemplate] || ''}</body></html>`}
                className="h-full w-full border-0"
                title="Live Preview"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-[#6b7684]">
              <div>
                <div className="mb-4 text-6xl">📱</div>
                <p className="text-lg font-medium">앱을 설명하면</p>
                <p className="text-sm">여기서 실시간으로 미리볼 수 있습니다</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 채팅 */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#2c2c35] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <a href="/dashboard">
              <img src="/logo.svg" alt="Foundry" className="h-6" />
            </a>
            {project && (
              <span className="rounded-lg bg-[#2c2c35] px-2.5 py-1 text-xs text-[#8b95a1]">
                {project.name}
              </span>
            )}
            <div className="flex rounded-xl bg-[#2c2c35] p-0.5">
              <button
                onClick={() => setMode('build')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'build' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'
                }`}
              >
                빌드
              </button>
              <button
                onClick={() => setMode('discuss')}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'discuss' ? 'bg-[#a855f7] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'
                }`}
              >
                토론
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {creditBalance !== null && (
              <a href="/credits" className="flex items-center gap-1.5 rounded-lg bg-[#2c2c35] px-3 py-1.5 text-xs font-medium text-[#ffd60a] hover:bg-[#3a3a45] transition-colors">
                <span>⚡</span>
                <span>{creditBalance.toLocaleString()}</span>
              </a>
            )}
            {buildPhase === 'designing' && (
              <button
                onClick={handleGenerate}
                className="rounded-xl bg-[#30d158] px-5 py-2 text-sm font-bold text-white hover:bg-[#28b84c] transition-colors animate-pulse"
              >
                앱 생성하기
              </button>
            )}
            {buildPhase === 'done' && (
              <>
                <button
                  onClick={handleDeploy}
                  className="rounded-xl bg-[#3182f6] px-5 py-2 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors"
                >
                  배포하기
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-xl bg-[#a855f7] px-4 py-2 text-sm font-bold text-white hover:bg-[#9333ea] transition-colors"
                >
                  다운로드
                </button>
              </>
            )}
            <a href="/dashboard" className="rounded-xl bg-[#2c2c35] px-4 py-2 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">
              프로젝트 목록
            </a>
          </div>
        </header>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#3182f6] text-white'
                      : msg.type === 'status'
                        ? 'bg-[#2c2c35] text-[#8b95a1] text-xs py-2.5'
                        : 'bg-[#1b1b21] border border-[#2c2c35] text-[#f2f4f6]'
                  }`}
                >
                  {msg.content.split('\n').map((line, i) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <div key={i} className="font-bold mt-2 mb-1">{line.replace(/\*\*/g, '')}</div>;
                    }
                    if (line.startsWith('- ')) {
                      return <div key={i} className="ml-2">• {line.slice(2)}</div>;
                    }
                    if (line.trim() === '') return <div key={i} className="h-2" />;
                    return <div key={i}>{line}</div>;
                  })}
                </div>
              </div>
            ))}

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

        {/* 입력 */}
        <div className="border-t border-[#2c2c35] px-5 py-4">
          <div className="mx-auto flex max-w-2xl gap-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={mode === 'build' ? '만들고 싶은 기능을 설명해주세요...' : '아이디어를 자유롭게 이야기해보세요...'}
              className="flex-1 rounded-xl border border-[#2c2c35] bg-[#2c2c35] px-5 py-3.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:border-[#3182f6] transition-colors"
              disabled={isTyping}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="rounded-xl bg-[#3182f6] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1b64da] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </div>
          <p className="mx-auto mt-2.5 max-w-2xl text-center text-xs text-[#6b7684]">
            {mode === 'build' ? 'AI가 앱을 생성합니다. 생성된 앱은 수정/배포할 수 있습니다.' : '토론 모드에서는 실제 앱에 영향을 주지 않습니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}
