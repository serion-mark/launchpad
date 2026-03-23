# Phase 11.5 작업 보고서
**작업일**: 2026-03-23
**작업 범위**: AI 회의실 고도화 + Phase 11 미완료 5건 완료

---

## ✅ 완료 (12건)

### 1. Phase 11 미완료 해소 (5건)

| # | 작업 | 내용 | 커밋 |
|---|------|------|------|
| 1 | Gemini 429 재시도 | callGoogle() 사전 2초 딜레이 + 10s/20s/30s 백오프 최대 3회 | 06cd8a3 |
| 2 | AI 회의실 사전 질문 | POST /ai/meeting-pre-question (Haiku), 방향 확인 UI + preAnswers 브리핑 주입 | 06cd8a3 |
| 3 | PDF 파서 서버사이드 | pdftotext(poppler) 설치, POST /ai/parse-pdf (FileInterceptor), PDF accept 추가 | 46f83c9 |
| 4 | 에러 메시지 한글화 | AllExceptionsFilter 상태코드별 한글 매핑 (429→"요청 많아요", 500→"일시적 문제") | 06cd8a3 |
| 5 | React hydration #418 | getToken() 직접 렌더링 → useEffect+useState(isLoggedIn) 전환 | 06cd8a3 |

### 2. AI 회의실 안정화 (3건)

| # | 작업 | 내용 | 커밋 |
|---|------|------|------|
| 6 | Gemini 실패 시 계속 진행 | 429 에러 → 조용히 건너뛰고 GPT+Claude로 회의 완료 | a55507f |
| 7 | Claude 모델 ID 수정 | claude-sonnet-4-5 → claude-sonnet-4 (API 키 404 해결) | 23f30d7 |
| 8 | 진행 단계 표시 | Gemini→GPT→Claude→최종종합→보고서 프로그레스 바 + ping 애니메이션 | 76193bc |

### 3. AI 회의실 기능 추가 (4건)

| # | 작업 | 내용 | 커밋 |
|---|------|------|------|
| 9 | 추가 채팅 + 추가 분석 분리 | 💬 채팅(Claude, 바로 답변) / 🔍 추가 분석(AI 3개, 방향 확인→3AI 핑퐁) | 231f690 |
| 10 | 브리핑 편향 제거 | Haiku 분석X → 요약+정리만. 각 AI가 원본 자료(8000자) 직접 분석 | 69b784d |
| 11 | 특허 순차누적형 구조 정렬 | Gemini(독립) → GPT(+Gemini 누적) → Claude(+전체 누적) → 최종 종합 | 21d33e6 |
| 12 | 공감/반박/새관점 형식 강제 | GPT: "Gemini가 ~라 했는데 ✅공감/❌반박", Claude: "이전 AI들의 ~에 ✅/❌/💡/🎯" | 53cb1aa |

---

## 현재 AI 회의실 전체 흐름

```
[사전 질문] Haiku가 방향 확인 질문 생성 → 사용자 답변(선택)
     ↓
[S100 브리핑] Haiku — 자료 요약 + 요청 정리만 (분석/평가 안 함)
     ↓
[S200 Gemini 1차] [원본] → 독립 분석 (실패 시 조용히 건너뛰기)
     ↓
[S300 GPT 2차] [원본 + Gemini] → ✅공감/❌반박/💡새관점/📊분석
     ↓
[S400 Claude 3차] [원본 + Gemini + GPT] → ✅공감/❌반박/💡보완/🎯종합판단
     ↓
[Claude 최종 종합] [원본 + 전체] → 합의점/쟁점/보완/결론+액션아이템
     ↓
[S500 쟁점 추출] 프리미엄만 — 의견 불일치 자동 추출
     ↓
[S600 핑퐁 토론] 프리미엄만 — 쟁점별 왕복 토론
     ↓
[S700 보고서] Haiku — 최종 종합 보고서
     ↓
[추가 채팅] 💬 채팅(Claude) / 🔍 추가 분석(AI 3개)
```

### 특허 대비 구현 현황

| 특허 단계 | 구현 | 상태 |
|---------|------|------|
| S100 브리핑 (Haiku) | 요약+정리만, 분석 안 함 | ✅ |
| S200 1차 독립 분석 | Gemini [원본] | ✅ |
| S300 2차 누적 분석 (공감/반박) | GPT [원본+Gemini] | ✅ |
| S400 3차 누적 종합 | Claude [원본+Gemini+GPT] | ✅ |
| S500 쟁점 자동 추출 | Haiku 파싱 | ✅ |
| S600 쟁점 핑퐁 토론 | GPT+Gemini 왕복 | ✅ |
| S700 보고서 자동 생성 | Haiku | ✅ |
| 비용 단계화 | Haiku(전처리/후처리) + Sonnet(분석) | ✅ |
| 서비스 등급 차등화 | 스탠다드(300cr) / 프리미엄(1500cr) | ✅ |
| 페르소나 부여 | 시장분석가/데이터분석가/전략종합가 | ✅ |
| 순차 누적 컨텍스트 확장 | 뒤로 갈수록 입력 누적 | ✅ |
| 공감/반박 명시적 구분 | 형식 강제 (✅/❌/💡) | ✅ |

---

## 🟡 보완 필요 (테스트 후 확인)

| # | 항목 | 현재 상태 | 해결 조건 |
|---|------|---------|---------|
| 1 | Gemini 무료 rate limit | 건너뛰기로 대응 중 | Gemini API 유료 전환 |
| 2 | 대용량 파일 크레딧 안내 | 코드 완료 (8000자 초과 시 ⚠️ 표시) | 대용량 PDF 실제 테스트 |
| 3 | 추가 분석(3AI 핑퐁) | 코드 완료 | Gemini rate limit 풀린 후 테스트 |
| 4 | 마크다운 렌더링 | whitespace-pre-wrap (원본 텍스트) | react-markdown 적용 검토 |
| 5 | 대용량 파일 제한 확대 | maxFileLen=8000 | Gemini 유료 후 50000으로 확대 (메모 저장됨) |

---

## 🔴 미완료 (외부 의존)

| # | 항목 | 이유 |
|---|------|------|
| 1 | TOSS_SECRET_KEY | 토스 심사 완료 후 서버 .env 설정 |
| 2 | 호스팅 방문자 카운터 | nginx 연동 필요 |
| 3 | 호스팅 플랜 결제 연동 | 토스빌링 연결 필요 |

---

## 수정된 파일 목록

### API (api/)
- `src/llm-router.ts` — Gemini 재시도 + 모델 ID 수정
- `src/ai/meeting.service.ts` — 순차누적형 구조 전면 개편
- `src/ai/ai.controller.ts` — PDF 파싱 + 사전질문 + 채팅/분석 엔드포인트
- `src/all-exceptions.filter.ts` — 에러 메시지 한글화
- `package.json` — @types/multer 추가

### Web (web/)
- `src/app/meeting/page.tsx` — 사전질문 UI + 프로그레스 바 + 채팅/분석 분리 + hydration 수정

### 서버
- `poppler-utils` 설치 (pdftotext)

### 메모리
- `memory/meeting_todo.md` — Gemini 유료 전환 시 작업 메모
- `memory/PHASE11_5_REPORT.md` — 본 보고서
