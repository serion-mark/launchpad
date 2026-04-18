# Foundry 다크/라이트 모드 구현 명령어

> 새 세션에서 실행! 전체 페이지 대상!

---

## 필독 파일
1. `memory/BASICS.md` — 서버/배포
2. 이 파일

---

## 프롬프트 (새 세션에 복붙)

```
너는 자비스다. 답변은 항상 한글로. "절대" 쓰지 마.
배포: GitHub Actions! (git push origin main)

■ 필독 파일
1. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
2. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/DARK_LIGHT_MODE_COMMAND.md

위 파일 읽고 Foundry 전체 페이지에 다크/라이트 모드 토글을 구현해줘!
현재 다크 모드만 있음 → 라이트 모드 추가 + 토글 스위치 + 시스템 설정 연동.
안 보이는 글씨, 안 보이는 버튼 전부 확인하고 수정해야 함!!
```

---

## 현재 상태

```
Foundry 전체: 다크 모드 온리
배경: #0c0c12 / #1b1b21 / #13131a
카드: #17171c / #2c2c35
텍스트: #f2f4f6 (흰색) / #8b95a1 (회색) / #6b7684 (연회색)
포인트: #3182f6 (파랑) / #30d158 (초록) / #a855f7 (보라)
```

---

## 구현 방법

### 1단계: CSS 변수 시스템 구축

`web/src/app/globals.css`에 다크/라이트 테마 변수 정의:

```css
@import "tailwindcss";

/* 라이트 모드 (기본) */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-card: #ffffff;
  --bg-card-hover: #f1f5f9;
  --bg-input: #f1f5f9;
  --bg-header: #ffffff;
  --bg-footer: #f8fafc;

  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --text-inverse: #ffffff;

  --border-primary: #e2e8f0;
  --border-secondary: #f1f5f9;

  --color-primary: #3182f6;
  --color-primary-hover: #1b64da;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-purple: #8b5cf6;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}

/* 다크 모드 */
.dark {
  --bg-primary: #0c0c12;
  --bg-secondary: #1b1b21;
  --bg-card: #17171c;
  --bg-card-hover: #2c2c35;
  --bg-input: #2c2c35;
  --bg-header: #13131a;
  --bg-footer: #0c0c12;

  --text-primary: #f2f4f6;
  --text-secondary: #8b95a1;
  --text-tertiary: #6b7684;
  --text-inverse: #1e293b;

  --border-primary: #2c2c35;
  --border-secondary: #1e1e28;

  --color-primary: #3182f6;
  --color-primary-hover: #1b64da;
  --color-success: #30d158;
  --color-warning: #ffd60a;
  --color-danger: #f43f5e;
  --color-purple: #a855f7;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.5);
}
```

### 2단계: 테마 토글 컴포넌트

`web/src/app/components/ThemeToggle.tsx` 새로 생성:

```typescript
'use client';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true); // 기본값 다크

  useEffect(() => {
    // localStorage에서 테마 확인, 없으면 시스템 설정 따름
    const saved = localStorage.getItem('foundry_theme');
    if (saved) {
      setIsDark(saved === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('foundry_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
      aria-label="테마 전환"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
```

### 3단계: 전체 페이지 하드코딩 색상 → CSS 변수 교체

**이게 가장 큰 작업! 모든 페이지의 하드코딩 색상을 CSS 변수로 교체해야 함.**

대상 파일 목록 (전부 확인 필수!!):

```
web/src/app/page.tsx                    — 메인 랜딩
web/src/app/layout.tsx                  — 전역 레이아웃
web/src/app/login/page.tsx              — 로그인
web/src/app/start/page.tsx              — 앱 시작
web/src/app/meeting/page.tsx            — AI 회의실
web/src/app/portfolio/page.tsx          — 포트폴리오
web/src/app/pricing/page.tsx            — 가격표
web/src/app/credits/page.tsx            — 크레딧 충전
web/src/app/dashboard/page.tsx          — 대시보드
web/src/app/mypage/page.tsx             — 마이페이지
web/src/app/guide/page.tsx              — 가이드
web/src/app/terms/page.tsx              — 이용약관
web/src/app/privacy/page.tsx            — 개인정보
web/src/app/refund/page.tsx             — 환불정책
web/src/app/agree/page.tsx              — 약관동의
web/src/app/admin/page.tsx              — 어드민
web/src/app/builder/page.tsx            — 빌더 메인
web/src/app/builder/components/*.tsx     — 빌더 컴포넌트 전체
web/src/app/components/ChatWidget.tsx   — 챗봇
web/src/app/components/LandingNav.tsx   — 네비게이션
web/src/app/components/Footer.tsx       — 푸터
```

