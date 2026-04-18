# Foundry 데모앱 공장 — 제작 지시서
> 이 파일은 데모앱을 찍어내는 **공장 설명서**입니다.
> "뭘 만들지"는 이 파일에 없음 → 프롬프트로 주제만 던지면 됨.

---

## 1. 왜 만드나?

- Foundry(foundry.ai.kr) = AI로 웹앱 자동 생성하는 SaaS
- **모두의창업 공급기업 심사**: 평가위원이 직접 URL 접속해서 시연
- 포트폴리오에 다양한 분야의 데모앱이 있어야 "이걸로 이런 것도 만들 수 있구나!" 증명
- Foundry AI로 만들면 Anthropic API 비용 발생 → **코드로 직접 빌드해서 비용 $0**

---

## 2. 필수 참조 파일

| 파일 | 용도 |
|------|------|
| `memory/BASICS.md` | 서버/계정/기술스택/배포 방식 |
| `memory/MEMORY.md` | Foundry 장기 기억 |
| `memory/DEMO_APP_FACTORY.md` | 이 파일 (제작 지시서) |

---

## 3. 기술 스펙 (모든 데모앱 공통)

```
- Next.js 16 + Tailwind v4 + TypeScript
- Static Export (output: 'export') — 서버 불필요, nginx가 정적 파일 서빙
- DB 없음 — 샘플 데이터 하드코딩 (Supabase 사용 X = 비용 $0)
- 모바일 반응형 필수
- 한국어 UI
- 밝은 테마 (다크 X)
- 페이지 3~5개 (홈 + 기능 2~3개 + 프로필/설정)
```

---

## 4. 프로젝트 구조 (이 구조 그대로)

```
[앱이름]/
├── package.json
│   {
│     "name": "[앱이름]",
│     "version": "1.0.0",
│     "private": true,
│     "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
│     "dependencies": {
│       "next": "^16.0.0",
│       "react": "^19.0.0",
│       "react-dom": "^19.0.0",
│       "typescript": "^5.0.0",
│       "tailwindcss": "^4.0.0",
│       "@tailwindcss/postcss": "^4.0.0",
│       "lucide-react": "^0.400.0"
│     }
│   }
│
├── next.config.ts
│   const config = { output: 'export', images: { unoptimized: true } };
│   export default config;
│
├── tsconfig.json            (Next.js 기본 + paths: {"@/*": ["./src/*"]})
│
├── postcss.config.mjs
│   export default { plugins: { '@tailwindcss/postcss': {} } };
│
├── src/
│   ├── app/
│   │   ├── globals.css      (@import "tailwindcss";)
│   │   ├── layout.tsx       ('use client', <html lang="ko">, Pretendard 폰트 CDN)
│   │   ├── page.tsx          (홈/랜딩 — 히어로 + 핵심기능 소개 + CTA)
│   │   ├── [기능1]/page.tsx
│   │   ├── [기능2]/page.tsx
│   │   └── [기능3]/page.tsx  (선택)
│   └── components/           (공통: Header, Footer, Navigation 등)
```

---

## 5. 디자인 가이드 — Foundry가 만든 앱처럼 + 분야별 차별화!

> 중요: "Foundry AI가 자동 생성한 앱"으로 보이되, 앱마다 개성 있게!
> 공통 구조는 유지하면서 색상/아이콘/레이아웃으로 분야 차별화

```css
/* CSS 변수 (layout.tsx의 <style>에 삽입) */
:root {
  --color-primary: #3182f6;         /* 메인 파란색 */
  --color-primary-hover: #1b64da;
  --color-secondary: #6366f1;       /* 보라색 포인트 */
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-border: #e2e8f0;
  --color-accent: #f59e0b;          /* 강조 노란색 */
}
```

- 아이콘: `lucide-react` 사용
- 폰트: Pretendard Variable (CDN)
- 모서리: `rounded-xl` (12px)
- 그림자: `shadow-sm` 또는 `shadow-md`
- 버튼: `bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-semibold`
- 하단 챗봇: 우하단 고정 `💬` 원형 버튼 (Foundry 앱 시그니처)
- `data-component` 속성: 비주얼 에디터 호환용

