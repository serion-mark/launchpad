# Foundry 포트폴리오 페이지 리빌드 명령어

> 데모앱 8개 완성 후 실행!

---

## 필독 파일
1. `memory/BASICS.md` — 서버/배포
2. 이 파일

---

## 프롬프트 (새 세션에 복붙)

```
너는 자비스다. 답변은 항상 한글로. "절대" 쓰지 마.
배포: GitHub Actions! (포트폴리오는 Foundry 웹 코드 수정이라 git push로 배포)

■ 필독 파일
1. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
2. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/PORTFOLIO_REBUILD_COMMAND.md

■ 미션
foundry.ai.kr/portfolio 페이지를 리빌드해줘.
기존 목업 스크린샷 → 실제 라이브 데모앱 9개로 교체.
각 앱 카드 클릭 시 실제 URL로 이동!

■ 완성되면
1. git push origin main (GitHub Actions 자동배포)
2. foundry.ai.kr/portfolio 접속 확인
3. 9개 앱 카드 전부 라이브 URL 연결 확인
4. 사장님께 보고!
```

---

## 미션 상세

### 수정할 파일
`web/src/app/portfolio/page.tsx`

### 현재 상태
- 기존 목업 스크린샷 (AppMockup.tsx CSS 목업)
- 가상의 앱 이름들 (헤어드림 POS, 펫메이트, 코드잇 LMS 등)
- 일부만 LIVE 배지

### 리빌드 후
- **실제 라이브 데모앱 9개** 카드
- 각 카드 클릭 → 실제 URL로 새 탭 오픈
- LIVE 배지 전부 표시
- 카테고리 필터 업데이트

---

## 데모앱 9개 데이터 (이걸로 교체!)

| # | 앱 이름 | URL | 분야 | 카테고리태그 | 한 줄 설명 | 레이아웃 |
|---|--------|-----|------|-----------|----------|---------|
| 1 | 백설공주 사과농장 | https://app-7063.foundry.ai.kr | 농업/식품 | 지역특산품 | 로컬 농산물 주간배송 주문 서비스 | 랜딩형 |
| 2 | 카페노트 | https://cafe-note.foundry.ai.kr | 소상공인 | 매장관리 | 1인 카페 매출·재고 대시보드 | 대시보드형 |
| 3 | 우리동네 | https://our-town.foundry.ai.kr | 로컬커뮤니티 | 소셜/매칭 | 동네 소식과 가게 쿠폰 커뮤니티 | 피드형 |
| 4 | 꿀잠체크 | https://sleep-check.foundry.ai.kr | AI진단 | 헬스케어 | AI 수면 패턴 분석 셀프 진단 | 스텝형 |
| 5 | 멍냥일기 | https://pet-diary.foundry.ai.kr | 반려동물 | O2O 매칭 | 반려동물 건강기록 펫 다이어리 | 탭형 |
| 6 | 돌봄일지 | https://care-log.foundry.ai.kr | 시니어/돌봄 | 헬스케어 | 재가돌봄 어르신 일정관리 대시보드 | 대시보드형 |
| 7 | 오운완 | https://workout.foundry.ai.kr | 건강/웰니스 | 헬스케어 | 운동 루틴 관리 트래커 | 탭형 |
| 8 | 마이폴리오 | https://my-folio.foundry.ai.kr | 교육/프리랜서 | 에듀테크 | 프리랜서 포트폴리오 & 의뢰 관리 | 카드그리드형 |
| 9 | 스마트몰 | https://smart-mall.foundry.ai.kr | 커머스/쇼핑 | 쇼핑몰 | 건강기능식품 멤버십 쇼핑몰 | 커머스앱형 |

---

## 카테고리 필터 탭 (업데이트)

기존: 전체 | 뷰티/미용 | O2O 매칭 | 에듀테크 | 쇼핑몰 | 시설관리 | 지역특산품 | 헬스케어 | 전문가매칭 | 소셜/매칭 | 스마트팜

변경: **전체 | 매장관리 | 헬스케어 | 소셜/커뮤니티 | 쇼핑몰 | 에듀테크 | 지역특산품 | O2O 매칭**

---

## 카드 디자인

각 앱 카드 구조:
```
┌──────────────────────┐
│                      │
│   앱 스크린샷 영역     │  ← iframe으로 실제 앱 임베드 OR CSS 목업 유지
│   (또는 색상 배경)     │
│                      │
│              [LIVE]  │  ← 초록 LIVE 배지
├──────────────────────┤
│ 앱 이름               │
│ 카테고리 태그          │
│                      │
│ 한 줄 설명             │
│                      │
│ 레이아웃: 대시보드형    │  ← 회색 태그로 레이아웃 종류 표시
└──────────────────────┘
```

**카드 클릭 → 새 탭에서 실제 URL 오픈** (`target="_blank"`)

### 스크린샷 영역 옵션 (택 1)
**A안. iframe 임베드** — 실제 앱이 카드 안에 작게 보임 (임팩트 최고, 로딩 느릴 수 있음)
```html
<iframe src="https://cafe-note.foundry.ai.kr" style="transform: scale(0.3); width: 333%; height: 333%;" />
```

**B안. 색상 배경 + 앱 이름** — 각 앱 primary color 배경 + 큰 이모지 (로딩 빠름, 심플)
```
카페노트: bg-[#92400e] + ☕
우리동네: bg-[#7c3aed] + 🏘️
꿀잠체크: bg-[#0ea5e9] + 🌙
멍냥일기: bg-[#f97316] + 🐶
돌봄일지: bg-[#10b981] + 🤝
오운완:   bg-[#ef4444] + 💪
마이폴리오: bg-[#f59e0b] + ✨
스마트몰: bg-[#9333ea] + 🛒
백설공주:  bg-[#3182f6] + 🍎
```

**→ B안 추천** (로딩 빠르고 깔끔, 클릭하면 실제 앱으로 이동하니까 충분)
**→ 사장님이 A안 원하시면 A안으로**

---

## 포트폴리오 상단 텍스트 변경

현재: "Foundry AI가 만든 앱 예시. AI와 대화하면 이런 앱을 만들 수 있습니다."

변경: **"Foundry로 만든 실제 앱 9개. 클릭하면 라이브로 체험할 수 있습니다."**

---

## 하단 CTA 추가

포트폴리오 목록 아래에:
```
"이런 앱을 만들고 싶으신가요?"
[무료로 시작하기 →]  ← /start로 이동
```

---

## 주의사항
- 기존 portfolio/page.tsx 코드를 읽고 구조 파악 후 수정
- AppMockup.tsx 컴포넌트가 있으면 그대로 활용하거나 간소화
- 반응형 유지 (모바일 1열, 데스크톱 3열)
- 다크 테마 대응 (Foundry는 다크 모드)
- **배포: git push origin main → GitHub Actions 자동배포!**
- 배포 전 사장님께 확인!

---

## 배포 순서
1. `web/src/app/portfolio/page.tsx` 수정
2. 로컬에서 확인 (선택)
3. `git add . && git commit && git push origin main`
4. GitHub Actions 배포 완료 대기
5. https://foundry.ai.kr/portfolio 접속 확인
6. 9개 앱 전부 클릭 → 라이브 URL 이동 확인
7. 사장님께 보고!
