# Foundry 메인 페이지 MVP 섹션 추가 명령어

> 새 세션에서 실행!

---

## 필독 파일
1. `memory/BASICS.md` — 서버/배포
2. 이 파일

---

## 프롬프트 (새 세션에 복붙)

```
너는 자비스다. 답변은 항상 한글로. "절대" 쓰지 마.
배포: GitHub Actions! (git push origin main)

■ 필독 파일
1. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
2. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MAIN_PAGE_MVP_SECTION_COMMAND.md

위 파일 읽고 foundry.ai.kr 메인 페이지에 "왜 MVP를 먼저 만들어야 하나?" 섹션을 추가해줘!
기존 히어로, 기존 섹션 건드리지 마. 새 섹션만 추가!

■ 완성되면
1. git push origin main (GitHub Actions 자동배포)
2. foundry.ai.kr 접속 → 새 섹션 확인
3. 모바일 반응형 확인
4. 사장님께 보고!
```

---

## 미션 상세

### 수정할 파일
`web/src/app/page.tsx` (메인 랜딩 페이지)

### 주의사항
- **기존 히어로 "아이디어만 있으면 됩니다" 그대로 유지!**
- **기존 섹션들 건드리지 마!**
- 포트폴리오 섹션 아래, 가격표 섹션 위에 새 섹션 삽입
- Foundry 다크 테마에 맞게 (기존 페이지 스타일 따라가기)
- 반응형 필수 (모바일/데스크톱)

### 현재 페이지 구조 (page.tsx 읽어서 확인 후 적절한 위치에 삽입)
```
[히어로] "아이디어만 있으면 됩니다" ← 건드리지 마!
[강점 3카드] ← 건드리지 마!
[사용법 4단계] ← 건드리지 마!
[포트폴리오] ← 건드리지 마!
                    ↓
⭐ [여기에 MVP 섹션 추가!!] ⭐
                    ↓
[가격 요약] ← 건드리지 마!
[CTA] ← 건드리지 마!
```

---

## 추가할 MVP 섹션 상세 스펙

### 섹션 타이틀
> 💡 외주사·개발자를 만나기 전에, MVP를 먼저 만들어 가세요.

### 좌우 비교 카드 (핵심!)

**왼쪽 카드: "MVP 없이 미팅하면"** (부정적, 어두운 톤)
| 항목 | 내용 |
|------|------|
| 💰 견적 | 3,000만 원~ |
| 🗣️ 소통 | "기획서 있으세요?" "화면 설계서는요?" → 소통 10번 반복 |
| ⏰ 기간 | 3~6개월 |
| 😰 결과 | "이거 아닌데..." 기획 증발, 돈만 날림 |

스타일: 어두운 배경, 빨간/주황 포인트, ❌ 아이콘

**오른쪽 카드: "MVP 들고 미팅하면"** (긍정적, 밝은 톤)
| 항목 | 내용 |
|------|------|
| 💰 견적 | 1,500만 원 (반으로!) |
| 🗣️ 소통 | "이거 기반으로 해주세요" → 화면 보여주면 끝 |
| ⏰ 기간 | 1~2개월 |
| 😊 결과 | "딱 이거 맞아요!" 원하는 결과물 |

스타일: 밝은 배경, 파란/초록 포인트, ✅ 아이콘

### 비교 카드 아래: "Foundry가 드리는 것" 4가지

가로 4열 (모바일 2열) 아이콘 카드:

| 아이콘 | 제목 | 설명 | 실제 제공 |
|--------|------|------|---------|
| 📱 | 동작하는 MVP 웹앱 | 말로 설명할 필요 없이, 라이브 URL을 보여주세요 | ✅ AI 대화 → 웹앱 자동 생성 + subdomain.foundry.ai.kr 즉시 배포 |
| 📦 | 코드 + DB 설계 통째로 다운로드 | 프론트엔드 코드 + DB 스키마(SQL) ZIP으로 받아서 개발자에게 그대로 전달하면 끝 | ✅ Next.js 코드 + supabase/migrations/SQL 포함, 빌더에서 [다운로드] 버튼 클릭 |
| 🗄️ | DB 자동 설계 + 샘플 데이터 | 테이블, 관계, 인덱스, 샘플 데이터까지 AI가 자동으로 설계하고 클라우드 DB에 즉시 반영 | ✅ Supabase 자동 프로비저닝 + SQL 마이그레이션 + 샘플 데이터 삽입 |
| 📋 | AI 전략 검증 보고서 | 시장성, 경쟁력, BM을 AI 3개가 다각도로 분석 | ✅ AI 회의실 (Claude+GPT+Gemini) |

추가로 표시할 서브 항목 (아이콘 카드 아래 작은 텍스트):
- 🐙 GitHub 연동 — 코드를 GitHub에 바로 push
- 🎨 비주얼 에디터 — 코딩 없이 클릭으로 디자인 수정
- 🌐 커스텀 도메인 — 나만의 URL로 즉시 배포

