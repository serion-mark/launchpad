# Phase 12: "돈 받을 수 있는 제품" — 4/1 전 급한 것

> **마일스톤**: 모두의 창업 공급기업 심사 + 실결제 가능한 상태
> **선행 조건**: Phase 11.5 완료 (AI 회의실 순차누적형 + 특허 구조 전체 구현)
> **목표 기한**: 4/1 전

---

## Phase 11.5에서 이미 완료된 것 (Phase 12에서 제외)

```
✅ AI 회의실 사전 질문 단계 — Haiku가 방향 확인 질문, preAnswers 브리핑 주입
✅ 핑퐁 과정 단계별 표시 — Gemini→GPT→Claude 프로그레스 바 + ping 애니메이션
✅ 보고서 후 채팅 이어가기 — 💬 채팅(Claude) / 🔍 추가 분석(3AI 핑퐁)
✅ Gemini 429 graceful fallback — 실패 시 조용히 건너뛰고 GPT+Claude로 완료
✅ 공감/반박/새관점 형식 강제 — ✅/❌/💡 명시적 구분
✅ 브리핑 편향 제거 — Haiku는 요약만, 각 AI가 원본 직접 분석
✅ 특허 순차누적형 구조 전체 구현 (S100~S700 전부 ✅)
✅ PDF 파서 서버사이드 (poppler pdftotext)
✅ React hydration #418 수정
✅ 에러 메시지 한글화
✅ Claude 모델 ID 수정 (claude-sonnet-4)
✅ 모델 선택 UI 제거 → Smart 고정 (Phase 9에서 완료)
```

---

## 1. Foundry 로고 클릭 시 메인 이동 안 됨

**현재 문제**: /start 등에서 좌측 상단 "Foundry" 로고 클릭 시 메인(/)로 이동 안 됨
**수정**: 로고에 `<Link href="/">` 적용. 모든 페이지에서 로고 클릭 → 메인 이동 보장
**파일**: `web/src/app/start/page.tsx` 또는 공통 헤더 컴포넌트

---

## 2. 마크다운 렌더링 개선

**현재**: AI 회의실 보고서가 whitespace-pre-wrap (원본 텍스트)
**개선**: react-markdown 적용 → 볼드, 리스트, 테이블 등 깔끔하게 렌더링
**파일**: `web/src/app/meeting/page.tsx`

---

## 6. 크레딧 충전제 UI + 가격 구조

**현재**: 패키지(라이트/스탠다드/프로)만 구매 가능
**추가할 것**:
1. 크레딧 단위 구매 (부족할 때 추가 충전):
   - 1,000cr: 12,000원
   - 3,000cr: 33,000원 (10% 할인)
   - 5,000cr: 50,000원 (17% 할인)
   - 10,000cr: 90,000원 (25% 할인)
2. 패키지 업그레이드:
   - 라이트 → 스탠다드: 110,000원 (차액+보너스)
   - 스탠다드 → 프로: 120,000원 (차액+보너스)
3. 크레딧 잔액 부족 시 "크레딧 충전" 안내 자동 표시
**파일**: `web/src/app/credits/page.tsx` + `api/src/credit/credit.service.ts`
**이유**: 모두의 창업 프로젝트 창업자가 한도(월 100만원) 내에서 유연하게 조합 가능

**⭐ 상세 설계**: `memory/PRICING_REPORT_2026-03-23.md` 참고 (요금제 전체 구조 + UI 가이드 + DB 스키마 + API + 구현 순서 포함)

---

## 7. 이용약관 면책 조항 + 환불 규정 + 데이터 보관 정책

**현재**: /terms, /privacy 기본 수준
**추가할 것**:
1. 면책 조항:
   - "Foundry는 MVP 초안 생성 도구이며, 100% 무결점 구동을 보장하지 않습니다"
   - "각 플랫폼(카카오/네이버 등)의 정책 변경에 의한 오류는 책임지지 않습니다"
   - AI 챗봇 응답에도 고지 포함
   - 앱 생성 시 "이 앱은 MVP 초안입니다" 안내
