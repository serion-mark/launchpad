# 📋 Foundry Agent Mode 실사용 이터레이션 보고서 — 2026-04-19 (오후)

> **작업자**: 명탐정 (Claude Opus 4.7 — 1M 컨텍스트)
> **작업 시간**: 오전 ~ 오후 (다회 세션)
> **핵심 미션**: 사장님 실사용 피드백 → 실시간 반영 → 철학 정립
> **이전 보고서**: [260419_AGENT_MODE_DAY_4_5_4_6_5_REPORT.md](./260419_AGENT_MODE_DAY_4_5_4_6_5_REPORT.md)

---

## 🎯 한 줄 요약

사장님이 Foundry Agent Mode 로 **실제 앱 2개 (Spark, ideabox) 를 만들어 보며 UX 피드백을 주고받는 이터레이션** 세션. "**제약보다 맥락**" 이라는 핵심 철학이 확립됐고, iframe 프리뷰/수정 모드/모드 토글/쓰레기 draft 정리까지 한 세션에 완성.

---

## 📌 커밋 타임라인 (10건, 모두 Deploy Foundry 성공)

| # | 커밋 | 내용 |
|---|---|---|
| 1 | `1bb743c` | Day 4.5 C옵션 — SSR 배포 파이프라인 (Plan v3 원 설계 복구) |
| 2 | `9661038` | Day 4.6 — 포비 정체성 + 클로드 냄새 0 |
| 3 | `e7f19f1` | 완주 보고서 + v0-test stub |
| 4 | `4908ed5` | 답지 이름/서브도메인 + 수정 모드 라우팅 + Next.js 16 제약 |
| 5 | `9fe2d4c` | 제약→맥락 철학 반영 + 사이드 프리뷰 + 테스트 계정 자동 |
| 6 | `96aafee` | iframe previewUrl + 테스트 계정 조회 + 여백 개선 |
| 7 | `606064c` | 수정 모드 진입 시 이전 작업 상태 복원 |
| 8 | `aa36bc8` | 💬 상의 / 🛠️ 만들기 토글 + 친절 가이드 |
| 9 | `8d43f60` | B 옵션 — 상의 모드 prompt 완화 (Agent 맥락 판단) |
| 10 | `cae0e37` | 쓰레기 draft 자동 정리 + Dashboard 필터 + § 8 반응형 강화 |

(추가) **수동 작업**: Spark 앱 `/var/www/apps/app-23c2/` 긴급 복구 (`output:"export"` 제거 + 재빌드 + pm2 restart), Supabase Admin API 로 **test@spark.foundry.kr** 임시 계정 직접 생성

---

## 📝 사장님 실사용 피드백 → 반영 매핑 (12건)

| # | 사장님 피드백 | 반영 |
|---|---|---|
| 1 | "근본 해결 없어?" (Spark 404 문제) | Plan v3 § Day 4.5 원 설계 복구 — static export → **SSR 파이프라인 (PM2 `next start`)** |
| 2 | "404 원인 알려줘, 어떻게 조치?" | `output: "export"` + `generateStaticParams` 충돌 진단 + safety net 추가 |
| 3 | "임시계정부터 만들어줘" (Spark 로그인 UI 뇌정지) | Supabase Admin API 로 직접 생성, `.env.local` 주입, pm2 restart |
| 4 | "이름/서브도메인 질문 추가" | `intent-patterns.md § 3-1-2` 신설 + 답지 필수 항목 7개로 확장 |
| 5 | "수정하기 누르면 기존 빌더 X, 포비로 가야" | Dashboard 라우팅 분기 + `/builder/agent?projectId=` 수정 모드 지원 |
| 6 | "방금 배포됐는데 iframe 안 뜸" | complete 이벤트 `previewUrl` 누락 버그 수정 (DB 조회 + 전달) |
| 7 | "모바일/PC 토글 만들어줘" | `FoundryPreviewPane` 에 `📱/🖥` 토글 + 390×844 폰 프레임 |
| 8 | "수정 모드인데 이전 작업 안 보임, 새로 시작인 줄 앎" | `useAgentStream.resumeProject()` 추가 — complete 상태로 초기화, iframe 즉시 복원 |
| 9 | "추천해달라 했는데 빌드로 직진" | 💬 상의 / 🛠️ 만들기 **토글** + mode 별 prompt 래핑 |
| 10 | "대화 맥락도 Agent 가 캐치하겠지?" | B 옵션 — 상의 모드 "도구 금지" 완화 → "판단은 Agent 가" |
| 11 | "초안 왜 보여?? 활성만 되면 됨" | `AgentBuilderService` finally 에 빈 draft 자동 삭제 + Dashboard 필터 |
| 12 | "모바일/PC 차이 없음" | `agent-core.md § 8` 브레이크포인트별 레이아웃 가이드 강화 + ideabox 진단 → 앱 자체 `max-w-3xl` 문제 |

