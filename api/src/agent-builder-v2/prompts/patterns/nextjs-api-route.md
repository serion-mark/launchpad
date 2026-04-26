# Next.js API Route 표준 패턴 (Foundry v2)

## ⚠️ 핵심 원칙
- App Router 사용 (`src/app/api/[resource]/route.ts`)
- Pages Router (`pages/api/`) 사용 X
- 모든 사용자 데이터 = `userId` 필터 필수 (보안)
- 한국어 에러 메시지

---

## 1. 폴더 구조

```
src/app/api/
├─ auth/
│  ├─ signup/route.ts
│  ├─ login/route.ts
│  ├─ logout/route.ts
│  └─ me/route.ts
└─ [resource]/                ← 예: books, customers, orders
   ├─ route.ts                ← GET (목록) / POST (생성)
   └─ [id]/route.ts           ← GET / PUT / DELETE (단건)
```

---

## 2. 인증 헬퍼 (모든 보호 API 에서 사용)

```typescript
// src/lib/api-auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export type AuthedUser = { userId: string; email: string };

export async function requireAuth(req: NextRequest): Promise<
  | { ok: true; user: AuthedUser }
  | { ok: false; response: NextResponse }
> {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }),
    };
  }
  const payload = verifyToken(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: '세션이 만료되었습니다.' }, { status: 401 }),
    };
  }
  return { ok: true, user: payload };
}
```

---

## 3. CRUD API 패턴 — 목록 + 생성 (route.ts)

```typescript
// src/app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

// GET /api/books - 본인 책 목록
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const books = await prisma.book.findMany({
    where: { userId: auth.user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ books });
}

// POST /api/books - 새 책 추가
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { title, author, pages, rating, memo } = await req.json();

  if (!title) {
    return NextResponse.json(
      { error: '책 제목은 필수입니다.' },
      { status: 400 },
    );
  }

  const book = await prisma.book.create({
    data: {
      userId: auth.user.userId,
      title,
      author,
      pages,
      rating,
      memo,
    },
  });

  return NextResponse.json({ book }, { status: 201 });
}
```

---

## 4. 단건 API 패턴 — 조회 + 수정 + 삭제 ([id]/route.ts)

```typescript
// src/app/api/books/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

// GET /api/books/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const book = await prisma.book.findFirst({
    where: { id, userId: auth.user.userId },  // ⚠️ userId 필터 필수 (본인 데이터만)
  });

  if (!book) {
    return NextResponse.json({ error: '책을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ book });
}

// PUT /api/books/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const data = await req.json();

  // 소유자 확인
  const existing = await prisma.book.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: '책을 찾을 수 없습니다.' }, { status: 404 });
  }

  const book = await prisma.book.update({
    where: { id },
    data: {
      title: data.title,
      author: data.author,
      pages: data.pages,
      rating: data.rating,
      memo: data.memo,
      finishedAt: data.finishedAt,
    },
  });

  return NextResponse.json({ book });
}

// DELETE /api/books/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // 소유자 확인
  const existing = await prisma.book.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: '책을 찾을 수 없습니다.' }, { status: 404 });
  }

  await prisma.book.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
```

---

## 5. ⚠️ Next.js 16+ 라우트 핸들러 변경사항

### params 는 Promise (await 필수)
```typescript
// ❌ 구버전
{ params }: { params: { id: string } }
const { id } = params;

// ✅ Next.js 15/16
{ params }: { params: Promise<{ id: string }> }
const { id } = await params;
```

### searchParams 도 Promise
```typescript
// 페이지에서
{ searchParams }: { searchParams: Promise<{ q?: string }> }
const { q } = await searchParams;
```

---

## 6. 흔한 실수 방지

### 6.1 보안
- ❌ `prisma.book.findUnique({ where: { id } })` — 본인 확인 누락
- ✅ `prisma.book.findFirst({ where: { id, userId: auth.user.userId } })`

### 6.2 에러 처리
- ❌ try-catch 없음 (500 에러 그대로 노출)
- ✅ try-catch + console.error + 한국어 메시지

### 6.3 응답 형식
- ❌ `return book` (NextResponse 누락)
- ✅ `return NextResponse.json({ book })`

### 6.4 password 노출
- ❌ `prisma.user.findUnique({ where: { id } })` (password 포함)
- ✅ `select: { id: true, email: true, name: true }`

---

## 7. 클라이언트 호출 패턴 (페이지에서 fetch)

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function BooksPage() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => setBooks(data.books));
  }, []);

  async function addBook(book) {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    if (res.ok) {
      const { book: created } = await res.json();
      setBooks([created, ...books]);
    }
  }

  return <div>...</div>;
}
```

---

## 8. 작성 체크리스트

- [ ] App Router 경로 (`src/app/api/[resource]/route.ts`)
- [ ] requireAuth 호출 (보호 API)
- [ ] userId 필터 (본인 데이터만)
- [ ] try-catch + 한국어 에러
- [ ] NextResponse.json (status code 적절)
- [ ] params await (Next.js 15/16)
- [ ] password 응답 제외
