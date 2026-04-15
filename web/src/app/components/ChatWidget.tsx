'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { API_BASE } from '@/lib/api';

// ── FAQ 데이터 ──
const FAQ: { keywords: string[]; answer: string; link?: { label: string; href: string } }[] = [
  {
    keywords: ['가격', '얼마', '비용', '돈', '크레딧', '무료'],
    answer: '크레딧 충전 방식입니다. 앱 1개당 약 10~30만원이면 충분해요. 회원가입 시 500 크레딧을 무료로 드립니다!',
    link: { label: '가격표 보기', href: '/pricing' },
  },
  {
    keywords: ['시간', '얼마나', '오래', '며칠', '기간', '몇분'],
    answer: 'AI가 약 20~40분이면 풀스택 앱을 생성합니다. 질문 답변 포함해도 30분이면 충분해요! 생성 중에도 AI 상담이 가능합니다.',
  },
  {
    keywords: ['코드', '소유', '다운로드', '소스', 'zip', '내꺼'],
    answer: '생성된 코드는 100% 사용자 소유입니다. ZIP으로 전체 소스코드를 다운로드할 수 있고, 개발자에게 바로 인수인계 가능합니다.',
    link: { label: '환불/소유권 정책 보기', href: '/refund' },
  },
  {
    keywords: ['환불', '취소', '반환'],
    answer: '미사용 크레딧은 7일 이내 전액 환불 가능합니다. 자세한 내용은 환불 정책을 확인해주세요.',
    link: { label: '환불 정책 보기', href: '/refund' },
  },
  {
    keywords: ['정부', '지원', '사업비', '예창패', '초창패', '정산', '사업'],
    answer: '정부지원사업(예창패/초창패) 개발비 항목으로 정산 가능합니다. 세금계산서 발행도 됩니다. 실질적으로 무료 MVP!',
  },
  {
    keywords: ['기술', '스택', 'next', 'supabase', '어떤', '기술로'],
    answer: 'Next.js + Supabase + Tailwind CSS로 생성됩니다. 전 세계 개발자 1위 스택이라 유지보수/인수인계가 쉽습니다.',
  },
  {
    keywords: ['외주', '개발사', '에이전시', '견적'],
    answer: '외주 3,000만원짜리 MVP를 30만원에 만들 수 있습니다. Foundry로 MVP를 먼저 만들고, 외주사 미팅에서 시연하면 견적 협상에도 유리합니다.',
  },
  {
    keywords: ['매칭', '소개팅', '소셜', '동호회', '커뮤니티'],
    answer: '매칭앱, 소셜앱 모두 만들 수 있어요! 프로필/좋아요/채팅/그룹 기능까지 자동 생성됩니다.',
    link: { label: '매칭앱 예시 보기', href: '/portfolio' },
  },
  {
    keywords: ['쇼핑', '커머스', '판매', '상품', '배송', '주문'],
    answer: '쇼핑몰도 물론 가능합니다! 상품관리, 장바구니, 주문/결제, 배송관리까지 자동 생성돼요.',
    link: { label: '쇼핑몰 예시 보기', href: '/portfolio' },
  },
  {
    keywords: ['예약', '미용', '병원', '클리닉', '살롱'],
    answer: '예약/CRM 앱은 Foundry의 대표 기능이에요! 실제로 운영 중인 세리온 POS도 같은 기술로 만들었습니다.',
    link: { label: '예약앱 예시 보기', href: '/portfolio' },
  },
  {
    keywords: ['농장', '스마트팜', '특산품', '산지', '농산물'],
    answer: '스마트팜 직판몰, 지역 특산품 쇼핑몰 모두 만들 수 있습니다! 상품등록부터 주문/배송까지 포함돼요.',
    link: { label: '지금 만들어보기', href: '/start' },
  },
  {
    keywords: ['헬스', '건강', '운동', '다이어트', '습관', '복약'],
    answer: '헬스케어/습관관리 앱도 가능합니다! 기록, 통계, 리마인더 알림까지 자동 생성돼요.',
    link: { label: '지금 만들어보기', href: '/start' },
  },
];