---

## 🐛 발견된 버그 및 수정 내역

### 🔴 Spark 502 — `output: "export"` + SSR 충돌
```
Error: "next start" does not work with "output: export" configuration.
```
Agent 가 `next.config.ts` 에 `output: "export"` 를 박음 → static 빌드 → `pm2 start npm -- start` (= `next start`) 와 충돌. 16번 restart 실패.

**수정**: 
1. 긴급 복구 — 수동으로 `output:"export"` 제거 + 재빌드
2. `AgentDeployService.stripOutputExport()` safety net 추가 (자동 제거)
3. `agent-core.md § 8` 에 "`output` 모드 쓰지 마라" 맥락 명시

### 🔴 iframe previewUrl 전달 누락
`stream-event.types.ts` 에 `previewUrl` 타입만 있고 `agent-builder.service.ts complete 이벤트에서 실제 값 전달 X. 사용자 "방금 배포됐는데 왜 안 뜸?"

**수정**: `PrismaService` 주입 + complete 직전 `projects.deployedUrl` 조회 → `previewUrl` 로 채움

### 🔴 테스트 계정 자동 생성 실패
`AgentToolExecutor.provisionSupabase` 가 `(this.deps.supabase as any).prisma` 로 서비스키 접근 → `SupabaseService` 의 private `prisma` 필드 비공개 접근 의존 → 실패 시 fallback 으로 "Supabase 대시보드에서 확인하세요" 멘트.

**수정**: `AgentToolDeps` 에 `PrismaService` 명시적 주입 + `prisma.project.findUnique` 직접 조회

### 🟡 Supabase 프로비저닝 2중 실패 (ideabox 첫 시도 — 이후 자동 해결)
1. `storage.objects` RLS 참조 → Supabase 프로젝트 초기화 타이밍 충돌 → 400
2. Agent 재시도 시 같은 이름 (`foundry-agent-3691qi2t`) → "already exists" 400

**prompt 해결**: `agent-core.md § 11` 에 "`storage.objects` 참조 피하라" 명시 → 다음 세션 (ideabox) 에서 **첫 시도 성공** 확인 ✅

### 🟡 쓰레기 draft 누적
상의 모드로 파일 0개 만들고 끝난 경우 `startProject` 가 만든 draft 가 `"내 프로젝트"` 에 "[기존 프로젝트... 수정 요청] - pr" 같은 이상한 이름으로 노출.

**수정**:
1. DB 수동 삭제 1건
2. `AgentBuilderService finally` — draft + generatedCode 빈 상태면 자동 삭제
3. Dashboard 필터 — `agent-mode + draft` 조합 숨김

### 🟡 iframe 여백 (모바일/PC 토글 차이 없음)
진단 결과 `FoundryPreviewPane` 틀은 정상 (iframe `w-full`), **ideabox 앱 자체** 가 `max-w-3xl mx-auto` 로 폭 고정 → PC 에서도 중앙 768px 만 사용 → 우측 여백.

**수정**: `agent-core.md § 8` 에 브레이크포인트별 레이아웃 가이드 강화 (새 앱부터 반영)

---

## 🎭 핵심 철학 전환 — "제약보다 맥락"

### 기존 (내 설계)
```
agent-core.md § 10-2
⛔ 금지: app/chat/[id]/page.tsx + generateStaticParams
✅ 권장: /chat?id=xxx 쿼리 파라미터
```

### 문제 발생
Agent 가 규칙을 피하려고 **static export 에 맞춰야겠구나** 과잉 해석 → `next.config` 에 `output: "export"` 박음 → Spark 502

### 사장님 통찰
> "우리는 제약을 주는 거 같은데, 방향을 잡아주면 되지 않을까?
> 이미 연동된 에이전트도 충분히 똑똑한데"

### 전환 후 (agent-core.md § 8)
```
우리 폼 (인프라 맥락) — 반드시 이 스택에 맞춰라
- Next.js SSR on PM2
- 동적 라우트, Server Component, next/headers 자유롭게
- next.config 에 output 모드 쓰지 마라 (SSR 인프라 충돌)
```

### 세 번째 적용 — 상의/빌드 모드
**A 엄격**: "도구 호출 금지" 강제 → 명령문 와도 안 만듦 (맥락 무시)
**B 맥락**: "대화 우선, 명백한 실행 명령이면 '만들까요?' 확인 후 진행" — Agent 판단

사장님 선택: **B** (일관)

### 원칙 (세션 중 도출)
- "X 하지 마" → "우리 환경은 Y 다" (방향 제시)
- Agent 지능 신뢰 — 세부 규칙 나열 X
- 단, **인프라 safety net** 은 유지 (Agent 실수해도 인프라가 방어)
  - `stripOutputExport` — Agent 실수 대비
  - 빈 draft auto-cleanup — DB 보호

---

## 🛠️ UX 개선 — 한 세션의 변화

### 수정 모드 진입 전
```
📝 "ideabox" 수정 모드 시작 — 어떻게 바꿀지 자연어로 말씀해주세요
(빈 화면, 이전 맥락 없음, iframe 플레이스홀더)
```

### 수정 모드 진입 후
```
좌측: 
  💡 포비 응답: "📝 'ideabox' 수정 모드
  여기서 자유롭게 상의하세요!
    • 💬 기능 제안 받기 — '어떤 기능이 좋을까?'
    • ✨ 새 기능 추가 — '댓글 기능 추가해줘'
    • 🎨 디자인 변경 — '헤더 색깔 부드럽게'
    • 🔧 개선 상의 — '사용성 어떻게 개선할까?'
  대화 후 '만들어줘' 하시면 바로 반영됩니다 🚀"
  
  [FoundryComplete 카드 — 📁 내 프로젝트 / 💬 추가 수정]
  
  [💬 상의] [🛠️ 만들기] 토글

