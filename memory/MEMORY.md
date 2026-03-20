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

## 수익 모델
| 기능 | 설명 | 비용 |
|------|------|------|
| **앱 생성** | AI가 설계 + 코드 생성 | 크레딧 차감 |
| **배포하기** | Foundry 서버에 호스팅 | **월 9,900원** (고정 MRR) |
| **다운로드** | 소스코드 ZIP (코드 소유권 100%) | **별도 3,000 크레딧** |

## 카카오 OAuth 설정
- **앱 ID**: 1409363
- **REST API 키**: `2b61cab1882f996f30bd9e925a1ec3f8`
- **Redirect URI**: `http://175.45.200.162/api/auth/kakao/callback`
- **동의항목**: 닉네임(필수 동의 완료), 이메일(비즈앱 전환 후 추가 예정)
- **상태**: 앱 생성 + 로그인 활성화 + Redirect URI + 닉네임 동의 완료
- **코드 연동**: ✅ 완료 (3/19, Passport 없이 직접 HTTP OAuth 구현)

## 템플릿 6종 (완료)
| 템플릿 | 핵심 | ID |
|--------|------|----|
| ✂️ 미용실 POS | 동시시술+정산 | beauty-salon |
| 📅 범용 예약/CRM | 6개 업종 자동감지 | booking-crm |
| 🛍 쇼핑몰/커머스 | 상품+주문+배송 | ecommerce |
| 🔗 O2O 매칭 | 양면마켓+지도+수수료 | o2o-matching |
| 🎓 에듀테크 LMS | 강의+진도율+수료증 | edutech |
| 🏢 관리업체/시설관리 | 민원+시설예약+관리비 | facility-mgmt |

## 완료 작업 ✅

### Phase 1 (~3/18)
- ✅ 사업 기획서 + Next.js/NestJS 세팅 + 템플릿 3종 + 테마 20종
- ✅ 멀티 LLM 라우터 + 앱 생성 파이프라인
- ✅ 토스페이먼츠 구독 결제 + Builder Chat UI + 회원가입/로그인
- ✅ 프로젝트 CRUD + 원클릭 배포 + ZIP 다운로드 + SaaS 구독
- ✅ GitHub Actions 자동배포 + 토스 디자인 + Foundry 브랜딩

### Phase 2 (3/19) — AI 연동 + 빌더 UX 고도화
- ✅ AI 연동 (Claude Haiku API) — 빌더 대화, 한국어 시스템프롬프트
- ✅ 크레딧 시스템 (DB+충전+차감+잔액조회) — CreditBalance/CreditTransaction 모델
- ✅ 빌더 질문지 6종 (복수응답+직접추가+되돌아가기)
- ✅ PC/모바일 미리보기 완전 분리 (사이드바 vs 하단탭)
- ✅ 인터랙티브 미리보기 (메뉴 클릭 → 화면 전환, 업종별 데모 데이터)
- ✅ 업종별 라벨/이모지 자동 커스터마이징 (6개 업종 감지)
- ✅ 템플릿 3종 추가 (O2O/에듀테크/관리업체) — 질문지+featureMap+미리보기
- ✅ 어드민 페이지 (/admin) — 대시보드+사용자+프로젝트+크레딧+AI사용량 5탭
- ✅ 저장하기 버튼 (수동+30초 자동저장)
- ✅ 채팅 토큰 소모 실시간 표시
- ✅ 배포/다운로드 비용 안내 모달 (가격+설명+절약팁+다중앱 플랜 안내)
- ✅ 무료 미리보기 체험 → 앱 생성(결제) 플로우

### Phase 2.5 (3/19 후반) — 도메인/AI프롬프트/가이드
- ✅ 도메인 **https://foundry.ai.kr** + SSL (Let's Encrypt, 자동갱신)
- ✅ AI 업종별 시스템 프롬프트 완전 분리 (6개 템플릿별 관련용어+금지용어)
- ✅ 미리보기 데모 데이터 업종별 완전 분리 (관리업체/O2O/에듀테크 전용)
- ✅ 가이드 페이지 (/guide) — 시작하기+운영가이드+AI활용법+FAQ 4탭
- ✅ 카카오 Redirect URI HTTPS 업데이트

### Phase 3 (3/20~) — 코드 생성 엔진 🔴 진행 중
- **플랜 파일**: `.claude/plans/calm-snacking-tome.md`
- **전략**: B→A 점진적 전환 (스마트 스캐폴딩 → 풀 코드 생성)
- **과금**: 토큰 기반 크레딧 차감 (고정가 아님, 사용한 만큼)
- **모델 3단계**: Flash(Haiku, 1cr/파일) / Smart(Sonnet, 3cr) / Pro(Opus, 10cr) — 고객 자유 선택
- **⚠️ Sonnet/Opus API 별도 키 필요** — Haiku로 먼저 파이프라인 완성 후 활성화
- **핵심 기능**: AI 자기 평가(confidence), 자동 컨텍스트 저장(이어하기), 코드 헬스체크(동의 후 정리)
- Sprint 1: DB스키마확장 + 크레딧차등 + 모델설정 + builder파일분리
- Sprint 2: 코드 생성 파이프라인 (5단계) + ModelSelector UI
- Sprint 3: 채팅 수정 루프 + 버전 관리 + 이어하기
- Sprint 4: 프로젝트 컨텍스트 + 헬스체크
- Sprint 5: AI 자기 평가 UI + 코드 정리 + 테스트

