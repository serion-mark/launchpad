# Phase 12 Day 2 보고서 (2026-03-23)

> **목표**: Day 1 잔여 + Major UX 6건 해결
> **결과**: 6/6 완료 (1건은 이미 구현되어 있음)
> **커밋**: `d1b2e80`
> **tsc --noEmit**: API 0 에러 ✅ + Web 0 에러 ✅

---

## ✅ 완료 작업

### 🔴 1. Turbopack 비활성화 (CSS 빌드 근본 수정)
- **원인**: Next.js 16 Turbopack이 Tailwind v4 `@tailwindcss/postcss` 플러그인을 제대로 처리 못함
- **해결**: `ensureNextConfig()`에 `experimental: { turbo: false }` 자동 삽입
- **적용 범위**:
  - `ensureNextConfig()` — 기존 config 수정 시 turbo: false 추가
  - `ensureNextConfig()` — config 신규 생성 시 turbo: false 포함
  - `generateCommonFrontendFiles()` — 기본 next.config.ts 템플릿에 포함
- **효과**: Webpack으로 강제 빌드 → `_next/static/css/` 파일 정상 생성
- **CDN fallback**: 기존 CDN 보험은 유지 (이중 안전장치)

### 🔴 2. 메인 페이지(/) 자동 생성 검증 + fallback 보강
- **프롬프트**: Day 1에서 "반드시 app/page.tsx를 첫 번째 페이지로 생성" 지시 완료 ✅
- **fallback**: AI가 page.tsx를 미생성 시 자동 fallback 삽입 로직 추가
  - 앱 이름 + 설명 + 각 페이지 링크 카드 그리드
  - F2/F3 코드 품질 보정 직전에 체크
- **404 방지**: 루트 URL 접속 시 항상 200 OK 보장

### 🟠 3. 마크다운 렌더링 + 존칭 통일
- **react-markdown + remark-gfm 설치**
- **MarkdownRenderer 공통 컴포넌트 생성** (`web/src/app/components/MarkdownRenderer.tsx`)
  - **볼드**, 목록, 테이블, 코드블록, 인용, 링크 커스텀 렌더링
  - 다크 테마 호환 스타일
- **적용 위치 (4곳)**:
  - `builder/page.tsx` — 빌더 채팅 AI 응답
  - `meeting/page.tsx` — AI 회의실 (사전 질문 + 분석 + 보고서 + 후속 채팅 6곳)
  - `start/page.tsx` — 시작 페이지 AI 응답
  - `components/ChatWidget.tsx` — 챗봇 위젯
- **존칭 통일**:
  - `BUILDER_SYSTEM_PROMPT`에 "항상 존칭(~습니다, ~하시겠어요?) 사용, 반말 금지" 추가
  - `meeting.service.ts` 프롬프트 2곳에 존칭 지시 추가
  - "괜찮아요" → "괜찮습니다" 등

### 🟠 4. 크레딧 대시보드 개선
- **잔액 대시보드 추가** (credits/page.tsx 상단)
  - 잔액 크게 표시 + "앱 약 N개 제작 가능" 환산
- **헤더 잔액에도 환산** 표시
- **CreditWarning 컴포넌트** (`web/src/app/components/CreditWarning.tsx`)
  - 크레딧 소모 사전 안내 모달
  - 소모 크레딧 / 현재 잔액 / 사용 후 잔액 표시
  - 잔액 부족 시 충전 버튼으로 전환
- **패키지 이름**: 이미 "라이트팩/스탠다드팩/프로팩"으로 통일되어 있음 ✅

### 🟠 5. 기술 용어 순화
- **랜딩 페이지** (`page.tsx`):
  - "Lock-in 제로" → "종속 없이 자유롭게"
  - "서브도메인으로 즉시 배포" → "내 앱 전용 주소로 즉시 배포"
  - "Next.js + Supabase" → "최신 기술로 안정적으로"
- **시작 페이지** (`start/page.tsx`):
  - "Prisma DB 스키마" → "데이터 구조"
  - "NestJS 백엔드 API" → "서버 기능"
  - "풀스택 앱" → "앱"
  - "Next.js 프론트엔드" → "화면 디자인"
- **AI 프롬프트**:
  - "기술 용어 사용 금지! API → 서버 기능, DB 스키마 → 데이터 구조" 등 지시 추가
- **크레딧 페이지**: 기술 용어 없음 ✅

### 🟡 6. 수정 응답 메시지 — 이미 구현되어 있음
- `builder/page.tsx` line 462-469에 이미 구현:
  - "✅ **코드 수정 완료!**"
  - 수정된 파일 목록 + 사용 크레딧
  - 코드 헬스체크 권장
  - "추가 수정이 필요하면 말씀해주세요!"

---

## 커밋

| 커밋 | 내용 |
|------|------|
| `d1b2e80` | Phase 12 Day2 전체 — Turbopack 비활성화 + 마크다운 + 존칭 + 크레딧 + 기술용어 |

---

## TypeScript 검증

| 프로젝트 | 결과 |
|----------|------|
| API (`api/`) | **0 에러** ✅ |
| Web (`web/`) | **0 에러** ✅ |

---

## Day 2 변경 파일 (12개)

| 파일 | 변경 내용 |
|------|-----------|
| `api/src/project/deploy.service.ts` | turbo: false 3곳 삽입 |
| `api/src/ai/ai.service.ts` | 존칭 + 기술용어 금지 프롬프트 + 메인 페이지 fallback |
| `api/src/ai/meeting.service.ts` | 존칭 프롬프트 2곳 |
| `web/src/app/components/MarkdownRenderer.tsx` | **신규** — 마크다운 렌더링 공통 컴포넌트 |
| `web/src/app/components/CreditWarning.tsx` | **신규** — 크레딧 소모 사전 안내 모달 |
| `web/src/app/builder/page.tsx` | AI 응답 마크다운 렌더링 적용 |
| `web/src/app/meeting/page.tsx` | AI 응답 마크다운 렌더링 6곳 |
| `web/src/app/start/page.tsx` | 마크다운 렌더링 + 기술 용어 순화 |
| `web/src/app/components/ChatWidget.tsx` | 마크다운 렌더링 적용 |
| `web/src/app/credits/page.tsx` | 잔액 대시보드 + 환산 표시 |
| `web/src/app/page.tsx` | 기술 용어 순화 3곳 |
| `web/package.json` | react-markdown + remark-gfm 추가 |

---

## Day 3 예정 작업

### 🟠 비즈니스
- 크레딧 충전제 UI + 모두의 창업 패키지 (PHASE12_GUIDE 7순위)
- 이용약관 면책 + 환불 규정 (8순위)

### 🟠 완성도
- 템플릿별 미리보기 매칭 (9순위)
- 로고 메인 이동 (10순위)
- 메모리 시스템 — 고객 기억 유지 (11순위)

---

## 배포 대기

사장님 확인 후 `git push origin main` → GitHub Actions → 자동 배포
