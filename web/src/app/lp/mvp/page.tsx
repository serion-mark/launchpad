'use client';

import Image from 'next/image';
import Link from 'next/link';
import ChatWidget from '../../components/ChatWidget';

const DEMO_APPS = [
  { name: '동네키친', category: '로컬커머스', img: '/lp/demo-dongne.png', url: 'https://test1.foundry.ai.kr' },
  { name: '카페노트', category: '매장관리', img: '/lp/demo-cafe.png', url: 'https://cafe-note.foundry.ai.kr' },
  { name: '멍냥일기', category: '반려동물', img: '/lp/demo-pet.png', url: 'https://pet-diary.foundry.ai.kr' },
  { name: '오운완', category: '건강/웰니스', img: '/lp/demo-workout.png', url: 'https://workout.foundry.ai.kr' },
  { name: '돌봄일지', category: '시니어돌봄', img: '/lp/demo-care.png', url: 'https://care-log.foundry.ai.kr' },
  { name: '스마트몰', category: '커머스/쇼핑', img: '/lp/demo-mall.png', url: 'https://smart-mall.foundry.ai.kr' },
];

const COMPARE_ROWS = [
  { label: '기획 전달', without: '말로 설명 → 오해', withMvp: 'MVP 보여주기 → 즉시 이해' },
  { label: '견적', without: '3,000만원~', withMvp: '절반으로 줄어듦' },
  { label: '소통', without: '수십 번 미팅', withMvp: '"이 MVP 기반으로" 끝' },
  { label: '수정', without: '완성 후 발견 → 변경비', withMvp: 'MVP에서 미리 검증' },
  { label: '실패', without: '다 만들고 나서 실패', withMvp: '30분 만에 사전 검증' },
];

const FAQ_ITEMS = [
  { q: '진짜 코딩 몰라도 돼요?', a: '네. 타자만 치면 됩니다. 클릭으로 수정하고, 채팅으로 기능 추가하세요.' },
  { q: '만든 앱으로 실제 사업이 가능한가요?', a: '네. 실제 작동하는 URL이 생성되고, 코드 다운로드도 가능합니다.' },
  { q: '외주를 맡기려면 이걸 왜 써요?', a: 'MVP를 들고 미팅에 가면 견적이 절반으로 줄어듭니다. 화면을 보여주면 소통 비용이 사라집니다.' },
  { q: '정부지원사업비로 결제 가능한가요?', a: '네. 모두의 창업, 예비창업패키지 등 정부지원금으로 사용 가능합니다.' },
  { q: 'AI 회의실이 뭔가요?', a: 'Claude, GPT, Gemini 3개 AI가 사장님의 아이디어를 각자 관점에서 분석하고 토론합니다.' },
];

