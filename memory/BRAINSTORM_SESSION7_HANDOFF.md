━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
후임 자비스에게 — 세션 9 인수인계서
2026-04-03 (자비스 mk8+ 작성)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 너는 자비스다. Tony Stark의 AI 동업자.
■ 사장님 = 비개발자가 슈트로 싸우는 사람. 120%가 기본이다.
■ 반드시 이 순서대로 읽어:
  ① Foundry BASICS: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
  ② Foundry MEMORY: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MEMORY.md (상단 100줄)
  ③ 이 파일 (세션 9용 인수인계서)
  ④ 실행 명령서: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BUGFIX_AND_FEATURE_COMMAND.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0. 세션 8+ (mk8+) 한 줄 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
서버 로그 분석으로 버그 6건 발견 + Gemini 404 원인 확정
+ 테스트 계정 15,000cr 충전 + 앱 빌드 실시간 감시
+ 버그 수정 4건 + 기능 추가 2건 명령서 작성 완료

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 이번 세션에서 발견한 것들
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ Gemini 404 원인 확정
  - `gemini-2.0-flash` 모델이 Google에서 폐기됨
  - 에러: "This model is no longer available to new users"
  - 해결: `gemini-2.5-flash`로 변경하면 됨
  - 파일: api/src/llm-router.ts

■ 서버 로그에서 발견된 에러 6건
  1. Gemini 404 (모델 폐기) → 위에서 설명
  2. Supabase "foundry-로컬마켓" 이름 충돌 → 재생성 시 프로비저닝 실패
  3. Supabase Storage 버킷 생성 404 → 반복 발생
  4. subdomain unique 충돌 500 → 재배포 시 (이미 알던 버그)
  5. 카카오 로그인 401 → 토큰 발급 실패
  6. 크레딧 부족 생성 실패 → 15,000cr 충전으로 해결

■ 사장님 회의 기록 발견
  - 4/1 19:35 "회사소개서 분석 및 사업성 검증" (standard, idea_validation)
  - Gemini 빠진 채로 Claude+GPT만으로 진행됨

■ 회의 기록 DB 저장 안 됨 확인
  - Prisma schema에 Meeting 모델 없음
  - 현재 sessionStorage만 임시 사용 (탭 닫으면 사라짐)
  - 사장님 요청: 클로드처럼 좌측 히스토리 목록 필요

■ 채팅 수정 UX 문제
  - 고객이 채팅으로 수정할 수 있다는 걸 모름
  - 사장님: "채팅창에 입력하는게 너무 불편하고 고객은 모를거 같음"
  - 해결: D(플레이스홀더 힌트) + C(첫 방문 가이드 말풍선) 조합 확정

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. 이번 세션에서 한 작업
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 테스트 계정 크레딧 충전 ✅
  - test@serion.ai.kr: 3,377 → 18,377cr (+15,000)
  - DB 직접 UPDATE (credit_balances 테이블)

■ 로컬마켓 앱 빌드 실시간 감시 ✅
  - 17:16 시작 → 17:46 완료 (30분 소요)
  - F4 코드 잘림 수정 6건 + tsc + npm build + 배포
  - Supabase 프로비저닝 실패 (이름 중복) → 코드 생성은 계속 진행

■ 파운더리 인수인계서 복사 ✅
  - BRAINSTORM_SESSION5_HANDOFF_FOUNDRY.md → Foundry memory 폴더에도 복사

■ 명령서 2개 작성 ✅
  - BUGFIX_4_COMMAND.md (초판, 버그 4건)
  - BUGFIX_AND_FEATURE_COMMAND.md (최종판, 7건 = 버그4 + Gemini + 회의히스토리 + 채팅가이드)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. 다음 세션 즉시 실행 — 명령서 기반!!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 실행 명령서 경로:
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BUGFIX_AND_FEATURE_COMMAND.md

■ 작업 7건 (3 Phase로 나눠서 배포)

  Phase 1: 긴급 수정 (10분)
    1. Gemini 모델 변경: gemini-2.0-flash → gemini-2.5-flash
       파일: api/src/llm-router.ts
    2. 빌더 뒤로가기 방지: beforeunload 이벤트 추가
       파일: web/src/app/builder/page.tsx

  Phase 2: 버그 수정 (1~2시간)
    3. AI 수정 실패 시 에러 안내: callModifyFiles 반환값 구조 변경
       파일: web/src/app/builder/components/BuilderChat.tsx
    4. subdomain 재배포 500: 조건부 subdomain SET
       파일: api/src/project/deploy.service.ts (라인 367~381 + 410~431)
    5. 회의실 새로고침 보존: beforeunload + sessionStorage 저장/복원
       파일: web/src/app/meeting/page.tsx

  → Phase 1~2 완료 후 중간 배포!!

  Phase 3: 기능 추가 (2~3시간)
    6. 회의 기록 저장 + 히스토리 UI
       - DB: MeetingHistory 모델 추가 (schema.prisma + prisma db push)
       - 백엔드: 회의 완료 시 DB 저장 + 히스토리 조회/삭제 API
       - 프론트: 좌측 사이드바에 이전 회의 목록 (클로드 스타일)
    7. 빌더 채팅 가이드 (D+C 조합, 기존 코드 건드리면 안 됨!!)
       - D: 채팅 입력창 플레이스홀더에 상황별 예시 힌트
       - C: 앱 생성 완료 직후 가이드 말풍선 (1회만 표시)

  → Phase 3 완료 후 두 번째 배포!!

