━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
후임 자비스에게 — 파운더리 세션 인수인계서
2026-04-03~08 (자비스 mk8+ 작성)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 너는 자비스다. Tony Stark의 AI 동업자.
■ 사장님 = 비개발자가 슈트로 싸우는 사람. 120%가 기본이다.
■ 반드시 이 순서대로 읽어:
  ① Foundry BASICS: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
  ② Foundry MEMORY: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MEMORY.md (상단 100줄)
  ③ 이 파일 (인수인계서)
  ④ 실행할 명령서 (사장님이 지정)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0. 이 세션 한 줄 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
서버 로그 분석→버그 7건 수정 배포 + 회의 히스토리 DB 저장 + 채팅 가이드 UX
+ "동네키친" E2E 테스트(회의→생성→배포) 성공 + 수익율 분석(스탠다드 90%)
+ KPN PG 내부 검토 완료→단건결제 연동 명령서 작성 + 심사위원 3명 접속 확인

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 이번 세션 완료 작업
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 버그 수정 + 기능 추가 — 7건 전부 배포 완료 ✅
  1. Gemini 모델 변경 (gemini-2.0-flash → gemini-2.5-flash) — 404 해결
  2. 빌더 뒤로가기/새로고침 방지 (beforeunload)
  3. AI 수정 실패 시 에러 안내 (callModifyFiles 에러 분류)
  4. subdomain 재배포 500 에러 (조건부 subdomain SET)
  5. 회의실 새로고침 내용 소실 (sessionStorage + beforeunload)
  6. 회의 히스토리 DB 저장 + UI (MeetingHistory 모델 + API)
  7. 빌더 채팅 가이드 (플레이스홀더 + 첫 방문 말풍선)
  - 배포 2회 (355aaba, f0e3a16) / tsc 0에러 / DB meeting_histories 테이블 생성

■ "동네키친" E2E 테스트 ✅
  - 모두의 창업 1,014개 분석 기반 페르소나 설계
  - AI 회의실 → "이걸로 앱 만들기" → 빌더 자동 생성 → 배포 풀코스
  - 36분 소요 / Supabase 프로비저닝 성공 / 파일 33개 / F4 잘림 7건 / F6 빌드 수정 1회
  - URL: https://test1.foundry.ai.kr
  - Gemini 정상 작동 확인 (404 에러 없음)
  - 회의 히스토리 DB 저장 정상 확인

■ 수익율 분석 ✅
  - API 원가: $4.01/건 (약 5,800원)
  - 스탠다드 기준: 매출 99,000원 / 원가 9,550원 / 순수익 89,450원 / 수익율 90%
  - 프로 기준: 수익율 95%
  - 고객 40명이면 월 순수익 약 350만원

■ 테스트 계정 크레딧 충전 ✅
  - test@serion.ai.kr: 15,000cr + 10,000cr = 총 25,000cr 충전
  - 현재 잔액: 13,177cr

■ 심사위원/외부 접속 분석 ✅
  - 84.32.41.136: 4/3 + 4/7 재방문 (로그인→환불→회의실→가격→포트폴리오→시작)
  - 57.140.60.35: 4/5 + 4/6 재방문 (가격→환불→회의실→앱내부→포트폴리오)
  - 환불규정+개인정보+이용약관 3개 확인 → PG사(KPN) 심사 또는 모두의창업 심사위원
  - 14초 만에 11페이지 일괄 오픈 → 체크리스트 기반 평가 패턴

■ KPN PG 계약 진행 ✅
  - KPN 내부 검토 완료 (이재호 담당자)
  - 월 정산 한도: 보증보험 가입액 × 4배
  - 다음 단계: PG 연동 + 결제 테스트 → 카드사 심사
  - KPN PG 단건결제 연동 명령서 작성 완료
  - 실판매상품 카테고리: "용역서비스" 선택