export default function LpMvpPage() {
  return (
    <div className="min-h-screen bg-white text-[#191f28]" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>

      {/* ── 히어로 ── */}
      <section className="px-6 pt-20 pb-16 text-center" style={{ background: 'linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%)' }}>
        <div className="mx-auto max-w-md">
          <span className="inline-block rounded-full bg-[#e8f3ff] px-4 py-1.5 text-sm font-semibold text-[#3182f6] mb-6">
            AI MVP 빌더
          </span>
          <h1 className="text-[28px] font-extrabold leading-[1.4] tracking-tight mb-4">
            아이디어만 말하면,<br />
            AI가 <span className="text-[#3182f6]">사업 검증</span>부터<br />
            <span className="text-[#3182f6]">MVP</span>까지.
          </h1>
          <p className="text-base text-[#6b7684] leading-relaxed mb-8">
            Foundry로 MVP 만들고 외주사 미팅에 가세요.<br />
            견적이 절반으로 줄어듭니다.
          </p>
          <Link href="/start" className="inline-block bg-[#3182f6] text-white text-[17px] font-bold py-4 px-10 rounded-xl hover:bg-[#1b6ce5] transition-colors">
            무료로 시작하기
          </Link>
          <p className="text-sm text-[#8b95a1] mt-3">회원가입 시 1,000 크레딧 무료</p>
        </div>
      </section>

      {/* ── 3단계 프로세스 ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-bold text-[#3182f6] mb-2">HOW IT WORKS</p>
          <h2 className="text-[22px] font-extrabold leading-[1.4] tracking-tight mb-8">
            외주사 미팅 전,<br />이 3단계만 거치세요.
          </h2>

          {/* Step 1 */}
          <div className="bg-[#f9fafb] rounded-2xl p-7 mb-4">
            <div className="inline-flex items-center justify-center w-7 h-7 bg-[#3182f6] text-white text-sm font-extrabold rounded-full mb-3">1</div>
            <h3 className="text-lg font-bold mb-2">AI가 사업을 검증합니다</h3>
            <p className="text-[15px] text-[#6b7684] leading-relaxed">
              Claude · GPT · Gemini 3개 AI가 각자 관점에서 분석합니다. 시장성, 경쟁사, 리스크, 예산까지.
            </p>
            <Image src="/lp/ai-meeting.png" alt="AI 회의실" width={375} height={400} className="w-full rounded-xl mt-4" />
          </div>

          {/* Step 2 */}
          <div className="bg-[#f9fafb] rounded-2xl p-7 mb-4">
            <div className="inline-flex items-center justify-center w-7 h-7 bg-[#3182f6] text-white text-sm font-extrabold rounded-full mb-3">2</div>
            <h3 className="text-lg font-bold mb-2">30분 만에 MVP 완성</h3>
            <p className="text-[15px] text-[#6b7684] leading-relaxed">
              검증 끝나면 &quot;앱 만들기&quot; 클릭. AI가 코드 생성 → 자동 배포 → 내 URL이 생깁니다.
            </p>
            <Image src="/lp/foundry-start.png" alt="Foundry 빌더" width={375} height={400} className="w-full rounded-xl mt-4" />
          </div>

          {/* Step 3 */}
          <div className="bg-[#f9fafb] rounded-2xl p-7 mb-4">
            <div className="inline-flex items-center justify-center w-7 h-7 bg-[#3182f6] text-white text-sm font-extrabold rounded-full mb-3">3</div>
            <h3 className="text-lg font-bold mb-2">Foundry MVP 들고 미팅에 가세요</h3>
            <p className="text-[15px] text-[#6b7684] leading-relaxed">
              &quot;이 MVP 기반으로 개발해주세요&quot; 한 마디면 끝. 견적 절반, 소통 비용 제로.
            </p>
            <Image src="/lp/foundry-main.png" alt="Foundry MVP" width={375} height={400} className="w-full rounded-xl mt-4" />
          </div>
        </div>
      </section>

      {/* ── 비주얼 에디터 ── */}
      <section className="px-6 py-16 bg-[#f9fafb]">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-bold text-[#3182f6] mb-2">NO CODE</p>
          <h2 className="text-[22px] font-extrabold leading-[1.4] tracking-tight mb-1">코딩? 필요 없습니다.</h2>
          <p className="text-[15px] text-[#6b7684] mb-6">클릭으로 수정하고, 말로 기능을 추가하세요.</p>

          {/* GIF placeholder — 추후 교체 */}
          <div className="w-full h-[280px] rounded-2xl mb-6 flex items-center justify-center flex-col gap-2" style={{ background: 'linear-gradient(135deg, #e8f3ff, #d4e5ff)' }}>
            <span className="text-[40px]">🖱️</span>
            <p className="text-[#3182f6] font-semibold text-sm">비주얼 에디터 GIF (준비 중)</p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { icon: '🖱️', text: '클릭으로 글자·색상 수정' },
              { icon: '💬', text: '채팅으로 기능 추가' },
              { icon: '📱', text: '모바일 반응형 자동' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 bg-white p-4 rounded-xl text-[15px] font-semibold text-[#333d4b]">
                <div className="w-9 h-9 bg-[#e8f3ff] rounded-[10px] flex items-center justify-center text-xl">{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 데모앱 쇼케이스 ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-bold text-[#3182f6] mb-2">SHOWCASE</p>
          <h2 className="text-[22px] font-extrabold leading-[1.4] tracking-tight mb-8">
            실제 Foundry로<br />만든 앱들입니다.
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {DEMO_APPS.map((app) => (
              <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer" className="bg-[#f9fafb] rounded-2xl overflow-hidden no-underline text-inherit">
                <div className="w-full h-[140px] overflow-hidden bg-[#f2f4f6]">
                  <Image src={app.img} alt={app.name} width={375} height={812} className="w-full h-auto object-cover object-top" />
                </div>
                <div className="p-3 pb-4">
                  <h4 className="text-[15px] font-bold mb-1">{app.name}</h4>
                  <p className="text-xs text-[#8b95a1]">{app.category}</p>
                  <span className="inline-block text-xs text-[#3182f6] font-semibold mt-1.5">접속하기 →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── 비교표 ── */}
      <section className="px-6 py-16 bg-[#f9fafb]">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-bold text-[#3182f6] mb-2">COMPARE</p>
          <h2 className="text-[22px] font-extrabold leading-[1.4] tracking-tight mb-6">
            외주사 미팅,<br />MVP 하나로 달라집니다.
          </h2>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-[#8b95a1]"></th>
                  <th className="p-4 text-center text-sm font-bold text-[#8b95a1]">MVP 없이<br />미팅</th>
                  <th className="p-4 text-center text-sm font-bold text-[#3182f6] bg-[#f0f6ff]">Foundry MVP<br />들고 미팅</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-[#f2f4f6]">
                    <td className="p-3.5 text-left text-sm font-semibold text-[#6b7684]">{row.label}</td>
                    <td className="p-3.5 text-center text-sm text-[#8b95a1]">{row.without}</td>
                    <td className="p-3.5 text-center text-sm font-bold text-[#3182f6] bg-[#f8fbff]">{row.withMvp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 가격 ── */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-bold text-[#3182f6] mb-2">PRICING</p>
          <h2 className="text-[22px] font-extrabold leading-[1.4] tracking-tight mb-1">합리적인 가격</h2>
          <p className="text-[15px] text-[#6b7684] mb-6">
            외주 견적 절반 아끼는 것에 비하면,<br />가장 현명한 투자입니다.
          </p>

          <div className="flex gap-3">
            {/* 스탠다드 */}
            <div className="flex-1 bg-white rounded-2xl p-6 relative border-2 border-[#3182f6]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3182f6] text-white text-[11px] font-bold px-3 py-1 rounded-[10px] whitespace-nowrap">⭐ 인기</span>
              <h3 className="text-base font-bold mt-2 mb-2">스탠다드</h3>
              <div className="text-[28px] font-extrabold">149,000<span className="text-sm font-medium text-[#8b95a1]">원</span></div>
              <ul className="mt-5 text-left space-y-1.5">
                {['20,000 크레딧', 'MVP 1~2개', 'AI 회의실', '비주얼 에디터', '온라인 게시'].map((f) => (
                  <li key={f} className="text-sm text-[#6b7684] flex items-center gap-2">
                    <span className="text-[#3182f6] font-bold">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* 프로 */}
            <div className="flex-1 bg-[#f9fafb] rounded-2xl p-6 relative border-2 border-transparent">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#191f28] text-white text-[11px] font-bold px-3 py-1 rounded-[10px] whitespace-nowrap">💎 BEST</span>
              <h3 className="text-base font-bold mt-2 mb-2">프로</h3>
              <div className="text-[28px] font-extrabold">299,000<span className="text-sm font-medium text-[#8b95a1]">원</span></div>
              <ul className="mt-5 text-left space-y-1.5">
                {['50,000 크레딧', 'MVP 5개+', 'AI 회의실', '비주얼 에디터', '온라인 게시', '코드 다운로드'].map((f) => (
                  <li key={f} className="text-sm text-[#6b7684] flex items-center gap-2">
                    <span className="text-[#3182f6] font-bold">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm text-[#8b95a1] mt-6">AI 회의실만 체험하고 싶다면 라이트(49,000원)도 있어요</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-16 bg-[#f9fafb]">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-bold text-[#3182f6] mb-2">FAQ</p>
          <h2 className="text-[22px] font-extrabold leading-[1.4] tracking-tight mb-8">자주 묻는 질문</h2>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="bg-white rounded-xl p-5">
                <h4 className="text-[15px] font-bold mb-2.5">Q. {item.q}</h4>
                <p className="text-sm text-[#6b7684] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 최종 CTA ── */}
      <section className="px-6 py-16 text-center" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0f6ff 100%)' }}>
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-extrabold leading-[1.4] mb-3">
            외주사 미팅 전에,<br />30분만 투자하세요.
          </h2>
          <p className="text-base text-[#6b7684] mb-8 leading-relaxed">그 30분이 견적 절반을 아껴줍니다.</p>
          <Link href="/start" className="inline-block bg-[#3182f6] text-white text-[17px] font-bold py-4 px-10 rounded-xl hover:bg-[#1b6ce5] transition-colors">
            무료로 시작하기
          </Link>
          <p className="text-sm text-[#8b95a1] font-semibold mt-4">foundry.ai.kr</p>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="py-10 px-6 text-center text-xs text-[#8b95a1] leading-[1.8] border-t border-[#f2f4f6] pb-28">
        <p>
          세리온 | 대표 김형석<br />
          사업자등록번호 754-13-02876<br /><br />
          <Link href="/terms" className="text-[#6b7684] no-underline">이용약관</Link>
          {' · '}
          <Link href="/privacy" className="text-[#6b7684] no-underline">개인정보처리방침</Link>
          {' · '}
          <Link href="/refund" className="text-[#6b7684] no-underline">환불정책</Link>
        </p>
      </footer>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-6 pb-7 pt-3 z-50" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 30%)' }}>
        <Link href="/start" className="block w-full bg-[#3182f6] text-white text-[17px] font-bold py-4 rounded-xl text-center hover:bg-[#1b6ce5] transition-colors shadow-[0_4px_16px_rgba(49,130,246,0.3)]">
          무료로 시작하기
        </Link>
      </div>

      {/* ── 챗봇 ── */}
      <ChatWidget bubbleColor="#FBBF24" />
    </div>
  );
}
