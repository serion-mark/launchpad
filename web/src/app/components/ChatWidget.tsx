'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

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

export default function ChatWidget() {
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

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    const { answer, link } = findAnswer(text);
    const botMsg: Message = { role: 'bot', text: answer, link };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput('');
    setShowQuickButtons(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#3182f6] text-white shadow-lg shadow-[#3182f6]/30 hover:bg-[#1b64da] transition-all hover:scale-105 active:scale-95"
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
        <div className="fixed bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[360px] max-w-[360px] rounded-2xl border border-[#2c2c35] bg-[#1b1b21] shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(520px, calc(100vh - 140px))' }}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-3 border-b border-[#2c2c35] bg-[#17171c] px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3182f6]/20">
              <span className="text-lg">F</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[#f2f4f6]">Foundry 도우미</div>
              <div className="text-xs text-[#6b7684]">무엇이든 물어보세요</div>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: '200px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#3182f6] text-white rounded-br-md'
                      : 'bg-[#2c2c35] text-[#e5e7eb] rounded-bl-md'
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
                        msg.role === 'user' ? 'text-blue-100' : 'text-[#3182f6]'
                      }`}
                    >
                      {msg.link.label} &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 빠른 버튼 */}
          {showQuickButtons && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {QUICK_BUTTONS.map(btn => (
                <button
                  key={btn.label}
                  onClick={() => sendMessage(btn.message)}
                  className="rounded-full border border-[#3182f6]/30 bg-[#3182f6]/10 px-3.5 py-1.5 text-xs font-medium text-[#3182f6] hover:bg-[#3182f6]/20 transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* 입력 */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#2c2c35] px-4 py-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="궁금한 점을 입력하세요..."
              className="flex-1 rounded-xl bg-[#2c2c35] px-4 py-2.5 text-sm text-[#f2f4f6] placeholder-[#6b7684] outline-none focus:ring-1 focus:ring-[#3182f6]/50"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3182f6] text-white disabled:opacity-40 hover:bg-[#1b64da] transition-colors"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>

          {/* 하단 CTA */}
          <div className="border-t border-[#2c2c35] bg-[#17171c] px-4 py-3">
            <a
              href="/start"
              className="block rounded-xl bg-[#3182f6] py-2.5 text-center text-sm font-bold text-white hover:bg-[#1b64da] transition-colors"
            >
              지금 앱 만들어보기 &rarr;
            </a>
          </div>
        </div>
      )}
    </>
  );
}
