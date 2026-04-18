# 🚀 Phase 3 — 광고/마케팅 + 외부 진입 (v2 — 촘촘한 그물망)

> **버전:** 2026-04-17 v2 (사장님 요청 재작성)
> **목표:** 무한버그지옥 방지! 매출 시작 + 본격 마케팅
> **소요 시간:** 11일 (외부 의존 작업은 별도 트랙)
> **선행 조건:** Phase 0, 1, 2 완료 + 24시간 모니터링 정상

---

## 🎯 v2 변경점

### v1 약점
- 외부 의존 작업 명확한 분리 부재
- KPN 결제 사전 검증 (방화벽, API) 부족
- SEO 등록 후 효과 측정 가이드 부족

### v2 강점
- **외부 의존 작업 별도 트랙** (사장님 직접)
- **각 작업 사전 검증** (KPN API, 방화벽)
- **단계별 효과 측정** (광고 ROI, 검색 노출)

### 절대 원칙
1. 외부 의존 작업은 결과 대기 → 다음 진행
2. 결제 시스템 = 100% 검증 후 운영
3. 광고 시작 전 모든 페이지 안정화
4. 사장님 직접 작업 시 자비스는 안내만

---

## 📋 7개 작업 (외부 의존 분리)

```
[자비스 작업 - 코드]
1. SEO 인프라 (3시간)
2. KPN PG 코드 검증 + 운영 전환 (1일)
3. 어드민 + 챗봇 문의 (3일)
4. 랜딩 페이지 + 인스타 캐러셀 (3일)
5. 캡쳐본 Vision (3일)

[사장님 직접 작업 - 외부]
A. Google Search Console + 네이버 (1시간)
B. KPN 카드사 심사 결과 대기 + 운영 키 받기
C. 카카오 비즈앱 심사 결과 + 로그인 복원
D. 인스타 광고 운영
```

---

## 🚨 정황

### SEO 현재 상태 (4/17)
```
✅ 메타 태그 (title, description, og)
❌ robots.txt (404)
❌ sitemap.xml (404)
❌ JSON-LD
❌ og:image
❌ Google Search Console 미등록
```
→ 구글이 사이트 존재 자체를 모름!

### 사장님 우선순위
> "기능 완성 > 광고. 검색 잘 되는데 들어와서 실망하면 더 큰 손해"

→ Phase 1, 2 완료 후 → Phase 3 시작

### KPN PG 현황
- 코드 90% 완성 (kpn-payment.service.ts 등)
- 카드사 심사 대기
- 개발계: testcorp / 운영계: 카드사 통과 후 발급

### 카카오 비즈앱
- 4/15 신청, 영업일 3~5일
- 5월 초 승인 예상

### 캡쳐본 Vision (사장님 아이디어)
- Phase 1C와 시너지
- "손그림으로 앱 만들기" 마케팅

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 1 — SEO 인프라 (3시간, 6단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 3-1-1: robots.txt 생성 (10분)

### `web/public/robots.txt` (신규)

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://foundry.ai.kr/sitemap.xml
```

### 검증

```bash
ls -la web/public/robots.txt
# 배포 후
curl https://foundry.ai.kr/robots.txt
```

---

## 🚦 Step 3-1-2: sitemap.xml 자동 생성 (30분)

### `web/src/app/sitemap.ts` (신규)

```typescript
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://foundry.ai.kr';
  return [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/pricing`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/credits`, priority: 0.9 },
    { url: `${baseUrl}/login`, priority: 0.5 },
    { url: `${baseUrl}/signup`, priority: 0.7 },
    { url: `${baseUrl}/start`, priority: 0.8 },
    { url: `${baseUrl}/portfolio/sleep-check`, priority: 0.6 },
    { url: `${baseUrl}/portfolio/cafe-note`, priority: 0.6 },
    { url: `${baseUrl}/portfolio/apple-farm`, priority: 0.6 },
    { url: `${baseUrl}/portfolio/smart-mall`, priority: 0.6 },
    { url: `${baseUrl}/terms`, priority: 0.3 },
    { url: `${baseUrl}/refund`, priority: 0.3 },
    { url: `${baseUrl}/privacy`, priority: 0.3 },
  ];
}
```

---

## 🚦 Step 3-1-3: JSON-LD 구조화 데이터 (1시간)

### `web/src/app/layout.tsx` 수정

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Foundry',
  applicationCategory: 'BusinessApplication',
  description: 'AI가 만드는 풀스택 MVP. 외주비 3천만원을 20만원으로.',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '49000',
    priceCurrency: 'KRW',
  },
  creator: {
    '@type': 'Organization',
    name: '세리온',
    url: 'https://foundry.ai.kr',
  },
};

return (
  <html lang="ko">
    <head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </head>
    ...
  </html>
);
```

