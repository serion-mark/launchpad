import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-primary)] bg-[var(--bg-card)] px-5 py-12 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-4 mb-10">
          {/* 브랜드 */}
          <div className="md:col-span-1">
            <Logo className="h-7 mb-3" />
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
              AI가 만드는 풀스택 MVP.<br />
              외주비 3천만원을 30만원으로.
            </p>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="mb-3 text-sm font-bold text-[var(--text-secondary)]">서비스</h4>
            <ul className="space-y-2 text-sm text-[var(--text-tertiary)]">
              <li><a href="/start" className="hover:text-[var(--text-primary)] transition-colors">앱 만들기</a></li>
              <li><a href="/portfolio" className="hover:text-[var(--text-primary)] transition-colors">포트폴리오</a></li>
              <li><a href="/pricing" className="hover:text-[var(--text-primary)] transition-colors">가격표</a></li>
              <li><a href="/guide" className="hover:text-[var(--text-primary)] transition-colors">사용 가이드</a></li>
            </ul>
          </div>

          {/* 법적 */}
          <div>
            <h4 className="mb-3 text-sm font-bold text-[var(--text-secondary)]">법적 고지</h4>
            <ul className="space-y-2 text-sm text-[var(--text-tertiary)]">
              <li><a href="/terms" className="hover:text-[var(--text-primary)] transition-colors">이용약관</a></li>
              <li><a href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">개인정보 처리방침</a></li>
              <li><a href="/refund" className="hover:text-[var(--text-primary)] transition-colors">환불 정책</a></li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h4 className="mb-3 text-sm font-bold text-[var(--text-secondary)]">사업자 정보</h4>
            <ul className="space-y-2 text-sm text-[var(--text-tertiary)]">
              <li>세리온 | 대표: 김형석</li>
              <li>사업자등록번호: 754-13-02876</li>
              <li>통신판매업: 제2025-경기김포-8949호</li>
              <li>경기도 김포시 고촌읍 장차로13번길 25, 3층 302-498호</li>
              <li>전화: 010-2164-3181 | 이메일: mark@serion.ai.kr</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border-primary)] pt-6 text-center text-xs text-[var(--text-disabled)]">
          <p>&copy; 2026 Foundry by Serion. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
