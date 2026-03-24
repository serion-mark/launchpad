'use client';

import { useState } from 'react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';

const TABS = [
  { id: 'start', label: '🚀 시작하기' },
  { id: 'manage', label: '📋 운영 가이드' },
  { id: 'ai', label: '🤖 AI 활용법' },
  { id: 'faq', label: '❓ FAQ' },
];

const FAQ_LIST = [
  { q: '무료로 사용할 수 있나요?', a: '회원가입 시 500 크레딧이 무료 제공됩니다. 질문지 답변과 미리보기는 무료이며, 실제 앱 코드 생성 시에만 크레딧이 차감됩니다.' },
  { q: '생성된 코드의 소유권은?', a: '100% 사용자 소유입니다. 다운로드(ZIP)하면 프론트엔드+백엔드+DB 전체 소스코드를 받을 수 있고, 자유롭게 수정/배포할 수 있습니다.' },
  { q: '배포 후 수정이 가능한가요?', a: '네! 배포 후에도 빌더에서 채팅으로 수정 요청하면 AI가 코드를 업데이트합니다. 수정할 때마다 소량의 크레딧이 소모됩니다.' },
  { q: '어떤 기술 스택으로 만들어지나요?', a: 'Next.js 16 (프론트) + NestJS (백엔드) + PostgreSQL (DB) + Prisma ORM으로 생성됩니다. 업계 표준 풀스택 구성입니다.' },
  { q: '정부지원사업 심사에 활용 가능한가요?', a: '네! ERD, API 명세서가 자동 포함되어 코드 소유권을 증명할 수 있습니다. 실제 작동하는 데모 URL도 제공됩니다.' },
  { q: '카페24/아임웹과 뭐가 다른가요?', a: 'Foundry는 AI가 풀스택 코드를 생성합니다. 단순 템플릿이 아니라 백엔드+DB+API가 포함된 실제 서비스를 만듭니다. 코드 소유권도 100% 보장됩니다.' },
  { q: '한 번에 여러 앱을 만들 수 있나요?', a: '크레딧만 있으면 앱 개수 제한 없이 생성 가능합니다. 크레딧 충전은 /credits 페이지에서 할 수 있습니다.' },
  { q: '호스팅 비용은 얼마인가요?', a: '배포 시 월 29,000원입니다. SSL(HTTPS)이 자동 적용되며, 커스텀 도메인 연결도 가능합니다.' },
];

