# 5일 종합 보고서 PDF 변환 명령서

> **사용법**: 새 세션에서 "5일 보고서 PDF 만들어줘" 하면 이 파일 그대로 실행.
> **작성**: 자비스 (2026-04-20)

---

## 🎯 미션

`launchpad/memory/phases/260420_5DAY_COMPREHENSIVE_REPORT.md` (537줄)을 **IR/심사위원/투자자 보여줄 수 있는 PDF**로 변환.

---

## 📂 입력 파일

```
/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260420_5DAY_COMPREHENSIVE_REPORT.md
```

## 📂 출력 파일

```
/Users/mark/Desktop/세리온 전략/Foundry_5일_보고서_2026-04-20.pdf
```

---

## 🛠 변환 방법 (3가지 옵션)

### 옵션 A: pandoc + LaTeX (가장 깔끔, 한국어 OK)

```bash
# 1. 의존성 확인 (mac)
brew install pandoc
brew install --cask mactex-no-gui   # 또는 basictex
which pandoc xelatex

# 2. 한국어 폰트 확인
fc-list :lang=ko | head -5
# 없으면: brew install --cask font-noto-sans-kr

# 3. 변환 실행
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
pandoc memory/phases/260420_5DAY_COMPREHENSIVE_REPORT.md \
  -o "/Users/mark/Desktop/세리온 전략/Foundry_5일_보고서_2026-04-20.pdf" \
  --pdf-engine=xelatex \
  -V mainfont="Noto Sans CJK KR" \
  -V monofont="D2Coding" \
  -V geometry:margin=2cm \
  -V documentclass=article \
  -V fontsize=10pt \
  --toc --toc-depth=2 \
  --highlight-style=tango
```

### 옵션 B: pandoc + wkhtmltopdf (간단, 빠름)

```bash
brew install pandoc wkhtmltopdf

cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
pandoc memory/phases/260420_5DAY_COMPREHENSIVE_REPORT.md \
  -o "/Users/mark/Desktop/세리온 전략/Foundry_5일_보고서_2026-04-20.pdf" \
  --pdf-engine=wkhtmltopdf \
  -V margin-top=20mm -V margin-bottom=20mm \
  -V margin-left=20mm -V margin-right=20mm \
  --toc --toc-depth=2
```

### 옵션 C: Markdown → HTML → 브라우저 인쇄 (실패시 fallback)

```bash
# 1. HTML 변환
pandoc memory/phases/260420_5DAY_COMPREHENSIVE_REPORT.md \
  -o /tmp/report.html \
  --standalone \
  --css=/dev/stdin <<< 'body{font-family:"Noto Sans CJK KR",sans-serif;max-width:900px;margin:auto;padding:40px;line-height:1.6;}h1,h2,h3{color:#3182F6;}table{border-collapse:collapse;}td,th{border:1px solid #ddd;padding:8px;}code{background:#f4f4f4;padding:2px 6px;border-radius:4px;}'

# 2. 브라우저로 열고 사장님이 직접 ⌘P → "PDF로 저장"
open -a "Google Chrome" /tmp/report.html
```

---

## 📐 PDF 디자인 가이드 (IR 어필)

### 표지 추가 (옵션 A 사용 시)

`memory/phases/_pdf_cover.md` 신규 파일:
```markdown
---
title: |
  Foundry Agent Mode v1
  5일 종합 보고서
subtitle: |
  한국 첫 자율 AI Agent SaaS 구축 사이클
author: 김형석 (Foundry CEO) · 자비스 · 명탐정
date: 2026년 4월 20일
geometry: margin=2cm
mainfont: Noto Sans CJK KR
documentclass: article
fontsize: 10pt
---
```

표지 + 본문 합치기:
```bash
pandoc memory/phases/_pdf_cover.md memory/phases/260420_5DAY_COMPREHENSIVE_REPORT.md \
  -o "/Users/mark/Desktop/세리온 전략/Foundry_5일_보고서_2026-04-20.pdf" \
  --pdf-engine=xelatex \
  -V mainfont="Noto Sans CJK KR" \
  --toc --toc-depth=2
```

### 색상/스타일 (옵션 B/C)

```css
body { font-family: 'Noto Sans CJK KR', '맑은 고딕', sans-serif; }
h1 { color: #3182F6; border-bottom: 3px solid #3182F6; padding-bottom: 8px; }
h2 { color: #3182F6; margin-top: 30px; }
h3 { color: #1F2937; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; }
th { background: #3182F6; color: white; padding: 10px; text-align: left; }
td { padding: 8px; border: 1px solid #ddd; }
code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
pre { background: #f8f8f8; padding: 12px; border-left: 4px solid #3182F6; }
blockquote { border-left: 4px solid #3182F6; padding-left: 16px; color: #555; }
```

---

## ⚠️ 주의사항

1. **한국어 폰트 필수** — Noto Sans CJK KR 또는 맑은 고딕
2. **이모지 처리** — 옵션 A (xelatex)는 이모지 깨짐 가능 → 옵션 B/C 권장
3. **표 너비** — 긴 표는 자동 잘림, 옵션 A 시 `--columns=120` 추가
4. **이미지 X** — 보고서에 이미지 없으니 그대로 OK
5. **저장 경로** — `세리온 전략/` 폴더 (사장님 IR 자료 위치)

---

## 🎯 권장 실행 순서

```bash
# 1. 의존성 설치
brew install pandoc
brew install --cask wkhtmltopdf

# 2. 옵션 B 시도 (가장 빠름)
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
pandoc memory/phases/260420_5DAY_COMPREHENSIVE_REPORT.md \
  -o "/Users/mark/Desktop/세리온 전략/Foundry_5일_보고서_2026-04-20.pdf" \
  --pdf-engine=wkhtmltopdf \
  --toc --toc-depth=2

# 3. 결과 확인
open "/Users/mark/Desktop/세리온 전략/Foundry_5일_보고서_2026-04-20.pdf"

# 4. 한국어 깨지면 옵션 C로 fallback
```

---

## 📨 사장님 보고 형식

```
✅ Foundry_5일_보고서_2026-04-20.pdf 생성 완료
- 페이지 수: ~25~30
- 크기: ~500KB~1MB
- 위치: /Users/mark/Desktop/세리온 전략/
- 변환 방법: 옵션 X
- 한국어/이모지/표: OK
- IR/심사위원 어필 가능 수준
```

---

## 🚀 다음 단계 (PDF 후)

1. 사장님이 PDF 내용 검토
2. 추가 보강 필요 시 → MD 수정 → 재변환
3. IR 자료에 첨부
4. 책 챕터 작성 (BOOK_CHAPTER_COMMAND.md 참조)

GO! 🎯
