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
- **핵심 가치**: 외주 5,000만원 → 크레딧 20~30만원
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

## 🔴 다음 작업 (미완료)

### 1순위: 코드 품질 개선
- [x] F2: 마크다운 혼입 방지 (sanitizeCode + sanitizeSql) ✅ (3/21)
- [x] F3: Import 검증 (금지패키지 제거 + 자동추가) ✅ (3/21)
- [x] F4: maxTokens 동적 조절 + 코드 잘림 → 이어서 생성(continuation, 최대 2회) ✅ (3/21)
- [x] F6: 빌드 자동 검증 + AI 수정 루프 (빌드 실패 → AI 에러분석 → 코드수정 → 재빌드, 최대 3회) ✅ (3/21)
- [x] F7: SSE 비동기 파이프라인 (12분 블로킹 → 실시간 진행상황 스트리밍) ✅ (3/21)
- [ ] E2E 테스트: Sonnet으로 실제 앱 생성 → 배포 → 서브도메인 접속

### 기타
- [x] Sonnet 모델 활성화 — 모델 ID 최신화 완료 (3/21), Anthropic 크레딧 $16 잔액 (자동충전 OFF)
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

Foundry 코드 품질 개선 작업해줘. memory/MEMORY.md 참고.
- [완료] Phase 1~2: 기본기능 + AI연동 + 크레딧 + 빌더질문지6종 + 미리보기 + 템플릿6종 + 어드민 + 도메인SSL + 카카오OAuth
- [완료] Phase 3: 코드 생성 엔진 (Sprint 1~5) + Supabase 기반 전환 (3/20)
- [완료] Phase 4: Supabase 자동 프로비저닝 + 배포 파이프라인 + 모델 ID 최신화 (3/21)
- [완료] 코드 품질 개선 (F2~F7 전체 완료, 3/21):
  - F2: 마크다운 혼입 방지 ✅
  - F3: Import 검증 ✅
  - F4: 코드 잘림 → 이어서 생성(continuation) ✅
  - F6: 빌드 자동 검증 + AI 수정 루프 ✅
  - F7: SSE 비동기 파이프라인 ✅
- [현재] E2E 테스트: Sonnet으로 실제 앱 생성 → 배포 → 서브도메인 접속
- [비전] 파운더리로 세리온 POS 같은 실제 프로그램을 만들 수 있게!
- [모델] Haiku(flash) + Sonnet 4.5(smart/pro), Anthropic $16 잔액
- [서버] SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
- [배포] 사용자 "배포하기" → 빌드 → https://{subdomain}.foundry.ai.kr
- [보고서] memory/REPORT_2026-03-20.md (오류/구조문제/개선사항 상세)
- Supabase 조직: sefhetzuysyhgcebslqd
```
