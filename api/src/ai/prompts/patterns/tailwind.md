# Tailwind + CSS 변수 패턴 (v2)

**이 문서는 Tailwind 사용 규칙과 검증된 className 조합표입니다.**
**모든 페이지 생성 시 함께 로드됨.**

---

## ⚠️ 1. Tailwind v4 필수 사항

### globals.css (시스템 자동 생성 — 직접 만들지 말 것!)
```css
@import "tailwindcss";

:root {
  --color-primary: #3182f6;
  --color-primary-hover: #1b64da;
  --color-secondary: #64748b;
  --color-background: #ffffff;
  --color-surface: #ffffff;
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-border: #e2e8f0;
  --color-accent: #3182f6;
}

@theme inline {
  --color-primary: var(--color-primary);
  /* ... */
}

body {
  background: var(--color-background);
  color: var(--color-text-primary);
}
```

### ❌ Tailwind v3 문법 금지
```css
@tailwind base;          /* v4에서 제거 */
@tailwind components;    /* v4에서 제거 */
@tailwind utilities;     /* v4에서 제거 */
```

---

## 🎨 2. CSS 변수 사용 원칙

### ✅ 올바른 사용
```tsx
bg-[var(--color-primary)]
text-[var(--color-text-primary)]
border-[var(--color-border)]
hover:bg-[var(--color-primary-hover)]
```

### ❌ 금지 (하드코딩 색상)
```tsx
bg-blue-500 hover:bg-blue-600
text-gray-900
border-gray-200
```

### 예외 (중성색 허용)
- `text-white`, `bg-white`
- `text-gray-50`, `bg-gray-50` (매우 옅은 중성)
- 상태 색상 (green-500, red-500, yellow-500 등) — 배지/알림에만

---

## 🎯 3. 표준 className 조합표

### 🔘 버튼

**Primary 버튼**:
```
px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium 
hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50
```

**Secondary 버튼**:
```
px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] 
text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/20 transition-colors
```

**Danger 버튼** (삭제):
```
px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600
```

**Ghost 버튼** (텍스트만):
```
px-3 py-1.5 rounded-lg text-[var(--color-text-secondary)] 
hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]
```

**작은 버튼**:
```
px-3 py-1.5 rounded-md text-sm ...
```

**큰 버튼** (전체 너비):
```
w-full px-4 py-3 rounded-lg ... text-base font-semibold
```

---

### 📝 입력 필드

**Text input (기본)**:
```
w-full px-3 py-2 rounded-lg border border-[var(--color-border)] 
bg-[var(--color-surface)] text-[var(--color-text-primary)]
focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none
```

**아이콘 있는 input**:
```tsx
<div className="relative">
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
  <input className="w-full pl-10 pr-3 py-2 rounded-lg border ..." />
</div>
```

**Textarea**:
```
w-full px-3 py-2 rounded-lg border border-[var(--color-border)] 
bg-[var(--color-surface)] resize-none
```

**Select**:
```
w-full px-3 py-2 rounded-lg border border-[var(--color-border)] 
bg-[var(--color-surface)] text-[var(--color-text-primary)]
```

**에러 상태**:
```
border-red-500 focus:ring-red-500
```

---

### 📦 카드/컨테이너

**기본 카드**:
```
p-5 rounded-xl shadow-sm bg-[var(--color-surface)]
```

**호버 카드** (클릭 가능):
```
p-5 rounded-xl shadow-sm bg-[var(--color-surface)] 
hover:shadow-md transition-shadow cursor-pointer
```

**선택된 카드**:
```
p-5 rounded-xl shadow-sm bg-[var(--color-primary)]/10 
border-2 border-[var(--color-primary)]
```

**큰 카드** (주요 섹션):
```
p-6 rounded-xl shadow bg-[var(--color-surface)]
```

---

### 🏷️ 배지/태그

**기본 배지**:
```
px-2 py-0.5 rounded-full text-xs bg-[var(--color-accent)] text-white
```

**상태별 배지**:
```tsx
// 성공/활성
bg-green-500 text-white

// 진행 중
bg-yellow-500 text-white

// 실패/취소
bg-red-500 text-white

// 중립
bg-gray-400 text-white
```

**얇은 배지** (outlined):
```
px-2 py-0.5 rounded-full text-xs border border-[var(--color-border)] 
text-[var(--color-text-secondary)]
```

---

### 📐 레이아웃

**페이지 컨테이너**:
```
p-6 max-w-6xl mx-auto
```

**폼 컨테이너** (좁게):
```
p-6 max-w-2xl mx-auto
```

**좌우 여백 모바일**:
```
px-4 sm:px-6 lg:px-8
```

---

### 📊 그리드

