# 챗봇 문의 시스템 + 어드민 고도화 명령서
> 작성: 2026-04-15 (자비스 mk8+ 세션)
> 이 명령서는 새 세션에서 실행하는 상세 설명서입니다.

---

## 필수 선행 파일 읽기!!

이 순서대로 읽고 시작:
1. `memory/BASICS.md` — 서버/계정/기술스택/배포 방식
2. `memory/MEMORY.md` — Foundry 장기 기억 (상단 100줄)
3. **이 파일** — 챗봇 문의 + 어드민 고도화 명령서

---

## 프로젝트 정보

- **프로젝트**: Foundry (AI MVP 빌더) — AI로 웹앱을 자동 생성하는 SaaS
- **경로**: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/`
- **프론트**: `web/` (Next.js 16 App Router, TypeScript, Tailwind v4)
- **백엔드**: `api/` (NestJS, Prisma 6.x, PostgreSQL)
- **서버**: 175.45.200.162 (SSH 포트 3181)
- **배포**: `git push` → GitHub Actions 자동배포 (SSH 직접 배포 X)
- **도메인**: foundry.ai.kr

---

## 배경 — 왜 이 작업을 하는가

### 현재 문제
1. **챗봇 문의가 저장 안 됨** — 고객이 챗봇에서 질문해도 브라우저 닫으면 사라짐. 사장님이 무슨 문의가 왔는지 볼 수 없음.
2. **고객이 연락처를 남길 방법이 없음** — 답변해주고 싶어도 연락할 수가 없음.
3. **어드민이 기본 통계만 보여줌** — 세리온 POS 어드민처럼 고도화 필요 (문의 관리, 유저 상세, 알림 등).
4. **카카오 로그인 미승인** — 현재 이메일 회원가입만 가능한 상태. 소셜 로그인 버튼은 숨김 처리 완료(2026-04-15).

### 목표
- 챗봇에 **"문의 남기기"** 기능 추가 → DB 저장 → 어드민에서 확인+답변
- 어드민 페이지 고도화 (문의 관리 탭 + 유저 상세 + 알림)
- **세리온 POS 어드민 수준으로** 관리 기능 끌어올리기

### 세리온 POS 어드민 참고 (이미 구현된 것)
세리온 POS(serion.ai.kr/admin)에는 이런 기능이 있음:
- 매장 가입 승인/거절
- 서비스 상태 모니터링 (DB응답/050bizcall/알림톡)
- 매장별 상세 정보
- 알림톡 발송 이력
→ **이 수준을 Foundry 어드민에서도 구현하는 것이 목표**

---

## 작업 순서 (이 순서 지켜!!)

### Phase 1: 문의 시스템 DB + API (1시간)
| # | 작업 | 파일 |
|---|------|------|
| 1 | Inquiry 모델 추가 (Prisma) | api/prisma/schema.prisma |
| 2 | prisma db push | 서버 |
| 3 | 문의 서비스 신규 | api/src/inquiry/inquiry.service.ts |
| 4 | 문의 컨트롤러 신규 | api/src/inquiry/inquiry.controller.ts |
| 5 | 문의 모듈 신규 | api/src/inquiry/inquiry.module.ts |
| 6 | AppModule에 등록 | api/src/app.module.ts |

### Phase 2: 챗봇 문의 남기기 UI (1시간)
| # | 작업 | 파일 |
|---|------|------|
| 7 | 챗봇에 "문의 남기기" 버튼 추가 | web/src/app/components/ChatWidget.tsx |
| 8 | 문의 남기기 폼 (이름/이메일/전화/내용) | ChatWidget.tsx 내부 또는 별도 컴포넌트 |

### Phase 3: 어드민 고도화 (1~2시간)
| # | 작업 | 파일 |
|---|------|------|
| 9 | 어드민에 "문의 관리" 탭 추가 | web/src/app/admin/page.tsx |
| 10 | 문의 목록 + 상세 + 답변 기능 | admin/page.tsx |
| 11 | 어드민 문의 API | api/src/admin/admin.controller.ts |
| 12 | 유저 상세 모달 (크레딧/프로젝트/회의 이력) | admin/page.tsx |
| 13 | 서비스 상태 모니터링 탭 (선택) | admin/page.tsx |

→ Phase 1~2 완료 후 배포 → Phase 3 완료 후 배포 (2회 나눠서!)

---

## Phase 1: 문의 시스템 DB + API

### 1-1. Prisma 모델 추가

**파일**: `api/prisma/schema.prisma`

기존 모델 목록 (9개): User, Project, Invoice, PaymentEvent, CreditBalance, CreditTransaction, ProjectMemory, UserMemory, MeetingHistory

**추가할 모델:**

```prisma
model Inquiry {
  id          String   @id @default(cuid())
  name        String                          // 문의자 이름
  email       String                          // 답변받을 이메일 (필수!)
  phone       String?                         // 답변받을 전화번호 (선택)
  content     String                          // 문의 내용
  source      String   @default("chatbot")    // 문의 출처: chatbot / contact / etc
  status      String   @default("pending")    // pending / replied / closed
  reply       String?                         // 관리자 답변
  repliedAt   DateTime?                       // 답변 시간
  repliedBy   String?                         // 답변한 관리자 이메일
  userId      String?                         // 로그인 사용자인 경우 연결
  user        User?    @relation(fields: [userId], references: [id])
  metadata    Json?                           // 추가 정보 (챗봇 대화 내역 등)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@index([email])
  @@index([createdAt])
}
```

- User 모델에 `inquiries Inquiry[]` 관계 추가

### 1-2. prisma db push

```bash
cd api && npx prisma db push
```

### 1-3. 문의 서비스

**파일**: `api/src/inquiry/inquiry.service.ts` (신규)

```typescript
// 핵심 메서드:

