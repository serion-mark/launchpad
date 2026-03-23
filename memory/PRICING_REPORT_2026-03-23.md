# Foundry 요금제 설계 보고서
**작성일**: 2026-03-23
**작성자**: 사장님 + 자비스 브레인스토밍
**용도**: Phase 12에서 이 보고서를 읽고 요금제 UI + 결제 로직 구현

---

## 핵심 원칙

1. **구독이 아니다** — 크레딧 충전제 (소진 시 추가 충전)
2. **많이 살수록 싸다** — 대량 충전 할인으로 객단가 상승 유도
3. **성공한 고객이 더 낸다** — 크레딧(진입) → 호스팅(유지) → 독립(졸업)
4. **정부사업비 정산 가능** — 세금계산서 발행, 한도에 맞는 패키지 설계
5. **헤비유저 비용 회수** — 수정 횟수별 크레딧 증가로 API 비용 방어

---

## 요금제 전체 구조 (3단계)

### 🔋 STEP 1: 크레딧 충전 (만들기)

| 크레딧 | 가격 | 크레딧당 단가 | 할인율 |
|--------|------|-------------|--------|
| 1,000cr | 12,000원 | 12원/cr | - |
| 3,000cr | 33,000원 | 11원/cr | 8% |
| 5,000cr | 49,000원 | 9.8원/cr | 18% |
| 20,000cr | 149,000원 | 7.5원/cr | 37% |
| 50,000cr | 249,000원 | 5원/cr | 58% ⭐ BEST |

**크레딧 사용 단가표:**

| 기능 | 크레딧 소모 | 실제 원가(API) | 마진 |
|------|-----------|--------------|------|
| 앱 생성 | 3,000cr | ~500원 | 96%+ |
| AI 수정 (1~5회) | 500cr | ~200원 | 92%+ |
| AI 수정 (6~10회) | 800cr | ~200원 | 95%+ |
| AI 수정 (11회~) | 1,200cr | ~200원 | 97%+ |
| AI 회의실 스탠다드 | 300cr | ~200원 | 85%+ |
| AI 회의실 프리미엄 | 1,500cr | ~800원 | 90%+ |
| 추가 채팅 | 100cr | ~50원 | 90%+ |
| 추가 분석 (3AI) | 500cr | ~300원 | 85%+ |
| AI 이미지 생성 | 200cr | ~100원 | 87%+ |
| 스마트 분석 | 200cr | ~150원 | 85%+ |

**수정 횟수별 크레딧 증가 (헤비유저 방어):**
- 1~5번째 수정: 500cr
- 6~10번째 수정: 800cr (60% 증가)
- 11번째~: 1,200cr (140% 증가)
- → 프로젝트별 카운트, 새 프로젝트는 리셋

### 🏠 STEP 2: 호스팅 (운영하기)

| 항목 | 가격 |
|------|------|
| 호스팅 | 29,000원/월/앱 |
| 도메인 | *.foundry.ai.kr (포함) |

- 배포된 앱 유지 비용
- 미결제 시 30일 후 앱 비활성화 (데이터 보존, 재결제 시 복구)

### 🚀 STEP 3: 독립하기 (졸업하기)

| 패키지 | 가격 | 포함 내용 |
|--------|------|---------|
| 📦 코드팩 | 990,000원 | 전체 소스코드 ZIP + 배포 가이드 |
| 📦 프로팩 | 1,990,000원 | 코드팩 + DB 스키마 문서(ERD) + API 명세서(Swagger) + 외주사 인수인계 체크리스트 + Supabase→PostgreSQL 마이그레이션 가이드 |
| 📦 엔터프라이즈 | 4,990,000원 | 프로팩 + AI 코드 리뷰 보고서(품질/보안/성능) + 커스텀 도메인 배포 대행 + 1개월 기술 지원(이메일) + 아키텍처 확장 가이드 |

- 프로젝트 단위 구매 (앱 1개당 1번 구매)
- 독립 후 호스팅 해지 가능

---

