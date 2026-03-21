# ⛔ 필수 정보 (수정/삭제 절대 금지 — 모든 AI 세션에서 반드시 참조)
- **대표자**: 김형석
- **SSH 포트**: 3181 (22번 아님! 보안 변경됨)
- **SSH 접속**: `ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162`
- **답변은 항상 한글로**
- **세리온 서버**: 223.130.162.133 (SSH 포트 3181)
- **파운드리 서버**: 175.45.200.162 (SSH 포트 3181)
- **VPC/ACG 공유**: 두 서버 동일 (serion-vpc-default-acg)

---

# Foundry — AI MVP 빌더

## 프로젝트 개요
- **브랜드**: Foundry (파운드리) — 이전 이름: Launchpad
- **컨셉**: 정부지원사업(예창패/초창패) 창업자를 위한 AI MVP 빌더
- **핵심 비전**: 파운더리로 세리온 POS 같은 실제 작동하는 프로그램을 만들 수 있게!
- **핵심 가치**: 외주 3,000만원 → 크레딧 30만원 (100배 차이)
- **핵심 포지셔닝**: "30만 원으로 MVP 만들고, 외주사 미팅에 가세요. 견적은 반으로, 소통 비용은 제로로."
  - 장점: 가격앵커링, 실체있는기획서, 외주비협상력, Lock-in없음(코드다운로드), 스택신뢰도(Next.js+Supabase)
- **BM**: 크레딧제 (충전 → AI 앱 생성/수정/배포에 소진) + 호스팅 월 과금(MRR)
- **경쟁사 레퍼런스**: Base44 (800억 매각), Polsia (ARR 25억), Lovable
- **엑싯 전략**: 부트스트랩 100% 지분 유지 → 인수합병 (Base44 모델)

## 프로젝트 구조
- **위치**: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/`
- **GitHub**: `https://github.com/serion-mark/launchpad` (private)
- **스택**: Next.js 16 (web) + NestJS (api) + Prisma 6.x + PostgreSQL + **Supabase (고객앱)**
- **NCP 서버 (운영)**: `175.45.200.162` / s2-g3a (2vCPU, 8GB, 50GB)
  - SSH: `ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162`
  - root PW: `J7?RdhuD*G=h`
  - PM2: `launchpad-web` (포트 3000) + `launchpad-api` (포트 4000) + `petmate-demo` (포트 3200)
  - nginx: HTTPS 리버스 프록시 (`/api/*` → 4000, `/*` → 3000, `/petmate` → 3200)
  - nginx timeout: 600s (`/etc/nginx/conf.d/proxy-timeout.conf`)
  - nginx 와일드카드: `*.foundry.ai.kr` → `/var/www/apps/{subdomain}/` (static 서빙)
  - SSL: `foundry.ai.kr` + `*.foundry.ai.kr` 와일드카드 (인증서: `foundry.ai.kr-0001`, 만료 2026-06-19)
  - DB: PostgreSQL `launchpaddb` / user: `launchpad` / pw: `launchpad1234`

## 카카오 OAuth 설정
- **앱 ID**: 1409363
- **REST API 키**: `2b61cab1882f996f30bd9e925a1ec3f8`
- **Redirect URI**: `https://foundry.ai.kr/api/auth/kakao/callback`

## 완료 작업 ✅

### Phase 1~2 (~3/19)
- ✅ Next.js/NestJS 세팅 + 템플릿 6종 + 테마 20종
- ✅ AI 연동 (Haiku) + 크레딧 시스템 + 빌더 질문지 6종
- ✅ 인터랙티브 미리보기 + 어드민 + 도메인SSL + 카카오OAuth
- ✅ 가이드 페이지 + 배포/다운로드 + GitHub Actions 자동배포

### Phase 3 (3/20) — 코드 생성 엔진 + Supabase 전환
- ✅ Sprint 1~5: 코드 생성 파이프라인 + Supabase 기반 전환
- ✅ 펫메이트 E2E 테스트 — 33파일 생성 성공 (83cr)

