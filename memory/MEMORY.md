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

### Phase 6 ✅ 코드 품질 근본 개선 + UX 핵심 기능 (3/21, 완료)
- [x] AI 코드 생성 지침서 프롬프트 주입
- [x] Tailwind CSS 빌드 보장
- [x] Sonnet 모델 활성화
- [x] 동적 라우트 근본 해결
- [x] 실시간 미리보기 (LivePreview)
- [x] Static Export 호환성
- [x] 코드 수정 스마트 선별
- [x] 사이드바 네비 자동 생성
- [x] **빌더 UI Lovable 스타일 리디자인** (커밋 677c1dd) — 왼쪽채팅380px+오른쪽미리보기flex-1, 단계별프로그레스, 아바타, 그라데이션버튼
- [x] **범용 템플릿 'custom' (자유롭게 만들기)** (커밋 677c1dd) — 7번째 템플릿, 범용 질문지6문항, AI 자동 아키텍처 판단

### Phase 7 ✅ 홈페이지 상용화 + 법적 준비 (3/21, 커밋 73ed49a, 배포됨)
- [x] **page.tsx → /start 분리** — 1263줄 빌더 플로우 → `/start/page.tsx` 이동
- [x] **랜딩 페이지 리뉴얼** — 히어로+강점3카드+사용법4단계+포트폴리오미리보기+가격요약+CTA
- [x] **LandingNav + Footer 공유 컴포넌트** — 홈/포트폴리오/가격표/사용법/시작하기 메뉴 + 모바일 햄버거
- [x] **법률 3페이지** — /terms(이용약관) + /privacy(개인정보) + /refund(환불정책+코드소유권)
- [x] **약관 동의 플로우** — /agree 페이지(체크박스4개), 카카오 콜백→termsAgreedAt null→/agree 이동
- [x] **DB 스키마** — User에 termsAgreedAt/privacyAgreedAt/refundAgreedAt/marketingAgreedAt 추가
- [x] **가격표 페이지** — /pricing (패키지3종+크레딧소모표+외주비교+FAQ)
- [x] **포트폴리오 갤러리** — /portfolio (5개 예시 앱 카드)
- [x] **가이드 보강** — /guide LandingNav/Footer 적용

### Phase 7.5 ✅ UX 개선 (3/21, 커밋 f1ab659, 배포됨)
- [x] **챗봇 위젯** (ChatWidget.tsx) — 우측하단 플로팅, FAQ 12개, 빠른버튼 4개, /start 연결
- [x] **랜딩 카피 교체** — "아이디어만 있으면 됩니다. 나머지는 AI가 만들어 드립니다." (일반인 관점)
- [x] **포트폴리오 5→10개** — 백설공주사과농장/매칭히어로/하루습관/취미모아/팜투홈 추가, 지역/테크 배지
- [x] **/start 템플릿 7→10개** — 지역커머스/헬스케어/전문가매칭 + 질문지 3종, custom ✨ 맨 마지막
- [x] **디자인 검수** — 모바일 히어로 폰트 28px 미세조정 (커밋 3dd7255)
- [x] **포트폴리오 CSS 목업 + 실제 스크린샷** (커밋 12d214f) — AppMockup.tsx 10종 CSS 목업 + 펫메이트 대시보드 실제 스크린샷 + LIVE 배지
- [ ] **약관 법적 검증** — 변호사/법무사 검토 추천 (코드 작업 아님)

### Phase 8 ❌ 고급 기능 + 템플릿 확장
- 세리온 코드 모듈화 → RAG 주입
- 관계형 데이터 (JOIN, 중첩 쿼리)
- 파일 업로드 (Supabase Storage)
- 고객 앱 챗봇 (AI or FAQ 챗봇 컴포넌트 자동 포함)
- 영문 버전 (i18n)

### Phase 9 ❌ 사업화
- 시연 영상 3개 (실제 앱 생성 과정 3분 영상)
- 사용 후기/케이스 스터디
- 유료 고객 1호
- 정부지원사업 커뮤니티 마케팅 (네이버 카페, 단톡방)

### 기타
- [x] Sonnet 모델 활성화 (3/21), Anthropic 크레딧 ~$16 잔액
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

Phase 8 착수해줘. memory/ 폴더 전부 참고.

## 필수 참조 파일
- memory/MEMORY.md — 전체 프로젝트 상태 + 로드맵 + 아키텍처
- memory/STRATEGY_REPORT_2026-03-21.md — 핵심 전략 보고서
- memory/TARGET_APPS_2026-03-21.md — 앱 카테고리 10개
- memory/DIRECTION_2026-03-21.md — 기술 방향성 + Lovable 벤치마킹

## 현재 상태
- Phase 1~7.5 전부 완료, 배포됨: https://foundry.ai.kr
- 최종 커밋: 7a4e707 (2026-03-21)

## Phase 8 작업 4개 (고급 기능 + 템플릿 확장)

### 작업 1: 세리온 코드 모듈화 → RAG 주입 ⭐ 핵심
- 목적: AI가 생성하는 코드 품질을 세리온 POS 수준으로 끌어올림
- 방법: 세리온 코드에서 검증된 모듈(결제/알림톡/예약/인증)을 추출 → RAG 벡터DB에 저장 → AI 코드 생성 시 참조
- 세리온 코드 위치: /Users/mark/세리온 ai전화예약+POS통합관리/
- 핵심 파일들:
  - api/src/kakao/kakao.service.ts (알림톡 발송)
  - api/src/sale/sale.service.ts (결제/환불 로직)
  - api/src/reservation/reservation.service.ts (예약 생성/검증/트랜잭션)
  - web/src/lib/api.ts (authFetch, fetchJson 패턴)