## 🏛️ 모두의 창업 전용 패키지

**대상**: 모두의 창업 프로젝트 1라운드 선정 창업자 (약 5,000명)
**한도**: 월 최대 100만원
**원칙**: 월 단위 결제. 2개월 쓰고 싶으면 2번 결제하면 됨.

### 🥉 라이트 (490,000원/월)

| 항목 | 내용 |
|------|------|
| 크레딧 | 50,000cr (일반 충전과 동일 단가!) |
| 호스팅 | 1개월 포함 |
| AI 회의실 | 프리미엄 3회 |
| 세금계산서 | 발행 가능 |

- "절반만 써보고 나머지 예산은 다른 솔루션에"
- 크레딧 단가 = 일반 충전과 동일 (5원/cr)
- 프리미엄 회의실 3회가 보너스!
- 따로 사면: 249,000(cr) + 29,000(호스팅) + 프리미엄 = 345,500원+
- 패키지 490,000원 → 번들 할인 + 편의성

### 🥈 스탠다드 (990,000원/월)

| 항목 | 내용 |
|------|------|
| 크레딧 | 100,000cr (일반 충전과 동일 단가!) |
| 호스팅 | 1개월 포함 |
| AI 회의실 | 프리미엄 5회 |
| 독립 | 코드팩 포함!! (99만→35만 할인!) |
| 세금계산서 | 발행 가능 |

- "월 한도 풀로 쓴다"
- 크레딧 단가 = 일반 충전과 동일 (5원/cr)
- 따로 사면: 498,000(cr) + 29,000(호스팅) + 프리미엄 + 990,000(코드팩) = 1,519,000원+
- 패키지 990,000원 → **53만원 절약!! 코드팩이 65% 할인!!**
- 2개월 쓰려면? → 다음 달에 한번 더 결제

### 모두의 창업 패키지 선택 가이드

```
"49만원만 쓸래"        → 🥉 라이트
"100만원 다 쓸래"      → 🥈 스탠다드
"2개월 다 쓸래"        → 아무거나 2번 결제!
"나머지는 다른 솔루션"  → 🥉 라이트 + 남은 예산 자유 사용
```

### ⚠️ 일반 충전과 충돌 방지
- 크레딧 단가는 일반 충전과 동일 (5원/cr)
- 모두의 창업 패키지 = 크레딧 + 부가서비스 번들
- 고객이 "일반 충전이 더 싸네?"라고 느끼면 안 됨

---

## 정부사업비 매칭 시뮬레이션

### 모두의 창업 (200만원 한도)
```
모두의 창업 전용 패키지: 1,990,000원 ✅ 한도 내
```

### 예창패/창중대 (500만원 한도)
```
크레딧 50,000cr:       249,000원
호스팅 6개월:          174,000원
엔터프라이즈 독립:   4,990,000원
합계:               5,413,000원 (약간 초과 → 프로팩으로 조정)

또는:
크레딧 50,000cr:       249,000원
호스팅 6개월:          174,000원
프로팩 독립:        1,990,000원
추가 크레딧 50,000cr:  249,000원
합계:               2,662,000원 ✅
```

---

## UI 구현 가이드 (Phase 12용)

### /credits 페이지 구조

```
┌──────────────────────────────────────────────┐
│                                              │
│  🏛️ 모두의 창업 선정자이신가요?                │
│  ┌──────────────────────────────────────┐   │
│  │ 모두의 창업 전용 패키지               │   │
│  │ 1,990,000원 (2개월)                  │   │
│  │ ✅ 100,000cr + 호스팅 + 회의실 + 독립 │   │
│  │ [자세히 보기]                         │   │
│  └──────────────────────────────────────┘   │
│                                              │
│────────────────────────────────────────────── │
│                                              │
│  🔋 크레딧 충전                                │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ 5,000cr│ │20,000cr│ │50,000cr│          │
│  │49,000원│ │149,000원│ │249,000원│         │
│  │        │ │15% 할인 │ │58%할인⭐│         │
│  └────────┘ └────────┘ └────────┘          │
│                                              │
│  소량: 1,000cr 12,000원 / 3,000cr 33,000원  │
│                                              │
│────────────────────────────────────────────── │
│                                              │
│  📊 크레딧 사용 안내                           │
│  앱 생성: 3,000cr / 회의실: 300cr~           │
│  수정: 500cr~ / 이미지: 200cr                │
│                                              │
└──────────────────────────────────────────────┘
```

