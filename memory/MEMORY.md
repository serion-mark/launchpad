# Foundry — AI MVP 빌더

## 프로젝트 개요
- **브랜드**: Foundry (파운드리) — 이전 이름: Launchpad
- **컨셉**: 정부지원사업(예창패/초창패) 창업자를 위한 AI MVP 빌더
- **핵심 가치**: 외주 5,000만원 → 크레딧 49,000~249,000원
- **BM**: 크레딧제 (충전 → AI 앱 생성/수정/배포에 소진) + 호스팅 월 과금(MRR)
- **경쟁사 레퍼런스**: Base44 (800억 매각), Polsia (ARR 25억)
- **엑싯 전략**: 부트스트랩 100% 지분 유지 → 인수합병 (Base44 모델)

## 프로젝트 구조
- **위치**: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/`
- **GitHub**: `https://github.com/serion-mark/launchpad` (private)
- **스택**: Next.js 16 (web) + NestJS (api) + Prisma 6.x + PostgreSQL
- **NCP 서버 (운영)**: `175.45.200.162` / s2-g3a (2vCPU, 8GB, 50GB)
  - SSH: `ssh -i ~/.ssh/serion-key.pem root@175.45.200.162`
  - root PW: `J7?RdhuD*G=h`
  - PM2: `launchpad-web` (포트 3000) + `launchpad-api` (포트 4000, 1개 인스턴스)
  - nginx: HTTP 리버스 프록시 (`/api/*` → 4000, `/*` → 3000)
  - VPC: serion-vpc / ACG: serion-vpc-default-acg / 비공인 IP: 10.0.1.8
  - DB: PostgreSQL `launchpaddb` / user: `launchpad` / pw: `launchpad1234`
  - web 환경변수: `NEXT_PUBLIC_API_URL=/api` (.env.local)
  - api 환경변수: `JWT_SECRET=launchpad-jwt-secret-2026-production`, `ANTHROPIC_API_KEY=sk-ant-api03-...`

## 기술 아키텍처

### 멀티 LLM 라우터 (Base44 참고)
| 작업 | 모델 | 크레딧 배율 |
|------|------|------------|
| UI/프론트엔드 생성 | Claude Sonnet | 1x |
| 백엔드/로직 | Claude Sonnet | 1x |
| 간단한 수정/대화 | Claude Haiku | 0.2x |
| 아키텍처 설계 | Claude Opus | 5x |

### 원가 구조
- MVP 1개 생성 AI 원가: ~17,000원 (Sonnet 기준)
- 고객 크레딧: ~200,000원 → **마진 90%+**
- 비용 최적화: 업종별 템플릿 사전 생성 → AI는 커스터마이징만

## 수익 모델 (구독제 + Exit) — Base44 Lock-in 전략
| 요금제 | 가격 | 핵심 | 우리 수익 |
|--------|------|------|-----------|
| **Free** | 0원 | 미리보기만 | 유입 |
| **Starter** | 월 15만원 | MVP 1개 + 호스팅 + 월5회 수정 | 초기 MRR |
| **Pro** | 월 29만원 | MVP 3개 + 무제한 수정 + 프리미엄 | **핵심 MRR** |
| **Exit** | 1,500만원 (1회) | 소스코드 소유권 + 독립 서버 이관 | 목돈 |

**핵심 전략**: Pro에 가두고(호스팅 Lock-in) → 정부사업 심사 때 Exit으로 목돈 회수

## DB 스키마 (Prisma 6.x)
```prisma
model User { id, email @unique, password?, name?, avatar?, provider, providerId?, plan, planExpiresAt?, credits Int @default(500), projects[] }
model Project { id, name, description?, template, theme, features Json?, status(draft|generating|active|deployed), subdomain? @unique, userId, chatHistory Json?, generatedCode Json?, deployedUrl? }
```

## 완료 작업 ✅

### Phase 1 (~3/18)
- ✅ 사업 기획서 + Next.js/NestJS 세팅 + 템플릿 3종 + 테마 20종
- ✅ 멀티 LLM 라우터 (llm-router.ts) + 앱 생성 파이프라인 (app-generator.ts)
- ✅ 토스페이먼츠 구독 결제 (테스트키) + 구독제+Exit BM 전환
- ✅ ① Builder Chat UI (/builder) — 대화형 빌더, 빌드/토론 모드, 실시간 미리보기
- ✅ ② 회원가입/로그인 (/login) — JWT + bcrypt + PostgreSQL
- ✅ ③ 프로젝트 CRUD — /dashboard 목록/생성/삭제 + 채팅 히스토리 자동저장
- ✅ ⑤ 원클릭 배포 — DeployService(서브도메인 자동생성+코드저장)
- ✅ ⑥ ZIP 다운로드 — JSZip 브라우저 ZIP 생성, 템플릿별 데모코드
- ✅ ⑦ SaaS 구독 결제 — SubscriptionModule, Invoice/PaymentEvent 모델
- ✅ GitHub Actions 자동배포 (main push → NCP SSH → build → PM2 restart)
- ✅ 토스 디자인시스템 + Foundry 브랜딩(SVG로고) + Chrome 자동번역 차단
- ✅ 동적 미리보기 (아이폰 프레임) + 과금 전략 문서 + 딥리서치 종합분석 DOCX