// ── 빠른 버튼 ──
const QUICK_BUTTONS = [
  { label: '매칭앱', message: '매칭앱도 만들 수 있나요?' },
  { label: '쇼핑몰', message: '쇼핑몰 만들고 싶어요' },
  { label: '예약앱', message: '예약관리 앱 가능한가요?' },
  { label: '가격 안내', message: '가격이 얼마예요?' },
];

interface Message {
  role: 'bot' | 'user';
  text: string;
  link?: { label: string; href: string };
}

function findAnswer(input: string): { answer: string; link?: { label: string; href: string } } {
  const lower = input.toLowerCase();
  for (const faq of FAQ) {
    if (faq.keywords.some(kw => lower.includes(kw))) {
      return { answer: faq.answer, link: faq.link };
    }
  }
  // 기본 응답
  if (lower.includes('만들') || lower.includes('가능') || lower.includes('되나')) {
    return {
      answer: '네, 만들 수 있습니다! Foundry는 질문에 답하기만 하면 AI가 앱을 자동 생성해드려요. 지금 바로 시작해보세요!',
      link: { label: '지금 만들어보기', href: '/start' },
    };
  }
  return {
    answer: '궁금한 점이 있으시군요! 어떤 앱을 만들고 싶으신지 알려주시면 더 자세히 안내해드릴게요. 아래 버튼을 눌러보셔도 좋습니다.',
  };
}