### /dashboard 프로젝트별 독립 패키지 UI

```
┌──────────────────────────────────────────────┐
│ 📱 [프로젝트명]                                │
│ 상태: 운영 중                                  │
│                                              │
│ [수정하기] [미리보기] [배포 관리]                │
│                                              │
│─────────────────────────────────────────────── │
│ 🚀 이 앱을 독립시키기                           │
│                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │📦 코드팩  │ │📦 프로팩  │ │📦 엔터   │     │
│ │99만원    │ │199만원   │ │499만원   │     │
│ │소스코드   │ │+DB문서   │ │+기술지원  │     │
│ │+배포가이드│ │+API명세  │ │+배포대행  │     │
│ │[구매]    │ │[구매]    │ │[구매]    │     │
│ └──────────┘ └──────────┘ └──────────┘     │
│                                              │
│ 💡 정부사업비로 정산 가능 (세금계산서 발행)      │
└──────────────────────────────────────────────┘
```

### 크레딧 부족 시 자동 안내

```
앱 생성 클릭 시 크레딧 부족하면:
┌──────────────────────────────────┐
│ ⚠️ 크레딧이 부족합니다            │
│                                  │
│ 현재: 1,200cr                    │
│ 필요: 3,000cr                    │
│ 부족: 1,800cr                    │
│                                  │
│ [3,000cr 충전 (33,000원)]        │
│ [5,000cr 충전 (49,000원)] ← 추천 │
│                                  │
└──────────────────────────────────┘
```

---

## 백엔드 구현 가이드

### DB 스키마 추가

```prisma
// 크레딧 충전 내역
model CreditCharge {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Int      // 충전 크레딧
  price       Int      // 결제 금액 (원)
  type        String   // 'CREDIT' | 'MODUCREATION' | 'INDEPENDENCE'
  packageName String?  // '5000cr' | '20000cr' | 'moducreation' | 'code_pack' 등
  paymentRef  String?  // 토스 결제 참조
  createdAt   DateTime @default(now())
}

// 독립 패키지 구매
model IndependenceOrder {
  id          String   @id @default(cuid())
  userId      String
  projectId   String
  user        User     @relation(fields: [userId], references: [id])
  project     Project  @relation(fields: [projectId], references: [id])
  tier        String   // 'CODE' | 'PRO' | 'ENTERPRISE'
  price       Int      // 결제 금액
  status      String   @default("PENDING") // PENDING | PROCESSING | COMPLETED
  downloadUrl String?  // ZIP 다운로드 URL
  documents   Json?    // { erd: url, swagger: url, guide: url }
  createdAt   DateTime @default(now())
  completedAt DateTime?
}

// 모두의 창업 패키지
model ModuCreationPackage {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  totalCredits  Int      @default(100000)
  month1Credits Int      @default(50000) // 1개월차 지급
  month2Credits Int      @default(50000) // 2개월차 지급
  premiumMeetings Int    @default(10)
  codePackIncluded Boolean @default(true)
  month1PaidAt  DateTime?
  month2PaidAt  DateTime?
  status        String   @default("ACTIVE")
  createdAt     DateTime @default(now())
}

// User 모델에 추가
model User {
  // 기존 필드...
  credits          Int      @default(0)
  modificationCount Json?   // { projectId: count } — 프로젝트별 수정 횟수
}
```

### API 엔드포인트