2. 환불/취소 규정:
   - 미사용 크레딧: 구매 후 7일 이내 + 미사용 시 전액 환불
   - 사용 중인 크레딧: 환불 불가 (사용분 차감 후 잔액만 환불)
   - 독립 패키지: 다운로드 전 취소 가능, 다운로드 후 환불 불가
   - 호스팅: 월 단위, 중도 해지 시 잔여일 환불 없음
3. SLA 명시:
   - "빌드 성공률 80% 이상 목표" (보장은 아님)
   - "서비스 가용률 99% 목표"
4. 데이터 보관 정책 (약관 필수!):
   - "30일간 미접속 프로젝트의 빌드 파일은 자동 정리됩니다"
   - "소스코드는 DB에 보존되며, 재방문 시 자동 복구됩니다"
   - "호스팅 결제 중인 프로젝트는 자동 정리 대상에서 제외됩니다"
   - "'오래 보관하기' 설정 시 자동 정리되지 않습니다"
   - 정리 7일 전 이메일 사전 안내 필수!
**파일**: `web/src/app/terms/page.tsx`, `web/src/app/refund/page.tsx` (신규)
**이유**: 모두의 창업 공급기업 심사 시 신뢰도 향상 + 정부사업비 고객 민원 방어

---

## 10. 메모리 시스템 — 고객이 다시 와도 AI가 기억하는 기능 (핵심!!!)

**왜 중요한가**:
- 현재: 고객이 다음에 접속하면 AI가 아무것도 모름 → 처음부터 다시 설명
- 목표: "아 이 분 펫돌봄 앱 만들던 분이지, 매칭 기능 추가하고 싶다고 했었지" → 바로 이어서

**⚠️ 구현 시 주의 — 순차 누적형으로 만들 것!! (병렬 X)**
Phase 11.5에서 AI 회의실을 병렬로 조립해놨다가 사장님이 발견해서 순차 누적으로 고친 전례 있음 (커밋 21d33e6).
메모리도 마찬가지 — 단순히 "이전 대화 저장"이 아니라 "누적되면서 깊어지는 구조"여야 함.

**DB 스키마**:
```prisma
// 프로젝트별 메모리 (앱 단위)
model ProjectMemory {
  id          String   @id @default(cuid())
  projectId   String   @unique
  project     Project  @relation(fields: [projectId], references: [id])

  // 스마트 분석 결과 (앱 생성 전 시장조사/벤치마크)
  marketData    Json?
  benchmarkData Json?

  // 대화 요약 — 매 대화 끝날 때 Haiku가 자동 요약해서 누적
  // ⚠️ 덮어쓰기가 아니라 누적! 이전 요약 + 새 요약 = 합쳐서 저장
  chatSummary   String?  // "매칭 추가 요청(3/22), 파란색 선호(3/23), 결제 2단계로 미룸(3/23)"

  // 사용자 선호 (자동 학습)
  preferences   Json?    // { style: "깔끔한 UI", color: "파란색", priority: "매칭 > 리뷰 > 결제" }

  // 수정 히스토리
  modHistory    Json?    // [{ version: 1, change: "초기 생성" }, { version: 2, change: "매칭 추가" }]

  updatedAt   DateTime @updatedAt
}

// 유저 레벨 메모리 (모든 프로젝트 공통)
model UserMemory {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])

  // 선호 스타일 (모든 프로젝트에 적용)
  designPref    Json?    // { color: "파란색 계열", font: "깔끔", layout: "미니멀" }

  // 업종/분야
  domain        String?  // "반려동물", "교육" 등

  // AI 회의실 히스토리 요약
  meetingSummary String?  // "시장분석 2회(3/22), 사업계획서 평가 1회(3/23)"

  updatedAt   DateTime @updatedAt
}
```