export default function GuidePage() {
  const [tab, setTab] = useState('start');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#17171c] text-[#f2f4f6]">
      <LandingNav />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex gap-2 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-[#3182f6] text-white' : 'bg-[#2c2c35] text-[#8b95a1] hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'start' && (
          <div className="space-y-8">
            <div>
              <h1 className="mb-2 text-3xl font-black">Foundry 시작하기</h1>
              <p className="text-[#8b95a1]">3단계로 나만의 앱을 만들어보세요</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { step: '1', title: '업종 선택', desc: '미용실, 쇼핑몰, 예약, O2O, 에듀테크, 관리업체 중 선택', color: '#3182f6' },
                { step: '2', title: '질문지 답변', desc: '6가지 질문에 답하면 AI가 맞춤 앱을 설계합니다', color: '#30d158' },
                { step: '3', title: '앱 생성', desc: 'AI가 프론트+백엔드+DB를 자동 생성. 바로 배포 가능!', color: '#a855f7' },
              ].map(s => (
                <div key={s.step} className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-black text-white" style={{ background: s.color }}>{s.step}</div>
                  <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                  <p className="text-sm text-[#8b95a1] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[#ffd60a]/20 bg-[#ffd60a]/5 p-6">
              <h3 className="mb-2 font-bold text-[#ffd60a]">꿀팁</h3>
              <ul className="space-y-1 text-sm text-[#8b95a1]">
                <li>- 질문지 답변과 미리보기는 <b className="text-[#30d158]">완전 무료</b>입니다</li>
                <li>- 미리보기에서 메뉴를 클릭하면 각 화면을 체험할 수 있어요</li>
                <li>- 채팅으로 &quot;포인트 기능 추가해줘&quot; 같이 수정 요청이 가능합니다</li>
                <li>- 만족하면 &quot;앱 생성하기&quot; 버튼으로 실제 코드를 만드세요</li>
              </ul>
            </div>
          </div>
        )}

        {tab === 'manage' && (
          <div className="space-y-8">
            <div>
              <h1 className="mb-2 text-3xl font-black">운영 가이드</h1>
              <p className="text-[#8b95a1]">앱을 만든 후 효과적으로 운영하는 방법</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { icon: '🚀', title: '배포하기', desc: 'Foundry 서버에 앱을 올려 바로 사용합니다.', detail: '월 29,000원 / SSL 자동 / 서브도메인 제공 / 배포 후에도 수정 가능' },
                { icon: '📦', title: '코드 다운로드', desc: 'ZIP으로 전체 소스코드를 받아갑니다.', detail: '별도 3,000 크레딧 / 프론트+백엔드+DB 전체 / ERD+API 명세 포함' },
                { icon: '💬', title: '채팅으로 수정', desc: '"메인 배너 바꿔줘" 같이 자연어로 수정 요청.', detail: 'AI가 코드를 수정 / 수정당 소량 크레딧 / 무제한 수정 가능' },
                { icon: '💾', title: '저장 & 이어하기', desc: '작업 중 언제든 저장하고 나중에 이어서 합니다.', detail: '30초마다 자동 저장 / 프로젝트 목록에서 클릭하면 이어서 작업' },
              ].map(item => (
                <div key={item.title} className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6">
                  <div className="mb-3 text-3xl">{item.icon}</div>
                  <h3 className="mb-1 text-lg font-bold">{item.title}</h3>
                  <p className="mb-3 text-sm text-[#8b95a1]">{item.desc}</p>
                  <p className="text-xs text-[#6b7684] leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-8">
            <div>
              <h1 className="mb-2 text-3xl font-black">AI 활용법</h1>
              <p className="text-[#8b95a1]">Foundry AI를 200% 활용하는 방법 — 카페24/아임웹에서는 불가능한 것들</p>
            </div>
            <div className="rounded-2xl border border-[#3182f6]/20 bg-[#3182f6]/5 p-6">
              <h3 className="mb-4 font-bold text-[#3182f6]">카페24/아임웹과 다른 점</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="rounded-xl bg-[#1b1b21] p-4">
                  <div className="mb-2 font-bold text-[#f43f5e]">기존 플랫폼</div>
                  <ul className="space-y-1 text-[#8b95a1]">
                    <li>- 상품 100개 = 수동으로 100번 등록</li>
                    <li>- 블로그 글 = 직접 작성</li>
                    <li>- 매출 분석 = 엑셀에서 수동</li>
                    <li>- CS = 전부 수동 답변</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-[#1b1b21] p-4">
                  <div className="mb-2 font-bold text-[#30d158]">Foundry</div>
                  <ul className="space-y-1 text-[#8b95a1]">
                    <li>- 사진 업로드 → AI가 상품명/설명 자동 생성</li>
                    <li>- &quot;봄 신상 소개글&quot; → AI가 작성</li>
                    <li>- &quot;이번 달 분석해줘&quot; → AI 리포트</li>
                    <li>- FAQ 학습 → AI 자동 응답</li>
                  </ul>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold">이렇게 활용하세요</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { icon: '📸', title: '대량 상품 등록', desc: '사진+엑셀 업로드하면 AI가 상품명, 설명, 카테고리를 자동 생성합니다.', token: '상품당 ~50 크레딧' },
                { icon: '📝', title: '콘텐츠 자동 생성', desc: '"봄 신상 소개글 써줘" → 블로그, 배너, SNS 문구를 AI가 작성합니다.', token: '건당 ~100 크레딧' },
                { icon: '📊', title: '매출 분석 리포트', desc: '"이번 달 매출 분석해줘" → 트렌드, 인기 상품, 개선점을 AI가 분석합니다.', token: '월 ~500 크레딧' },
                { icon: '🎯', title: 'SEO 최적화', desc: '상품별 메타태그, 키워드를 AI가 자동 생성하여 검색 노출을 높입니다.', token: '페이지당 ~30 크레딧' },
                { icon: '💬', title: 'CS 자동응답', desc: '자주 묻는 질문을 학습시키면 AI가 자동으로 답변합니다.', token: '대화당 ~20 크레딧' },
                { icon: '📧', title: '마케팅 자동화', desc: '"휴면 고객 이벤트 만들어줘" → 대상 선정부터 문구까지 AI가 처리합니다.', token: '캠페인당 ~200 크레딧' },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-[#2c2c35] bg-[#1b1b21] p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-lg font-bold">{item.icon} {item.title}</span>
                    <span className="rounded-lg bg-[#ffd60a]/10 px-2 py-0.5 text-[10px] font-bold text-[#ffd60a]">{item.token}</span>
                  </div>
                  <p className="text-sm text-[#8b95a1] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-[#30d158]/10 border border-[#30d158]/20 p-6 text-center">
              <p className="text-lg font-bold text-[#30d158] mb-1">사업이 잘 될수록 AI가 더 도와드립니다</p>
              <p className="text-sm text-[#8b95a1]">상품이 많아지고, 고객이 늘어나고, 매출이 커질수록 AI 활용도가 높아집니다</p>
            </div>
          </div>
        )}

        {tab === 'faq' && (
          <div className="space-y-8">
            <div>
              <h1 className="mb-2 text-3xl font-black">자주 묻는 질문</h1>
              <p className="text-[#8b95a1]">궁금한 점이 있으신가요?</p>
            </div>
            <div className="space-y-3">
              {FAQ_LIST.map((faq, i) => (
                <div key={i} className="rounded-xl border border-[#2c2c35] bg-[#1b1b21] overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left">
                    <span className="font-semibold text-sm">{faq.q}</span>
                    <span className={`text-[#8b95a1] transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-[#2c2c35] px-6 py-4">
                      <p className="text-sm text-[#8b95a1] leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[#2c2c35] bg-[#1b1b21] p-6 text-center">
              <p className="mb-2 text-lg font-bold">더 궁금한 점이 있으신가요?</p>
              <p className="mb-4 text-sm text-[#8b95a1]">빌더 채팅에서 AI에게 직접 물어보세요!</p>
              <a href="/start" className="inline-block rounded-xl bg-[#3182f6] px-6 py-3 text-sm font-bold text-white hover:bg-[#1b64da] transition-colors">앱 만들러 가기 →</a>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
