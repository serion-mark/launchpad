# Tailwind 테마 + 반응형 패턴

## ⚠️ Tailwind v4 주의
- `@tailwind base/components/utilities` 금지!
- `@import "tailwindcss";` 사용 필수
- globals.css는 시스템 자동 생성 (직접 생성 금지)

## 🎨 CSS 변수 사용 (반드시!)
globals.css에 자동 정의된 변수만 사용:
```
--color-primary         주요 액션 (버튼/링크)
--color-primary-hover   primary hover
--color-secondary       보조 색상
--color-background      페이지 배경
--color-surface         카드/컨테이너 배경
--color-text-primary    주요 텍스트
--color-text-secondary  보조 텍스트
--color-border          테두리
--color-accent          강조 (배지/알림)
```

## Tailwind 사용법
```tsx
// ✅ 정답
<button className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]">
<div className="text-[var(--color-text-primary)] border-[var(--color-border)]">

// ❌ 금지
<button className="bg-blue-500 hover:bg-blue-600">
<body className="bg-gray-50">
```

## 예외 (중성색 허용)
- Tailwind 기본색 중 white, gray-50, gray-100 같은 중성은 허용
- 단 body 태그에는 직접 배경색 금지 (globals.css가 자동 적용)

## 반응형 breakpoint (모바일 우선)
```
기본:   < 640px  (mobile)
sm:     ≥ 640px  (tablet)
md:     ≥ 768px
lg:     ≥ 1024px (desktop)
xl:     ≥ 1280px
```

## 반응형 그리드 패턴
```tsx
// 카드 그리드: 1 → 2 → 3열
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// 스탯 그리드: 2x2 → 1x4
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

// 좌우 레이아웃: 모바일은 세로, 데스크톱은 좌우
<div className="flex flex-col lg:flex-row gap-6">
```

## 공통 유틸 클래스
```
// 카드 기본
p-4 rounded-xl shadow-sm bg-[var(--color-surface)]

// 버튼 기본 (primary)
px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-hover)]

// 버튼 (secondary)
px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]

// 입력 필드
w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary)]

// 텍스트 크기
text-xs text-[var(--color-text-secondary)]   // 보조 정보
text-sm text-[var(--color-text-primary)]     // 본문
text-base font-medium                         // 강조
text-2xl font-bold                            // 제목
```
