export default function Footer() {
  return (
    <footer className="border-t border-[#2c2c35] bg-[#17171c] px-5 py-12 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-4 mb-10">
          {/* 브랜드 */}
          <div className="md:col-span-1">
            <img src="/logo.svg" alt="Foundry" className="h-7 mb-3" />
            <p className="text-sm text-[#6b7684] leading-relaxed">
              AI가 만드는 풀스택 MVP.<br />
              외주비 3천만원을 30만원으로.
            </p>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="mb-3 text-sm font-bold text-[#8b95a1]">서비스</h4>
            <ul className="space-y-2 text-sm text-[#6b7684]">
              <li><a href="/start" className="hover:text-[#f2f4f6] transition-colors">앱 만들기</a></li>
              <li><a href="/portfolio" className="hover:text-[#f2f4f6] transition-colors">포트폴리오</a></li>
              <li><a href="/pricing" className="hover:text-[#f2f4f6] transition-colors">가격표</a></li>
              <li><a href="/guide" className="hover:text-[#f2f4f6] transition-colors">사용 가이드</a></li>
            </ul>
          </div>

          {/* 법적 */}
          <div>
            <h4 className="mb-3 text-sm font-bold text-[#8b95a1]">법적 고지</h4>
            <ul className="space-y-2 text-sm text-[#6b7684]">
              <li><a href="/terms" className="hover:text-[#f2f4f6] transition-colors">이용약관</a></li>
              <li><a href="/privacy" className="hover:text-[#f2f4f6] transition-colors">개인정보 처리방침</a></li>
              <li><a href="/refund" className="hover:text-[#f2f4f6] transition-colors">환불 정책</a></li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h4 className="mb-3 text-sm font-bold text-[#8b95a1]">고객지원</h4>
            <ul className="space-y-2 text-sm text-[#6b7684]">
              <li>이메일: mark@serion.ai.kr</li>
              <li>사업자: 서리온</li>
              <li>대표: 김형석</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2c2c35] pt-6 text-center text-xs text-[#4e5968]">
          <p>&copy; 2026 Foundry by Serion. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