### Phase 4 (3/21) — Supabase 자동 프로비저닝 + 배포 파이프라인
- ✅ **Supabase 자동 프로비저닝** (커밋 96c6d7d)
  - Management API 연동 (PAT), 프로젝트 자동 생성, SQL 마이그레이션, 환경변수 자동 주입
  - 조직: sefhetzuysyhgcebslqd
- ✅ **배포 파이프라인** (커밋 8d89cfd)
  - deploy.service.ts: 5단계 빌드 (파일저장→npm install→next build export→/var/www/apps 복사→캐시정리)
  - Prisma: buildStatus/buildLog/buildStartedAt/buildFinishedAt
  - GET /projects/:id/build-status 폴링 API
  - 빌더 UI: 배포 시 3초 폴링으로 빌드 상태 실시간 표시
  - 대시보드: 빌드 상태 배지 (빌드중/실패/완료)
  - DNS: *.foundry.ai.kr → 175.45.200.162 (가비아 A레코드)
  - SSL: Let's Encrypt 와일드카드 인증서 발급 완료
  - nginx: 서브도메인 → /var/www/apps/{subdomain}/ 정적 서빙
  - 도메인 launchpad.kr → foundry.ai.kr 수정
  - 테스트: https://test-app.foundry.ai.kr/ 정상 동작 확인

### 코드 품질 개선 (3/21)
- ✅ **F4: 코드 잘림 → 이어서 생성** — isCodeTruncated() 감지 → continueGeneration() 최대 2회 이어붙이기
- ✅ **F6: 빌드 자동 검증 + AI 수정 루프** — next build 실패 → 에러 로그 → AI fixBuildErrors() → 코드 수정 → 재빌드 (최대 3회)
- ✅ **F7: SSE 비동기 파이프라인** — POST /ai/generate-app-sse (EventEmitter → SSE), 프론트엔드 fetch+ReadableStream으로 실시간 진행상황 표시, 기존 API 폴백 유지

## 아키텍처 (현재)
```
Foundry 플랫폼: Next.js → NestJS → PostgreSQL → Claude API → AI 코드 생성
고객 앱: Static Export (우리 서버) + Supabase (DB+인증+API)
배포: "배포하기" → 빌드 → https://{subdomain}.foundry.ai.kr
```

## 전체 로드맵 + 현재 위치

### Phase 1~2 ✅ 기본 플랫폼
### Phase 3 ✅ 코드 생성 엔진 + Supabase 전환
### Phase 4 ✅ 인프라 자동화 (프로비저닝 + 배포 + 모델)
### Phase 5 ✅ 코드 품질 + E2E 성공 (3/21)
- [x] F2~F7 코드 개선 전부 완료
- [x] **E2E 테스트 성공!** — `https://e2e-sonnet-97dd.foundry.ai.kr` 배포 확인
  - 버그 11개 발견/수정 (sanitizeCode 곱하기 삭제, next.config 덮어쓰기, 동적라우트 등)
  - 빌드 파이프라인: 서버→클라이언트 자동전환 + TS타입스킵 + 동적라우트 제거 + middleware 삭제
  - 커밋: 14af4df → 25981d7 (8개 커밋)

