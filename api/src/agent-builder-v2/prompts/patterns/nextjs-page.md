# Next.js 페이지 표준 패턴 (Foundry v2)

## ⚠️ 핵심 원칙
- App Router 사용 (`src/app/*/page.tsx`)
- 'use client' 클라이언트 사이드 hook 사용 시
- Tailwind CSS + Pretendard 폰트
- 한국어 UI / 모바일 우선

---

## 1. 폴더 구조 표준

```
src/app/
├─ layout.tsx                 ← 공통 레이아웃 (Pretendard 폰트, 메타)
├─ page.tsx                   ← 홈 / 랜딩
├─ globals.css                ← Tailwind base
├─ (auth)/                    ← 인증 그룹 (보통 로그인 후 리다이렉트)
│  ├─ login/page.tsx
│  └─ signup/page.tsx
├─ (main)/                    ← 메인 그룹 (인증 필요)
│  ├─ layout.tsx              ← 사이드바/네비
│  ├─ dashboard/page.tsx
│  └─ [resource]/             ← books, customers 등
│     ├─ page.tsx             ← 목록
│     └─ [id]/page.tsx        ← 상세
└─ api/                       ← API Routes (patterns/nextjs-api-route.md)
```

---

## 2. 공통 layout.tsx

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '독서 기록 앱',
  description: '읽은 책을 기록하고 관리하세요',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="font-pretendard antialiased text-gray-900">
        {children}
      </body>
    </html>
  );
}
```

---

## 3. globals.css (Tailwind v4)

```css
@import "tailwindcss";

@theme {
  --font-pretendard: "Pretendard Variable", Pretendard, system-ui, sans-serif;
}

body {
  font-family: var(--font-pretendard);
}
```

---

## 4. 홈 / 랜딩 페이지 (page.tsx)

```typescript
// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* 좌측 텍스트 */}
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              독서 기록을 <br />
              간편하게
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 mb-8">
              읽은 책 정리 + 독서 통계 + 메모 모두 한 곳에서
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition text-center"
              >
                시작하기
              </Link>
              <Link
                href="/login"
                className="border border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition text-center"
              >
                로그인
              </Link>
            </div>
          </div>
          {/* 우측 이미지/카드 */}
          <div className="hidden lg:block">
            {/* 일러스트 또는 스크린샷 */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. 로그인/회원가입 페이지

`patterns/auth-jwt.md` § 9 의 폼 + Tailwind 스타일링 적용:

```typescript
// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || '로그인 실패');
      return;
    }

    router.push(redirect);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">로그인</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-orange-500 font-semibold">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## 6. 보호된 페이지 (대시보드)

```typescript
// src/app/(main)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Book = {
  id: string;
  title: string;
  author: string | null;
  rating: number | null;
  finishedAt: string | null;
};

export default function DashboardPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        setBooks(data.books);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">내 독서 기록</h1>
        <Link
          href="/books/new"
          className="bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
        >
          + 책 추가
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : books.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">아직 등록된 책이 없어요</p>
          <Link href="/books/new" className="text-orange-500 font-semibold">
            첫 책 추가하기 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map(book => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="block bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100"
            >
              <h2 className="font-bold text-lg mb-2 line-clamp-2">{book.title}</h2>
              {book.author && <p className="text-sm text-gray-600 mb-2">{book.author}</p>}
              {book.rating && (
                <p className="text-yellow-500">{'★'.repeat(book.rating)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 7. 메인 그룹 layout (네비)

```typescript
// src/app/(main)/layout.tsx
import Link from 'next/link';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비 (모바일 + PC 공통, PC 는 더 강조) */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-orange-500">
            📖 독서 기록
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hover:text-orange-500 transition">
              내 책
            </Link>
            <Link href="/profile" className="hover:text-orange-500 transition">
              프로필
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-gray-500 hover:text-red-500 transition">
                로그아웃
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

---

## 8. 동적 라우트 ([id]/page.tsx)

```typescript
// src/app/(main)/books/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);  // Next.js 15/16 — params Promise
  const router = useRouter();
  const [book, setBook] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then(res => res.json())
      .then(data => setBook(data.book));
  }, [id]);

  async function handleDelete() {
    if (!confirm('정말 삭제하시겠어요?')) return;
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
    router.push('/dashboard');
  }

  if (!book) return <div className="p-8">불러오는 중...</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-4">{book.title}</h1>
      <p className="text-gray-600 mb-2">{book.author}</p>
      {book.memo && <p className="bg-gray-50 p-4 rounded-lg mt-4">{book.memo}</p>}
      <div className="mt-8 flex gap-2">
        <button onClick={handleDelete} className="text-red-500">
          삭제
        </button>
      </div>
    </div>
  );
}
```

---

## 9. 흔한 실수 방지

### 9.1 'use client' 빠뜨림
- ❌ `useState`, `useEffect`, 이벤트 핸들러 있는데 `'use client'` 없음 → 에러
- ✅ 클라이언트 hook 쓰는 페이지 맨 위에 `'use client';`

### 9.2 params Promise 처리
- ❌ Next.js 16 에서 `params.id` 직접 접근 → 에러
- ✅ `use(params)` 또는 `await params`

### 9.3 next/link 안 쓰고 a 태그
- ❌ `<a href="/dashboard">` (전체 페이지 새로고침)
- ✅ `<Link href="/dashboard">` (클라이언트 라우팅)

### 9.4 모바일 미고려
- ❌ `grid-cols-3` (모바일에서 너무 좁음)
- ✅ `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## 10. 작성 체크리스트

- [ ] layout.tsx (공통, Pretendard 폰트)
- [ ] page.tsx (홈/랜딩)
- [ ] (auth)/login/page.tsx
- [ ] (auth)/signup/page.tsx
- [ ] (main)/layout.tsx (네비)
- [ ] (main)/dashboard/page.tsx
- [ ] (main)/[resource]/page.tsx (목록)
- [ ] (main)/[resource]/[id]/page.tsx (상세)
- [ ] middleware.ts (보호 경로)
- [ ] globals.css (Tailwind import)
