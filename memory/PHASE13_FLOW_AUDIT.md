# Phase 13 플로우 감사 보고서 — 2026-03-24

> **문제**: /start→/builder 질문지 중복 + 스마트 분석 결과 전달 안 됨
> **심각도**: 🔴 Critical (Foundry 핵심 플로우 꼬임, 크레딧 낭비)
> **커밋**: 3831fa7

---

## 체크 1: /start 페이지 플로우

| 단계 | 데이터 흐름 | 저장 위치 | 상태 |
|------|-----------|----------|------|
| 템플릿 선택 | `selectedTemplate` | React state | ✅ |
| 질문지 Q1~Q6 | `answers` | React state | ✅ |
| 스마트 분석 | `smartAnalysis.results` | React state | ✅ |
| "앱 생성" 클릭 | POST /projects | DB Project | **수정 완료** |

### 🔴 발견된 문제 (수정 전)
```
POST /projects body에 answers가 없었음!
features: { selected: [...], themeId: '...' }  ← answers 누락!
description: '...(스마트 분석 결과)...'        ← 이건 있었음
```

### ✅ 수정 후
```
features: {
  selected: [...],
  themeId: '...',
  answers: { biz_name: '소개팅앱', ... },     ← 추가!
  readyToGenerate: true,                       ← 추가! (질문지 스킵 신호)
  smartAnalysisResults: { market, benchmark, optimization }, ← 추가!
}
description: '...(스마트 분석 결과)...'
```

---

## 체크 2: /builder 페이지 플로우

| 단계 | 데이터 흐름 | 상태 |
|------|-----------|------|
| projectId로 프로젝트 로드 | GET /projects/:id | ✅ |
| chatHistory 확인 | `data.chatHistory` | ✅ |
| **answers 있으면 질문지 스킵** | `features.readyToGenerate` | **수정 완료** |
| 코드 생성 | POST /ai/generate-app-sse | ✅ |

### 🔴 발견된 근본 원인
```javascript
// 228줄: chatHistory 없으면 무조건 질문지 시작!
} else {
  setBuildPhase('questionnaire');  // ← 여기가 범인!
  setQuestionIndex(0);
}
```

/start에서 프로젝트를 새로 만들면 chatHistory=null → /builder에서 항상 Q1부터!

### ✅ 수정: 3단 분기
```javascript
if (data.chatHistory?.length > 0) {
  // 기존 작업 이어하기 (done/generating/designing)
} else if (data.features?.readyToGenerate && data.features?.answers) {
  // /start에서 넘어온 경우 → 질문지 스킵 → 자동 코드 생성!
  setAnswers(data.features.answers);
  setAutoGenerate(true);
} else {
  // 순수 새 프로젝트 → 질문지 시작
  setBuildPhase('questionnaire');
}
```

### 자동 생성 안전장치
```javascript
// useEffect: answers 세팅 완료 후 자동 생성
useEffect(() => {
  if (autoGenerate && Object.keys(answers).length > 0 && projectId) {
    setAutoGenerate(false);
    handleGenerate();  // answers state가 확실히 세팅된 후 실행
  }
}, [autoGenerate, answers, projectId]);
```

---

## 체크 3: 미리보기 컴포넌트

| 상태 | 미리보기 소스 | 비고 |
|------|-------------|------|
| 생성 전 | 템플릿별 인터랙티브 목업 | OK (하드코딩이지만 생성 전이므로 괜찮음) |
| 생성 중 | SSE streamingFiles → LivePreview | ✅ 실시간 갱신 |
| 생성 후(미배포) | generatedCode → LivePreview | ✅ 실제 코드 기반 |
| 생성 후(배포됨) | **iframe src={deployedUrl}** | ✅ 이전 수정에서 추가 |

**"하드코딩 목업 문제"**: 생성 전 인터랙티브 미리보기가 미용실 POS 목업으로 보이는 건 맞지만, 이건 생성 전이라 정상. 코드 생성 완료 후에는 LivePreview/iframe으로 실제 앱이 표시됨.

---

## 체크 4: 스마트 분석 파이프라인

| 단계 | 엔드포인트 | 모델 | 결과 저장 | 상태 |
|------|----------|------|---------|------|
| 시장 분석 | POST /ai/smart-analysis-sse | Gemini | state → features | ✅ |
| 벤치마크 | (동일 SSE) | GPT | state → features | ✅ |
| 설계 최적화 | (동일 SSE) | Claude | state → features | ✅ |
| 결과 → 프롬프트 | generateFullApp() | - | description → 프롬프트 | ✅ (이전 수정) |

### 데이터 흐름 (수정 후)
```
/start state → POST /projects features + description → DB
  ↓
/builder 로드 → features.smartAnalysisResults 확인
  ↓
handleGenerate() → POST /ai/generate-app-sse (answers 포함)
  ↓
api/ai.service.ts generateFullApp()
  → projectData.description에서 [스마트 분석 결과] 추출
  → 아키텍처 프롬프트에 주입
  → 프론트엔드 프롬프트에 주입
```

---

## 체크 5: 크레딧 플로우

| 항목 | 차감 시점 | 이중 차감 가능성 | 상태 |
|------|---------|--------------|------|
| 스마트 분석 (200cr) | 분석 시작 시 서버에서 차감 | 없음 (1회 호출) | ✅ |
| 앱 생성 (동적) | 생성 완료 후 서버에서 차감 | **수정 후 없음** | ✅ |
| AI 회의실 (300cr) | 회의 시작 시 | 없음 | ✅ |

**질문지 중복 → 이중 차감 가능성**: 수정 전에는 /builder에서 질문지 다시 하고 또 생성하면 크레딧 2번 차감 가능. 수정 후에는 /start에서 넘어오면 바로 생성이므로 1번만 차감.

---

## 수정 파일

```
web/src/app/start/page.tsx    — answers + readyToGenerate + smartAnalysisResults 전달
web/src/app/builder/page.tsx  — readyToGenerate 인식 → 질문지 스킵 → autoGenerate
```

## tsc 검증
- API: 0 에러 ✅
- Web: 0 에러 ✅
- 배포: 성공 (29초) ✅

---

## 테스트 체크리스트 (사장님용)

### 핵심 시나리오
- [ ] /start → 템플릿 선택 → 질문지 완료 → "앱 생성" 클릭
- [ ] /builder로 이동 → 질문지 안 나오고 바로 코드 생성 시작되는지!
- [ ] 스마트 분석 후 생성 → 분석 결과가 앱에 반영되는지

### 비교 테스트
- [ ] "소개팅앱" → 프로필 카드 + 매칭 + 채팅 나오는지
- [ ] "딸기농장" → 상품 + 장바구니 나오는지
- [ ] 두 앱이 다르게 나오는지!

### 크레딧 확인
- [ ] 스마트 분석 200cr 1번만 차감되는지
- [ ] 앱 생성 크레딧 1번만 차감되는지 (이중 차감 없는지)

---

## 남은 이슈 (추후)

| 이슈 | 심각도 | 비고 |
|------|--------|------|
| 생성 전 미리보기가 미용실 목업 | 🟡 | 생성 전이므로 정상이지만, 템플릿별 목업이면 더 좋음 |
| SSE 타임아웃 없음 (meeting) | 🟡 | 10분+ 대기 시 무한 대기 가능 |
| GitHub 토큰 평문 저장 | 🟡 | 가맹점 확장 전 암호화 필요 |
