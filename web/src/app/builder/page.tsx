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

// 데모용 AI 응답 (API 키 연동 전)
const DEMO_RESPONSES: Record<string, string> = {
  '미용실': `좋습니다! 미용실 예약/POS 시스템을 만들어 드리겠습니다.

**포함될 기능:**
- 예약 관리 (타임라인 뷰)
- 매출/결제 관리
- 고객 CRM
- 디자이너 관리
- 매출 대시보드

기본 디자인 테마는 **베이직 라이트**로 설정했습니다.
다른 테마로 변경하시겠어요, 아니면 바로 생성할까요?`,

  '쇼핑몰': `쇼핑몰을 만들어 드리겠습니다!

**포함될 기능:**
- 상품 관리 (카테고리, 재고)
- 장바구니 + 결제 (토스페이먼츠)
- 주문/배송 관리
- 회원 관리
- 관리자 대시보드

어떤 종류의 상품을 판매하시나요? (의류, 식품, 전자제품 등)`,

  '예약': `예약 관리 시스템을 만들어 드리겠습니다!

**포함될 기능:**
- 온라인 예약 페이지
- 예약 캘린더 (일/주/월)
- 고객 관리 (CRM)
- 알림 (카카오톡/SMS)
- 통계 대시보드

어떤 업종의 예약 시스템인가요? (병원, 피트니스, 학원, 식당 등)`,
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return `네, 이해했습니다! "${input}"을 반영하겠습니다.

변경 사항을 적용 중입니다... 왼쪽 미리보기에서 실시간으로 확인하실 수 있습니다.

추가로 수정하고 싶은 부분이 있으면 말씀해주세요!`;
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900 text-white"><div className="text-4xl animate-spin">⚙️</div></div>}>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 프로젝트 로드
  useEffect(() => {
    if (!getUser()) { window.location.href = '/login'; return; }
    if (!projectId) { window.location.href = '/dashboard'; return; }

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
            // 초기 메시지
            setMessages([{
              id: '1',
              role: 'assistant',
              content: `프로젝트 "${data.name}"의 빌더에 오신 것을 환영합니다!

**템플릿**: ${data.template === 'beauty-salon' ? '✂️ 미용실 POS' : data.template === 'ecommerce' ? '🛒 쇼핑몰' : '📅 예약/CRM'}

어떤 기능을 추가하거나 커스터마이즈하고 싶으신가요? 자유롭게 설명해주세요.

**예시:**
- "고객별 포인트 적립 기능 추가해줘"
- "예약 시 알림톡 보내는 기능"
- "다크 모드 지원"`,
              timestamp: new Date().toISOString(),
              type: 'text',
            }]);
            setBuildPhase('designing');
          }
        }
      } catch { /* redirect by authFetch */ }
    })();
  }, [projectId]);

  // 채팅 히스토리 자동 저장 (디바운스)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    // 미리보기 템플릿 감지
    const lower = input.toLowerCase();
    if (lower.includes('미용실') || lower.includes('헤어') || lower.includes('살롱')) {
      setPreviewTemplate('beauty-salon');
    } else if (lower.includes('쇼핑몰') || lower.includes('커머스') || lower.includes('상품')) {
      setPreviewTemplate('ecommerce');
    } else if (lower.includes('예약') || lower.includes('병원') || lower.includes('피트니스')) {
      setPreviewTemplate('booking-crm');
    }

    // AI 응답 시뮬레이션 (API 연동 전)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

    const aiResponse = getAIResponse(input);
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    const updatedMessages = [...newMessages, aiMsg];
    setMessages(updatedMessages);
    setIsTyping(false);
    saveChatHistory(updatedMessages);
  };

  const handleGenerate = async () => {
    setBuildPhase('generating');

    // 프로젝트 상태를 generating으로 업데이트
    if (projectId) {
      await authFetch(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'generating' }),
      });
    }

    const statusMsg: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: '앱을 생성하고 있습니다...',
      timestamp: new Date().toISOString(),
      type: 'status',
    };
    setMessages(prev => [...prev, statusMsg]);

    // 생성 시뮬레이션
    const steps = [
      '📐 아키텍처 설계 중...',
      '🗄️ 데이터베이스 스키마 생성 중...',
      '⚙️ 백엔드 API 생성 중...',
      '🎨 프론트엔드 UI 생성 중...',
      '🔐 인증 시스템 설정 중...',
      '앱 생성 완료!',
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: step,
          timestamp: new Date().toISOString(),
          type: 'status',
        },
      ]);
    }

    setBuildPhase('done');

    const doneMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `앱이 성공적으로 생성되었습니다!

**생성된 항목:**
- 프론트엔드: 5개 페이지
- 백엔드: 12개 API 엔드포인트
- 데이터베이스: 6개 테이블
- 인증: JWT + 소셜 로그인

**다음 단계:**
1. 왼쪽 미리보기에서 앱을 확인하세요
2. 수정이 필요하면 채팅으로 말씀해주세요
3. 완료되면 "배포" 버튼을 눌러주세요`,
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    setMessages(prev => {
      const final = [...prev, doneMsg];
      saveChatHistory(final);
      return final;
    });

    // 프로젝트 상태를 active로 업데이트
    if (projectId) {
      await authFetch(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });
    }
  };

  // 미리보기 HTML
  const previewHtml: Record<string, string> = {
    'beauty-salon': `<div style="font-family:system-ui;background:#f8fafc;min-height:100vh;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h1 style="font-size:20px;font-weight:700">💇 미용실 POS</h1><span style="background:#3b82f6;color:white;padding:4px 12px;border-radius:6px;font-size:12px">관리자</span></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px"><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 매출</div><div style="font-size:22px;font-weight:700">₩1,280,000</div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:22px;font-weight:700">12건</div></div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:14px;font-weight:600;margin-bottom:12px">예약 현황</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">10:00 김지현 - 커트+염색</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">11:30 이서윤 - 디지털펌</div><div style="font-size:13px;padding:8px 0">13:00 박민준 - 남성 커트</div></div></div>`,
    'ecommerce': `<div style="font-family:system-ui;min-height:100vh"><div style="background:#1e293b;color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-size:14px"><span style="font-weight:700">🛍 STYLE SHOP</span><span>🛒 3</span></div><div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px 20px;text-align:center;color:white"><div style="font-size:24px;font-weight:700">SPRING SALE</div><div style="font-size:14px;opacity:.8;margin-top:4px">최대 30% OFF</div></div><div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px"><div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"><div style="background:#fef3c7;padding:32px;text-align:center;font-size:36px">👗</div><div style="padding:12px"><div style="font-weight:600;font-size:13px">린넨 원피스</div><div style="color:#ef4444;font-weight:700;font-size:14px">₩62,300</div></div></div><div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"><div style="background:#dbeafe;padding:32px;text-align:center;font-size:36px">👜</div><div style="padding:12px"><div style="font-weight:600;font-size:13px">미니 크로스백</div><div style="color:#ef4444;font-weight:700;font-size:14px">₩31,500</div></div></div></div></div>`,
    'booking-crm': `<div style="font-family:system-ui;background:#f0fdf4;min-height:100vh;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h1 style="font-size:20px;font-weight:700">🏥 예약 시스템</h1><span style="background:#16a34a;color:white;padding:4px 12px;border-radius:6px;font-size:12px">원장님</span></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px"><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:22px;font-weight:700">18건</div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">온라인 예약</div><div style="font-size:22px;font-weight:700">34%</div></div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:14px;font-weight:600;margin-bottom:12px">진료 일정</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">09:00 김철수 - 일반 진료</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">09:30 박영희 - 건강검진</div><div style="font-size:13px;padding:8px 0">10:00 이민호 - 재활치료</div></div></div>`,
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* 왼쪽: 실시간 미리보기 */}
      <div className="hidden w-[45%] flex-col border-r border-gray-700/50 lg:flex">
        <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
          <span className="text-sm font-medium text-gray-400">실시간 미리보기</span>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-500">저장 중...</span>}
            {previewTemplate && (
              <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                {buildPhase === 'done' ? '생성 완료' : buildPhase === 'generating' ? '생성 중...' : '설계 중'}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-800 p-4">
          {previewTemplate ? (
            <div className="mx-auto w-[375px] overflow-hidden rounded-2xl border border-gray-600 bg-white shadow-2xl" style={{ height: '700px' }}>
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}</style></head><body>${previewHtml[previewTemplate] || ''}</body></html>`}
                className="h-full w-full border-0"
                title="Live Preview"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-gray-500">
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
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-lg font-bold">
              <span className="text-blue-400">Launch</span>pad
            </a>
            {project && (
              <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                {project.name}
              </span>
            )}
            <div className="flex rounded-lg bg-gray-800 p-0.5">
              <button
                onClick={() => setMode('build')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  mode === 'build' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                빌드
              </button>
              <button
                onClick={() => setMode('discuss')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  mode === 'discuss' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                토론
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {buildPhase === 'designing' && (
              <button
                onClick={handleGenerate}
                className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-bold hover:bg-green-500 transition animate-pulse"
              >
                앱 생성하기
              </button>
            )}
            {buildPhase === 'done' && (
              <button className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold hover:bg-blue-500 transition">
                배포하기
              </button>
            )}
            <a href="/dashboard" className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600 transition">
              프로젝트 목록
            </a>
          </div>
        </header>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.type === 'status'
                        ? 'bg-gray-800/50 text-gray-400 text-xs py-2'
                        : 'bg-gray-800 text-gray-200'
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
                <div className="rounded-2xl bg-gray-800 px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 입력 */}
        <div className="border-t border-gray-700/50 px-4 py-3">
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={mode === 'build' ? '만들고 싶은 기능을 설명해주세요...' : '아이디어를 자유롭게 이야기해보세요...'}
              className="flex-1 rounded-xl bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none ring-1 ring-gray-700 focus:ring-blue-500 transition"
              disabled={isTyping}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-gray-600">
            {mode === 'build' ? 'AI가 앱을 생성합니다. 생성된 앱은 수정/배포할 수 있습니다.' : '토론 모드에서는 실제 앱에 영향을 주지 않습니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}