### Phase 6 🔄 코드 품질 근본 개선 + UX 핵심 기능 (3/21, 진행 중)
- [x] **AI 코드 생성 지침서 프롬프트 주입** — FRONTEND/GENERATE/fixBuildErrors 3곳에 Foundry Static Export 규칙서 주입
- [x] **Tailwind CSS 빌드 보장** — postcss.config.mjs + @tailwindcss/postcss 자동 생성
- [x] **Sonnet 모델 활성화** — smart/pro 모델 available: true
- [x] **동적 라우트 근본 해결** — 프롬프트 금지 + 클라이언트 대안패턴 주입
- [x] **실시간 미리보기 (LivePreview)** — Tailwind CDN + JSX→HTML 변환, 페이지 탭, 모바일/PC
- [x] **Static Export 호환성** — server.ts/middleware.ts/auth callback 생성 제거
- [x] **코드 수정 스마트 선별** — smartFileSelection() 키워드 매칭
- [x] **사이드바 네비 자동 생성** — Sidebar.tsx, pages[]로 메뉴 구성 + 인증
- [ ] **빌더 UI 디자인 개선** — "개발자 MVP" → Lovable 수준 "디자이너 제품" UX
- [ ] **범용 템플릿 추가** — "자유롭게 만들기" (Lovable처럼 업종 제한 없이)
  - localStorage: 포모도로, 가계부, 독서기록, 할일관리, 일정관리, 계산기/변환기
  - Supabase: 매칭앱, 커뮤니티, 블로그, 대시보드, 랜딩페이지, 뉴스피드, 사진갤러리
  - 고급: 음악플레이어, 웹게임, 화이트보드, 이미지편집 (Storage+복잡UI)

### Phase 7 ❌ 고급 기능 (미착수)
- 세리온 코드 모듈화 → RAG 주입 (결제/알림톡/예약 모듈)
- 관계형 데이터 (JOIN, 중첩 쿼리)
- 파일 업로드 (Supabase Storage)

### Phase 8 ❌ 사업화
- 시연 영상, 사례 3개, 랜딩페이지 리뉴얼, 유료 고객 확보
- **Lovable 벤치마킹 (3/21)**: 실시간 미리보기가 결제 전환의 핵심. "타이핑 3번에 앱 화면" → 충전 욕구 유발. 번역 품질은 거지같음 → 한국어 UX 차별화 기회

### 기타
- [x] Sonnet 모델 활성화 (3/21), Anthropic 크레딧 $16 잔액
- [ ] ERD + API 명세서 자동 생성
- [ ] 모두의창업 서류 (4/1 마감)

## 모델 설정 (3/21 업데이트)
| 티어 | 모델 ID | maxTokens | 용도 |
|------|---------|-----------|------|
| flash/fast | `claude-haiku-4-5-20251001` | 8192 | 대화, 간단한 수정 |
| smart/standard | `claude-sonnet-4-5-20250514` | 16384 | 코드 생성 메인 엔진 |
| pro/premium | `claude-sonnet-4-5-20250514` | 16384 | 복잡한 아키텍처 |

- Anthropic 크레딧: $16.03 잔액 (자동충전 OFF, 수동 충전)
- Sonnet으로 앱 약 2~3개 생성 가능