### 검증

```bash
# 배포 후 Google Rich Results Test
# https://search.google.com/test/rich-results?url=https://foundry.ai.kr
```

---

## 🚦 Step 3-1-4: og:image 추가 (30분)

### `web/public/og-image.png` (신규, 1200x630)
- Foundry 로고 + "AI MVP 빌더" + 포트폴리오 이미지

### `web/src/app/layout.tsx` metadata

```typescript
metadata: {
  openGraph: {
    images: [{
      url: 'https://foundry.ai.kr/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Foundry - AI MVP 빌더',
    }],
  },
  twitter: {
    images: ['https://foundry.ai.kr/og-image.png'],
  },
}
```

---

## 🚦 Step 3-1-5: tsc + 배포 (10분)

```bash
git add web/public/robots.txt \
        web/public/og-image.png \
        web/src/app/sitemap.ts \
        web/src/app/layout.tsx

git commit -m "feat: Phase 3-1 — SEO 인프라 (robots, sitemap, JSON-LD, og:image)"
git push origin main
```

---

## 🚦 Step 3-1-6: ✅ 검증 (10분)

```bash
sleep 90  # 배포 대기

curl https://foundry.ai.kr/robots.txt
# 예상: User-agent: * 등

curl https://foundry.ai.kr/sitemap.xml
# 예상: XML

curl https://foundry.ai.kr/og-image.png -I
# 예상: 200, image/png
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 A — 사장님 직접: Google/네이버 등록 (1시간)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 자비스가 사장님께 안내

### Step A-1: Google Search Console (30분)

```
사장님, 다음 작업 부탁드립니다:

1. https://search.google.com/search-console 접속
2. "속성 추가" → "도메인" → foundry.ai.kr 입력
3. 소유권 확인 (DNS TXT 레코드)
   - 가비아 → foundry.ai.kr → DNS 설정
   - TXT 레코드 추가:
     · 호스트: @
     · 값: google-site-verification=xxxx... (Console에서 복사)
4. sitemap.xml 제출:
   - 좌측 "Sitemaps"
   - https://foundry.ai.kr/sitemap.xml 입력
5. 주요 URL 색인 요청 (URL 검사 → 색인 생성):
   - foundry.ai.kr/
   - foundry.ai.kr/pricing
   - foundry.ai.kr/credits
   - foundry.ai.kr/portfolio/...
```

### Step A-2: 네이버 서치어드바이저 (15분)

```
1. https://searchadvisor.naver.com 접속
2. 사이트 등록 (foundry.ai.kr)
3. HTML 파일 업로드 또는 메타 태그로 인증
4. sitemap.xml 제출
```

### Step A-3: 빙 웹마스터 (5분)

```
1. https://www.bing.com/webmasters 접속
2. Google Search Console에서 가져오기 (편함)
```

### ✅ 완료 후 자비스에게 보고

```
사장님: "Google + 네이버 + 빙 등록 완료"
자비스: "다음 작업 진행할까요?"
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 2 — KPN PG 코드 검증 + 운영 전환 (1일)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 3-2-0: KPN 카드사 심사 결과 확인 ⭐

### 사장님께 확인

