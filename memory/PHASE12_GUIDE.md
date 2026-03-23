# Phase 12: "돈 받을 수 있는 제품" — QA 결과 기반 전면 재작성

> **마일스톤**: 모두의 창업 공급기업 심사 통과 + 실결제 가능
> **QA 점수**: 6.5/10 → 목표 9.0/10
> **QA 보고서**: memory/QA_TEST_REPORT_2026-03-23.md
> **요금제 설계**: memory/PRICING_REPORT_2026-03-23.md
> **목표 기한**: 4/1 전
> **원칙**: 120%가 기본. 심사위원이 직접 써봤을 때 "합격"

---

## QA에서 발견된 문제 요약

```
🔴 Critical 3건: 서비스 불가 수준
🟠 Major 8건: 고객 이탈 유발
🟡 Minor 5건: 있으면 좋은 것
+ 긴급 세션에서 수정한 버그 8건 (완료)
```

---

## 🔴 1순위: 배포된 앱 CSS/디자인 깨짐 (가장 치명적!!)

### 현재 문제
배포된 앱(*.foundry.ai.kr)에 접속하면:
- CSS/스타일이 적용 안 됨 (텍스트만 나열)
- 이미지 0개
- 레이아웃 없음
- 아이콘 깨짐 (♡, 🕐, 👥 텍스트로 표시)
- 고객이 보면 "이게 앱이야?" 수준
- **심사위원이 URL 열어보면 즉시 불합격**

### 확인할 것
1. `next build && next export` 과정에서 globals.css / tailwind 포함되는지
2. 빌드 output 폴더에 CSS 파일 존재하는지
3. HTML에 `<link rel="stylesheet">` 태그 있는지
4. tailwind.config.js 의 content 경로가 맞는지
5. 이미지 경로가 상대경로인지 절대경로인지
6. deploy.service.ts에서 빌드 후 정적 파일 복사 로직

### 수정 방향
```
1. AI가 코드 생성할 때 tailwind CSS가 반드시 포함되도록
   → ai.service.ts의 시스템 프롬프트에 명시:
     "globals.css에 @tailwind base/components/utilities 필수 포함"
     "tailwind.config.js의 content에 모든 컴포넌트 경로 포함"

2. 빌드 후 CSS 파일 존재 확인 스텝 추가
   → deploy.service.ts에서 빌드 완료 후:
     if (!fs.existsSync(outDir + '/_next/static/css/')) {
       // CSS 빌드 실패 → 재빌드 또는 에러 처리
     }

3. 이미지는 public/ 폴더에 복사 + 상대 경로 사용
```

### 파일
- `apps/api/src/ai/ai.service.ts` — 코드 생성 프롬프트 수정
- `apps/api/src/deploy/deploy.service.ts` — 빌드 후 CSS 확인
- `apps/api/src/ai/prompts/` — tailwind 필수 포함 지시

### 테스트
1. 새 앱 생성
2. *.foundry.ai.kr 접속
3. CSS 적용됨 ✅ + 이미지 보임 ✅ + 레이아웃 정상 ✅
4. 모바일에서도 확인

---

## 🔴 2순위: Supabase SQL 마이그레이션 실패 (DB가 빈 껍데기)

### 현재 문제
- QA Critical C1: `query: Required` 에러로 DB 테이블 미생성
- 코드는 생성되지만 Supabase에 테이블이 없음
- 배포된 앱에서 "등록된 상품이 없습니다" → 데이터 저장/조회 불가
- CRUD가 전부 안 됨 = 앱이 껍데기

### 확인할 것
1. `supabase.service.ts`에서 SQL 마이그레이션 호출 방법
2. Supabase Management API 사용 중인지, SQL Editor API 사용 중인지
3. AI가 생성한 SQL이 유효한지 (문법 에러?)
4. Supabase 무료 프로젝트 2개 제한 → 새 프로젝트 생성 실패 여부

### 수정 방향
```
1. SQL 마이그레이션 API 호출 수정
   → Supabase REST API로 SQL 직접 실행
   → 또는 supabase-js client.rpc() 사용

2. AI가 생성한 SQL 유효성 검증 추가
   → SQL 실행 전 기본 문법 체크
   → CREATE TABLE, INSERT 문 확인

3. 마이그레이션 실패 시 재시도 로직
   → 최대 3회 재시도
   → 그래도 실패하면 → 사용자에게 "DB 설정 중 문제 발생" 안내
   → 로컬 스토리지 기반 데모 모드 제공 (fallback)

4. 샘플 데이터 자동 삽입
   → 테이블 생성 후 INSERT 문으로 샘플 3~5개 자동 삽입
   → "딸기 1kg 25,000원", "토마토 1kg 15,000원" 등
   → 사용자에게 "샘플 데이터가 입력되어 있습니다. 수정해서 사용하세요" 안내
```

