# 260418 Agent Mode 플랜 — Foundry Agent Mode (답지 채우기 모델)

> **새 세션에서 이 파일 그대로 읽고 실행. 자비스(전략세션)가 작성, 명탐정(작업세션)이 실행.**
>
> ⚠️ **첫 줄부터 끝까지 다 읽기 전에 코드 손대지 X. 특히 § 1쪽 요약 + § 마스터 핵심.**
>
> 🔄 **v2 (4/18 저녁) — 명탐정 검증 보강 6항 반영**
> - V-0 SDK 실존 검증 추가 (Day 1 이전)
> - Phase 0.5 자산 활용 매핑표 (Day 2)
> - Phase 1 원로드맵 통합 매트릭스
> - 비용 예산표 ($12~17)
> - 1쪽 요약 (이 섹션 바로 아래)
> - /builder vs /builder/agent 진입점 전략

---

## 📋 1쪽 요약 (명탐정/사장님 더블체크용)

### 모델 한 문장
> *"우리가 만들 프로젝트를 위한 답지를 함께 채워나가는 방식"*

### 흐름 5줄
1. 사용자 한 마디 (예: "예약 앱 만들어줘")
2. AI가 답지의 채울 수 있는 칸 자동 채움
3. 빈 칸을 종합 카드 1개로 표시 (꼬리 질문 X)
4. 사용자: 번호("1, 2, 1") / 클릭 / 자연어 / "그대로 시작" 중 택
5. 답지 완성 → 작업 시작 → 끝까지 추가 질문 X

### 답지 필수 5항목 (모든 앱 공통)
1. 앱 종류 / 업종 / 한 마디 설명
2. ⭐ **벤치마킹 사이트** (있는지 반드시 물음)
3. ⭐ **디자인 참조** (이미지/URL/키워드)
4. 핵심 페이지/기능 (체크박스)
5. 자유 입력 (특별 요구)

+ **동적 추가** (앱 종류별, AI가 즉석 생성)

### 카드 UX 룰 (반응형 + 모바일)
- 옵션마다 [번호] 부여 (모바일에서 키보드 입력 친화)
- 입력 3중: 번호 / 클릭 / 자연어 다 받음
- "시작/ㄱㄱ/응/그대로" = 기본값으로 즉시 시작
- 모바일 1열 세로 (h-12+ 터치) / PC 2~3열 그리드
- 폰트 16px+ (iOS 자동 줌 방지)

### 격리 (위반 시 즉시 중단)
- 기존 `/builder` 라우트 X
- 기존 `ai.service.ts` X
- 모든 신규 코드 = `agent-builder/` + `prompts/agent/` 만
- 환경변수 `AGENT_MODE_ENABLED=false` 기본
- Day별 1 commit (어제 9커밋 사고 X)

### 5+1일 구성 (명탐정 검증 후 V-0 추가)
| Day | 작업 | 비용 |
|---|---|---|
| **Day 0 (V-0)** ⭐신규 | SDK 실존 검증 (npm view + 테스트 호출) | $0.10 |
| Day 1 | Agent SDK 실행 엔진 (도구 5개 + 샌드박스) | $0.50 |
| Day 2 | 답지 시스템 + .md 작성 + Phase 0.5 자산 연계 | $1 |
| Day 3 | 종합 카드 시스템 (번호 입력 파서) | $0.30 |
| Day 4 | 프론트엔드 (반응형 + 모바일) | $0 |
| Day 5 | E2E 5개 시나리오 + 배포 | $10~15 |
| **총** | | **$12~17** |

### 8단 사장님 통찰 (전부 baked in)
1. 단계 분리 X → 이중 안전망
2. 피벗 X → 업그레이드
3. 카테고리 X → 자유 대화
4. 자비스-사장님 협업 패턴
5. 원샷 종합 카드 (꼬리 질문 X)
6. 답지 채우기 모델 ⭐ 통합
7. 답지에 참조(벤치마킹/디자인) 필수
8. 번호 입력 + 반응형 + 모바일

---

---

## 0. 새 세션 시작 시 읽을 파일 (순서)

```
1. /Users/mark/세리온 ai전화예약+POS통합관리/CLAUDE.md          (절대 규칙)
2. /Users/mark/세리온 ai전화예약+POS통합관리/memory/FOUNDRY_GUIDE.md  (Foundry 서버/배포)
3. /Users/mark/세리온 ai전화예약+POS통합관리/memory/클로드와의_약속.md (정신)
4. /Users/mark/.claude/projects/-Users-mark-----ai-----POS----/memory/feedback_jarvis_tone.md (자비스 톤)
5. /Users/mark/.claude/projects/-Users-mark-----ai-----POS----/memory/user_manual.md (사장님 사용법)
6. /Users/mark/세리온 ai전화예약+POS통합관리/세리온 전략/AI-Native_창업기/14_AI에게_일만_시키지_마라.md
7. /Users/mark/세리온 ai전화예약+POS통합관리/세리온 전략/AI-Native_창업기/20_설명서의_품질이_속도를_결정한다.md
8. /Users/mark/세리온 ai전화예약+POS통합관리/세리온 전략/AI-Native_창업기/25_명탐정의_탄생.md
9. **본 파일 § 마스터 핵심 (필수)**
10. /Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/api/src/ai/ai.service.ts (참조만, 손대지 X)
11. /Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/api/src/ai/prompts/ (Phase 0.5 .md 자산 — 재활용)
```

---

## ⭐ 마스터 핵심 — 모든 결정 통합 (이 섹션이 진짜)

### A. 본질 — 답지 채우기 모델

> **"우리가 만들 프로젝트를 위한 답지를 함께 채워나가는 방식"** — 사장님 정의

```
사용자 한 마디
   ↓
AI: 대화 맥락 추출 → 답지의 채울 수 있는 칸 자동 채움
   ↓
AI: 빈 칸을 종합 카드 1개로 표시 (꼬리 질문 X)
   ↓
사용자: 한 번에 선택 (번호/클릭/자연어 다 OK)
   ↓
답지 완성 → 작업 시작 → 완료까지 추가 질문 X
```

### B. 답지 필수 5항목 (모든 앱 공통)

```
1. 앱 종류 / 업종 / 한 마디 설명
2. ⭐ 벤치마킹 사이트 있나요? (URL/이름 또는 "없음")
3. ⭐ 디자인 참조 있나요? (이미지/URL/키워드 또는 "없음")
4. 핵심 페이지/기능 (체크박스)
5. 자유 입력 (특별 요구사항)

+ 동적 추가 (앱 종류별 — AI가 즉석 생성)
  · 예약앱: 운영시간, 결제 방식
  · 쇼핑몰: 배송, 회원등급
  · etc.
```

### C. 카드 UX 룰 (반응형 + 모바일 친화)

```
[반드시]
✓ 모든 옵션에 번호 부여 [1] [2] [3]
✓ 입력 방법 3중: 번호("1, 2, 1") + 클릭 + 자연어
✓ "시작/ㄱㄱ/응/그대로" 키워드 = 기본값으로 즉시 시작
✓ 자유 입력 항상 포함
✓ 추정값은 "✓ 추정" 표시 (사용자 안심)

[반응형 (필수)]
✓ Tailwind sm:/md:/lg: 활용
✓ 모바일: 옵션 1열 세로, 큰 터치 영역 (h-12 이상)
✓ PC: 옵션 2~3열 가로
✓ 한 화면에 다 보이게 (모바일 스크롤 최소)

[금지]
❌ 한 번에 1개씩 묻기 (인터뷰 봇)
❌ 카드 후 추가 질문 (작업 중에도 X)
❌ 사용자가 명확히 말한 거 다시 확인
❌ 카테고리 강제 (예: enum에 끼워맞추기)
❌ 마우스 전용 UI (번호 입력 가능해야)
```

### D. 생성되는 앱의 기본 (반응형 웹)

> **"우리는 기본적으로 반응형웹. 모바일 같이 되게!"** — 사장님

```
모든 생성 앱:
✓ Tailwind v4 mobile-first
✓ sm: (640px) / md: (768px) / lg: (1024px) 다 적용
✓ 터치 영역 최소 44px
✓ 모바일 우선 디자인 → PC 확장
✓ viewport meta 필수
✓ 폰트 크기 16px 이상 (모바일 가독성)
```

이미 Phase 0.5 v2 patterns/tailwind.md에 반응형 패턴 있음 — 그대로 활용.

### E. Agent의 사고 방식 (사장님-자비스 협업 재현)

```
1. 일만 시키지 말고 대화하라 (Ch 14)
   → 작업 완료 후 "추가 인사이트 1개 제안"

2. 좋은 대화상대 만나면 더 잘한다 (Ch 15)
   → 사용자 정정하면 즉시 수용 ("아 그게 맞네요!")

3. 설명서 품질 = 속도 (Ch 20)
   → .md = 사고 방식 가르치는 문서 (lookup table X)

4. 1AI 자기최면, 2AI 검증 (Ch 25)
   → 작업 마치면 자체 빌드 검증 + 결과물 자체 점검

5. 동업자 톤 (feedback_jarvis_tone.md)
   → 보고서 X, 카톡 같이, ㅋㅋㅋ OK, 의견 솔직히
   → "네 알겠습니다" 일변도 X

6. 클로드와의 약속 정신
   → "안 됩니다 X" → "이렇게 하면 됩니다"
   → 방법 모르면 만들어서라도

7. 재사용 원칙 (feedback_reuse_existing_logic.md)
   → 비슷한 파일 있으면 Glob+Read 후 패턴 그대로
   → 새로 짜면 가격 계산 사고 같은 거 재발
```

