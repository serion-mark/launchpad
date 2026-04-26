# 자체 JWT 인증 패턴 (Foundry v2)

## ⚠️ 핵심 원칙
- **외부 라이브러리 미사용** (NextAuth.js / Clerk / Auth0 금지)
- **bcrypt + jsonwebtoken** 두 패키지만 사용
- **Foundry 본체와 동일 패턴** (사장님 13년 검증)
- **Supabase Auth 절대 금지** (`auth.signUp`, `auth.signIn` 등)

---

## 1. 의존성 (package.json 자동 포함)

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5"
  }
}
```

bash 명령 (필요 시):
```bash
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken
```

---

## 2. src/lib/auth.ts (헬퍼 함수, 그대로 복붙)

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 환경변수 미설정');
}

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
```

---

## 3. 회원가입 API (src/app/api/auth/signup/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호는 필수입니다.' },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 },
      );
    }

    // 중복 확인
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다.' },
        { status: 409 },
      );
    }

    // 생성
    const hash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hash, name },
    });

    // 토큰 발급
    const token = generateToken(user.id, user.email);

    // 쿠키 설정 (httpOnly, 7일)
    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err: any) {
    console.error('signup error:', err);
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

---

## 4. 로그인 API (src/app/api/auth/login/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 },
      );
    }

    const token = generateToken(user.id, user.email);
    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err: any) {
    console.error('login error:', err);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
```

---

## 5. 로그아웃 API (src/app/api/auth/logout/route.ts)

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('token');
  return response;
}
```

---

## 6. 현재 사용자 조회 (src/app/api/auth/me/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return NextResponse.json({ user });
}
```

---

## 7. 인증 미들웨어 (src/middleware.ts)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PROTECTED_PATHS = ['/dashboard', '/profile', '/books', '/settings'];

export function middleware(request: NextRequest) {
  const isProtected = PROTECTED_PATHS.some(p =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (isProtected) {
    const token = request.cookies.get('token')?.value;
    if (!token || !verifyToken(token)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/books/:path*', '/settings/:path*'],
};
```

⚠️ matcher 의 path 는 사용자 앱의 실제 보호 경로로 변경.

---

## 8. 보호된 API Route (현재 사용자 가져오기)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  // 토큰 검증
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '세션이 만료되었습니다.' }, { status: 401 });
  }

  // 본인 데이터만 조회
  const books = await prisma.book.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ books });
}
```

---

## 9. 클라이언트 사이드 (로그인 페이지 form)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || '로그인 실패');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="...">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit">로그인</button>
    </form>
  );
}
```

---

## 10. 흔한 실수 방지

| ❌ | ✅ |
|---|---|
| 비밀번호 평문 저장 | bcrypt.hash(plain, 10) |
| JWT_SECRET 하드코딩 | process.env.JWT_SECRET |
| 토큰 localStorage 저장 (XSS) | httpOnly 쿠키 |
| password 응답에 포함 | select 로 제외 |
| 만료시간 1년+ | 7일~30일 권장 |

---

## 11. 작성 흐름

```
1. provision_app_v2 호출 (JWT_SECRET 자동 생성됨)
2. npm install bcrypt jsonwebtoken @types/bcrypt @types/jsonwebtoken
3. src/lib/prisma.ts 작성 (patterns/prisma-schema.md § 3)
4. src/lib/auth.ts 작성 (위 § 2 그대로)
5. src/app/api/auth/signup/route.ts (위 § 3)
6. src/app/api/auth/login/route.ts (위 § 4)
7. src/app/api/auth/logout/route.ts (위 § 5, 선택)
8. src/app/api/auth/me/route.ts (위 § 6, 선택)
9. src/middleware.ts (위 § 7) — 보호 경로 설정
10. login/signup 페이지 작성 (Tailwind UI)
```