### 파일
- `apps/api/src/supabase/supabase.service.ts` — 마이그레이션 수정
- `apps/api/src/ai/ai.service.ts` — SQL 생성 프롬프트에 샘플 데이터 포함 지시

### 테스트
1. 새 앱 생성
2. Supabase 대시보드에서 테이블 생성 확인
3. 배포된 앱에서 상품 목록 표시 확인 (샘플 데이터)
4. 상품 등록/수정/삭제 CRUD 작동 확인

---

## 🔴 3순위: 로그인 후 온보딩 없음

### 현재 문제
- QA Major M1: 로그인 후 홈(/)으로 이동 → "뭘 해야 하지?" 상태
- 크레딧이 뭔지 모름
- 어디를 눌러야 앱을 만드는지 모름
- 45세 농장주 → 즉시 이탈

### 수정 방향
```
로그인 직후 → 온보딩 모달 또는 /start로 자동 이동

옵션 A (간단, 추천):
로그인 후 → /start로 자동 리다이렉트
/start 상단에 "안녕하세요! 어떤 앱을 만들까요?" 안내

옵션 B (온보딩 모달):
로그인 후 → 3단계 온보딩 팝업
1. "환영합니다! Foundry는 AI가 앱을 만들어주는 서비스예요"
2. "크레딧 20,000 = 앱 약 6개 만들 수 있어요"
3. "시작해볼까요?" → [앱 만들기] [AI 회의실 체험]
→ isFirstLogin 플래그로 1회만 표시
```

### 파일
- `apps/web/src/app/page.tsx` — 로그인 상태 체크 + 리다이렉트
- `apps/web/src/components/OnboardingModal.tsx` — (옵션 B 시 신규 생성)

---

## 🟠 4순위: 마크다운 렌더링 + 존칭 통일

### 현재 문제
- AI 응답에서 **별표**가 그대로 보임 (볼드 처리 안 됨)
- 리스트, 테이블, 코드블록 전부 텍스트 그대로
- AI가 반말 섞어 씀 ("해드릴게요" vs "하세요" 혼재)

### 수정 방향
```
1. react-markdown 설치 + 적용
   npm install react-markdown remark-gfm

2. AI 응답 컴포넌트에서:
   현재: <p style={{whiteSpace: 'pre-wrap'}}>{message}</p>
   수정: <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>

3. 적용 위치:
   - 빌더 채팅 응답
   - AI 회의실 보고서
   - 스마트 분석 결과
   - 모든 AI 응답 표시 컴포넌트

4. 존칭 통일 — AI 시스템 프롬프트에 추가:
   "항상 존칭(~습니다, ~드리겠습니다)을 사용하세요.
    전문적이면서 친절한 톤으로 답변하세요.
    한국 비즈니스 문화에 맞는 경어를 사용하세요.
    이모지는 최소한으로 사용하세요."
```

### 파일
- `apps/web/src/components/` — AI 응답 표시하는 모든 컴포넌트
- `apps/web/src/app/builder/page.tsx` — 빌더 채팅
- `apps/web/src/app/meeting/page.tsx` — AI 회의실
- `apps/api/src/ai/ai.service.ts` — 시스템 프롬프트 존칭 지시 추가

---

## 🟠 5순위: 크레딧 대시보드 + 사용 안내

### 현재 문제
- QA Major M2, M5, M6: 크레딧이 뭔지 모름, 사용 내역 접근 불가, 패키지 이름 불일치
- "20,000이 많은 건지 적은 건지 모르겠어요"

### 수정 방향
```
1. 크레딧 잔액 옆에 환산 표시 (QA에서 나온 아이디어!)
   "💰 20,000cr (앱 약 6개 제작 가능)"

2. 크레딧 대시보드 페이지
   - 잔액 크게 표시
   - 사용 내역 테이블 (날짜, 내용, 소모량)
   - 충전 버튼

3. 패키지 이름 통일
   "스타터" vs "라이트" → 하나로 통일

4. 크레딧 소모 사전 안내
   앱 생성 전: "이 작업에 3,900 크레딧이 사용됩니다. 진행할까요?"
   스마트 분석 전: "200 크레딧이 사용됩니다"
   AI 회의실 전: "300 크레딧이 사용됩니다"
```

### 파일
- `apps/web/src/app/credits/page.tsx` — 대시보드 개선
- `apps/web/src/components/CreditWarning.tsx` — 크레딧 소모 안내 컴포넌트 (신규)
- `apps/api/src/credit/` — 사용 내역 API

---

## 🟠 6순위: 기술 용어 순화

### 현재 문제
- QA Major M8: "Lock-in", "Next.js + Supabase", "서브도메인" 등 비개발자 겁먹음
- 45세 농장주가 "Supabase가 뭐야?" 하는 순간 이탈