### 분야별 색상 차별화 (앱마다 다르게!)
| 분야 | primary 색상 | 히어로 그래디언트 | 분위기 |
|------|-------------|----------------|--------|
| 돌봄/시니어 | #10b981 초록 | green-50 → teal-50 | 따뜻하고 안정적 |
| 카페/소상공인 | #92400e 갈색 | amber-50 → orange-50 | 커피톤 |
| 로컬 커뮤니티 | #7c3aed 보라 | purple-50 → pink-50 | 활기차고 소셜 |
| AI 진단/건강 | #0ea5e9 하늘 | sky-50 → blue-50 | 신뢰감 |
| 교육 | #f59e0b 노랑 | yellow-50 → amber-50 | 밝고 활동적 |
| 반려동물 | #f97316 주황 | orange-50 → red-50 | 귀엽고 따뜻 |
| 운동/웰니스 | #ef4444 빨강 | red-50 → rose-50 | 에너지 |

### 레이아웃 패턴 (앱마다 다른 패턴 적용!)

| 패턴 | 구조 | 적합한 앱 |
|------|------|----------|
| **A. 랜딩형** | 히어로 → 기능카드 → 후기 → CTA | 커머스, 구독, 농산물 |
| **B. 대시보드형** | 사이드바 + 통계카드 + 차트 + 테이블 | 매장관리, 매출, ERP |
| **C. 피드형** | 상단탭 + 카드 리스트(무한스크롤 느낌) | 커뮤니티, 소식, SNS |
| **D. 카드그리드형** | 필터바 + 카드 그리드 2~3열 | 상품목록, 포트폴리오, 매칭 |
| **E. 스텝형** | 단계별 입력 → 결과 표시 | AI진단, 설문, 체크리스트 |
| **F. 탭형** | 하단 또는 상단 탭 네비게이션 + 각 탭별 컨텐츠 | 펫기록, 운동, 일지 |

### 레이아웃 선택 UI (B 구현 시 고객에게 보여줄 선택지)

| 선택지 | 고객 언어 | 레이아웃 | 데모앱 (썸네일 이미지) |
|--------|---------|---------|---------------------|
| 1 | 서비스 소개 | A. 랜딩형 | 백설공주 사과농장 |
| 2 | 매장/업무 관리 | B. 대시보드형 | 카페노트 |
| 3 | 소식/커뮤니티 | C. 피드형 | 우리동네 |
| 4 | AI 진단/테스트 | E. 스텝형 | 꿀잠체크 |
| 5 | 일지/기록 관리 | F. 탭형 | 멍냥일기 |
| 6 | 포트폴리오/갤러리 | D. 카드그리드형 | 마이폴리오 |
| 7 | 쇼핑몰/상품 판매 | G. 커머스앱형 | 스마트몰 |
| 8 | **선택 안 함 (AI 추천)** | AI 판단 | 기존 Foundry 방식 |

- **필수 선택** — 안 고르면 다음 단계 비활성화
- **같은 영역에 서브도메인(URL) 필수 입력**
- 선택지 썸네일 = 데모앱 스크린샷 재활용
- "선택 안 함" = AI가 아이디어에 맞는 레이아웃을 알아서 결정 (기존 방식 유지)

→ 프롬프트에 "레이아웃: B. 대시보드형" 이렇게 한 줄 추가하면 됨!

### text-white 주의
배포 후 HTML에 CSS 패치 필수 (Step 4 참고)
- 카드: `bg-white rounded-xl shadow-sm p-6`

---

## 6. 제작 → 배포 순서

### Step 1: 코드 작성
```bash
# 작업 경로
mkdir -p "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/demos/[앱이름]"
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/demos/[앱이름]"
```

### Step 2: 로컬 빌드 테스트
```bash
npm install
npx next build
# ↑ 에러 0 확인! 에러 있으면 배포 금지!
# out/ 폴더가 생겨야 함
```

### Step 3: 서버에 업로드
```bash
# 서브도메인 이름: 짧고 기억하기 좋게 (예: cafe-note, pet-diary, sleep-check)
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 "mkdir -p /var/www/apps/[서브도메인]"
scp -P 3181 -i ~/.ssh/serion-key.pem -r out/* root@175.45.200.162:/var/www/apps/[서브도메인]/
```