export default function ChatWidget({ bubbleColor }: { bubbleColor?: string } = {}) {
  const [mode, setMode] = useState<'chat' | 'inquiry' | 'inquiryDone'>('chat');
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', content: '' });
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryError, setInquiryError] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: '안녕하세요! Foundry 도우미입니다.\n어떤 앱을 만들고 싶으세요?',
    },
  ]);
  const [input, setInput] = useState('');
  const [showQuickButtons, setShowQuickButtons] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowQuickButtons(false);
    setIsLoading(true);

    try {
      const chatHistory = messages
        .filter(m => m.role === 'user' || m.role === 'bot')
        .slice(-10)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

      const res = await fetch('/api/ai/homepage-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), chatHistory }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', text: data.content }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleInquirySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInquiryError('');
    if (!inquiryForm.name.trim()) { setInquiryError('이름을 입력해주세요.'); return; }
    if (!inquiryForm.email.trim()) { setInquiryError('이메일을 입력해주세요.'); return; }
    if (!inquiryForm.content.trim()) { setInquiryError('문의 내용을 입력해주세요.'); return; }
    setInquiryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inquiryForm.name.trim(),
          email: inquiryForm.email.trim(),
          phone: inquiryForm.phone.trim() || undefined,
          content: inquiryForm.content.trim(),
          source: 'chatbot',
          metadata: { chatHistory: messages.map(m => ({ role: m.role, text: m.text })) },
        }),
      });
      if (!res.ok) throw new Error('전송 실패');
      setMode('inquiryDone');
      setInquiryForm({ name: '', email: '', phone: '', content: '' });
    } catch {
      setInquiryError('문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setInquiryLoading(false);
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${bubbleColor ? '' : 'bg-[var(--toss-blue)] text-white shadow-[#3182f6]/30 hover:bg-[var(--toss-blue-hover)]'}`}
        style={bubbleColor ? { background: bubbleColor, color: '#191f28', boxShadow: `0 10px 15px ${bubbleColor}50` } : undefined}
        aria-label="상담 챗봇"
      >
        {isOpen ? (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* 챗봇 창 */}
      {isOpen && (
        <div className="fixed bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[360px] max-w-[360px] rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(520px, calc(100vh - 140px))' }}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)] px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--toss-blue)]/20">
              <span className="text-lg">{mode === 'chat' ? 'F' : mode === 'inquiry' ? '?' : '!'}</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {mode === 'chat' ? 'Foundry 도우미' : mode === 'inquiry' ? '문의 남기기' : '접수 완료'}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">
                {mode === 'chat' ? '무엇이든 물어보세요' : mode === 'inquiry' ? '이메일로 답변드립니다' : '감사합니다'}
              </div>
            </div>
          </div>

          {/* ── 채팅 모드 ── */}
          {mode === 'chat' && (
            <>
              {/* 메시지 영역 */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: '200px' }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[var(--toss-blue)] text-white rounded-br-md'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'bot'
                        ? <MarkdownRenderer content={msg.text} />
                        : <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      }
                      {msg.link && (
                        <a
                          href={msg.link.href}
                          className={`mt-2 inline-block text-xs font-bold underline underline-offset-2 ${
                            msg.role === 'user' ? 'text-blue-100' : 'text-[var(--toss-blue)]'
                          }`}
                        >
                          {msg.link.label} &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 빠른 버튼 + 문의 남기기 */}
              {showQuickButtons && (
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {QUICK_BUTTONS.map(btn => (
                    <button
                      key={btn.label}
                      onClick={() => sendMessage(btn.message)}
                      className="rounded-full border border-[var(--toss-blue)]/30 bg-[var(--toss-blue)]/10 px-3.5 py-1.5 text-xs font-medium text-[var(--toss-blue)] hover:bg-[var(--toss-blue)]/20 transition-colors"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 문의 남기기 버튼 (항상 표시) */}
              <div className="px-4 pb-2">
                <button
                  onClick={() => setMode('inquiry')}
                  className="w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  문의 남기기
                </button>
              </div>

              {/* 입력 */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[var(--border-primary)] px-4 py-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="궁금한 점을 입력하세요..."
                  className="flex-1 rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:ring-1 focus:ring-[#3182f6]/50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--toss-blue)] text-white disabled:opacity-40 hover:bg-[var(--toss-blue-hover)] transition-colors"
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>

              {/* 하단 CTA */}
              <div className="border-t border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3">
                <a
                  href="/start"
                  className="block rounded-xl bg-[var(--toss-blue)] py-2.5 text-center text-sm font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors"
                >
                  지금 앱 만들어보기 &rarr;
                </a>
              </div>
            </>
          )}

          {/* ── 문의 남기기 모드 ── */}
          {mode === 'inquiry' && (
            <form onSubmit={handleInquirySubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={inquiryForm.name}
                  onChange={e => setInquiryForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="홍길동"
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:ring-1 focus:ring-[#3182f6]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  이메일 <span className="text-red-400">*</span>
                  <span className="font-normal text-[var(--text-tertiary)] ml-1">(답변받을 주소)</span>
                </label>
                <input
                  type="email"
                  value={inquiryForm.email}
                  onChange={e => setInquiryForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:ring-1 focus:ring-[#3182f6]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  전화번호 <span className="font-normal text-[var(--text-tertiary)]">(선택)</span>
                </label>
                <input
                  type="tel"
                  value={inquiryForm.phone}
                  onChange={e => setInquiryForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:ring-1 focus:ring-[#3182f6]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  문의 내용 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={inquiryForm.content}
                  onChange={e => setInquiryForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="궁금한 점이나 요청사항을 자유롭게 작성해주세요."
                  rows={4}
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:ring-1 focus:ring-[#3182f6]/50 resize-none"
                />
              </div>
              {inquiryError && (
                <p className="text-xs text-red-400">{inquiryError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('chat'); setInquiryError(''); }}
                  className="flex-1 rounded-xl border border-[var(--border-primary)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  &#8592; 돌아가기
                </button>
                <button
                  type="submit"
                  disabled={inquiryLoading}
                  className="flex-1 rounded-xl bg-[var(--toss-blue)] py-2.5 text-sm font-bold text-white hover:bg-[var(--toss-blue-hover)] transition-colors disabled:opacity-50"
                >
                  {inquiryLoading ? '전송 중...' : '보내기'}
                </button>
              </div>
            </form>
          )}

          {/* ── 문의 완료 모드 ── */}
          {mode === 'inquiryDone' && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">문의가 접수되었습니다!</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                입력하신 이메일로<br />빠르게 답변드리겠습니다.
              </p>
              <button
                onClick={() => setMode('chat')}
                className="rounded-xl border border-[var(--border-primary)] px-6 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                &#8592; 채팅으로 돌아가기
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
