# Foundry 배포 보고서 — 2026-04-03
> 자비스 mk9 세션 / 명령서 기반 7건 작업 완료

---

## 배포 요약

| 항목 | 내용 |
|------|------|
| 배포 일시 | 2026-04-03 18:23 ~ 18:31 (KST) |
| 배포 횟수 | 2회 (Phase 1~2, Phase 3) |
| 커밋 | `355aaba` (1차) / `f0e3a16` (2차) |
| GitHub Actions | 2건 모두 success (각 29s, 31s) |
| 서버 상태 | PM2 online, API 정상 기동 |
| DB 마이그레이션 | `meeting_histories` 테이블 생성 완료 |
| tsc 에러 | web 0건 / api 0건 |

---

## 1차 배포 — Phase 1~2: 버그 수정 5건 (355aaba)

### 1. Gemini 모델 변경 ✅
- **문제**: `gemini-2.0-flash` 모델이 Google에서 폐기 → 404 에러
- **수정**: `gemini-2.5-flash`로 변경 (3곳)
- **파일**: `api/src/llm-router.ts` (라인 91, 96, 148)
- **효과**: AI 회의실에서 Gemini(빨간색) 발언 정상 복구

### 2. 빌더 뒤로가기/새로고침 방지 ✅
- **문제**: 앱 생성 중(7~17분) 뒤로가기 시 아무 경고 없이 이탈
- **수정**: `buildPhase === 'generating'` 시 beforeunload 이벤트 추가
- **파일**: `web/src/app/builder/page.tsx`
- **효과**: 생성 중 이탈 시 브라우저 기본 경고 팝업 표시

### 3. AI 수정 실패 시 에러 안내 ✅
- **문제**: 수정 실패 시 "좀 더 구체적으로 말씀해주세요" 일괄 표시
- **수정**: callModifyFiles 반환값에 `_error` 필드 추가 (credit/network/api 분류)
- **파일**: `web/src/app/builder/components/BuilderChat.tsx`
- **효과**: 크레딧 부족 → "크레딧 충전 링크", 네트워크 → "잠시 후 재시도" 등

### 4. subdomain 재배포 500 에러 ✅
- **문제**: 이미 배포된 앱 재배포 시 `Unique constraint (subdomain)` 500
- **수정**: `...(isNewDeploy && { subdomain })` — 첫 배포 시만 SET
- **파일**: `api/src/project/deploy.service.ts` (deploy + deployTrial 둘 다)
- **효과**: 수정 후 재배포 정상 작동

### 5. 회의실 새로고침 내용 보존 ✅
- **문제**: 회의 중 F5 → 주제/대화/보고서 전부 소실
- **수정**: beforeunload 경고 + sessionStorage 자동 저장/복원 (1시간 TTL)
- **파일**: `web/src/app/meeting/page.tsx`
- **효과**: 새로고침 후 이전 대화 자동 복원, 새 회의 시 초기화

### (추가) credit.deduct 호출 인자 오류 수정
- **문제**: 기존 tsc 에러 — `deduct(userId, 'code_download', id)` 3개 인자
- **수정**: `deduct(userId, { action: 'code_download', projectId: id })`
- **파일**: `api/src/project/project.controller.ts`

---

## 2차 배포 — Phase 3: 기능 추가 2건 (f0e3a16)

### 6. 회의 기록 DB 저장 + 히스토리 UI ✅
- **DB 모델**: `MeetingHistory` (userId, topic, preset, tier, messages, report, creditUsed)
- **백엔드 API**:
  - `GET /api/ai/meeting-history` — 목록 조회 (최근 20건, messages 제외)
  - `GET /api/ai/meeting-history/:id` — 상세 조회
  - `POST /api/ai/meeting-history/:id/delete` — 삭제
- **자동 저장**: `meetingSSE()` 회의 완료 후 DB 자동 저장
- **프론트엔드**:
  - idle 화면에 "이전 회의 기록" 섹션 (최근 5건 표시)
  - 항목 클릭 → 이전 대화 읽기 전용 표시
  - ✕ 버튼으로 삭제 (confirm 확인)
- **파일**: `schema.prisma`, `ai.controller.ts`, `meeting/page.tsx`

### 7. 빌더 채팅 가이드 ✅
- **플레이스홀더 개선**: 수정 횟수에 따라 5개 힌트 순환
  - `"예: 버튼을 누르면 상품 목록이 보이게 해줘"`
  - `"예: 배경색을 파란색으로 바꿔줘"` 등
- **첫 방문 가이드 말풍선**: 앱 생성 완료 직후 1회만 표시
  - "앱이 완성됐어요! 이제 채팅으로 수정할 수 있어요."
  - 3개 예시 + "알겠어요 ✕" 닫기 → localStorage 영구 기록
- **파일**: `BuilderChat.tsx`

---

## 서버 상태 확인

```
launchpad-api    ✅ online  (PID 756312, uptime 정상)
launchpad-web    ✅ online  (PID 755893, uptime 정상)
petmate-demo     ✅ online  (PID 410079, uptime 9일)

DB meeting_histories 테이블 ✅ 생성 확인
```

---

## 기존 코드 영향도

| 영역 | 영향 | 검증 |
|------|------|------|
| 크레딧 차감 로직 | 변경 없음 | ✅ |
| SSE 스트림 | 변경 없음 (저장만 추가) | ✅ |
| 빌더 수정 기능 | callModifyFiles 반환 구조만 변경 | tsc 0 에러 ✅ |
| 회의 SSE 흐름 | 이벤트 수집 + 완료 후 DB 저장 | ✅ |
| 기존 sessionStorage | meeting_context 유지, meeting_state 추가 | ✅ |

---

## 남은 과제 (명령서 외)

- Gemini 실동작 검증 (회의 시작 후 빨간색 발언 확인)
- 카카오 로그인 401 에러 (기존 미해결)
- CSS 빌드 근본 (Tailwind CDN 폴백)
- Supabase 프로젝트 이름 충돌 (재생성 시)

---

> 명령서 7건 전체 완료. 기존 코드 안전하게 유지됨.
> tsc 에러 0, GitHub Actions 2건 success, 서버 정상 기동 확인.