**카드 그리드 (반응형 1→2→3)**:
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
```

**스탯 그리드 (2→4)**:
```
grid grid-cols-2 lg:grid-cols-4 gap-4
```

**Flex 레이아웃 (세로 → 가로)**:
```
flex flex-col lg:flex-row gap-6
```

---

### 📱 반응형 Breakpoint

```
기본  (mobile)  < 640px
sm:             ≥ 640px  (tablet)
md:             ≥ 768px
lg:             ≥ 1024px (desktop)
xl:             ≥ 1280px
```

**모바일 우선 작성**:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
         ↑ 모바일 기본        ↑ sm 이상         ↑ lg 이상
```

---

### 🎨 텍스트

**제목**:
```
text-2xl font-bold text-[var(--color-text-primary)]        // h1
text-xl font-semibold text-[var(--color-text-primary)]     // h2
text-lg font-semibold text-[var(--color-text-primary)]     // h3
```

**본문**:
```
text-sm text-[var(--color-text-primary)]                   // 기본
text-xs text-[var(--color-text-secondary)]                 // 보조
```

**링크**:
```
text-[var(--color-primary)] hover:underline
```

---

### ⚡ 애니메이션/전환

**전환 (hover 효과)**:
```
transition-colors           // 색상만
transition-shadow           // 그림자만
transition-all              // 전체 (성능 주의)
duration-200                // 기본 (200ms)
```

**스피너**:
```tsx
<div className="animate-spin h-8 w-8 border-b-2 border-[var(--color-primary)] rounded-full" />
```

**Pulse (깜박임)**:
```
animate-pulse
```

---

## 🧹 4. 흔한 실수 7개

1. **❌ `bg-white`를 body에** → globals.css 덮어씀
   ```tsx
   // 금지
   <body className="bg-gray-50">
   // 올바름: body는 globals.css가 자동 설정. 페이지 div에만 배경 설정.
   ```

2. **❌ 색상 하드코딩**
   ```tsx
   // 금지: bg-blue-500
   // 올바름: bg-[var(--color-primary)]
   ```

3. **❌ `@tailwind` 지시어**
   ```css
   /* 금지 */
   @tailwind base;
   /* 올바름 */
   @import "tailwindcss";
   ```

4. **❌ flex-col 기본으로 잡고 lg에서 flex-row**
   ```tsx
   // 올바름: 모바일 우선
   <div className="flex flex-col lg:flex-row">
   ```

5. **❌ 반응형 class 순서 잘못**
   ```tsx
   // 금지: lg: → sm: (순서 중요)
   // 올바름: 기본 → sm → md → lg → xl
   ```

6. **❌ className에 조건부 체인 너무 길게**
   ```tsx
   // 어려움
   className={`px-4 py-2 ${x ? 'bg-red' : y ? 'bg-blue' : 'bg-gray'}`}
   // 추천: clsx or tailwind-merge
   import { clsx } from 'clsx';
   className={clsx('px-4 py-2', { 'bg-red': x, 'bg-blue': y && !x, 'bg-gray': !x && !y })}
   ```

7. **❌ `rounded` 단독 사용** (기본 4px, 애매함)
   ```tsx
   // 추천: rounded-lg (8px) 또는 rounded-xl (12px) 구체적으로
   ```

---

## 🎯 5. 공통 UI 요소 조합 (copy-paste용)

### 로딩 스피너
```tsx
<div className="flex justify-center py-20">
  <div className="animate-spin h-8 w-8 border-b-2 border-[var(--color-primary)] rounded-full" />
</div>
```

### 빈 상태
```tsx
<div className="text-center py-20 text-[var(--color-text-secondary)]">
  데이터가 없습니다
</div>
```

### 에러 상태
```tsx
<div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700">
  오류: {error}
</div>
```

### 성공 토스트
```tsx
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg bg-green-600 text-white shadow-lg">
  저장 완료!
</div>
```

### 구분선
```tsx
<hr className="border-[var(--color-border)]" />
<div className="border-t border-[var(--color-border)]" />
```

### 아이콘 + 텍스트 버튼
```tsx
<button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white">
  <Plus size={16} />
  <span>추가</span>
</button>
```

---

## 🎯 6. 자체 검증 (사용 전!)

- [ ] `@tailwind` 지시어 안 씀? (v4는 `@import`)
- [ ] 색상 하드코딩 없나? (CSS 변수 사용)
- [ ] body에 배경색 하드코딩 없나?
- [ ] 반응형 순서 올바른가? (기본 → sm → lg)
- [ ] rounded-lg 또는 rounded-xl 명시?
- [ ] hover transition 있나?
- [ ] 긴 className은 여러 줄로 분할?