```
# 크레딧 충전
POST /credits/charge
  body: { amount: 5000, price: 49000 }
  → 토스 결제 → 크레딧 추가 → CreditCharge 기록

# 크레딧 잔액 조회
GET /credits/balance
  → { credits: 12500, charges: [...] }

# 크레딧 소모 (내부 호출)
POST /credits/use
  body: { amount: 3000, type: 'APP_GENERATE', projectId: '...' }
  → 잔액 체크 → 차감 → 부족 시 402 반환

# 수정 횟수별 크레딧 계산
GET /credits/modification-cost?projectId=xxx
  → { count: 7, cost: 800 } // 6~10회 구간

# 독립 패키지 구매
POST /independence/order
  body: { projectId: '...', tier: 'PRO' }
  → 토스 결제 → 코드 ZIP 생성 → 산출물 생성 → 다운로드 URL

# 독립 패키지 다운로드
GET /independence/:orderId/download
  → ZIP 파일 스트리밍

# 모두의 창업 패키지 구매
POST /moducreation/subscribe
  body: { month: 1 }  // 1개월차 or 2개월차
  → 토스 결제 → 크레딧 지급 → 프리미엄 회의실 활성화

# 모두의 창업 패키지 상태
GET /moducreation/status
  → { month1Paid: true, month2Paid: false, creditsRemaining: 35000, ... }
```

### 독립 패키지 ZIP 생성 로직

```typescript
// independence.service.ts

async generateCodePack(projectId: string): Promise<string> {
  const project = await this.prisma.project.findUnique({ where: { id: projectId } });

  // 1. 프로젝트 코드 수집
  const code = project.generatedCode; // Json 필드

  // 2. ZIP 생성
  const zip = new JSZip();
  for (const [filename, content] of Object.entries(code)) {
    zip.file(filename, content);
  }

  // 3. 배포 가이드 추가
  zip.file('DEPLOY_GUIDE.md', this.generateDeployGuide(project));
  zip.file('README.md', this.generateReadme(project));

  // 4. 업로드 + URL 반환
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const url = await this.uploadToStorage(buffer, `${projectId}/code_pack.zip`);
  return url;
}

async generateProPack(projectId: string): Promise<object> {
  const codePackUrl = await this.generateCodePack(projectId);

  // 추가 산출물
  const erd = await this.generateERD(projectId);           // DB 스키마 → ERD 문서
  const swagger = await this.generateSwagger(projectId);   // API → Swagger 명세
  const handover = await this.generateHandover(projectId); // 인수인계 체크리스트
  const migration = await this.generateMigrationGuide(projectId); // Supabase→PostgreSQL

  return { codePackUrl, erd, swagger, handover, migration };
}

async generateEnterprisePack(projectId: string): Promise<object> {
  const proPack = await this.generateProPack(projectId);

  // 추가 산출물
  const codeReview = await this.aiCodeReview(projectId);      // AI 코드 리뷰 보고서
  const extensionGuide = await this.generateExtensionGuide(projectId); // 확장 가이드

  return { ...proPack, codeReview, extensionGuide };
}
```

---

## 크레딧 부족 시 자동 안내 로직

```typescript
// credit.service.ts

async useCredits(userId: string, amount: number, type: string, projectId?: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });

  // 수정인 경우 횟수별 크레딧 계산
  if (type === 'MODIFY' && projectId) {
    amount = this.getModificationCost(user.modificationCount, projectId);
  }

  if (user.credits < amount) {
    throw new HttpException({
      statusCode: 402,
      message: '크레딧이 부족합니다',
      currentCredits: user.credits,
      requiredCredits: amount,
      shortfall: amount - user.credits,
      suggestions: this.getSuggestions(amount - user.credits)
    }, 402);
  }

  // 차감
  await this.prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } }
  });
}

getModificationCost(counts: any, projectId: string): number {
  const count = counts?.[projectId] || 0;
  if (count < 5) return 500;
  if (count < 10) return 800;
  return 1200;
}

getSuggestions(shortfall: number): object[] {
  if (shortfall <= 1000) return [
    { amount: 1000, price: 12000 },
    { amount: 3000, price: 33000, recommended: true }
  ];
  if (shortfall <= 5000) return [
    { amount: 5000, price: 49000, recommended: true },
    { amount: 20000, price: 149000 }
  ];
  return [
    { amount: 20000, price: 149000 },
    { amount: 50000, price: 249000, recommended: true }
  ];
}
```

