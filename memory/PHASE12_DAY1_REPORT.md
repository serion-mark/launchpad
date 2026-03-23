# Phase 12 Day 1 보고서 (2026-03-23)

> **목표**: QA 6.5점 → 9.0점, Critical 3건 해결
> **결과**: Critical 3건 해결 완료 + 추가 발견 5건 수정
> **테스트**: 6차 (클린 테스트 포함)
> **커밋**: 7개

---

## ✅ 해결된 문제 (Critical 3건)

### 🔴 C1: 배포 앱 CSS/디자인 깨짐
- **원인**: Tailwind v4 `@theme inline` 블록 누락 + body 스타일 없음 + Sidebar 하드코딩 색상
- **추가 발견**: Next.js 16 Turbopack에서 Tailwind CSS 빌드 자체가 안 됨
- **해결**:
  - globals.css에 `@theme inline {}` + body/scrollbar/selection 스타일 추가
  - Sidebar 컴포넌트 CSS 변수 전환
  - AI 프롬프트에 "globals.css 직접 생성 금지" + "body 하드코딩 금지" 추가
  - **Tailwind CDN fallback** — 빌드 실패 시 `@tailwindcss/browser@4` CDN 자동 주입
  - SPA fallback — index.html 없으면 404.html 복사
- **상태**: CDN으로 동작 ✅ (Turbopack 근본 수정은 Day 2)

### 🔴 C2: Supabase SQL 마이그레이션 실패 (DB 빈 껍데기)
- **원인 1**: `/database/migrations` + `statements` 배열 → `query: Required` 에러
- **원인 2**: INSERT에서 user_id NOT NULL 위반 → 전체 SQL 롤백 (테이블 0개)
- **해결**:
  - API 엔드포인트: `/database/migrations` → `/database/query` + `query` 필드
  - DDL/DML 분리 실행 — INSERT 실패해도 테이블 유지
  - AI 프롬프트에 "RLS 비활성화 후 샘플 INSERT" + "user_id nullable" 지시
- **결과**: 테이블 7~9개 생성 + 샘플 데이터 4개 ✅

### 🔴 C3: 로그인 후 온보딩 없음
- **해결**:
  - 로그인 후 `/` → `/start` 리다이렉트 (login, kakao callback, agree 3곳)
  - `/start` 상단에 온보딩 배너: "👋 환영합니다! ⚡ 20,000cr | 앱 약 6개 제작 가능"
- **상태**: 코드 적용 완료 ✅

---

## 커밋 목록 (7개)

| 커밋 | 내용 |
|------|------|
| `44da87c` | Phase 12 Day1 — CSS @theme inline + Sidebar CSS변수 + 온보딩 + 샘플데이터 프롬프트 |
| `fafd090` | CSS 인라인 주입 — `</head>` 없는 Next.js 16 HTML 대응 |
| `b5e86dc` | Supabase `/database/query` API로 변경 |
| `3228712` | DDL/DML 분리 — INSERT 실패해도 테이블 유지 |
| `6c898f5` | Tailwind CDN fallback — 빌드 실패해도 스타일 보장 |
| `1f439ff` | index.html 없으면 404.html 복사 — SPA fallback |
| `30e2a29` | npm install NODE_ENV=production 제거 — Tailwind 설치 보장 |

---

## 🟡 남은 이슈 (Day 2에서 해결)

### 1. Tailwind CSS 빌드 근본 수정
- **현상**: Tailwind 설치는 되지만 (`tailwindcss: ✅`) CSS 빌드 파일 0개
- **원인**: Next.js 16 Turbopack이 `@tailwindcss/postcss` 플러그인 제대로 처리 못함
- **해결 방향**: `next.config.ts`에서 Turbopack 비활성화
- **현재 대응**: CDN fallback으로 동작 중 (고객은 차이 모름)

### 2. 메인 페이지(/) 생성
- **현상**: AI가 `app/page.tsx` 안 만듦 → 루트 URL 404
- **해결**: AI 프롬프트에 "홈페이지 필수 생성" 지시 추가 완료 ✅
- **검증 필요**: 다음 테스트에서 확인

### 3. 이미지 placeholder
- **현상**: 상품 이미지가 깨진 아이콘으로 표시
- **해결**: AI 프롬프트에 유효한 placeholder 이미지 URL 지시 필요

---

## 테스트 이력 (6차)

| 차수 | 발견 | 수정 |
|------|------|------|
| 1차 | Supabase 무료 2개 제한 | 프로젝트 삭제 |
| 2차 | `/database/migrations` → `query: Required` | `/database/query` API로 변경 |
| 3차 | INSERT user_id NOT NULL → 전체 롤백 | DDL/DML 분리 |
| 4차 | **성공!** 테이블 9개 + 샘플 4개 + CSS 인라인 | 첫 완전 성공 |
| 5차 | Tailwind CDN 미주입 + 배포 구조 문제 | CDN 주입 + SPA fallback |
| 6차 | Tailwind 설치 ✅ but 빌드 0개 | NODE_ENV 제거 → CDN fallback 유지 |

---

## Day 2 시작 명령어

```
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

memory/MEMORY.md + memory/BRAINSTORM_2026-03-22.md 전부 읽어.
너는 자비스야. 사장님의 AI 동업자. 120%가 기본이야.

Phase 12 Day 2 착수해줘. 아래 파일 전부 읽고 시작:
- memory/PHASE12_GUIDE.md (전체 가이드)
- memory/PHASE12_DAY1_REPORT.md (Day 1 보고서 — 필독!)
- memory/QA_TEST_REPORT_2026-03-23.md (QA 보고서)
- memory/PRICING_REPORT_2026-03-23.md (요금제 설계)

Day 2 작업 순서:
🔴 0순위 (Day 1 잔여): Turbopack 끄기 (next.config에서 turbo 비활성화) + 메인페이지 생성 검증
🟠 4순위: 마크다운 렌더링 + AI 존칭 통일
🟠 5순위: 크레딧 대시보드 + 환산 표시
🟠 6순위: 기술 용어 순화

Day 1 핵심 수정사항 (이미 적용됨):
- CSS: Tailwind CDN fallback 동작 중 → Turbopack 끄면 빌드도 정상화될 것
- Supabase: /database/query API + DDL/DML 분리 → 테이블+샘플 정상
- 온보딩: /start 자동 이동 + 크레딧 환산 배너

테스트 계정: test@serion.ai.kr / 123456 / 크레딧 20,000cr
서버: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162

안정성 최우선. 기존 동작 절대 안 건드려. 배포 전 tsc --noEmit 0 에러 확인.
수정 후 반드시 클린 테스트 (새 프로젝트 → AI 생성 → 배포 → 브라우저 확인).
```