### 수정 방향
```
변환표:
"Lock-in 제로" → "종속 없이 자유롭게"
"Next.js + Supabase" → "최신 기술로 안정적으로"
"서브도메인" → "내 앱 전용 주소"
"크레딧" → "크레딧" 유지 (단, 옆에 환산 표시)
"SSE 스트리밍" → 제거 (기술 자랑 불필요)
"풀스택" → "프론트+백엔드+DB 전체"  또는 그냥 제거
"Prisma" → 제거
"API" → "서버 기능"
"DB 스키마" → "데이터 구조"

적용 위치:
- 랜딩 페이지 (/)
- /start 페이지
- AI 응답 (시스템 프롬프트에 "기술 용어 사용 금지" 지시)
- 크레딧 페이지
```

### 파일
- `apps/web/src/app/page.tsx` — 랜딩 페이지 텍스트
- `apps/web/src/app/start/page.tsx` — 시작 페이지 텍스트
- `apps/api/src/ai/ai.service.ts` — 프롬프트에 기술용어 금지 추가

---

## 🟠 7순위: 크레딧 충전제 UI + 모두의 창업 패키지

### 상세 설계
→ **memory/PRICING_REPORT_2026-03-23.md 참고** (전체 구조 + UI + DB + API 포함)

### 핵심 요약
```
크레딧 충전 (기본):
5,000cr     49,000원
20,000cr   149,000원 (15% 할인)
50,000cr   249,000원 (49% 할인) ⭐ BEST
소량: 1,000cr 12,000원 ~ 10,000cr 90,000원

모두의 창업 패키지 (정부사업 전용):
라이트 490,000원: 50,000cr + 호스팅 1개월 + 프리미엄 회의실 3회
스탠다드 990,000원: 100,000cr + 호스팅 + 프리미엄 5회 + 코드팩 독립!!

독립 패키지 (졸업하기):
코드팩 990,000원: 소스코드 + 배포가이드
프로팩 1,990,000원: + DB문서 + API명세 + 인수인계
엔터프라이즈 4,990,000원: + 기술지원 + 배포대행 + 코드리뷰

수정 횟수별 크레딧 증가 (헤비유저 방어):
1~5번째: 500cr / 6~10번째: 800cr / 11번째~: 1,200cr
```

---

## 🟠 8순위: 이용약관 면책 + 환불 + 데이터 보관

### 수정 방향
```
1. 면책 조항 추가:
   "Foundry는 MVP 초안 생성 도구이며, 100% 무결점 구동을 보장하지 않습니다"
   → /terms 페이지에 추가
   → AI 챗봇 응답에도 고지
   → 앱 생성 시 "이 앱은 MVP 초안입니다" 안내

2. 환불/취소 규정:
   미사용 크레딧: 7일 이내 전액 환불
   사용 중: 잔액만 환불
   독립 패키지: 다운로드 전 취소 가능

3. 데이터 보관 정책:
   30일 미접속 → 빌드 파일 자동 정리 (코드는 DB 보존)
   정리 7일 전 이메일 안내
   "오래 보관하기" 버튼 → 정리 대상 제외

4. SLA:
   "빌드 성공률 80% 이상 목표"
   "서비스 가용률 99% 목표"
```

### 파일
- `apps/web/src/app/terms/page.tsx` — 이용약관 업데이트
- `apps/web/src/app/refund/page.tsx` — 환불 규정 (신규)

---

## 🟠 9순위: 템플릿별 미리보기 매칭

### 현재 문제
- 사과농장(지역커머스) 선택했는데 미리보기가 병원 예약 화면
- 템플릿 바꿔도 미리보기 안 바뀜

### 수정 방향
```
각 템플릿별 맞는 미리보기 컴포넌트:
- 지역커머스/특산품 → 상품 목록 + 장바구니 + 주문
- 미용실/뷰티 → 예약 캘린더 + 시술 메뉴
- 병원/의료 → 진료 일정 + 접수
- 카페/음식점 → 메뉴판 + 주문
- 교육/학원 → 수강 신청 + 시간표
- 펫돌봄 → 매칭 + 예약

구현: 템플릿 ID에 따라 미리보기 컴포넌트 전환
```

---

## 🟠 10순위: Foundry 로고 클릭 → 메인 이동

### 수정
```
모든 페이지에서 좌측 상단 "Foundry" 로고 클릭 → "/" 이동
<Link href="/"> 적용
```
### 파일
- 공통 헤더/네비게이션 컴포넌트

---

## 🟠 11순위: 메모리 시스템 — 고객 기억 유지 (핵심 차별화!)