### F. 격리 원칙 (위반 시 즉시 중단)

```
✓ 기존 /builder 라우트 손대지 않기
✓ 기존 ai.service.ts 손대지 않기
✓ 모든 신규 코드 = agent-builder/ 디렉토리만
✓ 모든 신규 .md = prompts/agent/ 디렉토리만
✓ 환경변수 AGENT_MODE_ENABLED=false 기본
✓ Day별 1 commit (어제 9커밋 한 번에 사고 X)
```

### G. "절대" 단어 금지 (CLAUDE.md)

→ 본 플랜 + Agent system prompt 모두 "반드시/금지/하지 마" 등으로 표현.

---

## ⭐ 마스터 — Phase 1 원로드맵 통합 매트릭스 (명탐정 보강)

원래 Phase 1 = 1A(SDK) + 1B(Plan Mode + #27-A) + 1C(Vision) + 1D(메모리) + 1E(카드 UI) + 1F(글로벌 토글)

| 원 항목 | Agent Mode 5일 흡수? | 처리 |
|---|---|---|
| **1A** SDK | ✅ Day 0~1 | V-0 검증 + Day 1 Agent loop |
| **1B** Plan Mode + #27-A | ✅ Day 2~3 | 답지 모델 = Plan Mode + #27-A 통합 |
| **1C** Vision (이미지 입력) | ❌ Agent Mode v2로 | 디자인 참조 이미지 업로드 — v2 (1주 후) |
| **1D** 메모리 (사용자별 누적) | ❌ Agent Mode v2로 | 답지 기록 누적 + 추천 학습 — v2 (1주 후) |
| **1E** 카드 UI | ✅ Day 3~4 | 종합 카드 + 번호 입력 = 1E의 재해석 |
| **1F** 글로벌 토글 | ❌ 별도 Phase | Agent Mode 출시 후 진행 |

→ **Agent Mode v1 = 1A + 1B + 1E** (5일)
→ **Agent Mode v2 = 1C + 1D** (1주 후)
→ **별도 Phase = 1F** (글로벌)

---

## ⭐ 마스터 — /builder vs /builder/agent 진입점 전략 (명탐정 보강)

### 원칙
- Free/Pro 가격 분리 X (사장님 정정)
- 기존 사용자 무위험 (격리)
- A/B 측정으로 6주 후 통합 결정

### UI 진입점
```
[Foundry 메인 페이지]

  ┌──────────────────────────────────────────┐
  │  어떻게 만드시겠어요?                     │
  │                                          │
  │  [📋 빠르게 (설문지)]  [💬 AI와 대화로 ⭐NEW]│
  │     기존 빌더             Agent Mode      │
  │     /builder              /builder/agent  │
  └──────────────────────────────────────────┘
```

### 운영 시나리오 (3단계)

**1단계 — 베타 (Day 5 직후, 1주)**
- /builder/agent 메뉴에 "🧪 BETA" 배지
- 사장님 + 심사위원 1~2명만 사용
- 환경변수 `AGENT_MODE_ENABLED=true` (제한)

**2단계 — 공개 (Week 2~6, 5주)**
- 모든 사용자에게 두 메뉴 동시 노출
- A/B 측정: 사용률, 완성률, 만족도, 비용
- 결과 데이터 수집

**3단계 — 통합 결정 (Week 7)**
| 결과 | 결정 |
|---|---|
| Agent 사용률 > 70% + 만족도 ↑ | 기존 /builder deprecate, Agent를 표준으로 |
| Agent 사용률 < 30% | 두 모드 유지 (선호도 반반) |
| Agent 만족도 ↓ | 원인 분석 + .md 보강 + 재개선 |

### 격리 체크리스트
- ✅ /builder 코드 손대지 X (격리)
- ✅ ai.service.ts 손대지 X (격리)
- ✅ 신규 라우트 = /builder/agent만
- ✅ 신규 백엔드 = agent-builder/ 모듈만
- ✅ 신규 .md = prompts/agent/만
- ✅ Phase 0.5 자산 = Read만 (수정 X)

---

## ⭐ 마스터 — 비용 예산표 (명탐정 보강)

### 5+1일 R&D 비용
| Day | 작업 | 예상 비용 |
|---|---|---|
| Day 0 | V-0 SDK 검증 (단일 호출) | $0.10 |
| Day 1 | 도구 5개 단위 테스트 (3~5회) | $0.50 |
| Day 2 | 답지/번역 .md LLM 검증 (3회) | $1.00 |
| Day 3 | 카드 시스템 단위 테스트 (5회) | $0.30 |
| Day 4 | 프론트엔드 (LLM 호출 0) | $0 |
| Day 5 | E2E 5개 시나리오 (앱 5개 풀 빌드) | $10~15 |
| **총** | | **$12~17** |

### 사전 준비
- ✅ Anthropic 크레딧 잔액 $20 이상 확인
- ✅ 부족 시 사장님이 충전 (R&D 시작 전)
- ✅ Day 5 전 잔액 재확인 ($15+ 필수)

### 비용 알람
- 누적 $5 도달 → 자비스에게 보고
- 누적 $10 도달 → 사장님 승인 후 진행
- 누적 $15 도달 → 즉시 중단 + 원인 분석

---

## ⭐ 마스터 — 8단 진화 사장님 통찰 (잊지 말 것)

```
오늘(4/18) 자비스가 5번 함정에 빠지고 사장님이 정정한 패턴:

[정정 1] 단계 분리 X → 이중 안전망
[정정 2] 피벗 X → 업그레이드  
[정정 3] 카테고리화 X → 자유 대화
[정정 4] 인터뷰 봇 X → 종합 카드
[정정 5] 꼬리 질문 X → 원샷 1라운드
[통합 6] 답지 채우기 모델 ⭐ 모든 정정의 통합
[추가 7] 답지에 참조 섹션 (벤치마킹/디자인) 필수
[추가 8] 번호 입력 + 모바일 + 반응형 ⭐
```

→ Agent system prompt 첫 줄에 이 8개 박을 것. 자비스가 못 본 함정을 Agent도 빠지지 않게.

---

## ⭐ 마스터 — 명탐정 새 세션 시작 명령 (복붙용)

```
파운더리 Agent Mode 작업 시작.

[먼저 읽기 — 11개 파일 § 0번 항목 순서대로]

[작업 모델 — 답지 채우기]
사용자 발화 → AI가 답지의 채울 수 있는 칸 자동 채움
→ 빈 칸 종합 카드 (번호+클릭+자연어 3중 입력)
→ 사용자 1라운드 선택 → 작업 시작 → 추가 질문 X

[5일 구성]
Day 1: Agent SDK 실행 엔진 (도구 5개 + 샌드박스)
Day 2: 답지 시스템 + 번역 .md (agent-core/intent-patterns/vague-detection)
Day 3: 종합 카드 시스템 (번호 입력 파싱 + 반응형 UI 이벤트)
Day 4: 프론트엔드 통합 (반응형 + 모바일 + 카드 렌더링)
Day 5: E2E 5개 시나리오 + 배포

[원칙 — 위반 시 즉시 중단]
✓ 기존 ai.service.ts / /builder 손대지 X
✓ 모든 신규 코드 agent-builder/ 디렉토리만
✓ Day별 1 commit
✓ 각 Day 완료 시 자비스에게 보고 → 사장님 승인 → 다음 Day
✓ 답지 모델 + 번호 입력 + 반응형 + 모바일 우선 baked in
✓ "절대" 단어 사용 금지 → "반드시/금지" 등으로

[Day 1 시작 명령]
"Agent Mode Day 1 시작. § 4 Day 1 Step A1~A5 진행.
끝나면 'hello.txt 만들어줘' 테스트로 Agent 도구 호출 3회 확인 후
변경 파일 + tsc 결과 + 게이트 검증 보고."

GO!
```

---

## 1. 왜 Agent SDK 버전을 만드는가 — **사장님이 정한 진짜 이유**

### 1-1. 핵심 동기: "사장님 + 자비스 일하는 방식"의 재현

**Agent SDK를 쓰는 이유는 단 하나**:

> *"너(자비스)와 나(사장님)처럼 일하는 모델을 만들기 위해서"*

지금 사장님과 자비스가 어떻게 일하는가?

```
[사장님] 자연어로 의도 전달 ("예약 앱 만들어줘", "여기 색깔 바꿔줘")
   ↓
[자비스] 의도 해석 → 도구 사용 (Bash/Write/Read) → 결과 확인 → 수정
   ↓
[사장님] 결과 보고 다음 지시
   ↓
(반복)
```

**이게 Foundry가 고객에게 제공해야 하는 경험**.

지금 사장님이 자비스랑 일하는 만족도 = **고객이 Foundry랑 일할 때 느껴야 하는 만족도**.

### 1-2. .md + 프롬프트 = 고객의 말을 "자비스가 알아듣는 말"로 번역하는 장치

**문제**: 고객은 사장님처럼 자비스랑 일해본 적 없음. 의도 표현이 어수룩함.

- 사장님: "여기 색깔 바꿔줘" → 자비스가 "어디?" 물어보면 정확히 답함
- 고객: "예쁘게 만들어줘" → 자비스가 뭘 어떻게 해야 할지 모름

**해결**: Foundry 안에 .md와 프롬프트로 **번역 미들웨어** 구축
- 고객의 모호한 자연어 → 자비스가 알아듣는 구체적 작업 명령으로 변환
- 막히면 **선택지 옵션** 제시 ("배경색을 a/b/c 중 골라주세요")
- 점진적으로 의도 정제 → Agent에게 전달

```
[고객 자연어]              [Foundry 번역 미들웨어]                    [Agent SDK]
"예쁜 예약앱"     →      .md(미적 기준) + 선택지(템플릿/색/폰트)    →    "Tailwind primary=blue,
                          + 누락 정보 질문 ("어떤 업종?")                 reservation 페이지 list+form
                                                                         형식, ..." (구체 명령)
```

### 1-3. 결과: 기존 Foundry 빌더의 **업그레이드**

이건 **피벗(pivot)이 아니라 업그레이드(upgrade)**.

- **피벗**: 제품 방향이 바뀜 (예: B2C → B2B)
- **업그레이드**: 같은 제품인데 더 좋아짐

Foundry는 처음부터 "**비기술자가 자연어로 MVP 만드는 도구**"였음. 이 정체성 그대로. 다만 내부 엔진을 "한 번 호출해서 다 짜기"에서 "사장님-자비스처럼 협업하기"로 업그레이드.

### 1-4. 왜 "메뉴 추가" 방식인가

**메뉴 추가 = 실패 안전장치**, 가격 차별화나 제품 분리 목적 아님.

- 성공 시: 기존 메뉴 자연스럽게 deprecated → Agent 모드가 표준 빌더로 통합
- 실패 시: **메뉴 1개만 삭제**하면 끝. 기존 시스템 무사.

```
[1단계 — 지금]
/builder          기존 (무사)
/builder/agent    신규 (실험)

[2단계 — Agent 모드 검증 완료 후]
/builder          기존 (deprecated 표시)
/builder/agent    표준 (홍보)

[3단계 — 안정화 후]
/builder          → Agent 모드로 redirect
                    (기존 코드 archive)
```

→ **결국 Agent 모드가 Foundry의 표준 빌더가 됨**. 메뉴 추가는 가는 길의 안전장치일 뿐.

### 1-5. 비교: 현재 vs 업그레이드 후

| 항목 | 현재 Foundry | 업그레이드 후 (Agent SDK) |
|---|---|---|
| 작업 방식 | AI에게 한 번에 다 짜라고 시킴 | **사장님-자비스처럼 단계별 협업** |
| 고객 경험 | 설문지 → 결과 (블랙박스) | **채팅 → 실시간 진행 → 즉각 수정** |
| 의도 전달 | 정형 설문 (한계 있음) | **자연어 + 막히면 선택지** |
| 검증 | 마지막에 1회 | **매 단계마다 빌드/Read 확인** |
| 수정 | 다 짜고 나서 | **중간에 바로** |
| F4 발생 | 빈발 | **0건** (파일 1개씩) |

### 1-6. 사장님의 결정 (이게 진짜 의도)

```
✅ Agent SDK 도입 = 사장님-자비스 협업 방식의 재현
✅ .md + 프롬프트 = 고객 말을 자비스 말로 번역하는 미들웨어
✅ 선택지 옵션 = 고객이 막힐 때 의도 정제 도구
✅ 메뉴 추가 = 실패 안전장치 (성공하면 결국 표준으로 통합)
✅ 이건 피벗 X, Foundry 빌더의 업그레이드 O
✅ Phase 0.5 v2의 .md 자산 그대로 활용 (헛수고 아님)
✅ 기존 시스템 절대 손대지 X (격리)
```

---

---

## 2. 어떻게 구성할 것인가 — "사장님-자비스 협업"의 디지털 재현

### 2-1. 핵심 구성 요소 3개

```
┌─────────────────────────────────────────────────────────────────┐
│           Agent Mode = 사장님-자비스 협업 재현 시스템              │
│                                                                 │
│  ① 번역 미들웨어 (.md + 프롬프트)                                │
│     고객 자연어 → Agent가 알아듣는 구체 명령                     │
│                                                                 │
│  ② 선택지 옵션 시스템                                            │
│     고객이 막힐 때 의도 정제 (a/b/c 중 선택)                     │
│                                                                 │
│  ③ Agent SDK 실행 엔진                                           │
│     자비스처럼 도구 사용 + 빌드 검증 + 단계별 작업               │
└─────────────────────────────────────────────────────────────────┘
```

### 2-2. 메뉴 추가 구조 (격리 + 안전장치)

```
┌─────────────────────────────────────────────────────────────┐
│                      Foundry SaaS                           │
│                                                             │
│  ┌──────────────────────────┐   ┌────────────────────────┐  │
│  │  /builder (기존)          │   │ /builder/agent (신규)   │  │
│  │  → 손대지 X (격리)        │   │  → 사장님-자비스 협업    │  │
│  │  → 실패 시 폴백용         │   │     방식의 재현          │  │
│  └──────────────────────────┘   └────────────────────────┘  │
│            ↑                              ↑                 │
│            └─── 디자인/UI/Preview 공유 ───┘                 │
│                                                             │
│  공통 자산: Phase 0.5 v2 .md (prompts/) ⭐ 양쪽 다 사용     │
│                                                             │
│  [장기 계획] Agent 모드 검증 완료 → 기존 메뉴 deprecated    │
│              → Agent 모드가 Foundry 표준 빌더로 통합        │
└─────────────────────────────────────────────────────────────┘
```

### 2-3. 사용자 흐름 — "고객의 어수룩한 자연어"가 결과물로 가는 길

```
[1] 고객 채팅 입력
    "예약 받는 앱 만들고 싶은데 예쁘게"
        ↓
[2] 번역 미들웨어 (.md + 프롬프트)
    .md: "고객이 '예쁘게' 말하면 Tailwind 모던 디자인 기본"
    .md: "고객이 '예약'이라 하면 reservation list+form 페이지 셋"
    프롬프트: "정보 부족 시 선택지로 질문해라"
        ↓
[3] 선택지 옵션 발동 (정보 부족 감지)
    "어떤 업종이세요?
     a) 미용실  b) 병원  c) 식당  d) 기타 (직접 입력)"
        ↓
[4] 고객: "a) 미용실"
        ↓
[5] Agent SDK 실행
    자비스처럼 작업:
    • Bash: npx create-next-app
    • Write: app/page.tsx (홈)
    • Bash: npm run build → 에러 보고 수정
    • Write: app/reservations/page.tsx
    • Read: 기존 page.tsx 참조해서 일관성 유지
    • ... 반복
        ↓
[6] 채팅창 실시간 진행 표시
    💻 npm install (실행 중)
    📝 page.tsx 작성 완료
    ✅ 빌드 성공
    📝 reservations/page.tsx 작성 중...
        ↓
[7] 완료 → 미리보기 + 추가 수정 자유롭게
    "여기 색깔 좀 더 부드럽게" → Agent 즉시 반영
```

### 2-4. Agent 모드 내부 흐름

```
[사용자]
  → /builder/agent 접속
  → 채팅창에 자연어 요청 ("예약 앱 만들어줘")
  → BuilderChat (재사용)
       ↓
[프론트엔드: SSE 연결]
  → POST /api/ai/agent-build (stream: true)
       ↓
[백엔드: Agent 실행]
  → 사용자 세션별 임시 디렉토리 생성 /tmp/foundry-agent-{userId}-{sessionId}/
  → Anthropic Agent SDK 호출
      ├─ system: composed .md (PromptComposer 재사용)
      ├─ tools: [Bash, Write, Read, Glob, Grep]
      ├─ allowed_cwd: /tmp/foundry-agent-{...}/
      └─ max_iterations: 100
  → Agent가 자율 실행:
      1. Bash: npx create-next-app
      2. Write: page.tsx
      3. Bash: npm run build
      4. (에러 시) Read + Write 수정
      5. 반복
  → 매 도구 호출마다 SSE event 전송
       ↓
[프론트엔드: 실시간 표시]
  → 채팅창에 도구 호출 시각화
      💻 npm install (실행 중)
      📝 page.tsx 작성 (3/40)
      ✅ 빌드 성공
  → BuilderPreview iframe 자동 갱신
       ↓
[완료]
  → 임시 디렉토리 → S3/디스크 복사 → 서브도메인 배포
  → 임시 디렉토리 cleanup
```

---

## 3. 기술 스택

| 항목 | 선택 |
|---|---|
| Agent SDK | `@anthropic-ai/sdk` v0.89+ + 직접 tool loop 구현 (또는 `@anthropic-ai/claude-agent-sdk` 출시되면 전환) |
| 모델 | claude-sonnet-4-6 (Phase 0 그대로) |
| effort | 'medium' (Agent 모드는 reasoning 중요) |
| 스트리밍 | Server-Sent Events (SSE) |
| 샌드박스 | Node child_process + cwd 제한 + 명령 allowlist (MVP) → 추후 Docker |
| 세션 저장 | 임시 디렉토리 + 완료 시 정리 |
| UI 재사용 | BuilderChat, BuilderPreview, Tutorial 일부 |

---

## 4. 단계별 구현 (Day 0 + 5일) — 명탐정 검증 반영

**구성 원칙**: 사장님 의도 + 명탐정 검증 결합

```
Day 0 — ⭐ V-0: Agent SDK 실존 검증 (15분, $0.10) — 명탐정 추가
Day 1 — ③ Agent SDK 실행 엔진 (도구 5개)
Day 2 — ① 답지 시스템 + .md (Phase 0.5 자산 연계)
Day 3 — ② 종합 카드 시스템 (번호 입력 파서)
Day 4 — 프론트엔드 통합 (반응형 + 모바일)
Day 5 — E2E 5개 시나리오 + 배포
```

---

### Day 0: V-0 SDK 실존 검증 ⭐ (명탐정 추가, 15분)

**목적**: Day 1 시작 전 SDK 가정 검증. 어제 effort 검증 패턴 그대로.

**Step V0-1**: npm 패키지 존재 확인
```bash
cd api
npm view @anthropic-ai/claude-agent-sdk version 2>&1 | head -5
npm view @anthropic-ai/agent-sdk version 2>&1 | head -5
npm list @anthropic-ai/sdk  # 0.89+ 확인 (Phase 0에서 이미 사용 중)
```

**Step V0-2**: tool_use 직접 구현 검증 (SDK 없는 경우 대비)
```typescript
// 단일 호출 테스트 — Claude가 tool_use 응답 정상 반환?
const res = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1000,
  tools: [{
    name: 'echo',
    description: '입력을 그대로 반환',
    input_schema: { type: 'object', properties: { text: { type: 'string' } } }
  }],
  messages: [{ role: 'user', content: 'echo 도구로 "hello" 반환해줘' }]
});
console.log(res.stop_reason);  // 'tool_use' 기대
console.log(res.content);       // tool_use block 기대
```

**Step V0-3**: 결과 분기
| 결과 | 결정 |
|---|---|
| claude-agent-sdk 존재 + 안정 | 그거 사용 (편함) |
| 둘 다 없음 + tool_use 작동 | **@anthropic-ai/sdk + tool_use 직접 구현** ⭐ 안전 |
| tool_use도 안 됨 | Day 1 진행 불가 → 자비스 다시 검토 |

**보고**: 자비스에게 V0-1/V0-2 결과 + 결정 (Day 1 SDK 선택)

---

### Day 1: ③ Agent SDK 실행 엔진 골격 (자비스 작업 방식 재현)

**목표**: "자비스가 Bash/Write/Read 쓰며 일하는" 그 행동 패턴을 백엔드에 구현

**Step A1**: SDK 확인 + 모듈 생성
```bash
cd api
npm list @anthropic-ai/sdk  # 0.89+ 확인
# 필요 시 npm install @anthropic-ai/sdk@latest
mkdir -p src/agent-builder
```

**Step A2**: 새 모듈 구조
```
api/src/agent-builder/
├── agent-builder.module.ts
├── agent-builder.controller.ts   (POST /api/ai/agent-build SSE)
├── agent-builder.service.ts      (Agent loop 코어)
├── agent-tools.ts                 (도구 5개 정의)
├── sandbox.service.ts             (임시 디렉토리 + 권한)
├── stream-event.types.ts          (SSE 이벤트 타입)
└── intent-translator.service.ts   (Day 2에서 채움)
```

**Step A3**: Agent loop 구현 (자비스 사고-행동 루프 재현)
```typescript
while (!done && iter < 100) {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    system: composedMd,
    tools: [Bash, Write, Read, Glob, Grep],
    messages,
    output_config: { effort: 'medium' } as any,
  });
  
  if (res.stop_reason === 'tool_use') {
    // 자비스가 도구 호출하는 것처럼 실행
    for (const block of res.content) {
      if (block.type === 'tool_use') {
        const result = await executeTool(block.name, block.input);
        emitEvent({ type: 'tool_call', name: block.name, input: block.input });
        emitEvent({ type: 'tool_result', output: result });
        messages.push({ role: 'assistant', content: [block] });
        messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: block.id, content: result }] });
      }
    }
  } else {
    done = true;
  }
  iter++;
}
```

**Step A4**: 도구 5개 구현 (자비스가 쓰는 그것들)
```
Bash:  child_process.exec, cwd 제한, 5분 timeout, 명령 allowlist
Write: fs.writeFile, realpath 검증 (cwd 내부만)
Read:  fs.readFile, realpath 검증
Glob:  fast-glob, cwd 내부만
Grep:  child_process("rg ..."), cwd 내부만
```

**Step A5**: 샌드박스 기초
- /tmp/foundry-agent-{userId}-{uuid}/ per session
- 명령 allowlist: npm, npx, node, mkdir, rm(cwd내부), ls, cat, git init
- 금지: sudo, rm -rf /, ssh, curl 외부

**검증 (Day 1 gate)**:
- 자비스가 Agent에게 "hello.txt 만들고 내용을 'hi'로 써줘" 명령
- Agent가 Write 호출 → 파일 생성 확인
- Agent가 Read 호출 → 내용 확인 응답
- **3회 이상 자연스러운 도구 호출 루프 작동**

---

### Day 2: 답지 시스템 + 번역 .md (Phase 0.5 자산 연계)

**목표**: "답지 채우기 모델" 구현 + Phase 0.5 v2 4,398줄 .md 자산 재활용.

#### ⭐ Phase 0.5 자산 활용 매핑 (명탐정 보강)

| 기존 자산 (Phase 0.5 v2) | Agent Mode 활용 방법 |
|---|---|
| `prompts/core.md` (447줄) | Agent system prompt 일부로 직접 주입 (cache_control 1h TTL) |
| `prompts/pages/list.md` (483줄) | Agent가 list 페이지 짤 때 Read로 참조 |
| `prompts/pages/form.md` (537줄) | 폼 페이지 시 Read |
| `prompts/pages/dashboard.md` (450줄) | 대시보드 시 Read |
| `prompts/pages/detail.md` (449줄) | 상세 페이지 시 Read |
| `prompts/components/{modal,chart,card,list-item}.md` | 컴포넌트 시 Read |
| `prompts/patterns/tailwind.md` (406줄) | system prompt 주입 (반응형 핵심) |
| `prompts/patterns/supabase-auth.md` (412줄) | system prompt 주입 (인증 표준) |
| `PromptComposer.composeForPage/composeForComponent` | 그대로 재사용 — Agent가 호출 |
| `PromptComposer` 신규 메서드 | `composeForAgent()` 추가 (core + patterns + agent-core.md) |
| `effort: 'low'/'medium'` | Agent SDK 호출도 동일 — Step 3 호출은 'low' |
| `cache_control 1h TTL` | Agent system prompt에도 적용 (캐시 효과 100배) |

**Agent의 .md 사용 패턴**:
```
[항상 system에 주입] (캐시됨)
- agent-core.md (사고방식)
- core.md (기술 스택)
- patterns/tailwind.md (반응형 + Tailwind)
- patterns/supabase-auth.md (인증)

[필요할 때 Read로 참조] (즉석)
- pages/list.md ← list 페이지 짤 때
- pages/form.md ← 폼 페이지 짤 때
- components/modal.md ← 모달 짤 때
- 등등
```

→ **system 토큰 ~3K으로 cap, 나머지는 lazy load**.

#### 산출물

**핵심 산출물**:
- `agent-core.md` (Agent의 사고 방식 = 사장님-자비스 협업 + 답지 모델 + 8단 정정)
- `intent-patterns.md` (대화 → 답지 칸 채우기 가이드, 카테고리 X)
- `vague-detection.md` (빈 칸 판단 + 종합 카드 발동)
- `answer-sheet.types.ts` (답지 자료구조 — TypeScript)
- `prompt-composer.service.ts` 확장 (composeForAgent 메서드)

**이 Day의 핵심 산출물**:
- `agent-core.md` (Agent의 사고 방식 = 사장님-자비스 협업 + 답지 모델 + 8단 정정)
- `intent-patterns.md` (대화 → 답지 칸 채우기 가이드, 카테고리 X)
- `vague-detection.md` (빈 칸 판단 + 종합 카드 발동)
- `answer-sheet.types.ts` (답지 자료구조 — TypeScript)

**Step B1**: Agent 전용 디렉토리
```
api/src/ai/prompts/agent/
├── agent-core.md              (사고 방식 + 8단 정정 + 협업 톤)
├── intent-patterns.md          (답지 채우기 사고법 — 카테고리 X)
└── vague-detection.md          (빈 칸 감지 + 카드 발동 원칙)

api/src/agent-builder/
└── answer-sheet.types.ts       ⭐ 답지 TypeScript 타입
```

**Step B2**: `agent-core.md` 작성 (400~500줄)

**필수 섹션 (마스터 § E의 7가지 사고방식 baked in)**:
```markdown
## 1. 너의 단 하나의 원칙
"우리가 만들 프로젝트를 위한 답지를 함께 채워나가는 방식"
사용자 발화 → 답지 자동 채움 → 빈 칸 종합 카드 → 작업

## 2. 답지 모델 (필수 5항목 + 동적)
[필수 5]
1. 앱 종류/업종/한 마디
2. 벤치마킹 사이트 (있는지 반드시 물음)
3. 디자인 참조 (있는지 반드시 물음)
4. 핵심 페이지/기능
5. 자유 입력

[동적] 앱 종류 파악 후 즉석 추가 (예약앱→운영시간, 쇼핑몰→배송)

## 3. 카드 룰 (꼬리 질문 X, 원샷 1번만)
- 모든 옵션에 [번호]
- 입력: 번호("1, 2, 1") + 클릭 + 자연어 다 받음
- "시작/ㄱㄱ/응" = 기본값으로 즉시 시작
- 카드 후 추가 질문 금지

## 4. 도구 사용 (자비스처럼)
- Write: 파일 1개씩
- Bash: 매번 npm run build 검증
- Read: 자기 코드 확인 (재사용 원칙)
- Glob: 비슷한 파일 찾기 (재사용)
- AskUser: 답지 카드 발동

## 5. 협업 톤 (동업자 모드)
- 보고서 X, 카톡 같이
- 의견 솔직 ("이거보단 저게 나을 것 같은데")
- ㅋㅋㅋ, 감탄 OK
- "네 알겠습니다" 일변도 X

## 6. 사용자 정정 시
즉시 수용 ("아 그게 맞네요!") + 답지 갱신 + 작업 반영
고집 X, 자기 분석 우선 X

## 7. 작업 완료 시 (대화하라 — Ch 14)
"끝!" X → 추가 인사이트 1개 제안
예: "이대로도 좋은데, 결제 붙이면 운영 더 편할 것 같아요. 추가할까요?"

## 8. 반응형 웹 + 모바일 (필수)
- 모든 생성 코드 Tailwind sm:/md:/lg: 적용
- 모바일 우선 → PC 확장
- 터치 영역 최소 44px
- 폰트 16px 이상

## 9. 절대 하지 말 것
- "안 됩니다" / "못 합니다" / "제 능력 밖입니다"
  → "이렇게 하면 됩니다"
- 카테고리 강제, enum 끼워맞추기
- 한 번에 1개씩 묻기 (인터뷰 봇)
- 사용자가 명확히 말한 거 다시 확인
- "절대" 단어 사용 (한국어 답변)

## 10. 클로드와의 약속
방법 모르면 만들어서라도 해낸다.
```

**Step B3**: `intent-patterns.md` 작성 ⭐ — **사고 방식 문서** (매핑표 X)

**핵심 원칙**: 마누스처럼 **자유 대화만으로 작동**. 카테고리/매핑표 만들지 X. 
.md는 Agent에게 "**어떻게 생각하고 행동할지**"를 알려주는 가이드.

**작성 내용** (300~400줄):

```markdown
## 1. 너의 정체성
너는 사장님(Mark)이 자비스(Claude)와 일하는 그 방식을 고객에게 제공하는 Agent다.
사장님이 자비스에게 평소 어떻게 말하는지 떠올려라:
- "예약 앱 만들어줘" → 자비스는 어떤 업종인지, 어떤 페이지가 필요한지 자연스럽게 추론
- "여기 색깔 부드럽게" → 자비스는 현재 코드 보고 어울리는 톤으로 즉시 수정
- "뭐 하나 만들어줘" → 자비스는 "어떤 거 좋아하세요?" 물어보고 시작

너도 그렇게 해라. 카테고리에 가두지 마라. 고객 말 자체를 이해해라.

## 2. 의도 추론 원칙
- 정보가 충분하면: 즉시 작업 시작 (선택지 띄우지 마라)
- 정보가 모호하면: 선택지 1~2개로 좁혀가라 (한 번에 다 묻지 마라)
- 사장님-자비스 대화처럼 자연스럽게 흘러가라

## 3. 작업 원칙
- 파일 1개씩 Write
- 매번 npm run build로 검증
- 에러 보면 Read로 원인 찾고 수정
- 300줄 넘어가면 분리 (F4 방지)

## 4. 예시 대화 (단순 참조용, 매핑표 아님)

### 예시 1: 명확한 요구
고객: "예쁜 미용실 예약앱"
너의 사고: 업종(미용실)+톤(예쁜)+핵심기능(예약) 명확. 추가 질문 없이 시작.
→ Bash, Write 즉시 시작

### 예시 2: 모호한 요구
고객: "뭐 하나 만들어줘"
너의 사고: 업종/기능 전혀 없음. 한 가지만 묻자. 너무 많이 묻지 X.
→ AskUser: "어떤 종류의 앱을 만드시고 싶으세요? 자유롭게 말씀해주세요."
   (선택지는 보조용. 자유 입력이 기본)

### 예시 3: 수정 요구
고객: "여기 색깔 좀 부드럽게"
너의 사고: 현재 페이지 Read해서 색 확인 → 자연스러운 변경 → 빌드.
   "여기"가 모호하면 한 번 확인. 모호하지 않으면 (페이지 1개일 때) 그냥 진행.

## 5. 너의 도구
- Bash: npm/npx/build/install 등 명령
- Write: 파일 생성/수정
- Read: 기존 파일 확인
- Glob: 파일 찾기
- Grep: 코드 검색
- AskUser: 고객 의도 모호할 때만 (남용 X)

## 6. 기술 스택 (이건 고정)
- Next.js 16 App Router
- Tailwind v4
- Supabase (auth + DB)
- TypeScript
- (자세한 패턴은 core.md, patterns/*.md 참조)

## 7. 절대 하지 말 것
- 카테고리에 고객을 끼워맞추지 X
- 한 번에 5~10개 질문 던지지 X (고객 도망감)
- 고객이 명확히 말한 걸 다시 확인하지 X
- "Pro tier" 같은 말 X (이건 그냥 빌더다)
```

**핵심 변화 (사장님 정정 반영)**:
- ❌ 8 카테고리 × 5 변형 = 40 매핑 (한계 만들기)
- ✅ Agent에게 "사장님-자비스 대화 패턴" 자체를 가르침 (자유)
- ✅ 카테고리 없이 무한 자연어 처리 (마누스 방식)
- ✅ 예시 3개만 (참조용, 매핑표 X)
- ✅ Agent의 자체 판단력 신뢰

**Step B4**: `vague-detection.md` 작성 (200줄) — 원칙 중심

```markdown
## 모호함을 어떻게 판단하나
규칙으로 정하지 마라. 너 자신에게 물어라:
"이 정보로 npm run build까지 갈 수 있는가?"

- YES → 시작
- NO → 부족한 한 가지만 물어라

## 좋은 질문 vs 나쁜 질문
나쁨: "업종, 페이지 종류, 색상, 폰트, 로고는요?"  (5개 한꺼번에)
좋음: "어떤 거 만드세요?" (한 가지, 자유 입력 환영)

## 사장님 말투 참조
사장님은 자비스에게 평소 이렇게 말한다:
- "예약 앱 만들어줘" (한 마디)
- "응 그렇게" (확인)
- "여기 색깔 좀" (가리키기)
- "다시 해" (재시도)
짧고 모호하지만 자비스는 알아들음. 너도 그래야 한다.
```

**Step B5**: `selection-triggers.md` 작성 (100줄) — 가이드 라인만

```markdown
## AskUser 도구 사용 원칙

선택지는 보조 도구다. **자유 입력이 기본**.

### 발동 조건 (자체 판단)
정보 부족 + Read나 Glob로 추론 불가 → 그때만 발동

### 형식
{
  question: "한 줄 자연스러운 질문",
  options: [
    { label: "예시 옵션 1 (참고용)", value: "..." },
    { label: "예시 옵션 2", value: "..." },
    { label: "기타 (직접 말씀해주세요)", value: "FREE" }
  ],
  allowFreeText: true  // 항상 true
}

### 절대 하지 말 것
- 답을 강제하기 위해 옵션만 주고 자유 입력 막기
- 한 번에 여러 질문
- 고객이 이미 말한 걸 다시 묻기
```

**Step B6**: `PromptComposer` 확장
```typescript
composeForAgent(userMessage: string): string {
  return [
    agent-core.md,
    intent-patterns.md,       // 자연어 → 명령 번역
    vague-detection.md,       // 모호 감지
    selection-triggers.md,    // 선택지 발동
    core.md,                  // Phase 0.5 v2 자산 재활용
    patterns/tailwind.md,     // 재활용
    patterns/supabase-auth.md, // 재활용
  ].join('\n\n---\n\n');
}
```

**검증 (Day 2 gate)**:
- 사장님이 "예쁜 미용실 예약앱" 입력
- Agent가 intent-patterns.md 기반으로 정확히 "미용실 + 예약 페이지 + Tailwind 모던" 해석
- 불필요한 선택지 없이 바로 작업 시작

- 사장님이 "뭐 하나 만들어줘" 입력
- Agent가 vague-detection.md 발동 → 선택지 질문
- (Day 3에서 선택지 UI 완성, 여기선 이벤트만 emit 확인)

---

### Day 3: 종합 카드 시스템 (번호 입력 + 1라운드 룰)

**목표**: 답지의 빈 칸을 종합 카드 1번에 보여주고, 번호/클릭/자연어 3중 입력으로 받아 작업 시작.

**핵심 변경 (사장님 정정 반영)**:
- ❌ "선택지 발동 → 답변 → 다음 선택지" (꼬리 질문)
- ✅ "답지 빈 칸 모음 → 종합 카드 1번 → 작업 시작" (1라운드)

**Step C0**: `answer-sheet.types.ts` 작성 (Day 2 미완 부분)
```typescript
type AnswerSheet = {
  // 필수 5
  appType?: string;       // "예약앱" 등 (자유 텍스트)
  industry?: string;      // "미용실" 등
  benchmark?: { kind: 'site'|'name'|'none', value?: string };
  designRef?: { kind: 'image'|'url'|'keyword'|'none', value?: string };
  features?: string[];    // 자유 텍스트 배열
  freeText?: string;
  
  // 동적 (앱 종류별)
  dynamic?: Record<string, any>;
  
  // 메타
  filledByAI: string[];   // AI가 자동 채운 키들
  filledByUser: string[]; // 사용자가 채운 키들
  needsCard: boolean;     // 빈 칸 있어서 카드 발동 필요?
}
```

**Step C1**: SSE 이벤트에 `card_request` 추가 (종합 카드)
```typescript
type StreamEvent = 
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; name: string; input: any }
  | { type: 'tool_result'; output: string; success: boolean }
  | { type: 'file_written'; path: string; size: number }
  | { type: 'progress'; current: number; total: number }
  | { type: 'card_request';  ⭐ 종합 카드 (꼬리 질문 X, 1번만)
      title: string;        // "예약 앱 만들어드릴게요! 답지만 채우면 시작!"
      sections: Array<{
        id: string;
        question: string;
        emoji?: string;
        options: Array<{
          num: number;       // ⭐ 번호 [1] [2] [3]
          label: string;
          value: string;
          needsInput?: boolean;  // 5번 "직접 URL" 같은 거
        }>;
      }>;
      assumed?: Record<string, string>; // AI가 미리 채운 칸 (✓ 추정)
      inputHint: string;    // "1, 2, 1 같이 번호로 또는 자유롭게"
      quickStart: { label: string; value: 'DEFAULT_ALL' };
    }
  | { type: 'complete'; previewUrl: string }
  | { type: 'error'; message: string }
```

**Step C2**: Agent가 선택지 발동하는 방식 — 특수 도구
```typescript
// 도구 추가 (6번째)
AskUser: {
  name: 'ask_user',
  description: '사용자에게 선택지를 제시하고 답변을 기다림',
  input_schema: {
    question: string,
    options: array of { label, value },
    allow_free_text: boolean
  }
}

// Agent가 이 도구 호출 시:
// 1. SSE로 selection_request 이벤트 emit
// 2. Agent loop 일시정지
// 3. 클라이언트가 사용자 선택 → POST /api/ai/agent-build/{sessionId}/answer
// 4. Answer를 tool_result로 Agent에 전달 → loop 재개
```

**Step C3**: 세션 상태 관리
```typescript
// Redis or in-memory Map
sessionStates: Map<sessionId, {
  status: 'running' | 'waiting_answer' | 'completed' | 'failed',
  pausedContext: MessageParam[],  // Agent loop 재개용
  pendingSelectionId: string,
}>
```

**Step C4**: 답변 수신 엔드포인트 + 입력 파서
```typescript
@Post('agent-build/:sessionId/answer')
submitAnswer(@Param('sessionId') id: string, @Body() dto: { answer: string }) {
  // 1. 답변 파싱 (3중 지원)
  //    - "시작" / "ㄱㄱ" / "응" / "그대로" → DEFAULT_ALL (모두 추정값/기본값)
  //    - "1, 3, 2" / "1 1 1" → 순서대로 sections에 매핑
  //    - 자유 텍스트 → AI 파싱 (LLM 호출로 답지 칸 매칭)
  //    - UI 클릭 결과 객체 → 직접 매핑
  // 2. answerSheet에 채움
  // 3. 빈 칸 추가 있으면? → 추가 카드 요청 (드물어야 함)
  // 4. 답지 완성 → tool_result로 Agent loop 재개
}
```

**입력 파서 단위 테스트 필수**:
- "시작" / "ㄱㄱ" / "응" / "그대로" 5개 키워드 모두 DEFAULT_ALL
- "1" → 첫 섹션 1번
- "1, 3, 2" → 3개 섹션 순서대로
- "1 1 1" (공백 구분) 도 동일 처리
- "야놀자" → 자연어 파싱 시도 → benchmark 칸 채움

**Step C5**: 선택지는 **Agent가 즉석 생성** (사전 템플릿 X)

⚠️ **사장님 정정 반영**: 카테고리 만들지 X. Agent가 대화 흐름에 맞게 즉석 선택지 생성.

선택지 사전 템플릿을 만들면 = 또 카테고리화. 마누스 방식 X.

대신 selection-triggers.md에 **원칙만** 적어둔다:
```markdown
## 선택지 생성 원칙
- 사전 정의된 선택지 X. 매번 대화 맥락에 맞게 즉석 생성
- 옵션 2~4개 + "기타 (직접 말씀)" 항상 포함
- allowFreeText: true 항상 (자유 입력이 기본)
- 한 질문에 한 가지만 묻기

## 예시 (참조용, 강제 X)
고객이 "앱 만들어줘"만 하면:
→ Agent 즉석 생성: "어떤 거 만드시고 싶으세요? 자유롭게 말씀해주세요."
   options: [] (텅 빈 채로, 자유 입력만)
   
고객이 "쇼핑몰" 했는데 결제 방식 모호하면:
→ Agent 즉석 생성: "결제는 어떻게 받으실 건가요?"
   options: ["토스페이먼츠", "일단 결제 없이", "기타 (말씀해주세요)"]
   
→ 매번 다름. 고정 X.
```

**검증 (Day 3 gate)**:
- 사장님이 "뭐 앱 하나 만들어줘" 입력
- Agent가 ask_user 도구 호출 → SSE에 selection_request emit
- (UI 없이) curl로 /answer 엔드포인트에 "미용실" POST
- Agent loop 재개 → 미용실 앱 작업 시작

---

### Day 4: 프론트엔드 통합 (반응형 + 모바일 우선)

**목표**: 사장님이 자비스와 채팅하는 것과 똑같은 경험을 고객이 PC/모바일 어디서든.

**핵심 (사장님 추가)**: **반응형 웹 + 모바일 같이 되게**.

**Step D1**: 새 라우트 `/builder/agent` (반응형 + 모바일 친화 필수)
```
web/src/app/builder/agent/
├── page.tsx              (기존 builder/page.tsx 구조 재사용 + 반응형)
└── components/
    ├── AgentChat.tsx      (BuilderChat 확장, 반응형)
    ├── ToolCallBlock.tsx  (도구 호출 시각화 — 접을 수 있게)
    ├── AnswerSheetCard.tsx ⭐ 종합 카드 (번호 [1] [2] + 큰 터치 영역)
    └── ProgressBar.tsx
```

**반응형/모바일 필수**:
- 카드 옵션: 모바일 1열 (h-12 이상 터치) / PC 2~3열 (sm:grid-cols-2 lg:grid-cols-3)
- 채팅 입력창 폰트 16px 이상 (iOS 자동 줌 방지)
- 번호 입력 안내 항상 표시 ("1, 2, 1 같이 입력 또는 클릭")
- 화면 작아도 카드 한 화면에 (스크롤 최소)

**Step D2**: SSE 클라이언트
```typescript
const eventSource = new EventSource(`/api/ai/agent-build?sessionId=${id}`);
eventSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  switch (event.type) {
    case 'thinking': addChatMessage({ role: 'agent', content: event.content, type: 'thinking' }); break;
    case 'tool_call': addChatMessage({ type: 'tool_call', tool: event.name, input: event.input }); break;
    case 'tool_result': updateLastToolCall({ output: event.output, success: event.success }); break;
    case 'file_written': updateFileTree(event.path); break;
    case 'progress': setProgress(event.current, event.total); break;
    case 'selection_request': showSelection(event); break; ⭐
    case 'complete': setPreviewUrl(event.previewUrl); break;
    case 'error': showError(event.message); break;
  }
};
```

**Step D3**: `ToolCallBlock` 컴포넌트
```
💻 Bash: npm install
   [접기/펼치기] stdout 표시
📝 Write: app/page.tsx (152줄)
   [접기/펼치기] 코드 미리보기
📖 Read: app/layout.tsx
✅ 빌드 성공 (2.3초)
```

**Step D4**: `AnswerSheetCard` 컴포넌트 ⭐ (반응형 종합 카드)
```tsx
<div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
  <h3 className="text-lg font-bold mb-2">{card.title}</h3>
  
  {/* AI 추정 표시 */}
  {Object.entries(card.assumed || {}).map(([k, v]) => (
    <div className="text-xs text-emerald-600">✓ 추정: {k} = {v}</div>
  ))}
  
  {/* 섹션별 빈 칸 */}
  {card.sections.map(section => (
    <div key={section.id} className="mt-4">
      <p className="font-semibold mb-2">
        {section.emoji} {section.question}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {section.options.map(opt => (
          <button 
            onClick={() => handleSelect(section.id, opt.value)}
            className="h-12 sm:h-10 px-3 rounded-lg border-2 hover:border-blue-500 text-left">
            <span className="font-mono text-blue-600">[{opt.num}]</span> {opt.label}
          </button>
        ))}
      </div>
    </div>
  ))}
  
  {/* 입력 안내 */}
  <div className="mt-4 text-sm text-gray-500">
    💬 {card.inputHint}
  </div>
  
  {/* 그대로 시작 버튼 */}
  <button 
    onClick={() => submitAnswer('DEFAULT_ALL')}
    className="mt-3 w-full h-12 bg-blue-600 text-white font-bold rounded-xl">
    {card.quickStart.label} →
  </button>
</div>
```

**Step D4-2**: 채팅창 입력 처리 (3중)
```typescript
const handleChatSubmit = (text: string) => {
  // 1. 시작 키워드
  if (['시작', 'ㄱㄱ', '응', '그대로'].includes(text.trim())) {
    submitAnswer('DEFAULT_ALL');
    return;
  }
  // 2. 번호 패턴 (1, 2, 1 / 1 1 1 / 1)
  if (/^[0-9, ]+$/.test(text.trim())) {
    submitAnswer({ kind: 'numbers', values: text.match(/\d+/g) });
    return;
  }
  // 3. 자유 텍스트 → 백엔드로 (LLM 파싱)
  submitAnswer({ kind: 'natural', text });
};
```

**Step D5**: 진입점 (기존 Foundry 메인에 메뉴 추가)
- `/builder` 메인에 "AI 에이전트와 대화로 만들기 (신규)" 버튼
- 기존 "설문지로 빠르게 만들기" 버튼과 나란히
- 환경변수로 on/off (`NEXT_PUBLIC_AGENT_MODE_ENABLED`)

**Step D6**: 헤더/디자인 (기존 브랜딩 유지)
- Toss blue 색상 그대로
- 헤더: "🤖 AI 에이전트 빌더" (Pro Tier 같은 차별화 문구 X)

**검증 (Day 4 gate)**:
- 사장님 `/builder/agent` 접속
- 채팅창에 "미용실 예약앱 만들어줘" 입력
- 실시간으로 도구 호출 시각화됨
- 모호한 요청 시 선택지 카드 나타남
- 선택 클릭 → Agent 작업 재개
- 미리보기 iframe에 결과물 표시

---

### Day 5: E2E + 배포 + 안정화

**Step E1**: 시나리오 5개 테스트 (각 사장님이 직접)

| # | 시나리오 | 목적 |
|---|---|---|
| 1 | "할일 관리 앱" | 단순 case, 선택지 없이 바로 작업 가능한지 |
| 2 | "미용실 예약앱 만들어줘 예쁘게" | 실제 cpzm 시나리오 재현, 번역 미들웨어 검증 |
| 3 | "매출 분석 대시보드" | 차트/recharts 복잡 case |
| 4 | "뭐 하나 만들어줘" | 의도적 모호, 선택지 시스템 검증 |
| 5 | "방금 만든 앱에 다크모드 추가해줘" | 수정 iteration (현재는 시나리오 1 이어서) |

**Step E2**: 측정 지표
```
시나리오별:
- 소요 시간
- API 비용 (input/output tokens × 가격)
- 도구 호출 횟수
- F4 발생 수 (목표 0)
- 빌드 성공 여부
- 선택지 발동 횟수 + 고객이 느낀 유용성 (사장님 평가)
- 결과물 페이지 수
- 결과물 줄 수 (300줄 규칙 준수율)
```

**Step E3**: 에러 처리 보강
- max_iterations 초과 → "요구를 2~3개로 나눠주세요"
- Bash timeout → 안전 중단 + 재시도 버튼
- npm install 실패 → cache 재활용 + 재시도
- 선택지 무응답 5분 → 세션 정리 + 재시작 안내

**Step E4**: 배포
- main 브랜치 push
- GitHub Actions 자동배포 (`deploy.sh`)
- PM2 재시작
- 헬스체크: `/api/ai/agent-build/health`
- 환경변수 `AGENT_MODE_ENABLED=true` 서버에 설정

**Step E5**: 사장님 베타 + 피드백 수집
- 메인 메뉴에 "NEW" 배지 붙여서 노출
- 24~48시간 사용성 피드백
- intent-patterns.md / vague-detection.md 추가 보강
- 문제 시 환경변수로 즉시 비활성화

**검증 (Day 5 gate = 최종)**:
- 5개 시나리오 모두 build 성공
- 평균 비용 < $1/앱
- 평균 시간 < 10분
- 선택지 시스템이 최소 1회 자연스럽게 발동
- 사장님 평가: "내가 자비스랑 일하는 느낌이 든다"

---

## 5. 파일 스코프 (변경 예정)

### 신규 — 백엔드
```
api/src/agent-builder/
├── agent-builder.module.ts
├── agent-builder.controller.ts        (POST /api/ai/agent-build SSE + /answer)
├── agent-builder.service.ts           (Agent loop 코어)
├── agent-tools.ts                      (Bash/Write/Read/Glob/Grep/AskUser)
├── sandbox.service.ts                  (임시 디렉토리 + 권한)
├── stream-event.types.ts
└── intent-translator.service.ts       (선택지 발동 로직 헬퍼)
```

### 신규 — 번역 미들웨어 .md ⭐
```
api/src/ai/prompts/agent/
├── agent-core.md                      (Agent 행동 원칙, 300~400줄)
├── intent-patterns.md                 ⭐ 핵심 자산 (자연어→명령 매핑, 500~700줄)
├── vague-detection.md                 (모호 감지 규칙, 300줄)
└── selection-triggers.md              (선택지 발동 조건, 200줄)
```

### 신규 — 프론트엔드
```
web/src/app/builder/agent/
├── page.tsx                           (라우트 페이지)
└── components/
    ├── AgentChat.tsx                  (BuilderChat 확장)
    ├── ToolCallBlock.tsx              (도구 호출 시각화)
    ├── SelectionPrompt.tsx ⭐         (선택지 카드 UI)
    └── ProgressBar.tsx
```

### 수정 (최소화)
```
api/src/app.module.ts                  (AgentBuilderModule 등록 1줄)
api/src/ai/prompt-composer.service.ts  (composeForAgent 메서드 추가)
api/package.json                        (필요 시 fast-glob, redis 등 추가)
web/src/app/builder/page.tsx           (메뉴에 "AI 에이전트 빌더" 진입점 1개 추가)
```

### 재사용 (절대 수정 X — 격리)
```
api/src/ai/ai.service.ts               ⛔ 손대지 X (기존 빌더 엔진)
api/src/ai/prompts/core.md             ✅ 시스템 프롬프트로 재사용
api/src/ai/prompts/pages/*.md          ✅ Agent도 참조용으로 활용 가능
api/src/ai/prompts/patterns/*.md       ✅ Agent 시스템 프롬프트로 재사용
api/src/ai/prompts/components/*.md     ✅ Agent도 참조용으로 활용 가능
web/src/app/builder/components/BuilderChat.tsx     ✅ AgentChat 베이스
web/src/app/builder/components/BuilderPreview.tsx  ✅ 그대로 사용
```

---

## 6. 보안 / 샌드박스 (절대 양보 X)

### 필수
- ✅ Bash cwd = /tmp/foundry-agent-{...}/ 만 (chdir 금지)
- ✅ Write/Read 경로 검증: realpath().startsWith(allowedDir)
- ✅ 명령 allowlist (npm/npx/node/mkdir/rm 한정)
- ✅ 5분 timeout per Bash
- ✅ 100 iteration max per session
- ✅ 디스크 quota: 100MB per session
- ✅ 동시 세션 수 제한: 5 (서버 자원 보호)

### MVP 이후 추가
- Docker 컨테이너 격리
- 네트워크 제한 (npm registry만 허용)
- CPU/메모리 cgroup 제한

---

## 7. 테스트 전략

### Day별 게이트 (각 Day 끝에 사장님 승인 필수)

| Day | 게이트 조건 |
|---|---|
| 1 | Agent loop 3회 도구 호출 + hello.txt 생성 성공 |
| 2 | 사장님 "예쁜 미용실 예약앱" 입력 → intent-patterns.md 기반 정확 해석 (불필요 선택지 X) + "뭐 만들어줘" 입력 → 선택지 이벤트 emit |
| 3 | curl 시뮬레이션: 모호 입력 → 선택지 → 답변 POST → Agent 재개 → 작업 완료 |
| 4 | 사장님이 UI에서 채팅 → 도구 호출 시각화 + 선택지 클릭 정상 작동 |
| 5 | 5개 시나리오 모두 빌드 성공 + 평균 비용 < $1 + 사장님 평가 OK |

### 비용 게이트
- Day 1~3: 로컬 테스트 ($0.5 미만)
- Day 4: UI 통합 E2E 1~2회 ($1~2 예상)
- Day 5: 5개 시나리오 ($5~10)

**총 R&D 비용 ~$15 미만 예상** (Phase 0.5 v2와 동일 수준)

---

## 8. 롤백 전략

| 상황 | 롤백 방법 |
|---|---|
| 백엔드 깨짐 | git revert + Actions 자동 재배포 |
| Agent 무한루프 | max_iterations + DB 플래그로 중단 |
| 디스크 가득 | cron으로 매일 /tmp/foundry-agent-* 정리 |
| Sonnet 4.6 다운 | flash로 폴백 (현재 코드 재사용) |
| 보안 사고 | /builder/agent 라우트 즉시 비활성화 (env flag) |

**환경변수 킬스위치**:
```bash
AGENT_MODE_ENABLED=false  # 즉시 메뉴 비활성화
```

---

## 9. 성공 기준 (KPI)

### 기술 지표
| 지표 | 목표 |
|---|---|
| F4 발생 | 0건 (자비스처럼 파일 1개씩 Write) |
| 빌드 성공률 | ≥ 95% (매 단계 npm run build 검증) |
| 평균 비용/앱 | ≤ $1 |
| 평균 시간/앱 | ≤ 10분 |
| 의도 누락 | 0% (intent-patterns.md 매핑 + 선택지 보완) |

### "사장님-자비스 협업 재현" 지표 ⭐
| 지표 | 목표 |
|---|---|
| 사장님 평가 (정성) | **"내가 자비스랑 일하는 느낌"** |
| 선택지 발동 자연스러움 | 모호한 요구 시 100% 발동, 명확한 요구 시 0% (불필요 안 띄움) |
| 의도 정제 정확도 | 선택지 1~2회로 작업 시작 가능해야 함 (3회 이상 = 번역 미들웨어 부족) |
| 결과물 품질 | 페이지당 300줄 이하, Tailwind 정석, F4 없음 |

---

## 10. 위험 요소 + 대응

| 위험 | 가능성 | 대응 |
|---|---|---|
| Agent SDK 문서 부족 | 중 | 자비스 세션에서 webfetch + Anthropic 공식 cookbook 참조 |
| 샌드박스 보안 사고 | 중 | MVP는 사장님 베타만, 일반 공개는 Docker 도입 후 |
| Sonnet 4.6 도구 사용 미숙 | 낮 | 시스템 프롬프트에 도구 사용 가이드 명시 |
| SSE 연결 끊김 | 중 | 클라이언트 재연결 로직 + 세션 ID로 이어쓰기 |
| 비용 폭증 (도구 round trip) | 중 | iteration cap + cost 모니터링 알림 ($1 초과 시 중단) |
| npm install 너무 오래 | 중 | npm cache 미리 셋업 + pnpm 검토 |

---

## 11. 이후 로드맵 (Agent Mode 확장)

### v1 (이번 5일): 기본 협업 재현
- Agent SDK + 5개 도구 + 번역 미들웨어 + 선택지 시스템
- 신규 앱 생성만 지원
- 메뉴 추가 형태로 출시 (안전장치)

### v2 (1~2주 후): 기존 앱 수정 모드
- "방금 만든 앱에 다크모드 추가해줘" → Agent가 기존 코드 Read → 수정 → 빌드
- 사장님-자비스 협업 패턴 그대로

### v3 (1개월 후): 표준 빌더 통합
- v2 안정화 + 사장님 만족 → 기존 /builder deprecate
- /builder/agent → /builder로 전환
- 기존 설문지 모드 archive (코드 보존)

### v4 (분기 단위): 인텔리전스 강화
- intent-patterns.md 자동 학습 (사용 데이터로 매핑 보강)
- 선택지 자동 생성 (자주 묻는 패턴 인식)
- 도구 추가 (스크린샷, OCR, 외부 API)

### v5 (장기): Docker 샌드박스 + 멀티 Agent
- 격리 강화 (현재는 cwd 제한만)
- 디자이너 Agent + 백엔드 Agent 협업 (대형 앱 대응)

---

## 12. 자비스 → 명탐정 최종 명령 (새 세션 첫 메시지로)

```
파운더리 Agent Mode 작업 시작.

[먼저 읽을 파일 — 순서대로]
1. /Users/mark/세리온 ai전화예약+POS통합관리/CLAUDE.md
2. /Users/mark/세리온 ai전화예약+POS통합관리/memory/FOUNDRY_GUIDE.md
3. /Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260418_AGENT_MODE_PLAN.md ⭐ (이게 마스터)
4. /Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/api/src/ai/ai.service.ts (기존 엔진 — 손대지 X, 참조만)
5. /Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/api/src/ai/prompts/ (기존 .md 자산)

[작업 원칙 — 절대 어기지 X]
- 기존 /builder 라우트 손대지 X (격리)
- 기존 ai.service.ts 손대지 X (격리)
- 모든 신규 코드는 agent-builder/ 디렉토리 + prompts/agent/ 디렉토리만
- 환경변수 AGENT_MODE_ENABLED=false 기본 (사장님 승인 후 true)
- 어제 9커밋 한 번에 사고 패턴 X — 각 Step별로 commit

[5일 구성]
Day 1: ③ Agent SDK 실행 엔진 (자비스 도구 사용 패턴)
Day 2: ① 번역 미들웨어 (.md 4개 작성 — intent-patterns.md가 핵심)
Day 3: ② 선택지 옵션 시스템 (의도 정제 루프)
Day 4: 프론트엔드 통합 (UI + 시각화 + 선택지)
Day 5: E2E 5개 시나리오 + 배포

[각 Day 완료 시]
1. 자비스에게 더블체크 요청 (변경 파일 목록 + tsc 결과 + 게이트 검증)
2. 사장님 승인 대기
3. commit + push (Day별 1 커밋)
4. 다음 Day 시작

[Day 1 시작 명령]
"Agent Mode Day 1 시작. Step A1~A5 진행.
끝나면 'hello.txt 만들어줘' 테스트로 Agent 도구 호출 3회 확인 후 자비스에게 보고."

GO!
```

---

## 13. 비용/시간 예상 (자비스 추정)

| 단계 | 자비스 예상 | 명탐정 실제 (페이스 5x) |
|---|---|---|
| Day 1 | 8h | 1.5h |
| Day 2 | 8h | 1.5h |
| Day 3 | 8h | 2h |
| Day 4 | 8h | 1.5h |
| Day 5 | 8h | 2h |
| **합계** | **40h (1주)** | **~9h (1.5일)** |

비용:
- API R&D: $10~15
- 베타 테스트: $5
- 총: **$20 미만**

---

## 14. 마지막 한마디 (자비스 → 명탐정)

이 작업의 본질은 단 하나:

> **사장님이 자비스와 일하는 그 방식을, 고객이 Foundry와 일할 때 동일하게 느끼게 만드는 것**

그래서 핵심은 도구도 SDK도 아니고 **번역 미들웨어 (.md)**다. 
intent-patterns.md가 얼마나 정확하냐 = Foundry가 자비스만큼 똑똑해 보이냐를 결정한다.

기존 시스템 절대 안 깨도록 격리하면서, 새 메뉴 하나 추가.
실패해도 메인 기능 무사. 성공하면 Foundry 빌더의 정식 업그레이드.

차분히, 한 Step씩, 검증하면서. 
각 Day 게이트 통과 못 하면 다음 Day로 넘어가지 X.

GO!

---

## 부록 A. intent-patterns.md 작성 가이드 (Day 2 핵심)

### 사장님 정정 (필수)
> "카테고리화 하지말고!! 마누스처럼 대화만으로도 할수 있게 하면되는거 아닐까?
> 왜 한계를 만들고 시작해?"

→ **카테고리/매핑표 만들지 X. 자유 대화 기반.**

### 작성 원칙
1. **Agent에게 "사고 방식"을 가르친다** (행동 규칙 X)
2. **사장님-자비스 대화 패턴 자체를 모델링**
3. **무한 자연어 입력 처리 (마누스 수준)**
4. **카테고리·enum 절대 금지**
5. **Agent의 판단력을 신뢰**

### 작성 길이
**300~400줄 (간결하게)**. 매핑표 채우려고 800줄 만들지 X.
짧고 강한 원칙 > 길고 빈약한 enum.

### 작성 시간
**1~2시간**. (이전 가이드의 "4~6시간"은 카테고리 채우는 시간이었음. 자유 대화 방식은 짧다.)

### 핵심 섹션 (Step B3 본문 참조)
1. 너의 정체성 (사장님-자비스 협업 재현)
2. 의도 추론 원칙 (카테고리 X, 자체 판단)
3. 작업 원칙 (파일 1개씩, build 검증)
4. 예시 대화 3개 (참조용, 매핑표 X)
5. 도구 안내
6. 기술 스택 (고정값)
7. 절대 하지 말 것

### 검증 방법
intent-patterns.md 초안 작성 후, 사장님이 평소 자비스에게 던지는 말 5개를 시뮬레이션:
- "예약 앱 만들어줘"
- "여기 색깔 부드럽게"
- "뭐 하나 만들어줘"
- "다 다시 해"
- "잘 모르겠어 알아서"

→ Agent가 5개 모두 사장님-자비스 대화처럼 자연스럽게 처리 가능해야 함.
→ 카테고리 안 맞아서 못 한다고 하면 = 잘못 작성.

---

## 부록 B. 사장님 사용 시나리오 (자비스가 미리 시뮬레이션)

### 시나리오 A: 명확한 요구
```
사장님: "예쁜 미용실 예약앱 만들어줘"
Agent: (intent-patterns.md → 미용실 + 예쁜 = Tailwind 모던 + 7개 페이지 셋)
       (선택지 발동 X — 이미 충분)
       💻 npx create-next-app cpzm-v2
       📝 supabase/migrations/001_init.sql 작성
       (사장님이 SQL 한 번 실행)
       📝 app/page.tsx
       📝 app/reservations/page.tsx
       ... (10개 파일)
       💻 npm run build
       ✅ 빌드 성공
       🌐 미리보기: foundry.ai.kr/preview/cpzm-v2
       
시간: 8분 / 비용: $0.7
```

### 시나리오 B: 모호한 요구
```
사장님: "뭐 하나 만들어줘"
Agent: (vague-detection.md → 업종/기능 모두 미정 → 선택지 발동)
       
       [선택지 카드]
       어떤 업종의 앱을 만드시나요?
       [미용실/네일샵] [병원/의원] [카페/식당] [쇼핑몰] [기타]
       
사장님: "쇼핑몰" 클릭
Agent: (intent-patterns.md → 쇼핑몰 = 상품 + 주문 + 결제 페이지)
       
       [선택지 카드]
       결제는 어떻게 받으실 건가요?
       [토스페이먼츠] [카카오페이] [무통장 입금] [일단 결제 없이]
       
사장님: "일단 결제 없이"
Agent: 작업 시작...

시간: 10분 / 비용: $0.9
```

### 시나리오 C: 수정 요청
```
사장님: "여기 헤더 색깔 좀 더 부드럽게"
Agent: 📖 Read app/layout.tsx
       (현재: bg-blue-600 → 부드러움 = blue-400 or sky-400)
       
       [선택지 카드 - 미세조정]
       어떤 색이 좋을까요?
       [하늘색 sky-400] [연한 파랑 blue-400] [민트 emerald-400]
       
사장님: "민트"
Agent: 📝 Edit app/layout.tsx (bg-blue-600 → bg-emerald-400)
       💻 npm run build
       ✅ 미리보기 갱신

시간: 30초 / 비용: $0.05
```

이 3개 시나리오가 자연스럽게 작동하면 = Foundry Agent Mode 성공.