■ 핵심 주의사항
  - 2회 나눠서 배포 (Phase 1~2 / Phase 3)
  - 각 Phase마다 tsc --noEmit 에러 0 확인 필수
  - 기존 로직(크레딧 차감, SSE 스트림) 건드리지 말 것
  - Phase 3 채팅 가이드: 기존 코드 꼬이면 안 됨!! (사장님 강조)
  - 배포 전 사장님 확인 필수

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. 지원사업 현황 (2026-04-03 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 모두의 창업 — ✅ 제출 완료 (3/29)
■ 창업중심대학 — ✅ 제출 완료
■ D-Camp — ✅ 제출 완료 (3/29)
■ CHAIN-G 3기 — ✅ 제출 완료 (4/1)
■ 신한 퓨처스랩 12기 — ✅ 제출 완료 (결과 4월 1주차)
■ 경기 레벨업 시드 — ⏳ 마감 4/17 (신청서 완료, 제출 대기)
■ 모두의 아이디어 — ⏳ 마감 4/15 (제안서 미작성)
■ 경기도 재도전 — 서류 준비됨
■ SaaS 바우처 — 상태 확인 필요
■ AI바우처 — 플루닛 회신 대기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. 대기 중 (외부 결과)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 토스페이먼츠 빌링 심사 — 3/19 신청, 메일 답장 완료, 결과 대기
■ KPN 카드단말기 — 코드 완성, 단말기 미수령
■ 알림톡 3종 — ✅ 활성화 완료 (signup_pending/admin_new_signup/signup_approved)
■ 카카오 로그인(Foundry) — 401 에러 발생 중 (확인 필요)
■ GitHub 토큰 serion-push — 4/6 만료 (삭제 가능)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. 서버/계정 핵심 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ Foundry 서버
  IP: 175.45.200.162 / SSH 포트: 3181 (22번 아님!!)
  SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
  도메인: foundry.ai.kr
  배포: GitHub Actions 자동배포!! (SSH 직접 배포 X)
  DB: PostgreSQL / launchpaddb / launchpad / launchpad1234
  관리자 userId: cmmvse7h00000rh8h9fxxipdd

■ 세리온 POS 서버
  IP: 223.130.162.133 / SSH 포트: 3181
  SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@223.130.162.133
  도메인: serion.ai.kr
  DB: PostgreSQL / seriondb / serion / serion1234

■ 테스트 계정
  Foundry: test@serion.ai.kr / 12345678 (18,377cr)
  세리온: test@serion.ai.kr / 123456

■ 어드민
  세리온: mark@serion.ai.kr / Ab3181!! (OWNER)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. 사장님 사용설명서 (이번 세션에서 배운 것)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 기존 규칙 전부 유효 (mk4~mk7 인수인계서 참고)

■ 이번 세션에서 추가로 배운 것
  → "코드 꼬이면 안 돼!!!!" — 기능 추가 시 기존 코드 안전 최우선
  → 채팅 가이드 D+C 조합 직접 선택 (플레이스홀더 + 첫방문 말풍선)
  → 빌더에서 직접 테스트하면서 문제점 실시간 발견하는 스타일
  → 버그 수정 순서도 사장님이 직접 정해줌 (효과 큰 것부터)

■ 기존 핵심 규칙 (반복)
  → "절대" 쓰지 마!!!
  → 배포: GitHub Actions만!
  → 배포 전 사장님 확인
  → 답변은 항상 한글로

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. 파운더리 미수정 버그 전체 목록 (명령서에 포함된 것 + 남은 것)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

이번 명령서에 포함 (7건):
  1. Gemini 모델 404 → gemini-2.5-flash 변경
  2. 빌더 뒤로가기/새로고침 방지 → beforeunload
  3. AI 수정 실패 안내 → 에러 유형별 메시지
  4. subdomain 재배포 500 → 조건부 SET
  5. 회의실 새로고침 내용 소실 → sessionStorage + beforeunload
  6. 회의 기록 DB 저장 + 히스토리 UI (신규 기능)
  7. 빌더 채팅 가이드 (신규 기능)

남은 버그 (이번에 안 다룸):
  - CSS 빌드 근본 (Tailwind CDN 폴백 → text-white 누락) — 구조적 이슈
  - 비주얼 에디터 소스 매칭 실패 (F6 수정 후 DB 불일치) — 구조적 이슈
  - 새벽 시간 API 느림 → SSE 타임아웃 — Anthropic 쪽 이슈
  - Supabase 프로젝트 이름 충돌 — 재생성 시 기존 프로젝트 재사용 로직 필요
  - 카카오 로그인 401 — 토큰 발급 실패 (확인 필요)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
다음 자비스에게:
명령서(BUGFIX_AND_FEATURE_COMMAND.md) 읽고 Phase 1부터 순서대로.
Phase 1~2 먼저 배포, Phase 3 따로 배포.
기존 코드 꼬이면 안 된다. 사장님이 강조했다.
"절대" 쓰지 마. 배포 전 사장님 확인.
화이팅.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
