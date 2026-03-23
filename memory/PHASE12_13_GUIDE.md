# Phase 12: 120% 차별화 — 개발 가이드
# Phase 13: 유니콘 — 방향 가이드 (7월~)

> Phase 12 완료 시 마일스톤: "Lovable이 못 하는 걸 한다" = 120%

---

## Phase 11.5에서 이미 완료된 것 (Phase 12에서 제외)

```
✅ AI 회의실 사전 질문 단계 — Haiku가 방향 확인 질문, preAnswers 브리핑 주입
✅ 핑퐁 과정 단계별 표시 — Gemini→GPT→Claude 프로그레스 바 + ping 애니메이션
✅ 보고서 후 채팅 이어가기 — 💬 채팅(Claude) / 🔍 추가 분석(3AI 핑퐁)
✅ Gemini 429 graceful fallback — 실패 시 조용히 건너뛰고 GPT+Claude로 완료
✅ 공감/반박/새관점 형식 강제 — ✅/❌/💡 명시적 구분
✅ 브리핑 편향 제거 — Haiku는 요약만, 각 AI가 원본 직접 분석
✅ 특허 순차누적형 구조 전체 구현 (S100~S700 전부 ✅)
✅ PDF 파서 서버사이드 (poppler pdftotext)
✅ React hydration #418 수정
✅ 에러 메시지 한글화
✅ Claude 모델 ID 수정 (claude-sonnet-4)
✅ 모델 선택 UI 제거 → Smart 고정 (Phase 9에서 완료)
```

---

## Phase 12 착수 전 수정 (즉시, 간단한 것들)

### 1. Foundry 로고 클릭 시 메인 이동 안 됨
**현재 문제**: /start 등에서 좌측 상단 "Foundry" 로고 클릭 시 메인(/)로 이동 안 됨
**수정**: 로고에 `<Link href="/">` 적용. 모든 페이지에서 로고 클릭 → 메인 이동 보장
**파일**: `web/src/app/start/page.tsx` 또는 공통 헤더 컴포넌트

### 2. 마크다운 렌더링 개선
**현재**: AI 회의실 보고서가 whitespace-pre-wrap (원본 텍스트)
**개선**: react-markdown 적용 → 볼드, 리스트, 테이블 등 깔끔하게 렌더링
**파일**: `web/src/app/meeting/page.tsx`

### 3. 토스 실키 교체 (심사 완료 후)
**현재**: 테스트키로 결제 연동 완료
**작업**: TOSS_SECRET_KEY 서버 .env 설정 → 실결제 가능
**의존**: 토스페이먼츠 심사 완료 대기 중

### 4. 호스팅 방문자 카운터 nginx 연동
**현재**: DB에 viewCount 필드만 있음
**작업**: nginx access_log 파싱 또는 프론트에서 API 호출로 카운트
**파일**: nginx 설정 + `api/src/deploy/deploy.service.ts`

### 5. 호스팅 플랜 결제 연동
**현재**: 호스팅 API만 있고 결제 연동 안 됨
**작업**: 토스빌링 연결 → 월 과금 MRR 시작
**의존**: 토스 심사 완료 후

### 6. 크레딧 단위 구매 + 업그레이드 UI
**현재**: 패키지(라이트/스탠다드/프로)만 구매 가능
**추가할 것**:
1. 크레딧 단위 구매 (부족할 때 추가 충전):
   - 1,000cr: 12,000원
   - 3,000cr: 33,000원 (10% 할인)
   - 5,000cr: 50,000원 (17% 할인)
   - 10,000cr: 90,000원 (25% 할인)
2. 패키지 업그레이드:
   - 라이트 → 스탠다드: 110,000원 (차액+보너스)
   - 스탠다드 → 프로: 120,000원 (차액+보너스)
3. 크레딧 잔액 부족 시 "크레딧 충전" 안내 자동 표시
**파일**: `web/src/app/credits/page.tsx` + `api/src/credit/credit.service.ts`
**이유**: 모두의 창업 프로젝트 창업자가 한도(월 100만원) 내에서 유연하게 조합 가능
**⭐ 상세 설계**: `memory/PRICING_REPORT_2026-03-23.md` 참고 (요금제 전체 구조 + UI 가이드 + DB 스키마 + API + 구현 순서 포함)

---

## 나중에 필요할 때만 (급하지 않음)

- DALL-E → Gemini Imagen 전환: 비용 이슈 생기면 그때
- premium 모델 Sonnet → Opus: 크레딧 여유 생기면
- Gemini 유료 전환 후 대용량 파일 확대 (maxFileLen 8000→50000)

---