// 1. 문의 등록 (챗봇/외부)
async create(data: { name, email, phone?, content, source?, userId?, metadata? }): Promise<Inquiry>

// 2. 문의 목록 조회 (어드민)
async findAll(page, limit, status?): Promise<{ inquiries, total }>

// 3. 문의 상세 조회 (어드민)
async findOne(id): Promise<Inquiry>

// 4. 답변 등록 (어드민)
async reply(id, { reply, repliedBy }): Promise<Inquiry>

// 5. 상태 변경 (어드민)
async updateStatus(id, status): Promise<Inquiry>

// 6. 미답변 문의 수 (어드민 뱃지용)
async countPending(): Promise<number>
```

### 1-4. 문의 컨트롤러

**파일**: `api/src/inquiry/inquiry.controller.ts` (신규)

```
POST   /api/inquiry          — 문의 등록 (인증 불필요! 비로그인도 가능)
GET    /api/inquiry           — 문의 목록 (어드민 전용)
GET    /api/inquiry/pending   — 미답변 수 (어드민 전용)
GET    /api/inquiry/:id       — 문의 상세 (어드민 전용)
PATCH  /api/inquiry/:id/reply — 답변 등록 (어드민 전용)
PATCH  /api/inquiry/:id/status — 상태 변경 (어드민 전용)
```

**중요**: 문의 등록(POST)은 **인증 없이** 가능해야 함! 비로그인 상태에서 챗봇으로 문의하는 거니까.
어드민 API는 기존 어드민 인증 방식(ADMIN_EMAILS 화이트리스트) 그대로 사용.

### 1-5. 모듈 + AppModule 등록

**파일**: `api/src/inquiry/inquiry.module.ts` (신규)
- InquiryService, InquiryController 등록
- PrismaService 주입

**파일**: `api/src/app.module.ts`
- InquiryModule import 추가

---

## Phase 2: 챗봇 문의 남기기 UI

### 2-1. 현재 챗봇 구조

**파일**: `web/src/app/components/ChatWidget.tsx`

현재 작동 방식:
- 우하단 💬 플로팅 버튼 클릭 → 챗 팝업 열림
- FAQ 키워드 매칭 → 실패 시 Claude Haiku AI 호출 (`/api/ai/homepage-chat`)
- 빠른 버튼: 매칭앱 / 쇼핑몰 / 예약앱 / 가격 안내
- 메시지는 useState로만 관리 (DB 저장 안 함)

### 2-2. 추가할 기능: "문의 남기기" 모드

챗봇에 **"문의 남기기"** 버튼을 추가. 누르면 폼 모드로 전환.

```
일반 챗봇 모드:
┌──────────────────────┐
│ 🤖 Foundry AI          │
│                        │
│ (기존 AI 채팅)          │
│                        │
│ [매칭앱] [쇼핑몰] [가격] │
│ [📩 문의 남기기]        │  ← 이 버튼 추가!
│                        │
│ [메시지 입력...]        │
└──────────────────────┘