```
사장님, KPN 카드사 심사 결과 받으셨나요?
- 통과: 운영 키 받기 → 작업 진행
- 미통과: 보완 후 재신청 (작업 보류)
- 대기 중: 개발계로 마무리 검증만
```

---

## 🚦 Step 3-2-1: 환경변수 확인 (30분)

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "grep KPN /root/launchpad/api/.env"
```

### 개발계 확인
```
KPN_MX_ID=testcorp
KPN_PASS_KEY=6aMoJujE34XnL9gvUqdKGMqs9GzYaNo6
KPN_ENDPOINT=https://dev.firstpay.co.kr
```

### 운영 전환 (카드사 심사 통과 시)
```
KPN_MX_ID=<운영용 가맹점 ID>
KPN_PASS_KEY=<운영용 passKey>
KPN_ENDPOINT=https://pay.firstpay.co.kr
```

---

## 🚦 Step 3-2-2: 방화벽 확인 (30분)

KPN IP / 포트:
| 대상 | 포트 | 방향 |
|------|------|------|
| 210.182.8.123, 222.110.146.236 | 443 | OUTBOUND (결제) |
| 210.182.8.137, 222.110.146.137 | 443 | INBOUND (입금통보) |

### 확인

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
echo "[KPN OUTBOUND 테스트]"
curl -I https://dev.firstpay.co.kr 2>&1 | head -5
curl -I https://pay.firstpay.co.kr 2>&1 | head -5

echo ""
echo "[NCP ACG 설정 확인]"
# NCP 콘솔 또는 ACG 설정 확인 안내
EOF
```

### ❌ 연결 실패 시
- NCP 콘솔에서 ACG 설정 추가
- 사장님 보고

---

## 🚦 Step 3-2-3: 결제 플로우 E2E 테스트 (4시간)

### 시나리오

1. test 계정 로그인
2. /credits → 패키지 선택 (lite 49,000원)
3. "충전하기" → KPN 결제창 팝업
4. 테스트 카드 입력 (KPN 제공)
5. 결제 완료 → /credits/success
6. 백엔드 KPN 승인 API
7. 크레딧 충전 + DB 기록

### DB 검증

```sql
SELECT * FROM credit_transactions 
WHERE "userId" = '<test-userId>' 
ORDER BY "createdAt" DESC LIMIT 1;

-- type = 'CHARGE', amount = 5000, paymentRefId = 'credit-lite-...'
```

---

## 🚦 Step 3-2-4: 에러 케이스 테스트 (2시간)

- 카드 한도 초과
- 잘못된 카드 번호
- 결제 중 취소
- 중복 결제 (idempotent)
- 금액 위변조

---

## 🚦 Step 3-2-5: KPN에 결과 전달 (1시간)

### 사장님께 메일 안내

```
KPN 담당자: 이재호
이메일: eCommSolutionTeam@kpn.co.kr

전송 내용:
- 테스트 결과 (성공 5회)
- 가맹점 ID (testcorp)
- 거래 시간
- 호출 URL
```

---

## 🚦 Step 3-2-6: 운영 환경 전환 (사장님 결정)

