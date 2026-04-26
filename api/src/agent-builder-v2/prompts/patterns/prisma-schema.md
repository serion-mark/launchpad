# Prisma Schema 표준 패턴 (Foundry v2)

## ⚠️ 핵심 규칙
- **User 모델 필수** (인증 기반)
- 사용자 데이터 모델은 `userId` 외래키
- `@@schema("app_xxxx")` 어노테이션 = **provision_app_v2 도구가 자동 추가**
- generator/datasource 블록 = **provision_app_v2 도구가 자동 추가**

→ Claude 가 작성할 부분 = **model 정의만**

---

## 1. 기본 User 모델 (모든 앱 공통)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hash (절대 평문 X)
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

⚠️ `@@schema(...)` 는 도구가 자동 추가하니 작성 X.

---

## 2. 앱별 모델 예제

### 2.1 독서 기록 앱

```prisma
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
  rating      Int?      // 1~5
  startedAt   DateTime?
  finishedAt  DateTime?
  memo        String?   @db.Text
  createdAt   DateTime  @default(now())
  
  @@index([userId])
}
```

### 2.2 단골 관리 앱 (카페/미용실)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  
  customers Customer[]
}

model Customer {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  name        String
  phone       String?
  preference  String?  @db.Text   // 음료/시술 취향 메모
  visitCount  Int      @default(0)
  lastVisitAt DateTime?
  createdAt   DateTime @default(now())
  
  @@index([userId])
}
```

### 2.3 굿즈 사전주문 페이지

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  
  orders    Order[]
}

model Product {
  id          String   @id @default(cuid())
  name        String
  description String   @db.Text
  price       Int      // 원화, 정수
  imageUrl    String?
  stock       Int      @default(0)
  createdAt   DateTime @default(now())
  
  orders      Order[]
}

model Order {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  
  quantity    Int      @default(1)
  size        String?  // S/M/L
  status      String   @default("pending")  // pending / paid / shipped
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([productId])
}
```

---

## 3. Prisma Client 사용 패턴 (src/lib/prisma.ts)

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

⚠️ Next.js dev 모드 hot reload 시 PrismaClient 인스턴스 폭증 방지 = 싱글톤 필수.

---

## 4. 흔한 실수 방지

### 4.1 절대 하지 말 것
- ❌ `password String?` — nullable 금지 (인증 깨짐)
- ❌ `email String` (unique 없음) — 중복 가입 됨
- ❌ `id Int @id @default(autoincrement())` — Foundry 본체 패턴은 `cuid()` 사용
- ❌ `@@schema("public")` 명시 — provision_app_v2 가 자동 처리

### 4.2 권장
- ✅ `cuid()` 사용 (URL safe + 정렬 가능)
- ✅ `onDelete: Cascade` (User 삭제 시 자식 데이터 같이)
- ✅ `@@index([userId])` (성능)
- ✅ `@updatedAt` (자동 갱신)
- ✅ 큰 텍스트는 `@db.Text` (varchar 한계 회피)

---

## 5. 마이그레이션 명령 (Claude 가 bash 도구로 실행)

provision_app_v2 호출 후:
```bash
npx prisma generate    # Prisma client 생성 (TypeScript 타입)
npx prisma db push     # schema → DB 반영 (개발)
```

⚠️ `prisma migrate dev` 는 v2 모드에서 사용 X (멀티테넌트 schema 관리 충돌). `db push` 만 사용.

---

## 6. 작성 흐름 (Claude 가 따라야 할 순서)

```
1. 사용자 의뢰 분석 → 어떤 모델 필요한지 식별
2. patterns/prisma-schema.md 의 위 예제 참고
3. User 모델 (필수) + 앱별 모델 작성
4. provision_app_v2 도구 호출 (prismaSchema 전달)
5. bash: npx prisma generate && npx prisma db push
6. src/lib/prisma.ts 작성 (위 코드 그대로 복붙)
7. API Routes 에서 prisma 사용
```