"문의 남기기" 클릭 시:
┌──────────────────────┐
│ 📩 문의 남기기          │
│                        │
│ 이름 *                  │
│ [___________________]   │
│                        │
│ 이메일 *  (답변받을 주소) │
│ [___________________]   │
│                        │
│ 전화번호 (선택)          │
│ [___________________]   │
│                        │
│ 문의 내용 *              │
│ [___________________]   │
│ [___________________]   │
│ [___________________]   │
│                        │
│ [← 돌아가기] [보내기 →]  │
└──────────────────────┘

전송 완료:
┌──────────────────────┐
│ ✅ 문의가 접수되었습니다! │
│                        │
│ 입력하신 이메일로        │
│ 빠르게 답변드리겠습니다.  │
│                        │
│ [← 채팅으로 돌아가기]    │
└──────────────────────┘
```

### 2-3. 구현 포인트

**ChatWidget.tsx 수정:**

```typescript
// 상태 추가
const [mode, setMode] = useState<'chat' | 'inquiry' | 'inquiryDone'>('chat');
const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', phone: '', content: '' });

// "문의 남기기" 버튼 (빠른 버튼 영역에 추가)
<button onClick={() => setMode('inquiry')}>📩 문의 남기기</button>

// 문의 폼 제출
async function handleInquirySubmit() {
  if (!inquiryForm.name || !inquiryForm.email || !inquiryForm.content) {
    alert('이름, 이메일, 문의 내용은 필수입니다.');
    return;
  }
  await fetch(`${API_BASE}/inquiry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...inquiryForm,
      source: 'chatbot',
      metadata: { chatHistory: messages }, // 대화 내역도 함께 저장!
    }),
  });
  setMode('inquiryDone');
}
```

**핵심**: 문의 보낼 때 **기존 채팅 대화 내역도 metadata에 같이 저장!** 어드민에서 "이 고객이 뭘 물어봤는데 문의를 남긴 건지" 맥락을 볼 수 있음.

### 2-4. 필수 입력 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| 이름 | ✅ | 문의자 이름 |
| 이메일 | ✅ | **답변받을 이메일 주소** (가장 중요!) |
| 전화번호 | 선택 | 전화 답변 원할 시 |
| 문의 내용 | ✅ | 자유 입력 (textarea) |

---

## Phase 3: 어드민 고도화 — 세리온 어드민 수준으로!

### 세리온 어드민 구조 (참고!)

세리온 POS(serion.ai.kr/admin)는 **사이드바 네비게이션 + 별도 페이지** 방식으로 구현되어 있음.
파일 위치: `/Users/mark/세리온 ai전화예약+POS통합관리/apps/web/src/app/admin/`

세리온 어드민 메뉴 (9개):
```
대시보드 (LayoutDashboard)  — 전체 통계
매장 관리 (Store)           — 매장별 상세 (/admin/shops/[id])
가입 승인 (ClipboardCheck)  — 신규가입 승인/거절 + 🔴뱃지
구독/정산 (CreditCard)      — 플랜 관리
050/알림톡 (Phone)          — 통화/알림톡 이력
매장 셋팅 (Wrench)          — 매장 초기 설정
알림 센터 (Bell)            — 알림 목록 + 🔴뱃지
시스템 (Monitor)            — 서버 상태 모니터링
설정 (Settings)             — 관리자 설정
```

핵심 컴포넌트:
- `AdminSidebar.tsx` — 사이드바 (다크/라이트 모드 토글, 모바일 햄버거, 로그아웃)
- `AdminLayout` — 사이드바 + 본문 레이아웃
- 각 메뉴가 별도 page.tsx 파일 (/admin/shops/page.tsx 등)
- 뱃지: 가입 승인(pendingCount) + 알림 센터(alertCount)

### Foundry 어드민 변경 방향

**현재**: 탭 5개 (단일 page.tsx에 전부)
```
대시보드 | 사용자 | 프로젝트 | 크레딧 | AI 사용량
```

**변경**: 사이드바 네비게이션 + 별도 페이지 (세리온 구조 참고)
```
📊 대시보드        — /admin              (기존 개선)
📩 문의 관리       — /admin/inquiries     (신규! 🔴뱃지)
👥 사용자          — /admin/users         (기존 → 상세 추가)
📁 프로젝트        — /admin/projects      (기존 이동)
💳 크레딧/결제     — /admin/credits       (기존 이동)
🤖 AI 사용량       — /admin/ai-usage      (기존 이동)
🖥️ 서비스 상태     — /admin/system        (신규!)
⚙️ 설정            — /admin/settings      (신규!)
```

### 3-0. 어드민 구조 전환 (탭 → 사이드바)

**신규 파일:**
```
web/src/app/admin/layout.tsx              — 사이드바 + 본문 레이아웃
web/src/app/admin/components/AdminSidebar.tsx — 사이드바 컴포넌트
web/src/app/admin/inquiries/page.tsx      — 문의 관리
web/src/app/admin/users/page.tsx          — 사용자 관리
web/src/app/admin/projects/page.tsx       — 프로젝트 관리
web/src/app/admin/credits/page.tsx        — 크레딧/결제
web/src/app/admin/ai-usage/page.tsx       — AI 사용량
web/src/app/admin/system/page.tsx         — 서비스 상태
web/src/app/admin/settings/page.tsx       — 설정
```

**AdminSidebar.tsx** — 세리온 AdminSidebar.tsx 참고해서 만들기:
```typescript
// 세리온 코드 참고: /Users/mark/세리온 ai전화예약+POS통합관리/apps/web/src/app/admin/components/AdminSidebar.tsx

const navItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/admin/inquiries', label: '문의 관리', icon: MessageSquare },  // 🔴뱃지
  { href: '/admin/users', label: '사용자', icon: Users },
  { href: '/admin/projects', label: '프로젝트', icon: FolderOpen },
  { href: '/admin/credits', label: '크레딧/결제', icon: CreditCard },
  { href: '/admin/ai-usage', label: 'AI 사용량', icon: Brain },
  { href: '/admin/system', label: '서비스 상태', icon: Monitor },
  { href: '/admin/settings', label: '설정', icon: Settings },
];
```

**핵심:**
- 다크/라이트 모드 토글 (세리온처럼 사이드바 하단)
- 모바일 햄버거 메뉴 (세리온처럼)
- 문의 관리 탭에 🔴 미답변 뱃지
- 로고: "Foundry Admin" + "관리 시스템"
- 기존 page.tsx의 각 탭 내용을 별도 페이지로 분리

**admin/layout.tsx:**
```typescript
// 세리온 참고: 사이드바 고정 + 우측 본문 스크롤
export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen">
      <AdminSidebar pendingInquiryCount={count} />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}
```

### 3-1. 문의 관리 페이지 (신규)

**파일**: `web/src/app/admin/inquiries/page.tsx` (신규)

```
┌─────────────────────────────────────────┐
│ 문의 관리                    미답변: 3건  │
│                                         │
│ [전체] [미답변] [답변완료] [종료]         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 김지원 | kim@email.com          │ │
│ │ "앱 만드는데 시간이 얼마나 걸리나요?" │ │
│ │ 2026-04-15 14:30 | 챗봇            │ │
│ ├─────────────────────────────────────┤ │
│ │ 🔴 이승훈 | lee@startup.com        │ │
│ │ "정부지원사업비로 결제 가능한가요?"   │ │
│ │ 2026-04-15 15:20 | 챗봇            │ │
│ ├─────────────────────────────────────┤ │
│ │ ✅ 박민수 | park@gmail.com         │ │
│ │ "크레딧 충전 방법이..."             │ │
│ │ 2026-04-14 10:00 | 답변완료         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 문의 클릭 시 상세 모달:                   │
│ ┌─────────────────────────────────────┐ │
│ │ 문의 상세                           │ │
│ │ 이름: 김지원                        │ │
│ │ 이메일: kim@email.com               │ │
│ │ 전화: 010-1234-5678                 │ │
│ │ 문의: "앱 만드는데..."              │ │
│ │                                     │ │
│ │ 💬 채팅 내역 (접힘/펼침)            │ │
│ │ > 고객: "앱 만들고 싶은데요"        │ │
│ │ > AI: "Foundry에서 30분이면..."     │ │
│ │ > 고객: "가격이 어떻게 되나요?"      │ │
│ │                                     │ │
│ │ 답변 작성:                          │ │
│ │ [________________________]          │ │
│ │ [________________________]          │ │
│ │                                     │ │
│ │ [답변 보내기] [종료 처리]            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 3-2. 어드민 문의 API 추가

**파일**: `api/src/admin/admin.controller.ts` 에 추가

```
GET    /api/admin/inquiries           — 문의 목록 (상태 필터, 페이징)
GET    /api/admin/inquiries/count     — 미답변 수 (탭 뱃지용)
GET    /api/admin/inquiries/:id       — 문의 상세 (metadata 포함)
PATCH  /api/admin/inquiries/:id/reply — 답변 등록
PATCH  /api/admin/inquiries/:id/close — 종료 처리
```

### 3-3. 유저 상세 모달 (기존 사용자 탭 개선)

현재: 사용자 목록만 표로 보여줌
개선: 사용자 이름 클릭 → 상세 모달

```
┌────────────────────────────────┐
│ 사용자 상세: 김지원              │
│                                │
│ 📧 kim@email.com               │
│ 📱 010-1234-5678               │
│ 📅 가입일: 2026-04-10          │
│ 💳 플랜: 스탠다드               │
│                                │
│ 크레딧                          │
│ 잔액: 12,300cr / 충전: 20,000  │
│                                │
│ 프로젝트 (2개)                  │
│ • 동네키친 — deployed           │
│ • 카페매출관리 — generating     │
│                                │
│ AI 회의 (3건)                   │
│ • 밀키트 플랫폼 검증 — 4/10     │
│ • 경쟁사 분석 — 4/8             │
│                                │
│ 문의 이력 (1건)                  │
│ • "결제 방법 문의" — 답변완료    │
│                                │
│ [크레딧 수동 충전] [플랜 변경]   │
└────────────────────────────────┘
```

### 3-4. 서비스 상태 탭 (선택, 시간 되면)

세리온 어드민처럼:
```
┌─────────────────────────────┐
│ 서비스 상태                    │
│                               │
│ API 서버    ✅ 정상 (120MB)   │
│ 웹 서버     ✅ 정상 (68MB)    │
│ DB 응답     ✅ 2ms            │
│ Anthropic   ✅ 연결됨         │
│ Supabase    ✅ 연결됨         │
│ KPN PG      ✅ 연결됨         │
│                               │
│ 최근 에러 (24시간)             │
│ • Storage 버킷 404 (3건)      │
│ • 없음                        │
│                               │
│ 마지막 갱신: 5분 전            │
└─────────────────────────────┘
```

---

## 배포 방법

### Phase 1~2 배포 (문의 시스템 + 챗봇)
```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
cd api && npx prisma db push   # Inquiry 모델 DB 반영!
cd ../web && npx tsc --noEmit && cd ..
cd api && npx tsc --noEmit && cd ..
# tsc 에러 0 확인!
# 사장님께 확인받기!
git add -A
git commit -m "feat: 챗봇 문의 남기기 + Inquiry DB 모델 (이메일/전화번호 필수)"
git push origin main
```

### Phase 3 배포 (어드민 고도화)
```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
cd web && npx tsc --noEmit && cd ..
cd api && npx tsc --noEmit && cd ..
# tsc 에러 0 확인!
# 사장님께 확인받기!
git add -A
git commit -m "feat: 어드민 고도화 — 문의 관리 탭 + 유저 상세 + 서비스 상태"
git push origin main
```

**배포 전 사장님께 반드시 확인받을 것!**

---

## 주의사항

### 보안
- 문의 등록(POST /inquiry)은 **인증 없이** 가능해야 함 (비로그인 고객도 문의)
- 어드민 API는 기존 ADMIN_EMAILS 화이트리스트 인증 유지
- 스팸 방지: rate limit 적용 (IP당 분당 5건)

### 기존 코드 보존
- ChatWidget.tsx의 기존 FAQ + AI 채팅 기능 건드리지 말 것
- "문의 남기기"는 **모드 전환** 방식으로 추가 (기존 채팅 위에 덮지 않음)
- 어드민 기존 5개 탭 그대로 유지 + 새 탭 추가

### 답변 기능
- 답변은 어드민에서 텍스트 입력 → DB 저장만
- **이메일 자동 발송은 나중에** (지금은 수동으로 답변)
- 향후: 답변 등록 시 고객 이메일로 자동 발송 (NHN Cloud 또는 SMTP)

### 문의 남기기 폼 — 필수 입력!!
- 이름: 필수
- 이메일: **필수** (이거 없으면 답변 못 함!)
- 전화번호: 선택
- 문의 내용: 필수
- metadata: 채팅 대화 내역 자동 첨부 (사용자 안 보임)

---

## 현재 코드 구조 참고

### 어드민 (수정/신규 파일)

**기존 파일 (수정):**
| 파일 | 현재 | 수정 |
|------|------|------|
| `web/src/app/admin/page.tsx` | 5탭 전부 여기에 | 대시보드만 남기고 나머지 분리 |
| `api/src/admin/admin.controller.ts` | 5개 엔드포인트 | +5개 문의 API + 서비스 상태 API |
| `api/src/admin/admin.service.ts` | 5개 메서드 | +문의 + 서비스 상태 메서드 |
| `api/src/admin/admin.module.ts` | AdminService만 | +InquiryService 주입 |

**신규 파일 (어드민 구조 전환):**
| 파일 | 용도 |
|------|------|
| `web/src/app/admin/layout.tsx` | 사이드바 + 본문 레이아웃 |
| `web/src/app/admin/components/AdminSidebar.tsx` | 사이드바 (세리온 참고!) |
| `web/src/app/admin/inquiries/page.tsx` | 문의 관리 |
| `web/src/app/admin/users/page.tsx` | 사용자 관리 (상세 모달 포함) |
| `web/src/app/admin/projects/page.tsx` | 프로젝트 관리 |
| `web/src/app/admin/credits/page.tsx` | 크레딧/결제 |
| `web/src/app/admin/ai-usage/page.tsx` | AI 사용량 |
| `web/src/app/admin/system/page.tsx` | 서비스 상태 (세리온처럼!) |
| `web/src/app/admin/settings/page.tsx` | 설정 |

**신규 파일 (문의 백엔드):**
| 파일 | 용도 |
|------|------|
| `api/src/inquiry/inquiry.service.ts` | 문의 CRUD |
| `api/src/inquiry/inquiry.controller.ts` | 문의 API |
| `api/src/inquiry/inquiry.module.ts` | 문의 모듈 |

### 챗봇 (수정할 파일)
| 파일 | 현재 | 수정 |
|------|------|------|
| `web/src/app/components/ChatWidget.tsx` | FAQ + AI 채팅 | +문의 남기기 모드 |

### 세리온 어드민 참고 파일 (복사해서 참고!)
| 세리온 파일 | 참고 내용 |
|------------|---------|
| `세리온/apps/web/src/app/admin/components/AdminSidebar.tsx` | 사이드바 구조, 다크/라이트, 모바일 |
| `세리온/apps/web/src/app/admin/layout.tsx` | 레이아웃 구조 |
| `세리온/apps/web/src/app/admin/system/page.tsx` | 서비스 상태 모니터링 |
| `세리온/apps/web/src/app/admin/approvals/page.tsx` | 승인 관리 (문의 관리 참고) |
| `세리온/apps/web/src/app/admin/shops/[id]/page.tsx` | 상세 페이지 (유저 상세 참고) |

**세리온 프로젝트 경로**: `/Users/mark/세리온 ai전화예약+POS통합관리/`

### 어드민 화이트리스트
```
ADMIN_EMAILS=admin@serion.ai.kr,mark@serion.ai.kr,mark@foundry.kr
```

### 어드민 로그인
- URL: foundry.ai.kr/admin
- 계정: mark@serion.ai.kr (ADMIN_EMAILS에 포함된 이메일)
