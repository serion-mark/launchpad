---
name: AI 회의실 추후 작업
description: Gemini 유료 전환 시 파일 제한 해제 + 대용량 파일 크레딧 안내
type: project
---

## Gemini 유료 전환 시 작업
- `meeting.service.ts`의 `maxFileLen = 8000` → 유료 전환 후 확대 (20000~50000)
- `llm-router.ts`의 `callGoogle()` 사전 2초 딜레이 제거 가능
- Gemini 실패 시 건너뛰기 로직은 유지 (안전장치)

**Why:** 현재 Gemini 무료 티어 분당 15회 제한 + 토큰 제한으로 8000자 제한 적용 중
**How to apply:** 유료 API 키 설정 후 maxFileLen 값 변경 + 딜레이 조정