### Phase 2 (3/19) — AI 연동 + 빌더 UX 고도화
- ✅ ④ AI 연동 (Claude API) — Anthropic SDK, llm-router.ts 실제 API 연동 완료
  - Haiku: 빌더 대화 (한국어 시스템프롬프트, 코드블록 응답)
  - 크레딧 차감: 요청당 ~100 크레딧, User.credits 실시간 차감
  - API 키: NCP 서버 .env + 로컬 .env 모두 설정 완료
- ✅ 빌더 질문지 시스템 — 업종별 6문항, 칩 보기 + 직접 입력, 진행률(1/6) 표시
- ✅ 복수 응답 + 직접 추가 — 모든 질문 multi 지원, 칩 토글 + 커스텀 칩 추가 입력
- ✅ PC/모바일 미리보기 레이아웃 완전 분리
  - PC: 좌측 사이드바(기능 메뉴) + 우측 메인(대시보드 3컬럼 KPI + 일정 테이블)
  - 모바일: 상단 헤더 + 컨텐츠 + 하단 탭 바
- ✅ 랜딩→빌더 기능 연동 — project.features.selected를 빌더 미리보기에 반영
- ✅ 대시보드→랜딩 질문지 플로우 연결 (새 프로젝트 버튼 → 랜딩 페이지로)

## 다음 작업 (미완료)

### 🔴 크레딧 시스템 고도화
- [ ] 크레딧 충전 UI (/credits) — 토스페이먼츠 연동, 49k/99k/249k 패키지
- [ ] 모델 티어링 차감 — Haiku 0.2x, Sonnet 1x, Opus 5x 차등 차감
- [ ] 크레딧 잔액 부족 시 차단 + 충전 유도 모달
- [ ] 크레딧 사용 내역 조회 API + UI

### 🟡 랜딩페이지 비교광고 문구
- [ ] Base44/Polsia/Bolt 대비 Foundry 장점 강조 문구
- [ ] 정부사업비 집행 가능 어필

### 🟡 템플릿 확장
- [ ] O2O (배달/예약 중개) 템플릿
- [ ] 에듀테크 (학원/강의) 템플릿
- [ ] 각 템플릿 질문지 + featureMap + 미리보기

### 🟡 도메인 + SSL
- [ ] foundry.kr 또는 foundry-ai.kr 도메인 구매
- [ ] Let's Encrypt SSL + nginx HTTPS 설정

### 🟡 모두의창업 서류 (4/1 마감)
- [ ] 신청서 작성 + 사업계획서 + 증빙서류

### 🟢 추가 개선
- [ ] 빌더 AI가 실제 코드 생성 → 미리보기 실시간 반영
- [ ] 최종확인 화면: 선택한 기능 상세 목록 표시 + 미리보기 메뉴 활성화
- [ ] Tosspayments 웹훅 → DB 구독 반영 자동화

## 배포 절차
```bash
# 자동배포: git push origin main → GitHub Actions → NCP SSH → build → PM2 restart
# 수동배포:
ssh -i ~/.ssh/serion-key.pem root@175.45.200.162
cd /root/launchpad && git pull origin main
cd api && npm install && npx prisma generate && npx prisma db push && npm run build
cd ../web && npm run build
pm2 restart launchpad-api launchpad-web
```

## 재시작 명령어
```
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

Foundry 이어서 작업해줘. memory/MEMORY.md 참고.

[완료] ①Builder Chat UI ②회원가입/로그인 ③프로젝트CRUD ④AI연동(Claude API) ⑤원클릭배포 ⑥ZIP다운로드 ⑦SaaS구독결제 + 토스디자인 + Foundry브랜딩(SVG로고) + 자동번역차단 + 스크린샷업로드 + GitHub Actions자동배포 + 동적미리보기(아이폰프레임) + 과금전략문서 + 딥리서치종합분석DOCX + 빌더질문지(복수응답+직접추가) + PC/모바일레이아웃분리
[다음] 크레딧시스템고도화(충전UI+모델티어링) → 랜딩페이지비교광고문구 → 템플릿확장(O2O/에듀테크) → 도메인+SSL → 모두의창업서류(4/1)
[전략] 크레딧제(49k/99k/249k), AI티어링(Haiku0.2x/Sonnet1x/Opus5x), 무료맛보기(500크레딧), 호스팅MRR(9,900원/월), 마켓플레이스(수수료30%), 대학B2B(340개교), 토스슈퍼앱, 엑싯(100%지분)
[서버] web:3000(PM2) + api:4000(PM2) + PostgreSQL(launchpaddb) + nginx + GitHub Actions자동배포
```