카드사 심사 통과 + 운영 키 받음 → .env 변경 → 배포

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 3 — 어드민 + 챗봇 문의 (3일, 4단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 3-3-1: 챗봇 위젯 (1일)

### `web/src/components/ChatBotWidget.tsx` (신규)

```typescript
'use client';
export default function ChatBotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg z-50"
      >
        💬
      </button>
      
      {open && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl z-50">
          <ChatBotPanel 
            messages={messages} 
            onClose={() => setOpen(false)}
            onSubmit={(inquiry) => submitInquiry(inquiry)}
          />
        </div>
      )}
    </>
  );
}
```

### `web/src/app/layout.tsx`에 추가

```typescript
import ChatBotWidget from '@/components/ChatBotWidget';

return (
  <html>
    <body>
      {children}
      <ChatBotWidget />  {/* 모든 페이지에 표시 */}
    </body>
  </html>
);
```

---

## 🚦 Step 3-3-2: DB 모델 + API (1일)

### Prisma 스키마 (이미 inquiries 있음, 확장)

```prisma
model Inquiry {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  
  email     String?
  name      String?
  category  String   // 'support' | 'billing' | 'feature' | 'bug'
  message   String   @db.Text
  
  status    String   @default("new")  // 'new' | 'in_progress' | 'resolved'
  adminNote String?  @db.Text
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([status, createdAt])
  @@map("inquiries")
}
```

### API: `api/src/inquiry/inquiry.controller.ts`

```typescript
@Controller('inquiries')
export class InquiryController {
  @Post()
  async create(@Body() body: CreateInquiryDto) {
    return this.inquiryService.create(body);
  }
  
  @Get()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async list(@Query() query) {
    return this.inquiryService.list(query);
  }
  
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async update(@Param('id') id, @Body() body) {
    return this.inquiryService.update(id, body);
  }
}
```

---

## 🚦 Step 3-3-3: 어드민 페이지 (1일)

### `web/src/app/admin/inquiries/page.tsx` (신규)

```typescript
export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('new');
  
  return (
    <div>
      <h1>고객 문의 관리</h1>
      
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('new')}>신규</button>
        <button onClick={() => setFilter('in_progress')}>진행 중</button>
        <button onClick={() => setFilter('resolved')}>완료</button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>날짜</th><th>카테고리</th><th>고객</th>
            <th>내용</th><th>상태</th><th>액션</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.filter(i => filter === 'all' || i.status === filter).map(i => (
            <tr key={i.id}>
              <td>{formatDate(i.createdAt)}</td>
              <td>{i.category}</td>
              <td>{i.email || i.user?.email}</td>
              <td>{i.message.slice(0, 100)}...</td>
              <td><StatusBadge status={i.status} /></td>
              <td>
                <button>답변</button>
                <button>완료 처리</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🚦 Step 3-3-4: ✅ 알림톡 + E2E

문의 등록 시 사장님께 알림톡 (NHN Cloud 활용 - 세리온과 동일).

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 4 — 랜딩 페이지 + 인스타 캐러셀 (3일)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 3-4-1: /lp/mvp 페이지 (1일)

### `web/src/app/lp/mvp/page.tsx` (신규)

```typescript
export default function MvpLandingPage() {
  return (
    <div>
      {/* 헤드라인 */}
      <section className="hero">
        <h1>AI가 만드는 풀스택 MVP</h1>
        <p>외주 3,000만원 → 30만원</p>
        <a href="/signup?utm_source=instagram&utm_campaign=mvp_v1" 
           className="cta-button">
          지금 시작하기
        </a>
      </section>
      
      {/* 비교표 */}
      <section className="comparison">
        <h2>외주 vs Foundry</h2>
        <table>
          <tr><td>비용</td><td>3,000만원</td><td>30만원 (100배)</td></tr>
          <tr><td>시간</td><td>3개월</td><td>30분</td></tr>
          <tr><td>코드 소유</td><td>외주 lock-in</td><td>100% 다운로드</td></tr>
        </table>
      </section>
      
      {/* 포트폴리오 */}
      <section>
        <h2>실제 만들어진 앱들</h2>
        <PortfolioGrid />
      </section>
      
      {/* 후기 */}
      <section>
        <Testimonials />
      </section>
      
      {/* 정부지원사업 */}
      <section>
        <h2>정부지원사업 활용</h2>
        <p>예창패, 초창패, 모두의 창업...</p>
      </section>
      
      {/* 문의 */}
      <section>
        <ChatBotPrompt />
      </section>
    </div>
  );
}
```

---

## 🚦 Step 3-4-2: 인스타 캐러셀 7장 (1일, 사장님 + 자비스)

### Figma 또는 Canva로 디자인 (각 1080x1080)

```
1장: "외주 3000만원? 30만원으로 됩니다"
2장: "AI가 30분만에 만드는 MVP"
3장: "예시 1: 동네키친 (음식 배달)"
4장: "예시 2: 펫메이트 (반려동물)"
5장: "예시 3: MediTracker (헬스케어)"
6장: "코드 100% 다운로드 가능"
7장: "지금 시작하기 (링크)"
```

### 자비스 역할
- 카피 작성 (사장님 검토)
- 데모 영상 캡쳐 추출
- Figma 가이드 (사장님이 디자인)

---

## 🚦 Step 3-4-3: UTM + GA4 (4시간)

### UTM 추적

```
인스타 광고 URL:
https://foundry.ai.kr/lp/mvp?utm_source=instagram&utm_medium=carousel&utm_campaign=mvp_launch_v1
```

### GA4 이벤트

```typescript
// web/src/lib/analytics.ts
export function trackEvent(name: string, params: any) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params);
  }
}

