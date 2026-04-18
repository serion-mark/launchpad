# ⛔ 절대 고정 — 수정/삭제 금지 (모든 AI 세션 필수 참조)

## 프로젝트
- **이름**: Foundry (AI MVP 빌더)
- **레포**: serion-mark/launchpad
- **도메인**: foundry.ai.kr
- **대표자**: 김형석
- **이메일**: mark@serion.ai.kr

## 절대 규칙
- 답변은 항상 한글로
- "절대" 라는 단어 쓰지 마
- 배포 전 반드시 사장님께 확인 후 배포
- 코드 꼬이면 안 됨 — 파일 1개씩 신중하게 수정
- 베타 서비스 중단 최소화
- **SSH 포트: 3181** (22번 아님!)
- GitHub Actions 자동배포만 (SSH 직접 배포 X)
- 비용 발견하면 0으로 (Claude Code 활용, 외부 API 최소화)

## ⚠️ Foundry 고유 규칙 (세리온과 다른 점!)

### Prisma 스키마는 1개!
```
launchpad/api/prisma/schema.prisma   ← 이 1개만 존재
```
- **세리온 CLAUDE.md의 `schema-customer.prisma` 언급은 Foundry와 무관!**
- Foundry는 단일 DB 구조 (서버 B 같은 거 없음)
- 새 필드 추가 시 `schema.prisma`만 수정

### 서버 구조 (단일)
```
서버 (175.45.200.162) — 코드 + DB 단일
  ├─ 코드: GitHub Actions 자동배포
  ├─ DB: launchpaddb (PostgreSQL, 비번 launchpad1234)
  ├─ 도메인: foundry.ai.kr
  └─ SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
```

## 배포 흐름
```
git push origin main
  → GitHub Actions
  → 서버에서 deploy.sh 실행
    ├─ prisma db push (스키마 반영)
    ├─ prisma generate
    ├─ npm run build (API + Web)
    └─ pm2 reload
```

---

# 기술 스택 고정

- **API**: NestJS + Prisma 6.x + PostgreSQL
- **Web**: Next.js 16+ (App Router)
- **AI**: Anthropic SDK (Claude Sonnet 4.6 / Haiku 4.5)
- **배포**: GitHub Actions → PM2
- **서브앱**: 동적 서브도메인 (app-xxxx.foundry.ai.kr)

---

# 공통 코드 규칙

- IIFE `{state && (() => JSX)()}` 사용 금지 → `{state && <Component/>}`
- npm install은 루트에서만 (npm workspaces)
- Prisma Json? null → `Prisma.DbNull` 사용
- NestJS: `import type { CurrentUserPayload }` (isolatedModules)
- API JOIN 필드: 항상 `| null` + 옵셔널 체이닝
- Next.js redirect()를 page.tsx에 쓰면 PM2 크래시 → next.config.ts `async redirects()`
- npx 실행 시: `export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"`

---

# 필독 문서 (4/18 풀런 시)

**풀런 명령서 (통째로 복사해서 새 세션에 붙여넣기):**
- `/Users/mark/세리온 ai전화예약+POS통합관리/memory/HANDOFF_2026-04-18_FULL_RUN.md`

**상세 가이드:**
- `launchpad/memory/BASICS.md` — Foundry 기본 정보
- `launchpad/memory/MEMORY.md` — 작업 히스토리
- `launchpad/memory/MASTER_ROADMAP_260417.md` — 5.5주 로드맵
- `launchpad/memory/phases/260417_PHASE{0,1,2,3,4}_PLAN.md` — Phase별 상세

**최신 인수인계:**
- `/Users/mark/세리온 ai전화예약+POS통합관리/memory/BRAINSTORM_SESSION11_HANDOFF_FOUNDRY.md`

**유령파일 (읽지 마!):**
- `launchpad/memory/MIGRATION_2026-04-18_PLAN.md` → 유령파일모음/ 이동됨
- `launchpad/memory/phases/_old_*_v1.md` → 폐기
- 세리온 CLAUDE.md의 `schema-customer.prisma` 언급 → Foundry와 무관

---

# 모델 정책 (4/18 이후)

- **FAST (Haiku 4.5)**: 의도 분류, 선택지 생성, 채팅 상담 → **무료 (회사 부담)**
- **SMART (Sonnet 4.6)**: 코드 생성 (기본) → 6,800cr
- **PRO (Opus 4)**: 복잡한 작업 → 3,000~5,000cr

모델 ID:
- `claude-haiku-4-5-20251001`
- `claude-sonnet-4-6`
- `claude-opus-4-7`

⚠️ **Sonnet 4.6 주의사항 (어제 사고 교훈):**
- assistant prefill 미지원 → 사용 금지
- Advisor tool 미지원 → 400 에러 시 폴백 필요
- 강제 프롬프트는 "번호 리스트 + 자체 검증 루프" 형식

---

# 투 트랙 안내 (사장님)

- **트랙 A — 세리온**: 미용실 AI POS
  - 경로: `/Users/mark/세리온 ai전화예약+POS통합관리`
  - CLAUDE.md: 해당 레포 루트
- **트랙 B — Foundry**: AI MVP 빌더 (이 레포)
  - 경로: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad`
  - CLAUDE.md: 이 파일

작업 시작 시:
- "세리온 작업할게" → 세리온 CLAUDE.md + SERION_GUIDE.md 읽기
- "파운더리 작업할게" → 이 파일 + FOUNDRY 가이드 읽기

---

# 핵심 비전 (Opus 세션에 반드시 전달)

> "Tony Stark만 입던 Iron Man 슈트(AI)를,
>  Foundry로 누구나 입을 수 있게"

Foundry = **AI 활용 격차 해소 미들웨어**
- ❌ AI 코딩 도구 X
- ❌ 노코드 빌더 X
- ❌ 템플릿 사이트 X
- ✅ 비개발자가 AI 고수처럼 SaaS 만드는 미들웨어

구현 방식: Claude Code 임베드 (Agent SDK 또는 tool_use 직접)