---

## 💰 마진 분석 — 우리가 실제로 남기는 돈

### 고정 비용 (매월 발생)

| 항목 | 현재 (1인) | 스케일업 (3인) | 비고 |
|------|-----------|-------------|------|
| NCP 서버 (Foundry) | 50,000원 | 130,000원 | 트래픽 증가 시 업그레이드 |
| NCP 서버 (세리온) | 50,000원 | 50,000원 | 별도 |
| Claude 구독 (Max) | 130,000원 | 130,000원 | 개발용 |
| 도메인 | 10,000원 | 10,000원 | foundry.ai.kr |
| **소계 (인프라)** | **240,000원** | **320,000원** | |
| CS 직원 | - | 2,500,000원 | 채용 시 |
| 개발자 | - | 4,000,000원 | 채용 시 |
| **소계 (인건비)** | **0원** | **6,500,000원** | |
| **월 고정비 합계** | **240,000원** | **6,820,000원** | |

### 변동 비용 (크레딧 사용 시 API 호출)

| 기능 | API 원가 | 크레딧 소모 | 판매가 (5원/cr) | 마진율 |
|------|---------|-----------|--------------|-------|
| 앱 생성 | ~500원 | 3,000cr | 15,000원 | 96.7% |
| AI 수정 (1~5회) | ~200원 | 500cr | 2,500원 | 92% |
| AI 수정 (6~10회) | ~200원 | 800cr | 4,000원 | 95% |
| AI 수정 (11회~) | ~200원 | 1,200cr | 6,000원 | 96.7% |
| AI 회의실 (S) | ~200원 | 300cr | 1,500원 | 86.7% |
| AI 회의실 (P) | ~800원 | 1,500cr | 7,500원 | 89.3% |
| 추가 채팅 | ~50원 | 100cr | 500원 | 90% |
| 추가 분석 (3AI) | ~300원 | 500cr | 2,500원 | 88% |
| AI 이미지 (DALL-E) | ~100원 | 200cr | 1,000원 | 90% |
| 스마트 분석 | ~150원 | 200cr | 1,000원 | 85% |
| **평균 마진율** | | | | **~92%** |

### 시나리오별 마진 계산

#### 시나리오 1: 현재 (1인, 고객 50명)

```
매출:
  일반 충전 30명 × 149,000원 = 4,470,000원
  모두의 창업 라이트 10명 × 490,000원 = 4,900,000원
  모두의 창업 스탠다드 5명 × 990,000원 = 4,950,000원
  호스팅 20명 × 29,000원 = 580,000원
  독립 코드팩 2명 × 990,000원 = 1,980,000원
  월 매출: 16,880,000원

비용:
  고정비: 240,000원
  API 변동비 (매출의 8%): 1,350,400원
  토스 수수료 (3.6%): 607,680원
  월 비용: 2,198,080원

순이익: 14,681,920원 (마진율 87%!)
```

#### 시나리오 2: 스케일업 (3인, 고객 200명)

```
매출:
  일반 충전 100명 × 149,000원 = 14,900,000원
  모두의 창업 라이트 40명 × 490,000원 = 19,600,000원
  모두의 창업 스탠다드 30명 × 990,000원 = 29,700,000원
  호스팅 80명 × 29,000원 = 2,320,000원
  독립 코드팩 10명 × 990,000원 = 9,900,000원
  독립 프로팩 5명 × 1,990,000원 = 9,950,000원
  월 매출: 86,370,000원

비용:
  고정비 (인건비 포함): 6,820,000원
  API 변동비 (8%): 6,909,600원
  토스 수수료 (3.6%): 3,109,320원
  월 비용: 16,838,920원

순이익: 69,531,080원 (마진율 80%!)
```

#### 시나리오 3: 헤비유저 최악 케이스