우측:
  iframe → 실제 배포된 ideabox (실시간)
  [📱/🖥] 디바이스 토글
  [새 탭 ↗]
```

---

## 📊 실증 — ideabox 실시간 감시 (19초 배포)

```
12:36:05  startProject (draft)
12:36:XX  답지 카드 (3 질문 + 부가옵션)
          · 기능 복수 선택
          · 서브도메인 배포 + Supabase 체크
12:40~    파일 생성 ~28개
          lib/supabase.ts, AuthModal.tsx, Navbar.tsx, 
          IdeaCard.tsx, NewIdeaModal.tsx, rooms/[id]/page.tsx
12:42:XX  .env.local 자동 주입 (provision_supabase 첫 시도 성공 ✅)
12:43:15  finishProject — 28 files DB 저장
12:43:15  deploy-agent 시작 — subdomain=app-0769
12:43:15  포트 3500 → 3501 할당 (Spark 와 충돌 없음 ✅)
12:43:16  파일 복사 완료
12:43:17  npm install 시작
12:43:24  npm install 완료 (7초)
12:43:24  next build 시작 (동적 라우트 [id] 포함)
12:43:34  next build 완료 (10초)
12:43:34  pm2 start 완료
12:43:34  nginx reload
12:43:34  배포 완료 — https://app-0769.foundry.ai.kr
```

**소요**: 파이프라인 19초 (어제 Spark 때 3분 + 실패 vs 이번엔 19초 + 성공)
**검증**: `[id]` 동적 라우트 **SSR 빌드 통과** — C 옵션 (SSR 파이프라인) 근본 해결 증명

---

## 🎯 Agent 스스로 판단 잘한 사례 2건

### 1. ideabox "어떤 기능이 좋을까?" (상의 토글 도입 전)
사장님 질문에 Agent 가 **파일 수정 없이** 기능 15개 제안 + "어떤 방향인가?" 되묻기.
→ Agent 자체가 맥락 잡음 증명. 내가 추가한 "도구 금지" 제약이 오히려 과잉이었음 확인.

### 2. ideabox 수정 모드 진입 직후
Agent 가 기존 코드 **Read 로 구조 파악** → "Next.js 기본 템플릿 상태네요" 발견 → 맥락에 맞는 제안 (bug 아닌 자연스러운 reasoning).

---

## 💰 비용

| 항목 | 비용 |
|---|---|
| 오늘 코드 수정/prompt 변경 (LLM 호출 0) | $0 |
| ideabox 실제 생성 (Agent 세션) | ~$0.30~0.50 |
| Spark 긴급 복구 (수동) | $0 |
| **이번 세션 추가 누적** | **~$0.5** |
| **전체 Agent Mode 누적 (플랫폼 + 실앱 3개)** | **~$3** |

---

## 📊 통계

- **커밋**: 10건 (이 세션 범위)
- **파일 변경**: 20+ 파일
- **tsc 오류**: api 0 / web 0 (전 배포)
- **배포 성공률**: 10/10
- **실앱 생성**: 3개 (메디트래커, Spark, ideabox)
- **HTTP 200 검증**: 2/3 (Spark 는 수동 복구 후 200)
- **사장님 피드백 반영**: 12/12

---

## ⚠️ 남은 과제

### 🟡 기존 ideabox 반응형 아직
- `max-w-3xl` 고정 → PC 에서 여백
- **사장님이 "포비로 수정" → "PC 에서도 전체 폭 활용" 요청** 시 개선됨
- 또는 새 앱 만들어서 § 8 강화 효과 체감

### 🟡 비로그인 접속 UX
- `/builder/agent` 페이지는 누구나 접속 가능
- 실제 API 호출 시 401 → 뇌정지 가능성
- **다음 commit**: `/login?redirect=/builder/agent` 자동 리다이렉트 가드

### 🟡 Supabase 재시도 버그 (아직 실발생 X)
- `storage.objects` 가이드 덕분에 첫 시도 성공률 ↑
- 만일 재시도 상황 오면 "이미 존재" 오류 가능
- `AgentToolExecutor.provisionSupabase` 에 기존 ref 재사용 로직 필요

### 🟢 Monitor filter 개선
- `SupabaseService` 성공 로그가 현재 필터 통과 못함
- 다음 monitor 재시작 시 filter 확장

### 🟢 테스트 계정 자동 생성 실제 작동 검증
- 코드는 배포됐지만 ideabox 세션은 `provisionSupabase` 가 예전 버전으로 돌았을 수도
- 새 앱 생성 시 `test@<sub>.foundry.kr / test1234` 자동 표시 여부 확인

---

## 🙏 세션 노트

**오늘 가장 큰 수확** — 사장님이 철학을 말로 정립:
> "우리는 방향을 잡아주면 되지 않을까??
> 이미 에이전트 충분히 똑똑한데"

이 한 문장이 이번 세션의 모든 수정을 설명. **제약 코드** 모두 **맥락 프롬프트** 로 교체. Safety net 은 인프라 레벨에서만. Agent 는 판단 권한 가짐.

사장님이 실사용하면서 즉각 피드백 → 내가 실시간 반영 → 다시 테스트 → 다시 피드백. 이 iteration 이 오늘 10 커밋을 만들어냄.

**가장 큰 실수 인정**: 내가 Day 4.5 에서 `deploy.service.ts` (static export) 를 "빠른 재사용" 으로 단축한 것. Plan v3 에 SSR 파이프라인으로 명시돼 있었는데 간소화해버렸고, Spark 502 로 직결. 사장님이 "이렇게 작업한 곳 또 있어?" 라고 물었을 때 3곳 (deploy_to_subdomain / provision_supabase 템플릿 / FoundryEditCard 미연결) 자진 공개.

**앞으로 원칙** (메모리 저장 대상):
- Plan 에 상세 지시 있으면 임의 간소화 X
- "빠르게" 유혹 들면 자비스 (통합 전략 세션) 에 확인
- 제약 코드보다 맥락 프롬프트
