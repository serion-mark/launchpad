# 크레딧 전면 수정 + 24시간 무료 체험 배포

> 2026-03-24 | API 실측 기반 크레딧 재설계 | tsc 0 에러

---

## 변경 요약

| # | 작업 | 상태 |
|---|------|------|
| 1 | 백엔드 크레딧 차감량 전면 수정 | ✅ |
| 2 | /pricing 가격표 전면 재설계 | ✅ |
| 3 | 크레딧 사전 안내 UI (앱생성/수정/대시보드) | ✅ |
| 4 | 24시간 무료 체험 배포 | ✅ |
| 5 | 랜딩/가이드/크레딧 페이지 가격 동기화 | ✅ |
| 6 | tsc 빌드 검증 | ✅ 0 에러 |

---

## 1. 크레딧 차감량 (API 실측 기반)

### 확정 크레딧표
| 기능 | 이전 | 변경 후 | 근거 |
|------|------|---------|------|
| 앱 생성 | 222cr (버그!) → 3,000cr | **6,800cr** | API $2.45 → 마진95% |
| AI 회의실 스탠다드 | 300cr | **300cr** (유지) | API $0.11 |
| AI 회의실 프리미엄 | 1,500cr | **1,000cr** | 적정가 |
| 스마트 분석 | 200cr | **300cr** | 인상 |
| AI 수정 (단순) | 500cr 일괄 | **100cr** | 텍스트/색상/이미지 |
| AI 수정 (복잡) | 500cr 일괄 | **500cr** | 페이지/기능/DB/API |
| AI 대화 | 무료 | **30cr** | 신규 |
| 서버 배포 | 8,000cr | **0cr** | 24h 무료 체험 도입 |

### 단순/복잡 구분 (키워드 기반)
- **단순 (100cr)**: 색, 색상, 텍스트, 문구, 글자, 이미지, 사진, 로고, 폰트, 크기, 바꿔, 변경
- **복잡 (500cr)**: 추가, 생성, 만들어, 연동, 결제, 페이지, 기능, DB, 테이블, API, 레이아웃, 구조, 삭제, 제거
- 함수: `classifyModifyCost()` (credit.service.ts)

### 패키지 변경
| 패키지 | 이전 | 변경 후 |
|--------|------|---------|
| 라이트 | 5,000cr / 49,000원 | 5,000cr / 49,000원 (유지) |
| 스탠다드 | 20,000cr / 149,000원 | 20,000cr / 149,000원 (유지) |
| 프로 | 50,000cr / 249,000원 | 50,000cr / **299,000원** |
| micro/mini | 1,000cr/3,000cr | **삭제** |
| 회원가입 보너스 | 500cr | **1,000cr** |

---

## 2. /pricing 가격표 재설계

- 3개 패키지: 라이트/스탠다드/프로
- 각 패키지에 "이걸로 할 수 있는 것" 예시 추가
- 기능별 크레딧 사용량 표 (아이콘 + 카드 UI)
- "배포: 월 29,000원 (24시간 무료 체험 포함!)" 강조
- FAQ에 단순/복잡 구분 설명 추가

---

## 3. 크레딧 사전 안내 UI

### A. 앱 생성 전 확인 모달
```
🚀 앱 생성
앱 생성 비용: 6,800 cr
현재 잔액: XX,XXX cr
생성 후 잔액: XX,XXX cr
🎉 생성 완료 후 24시간 무료 체험 배포가 자동 제공됩니다!
[취소] [6,800cr 생성 시작]
```
- 잔액 부족 시: 빨간색 경고 + "크레딧 충전하기" 링크
- 버튼 disabled 처리

### B. AI 수정 후 잔액 표시
```
✅ 100cr 사용 | 잔액: 13,200cr
```

### C. 대시보드 상단 잔액
```
💰 XX,XXXcr [충전하기]
```
- 노란색 배지로 항상 표시
- 클릭하면 /credits 이동

---

## 4. 24시간 무료 체험 배포

### 구현
1. `deploy.service.ts`에 `deployTrial()` 메서드 추가
2. SSE 생성 완료 시 `ai.controller.ts`에서 자동 호출
3. `projectContext.trialDeployed` / `projectContext.trialExpiresAt`에 저장
4. SSE done 이벤트에 `trialDeploy` 정보 포함 → 프론트에서 표시

### 생성 완료 메시지
```
🎉 24시간 무료 체험 배포 중!
🔗 https://[앱이름].foundry.ai.kr
⏰ 체험 종료: 2026-03-25 14:30
지금 바로 앱을 확인해보세요!
```

### 향후 추가 필요 (크론잡)
- 12시간 후 알림
- 23시간 후 긴급 알림
- 24시간 후 비공개 처리 (코드 보존)

---

## 5. 수정 파일 목록

```
api/src/credit/credit.service.ts   — 크레딧표 + 단순/복잡 구분 + 패키지 + 보너스
api/src/ai/ai.service.ts           — minCost 6800 + modifyCost 분류
api/src/ai/ai.controller.ts        — 체험 배포 트리거 + DeployService DI
api/src/ai/ai.module.ts            — ProjectModule import (순환 의존성 해결)
api/src/project/deploy.service.ts  — deployTrial() 메서드
api/prisma/schema.prisma           — 주석 추가 (projectContext 활용)
web/src/app/builder/page.tsx       — 생성 확인 모달 + 수정 잔액 표시 + 체험 배포 안내
web/src/app/dashboard/page.tsx     — 크레딧 잔액 표시
web/src/app/pricing/page.tsx       — 전면 재설계
web/src/app/credits/page.tsx       — 패키지/크레딧표 동기화
web/src/app/page.tsx               — 랜딩 가격 동기화 + 1,000cr 보너스
web/src/app/guide/page.tsx         — FAQ 동기화
```

## 빌드 결과
```
web: tsc --noEmit ✅ 0 에러
api: tsc --noEmit ✅ 0 에러
```

## 크레딧 차감 로직 검증 (사장님 질문 답변)

| 기능 | 차감 위치 | 차감 방식 | 검증 |
|------|-----------|-----------|------|
| 앱 생성 | ai.service.ts:1210 | deductByModel(minCost:6800) | ✅ |
| AI 수정 | ai.service.ts:1335 | deductByModel(minCost:classifyModifyCost) | ✅ |
| AI 회의실 | ai.controller.ts:288,320 | deduct(meeting_standard/premium) | ✅ |
| 스마트 분석 | ai.controller.ts:373 | deduct(smart_analysis_standard) | ✅ |
| AI 이미지 | ai.controller.ts:415 | deduct(image_generate) | ✅ |
| 코드 다운로드 | builder/page.tsx | 클라이언트 잔액 체크 | ⚠️ 서버 차감 확인 필요 |
| AI 대화 | — | 미구현 (30cr) | ⚠️ 다음 세션 |

### ⚠️ 아직 미구현
1. AI 대화(30cr) 차감 — 빌더 채팅에서 done 상태 일반 대화 시
2. 체험 만료 크론잡 — 24시간 후 비공개 처리
3. 12시간/23시간 알림
4. 크레딧 부족 시 API 에러 한글화
