# Phase 11: 프로 기능 — 개발 가이드 (4/14~4/28)

> 이 Phase 완료 시 마일스톤: "돈 받을 수 있는 제품" + 유료 고객 1호

---

## Week 1: 결제 + 호스팅 MRR

### 결제 실연동

**현재 상태**:
- 토스페이먼츠 빌링 가입 완료 (MID: bill_serioi8u1)
- 프론트: credits/page.tsx에 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 환경변수 준비됨
- 심사 완료 후 테스트키 → 실키 교체만 하면 됨

**작업**:
1. 프로덕션 .env에 실제 Toss Client Key 설정
2. 결제 성공 콜백 (`/credits/success`) → 크레딧 충전 API 호출 → DB 반영
3. 결제 실패/취소 처리
4. 세금계산서 발행 연동 (토스페이먼츠 API 또는 팝빌 연동)
   - 정부사업비 정산에 세금계산서 필수!
   - `POST /billing/invoice` → 세금계산서 자동 발행

**파일**:
- `web/src/app/credits/page.tsx` — 결제 UI (이미 있음)
- `web/src/app/credits/success/page.tsx` — 결제 성공 콜백 (있으면 확인, 없으면 생성)
- `api/src/credit/credit.service.ts` — charge 메서드에 실결제 검증 로직

### 호스팅 월 과금 (MRR — 이게 진짜 돈)

**비즈니스 모델**:
```
크레딧: 일회성 매출 (앱 생성/수정)
호스팅: 월 반복 매출 MRR (앱이 살아있는 한 계속)

호스팅 가격안:
- 무료: foundry.ai.kr 서브도메인, 월 1,000 방문자 제한
- Basic ₩9,900/월: 무제한 방문자
- Pro ₩29,900/월: 커스텀 도메인 안내 + 우선 지원
```

**구현**:

1. **DB 스키마 추가** (schema.prisma):
```prisma
model Hosting {
  id          String   @id @default(cuid())
  projectId   String   @unique
  project     Project  @relation(fields: [projectId], references: [id])
  plan        HostingPlan @default(FREE)
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
}
enum HostingPlan { FREE BASIC PRO }
```

2. **방문자 대시보드**:
- nginx 로그 파싱 또는 간단한 카운터 (앱에 analytics 스크립트 주입)
- `GET /projects/:id/analytics` → 일별/주별 방문자 수
- dashboard에 차트로 표시

3. **무료 방문자 제한**:
- nginx에서 서브도메인별 rate limit
- 또는 앱에 주입되는 analytics 스크립트에서 카운트 → 초과 시 "업그레이드" 페이지

---

## Week 2: AI 이미지 생성 + 대시보드

### AI 이미지 생성

**1순위: Gemini API (Imagen 3)**
```typescript
// api/src/ai/image.service.ts (새 파일)
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  async generateImage(prompt: string, style?: string): Promise<string> {
    // Gemini API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/imagen-3:generateImage`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${prompt}. Style: ${style || 'modern, clean, professional'}`,
          // 옵션: 사이즈, 포맷 등
        }),
      }
    );
    // 이미지 → Supabase Storage 업로드 → URL 반환
    const imageBuffer = await response.arrayBuffer();
    const url = await this.uploadToStorage(imageBuffer);
    return url;
  }
}
```

**프론트 연동**:
- 빌더 채팅에서 "로고 만들어줘" 감지 → ImageService 호출
- 생성된 이미지 → 미리보기에 즉시 반영
- 이미지 선택/재생성 UI

**비용 관리**:
- 이미지 1장 = 크레딧 200cr (시장가 대비 저렴하게)
- Gemini API 비용이 너무 비싸면 → Flux (오픈소스) 셀프호스팅으로 대체

### 앱별 방문자 대시보드

**파일**: `web/src/app/dashboard/page.tsx` (기존 대시보드에 추가)

각 프로젝트 카드에 표시:
```
┌─────────────────────────────────────┐
│ 🛒 스마트팜 직거래                    │
│ https://smartfarm-xxxx.foundry.ai.kr │
│                                      │
│ 📊 이번 주: 142명 방문 (+23%)        │
│ 📈 [미니 차트 ─╱──╲─╱]              │
│                                      │
│ [빌더 열기]  [배포 URL]  [분석 보기]  │
└─────────────────────────────────────┘
```