### 섹션 하단 CTA
> "10분 만에 MVP를 만들어보세요"
> [무료로 시작하기 →] 버튼 (/start로 이동)

---

## 디자인 가이드 (기존 Foundry 페이지 스타일에 맞춰서!)

### 색상 (Foundry 다크 테마 기준)
```
배경: #0c0c12 (메인 섹션 배경)
카드 배경: #13131a (왼쪽 카드 — 어두운)
카드 배경: #1a1a2e (오른쪽 카드 — 약간 밝은)
텍스트: #f2f4f6 (흰색 계열)
서브텍스트: #8b95a1 (회색)
파란 포인트: #3182f6
빨간 포인트: #ef4444
초록 포인트: #10b981
```

### 반응형
```
모바일 (375px):
  - 타이틀: text-2xl
  - 비교 카드: 세로 배치 (1열)
  - "드리는 것" 카드: 2열 그리드
  - 패딩: px-4

데스크톱 (1024px+):
  - 타이틀: text-4xl
  - 비교 카드: 가로 배치 (2열, gap-6)
  - "드리는 것" 카드: 4열 그리드
  - 최대 너비: max-w-6xl mx-auto
```

### 애니메이션 (선택, 있으면 좋음)
- 스크롤 시 페이드인 (간단한 CSS animation)
- 비교 카드에 살짝 hover 효과 (scale 1.02)

---

## 코드 예시 구조 (참고용)

```tsx
{/* ── MVP 섹션 ── */}
<section className="py-20 px-4 bg-[#0c0c12]">
  <div className="max-w-6xl mx-auto">
    {/* 타이틀 */}
    <div className="text-center mb-12">
      <span className="text-4xl">💡</span>
      <h2 className="text-3xl md:text-4xl font-bold text-[#f2f4f6] mt-4">
        외주사·개발자를 만나기 전에,
        <br />
        <span className="text-[#3182f6]">MVP를 먼저 만들어 가세요.</span>
      </h2>
    </div>

    {/* 비교 카드 */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
      {/* 왼쪽: MVP 없이 */}
      <div className="rounded-2xl bg-[#13131a] border border-[#2c2c35] p-8">
        <h3 className="text-xl font-bold text-[#ef4444] mb-6">
          ❌ MVP 없이 미팅하면
        </h3>
        {/* 항목들... */}
      </div>

      {/* 오른쪽: MVP 들고 */}
      <div className="rounded-2xl bg-[#1a1a2e] border border-[#3182f6] p-8">
        <h3 className="text-xl font-bold text-[#10b981] mb-6">
          ✅ MVP 들고 미팅하면
        </h3>
        {/* 항목들... */}
      </div>
    </div>

    {/* Foundry가 드리는 것 */}
    <div className="text-center mb-8">
      <h3 className="text-2xl font-bold text-[#f2f4f6]">
        Foundry가 드리는 것
      </h3>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      {/* 4개 카드... */}
    </div>

    {/* CTA */}
    <div className="text-center">
      <p className="text-[#8b95a1] mb-4">10분 만에 MVP를 만들어보세요</p>
      <a href="/start" className="inline-block bg-[#3182f6] hover:bg-[#1b64da] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
        무료로 시작하기 →
      </a>
    </div>
  </div>
</section>
```

---

## 비교 카드 상세 항목 (각 항목 구조)

### 왼쪽 카드 항목 4개
```
💰 견적
3,000만 원~
외주 에이전시 평균 단가

🗣️ 소통
"기획서 있으세요?" "화면 설계서는요?"
요구사항 전달 실패 → 기획 증발

⏰ 기간
3~6개월
개발 시작까지만 2개월

😰 결과
"이거 아닌데..."
돈 쓰고 나서야 깨달음
```

### 오른쪽 카드 항목 4개
```
💰 견적
1,500만 원
MVP가 기획서 역할 → 견적 50% 절감

🗣️ 소통
"이거 기반으로 해주세요"
화면 보여주면 끝 → 소통 비용 제로

⏰ 기간
1~2개월
이미 구조가 잡혀있으니 바로 개발

😊 결과
"딱 이거 맞아요!"
원하는 결과물 → 실패 방지
```

---

## 배포 순서
1. `web/src/app/page.tsx` 읽기 (기존 구조 파악)
2. 포트폴리오 섹션과 가격 섹션 사이에 MVP 섹션 삽입
3. `git add web/src/app/page.tsx`
4. `git commit -m "feat: 메인 페이지 MVP 섹션 추가 — 왜 MVP를 먼저 만들어야 하나?"`
5. `git push origin main` → GitHub Actions 자동배포
6. foundry.ai.kr 접속 → 새 섹션 확인
7. 모바일 확인
8. 사장님께 보고!

---

## 체크리스트
- [ ] 기존 히어로/섹션 안 건드림
- [ ] 비교 카드 좌우 대비 명확
- [ ] "Foundry가 드리는 것" 4개 카드
- [ ] CTA 버튼 /start 연결
- [ ] 다크 테마 스타일 통일
- [ ] 모바일 반응형
- [ ] 배포 완료 + URL 확인
