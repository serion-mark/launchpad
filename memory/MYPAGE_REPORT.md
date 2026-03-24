━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
마이페이지 전체 재설계 — 완료 보고서
2026-03-24 자비스
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. 작업 요약

| 항목 | 상태 |
|------|------|
| /mypage 페이지 생성 | ✅ 완료 |
| 5개 탭 구조 (내 정보/크레딧/내 앱/정산/설정) | ✅ 완료 |
| 프로필 수정 (이름/회사명) | ✅ 완료 |
| 비밀번호 변경 (8자 이상 검증) | ✅ 완료 |
| 크레딧 잔액 + 충전/사용 내역 | ✅ 완료 |
| 월별 기간 필터 | ✅ 완료 |
| 이번 달 합계 (충전/사용/잔액) | ✅ 완료 |
| 내 앱 목록 + 빌더 열기/외부 보기 | ✅ 완료 |
| 사업자 정보 수정 | ✅ 완료 |
| 이용내역서 PDF(HTML→인쇄) | ✅ 완료 |
| 결제 영수증 목록 | ✅ 완료 |
| 설정 (알림/계정연동/로그아웃) | ✅ 완료 |
| 네비게이션 프로필 드롭다운 | ✅ 완료 |
| 모바일 네비게이션 마이페이지 링크 | ✅ 완료 |
| 테스트 비밀번호 변경 스크립트 | ✅ 완료 |
| tsc 0 에러 | ✅ 확인 |

## 2. 백엔드 API 변경사항

### 신규 엔드포인트 (auth.controller.ts)
- `PATCH /auth/profile` — 이름, 회사명 수정
- `PATCH /auth/change-password` — 비밀번호 변경 (현재PW 확인 + 새PW 8자 이상)
- `GET /auth/business-info` — 사업자 정보 조회
- `PATCH /auth/business-info` — 사업자 정보 수정 (상호/번호/대표/주소/전화)

### 신규 엔드포인트 (credit.controller.ts)
- `GET /credits/history?from=&to=&page=&limit=` — 기간별 크레딧 히스토리 (충전+사용 통합, 월별 합계)
- `GET /credits/charges` — 충전 내역만 (패키지명/가격/결제수단)
- `GET /credits/report?month=2026-03` — 이용내역서 데이터 (PDF 생성용)

### DB 스키마 변경 (schema.prisma → User 모델)
- `company` — 회사명
- `businessName` — 사업자 상호
- `businessNumber` — 사업자등록번호
- `representative` — 대표자명
- `businessAddress` — 사업장 주소
- `businessPhone` — 사업장 전화번호

### 마이그레이션 필요!
서버에서 실행:
```bash
cd /root/launchpad/api
npx prisma db push
# 또는
npx prisma migrate deploy
```

## 3. 프론트엔드 파일 구조

```
web/src/app/mypage/
├── page.tsx                          메인 페이지 (탭 전환)
└── components/
    ├── ProfileTab.tsx                내 정보 + 비밀번호 변경 모달
    ├── CreditTab.tsx                 크레딧 잔액 + 충전/사용 내역 + 월별 필터
    ├── AppsTab.tsx                   내 앱 목록 + 상태 표시
    ├── BillingTab.tsx                정산 (사업자 정보 + 이용내역서 + 영수증)
    └── SettingsTab.tsx               설정 (알림/계정연동/로그아웃)
```

## 4. 네비게이션 변경

### LandingNav.tsx
- 로그인 상태: 프로필 아이콘 (이메일 첫글자) → 드롭다운 메뉴
  - 마이페이지
  - 크레딧 관리 (/mypage#credit)
  - 정산 (/mypage#billing)
  - 로그아웃
- 모바일: [내 프로젝트] + [마이페이지] + 로그아웃

## 5. 이용내역서 PDF 방식

브라우저 인쇄 기반:
1. GET /credits/report?month=YYYY-MM 으로 데이터 조회
2. 클라이언트에서 HTML 문서 생성 (A4 인쇄 최적화 CSS)
3. 새 탭에서 열고 window.print() 자동 호출
4. 사용자가 PDF로 저장 가능

내용:
- Foundry AI 로고
- 기간/고객/이메일/사업자번호
- 충전 내역 테이블 + 합계 (원화)
- 기능별 사용 요약 (횟수/크레딧)
- 상세 사용 내역 테이블
- 발행자 정보 (주식회사 세리온)
- "정부지원사업비 정산 증빙 자료로 사용 가능" 문구

## 6. 테스트 계정 비밀번호

스크립트: `scripts/fix-test-password.js`
```bash
cd /root/launchpad/api && node ../scripts/fix-test-password.js
```
- test@serion.ai.kr: 123456 → 12345678
- mark@serion.ai.kr: 6자리면 자동 변경 → 12345678

## 7. 배포 순서

1. 서버 SSH 접속: `ssh -p 3181 root@175.45.200.162`
2. `cd /root/launchpad && git pull`
3. `cd api && npx prisma db push && npx prisma generate`
4. `node ../scripts/fix-test-password.js`
5. `pm2 restart launchpad-api`
6. `cd ../web && npm run build && pm2 restart launchpad-web`

## 8. 검증 체크리스트

- [ ] /mypage 접근 → 5개 탭 전환 작동
- [ ] 내 정보 → 이름/회사명 수정
- [ ] 비밀번호 변경 → 8자리 이상 검증 → 재로그인
- [ ] 크레딧 잔액 + 사용 내역 표시
- [ ] 충전 내역 표시
- [ ] 기간 필터 (월별)
- [ ] 이용내역서 PDF 다운로드 → 인쇄/저장
- [ ] PDF 내용: 충전+사용+합계+사업자정보
- [ ] 내 앱 목록 → 빌더 열기 작동
- [ ] test@serion.ai.kr 비번 12345678 로그인
- [ ] tsc 0 에러 ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