## 알려진 이슈 ⚠️
- Rate limit: 분당 출력 토큰 10,000 제한 → 2초 딜레이 + 재시도로 대응
- AI 생성 코드에 마크다운 혼입 (```, ###, 등)
- AI가 존재하지 않는 아이콘 import (heroicons 등)
- maxTokens 8192(Haiku) / 16384(Sonnet) → 긴 페이지 코드 잘림 가능
- 서버 비용: NCP ₩65,000/월 + 도메인 ₩20,000/년
- API 비용: 앱 1개당 ~$2.48 (Haiku) / ~$7.5 (Sonnet)

## 재시작 명령어
```
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

Phase 6 마무리해줘. memory/MEMORY.md + memory/DIRECTION_2026-03-21.md 참고.

## 전체 맥락
- Foundry = 정부지원사업 창업자를 위한 AI MVP 빌더 (Lovable 한국판)
- 기술스택: Next.js 16 (Static Export) + Supabase + Tailwind 4.0
- Phase 1~5 완료: 플랫폼+코드생성+인프라+코드품질+E2E 배포 성공
- Phase 6 진행 중 (8/10 완료)

## Phase 6 완료된 작업 (8개, 커밋 완료)
1. AI 코드 생성 지침서 프롬프트 주입 (FRONTEND/GENERATE/fixBuildErrors 3곳)
2. Tailwind CSS 빌드 보장 (postcss.config.mjs + @tailwindcss/postcss)
3. Sonnet smart/pro 모델 활성화
4. 동적 라우트 금지 + useState 대안패턴 주입
5. 실시간 미리보기 LivePreview 컴포넌트 (Tailwind CDN + JSX→HTML 변환)
6. Static Export 호환성 (server.ts/middleware/auth callback 생성 제거)
7. 코드 수정 smartFileSelection (키워드 매칭으로 관련 파일 자동 타겟팅)
8. Sidebar.tsx 사이드바 네비 자동 생성

## Phase 6 남은 작업 (2개) ← 이것만 하면 Phase 6 완료!

### 작업 1: 빌더 UI 디자인 개선
- 현재 상태: 다크 배경, 왼쪽 45% 데모미리보기 + 오른쪽 55% 채팅 (개발자 느낌)
- 목표: Lovable 수준 "디자이너 제품" UX
- Lovable 참고 스크린샷: 왼쪽 채팅+진행상황, 오른쪽 실시간 앱 미리보기
- 핵심 파일: web/src/app/builder/page.tsx (1300줄, 매우 큰 파일)
- 이미 만든 LivePreview 컴포넌트가 있음 (web/src/app/builder/components/LivePreview.tsx)
- 개선 포인트:
  a. 레이아웃: 생성 완료(done) 시 미리보기 중심 + 채팅 좁게 (현재 반대)
  b. 생성 중 진행상황 UI 개선 (SSE 스트리밍 이미 있음)
  c. 전체적 세련됨 (그라데이션, 애니메이션, 카드 디자인)
  d. 랜딩 페이지(/) 업종 선택 화면도 개선 고려

### 작업 2: 범용 템플릿 추가
- 현재: 6개 업종 고정 (미용실/CRM/커머스/O2O/에듀/시설)
- 목표: "자유롭게 만들기" 범용 템플릿 추가 (Lovable처럼 제한 없이)
- 핵심 파일들:
  a. web/src/app/builder/constants.ts — QUESTIONNAIRES, TEMPLATE_PROMPTS 정의
  b. api/src/ai/ai.service.ts — TEMPLATE_PROMPTS (업종별 프롬프트)
  c. web/src/app/page.tsx 또는 landing — 업종 선택 카드 UI
- 범용 템플릿이 지원해야 할 앱 종류:
  - localStorage만: 포모도로 타이머, 가계부/지출관리, 독서기록, 할일관리, 일정관리, 계산기/변환기
  - Supabase 연동: 매칭/만남앱, 커뮤니티, 블로그, 대시보드, 랜딩페이지, 뉴스피드, 사진갤러리
  - 고급(Storage+복잡UI): 음악플레이어, 웹게임, 화이트보드, 이미지편집
- 구현 방향: 업종 선택 없이 자유 설명 → AI가 아키텍처 자동 판단
  - DB 필요 여부, 인증 필요 여부를 AI가 판단
  - QUESTIONNAIRES에 'custom' 템플릿 추가 (범용 질문지)
  - TEMPLATE_PROMPTS에 'custom' 추가 (제한 없는 프롬프트)

## 이 2개 완료 후 → Phase 7 (RAG 주입, 관계형 데이터, 파일 업로드)

## 서버/인프라 정보
- [파운드리 서버] SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
- [배포] git push origin main → GitHub Actions → 자동배포
- [도메인] https://foundry.ai.kr (프론트) / https://foundry.ai.kr/api (API)
- [모델] Haiku(flash) + Sonnet 4.5(smart/pro), Anthropic ~$10 잔액
- [Supabase] 조직 sefhetzuysyhgcebslqd, 프로젝트 1/2개 사용중 (1개 여유)
- [방향성] memory/DIRECTION_2026-03-21.md (Lovable 벤치마킹 + 포지셔닝)
```