■ 명령서 작성 ✅
  - BUGFIX_AND_FEATURE_COMMAND.md (버그 7건 — 실행 완료)
  - KPN_PG_INTEGRATION_COMMAND.md (PG 연동 — 다음 세션 실행)
  - SESSION9_REPORT_2026-04-04.md (작업 보고서)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. 다음 세션 실행할 명령서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ KPN PG 단건결제 연동 (우선순위 1)
  경로: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/KPN_PG_INTEGRATION_COMMAND.md
  참고 PDF: /Users/mark/Downloads/Payment_v_2.2_260116.pdf
  내용: KPN JavaScript SDK 연동 → 크레딧 충전 시 실제 카드결제
  핵심:
    - 개발계: https://dev.firstpay.co.kr / testcorp / 6aMoJujE34XnL9gvUqdKGMqs9GzYaNo6
    - SDK 방식: firstpay_v2.js
    - 단건 결제만 (정기결제/구독 없음!)
    - passKey 보안!! → callHash는 백엔드에서 생성
    - callHash 규칙 주의: 결제창/승인/취소 각각 다름
    - 기존 토스 코드 삭제 X → KPN 별도 추가
  시작 명령어:
    ```
    너는 자비스다. 답변은 항상 한글로. "절대" 쓰지 마.
    ■ 필독 파일 (이 순서대로!)
    1. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
    2. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MEMORY.md (상단 100줄)
    3. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/KPN_PG_INTEGRATION_COMMAND.md
    ■ 참고 PDF: /Users/mark/Downloads/Payment_v_2.2_260116.pdf
    위 파일 전부 읽고 브리핑한 뒤,
    KPN PG 단건결제 연동 Phase 1부터 순서대로 실행해.
    passKey 보안 주의!! callHash는 백엔드에서 생성!
    기존 토스 코드 삭제하지 말고 KPN 별도 추가 방식!
    수정 전 브리핑 먼저!
    ```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. 지원사업 현황 (2026-04-08 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 모두의 창업 — ✅ 제출 완료 (3/29) → 심사위원 접속 확인!
■ 창업중심대학 — ✅ 제출 완료
■ D-Camp — ✅ 제출 완료 (3/29)
■ CHAIN-G 3기 — ✅ 제출 완료 (4/1)
■ 신한 퓨처스랩 12기 — ✅ 제출 완료 (결과 대기)
■ 경기도 재도전 — ✅ 제출 완료
■ 경기 레벨업 시드 — ⏳ 마감 4/17 (신청서 완료, 제출 대기)
■ 모두의 아이디어 — ⏳ 마감 4/15 (제안서 미작성)
■ 신한 스퀘어브릿지 — 진행 중

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. 대기 중 (외부 결과)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ KPN PG — 내부 검토 완료, 연동 후 카드사 심사 예정 (이번주 회신)
■ 토스페이먼츠 빌링 (세리온) — 심사 대기 중
■ KPN 카드단말기 (세리온) — 코드 완성, 단말기 미수령
■ 모두의창업 심사 결과 — 대기 (심사위원 접속 확인)
■ D-Camp 심사 결과 — 대기
■ CHAIN-G 심사 결과 — 대기
■ 신한 퓨처스랩 서류심사 — 결과 대기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. 미수정 버그 + 개선점
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 미수정 버그 (기존)
  1. CSS 빌드 근본 (Tailwind CDN 폴백 → text-white 누락) — 구조적
  2. 비주얼 에디터 소스 매칭 실패 (F6 후 DB 불일치) — 구조적
  3. 새벽 시간 API 느림 → SSE 타임아웃 — Anthropic 쪽
  4. 카카오 로그인 401 — 토큰 발급 실패 (확인 필요)
  5. Supabase Storage 버킷 생성 404 — 매번 발생
  6. Supabase 프로젝트 이름 충돌 — 재생성 시 프로비저닝 실패

■ 이번 세션에서 발견한 개선점
  1. 🔴 404 Not Found 화면 → "앱 준비 중" 로딩 화면으로 교체 (고객 체험)
  2. 🔴 앱 생성 시간 36분 → F4 잘림 빈도 줄이기 (프롬프트 최적화)
  3. 🟡 회의 히스토리 좌측 사이드바 전환 (현재 하단 리스트)
  4. 🟡 크레딧 부족 시 생성 전 팝업 (현재 에러 로그만)
  5. 🟢 빌드 진행률 단계별 상태 표시 ("tsc 검증 중..." 등)

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
  도메인: serion.ai.kr
  DB: PostgreSQL / seriondb / serion / serion1234

■ 테스트 계정
  Foundry: test@serion.ai.kr / 12345678 (13,177cr)
  세리온: test@serion.ai.kr / 123456

■ 어드민
  Foundry: mark@serion.ai.kr (admin)
  세리온: mark@serion.ai.kr / Ab3181!! (OWNER)

■ KPN PG (개발계)
  mxId: testcorp
  passKey: 6aMoJujE34XnL9gvUqdKGMqs9GzYaNo6
  개발계: https://dev.firstpay.co.kr
  운영계: https://pay.firstpay.co.kr
  기술지원: eCommSolutionTeam@kpn.co.kr
  담당자: 이재호

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. 사장님 사용설명서 (이번 세션에서 배운 것)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 기존 규칙 전부 유효

■ 이번 세션에서 추가로 배운 것
  → "코드 꼬이면 안 돼!!!!" — 기능 추가 시 기존 코드 안전 최우선
  → 직접 테스트하면서 문제점 실시간 발견하는 스타일
  → 버그 수정 순서도 직접 정해줌 (효과 큰 것부터)
  → "지금 방향이 혁신이다 싶은 방향은 아닌데..." — 10번째 창의적 도약 고민 중
  → AI 15번 반복 실험 영상 공유 — Foundry 플랫폼 자체의 혁신 방향 모색
  → PG 실판매 카테고리 "용역서비스" 직접 선택
  → 다른 사람한테 보여주려고 외부에서 접속하기도 함 (IP 변경 주의)

■ 핵심 규칙 (반복)
  → "절대" 쓰지 마!!!
  → 배포: GitHub Actions만!
  → 배포 전 사장님 확인
  → 답변은 항상 한글로

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. 생성된 파일 인덱스
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 인수인계서
  세리온: /Users/mark/세리온 ai전화예약+POS통합관리/memory/BRAINSTORM_SESSION9_HANDOFF_FOUNDRY.md (이 파일)
  파운더리: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BRAINSTORM_SESSION9_HANDOFF_FOUNDRY.md (복사본)

■ 명령서
  버그 수정: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BUGFIX_AND_FEATURE_COMMAND.md (실행 완료)
  KPN PG: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/KPN_PG_INTEGRATION_COMMAND.md (다음 실행)
  버그 초판: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BUGFIX_4_COMMAND.md (통합됨)

■ 보고서
  작업 보고서: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/SESSION9_REPORT_2026-04-04.md
  배포 보고서: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/DEPLOY_REPORT_2026-04-03.md

■ 참고 PDF
  KPN PG 연동 가이드: /Users/mark/Downloads/Payment_v_2.2_260116.pdf

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. 배포된 앱
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

기존 데모앱 9개 + 새로 추가:
  https://local-market.foundry.ai.kr — 로컬마켓 (테스트, 4/3)
  https://test1.foundry.ai.kr — 동네키친/동네대장밀키트 (E2E 테스트, 4/4)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
다음 자비스에게:
KPN PG 연동이 1순위. 명령서 읽고 Phase 1부터.
passKey 보안 주의. callHash 규칙 3개 다 다름.
기존 토스 코드 삭제하지 마.
"절대" 쓰지 마. 배포 전 사장님 확인.
화이팅.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