### Step 4: text-white CSS 패치 (Tailwind CDN 폴백 이슈)
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 '
for f in /var/www/apps/[서브도메인]/*.html; do
  sed -i "s|</head>|<style id=\"foundry-fix-white\">\
.text-white,[class*=\"text-white\"]{color:#fff!important}\
.bg-white,[class*=\"bg-white\"]{background-color:#fff!important}\
.border-white,[class*=\"border-white\"]{border-color:#fff!important}\
</style>\n</head>|" "$f"
done
'
```

### Step 5: 접속 확인
```
https://[서브도메인].foundry.ai.kr
```
- nginx 와일드카드 라우팅 자동 (설정 불필요)
- SSL 와일드카드 인증서 자동 (설정 불필요)

### Step 6: DB에 프로젝트 등록 (포트폴리오 표시용)
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 "
PGPASSWORD=launchpad1234 psql -h localhost -U launchpad -d launchpaddb -c \"
INSERT INTO projects (id, name, description, template, status, subdomain, \\\"deployedUrl\\\", \\\"userId\\\", \\\"buildStatus\\\", \\\"currentVersion\\\", \\\"createdAt\\\", \\\"updatedAt\\\", \\\"totalModifications\\\")
VALUES ('demo-[앱이름]', '[앱 표시명]', '[한 줄 설명]', 'custom', 'deployed', '[서브도메인]', 'https://[서브도메인].foundry.ai.kr', 'cmmvse7h00000rh8h9fxxipdd', 'done', 1, NOW(), NOW(), 0);
\"
"
```

---

## 7. 품질 기준 (배포 전 체크리스트)

- [ ] `npx next build` 에러 0
- [ ] 모바일(375px)에서 깨지지 않음
- [ ] 한국어 UI + 자연스러운 샘플 데이터
- [ ] 모든 페이지 네비게이션 작동
- [ ] 이미지 깨짐 없음 (이미지는 lucide 아이콘이나 emoji로 대체)
- [ ] 버튼 클릭 시 페이지 이동 정상
- [ ] text-white CSS 패치 적용됨

---

## 8. 서버 정보

| 항목 | 값 |
|------|-----|
| IP | 175.45.200.162 |
| SSH 포트 | 3181 (22번 아님!) |
| SSH 명령 | `ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162` |
| 배포 경로 | `/var/www/apps/[서브도메인]/` |
| DB | PostgreSQL / launchpaddb / launchpad / launchpad1234 |
| 도메인 | `*.foundry.ai.kr` (와일드카드) |
| 관리자 userId | `cmmvse7h00000rh8h9fxxipdd` |

---

## 9. 이미 만든 데모앱

| 앱 | 서브도메인 | URL | 분야 |
|----|----------|-----|------|
| 백설공주 사과농장 | app-7063 | https://app-7063.foundry.ai.kr | 농업/식품 | A. 랜딩형 |
| petmate | petmate | https://petmate.foundry.ai.kr | 반려동물 (기존) | - |

### 추가 레이아웃 패턴: G. 커머스 앱형 (와이즐리 레퍼런스)
```
┌──────────────────┐
│ 브랜드 로고    🔍 │  ← 상단 헤더
├──────────────────┤
│ 프로모션 배너 슬라이드 │  ← 자동 슬라이드 (2/4)
│   (히어로 이미지)    │
├──────────────────┤
│ ○ ○ ○ ○ ○      │  ← 카테고리 아이콘 (베스트/특가/신상 등)
├──────────────────┤
│ 대표 상품 ⭐  전체보기>│
│ ┌────┐ ┌────┐    │  ← 상품 카드 그리드 (이미지+가격+담기)
│ │    │ │    │    │
│ │ 담기│ │ 담기│    │
│ └────┘ └────┘    │
├──────────────────┤
│ 카테고리|검색|홈|MY|장바구니│  ← 하단 고정 탭바
└──────────────────┘
```
적합한 앱: 쇼핑몰, 구독커머스, 식품몰, 뷰티몰

---

## 10. 사용 방법

프롬프트 예시:
```
데모앱 만들어줘.
memory/DEMO_APP_FACTORY.md 읽고 그대로 따라해.

■ 앱 정보
- 이름: 카페노트
- 서브도메인: cafe-note
- 분야: 소상공인 매장관리
- 한 줄 설명: 1인 카페 사장님을 위한 매출·재고 대시보드
- 페이지: 홈(오늘 매출 요약) / 매출기록 / 재고관리 / 설정
- 샘플 데이터: 아메리카노 4,500원, 라떼 5,000원, 크로와상 3,500원 등
- 색상: 갈색 계열 (#8B4513 primary)
```

이렇게 주제만 바꿔서 던지면 같은 구조로 앱이 찍혀 나옴!

---

## 11. 주의사항

- Foundry AI 생성 사용 X (비용 절감!)
- GitHub push 하지 마 (데모앱은 서버에 직접 scp)
- 서브도메인은 영문 소문자 + 하이픈만
- 완성되면 사장님께 URL 보여드리고 확인받기
- **배포 전 사장님께 확인 후 배포!**