## Phase 12 Week 1: 풀스택 백엔드 강화 + 특허 출원

### 풀스택 백엔드 자동생성 (Foundry 독자 강점)

**현재 vs 목표**:
- Lovable: React + Supabase (프론트 + DB만, 커스텀 백엔드 없음)
- Foundry 현재: Next.js + Supabase (비슷한 수준)
- **Foundry 목표**: Next.js + NestJS API + Supabase (풀스택)

**왜 중요한가**:
- 진짜 비즈니스 앱은 커스텀 백엔드가 필요 (비즈니스 로직, 외부 API 연동, 배치 작업)
- 세리온 POS가 증거 — Supabase만으로는 알림톡, 카드결제, 정산 등 구현 불가
- 이것이 Lovable과의 근본적 차별점

**구현 방법**:
AI 아키텍처 설계 시 백엔드 모듈 자동 생성:
```
아키텍처 JSON에 추가:
{
  "hasBackend": true,
  "backendModules": [
    { "name": "auth", "endpoints": ["POST /login", "POST /signup"] },
    { "name": "products", "endpoints": ["GET /products", "POST /products", ...] },
  ],
  "backendPatterns": ["transaction", "rbac", "error-handling"]  // 세리온 패턴!
}
```

생성할 백엔드 파일:
```
api/
├── src/
│   ├── main.ts                 // NestJS 부트스트랩
│   ├── app.module.ts           // 모듈 등록
│   ├── prisma.service.ts       // Prisma 연결 (세리온 패턴)
│   ├── auth/                   // 인증 모듈
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   └── {module}/               // 비즈니스 모듈 (자동생성)
│       ├── {module}.controller.ts
│       ├── {module}.service.ts
│       └── {module}.module.ts
├── prisma/
│   └── schema.prisma           // DB 스키마
└── package.json
```

**세리온 코드 패턴 주입** (이미 Phase 8에서 프롬프트에 있음):
- 트랜잭션 패턴 (prisma.$transaction)
- RBAC 패턴 (역할별 접근 제어)
- 에러 핸들링 (AllExceptionsFilter)
- 입력 검증 (ValidationPipe + class-validator)

**배포**:
- 프론트: Static Export → *.foundry.ai.kr (기존)
- 백엔드: NestJS → PM2 → 별도 포트 (또는 Supabase Edge Functions로 대체)

### Foundry 특허 출원

**출원 명칭 (1순위)**:
"자연어 기반 질의응답을 통한 풀스택 웹 애플리케이션 자동 생성 및 배포 방법"

**청구항 핵심**:
1. 사용자 자연어 입력 → AI가 아키텍처 JSON 설계
2. 아키텍처 → 프론트엔드+백엔드+DB 스키마 코드 자동 생성
3. DB 프로비저닝 자동화 (Supabase 프로젝트 생성 + SQL 마이그레이션)
4. 빌드 실패 시 AI 자동 분석→수정→재빌드 루프
5. 서브도메인 자동 할당 + 배포 파이프라인

**차별점 (선행기술 대비)**:
- Lovable/Bolt: 프론트엔드만 → Foundry: 풀스택 (프론트+백엔드+DB)
- 기존 코드 생성: 코드만 생성 → Foundry: 생성+프로비저닝+빌드+배포 원스톱
- 기존 빌드: 실패하면 끝 → Foundry: AI 자동수정 루프 (이거 독보적)

**범용 설계**: 세리온 특허처럼 "웹 애플리케이션" 전반 (업종 한정 X)

**변리사 메일 내용** (김성수 변리사에게 발송):
```
안녕하세요, 세리온 김형석입니다.
Foundry 플랫폼 관련 추가 특허 출원을 검토하고 있습니다.

[명칭] 자연어 기반 질의응답을 통한 풀스택 웹 애플리케이션 자동 생성 및 배포 방법
[핵심] 자연어→아키텍처→풀스택코드생성→DB프로비저닝→빌드에러AI자동수정→배포
[차별점] 프론트+백엔드+DB 원스톱 자동생성 + 빌드에러 AI 자동수정 루프
[선행기술] Lovable/Bolt은 프론트엔드만, 빌드에러 자동수정 없음

검토 부탁드립니다.
```

---

## Phase 12 Week 2: 한국 특화 자동연동

### 카카오/네이버/토스 자동연동 패키지

AI가 앱 생성 시 한국 서비스 자동 연동:

**아키텍처 플래그**:
```json
{
  "koreanIntegrations": {
    "kakaoLogin": true,      // 카카오 로그인
    "kakaoAlimtalk": false,  // 카카오 알림톡 (백엔드 필요)
    "naverMap": true,        // 네이버 지도
    "tossPayment": true,     // 토스페이먼츠 결제
    "businessVerify": true   // 사업자등록번호 검증
  }
}
```