// 주요 이벤트
trackEvent('page_view', { page: '/lp/mvp' });
trackEvent('click_cta', { source: 'hero' });
trackEvent('sign_up');
trackEvent('credit_purchase', { amount: 49000 });
```

---

## 🚦 Step 3-4-4: A/B 테스트 준비 (2시간)

- 헤드라인 2개 (A/B)
- CTA 버튼 색상 2개
- 캐러셀 첫 장 2종

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 5 — 캡쳐본 Vision (3일, 4단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 3-5-0: Phase 1C, Phase 2 작업 4 완료 확인 ⭐

### 의존성
- Phase 1C: Vision API 통합
- Phase 2 작업 4: Supabase Storage 정상

둘 다 완료 안 되면 작업 5 진행 X.

---

## 🚦 Step 3-5-1: 빌더 질문지에 추가 (1일)

### `web/src/app/start/components/ReferenceUpload.tsx` (신규)

```typescript
'use client';
export default function ReferenceUpload({ onAnalyzed }: Props) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  
  return (
    <div className="reference-upload">
      <h3>📷 참고 디자인이 있나요?</h3>
      <p>경쟁사 사이트 캡쳐, 손그림, 아이디어 스케치 등</p>
      
      <input type="file" accept="image/*" multiple onChange={handleUpload} />
      
      {uploadedImages.map(img => (
        <div key={img.id}>
          <img src={img.url} className="w-32 h-32 object-cover" />
          {img.analysis ? (
            <div>
              <p><strong>분석 결과:</strong></p>
              <p>스타일: {img.analysis.design_style}</p>
              <p>색상: {img.analysis.primary_color}</p>
              <p>레이아웃: {img.analysis.layout}</p>
            </div>
          ) : (
            <button onClick={() => analyzeImage(img.id)}>분석하기</button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🚦 Step 3-5-2: Vision API 통합 (1일)

### Phase 1C에서 만든 ChatAgentService.analyzeImage 활용

```typescript
// 빌더 질문지 → 이미지 분석 → features.designAnalysis에 저장

// api/src/ai/ai.service.ts (ARCHITECTURE_SYSTEM_PROMPT 확장)
const designContext = features.designAnalysis ? `
[참고 디자인]
- 스타일: ${features.designAnalysis.design_style}
- 색상: 메인 ${features.designAnalysis.primary_color}, 배경 ${features.designAnalysis.background_color}
- 레이아웃: ${features.designAnalysis.layout}
- 컴포넌트: ${features.designAnalysis.key_components.join(', ')}
- 분위기: ${features.designAnalysis.vibe}

위 디자인을 참고해서 비슷한 스타일로 만들어주세요.
` : '';
```

---

## 🚦 Step 3-5-3: tsc + 배포 + E2E

---

## 🚦 Step 3-5-4: 마케팅 데모 영상 (1일, 사장님 시연)

### 사장님 시연 녹화

```
1. 손그림 그리기 (와이어프레임)
2. 사진 찍어서 업로드
3. AI Vision 분석 결과 표시
4. 앱 생성 → 비슷한 스타일로 완성
5. "이게 진짜 됩니다!" 임팩트
```

→ 인스타 릴스, 광고 영상으로 활용

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 C — 사장님 직접: 카카오 로그인 복원
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step C-1: 비즈앱 심사 결과 확인

```
카카오 디벨로퍼스 → 내 앱 → 비즈니스 채널 → 심사 결과
```

## 🚦 Step C-2: 이메일 동의항목 활성화

```
카카오 디벨로퍼스 → 카카오 로그인 → 동의항목
- 카카오계정(이메일): 필수 동의 ON
```

## 🚦 Step C-3: 코드 주석 해제 (자비스 작업, 30분)

### `web/src/app/login/page.tsx`

Phase 2 작업 7에서 주석 처리한 부분 해제:

```typescript
{/* TODO: 카카오 비즈앱 승인 후 재활성화 */} ← 제거
<button onClick={handleKakaoLogin}>
  카카오로 로그인
</button>
```

## 🚦 Step C-4: ✅ 테스트

- 신규 카카오 가입
- 기존 이메일 가입자 → 카카오 로그인 (계정 연동?)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 D — 사장님 직접: 인스타 광고 운영
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step D-1: 광고 매니저 셋업 (사장님)

- 인스타 비즈니스 계정
- 페이스북 광고 매니저 연동
- 결제 카드 등록

## 🚦 Step D-2: 캠페인 설정

```
목표: 웹사이트 트래픽 또는 전환
예산: 일일 2~5만원
타겟:
  - 위치: 대한민국
  - 연령: 25~45세
  - 관심사: 창업, 스타트업, AI, 노코드, 부업
  - 행동: 정부지원사업 검색
광고 소재: 캐러셀 7장 (작업 4 결과)
```

## 🚦 Step D-3: KPI 측정 (자비스 안내)

```
일일 모니터링:
- 노출 수
- 클릭 수
- CTR (목표: 2%+)
- 가입 전환율 (목표: 5%+)
- 크레딧 구매율 (목표: 10%+)
- ROAS (목표: 3.0+)
```

---

# 🆘 Phase 3 비상 롤백

## 결제 사고
```
즉시 운영 중단 → 개발계로 복귀 → 사장님 보고
```

## SEO 사고
```
robots.txt 다시 차단 가능
```

## 광고 ROI 마이너스
```
3일 연속 마이너스 → 즉시 중단 → A/B 다시
```

---

# ✅ Phase 3 완료 체크리스트

## 자비스 작업
- [ ] 3-1-1~6. SEO 인프라
- [ ] 3-2-0~6. KPN PG
- [ ] 3-3-1~4. 어드민 + 챗봇
- [ ] 3-4-1~4. 랜딩 + 인스타
- [ ] 3-5-0~4. 캡쳐본 Vision
- [ ] C-3. 카카오 로그인 복원

## 사장님 직접
- [ ] A. Google + 네이버 등록
- [ ] B. KPN 카드사 심사 + 운영 키
- [ ] C. 카카오 비즈앱 심사 결과
- [ ] D. 인스타 광고 시작

## 비즈니스 측
- [ ] 첫 실제 결제 발생
- [ ] 일일 가입자 발생
- [ ] CS 자동화 (챗봇 → 어드민)

## 모니터링
- [ ] GA4 데이터 수집
- [ ] 광고 ROAS 측정
- [ ] 가입 → 전환 퍼널 분석

---

# 🚨 자비스 절대 금지 (Phase 3)

1. **결제 사고 시 즉시 운영 중단** (자비스 판단 X, 사장님 보고)
2. **운영 KPN 키 사장님 승인 없이 적용 X**
3. **광고는 사장님 직접** (자비스는 안내만)
4. **외부 의존 작업 결과 대기** (재촉 X)

---

# 📊 Phase 3 이후 (5월 말 ~)

- 광고 운영 + ROI 최적화
- 사용자 피드백 → 신규 기능
- 글로벌 진출 (영어권 본격)
- 시리즈 A 투자 유치

이건 별도 로드맵 (5월 말 회고 후 결정)

---

**작성:** 자비스 mk9+ (2026-04-17 v2)
**핵심:** 외부 의존 분리 + 결제 안전 + 사장님 직접 작업 안내
