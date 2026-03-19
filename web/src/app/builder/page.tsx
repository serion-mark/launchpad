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
    { id: 'target', question: '주 고객층은 어떻게 되나요?', chips: ['여성 전문', '남성 전문', '남녀 공용', '키즈 포함'], multi: true },
    { id: 'staff', question: '디자이너(스태프)는 몇 명인가요?', chips: ['1명 (1인샵)', '2~5명', '6~10명', '10명 이상'] },
    { id: 'booking', question: '어떤 예약 방식이 필요한가요?', chips: ['전화 예약', '온라인 예약', '카카오톡 예약', '워크인(현장 접수)'], multi: true },
    { id: 'features', question: '꼭 필요한 기능을 골라주세요!', chips: ['매출/정산 관리', '고객 CRM', '포인트 적립', '알림톡 발송', '재고 관리', '디자이너 성과'], multi: true },
    { id: 'pain', question: '현재 가장 불편한 점은?', chips: ['예약 관리가 복잡해요', '매출 정산이 어려워요', '고객 기록이 없어요', '노쇼가 많아요'], multi: true },
  ],
  'ecommerce': [
    { id: 'biz_name', question: '쇼핑몰 이름이 뭔가요?', chips: ['스타일샵', '○○ 마켓', '핸드메이드 스토어'] },
    { id: 'product', question: '어떤 상품을 판매하시나요?', chips: ['의류/패션', '뷰티/화장품', '식품/음료', '전자제품', '핸드메이드/공예'], multi: true },
    { id: 'delivery', question: '배송 방식은?', chips: ['택배 배송', '당일 배송', '픽업 (직접 수령)', '디지털 상품 (다운로드)'], multi: true },
    { id: 'features', question: '필요한 기능을 골라주세요!', chips: ['장바구니', '쿠폰/할인', '리뷰/평점', '재고 관리', '회원 등급', '정기구독'], multi: true },
    { id: 'payment', question: '결제 수단은?', chips: ['카드 결제', '계좌이체', '네이버페이', '카카오페이'], multi: true },
    { id: 'pain', question: '가장 해결하고 싶은 문제는?', chips: ['상품 등록이 번거로워요', '주문 관리가 어려워요', '재고 파악이 안 돼요', '고객 CS가 힘들어요'], multi: true },
  ],
  'booking-crm': [
    { id: 'biz_name', question: '사업체 이름이 뭔가요?', chips: ['○○ 클리닉', '○○ 피트니스', '○○ 학원'] },
    { id: 'industry', question: '어떤 업종인가요?', chips: ['병원/클리닉', '피트니스/요가', '학원/교육', '식당/카페', '펜션/숙박'], multi: true },
    { id: 'staff', question: '스태프는 몇 명인가요?', chips: ['1명 (1인 운영)', '2~5명', '6~10명', '10명 이상'] },
    { id: 'booking_type', question: '예약 형태는?', chips: ['시간대별 예약', '날짜별 예약', '코스/프로그램 등록', '대기열 (순서대로)'], multi: true },
    { id: 'features', question: '필요한 기능은?', chips: ['온라인 예약 페이지', '고객 CRM', '매출 관리', '알림톡/SMS 발송', '출석 체크', '통계 대시보드'], multi: true },
    { id: 'pain', question: '가장 불편한 점은?', chips: ['예약 중복이 잦아요', '노쇼가 많아요', '고객 관리가 안 돼요', '매출 파악이 어려워요'], multi: true },
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
  const [projectFeatures, setProjectFeatures] = useState<string[]>([]); // 랜딩에서 선택한 기능
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
          // 랜딩에서 선택한 기능 로드
          if (data.features?.selected) {
            setProjectFeatures(data.features.selected);
          }

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

  // ── 테마 색상 ───────────────────────────────────────
  const THEME_MAP: Record<string, { accent: string; grad: string }> = {
    'basic-light': { accent: '#3b82f6', grad: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' },
    'basic-dark': { accent: '#3b82f6', grad: 'linear-gradient(135deg,#1e293b,#334155)' },
    'ocean-blue': { accent: '#0ea5e9', grad: 'linear-gradient(135deg,#0ea5e9,#06b6d4)' },
    'forest-green': { accent: '#16a34a', grad: 'linear-gradient(135deg,#16a34a,#059669)' },
    'warm-amber': { accent: '#d97706', grad: 'linear-gradient(135deg,#d97706,#ea580c)' },
    'rose-pink': { accent: '#f43f5e', grad: 'linear-gradient(135deg,#f43f5e,#ec4899)' },
    'minimal-swiss': { accent: '#ef4444', grad: 'linear-gradient(135deg,#1e293b,#0f172a)' },
    'korean-naver': { accent: '#03C75A', grad: 'linear-gradient(135deg,#03C75A,#16a34a)' },
    'korean-kakao': { accent: '#FEE500', grad: 'linear-gradient(135deg,#3B1E1E,#5C3A2E)' },
    'luxury-marble': { accent: '#a78bfa', grad: 'linear-gradient(135deg,#1e1b2e,#312e4a)' },
    'neon-cyber': { accent: '#22d3ee', grad: 'linear-gradient(135deg,#0f172a,#1e1b4b)' },
  };
  const tm = THEME_MAP[project?.theme || 'basic-light'] || THEME_MAP['basic-light'];

  // ── 기능 라벨 맵 ────────────────────────────────────
  const FEAT_LABEL: Record<string, string> = {
    'reservation': '📅 예약', 'sales': '💰 매출', 'customer': '👥 고객', 'staff': '👤 스태프',
    'service-menu': '✂️ 시술', 'dashboard': '📊 대시보드', 'online-booking': '🌐 온라인예약',
    'alimtalk': '💬 알림톡', 'settlement': '📋 정산', 'prepaid': '🎫 정액권',
    'admin-dashboard': '📊 대시보드', 'attendance': '✅ 출석', 'coupon': '🎟 쿠폰',
    'review': '⭐ 리뷰', 'wishlist': '❤️ 찜', 'inventory': '📦 재고',
    'product': '🛍 상품', 'cart': '🛒 장바구니', 'order': '📋 주문', 'shipping': '🚚 배송',
  };

  // ── 답변 기반 동적 랜딩페이지 생성 (무료 맛보기) ────
  const generateDynamicPreview = (): string => {
    const name = answers.biz_name || project?.name || '내 서비스';

    // 빌더 질문지 답변 기능 + 랜딩에서 선택한 기능 합산
    const answerFeatures = (answers.features || '').split(', ').filter(Boolean);
    const allFeatureIds = projectFeatures.length > 0 ? projectFeatures : [];
    const featureNames = answerFeatures.length > 0 ? answerFeatures :
      allFeatureIds.map(id => FEAT_LABEL[id]?.replace(/^.{2}/, '') || id);

    const featureCards = featureNames.map(f =>
      `<div style="background:white;padding:14px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:8px;background:${tm.accent};display:flex;align-items:center;justify-content:center;color:white;font-size:16px;flex-shrink:0">✓</div><div style="font-size:13px;font-weight:500">${f}</div></div>`
    ).join('');

    // 하단 메뉴바 생성
    const menuIds = allFeatureIds.length > 0 ? allFeatureIds.slice(0, 5) : [];
    const menuBar = menuIds.length > 0 ? `<div style="border-top:1px solid #e2e8f0;display:flex;padding:6px 8px;background:white;position:sticky;bottom:0">${
      menuIds.map((id, i) => `<div style="flex:1;text-align:center;padding:6px 2px;font-size:10px;${i === 0 ? `color:${tm.accent};font-weight:700` : 'color:#94a3b8'}">${FEAT_LABEL[id] || id}</div>`).join('')
    }</div>` : '';

    if (templateId === 'beauty-salon') {
      const target = answers.target || '남녀 공용';
      const staff = answers.staff || '';
      const booking = answers.booking || '';
      return `<div style="font-family:system-ui;background:#f8fafc;min-height:100vh;display:flex;flex-direction:column">
        <div style="background:${tm.grad};padding:28px 20px;color:white">
          <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">✂️ ${name}</h1>
          <p style="font-size:12px;opacity:.8">${target} · ${staff}</p>
        </div>
        <div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px">
          <div style="background:white;padding:14px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">오늘 매출</div><div style="font-size:20px;font-weight:700;color:${tm.accent}">₩1,280,000</div></div>
          <div style="background:white;padding:14px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">오늘 예약</div><div style="font-size:20px;font-weight:700;color:${tm.accent}">12건</div></div>
        </div>
        ${booking ? `<div style="padding:0 16px 8px"><div style="background:#eef2ff;padding:10px 14px;border-radius:8px;font-size:11px;color:#4338ca">예약 방식: ${booking}</div></div>` : ''}
        <div style="padding:0 16px;flex:1"><div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#1e293b">포함된 기능</div><div style="display:grid;gap:8px">${featureCards || '<div style="color:#94a3b8;font-size:12px">질문지를 완료하면 기능이 표시됩니다</div>'}</div></div>
        ${menuBar}
      </div>`;
    }

    if (templateId === 'ecommerce') {
      const product = answers.product || '상품';
      const delivery = answers.delivery || '';
      const payment = answers.payment || '';
      return `<div style="font-family:system-ui;min-height:100vh;background:#f8fafc;display:flex;flex-direction:column">
        <div style="background:#1e293b;color:white;padding:14px 20px;display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;font-size:16px">🛍 ${name}</span><span style="background:${tm.accent};padding:4px 10px;border-radius:20px;font-size:11px">🛒 장바구니</span></div>
        <div style="background:${tm.grad};padding:32px 20px;text-align:center;color:white"><div style="font-size:20px;font-weight:700">GRAND OPEN</div><div style="font-size:12px;opacity:.8;margin-top:4px">${product} 전문 쇼핑몰</div></div>
        <div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
          <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:white"><div style="background:#fef3c7;padding:28px;text-align:center;font-size:32px">👗</div><div style="padding:10px"><div style="font-weight:600;font-size:12px">인기 상품 A</div><div style="color:#ef4444;font-weight:700;font-size:13px">₩39,900</div></div></div>
          <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:white"><div style="background:#dbeafe;padding:28px;text-align:center;font-size:32px">👜</div><div style="padding:10px"><div style="font-weight:600;font-size:12px">인기 상품 B</div><div style="color:#ef4444;font-weight:700;font-size:13px">₩25,000</div></div></div>
        </div>
        <div style="padding:0 16px;flex:1"><div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#1e293b">포함된 기능</div><div style="display:grid;gap:8px">${featureCards}</div></div>
        ${menuBar}
      </div>`;
    }

    // booking-crm
    const industry = answers.industry || '예약';
    const bookingType = answers.booking_type || '';
    return `<div style="font-family:system-ui;background:#f8fafc;min-height:100vh;display:flex;flex-direction:column">
      <div style="background:${tm.grad};padding:28px 20px;color:white">
        <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">📅 ${name}</h1>
        <p style="font-size:12px;opacity:.8">${industry} · ${bookingType}</p>
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px">
        <div style="background:white;padding:14px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">오늘 예약</div><div style="font-size:20px;font-weight:700;color:${tm.accent}">18건</div></div>
        <div style="background:white;padding:14px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06);text-align:center"><div style="font-size:10px;color:#64748b">온라인 비율</div><div style="font-size:20px;font-weight:700;color:${tm.accent}">34%</div></div>
      </div>
      <div style="padding:0 16px;flex:1"><div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#1e293b">포함된 기능</div><div style="display:grid;gap:8px">${featureCards || '<div style="color:#94a3b8;font-size:12px">질문지를 완료하면 기능이 표시됩니다</div>'}</div></div>
      ${menuBar}
    </div>`;
  };

  const previewHtml = generateDynamicPreview();

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
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}</style></head><body>${previewHtml}</body></html>`}
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
