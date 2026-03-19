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
};

// ── 업종별 질문지 ────────────────────────────────────
type Question = {
  id: string;
  question: string;
  chips: string[];
  multi?: boolean; // 복수 선택 가능
};

const QUESTIONNAIRES: Record<string, Question[]> = {
  'beauty-salon': [
    { id: 'biz_name', question: '매장(서비스) 이름이 뭔가요?', chips: ['헤어살롱 뷰티', '스타일 스튜디오', '○○ 헤어'] },
    { id: 'target', question: '주 고객층은 어떻게 되나요?', chips: ['여성 전문', '남성 전문', '남녀 공용', '키즈 포함'] },
    { id: 'staff', question: '디자이너(스태프)는 몇 명인가요?', chips: ['1명 (1인샵)', '2~5명', '6~10명', '10명 이상'] },
    { id: 'booking', question: '어떤 예약 방식이 필요한가요?', chips: ['전화 예약', '온라인 예약', '카카오톡 예약', '워크인(현장 접수)'], multi: true },
    { id: 'features', question: '꼭 필요한 기능을 골라주세요!', chips: ['매출/정산 관리', '고객 CRM', '포인트 적립', '알림톡 발송', '재고 관리', '디자이너 성과'], multi: true },
    { id: 'pain', question: '현재 가장 불편한 점은?', chips: ['예약 관리가 복잡해요', '매출 정산이 어려워요', '고객 기록이 없어요', '노쇼가 많아요'] },
  ],
  'ecommerce': [
    { id: 'biz_name', question: '쇼핑몰 이름이 뭔가요?', chips: ['스타일샵', '○○ 마켓', '핸드메이드 스토어'] },
    { id: 'product', question: '어떤 상품을 판매하시나요?', chips: ['의류/패션', '뷰티/화장품', '식품/음료', '전자제품', '핸드메이드/공예'] },
    { id: 'delivery', question: '배송 방식은?', chips: ['택배 배송', '당일 배송', '픽업 (직접 수령)', '디지털 상품 (다운로드)'], multi: true },
    { id: 'features', question: '필요한 기능을 골라주세요!', chips: ['장바구니', '쿠폰/할인', '리뷰/평점', '재고 관리', '회원 등급', '정기구독'], multi: true },
    { id: 'payment', question: '결제 수단은?', chips: ['카드 결제', '계좌이체', '네이버페이', '카카오페이'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['상품 등록이 번거로워요', '주문 관리가 어려워요', '재고 파악이 안 돼요', '고객 CS가 힘들어요'] },
  ],
  'booking-crm': [
    { id: 'biz_name', question: '사업체 이름이 뭔가요?', chips: ['○○ 클리닉', '○○ 피트니스', '○○ 학원'] },
    { id: 'industry', question: '어떤 업종인가요?', chips: ['병원/클리닉', '피트니스/요가', '학원/교육', '식당/카페', '펜션/숙박'] },
    { id: 'staff', question: '스태프는 몇 명인가요?', chips: ['1명 (1인 운영)', '2~5명', '6~10명', '10명 이상'] },
    { id: 'booking_type', question: '예약 형태는?', chips: ['시간대별 예약', '날짜별 예약', '코스/프로그램 등록', '대기열 (순서대로)'] },
    { id: 'features', question: '필요한 기능은?', chips: ['온라인 예약 페이지', '고객 CRM', '매출 관리', '알림톡/SMS 발송', '출석 체크', '통계 대시보드'], multi: true },
    { id: 'pain', question: '가장 불편한 점은?', chips: ['예약 중복이 잦아요', '노쇼가 많아요', '고객 관리가 안 돼요', '매출 파악이 어려워요'] },
  ],
};

// ── AI API 호출 ──────────────────────────────────────
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
    if (!res.ok) return `AI 응답 오류 (${res.status}). 다시 시도해주세요.`;
    const data = await res.json();
    return data.content;
  } catch {
    return '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
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
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      } catch { /* */ }
      setSaving(false);
    }, 2000);
  };

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
        content: `질문지 완료! 답변을 정리했습니다:\n\n${summary}\n\n이 내용을 기반으로 앱을 설계합니다.\n추가 요구사항이 있으면 자유롭게 말씀해주세요.\n준비되셨으면 **"앱 생성하기"** 버튼을 눌러주세요!`,
        timestamp: new Date().toISOString(), type: 'text',
      };
      const updated = [...messages, userMsg, completeMsg];
      setMessages(updated);
      setBuildPhase('designing');
      saveChatHistory(updated);
    }
  };

  // ── 칩 클릭 (복수선택 지원) ────────────────────────
  const [selectedChips, setSelectedChips] = useState<string[]>([]);

  const handleChipClick = (chip: string) => {
    const currentQ = questions[questionIndex];
    if (currentQ?.multi) {
      // 복수 선택: 토글
      const newSelected = selectedChips.includes(chip)
        ? selectedChips.filter(c => c !== chip)
        : [...selectedChips, chip];
      setSelectedChips(newSelected);
    } else {
      // 단일 선택: 바로 전송
      handleAnswer(chip);
    }
  };

  const submitMultiChips = () => {
    if (selectedChips.length > 0) {
      handleAnswer(selectedChips.join(', '));
      setSelectedChips([]);
    }
  };

  // ── 자유 대화 (AI 연동) ────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || isTyping || !projectId) return;

    // 질문지 모드에서 직접 입력
    if (buildPhase === 'questionnaire') {
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

    const chatHistory = newMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const aiContent = await callAiChat({
      projectId,
      message: input.trim(),
      chatHistory: chatHistory.slice(-10),
      template: templateId,
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

  // ── 앱 생성 ──────────────────────────────────────
  const handleGenerate = async () => {
    if (!projectId) return;
    setBuildPhase('generating');

    await authFetch(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'generating' }),
    });

    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'system',
      content: '📐 AI가 앱 아키텍처를 설계하고 있습니다...', timestamp: new Date().toISOString(), type: 'status',
    }]);

    const chatHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const result = await callAiGenerate({ projectId, chatHistory, template: templateId });

    if (!result) {
      setBuildPhase('designing');
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: '크레딧이 부족합니다! 앱을 생성하려면 크레딧을 충전해주세요.\n\n[크레딧 충전하기 →](/credits)',
        timestamp: new Date().toISOString(), type: 'text',
      }]);
      await authFetch(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ status: 'draft' }) });
      return;
    }

    setBuildPhase('done');
    const arch = result.architecture;

    setMessages(prev => {
      const final = [...prev, {
        id: Date.now().toString(), role: 'assistant' as const,
        content: `${result.isFreeTrial ? '**맛보기 설계안 (무료 1회)**\n\n' : ''}앱 아키텍처가 설계되었습니다!\n\n**${arch.appName || '앱'}**\n${arch.description || ''}\n\n**설계된 구성:**\n- 프론트엔드: ${arch.pages?.length || 0}개 페이지\n- 백엔드: ${arch.apiEndpoints?.length || 0}개 API\n- 데이터베이스: ${arch.dbModels?.length || 0}개 테이블\n- 주요 기능: ${(arch.features || []).join(', ')}\n\n수정이 필요하면 채팅으로 말씀해주세요.\n완료되면 "배포" 또는 "다운로드" 버튼을 이용하세요.`,
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
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: Date.now().toString(), role: 'assistant',
          content: `배포가 완료되었습니다!\n\n**URL**: ${data.deployedUrl}\n**서브도메인**: ${data.subdomain}`,
          timestamp: new Date().toISOString(), type: 'text',
        }]);
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
      for (const file of manifest.files) zip.file(file.path, file.content);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${manifest.projectName}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* */ }
  };

  // ── 미리보기 HTML ─────────────────────────────────
  const previewHtml: Record<string, string> = {
    'beauty-salon': `<div style="font-family:system-ui;background:#f8fafc;min-height:100vh;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h1 style="font-size:20px;font-weight:700">💇 ${answers.biz_name || '미용실 POS'}</h1><span style="background:#3b82f6;color:white;padding:4px 12px;border-radius:6px;font-size:12px">관리자</span></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px"><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 매출</div><div style="font-size:22px;font-weight:700">₩1,280,000</div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:22px;font-weight:700">12건</div></div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:14px;font-weight:600;margin-bottom:12px">예약 현황</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">10:00 김지현 - 커트+염색</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">11:30 이서윤 - 디지털펌</div><div style="font-size:13px;padding:8px 0">13:00 박민준 - 남성 커트</div></div></div>`,
    'ecommerce': `<div style="font-family:system-ui;min-height:100vh"><div style="background:#1e293b;color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;font-size:14px"><span style="font-weight:700">🛍 ${answers.biz_name || 'STYLE SHOP'}</span><span>🛒 3</span></div><div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px 20px;text-align:center;color:white"><div style="font-size:24px;font-weight:700">SPRING SALE</div><div style="font-size:14px;opacity:.8;margin-top:4px">최대 30% OFF</div></div><div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px"><div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"><div style="background:#fef3c7;padding:32px;text-align:center;font-size:36px">👗</div><div style="padding:12px"><div style="font-weight:600;font-size:13px">린넨 원피스</div><div style="color:#ef4444;font-weight:700;font-size:14px">₩62,300</div></div></div><div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"><div style="background:#dbeafe;padding:32px;text-align:center;font-size:36px">👜</div><div style="padding:12px"><div style="font-weight:600;font-size:13px">미니 크로스백</div><div style="color:#ef4444;font-weight:700;font-size:14px">₩31,500</div></div></div></div></div>`,
    'booking-crm': `<div style="font-family:system-ui;background:#f0fdf4;min-height:100vh;padding:20px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h1 style="font-size:20px;font-weight:700">🏥 ${answers.biz_name || '예약 시스템'}</h1><span style="background:#16a34a;color:white;padding:4px 12px;border-radius:6px;font-size:12px">원장님</span></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px"><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">오늘 예약</div><div style="font-size:22px;font-weight:700">18건</div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:11px;color:#64748b">온라인 예약</div><div style="font-size:22px;font-weight:700">34%</div></div></div><div style="background:white;padding:16px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><div style="font-size:14px;font-weight:600;margin-bottom:12px">진료 일정</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">09:00 김철수 - 일반 진료</div><div style="font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9">09:30 박영희 - 건강검진</div><div style="font-size:13px;padding:8px 0">10:00 이민호 - 재활치료</div></div></div>`,
  };

  // 현재 질문의 칩 (마지막 assistant 메시지)
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.chips);
  const currentChips = buildPhase === 'questionnaire' ? lastAssistantMsg?.chips || [] : [];
  const currentQ = buildPhase === 'questionnaire' ? questions[questionIndex] : null;

  return (
    <div className="flex h-screen bg-[#17171c] text-[#f2f4f6]">
      {/* 왼쪽: 실시간 미리보기 */}
      <div className="hidden w-[45%] flex-col border-r border-[#2c2c35] lg:flex">
        <div className="flex items-center justify-between border-b border-[#2c2c35] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#8b95a1]">미리보기</span>
            {/* PC/모바일 전환 탭 */}
            <div className="flex rounded-lg bg-[#2c2c35] p-0.5">
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${previewMode === 'mobile' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'}`}
              >📱 모바일</button>
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${previewMode === 'desktop' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1] hover:text-[#f2f4f6]'}`}
              >🖥 PC</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-[#6b7684]">저장 중...</span>}
            {buildPhase === 'questionnaire' && (
              <span className="rounded-lg bg-[#a855f7]/15 px-2.5 py-1 text-xs font-medium text-[#a855f7]">
                질문 {questionIndex + 1}/{questions.length}
              </span>
            )}
            {previewTemplate && buildPhase !== 'questionnaire' && (
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                buildPhase === 'done' ? 'bg-[#30d158]/15 text-[#30d158]'
                  : buildPhase === 'generating' ? 'bg-[#ffd60a]/15 text-[#ffd60a]'
                  : 'bg-[#3182f6]/15 text-[#3182f6]'
              }`}>
                {buildPhase === 'done' ? '생성 완료' : buildPhase === 'generating' ? '생성 중...' : '설계 중'}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#1b1b21] p-5">
          {previewTemplate ? (
            <div
              className={`mx-auto overflow-hidden border border-[#2c2c35] bg-white shadow-2xl transition-all duration-300 ${
                previewMode === 'mobile' ? 'w-[375px] rounded-[2.5rem]' : 'w-full max-w-[800px] rounded-xl'
              }`}
              style={{ height: previewMode === 'mobile' ? '700px' : '600px' }}
            >
              {/* 모바일 노치 */}
              {previewMode === 'mobile' && (
                <div className="flex h-[44px] items-center justify-center bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <div className="h-[5px] w-[120px] rounded-full bg-[#1b1b21]" />
                </div>
              )}
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}</style></head><body>${previewHtml[previewTemplate] || ''}</body></html>`}
                className="w-full border-0"
                style={{ height: previewMode === 'mobile' ? '656px' : '600px' }}
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
            <a href="/dashboard"><img src="/logo.svg" alt="Foundry" className="h-6" /></a>
            {project && (
              <span className="rounded-lg bg-[#2c2c35] px-2.5 py-1 text-xs text-[#8b95a1]">{project.name}</span>
            )}
            {buildPhase !== 'questionnaire' && (
              <div className="flex rounded-xl bg-[#2c2c35] p-0.5">
                <button onClick={() => setMode('build')} className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${mode === 'build' ? 'bg-[#3182f6] text-white' : 'text-[#8b95a1]'}`}>빌드</button>
                <button onClick={() => setMode('discuss')} className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${mode === 'discuss' ? 'bg-[#a855f7] text-white' : 'text-[#8b95a1]'}`}>토론</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {creditBalance !== null && (
              <a href="/credits" className="flex items-center gap-1.5 rounded-lg bg-[#2c2c35] px-3 py-1.5 text-xs font-medium text-[#ffd60a] hover:bg-[#3a3a45] transition-colors">
                <span>⚡</span><span>{creditBalance.toLocaleString()}</span>
              </a>
            )}
            {buildPhase === 'designing' && (
              <button onClick={handleGenerate} className="rounded-xl bg-[#30d158] px-5 py-2 text-sm font-bold text-white hover:bg-[#28b84c] transition-colors animate-pulse">앱 생성하기</button>
            )}
            {buildPhase === 'done' && (
              <>
                <button onClick={handleDeploy} className="rounded-xl bg-[#3182f6] px-5 py-2 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors">배포하기</button>
                <button onClick={handleDownload} className="rounded-xl bg-[#a855f7] px-4 py-2 text-sm font-bold text-white hover:bg-[#9333ea] transition-colors">다운로드</button>
              </>
            )}
            <a href="/dashboard" className="rounded-xl bg-[#2c2c35] px-4 py-2 text-sm font-medium text-[#8b95a1] hover:text-[#f2f4f6] hover:bg-[#3a3a45] transition-colors">프로젝트 목록</a>
          </div>
        </header>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-[#3182f6] text-white'
                    : msg.type === 'status' ? 'bg-[#2c2c35] text-[#8b95a1] text-xs py-2.5'
                    : 'bg-[#1b1b21] border border-[#2c2c35] text-[#f2f4f6]'
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
              <div className="flex flex-wrap gap-2 pl-2">
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
                {currentQ?.multi && selectedChips.length > 0 && (
                  <button
                    onClick={submitMultiChips}
                    className="rounded-xl bg-[#3182f6] px-5 py-2 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors"
                  >
                    선택 완료 ({selectedChips.length}개)
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

        {/* 입력 */}
        <div className="border-t border-[#2c2c35] px-5 py-4">
          <div className="mx-auto flex max-w-2xl gap-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={buildPhase === 'questionnaire' ? '직접 입력하거나 위 보기를 클릭하세요...' : mode === 'build' ? '추가 기능이나 수정사항을 말씀해주세요...' : '아이디어를 자유롭게 이야기해보세요...'}
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
            {buildPhase === 'questionnaire' ? `질문 ${questionIndex + 1}/${questions.length} — 보기를 클릭하거나 직접 입력하세요` : 'AI가 앱을 생성합니다. 생성된 앱은 수정/배포할 수 있습니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}
