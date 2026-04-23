# 파운더리 (Foundry) — 현재 상태 브리핑 (다른 AI 분석용)

> **작성 시점**: 2026-04-22  
> **목적**: 외부 LLM(GPT/Gemini/Grok 등)에게 현재 파운더리 상태를 정확히 전달하여 사업성 분석 / 전략 포지셔닝 판단 지원  
> **원칙**: 과장 금지. 실측 데이터만. 검증된 것 vs 미검증 명시.

---

## 1. 한 줄 요약

**파운더리는 한국어 비개발자가 한 줄~회의 내용으로 풀스택 웹앱(Next.js + Supabase)을 자동 생성·배포하는 서비스다. 2026-04-20 부터 내부 코드 생성기를 Anthropic Claude Agent SDK(외부 "포비"라는 캐릭터) 로 교체해서 운영 중이며, Beta 수준 (실사용자 9명, 생성앱 12개).**

---

## 2. 핵심 변화 — "기존 파운더리" vs "에이전트 포비 탑재 파운더리"

| 항목 | Before (3/18 ~ 4/19) | After (4/20 ~ 현재) |
|---|---|---|
| **코드 생성 엔진** | 자체 구현 "수제 루프" (NestJS 안에서 Anthropic Messages API 수동 호출 + 도구 루프 직접 작성) | **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk@0.2.114`) 공식 SDK 채택 |
| **세션 유지** | `agentMessages` 테이블에 메시지 배열 저장 + 직접 truncate / sanitize (163줄 로직) | SDK 내장 `resume: sessionId` + `/root/.claude/projects/*.jsonl` 파일 기반 자동 압축 |
| **도구 아키텍처** | Custom orchestrator (loop 직접 관리) | **MCP (Model Context Protocol)** 서버 구조. Foundry MCP 에 4개 도구 등록: `provision_supabase`, `deploy_to_subdomain`, `check_build`, `AskUser` |
| **캐시 히트율** | 측정 불가 / 40~60% 추정 | **실측 95~97.7%** (SDK 가 prompt caching 자동 최적화) |
| **세션당 비용 (Anthropic API)** | $1.95 / 앱 | **$1.14 ~ $2.23** / 앱 (평균 $1.7, 15~42% 절감) |
| **모델** | Claude Sonnet 4.6 (동일) | Claude Sonnet 4.6 (동일) |
| **프롬프트** | `agent-core.md` §1~§12 (14,925 chars) | `agent-core.md` §1~§17 (22,512 chars, 7,587자 증가) |
| **사용자 진입** | `/builder` 질문지 5~N단계 | `/start` 한 줄 입력 → 포비와 3~6턴 대화형 인터뷰 → 확인 스테이지 2분할 UI |
| **가격** | 앱 1개 생성 = 6,800 cr | 동일 (app_generate=6800cr) + **상담/수정 3단계 세분화** (0/500/1000/1500cr) + **첫 앱 무료** (free_trial, UI 미노출) |
| **브랜드 캐릭터** | 없음 | "**포비(Foby)**" — Agent 의 페르소나 이름 |

**중요**: 레거시 `/builder` 경로는 **아직 병존**. 홈에서 숨겨져 URL 직접 접근만 가능. 신규 사용자는 `/start` + `/builder/agent` 경로로 유도.

---

## 3. 기술 스택 (정확)

### 백엔드 (api)
```
- NestJS 11.1.17 (TypeScript)
- Prisma 6.19 (PostgreSQL)
- @anthropic-ai/claude-agent-sdk 0.2.114  ← 핵심
- @anthropic-ai/sdk 0.89 (직접 호출용 — 요약/인터뷰에 사용)
- Anthropic 모델: claude-sonnet-4-6 (전부 동일 모델)
- Passport JWT (인증)
- 추가: @google/generative-ai, openai (폴백 / 스마트분석 / 회의실)
```

### 프론트엔드 (web)
```
- Next.js 16.1.7 (App Router)
- React 19.2.3
- @tosspayments/tosspayments-sdk 2.6.0 (결제)
- react-markdown + remark-gfm
- Tailwind CSS
```

### 생성된 앱이 쓰는 스택 (포비가 만드는 것)
```
- Next.js 15.x (SSG, output: 'export')
- React 19
- Tailwind CSS
- Supabase (자동 프로비저닝)
- pretendard 폰트
- lucide-react 아이콘
```

### 인프라
```
- 서버 2대 분리:
  - 서버 A (223.130.162.133): 코드 + 운영 DB (launchpaddb) — PM2 기반
  - 서버 B (223.130.129.26): 고객 데이터 DB (serion_customer_db) — 백업 전용
  (단 파운더리는 현재 서버 A 한 대에서만 동작. 세리온용 분리 구조)
- 파운더리 서버: 175.45.200.162 (별도)
- 도메인: foundry.ai.kr + 와일드카드 *.foundry.ai.kr
- Nginx + Let's Encrypt SSL
- 생성된 앱: /var/www/apps/<subdomain>/ + PM2 프로세스 + Nginx 서브도메인
- Supabase Management API: 앱마다 자동으로 Supabase 프로젝트 1개씩 생성
- GitHub Actions: main push → 자동 배포 (deploy.sh)
```

### 개발/운영 통계
- GitHub 레포: `serion-mark/launchpad` (private)
- 전체 커밋: **382개** (2026-03-18 ~ 2026-04-22, 36일)
- 프롬프트 엔지니어링: `agent-core.md` + `intent-patterns.md` + `selection-triggers.md` + `vague-detection.md` 4개 파일, 총 22,512자

---

## 4. 현재 사용자 플로우 (에이전트 포비 모드)

### 진입점 A — 한 줄 프롬프트 (`/start`)
```
1. foundry.ai.kr/start 진입
2. 한 줄 입력 (예: "반려동물 돌봄 매칭 앱")
3. [시작] 클릭 → 선택 모달:
   - [🚀 바로 만들기] → Sonnet 요약만 → 확인 스테이지
   - [💬 포비와 3~6번 상의] → 인터뷰 모드
4. 인터뷰 모드 진입 시:
   - 포비가 동적 선택: 정체성/타겟/핵심기능/디자인/차별점/수익/레퍼런스 중 3~6개 질문
   - 번호 카드 UI (1/2/3/4 선택 or 기타 직접 입력)
   - 3턴 이내 충분하면 조기 종료
5. 확인 스테이지 (ReviewStage) — 2분할:
   - 좌: 정리된 스펙 카드 (앱이름/타겟/핵심기능/디자인/MVP범위)
   - 우: 포비 채팅 — "결제 추가해줘" 같이 자연어로 스펙 in-place 수정
6. [이대로 시작] → /builder/agent 이동
   - 크레딧 차감: app_generate = 6,800cr
   - Agent SDK 실행 (평균 7~16분)
7. Agent 가 Next.js 앱 생성 (20~30개 파일) + Supabase DB 자동 생성 + 배포
8. 완료 메시지: 실제 배포 URL + 테스트 계정 정보
```

### 진입점 B — AI 회의실 경유 (`/meeting`)
```
1. foundry.ai.kr/meeting 진입 (별도 기능, Claude Opus 기반 토론)
2. 사업 전략 / BM / 컨셉 토론 (10~30턴, 유료 300~1000cr)
3. 토론 끝에 [포비에게 맡기기] 버튼
4. 회의 종합보고서 → Sonnet 요약 → /builder/agent 의 확인 모달
5. 이후 진입점 A와 동일
```

### 진입점 C — 레거시 직접 (숨김, URL 만)
```
foundry.ai.kr/builder (홈 링크 제거됨)
```

---

## 5. Agent (포비) 실행 구조

### Agent SDK 호출 옵션
```typescript
query({
  prompt,
  options: {
    model: 'claude-sonnet-4-6',
    cwd: `/tmp/foundry-project-<projectId>`,   // projectId 고정 (세션 resume 용)
    pathToClaudeCodeExecutable: 'node_modules/.../claude',
    permissionMode: 'dontAsk',                  // root 환경
    allowedTools: [
      'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
      'mcp__foundry__provision_supabase',
      'mcp__foundry__deploy_to_subdomain',
      'mcp__foundry__check_build',
      'mcp__foundry__AskUser',
    ],
    mcpServers: { foundry: foundryMcp },
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append: agentCoreMd + intentPatternsMd + selectionTriggersMd + vagueDetectionMd + memoryContext,
      excludeDynamicSections: true,
    },
    resume: agentSessionId,                     // 이어서 작업 시
  },
})
```

### 세션 재개 (수정 모드) — 3단계 방어선
```
Layer 1: SDK resume: sessionId 직접
Layer 2: jsonl 실존 확인 → 없으면 Layer 3
Layer 3: getSessionMessages(sessionId) → 메시지 배열 → systemPrompt.append 로 요약 주입
```

### 과금 분류 (classifyIntent)
```
사용자 메시지 → 정규식 분류:
- consultation (0cr): "추천/제안/분석/조언/상담" 등 키워드 + 수정명령 없음
- modify_simple (500cr): "색/텍스트/로고" 등 단순 수정
- modify_normal (1000cr): "레이아웃/버튼/간격" 등 중간 수정
- modify_complex (1500cr): "추가/기능/결제/페이지/DB" 등 복잡 수정
- app_generate (6800cr): 신규 앱 (isEdit=false)
- free_trial (0cr): 신규 유저 첫 앱 (code 구현 완료, UI 미노출)

상담 모드에서는 allowedTools 에서 Write/Edit/Bash/provision/deploy 제외 (악용 방지)
```

---

## 6. 실측 데이터 (증거 기반)

### 실제 운영 중인 앱 (Nginx 에 서빙 중)
| 서브도메인 | 앱 이름 | 생성일 | 상태 |
|---|---|---|---|
| app-24f7 | 마케팅봇 (SNS 자동화) | 2026-04-22 | ✅ deployed |
| app-da32 | jembuddy | 2026-04-20 | ✅ deployed |
| app-b61e | chajajwo | 2026-04-20 | ✅ deployed |
| app-eb5a | jongmokwang | 2026-04-20 | ✅ deployed |
| app-dc3e | localpick (공동구매) | 2026-04-19 | ✅ deployed |
| app-faec | meditracker | 2026-04-19 | ✅ deployed |
| app-0769 | ideabox | 2026-04-19 | ✅ deployed |
| app-23c2 | bling | 2026-04-19 | ✅ deployed |

**실측 성공률 (Agent Mode 만)**: 12개 중 11개 active = **91.6%** (seniorpro 1건 배포 실패 — 이번 주 핫픽스로 근본원인 해결함)

### 비용 실측 (Anthropic API)
| 앱 | iter | 파일 수 | 시간 | 비용 | cache_hit |
|---|---|---|---|---|---|
| seniormatch | 66 | 22 | 13분 | $2.10 | 97.1% |
| seniorpro (실패) | 60 | 27 | 16분 | $1.96 | 95.0% |
| 마케팅봇 (성공) | 94 | 22 | 16분 | $2.23 | 97.7% |
| 기타 평균 (V3) | 40~60 | 15~25 | 7~14분 | $1.14~$1.66 | 96% |

**평균**: 10~16분 / $1.5~$2.3 / 20~30 파일 / 한 번에 배포까지 완료

### 사용자
- 가입자: **9명** (초기 베타, 주로 대표 본인+크로스 테스트)
- 총 크레딧: 잔액 33,371 / 누적 사용 185,629
- 대표 테스트 계정 누적: 약 22회 실사용 (성공 + 실패 포함)

### 서버 운영 지표
- API 메모리: 평균 130~150MB (Node.js/NestJS)
- Web 메모리: 평균 65MB (Next.js)
- API 재시작 시간: 80~100ms (NestJS 시작)
- CPU: 아이들 0~5% (세션 실행 중 10~30%)

---

## 7. 에이전트 포비의 행동 룰 (agent-core.md §1~§17)

**생성 가능 최대치 = 프롬프트 품질**. 현재 17개 섹션:

1. 답지 채우기 모델 (무지식 영역 자동 기본값)
2. 답지 필수 항목 (이름/기능/디자인/랜딩/CTA)
3. 카드 룰 (원샷 1번, 꼬리질문 금지)
4. 도구 사용 가이드
5. 협업 톤 (동업자 모드)
6. 고객 정정 대응
7. 반응형 웹 기본
8. 인프라 스택 고정 (Next.js + Supabase + Tailwind)
9. 금지 행동
10. Claude 와의 약속 (거짓말 금지)
11. 답지 부가 옵션 자동 실행
12. 완료 보고 + 번호형 제안 포맷
13. **상담 모드 — 코드 0줄 / "완성!" 금지** (2026-04-22)
14. **레퍼런스 반영 룰 — 이미지 Read 필수** (2026-04-22)
15. **완료 보고 "반영한 레퍼런스" 블록 강제** (2026-04-22)
16. **신규 앱 = deploy_to_subdomain 필수 호출** (2026-04-22) 🚨
17. **Next.js 동적 route = force-dynamic 필수** (2026-04-22) 🚨

→ §13~§17은 실전 사용 중 발견한 버그에 대응해서 최근 1주일 내 추가됨.

---

## 8. 경쟁사 포지셔닝 (솔직한 비교)

### 비슷한 포지션
| 서비스 | 차별점 |
|---|---|
| **Lovable.dev** | 영어권 / Agent 기반 웹앱 생성. 파운더리보다 훨씬 성숙. 월 20~100만 사용자 추정 |
| **Bolt.new** | Stackblitz 기반, 브라우저 내 실행. 배포는 별도 |
| **v0 (Vercel)** | 컴포넌트 단위 생성, Vercel 배포 통합 |
| **Cursor / Windsurf** | 개발자용 IDE. 비개발자 타겟 아님 |
| **Base44** | 노코드 스타일 (블록 기반) |

### 파운더리의 포지션 (현실적 판단)
- **한국어 네이티브** — 경쟁사 대부분 영어 (번역 허들 제거)
- **한국 인프라** — Supabase + 한국 도메인 + 토스페이먼츠 결제 (이미 연동)
- **비개발자 대상** — 카카오톡 답지 카드 UX, 번호 선택 중심 (타이핑 최소화)
- **AI 회의실 연계** — 사업 전략 토론 → 앱 제작 연결 (경쟁사에 없음)
- **한국 정부 지원사업 기획** — 사업계획서 / IR 도구 통합 (미검증, 계획 단계)

### 약점 (솔직히)
- **사용자 0.000~수준** — 가입 9명, 대부분 내부 테스트
- **검증된 프로덕트 없음** — 생성된 12개 앱 중 실제 비즈니스 런칭한 것 0개
- **스케일 테스트 X** — 동시 사용자 / 트래픽 한계 모름
- **기본 스택 제한** — Next.js + Supabase 강제 (다른 스택 선택 불가)
- **모바일 앱 생성 불가** — 웹 전용
- **한국어 외 대응 X** — 영어 UI 없음
- **SEO / 마케팅 기반 0**

---

## 9. 과금 / 비즈니스 모델

### 크레딧 시스템
- **선불제**: 크레딧 충전 후 사용
- **앱 생성**: 6,800cr (실비용 Anthropic API $1.7 + 인프라)
- **수정**: 500 / 1,000 / 1,500cr
- **상담**: 0cr (트래픽 유인)
- **첫 앱 무료**: 0cr (code 구현됨, UI 노출 전)
- **AI 회의실**: 300 / 1,000cr (별도)

### 예상 수익 구조 (현재 가격 유지 시)
- 크레딧 1개 ≈ 1원 수준 (추정, 실가격은 대표 확인 필요)
- 사용자가 앱 1개 만들 때: 약 6,800원 (공급원가 $1.7 ≈ 2,500원, 마진 약 60%)
- 수정 1회: 500~1,500원
- **현 실측 사용자는 9명이라 매출 의미 있는 수준 아님**

### 추가 수익 포인트 (미구현)
- 생성된 앱 호스팅 월 구독 (현재는 파운더리 서버 무료 호스팅)
- 사용자 도메인 연결
- 프리미엄 지원
- 사업자 대상 B2B 패키지

---

## 10. 개발 조직 / 리소스

- **팀**: 대표 김형석 1인 + AI 협업 (Claude Code)
- **개발 방식**: 자비스 세션 기반 (AI에게 명령 → 실행). 세션 간 인수인계 문서 체계 구축
- **운영 비용**:
  - 서버: 월 약 10만원 (NCP 2대)
  - Anthropic API: 4/20~22 3일간 ~$20 소모 (하루 $6~7, 월 환산 $180~210)
  - 도메인 + 기타: 월 3~5만원
  - **월 총 비용 추정: 35~50만원**
- **특허**: 출원번호 10-2026-0051041 (2026.03.20)

---

## 11. 로드맵 (팩트)

### 완료 (4/22 기준)
- [x] Claude Agent SDK 전환 (Day 0~6 + 핫픽스)
- [x] 한 줄 입력 + 대화형 인터뷰 (Phase L~Q)
- [x] AI 회의실 연결 (Phase 4)
- [x] 과금 세분화 (상담/수정/신규)
- [x] 이미지 레퍼런스 업로드 (Phase H/I/J/K)
- [x] 실전 버그 핫픽스 5건 (Phase W/X/Y/AB)

### 대기 중 (다음 세션)
- [ ] 무료체험 UI 노출 (Phase V) — 코드는 있음
- [ ] Supabase DDL 재시도 로직 (Phase S)
- [ ] 빌드 에러 AI 자동수정 강화 (F6 multi-file)
- [ ] 사용자 도메인 연결
- [ ] 결제 자동화 / 구독제

### 계획만 (미착수)
- 모바일 앱 생성 (React Native)
- 영어 UI
- 템플릿 마켓플레이스
- 사용자 간 앱 공유

---

## 12. 알려진 한계 / 리스크

### 기술 리스크
1. **Supabase 의존** — Supabase API 장애 시 모든 신규 앱 생성 불가
2. **Anthropic API 장애 / 가격 인상** — 직접 영향
3. **Next.js SSG 전용 아키텍처** — SSR 전환하려면 Deploy 파이프라인 재설계
4. **단일 서버** — 스케일 아웃 준비 안 됨. 동시 세션 5개 넘으면 큐 필요
5. **agent-core.md 17섹션** — 프롬프트 복잡도 증가 추세. 토큰 비용 / Agent 혼동 가능성

### 비즈니스 리스크
1. **실사용자 부재** — 가설 검증 안 됨
2. **한국 시장 크기** — 비개발자가 웹앱 만들 니즈 실제 규모 미지수
3. **경쟁 가속** — Lovable 등 영어권 서비스가 한국어 대응 시 차별성 소멸
4. **AI 비용 구조** — 크레딧 가격 인상 시 고객 이탈 위험
5. **정부 지원사업 탈락 이력** — SaaS 바우처 탈락, 창업중심대학 탈락, 신한퓨처스랩 탈락 (4/14 기준)

### 진행 중인 지원사업
- 신한 스퀘어브릿지 (진행 중)
- 경기 레벨업 시드 (4/17 제출, 결과 대기)
- 경기스타트업 밋업위크 (4/27 마감)
- K-스타트업 혁신창업리그 (파운더리 출전 예정)

---

## 13. 외부 AI 가 분석할 때 염두에 두면 좋을 질문

1. **제품-시장 적합성 (PMF)**: 한국 비개발자가 Next.js+Supabase 기반 웹앱을 AI로 만들고 싶어할까? 어떤 세그먼트가?
2. **가격 포지셔닝**: 6,800원/앱 + 월 호스팅 모델이 적정한가? 구독제 vs 선불?
3. **경쟁 방어력**: Lovable 한국 진출 시 / 네이버/카카오의 유사 서비스 출시 시 어떻게?
4. **GTM**: 가입 9명에서 어떻게 100명/1,000명 달성할지? 어떤 채널?
5. **피버팅 가능성**: 웹앱 생성 말고 다른 수익 경로가 있을지? (템플릿 판매 / 컨설팅 / B2B 에이전시)
6. **지원사업 전략**: 어떤 지원사업에 맞는 포지션을 잡아야 할까?

---

## 14. 원본 자료 위치 (추가 분석 필요 시)

- GitHub: `https://github.com/serion-mark/launchpad` (private, 초대 필요)
- 프롬프트: `/api/src/agent-builder/prompts/agent-core.md` (22,512자)
- 서버 엔드포인트:
  - `POST /api/ai/interview` (Sonnet 동적 질문)
  - `POST /api/ai/refine-spec` (스펙 채팅 수정)
  - `POST /api/ai/summarize-to-agent-spec` (Sonnet 3층 요약)
  - `POST /api/ai/agent-build-sdk` (Agent SDK 실행, SSE 스트림)
  - `POST /api/projects/:id/deploy` (수동 재배포)
- 세션 핸드오프 문서: `/launchpad/memory/phases/*.md` (약 30개)
- 대표자: 김형석 (mark@serion.ai.kr)

---

## 끝 — 솔직한 한 줄 평

> 파운더리는 **기술적으로는 제대로 동작하는 Claude Agent SDK 래퍼 + 한국어 UX** 이지만, **비즈니스적으로는 PMF 미검증 초기 베타**. 앞으로 3~6개월은 "사용자 100명" 까지 끌어올리는 유통/마케팅 전략이 핵심이며, 이 시점에서 외부 AI의 가장 큰 기여는 **"어떤 세그먼트에 어떤 메시지로 붙어야 가입 100명을 채울까"** 에 대한 구체적 액션 제안임.