```
1명이 스탠다드 990,000원 구매 (100,000cr):
  앱 생성 10회: 30,000cr → API 5,000원
  수정 200회: 약 65,000cr → API 40,000원
  회의실 프리미엄 5회: 7,500cr → API 4,000원
  이미지 20회: 4,000cr → API 2,000원
  합계 사용: 106,500cr (초과 → 추가 충전 필요!)
  API 비용: 51,000원

  매출: 990,000원
  API: 51,000원
  토스: 35,640원
  순이익: 903,360원 (마진 91%)

→ 헤비유저도 마진 90%+ 유지!
→ 수정 횟수별 크레딧 증가가 방어막 역할
→ 100,000cr 초과 시 추가 충전 필요 → 추가 매출
```

### 손익분기점

```
현재 (1인):
  월 고정비: 240,000원
  크레딧 마진율: ~92%
  손익분기 매출: 240,000 ÷ 0.92 = 약 261,000원
  = 50,000cr 충전 1.05건 ≈ 고객 2명이면 흑자!

스케일업 (3인):
  월 고정비: 6,820,000원
  손익분기 매출: 6,820,000 ÷ 0.80 = 약 8,525,000원
  = 스탠다드 패키지 약 9건
  = 모두의 창업 스탠다드 9명이면 흑자!
```

### 크레딧 조정 시뮬레이션 (마진 방어)

만약 API 비용이 올라가거나 인건비가 늘어나면:

```
방법 1: 크레딧 단가 조정 (가격 유지, 크레딧 줄이기)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
현재:  50,000cr → 249,000원 (5원/cr)
조정:  40,000cr → 249,000원 (6.2원/cr)
→ 가격 동일, 크레딧 20% 감소
→ 고객 체감: "좀 줄었네" (수용 가능)

방법 2: 기능별 크레딧 소모 증가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
현재 앱 생성: 3,000cr
조정 앱 생성: 4,000cr
→ 가격도 동일, 크레딧도 동일
→ 사용량만 조절 → 고객 모르게 마진 개선

방법 3: 프리미엄 기능 추가 (업셀)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Opus급 앱 생성: 5,000cr (품질 높음)
Sonnet급 앱 생성: 3,000cr (기존)
→ 고급 모델 사용 시 크레딧 더 소모
→ 추가 수익 + 고객 만족
```

### 핵심 마진 방어 전략

```
1. 수정 횟수별 크레딧 증가 → 헤비유저 API 비용 회수
2. 크레딧 소진 → 추가 충전 자연 유도 → 반복 매출
3. 독립 패키지 → API 비용 0원 (1회성 ZIP 생성) → 순수 이익
4. 호스팅 MRR → API 비용 거의 없음 (정적 파일 서빙) → 고마진
5. 향후 조정: 크레딧 수량 or 기능별 소모량으로 마진 조절 가능
```

---

## Phase 12 구현 순서

```
Day 1: DB 스키마 + API
  - CreditCharge, IndependenceOrder, ModuCreationPackage 모델
  - /credits/charge, /credits/balance, /credits/use API
  - 수정 횟수별 크레딧 계산 로직
  - 크레딧 부족 시 402 + 추천 응답

Day 2: 크레딧 충전 UI
  - /credits 페이지 리디자인
  - 모두의 창업 패키지 상단 배치
  - 크레딧 충전 카드 (5종)
  - 토스 결제 연동
  - 크레딧 부족 시 모달

Day 3: 독립 패키지 UI + 로직
  - /dashboard 프로젝트별 "독립하기" 섹션
  - 독립 패키지 3단계 카드
  - ZIP 생성 로직 (코드팩)
  - 산출물 자동 생성 (프로팩: ERD, Swagger, 인수인계)
  - 다운로드 API

Day 4: 모두의 창업 패키지
  - 전용 구매 플로우
  - 월별 분할 결제
  - 크레딧 자동 지급
  - 프리미엄 회의실 횟수 관리
  - 코드팩 자동 포함 로직
```
