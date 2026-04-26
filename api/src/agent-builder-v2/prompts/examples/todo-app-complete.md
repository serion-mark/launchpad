# 완전 예제: 독서 기록 앱 (Foundry v2)

이 예제는 Claude (포비) 가 **그대로 따라하면 작동하는 앱**의 완전판입니다.

## 사용자 의뢰
> "독서 기록 앱 만들어줘. 책 제목/저자/별점/메모 기록할 수 있게."

---

## 1단계: 답지 추정 + AskUser (있으면)

답지 자동 추정:
- 앱 이름: "독서 기록 앱" 또는 "BookLog"
- 서브도메인: `booklog-{random4}-v2`
- 부가 옵션: 🔐 자체 백엔드 (로그인 + DB 저장) ✓ 추정 / 🌐 서브도메인 배포 ✓ 추정

→ 사용자 확인 후 즉시 시작.

---

## 2단계: provision_app_v2 호출

```typescript
// 도구 호출 input
{
  prismaSchema: `
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  
  books     Book[]
}

model Book {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title       String
  author      String?
  pages       Int?
  rating      Int?
  startedAt   DateTime?
  finishedAt  DateTime?
  memo        String?   @db.Text
  createdAt   DateTime  @default(now())
  
  @@index([userId])
}
  `
}
```

도구 출력:
```
✅ Foundry v2 자체 백엔드 자동 프로비저닝 완료
- Postgres schema: app_xxxx
- prisma/schema.prisma 작성됨
- .env.local 자동 주입
  • DATABASE_URL=postgres://...?schema=app_xxxx
  • JWT_SECRET=... (32 bytes)
  • APP_SCHEMA=app_xxxx
```

---

## 3단계: 의존성 설치 + Prisma 마이그레이션

```bash
# bash 도구로 실행
npm install bcrypt jsonwebtoken @prisma/client
npm install -D @types/bcrypt @types/jsonwebtoken prisma
npx prisma generate
npx prisma db push
```

---

## 4단계: 헬퍼 파일 작성

### src/lib/prisma.ts
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### src/lib/auth.ts
(patterns/auth-jwt.md § 2 그대로)

### src/lib/api-auth.ts
(patterns/nextjs-api-route.md § 2 그대로)

---

## 5단계: API Routes 작성

### src/app/api/auth/signup/route.ts
(patterns/auth-jwt.md § 3 그대로)

### src/app/api/auth/login/route.ts
(patterns/auth-jwt.md § 4 그대로)

### src/app/api/books/route.ts
(patterns/nextjs-api-route.md § 3 그대로)

### src/app/api/books/[id]/route.ts
(patterns/nextjs-api-route.md § 4 그대로)

---

## 6단계: 페이지 작성

### src/app/layout.tsx
(patterns/nextjs-page.md § 2 그대로)

### src/app/page.tsx (홈)
(patterns/nextjs-page.md § 4 그대로 — 독서 기록 앱 슬로건으로 수정)

### src/app/(auth)/login/page.tsx
### src/app/(auth)/signup/page.tsx
(patterns/nextjs-page.md § 5 그대로)

### src/app/(main)/layout.tsx
(patterns/nextjs-page.md § 7 그대로)

### src/app/(main)/dashboard/page.tsx
(patterns/nextjs-page.md § 6 그대로)

### src/app/(main)/books/new/page.tsx (책 추가)
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBookPage() {
  const [form, setForm] = useState({ title: '', author: '', rating: 0, memo: '' });
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) router.push('/dashboard');
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">📖 새 책 추가</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="책 제목 *"
          required
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-3 border rounded-lg"
        />
        <input
          type="text"
          placeholder="저자"
          value={form.author}
          onChange={e => setForm({ ...form, author: e.target.value })}
          className="w-full px-4 py-3 border rounded-lg"
        />
        <select
          value={form.rating}
          onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
          className="w-full px-4 py-3 border rounded-lg"
        >
          <option value={0}>별점 선택</option>
          <option value={1}>★</option>
          <option value={2}>★★</option>
          <option value={3}>★★★</option>
          <option value={4}>★★★★</option>
          <option value={5}>★★★★★</option>
        </select>
        <textarea
          placeholder="메모"
          value={form.memo}
          onChange={e => setForm({ ...form, memo: e.target.value })}
          rows={5}
          className="w-full px-4 py-3 border rounded-lg"
        />
        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold"
        >
          저장
        </button>
      </form>
    </div>
  );
}
```

### src/app/(main)/books/[id]/page.tsx
(patterns/nextjs-page.md § 8 그대로 — 수정 폼 추가 가능)

---

## 7단계: middleware (보호 경로)

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const protectedPaths = ['/dashboard', '/books'];
  const isProtected = protectedPaths.some(p =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (isProtected) {
    const token = request.cookies.get('token')?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/books/:path*'],
};
```

---

## 8단계: 빌드 검증 + 배포

```bash
# 도구 호출
check_build  # npm run build
deploy_to_subdomain  # PM2 + nginx
```

---

## 9단계: 사용자 응답

```
✅ 독서 기록 앱 완성
🌐 https://booklog-xxxx-v2.foundry.ai.kr
🔐 자체 백엔드 연결됨 (Postgres + Prisma + JWT)

📄 만들어진 페이지
- / 홈 (서비스 소개)
- /signup, /login 회원가입/로그인
- /dashboard 내 책 목록
- /books/new 새 책 추가
- /books/[id] 책 상세

💡 이어서 뭘 해볼까요?
1. 독서 통계 페이지 (월별 권수 + 평균 별점 그래프)
2. 책 검색 기능 (저자/제목 필터)
3. 독서 목표 (이번 달 5권 등) 진행률
```

---

## ⚠️ 검증 (작동 확인)

배포 후 사용자가 확인해야 할 것:
1. 회원가입 → DB 의 users 테이블에 row 생성
2. 로그인 → JWT 발급 + 쿠키 저장
3. 책 추가 → books 테이블에 row 생성
4. 다음날 다시 와도 데이터 유지
5. **Supabase 호출 0건** (네트워크 모니터링)

---

## 📊 이 예제의 의미

이 코드 그대로 만들면:
- ✅ 작동하는 작은 앱 1개
- ✅ Supabase 0% 사용
- ✅ 운영비 거의 $0/월
- ✅ Foundry 본체와 동일 패턴
- ✅ Pre-A 단계 사용자에게 "진짜 마진 95%" 증명

이게 **Foundry v2 의 본질**이다.