교체 규칙:
```
bg-[#0c0c12]  → bg-[var(--bg-primary)]
bg-[#1b1b21]  → bg-[var(--bg-secondary)]
bg-[#17171c]  → bg-[var(--bg-card)]
bg-[#13131a]  → bg-[var(--bg-header)]
bg-[#2c2c35]  → bg-[var(--bg-card-hover)]

text-[#f2f4f6] → text-[var(--text-primary)]
text-[#8b95a1] → text-[var(--text-secondary)]
text-[#6b7684] → text-[var(--text-tertiary)]

border-[#2c2c35] → border-[var(--border-primary)]
border-[#1e1e28] → border-[var(--border-secondary)]
```

### 4단계: 안 보이는 글씨/버튼 전수 조사

**라이트 모드에서 안 보이는 것들 체크리스트:**

```
- [ ] 흰 배경에 흰 글씨 (text-white on bg-white)
- [ ] 밝은 배경에 연한 회색 글씨 (text-[#8b95a1] on bg-[#f8fafc])
- [ ] 버튼 hover 색상이 배경과 같아서 안 보이는 경우
- [ ] 입력창 배경과 페이지 배경이 같아서 구분 안 되는 경우
- [ ] 카드 테두리가 안 보이는 경우
- [ ] 아이콘 색상이 배경과 같아서 안 보이는 경우
- [ ] 그래디언트 배경에서 텍스트 안 보이는 경우
- [ ] 모달/팝업 오버레이 색상
- [ ] 토스트/알림 메시지 색상
```

**확인 방법:**
1. 라이트 모드로 전환
2. 모든 페이지 하나씩 접속
3. 모든 텍스트가 읽히는지 확인
4. 모든 버튼이 보이는지 확인
5. 모든 입력창이 구분되는지 확인
6. 모든 카드/섹션 경계가 보이는지 확인

### 5단계: 토글 위치

네비게이션 바(LandingNav.tsx)에 ThemeToggle 추가:
```
[Foundry] [기능] [AI회의실] [포트폴리오] [가격표] [사용법] [☀️/🌙] [내 프로젝트]
```

빌더 페이지에서도 접근 가능하게.

---

## 주의사항

- **빌더 페이지는 특히 주의!** — 프리뷰 영역, 코드 편집기, 채팅 등 복잡한 UI
- Tailwind의 `dark:` 프리픽스는 사용하지 않음 (CSS 변수 방식으로 통일)
- 기본값은 **시스템 설정** 따르되, 사용자가 수동 전환하면 localStorage에 저장
- 포인트 색상(파랑/초록/보라)은 다크/라이트 동일하게 유지
- **한 파일씩 교체하고 빌드 확인** — 한번에 다 바꾸면 빌드 에러 잡기 어려움
- 배포 전 사장님 확인!

---

## 실행 순서

```
1. globals.css에 CSS 변수 정의 (다크/라이트)
2. ThemeToggle.tsx 컴포넌트 생성
3. layout.tsx에 기본 dark 클래스 + ThemeToggle 배치
4. LandingNav.tsx에 토글 추가
5. 메인 페이지(page.tsx)부터 색상 교체 시작
6. 한 페이지씩 교체 → 빌드 확인 → 다음 페이지
7. 전체 완료 후 라이트 모드 전수 조사
8. 안 보이는 글씨/버튼 수정
9. 배포
```

---

## 체크리스트

- [ ] globals.css CSS 변수 정의
- [ ] ThemeToggle.tsx 생성
- [ ] LandingNav에 토글 배치
- [ ] 메인 페이지 색상 교체
- [ ] 빌더 페이지 색상 교체
- [ ] AI 회의실 색상 교체
- [ ] 포트폴리오 색상 교체
- [ ] 가격표/크레딧 색상 교체
- [ ] 로그인/회원가입 색상 교체
- [ ] 대시보드/마이페이지 색상 교체
- [ ] 챗봇 위젯 색상 교체
- [ ] 라이트 모드 전수 조사 — 안 보이는 글씨 0건
- [ ] 라이트 모드 전수 조사 — 안 보이는 버튼 0건
- [ ] 시스템 설정 연동 작동
- [ ] localStorage 저장/복원 작동
- [ ] 빌드 에러 0