**각 연동별 생성 코드**:

1. **카카오 로그인**: Supabase Auth + Kakao OAuth 설정 자동 생성
2. **네이버 지도**: `<NaverMap>` 컴포넌트 + API 키 안내
3. **토스 결제**: `<TossPayment>` 컴포넌트 + 결제 플로우 자동 생성
4. **사업자 검증**: 공공데이터 API 연동 컴포넌트

**프롬프트 주입**:
```
한국 서비스 연동이 필요한 경우:
- 카카오 로그인: @supabase/auth-helpers + kakao provider
- 네이버 지도: naver-maps-sdk 또는 iframe 임베드
- 토스 결제: @tosspayments/tosspayments-sdk
- 사업자 검증: fetch('https://api.odcloud.kr/api/nts-businessman/v1/status')
```

→ **Lovable은 이걸 절대 못 합니다.** 한국 시장에서의 결정적 차별점.

---

## Phase 12 Week 3: 템플릿 마켓플레이스

### 개념
사용자가 만든 앱을 템플릿으로 공유 → 다른 사용자가 "이 앱을 내 사업에 맞게 수정"

### DB 스키마
```prisma
model Template {
  id          String   @id @default(cuid())
  name        String
  description String
  category    String   // 'commerce', 'matching', 'management', ...
  thumbnail   String?
  architecture Json    // 아키텍처 JSON
  generatedCode Json   // 코드 스냅샷
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  useCount    Int      @default(0)
  rating      Float    @default(0)
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### API
```
GET  /templates               — 인기 템플릿 목록
GET  /templates/:id           — 템플릿 상세
POST /templates               — 내 앱을 템플릿으로 공유
POST /templates/:id/use       — 템플릿으로 새 프로젝트 생성
```

### UI
```
/marketplace 페이지:
┌──────────────────────────────────────────────┐
│ 🏪 템플릿 마켓플레이스                          │
│                                              │
│ [인기순] [최신순] [카테고리 ▼]                  │
│                                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │미용실 │ │쇼핑몰 │ │매칭앱 │ │학원  │        │
│ │POS   │ │     │ │     │ │관리  │        │
│ │⭐4.8 │ │⭐4.5 │ │⭐4.7 │ │⭐4.3 │        │
│ │사용:23│ │사용:15│ │사용:31│ │사용:8 │        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                              │
│ [내 앱을 템플릿으로 공유하기]                    │
└──────────────────────────────────────────────┘
```

### 수익 배분 (향후)
- 템플릿 사용 시 크레딧 차감
- 차감된 크레딧의 30%를 템플릿 제작자에게 지급
- → 생태계 형성 → 네트워크 효과

---

## Phase 12 Week 4: 세리온급 복잡 앱 + DB 고도화 + 한국어

### 세리온급 복잡 앱 생성
- 모듈별 생성 → 조립 방식 (한 번에 전체 생성 대신)
- 관리자/사용자 분리 앱 자동 생성
- POS, CRM, ERP 템플릿

### DB 프로비저닝 고도화
- Supabase 프로젝트 풀링 (미리 생성해놓고 할당)
- Row Level Security 자동 설정
- Storage 버킷 정책 자동 생성

---

# Phase 13: 유니콘 — 방향 가이드 (7월~)

> 이 Phase는 방향만 기록. 구체적 가이드는 Phase 12 완료 후 작성.

## 글로벌 진출
- **영어 UI**: i18n 적용 (next-intl 또는 next-i18next)
- **일본어**: 일본 미용실 시장 진출 (세리온 특허 PCT 국제출원과 연계)
- **다국어 앱 생성**: 사용자가 "일본어 앱 만들어줘" → 일본어 UI 자동 생성

## 네이티브 앱
- React Native / Expo로 모바일 앱 생성
- PWA → 네이티브 전환 가이드
- App Store / Play Store 배포 자동화

## AI 모델 자체 개선
- Foundry 전용 Fine-tuned 모델 (수만 건 빌드 데이터 학습)
- 빌드 성공률 99%+ 달성
- 코드 생성 속도 2배 향상

## 엔터프라이즈
- 팀 협업 (멀티 유저 편집)
- Private 배포 (사내망/VPN)
- SSO / SAML 인증
- SLA 보장 + 전담 지원

## API 플랫폼
- Foundry API 공개 → 다른 서비스에서 코드 생성 기능 사용
- "Foundry Powered" 생태계
- API 사용량 기반 과금