- AI 프롬프트 위치: api/src/ai/ai.service.ts → generateApp() 메서드
- 템플릿 프롬프트: api/src/ai/prompts/ 디렉토리 확인

### 작업 2: 관계형 데이터 (JOIN, 중첩 쿼리)
- 현재: AI가 생성하는 Supabase 쿼리가 단순 CRUD만 지원
- 목표: 1:N, N:M 관계, JOIN 쿼리, 중첩 select 지원
- 수정 대상: AI 코드 생성 프롬프트 + SQL 마이그레이션 생성 로직
- 파일: api/src/ai/ai.service.ts, api/src/supabase/supabase.service.ts

### 작업 3: 파일 업로드 (Supabase Storage)
- 현재: 이미지/파일 업로드 미지원
- 목표: Supabase Storage 버킷 자동 생성 + 업로드 컴포넌트 자동 포함
- 수정 대상: Supabase 프로비저닝 + AI 프롬프트에 Storage 패턴 추가

### 작업 4: 고객 앱 챗봇
- AI 생성 앱에 FAQ 챗봇 컴포넌트 자동 포함
- ChatWidget.tsx를 Foundry 자체용이 아닌, 고객 앱 템플릿으로 변환
- 파일: web/src/app/components/ChatWidget.tsx 참고

## 아키텍처 (코드 생성 파이프라인)
```
사용자 질문 응답 → POST /ai/generate-app-sse
→ ai.service.ts: buildPrompt() → Claude API 호출
→ 응답 파싱 (sanitizeCode) → 파일별 분리
→ Supabase 프로비저닝 (프로젝트 생성 + SQL 마이그레이션)
→ 파일 저장 (/var/www/apps/{subdomain}/)
→ next build (export) → 배포
```

## 서버/배포
- git push origin main → GitHub Actions → 자동배포
- SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
- 도메인: https://foundry.ai.kr
- Anthropic 크레딧: ~$16 (Sonnet 앱 2~3개 생성 가능)

## ⭐ 핵심 철학
> "우리 고객은 AI 전문가가 아니야. 채팅으로 AI 쓰는 사람들을
> 전문가처럼 만들어주고 돈을 받는 서비스를 하는 거잖아?"

## 타겟 고객
- 1차: 모두의창업(지역+테크 2트랙), 예창패, 초창패, 재도전 성공패키지 합격자 (연 ~13,000명)
- 페르소나: ① 지역기반(스마트팜/특산품/카페) ② 테크기반(헬스케어/매칭/소셜) ③ 외주 좌절 창업자
- 킬러 메시지: "외주 3천만 → 30만원" + "사업비 개발비 항목 정산 가능 = 실질 무료"

## Phase 7.5 작업 목록 (4개)

### 작업 1: 챗봇 위젯 ⭐ 가장 중요
- web/src/app/components/ChatWidget.tsx 신규 생성
- 우측 하단 플로팅 버튼 💬 → 클릭 시 대화창 슬라이드업
- FAQ 자동 응답 (가격/기능/소요시간/환불 등)
- 빠른 버튼: [매칭앱] [쇼핑몰] [예약앱] [직접 질문]
- "이런 앱 만들 수 있나요?" → "네!" → /start 연결
- 모바일 반응형 필수
- page.tsx 하단에 <ChatWidget /> 추가
- 참고: 숨고(벤치마크 5번) 우측하단 "챗봇 상담" 버튼 스타일

### 작업 2: 랜딩 카피 교체 + 디자인 검수
- page.tsx 히어로 카피를 일반인 관점으로 교체
  Before: "30만원으로 작동하는 MVP를 만드세요"
  After: "아이디어만 있으면 됩니다. 나머지는 AI가 만들어 드립니다."
  서브: "개발자 없이, 질문에 답하기만 하면 작동하는 앱이 완성됩니다."
- 실제 https://foundry.ai.kr 렌더링 확인 → 색상/간격/모바일 미세조정
- LandingNav, Footer 스타일 점검

### 작업 3: 포트폴리오 5개 → 10개 확장
- portfolio/page.tsx 에 5개 추가:
  6. 해적단마켓 (지역특산품/산지직송)
  7. 매칭히어로 (전문가매칭/견적)
  8. 하루습관 (헬스케어/습관트래커)
  9. 취미모아 (취미기반 동호회매칭) ← 사장님 관심 아이템
  10. 팜투홈 (스마트팜 직판+체험예약)
- 지역/테크 배지로 구분
- 각 카드에 "이 앱 만들어보기" → /start 링크

### 작업 4: /start 템플릿 카드 10개로 확장
- start/page.tsx의 templateCards 배열에 3개 추가:
  - local-commerce (지역커머스/특산품)
  - healthcare (헬스케어/습관관리)
  - matching (전문가매칭/견적)
- "자유롭게 만들기(custom)"는 맨 마지막에 배치 (선택의 역설 방지)
- 각 템플릿별 질문지 6문항 작성 필요

## 주요 파일 구조
- web/src/app/page.tsx — 랜딩 페이지 (히어로+섹션들)
- web/src/app/start/page.tsx — 빌더 플로우 (템플릿선택→질문지→테마→생성, 1263줄)
- web/src/app/components/LandingNav.tsx — 공유 네비게이션
- web/src/app/components/Footer.tsx — 공유 푸터
- web/src/app/components/ChatWidget.tsx — ⭐ 신규 생성 (챗봇)
- web/src/app/agree/page.tsx — 약관 동의
- web/src/app/terms/page.tsx, privacy/page.tsx, refund/page.tsx — 법률 페이지
- web/src/app/pricing/page.tsx — 가격표
- web/src/app/portfolio/page.tsx — 포트폴리오

## 서버/배포
- git push origin main → GitHub Actions → 자동배포 (prisma db push 포함)
- SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
- 도메인: https://foundry.ai.kr
```
