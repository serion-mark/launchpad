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

### Phase 6 ❌ 생성 앱 기능 확장 (미착수)
- 관리자(어드민) 페이지 자동 생성
- 역할 기반 접근제어 (OWNER/STAFF)
- 관계형 데이터 (JOIN, 중첩 쿼리)
- 폼 유효성 검사 + 에러 처리
- 파일 업로드 (Supabase Storage)

### Phase 7 ❌ 고급 기능 (장기)
- 복잡한 비즈니스 로직, Realtime, 결제, Edge Functions, 차트
- **AI 코드 생성 지침서 → 프롬프트 주입** (에러율 대폭 감소)
  - 규칙: output:'export' 필수, JSX→.tsx, 클라이언트 Supabase만, 마크다운 금지
  - 템플릿: Supabase 클라이언트, 인증 패턴, CRUD 보일러플레이트
- 세리온 코드 모듈화 → RAG 주입 (결제/알림톡/예약 모듈)

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

Foundry Phase 5 E2E 버그 수정 + 재테스트 작업해줘. memory/MEMORY.md 참고.
- [완료] Phase 1~4: 플랫폼 + 코드생성엔진 + 인프라자동화 + 코드품질(F2~F7)
- [현재] Phase 5 E2E 테스트 — 빌드 실패 2회, 버그 수정 필요:
  1. **F6 버그**: aiBuildFix() 에러 파일 정규식이 `app/` 경로 못 잡음 → 같은 에러 3회 반복
     - deploy.service.ts의 errorFileRegex 수정 필요: `app/` 경로 추가
     - 동일 에러 반복 시 해당 파일 직접 매칭 로직 추가
  2. **F4 코드 잘림**: sales/page.tsx가 69줄에서 잘림 → continueGeneration 미작동 가능성
     - generateFullApp에서 AI 생성 직후 isCodeTruncated → continueGeneration 호출 확인
  3. 수정 후 기존 프로젝트(cmmzy4vbj0001rh447pjebvem) 재배포 테스트
  4. 성공하면 Phase 6(어드민 페이지, 역할 접근제어) 착수
- [제미니 제안 참고]: 세리온 코드 모듈화 → RAG/프롬프트 주입 (Phase 7 장기과제로 기록)
- [서버] SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
- [모델] Haiku(flash) + Sonnet 4.5(smart/pro), Anthropic $14 잔액 (77cr 사용)
- [보고서] memory/REPORT_2026-03-20.md, memory/REPORT_2026-03-21.md (이번 세션)
- Supabase: 조직 sefhetzuysyhgcebslqd, 프로젝트 1/2개 사용중 (1개 여유)
```
