import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-card)] text-[var(--text-primary)]">
      <LandingNav />
      <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
        <h1 className="mb-8 text-3xl font-bold">개인정보 처리방침</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-[var(--text-secondary)] leading-relaxed [&_h2]:text-[var(--text-primary)] [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-[var(--text-primary)]">

          <p className="text-xs text-[var(--text-tertiary)]">시행일: 2026년 3월 21일</p>

          <p>세리온(이하 &quot;회사&quot;)은 Foundry 서비스 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수합니다.</p>

          <h2>1. 수집하는 개인정보 항목</h2>
          <p><strong>필수 수집:</strong> 이메일 주소, 비밀번호(해시), 이름(닉네임), 전화번호(선택 입력)</p>
          <p><strong>소셜 로그인 시:</strong> 카카오 계정 고유ID, 프로필 사진 URL, 닉네임</p>
          <p><strong>자동 수집:</strong> 접속 IP, 브라우저 정보, 서비스 이용 기록, 크레딧 결제/사용 내역</p>
          <p><strong>결제 시:</strong> 결제 수단 정보 (토스페이먼츠를 통해 처리, 카드번호는 저장하지 않음)</p>

          <h2>2. 개인정보의 수집 및 이용 목적</h2>
          <p>1. 회원 가입 및 관리: 가입 의사 확인, 본인 식별, 서비스 제공</p>
          <p>2. 서비스 제공: AI 앱 생성, 배포, 다운로드, 크레딧 관리</p>
          <p>3. 요금 결제: 크레딧 충전, 호스팅 결제, 환불 처리</p>
          <p>4. 고객 지원: 문의 응대, 공지사항 전달</p>
          <p>5. 마케팅 (동의 시): 신규 기능 안내, 프로모션 정보 제공</p>

          <h2>3. 개인정보의 보유 및 이용기간</h2>
          <p>1. <strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</p>
          <p>2. <strong>결제 기록:</strong> 전자상거래법에 따라 5년 보관</p>
          <p>3. <strong>접속 로그:</strong> 통신비밀보호법에 따라 3개월 보관</p>

          <h2>4. 개인정보의 제3자 제공</h2>
          <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우 예외로 합니다:</p>
          <p>1. 이용자가 사전에 동의한 경우</p>
          <p>2. 법령에 의한 경우</p>
          <p>3. 결제 처리를 위해 토스페이먼츠에 최소한의 정보를 전달하는 경우</p>

          <h2>5. 개인정보의 파기절차 및 방법</h2>
          <p>1. 파기절차: 보유기간 경과 또는 처리 목적 달성 시 지체 없이 파기</p>
          <p>2. 파기방법: 전자적 파일은 복구 불가능한 방법으로 삭제, 종이 문서는 분쇄 또는 소각</p>

          <h2>6. 이용자의 권리</h2>
          <p>이용자는 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.</p>
          <p>요청은 이메일(mark@serion.ai.kr)로 접수하며, 10일 이내에 처리합니다.</p>

          <h2>7. 개인정보 보호 조치</h2>
          <p>1. 비밀번호 암호화 (bcrypt)</p>
          <p>2. HTTPS/SSL 통신 암호화</p>
          <p>3. JWT 기반 인증, 토큰 만료 관리</p>
          <p>4. 정기적인 보안 점검</p>

          <h2>8. 개인정보 보호책임자</h2>
          <p>성명: 김형석<br />이메일: mark@serion.ai.kr</p>

          <h2>9. 개인정보 처리방침 변경</h2>
          <p>본 방침이 변경되는 경우, 변경 사항은 서비스 내 공지사항을 통해 고지합니다.</p>

          <p className="mt-10 text-xs text-[var(--text-tertiary)]">
            시행일: 2026년 3월 21일<br />
            세리온 대표: 김형석
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