### ⚠️ 알려진 이슈
- Anthropic API 키가 **Haiku만 접근 가능** (Sonnet/Opus 404) — 별도 API 키 발급 또는 크레딧 충전 필요
- GitHub Actions 자동배포 시 `api/dist/` 충돌 — deploy.yml에 정리 로직 필요
- 이메일 동의항목: 비즈앱 전환 필요 (현재 닉네임만 가능)

## 타겟 전략 (3/19 확정)
- **1차**: 정부지원금 받은 창업자 (예창패/초창패)
- **2차**: 카페24/아임웹 대안 (비싸고 관리 못하는 사람들)
- **3차**: 회사 홈페이지 필요한 중소기업 (외주 비싸서)
- **핵심 차별점**: 만들 때만 돈 → **운영할 때도 AI가 도와줌** (토큰 소모 = MRR)
- 전략 문서: `전략폴더/Foundry_AI운영도우미_전략_2026-03-19.docx`

## 다음 작업 (미완료)

### ✅ 카카오 OAuth 코드 연동 (3/19 완료)
- [x] NestJS: GET /auth/kakao + /auth/kakao/callback (Passport 없이 직접 HTTP)
- [x] 프론트: "카카오로 시작하기" 버튼 + /auth/kakao/callback 콜백 페이지
- [x] 카카오 닉네임 자동 회원가입 + 기존 이메일 유저 연동 + JWT 발급
- [x] 운영서버 .env 카카오 환경변수 3개 추가 + 배포 완료

### 🔴 코드 생성 엔진 (Sprint 1~5) — 현재 진행 중
- [ ] Sprint 1: DB스키마(Project 확장) + 크레딧 모델별 차등 + AI 모델 3단계 + builder 파일분리
- [ ] Sprint 2: generateFullApp 5단계 파이프라인 + ModelSelector UI
- [ ] Sprint 3: 채팅 수정 → 코드 반영 + 버전 관리 + 이어하기 UI
- [ ] Sprint 4: 자동 컨텍스트 저장 + 코드 헬스체크
- [ ] Sprint 5: AI 자기 평가 + 코드 정리 + 통합 테스트
- [ ] AI 운영 도우미: 대량 상품 등록, 콘텐츠 생성, 매출 분석 등 (Sprint 이후)

### 🟡 추가 개선
- [ ] ERD 자동 생성 + API 명세서 자동 생성 (ZIP에 포함)
- [ ] deploy.yml 수정 (api/dist/ 정리 로직)
- [ ] Sonnet/Opus 모델 활성화 (Anthropic 크레딧 충전 후)
- [ ] 랜딩페이지 비교광고 문구 (Base44/Polsia 대비)

### 🟡 모두의창업 서류 (4/1 마감)
- [ ] 신청서 작성 + 사업계획서 + 증빙서류

## 배포 절차
```bash
# 자동배포: git push origin main → GitHub Actions → NCP SSH → build → PM2 restart
# ⚠️ 자동배포 실패 시 수동배포:
ssh -i ~/.ssh/serion-key.pem root@175.45.200.162
cd /root/launchpad && rm -rf api/dist && git checkout -- . && git pull origin main
cd web && rm -f .next/lock && npm run build && pm2 restart launchpad-web
cd ../api && npm run build && pm2 restart launchpad-api
```

## 재시작 명령어
```
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

Foundry 코드 생성 엔진 구현 이어서 작업해줘. memory/MEMORY.md 참고.
- 플랜: .claude/plans/calm-snacking-tome.md
- [완료] 기본기능 + AI연동(Haiku) + 크레딧 + 빌더질문지6종 + 미리보기 + 템플릿6종 + 어드민 + 도메인SSL + 카카오OAuth코드연동(3/19)
- [현재] 코드 생성 엔진 구현 (Sprint 1~5)
- [전략] B→A전환, 토큰과금, Flash/Smart/Pro 3모델, AI자기평가, 자동컨텍스트, 헬스체크
- [주의] Haiku만 API 가능, Sonnet/Opus는 별도 키 필요 → Haiku로 먼저 파이프라인 완성
- Sprint 1부터 시작: DB스키마 + 크레딧차등 + 모델설정 + builder파일분리
[서버] web:3000(PM2) + api:4000(PM2) + PostgreSQL(launchpaddb) + nginx HTTPS + foundry.ai.kr
[카카오] REST API키:2b61cab1882f996f30bd9e925a1ec3f8 / 앱ID:1409363 / Redirect:https://foundry.ai.kr/api/auth/kakao/callback
```