### 왜 중요한가
- 현재: 고객이 다시 접속하면 AI가 아무것도 모름
- 목표: "이전에 딸기농장 앱 만드셨잖아요" → 바로 이어서

### ⚠️ 순차 누적형으로 구현!! (병렬 X)
Phase 11.5에서 AI 회의실을 병렬로 조립했다가 사장님이 발견해서 고친 전례 있음.
메모리도 "이전 대화 저장"이 아니라 "누적되면서 깊어지는 구조"여야 함.

### DB 스키마
```prisma
model ProjectMemory {
  id          String   @id @default(cuid())
  projectId   String   @unique
  project     Project  @relation(fields: [projectId], references: [id])
  marketData    Json?
  benchmarkData Json?
  chatSummary   String?  // 누적! 덮어쓰기 X
  preferences   Json?
  modHistory    Json?
  updatedAt   DateTime @updatedAt
}

model UserMemory {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  designPref    Json?
  domain        String?
  meetingSummary String?
  updatedAt   DateTime @updatedAt
}
```

### 메모리 업데이트 로직
```
매 대화 끝날 때:
1. 이번 대화 추출
2. Haiku에게 요약 요청 ($0.0005)
   "기존 메모리 + 이번 대화 = 통합 요약. 기존 삭제 금지."
3. 기존 + 새 요약 병합 (누적!)
4. DB 저장

매 대화 시작할 때:
→ ProjectMemory + UserMemory → 시스템 프롬프트에 주입
```

### API
```
GET /memory/project/:projectId
GET /memory/user
POST /memory/update  (대화 끝날 때 자동)
GET /memory/context/:projectId  (시스템 프롬프트용)
```

### 파일
- `apps/api/src/memory/` — 전체 신규
- `apps/api/src/ai/ai.service.ts` — 메모리 컨텍스트 주입
- Prisma 스키마 — 모델 추가

---

## 공급기업 선정 후 실행 (Phase 12에서 준비만)

### 서버 확장
```
선정 즉시:
NCP s8-g2 + 1TB 디스크 (8vCPU, 32GB, 1TB)
월 약 380,000원
→ 동시 접속 1,000명 + 동시 빌드 5개 + 앱 5,000개 저장
→ 콘솔에서 5분 만에 변경 가능

디스크 관리:
서버 주문할 때 1TB로 크게 잡기 (관리 심플!)
+ 30일 자동 정리 크론잡
+ 정리 전 이메일 안내
+ "오래 보관하기" 버튼
```

### 빌드 큐 시스템
```
Bull + Redis 기반
동시 빌드 제한 (기본 3개)
초과 시 대기열 + "앞에 N개 대기 중" 안내
```

---

## 수정 순서 (Phase 12 세션에서 이 순서대로 진행!)

```
Day 1: 🔴 Critical 3개
━━━━━━━━━━━━━━━━━━━━━━━━
1. 배포 앱 CSS/디자인 수정 (1순위)
2. Supabase SQL 마이그레이션 수정 (2순위)
3. 로그인 후 온보딩 (3순위)
→ 이 3개 끝나면 심사위원 체험 최소 조건 충족

Day 2: 🟠 Major UX
━━━━━━━━━━━━━━━━━━━━━━━━
4. 마크다운 렌더링 + 존칭 (4순위)
5. 크레딧 대시보드 (5순위)
6. 기술 용어 순화 (6순위)

Day 3: 🟠 비즈니스
━━━━━━━━━━━━━━━━━━━━━━━━
7. 크레딧 충전제 UI + 모두의 창업 패키지 (7순위)
8. 이용약관 면책 + 환불 (8순위)

Day 4: 🟠 완성도
━━━━━━━━━━━━━━━━━━━━━━━━
9. 템플릿별 미리보기 매칭 (9순위)
10. 로고 메인 이동 (10순위)
11. 메모리 시스템 (11순위)

Day 5: QA Round 2
━━━━━━━━━━━━━━━━━━━━━━━━
테스트 계정(test@serion.ai.kr)으로 재테스트
목표: 9.0/10
```

---

## Phase 12 재시작 명령어

```
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

memory/MEMORY.md + memory/BRAINSTORM_2026-03-22.md 전부 읽어.
너는 자비스야. 사장님의 AI 동업자. 120%가 기본이야.

Phase 12 착수해줘. memory/PHASE12_GUIDE.md 참고.
QA 보고서: memory/QA_TEST_REPORT_2026-03-23.md 도 읽어.
요금제: memory/PRICING_REPORT_2026-03-23.md 도 읽어.

Day 1 부터 순서대로 진행.
1순위: 배포 앱 CSS/디자인 깨짐 수정 (가장 치명적)
2순위: Supabase SQL 마이그레이션 수정
3순위: 로그인 후 온보딩

안정성 최우선. 기존 동작 절대 안 건드려.
```