**메모리 자동 업데이트 로직 — 순차 누적형!!**:
```
매 대화 끝날 때 (자동 실행):
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: 이번 대화 내용 추출
  → 사용자가 보낸 메시지 + AI 응답 전체

Step 2: Haiku에게 요약 요청 (저렴! $0.0005)
  프롬프트: "이 대화에서 기억할 것 3줄로 요약해줘.
           기존 메모리: {기존 chatSummary}
           이번 대화: {대화 내용}
           기존 메모리에 이번 내용을 추가해서 통합 요약해줘.
           절대 기존 내용을 삭제하지 마."

Step 3: 기존 메모리 + 새 요약 병합
  ⚠️ 핵심: 덮어쓰기 X → 누적 O
  기존: "매칭 추가 요청(3/22)"
  새로: "매칭 추가 요청(3/22), 결제 기능 2단계로 미룸(3/23)"

Step 4: DB 저장

비용: Haiku 요약 = 대화당 ~$0.0005 (거의 무료)
```

**메모리 주입 (매 대화 시작할 때)**:
```
AI 시스템 프롬프트에 자동 삽입:
━━━━━━━━━━━━━━━━━━━━━━━━━━━

"[프로젝트 메모리]
이 사용자의 프로젝트 '펫돌봄 매칭앱' 기억:
- 매칭 기능 추가 요청 (3/22)
- 결제 기능은 2단계로 미룸 (3/23)
- 파란색 계열 선호 (3/23)
- 디자이너 선호: 깔끔한 UI, 미니멀

[사용자 메모리]
- 반려동물 업종
- 파란색 계열 선호
- AI 회의실에서 시장분석 2회 진행

이 맥락을 기반으로 대화하세요.
이전 대화 내용을 아는 것처럼 자연스럽게."
```

**적용되는 곳 전부**:
```
1. 빌더 채팅 (앱 수정할 때)
   "아까 말한 기능 추가해줘"
   → AI: "매칭 알고리즘 말씀이시죠? 추가할게요"

2. AI 회의실 (브레인스토밍할 때)
   "우리 앱 시장성 다시 분석해줘"
   → AI: "펫돌봄 매칭 앱이죠. 지난번에 동네 기반이 핵심이라고 나왔는데,
          이번에는 어떤 관점으로 볼까요?"

3. 스마트 분석 (앱 생성 전)
   2번째 앱 만들 때:
   → AI: "이전에 펫돌봄 앱 만드셨잖아요. 이번에도 비슷한 구조 쓸까요?"

4. 사업계획서 평가 (AI 회의실에서 2번째 평가할 때)
   → AI: "지난번 평가에서 재무계획이 5/10이었는데,
          이번 수정본에서 개선됐는지 집중 평가할게요"
```

**Lovable과의 차별점**:
```
Lovable: 매번 리셋 → 도구 느낌
Foundry: 기억함 → 동업자 느낌 (사장님이 나한테 느끼는 것!)
```

**API**:
```
# 메모리 조회 (프로젝트)
GET /memory/project/:projectId
  → { chatSummary, preferences, modHistory, marketData }

# 메모리 조회 (유저)
GET /memory/user
  → { designPref, domain, meetingSummary }

# 메모리 업데이트 (대화 끝날 때 자동 호출)
POST /memory/update
  body: { projectId, conversation: [...], type: 'chat' | 'meeting' }
  → Haiku 요약 → DB 누적 저장

# 메모리 시스템 프롬프트 생성 (AI 호출 전 내부 사용)
GET /memory/context/:projectId
  → "이 사용자의 프로젝트 기억: ..." (시스템 프롬프트용 텍스트)
```

**파일**:
- `api/src/memory/memory.service.ts` (신규)
- `api/src/memory/memory.controller.ts` (신규)
- `api/src/memory/memory.module.ts` (신규)
- `api/src/ai/ai.service.ts` — AI 호출 전 메모리 컨텍스트 주입
- `api/src/ai/meeting.service.ts` — 회의실에서도 메모리 주입
- `web/src/app/builder/page.tsx` — 대화 끝날 때 메모리 업데이트 호출
- Prisma 스키마 — ProjectMemory, UserMemory 모델 추가
