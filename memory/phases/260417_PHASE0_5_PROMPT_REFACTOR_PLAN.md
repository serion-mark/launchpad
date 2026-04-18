# 🏗️ Phase 0.5 — 프롬프트 .md 리팩토링 (F4 근본 해결)

> **버전:** 2026-04-17 신규 (사장님 4차 통찰)
> **선행 조건:** Phase 0 완료 + 24시간 안정
> **소요 시간:** 1~1.5일 (17단계)
> **목표:** F4 7~10건 → 0~2건, 앱당 비용 30%↓, 빌드 시간 30%↓

---

## 🎯 배경 — 사장님 통찰 4개

1. **"한방에 다 해결하려는 게 문제"** → FRONTEND 프롬프트 ~270줄이 F4 주범
2. **".md 파일 읽게 하는 방식"** → Claude Code skill 패턴 적용
3. **"백엔드/프론트 분리"** → 이미 6개 프롬프트 있지만 프론트엔드 1개가 과비대
4. **"선행 작업이 먼저"** → Phase 1B 풀 E2E 실패 막으려면 지금 고쳐야

---

## 🔑 핵심 구분 (반드시 준수!)

| 축 | 내용 | 위치 | 변경 빈도 |
|----|------|------|----------|
| **지침 (How)** | 스타일/구조/패턴 | `.md` 파일 | 드물게 |
| **요구 (What)** | 기능/이름/도메인 | 매 호출 동적 주입 | **매번** |

**.md 에는 절대 비즈니스 로직 넣지 말 것!**
- ❌ `pages/dashboard.md`에 "매출 차트 반드시 포함"
- ✅ `pages/dashboard.md`에는 "카드 그리드 레이아웃, 반응형 breakpoint"

---

## 🏗️ 목표 구조

```
launchpad/api/src/ai/prompts/
├── core.md                    # 공통 코어 (30줄) — 항상 로드
├── pages/
│   ├── dashboard.md           # 대시보드 페이지 전용 (50줄)
│   ├── list.md                # 리스트 페이지 전용 (50줄)
│   ├── form.md                # 폼 페이지 전용 (50줄)
│   └── detail.md              # 상세 페이지 전용 (50줄)
├── fixed-templates/           # AI 생성 X, 그대로 복붙
│   ├── supabase-client.tsx    # ENHANCEMENT #9 해결!
│   ├── layout.tsx
│   └── next.config.ts
└── patterns/
    ├── tailwind.md            # 검증된 className (30줄)
    └── responsive.md          # 반응형 브레이크포인트 (20줄)
```

### 조합 로직 (PromptComposer)
```
페이지 타입 판별 (architecture.json의 pages[i].type)
   ↓
core.md (30줄) + pages/{type}.md (50줄) + patterns/tailwind.md (30줄)
   = 프롬프트 총 ~110줄 (기존 270줄 → 60% 감소)
```

---

## 📋 17단계 흐름

```
[준비]     0.5-1. 롤백 기준점 확인 (git tag)
[준비]     0.5-2. 현재 프롬프트 크기 실측
[준비]     0.5-3. prompts/ 디렉토리 구조 생성

[추출]     0.5-4. core.md 추출 (공통 규칙)
[추출]     0.5-5. pages/dashboard.md 추출
[추출]     0.5-6. pages/list.md 추출
[추출]     0.5-7. pages/form.md 추출
[추출]     0.5-8. pages/detail.md 추출
[추출]     0.5-9. patterns/tailwind.md 추출

[고정]     0.5-10. fixed-templates/supabase-client.tsx
[고정]     0.5-11. fixed-templates/layout.tsx

[구현]     0.5-12. PromptComposer 서비스 구현
[구현]     0.5-13. ai.service.ts 통합

[검증]     0.5-14. 기존 앱 재생성 호환 검증
[검증]     0.5-15. 풀 E2E 1회 ($5~7) → F4 2건 이하
[검증]     0.5-16. tsc + 배포 + 헬스체크

[완료]     0.5-17. 완료 보고 + 사장님 확인
```

---

## 🚦 Step 0.5-1: 롤백 기준점 확인 (5분)

### 사전 검증
```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
git tag | grep pre-prompt-refactor
# 예상: pre-prompt-refactor
```

### ❌ 태그 없으면
```bash
git status                                       # clean 확인
git tag -a pre-prompt-refactor -m "프롬프트 .md 리팩토링 전 롤백 기준점"
git push origin pre-prompt-refactor
```

### ✅ 진행 조건
- [ ] 태그 `pre-prompt-refactor` 존재
- [ ] 원격에도 푸시됨

---

## 🚦 Step 0.5-2: 현재 프롬프트 크기 실측 (10분)

### 목적
리팩토링 **전후 비교** 데이터 확보 (성과 입증용).

```bash
grep -n "^const [A-Z_]*_PROMPT = \`" api/src/ai/ai.service.ts
# 예상 출력 (6개):
# 42:const BUILDER_SYSTEM_PROMPT
# 146:const SCHEMA_SYSTEM_PROMPT
# 199:const BACKEND_SYSTEM_PROMPT
# 220:const FRONTEND_SYSTEM_PROMPT
# 492:const MODIFY_SYSTEM_PROMPT
# 514:const GENERATE_SYSTEM_PROMPT
```

### 각 프롬프트 줄수 계산
```bash
# FRONTEND 프롬프트 (주범!)
awk '/^const FRONTEND_SYSTEM_PROMPT = `/,/^`;$/' api/src/ai/ai.service.ts | wc -l
# 예상: ~270줄
```

### 기록
`memory/phases/260417_PHASE0_5_METRICS_BEFORE.md` 에 저장:
```
FRONTEND_SYSTEM_PROMPT: XXX 줄
BUILDER_SYSTEM_PROMPT: XX 줄
...
F4 평균 발생: 7~10건/앱 (ENHANCEMENT_PLAN #8 기준)
```

---

## 🚦 Step 0.5-3: prompts/ 디렉토리 구조 생성 (5분)

```bash
mkdir -p api/src/ai/prompts/{pages,fixed-templates,patterns}
touch api/src/ai/prompts/core.md
touch api/src/ai/prompts/pages/{dashboard,list,form,detail}.md
touch api/src/ai/prompts/fixed-templates/{supabase-client.tsx,layout.tsx,next.config.ts}
touch api/src/ai/prompts/patterns/{tailwind,responsive}.md
```

### 검증
```bash
tree api/src/ai/prompts/
# 11개 파일 생성 확인
```

---

## 🚦 Step 0.5-4: core.md 추출 (30분)

### 목적
**모든 페이지 생성에 공통으로 필요한 규칙**만 뽑아 `core.md`로.

### FRONTEND_SYSTEM_PROMPT에서 뽑을 내용 (공통 부분)
- 기술 스택 고정 (Next.js 16, React 19, Tailwind v4)
- 금지 사항 (CSS-in-JS, styled-components 등)
- data-component / data-foundry-file 속성 규칙
- 필수 import 순서

### 뽑지 말 것 (지침이 아니라 동적)
- 프로젝트 이름, 기능 리스트, 사용자 답변

### core.md 샘플
```markdown
# Foundry 코드 생성 코어 규칙

## 기술 스택 (고정)
- Next.js 16 App Router
- React 19
- Tailwind CSS v4 (`@import "tailwindcss";`)
- TypeScript strict

## 금지 사항
- CSS-in-JS, styled-components, emotion
- `@tailwind base/components/utilities` (v4에서 제거)
- 기본 export 없는 page.tsx

## data 속성 규칙
- 주요 섹션: `data-component="SectionName"`
- 파일 경계: `data-foundry-file="app/xxx/page.tsx"`

## 파일 크기 규칙 (F4 예방!)
- 각 파일 300줄 이내
- 300줄 초과 예상 시 컴포넌트 분리
- Tailwind className 인라인 1줄 (줄바꿈 금지)
- 장식용 주석 금지
```

### 검증
```bash
wc -l api/src/ai/prompts/core.md
# 예상: 30줄 내외
```

---

## 🚦 Step 0.5-5~8: pages/*.md 추출 (각 30분, 총 2시간)

### 각 페이지 타입별 특성만 .md로

### pages/dashboard.md
- 카드 그리드 레이아웃 (2~4 열)
- 반응형: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- 주요 컴포넌트: StatCard, Chart 자리, RecentList

### pages/list.md
- 테이블 또는 리스트 아이템
- 검색 + 필터 상단
- 페이지네이션 하단
- 아이템 클릭 → 상세 페이지 이동

### pages/form.md
- 입력 필드 세로 배치
- 라벨 + input + 에러 메시지
- 제출 버튼 하단 전체 너비 또는 우측 정렬
- 검증 피드백 실시간

### pages/detail.md
- 헤더 (뒤로가기 + 제목 + 액션 버튼)
- 섹션 분리 (정보 / 관련 항목 / 이력)
- 수정/삭제 버튼

### ⚠️ 주의
- **업종별 편향 금지** (쇼핑몰 특화 내용 등 X)
- 구조/레이아웃만, 비즈니스 로직 X

---

## 🚦 Step 0.5-9: patterns/tailwind.md 추출 (30분)

### 검증된 className 패턴만
```markdown
# Tailwind 패턴

## 색상 (semantic)
- primary: `bg-blue-600 hover:bg-blue-700 text-white`
- secondary: `bg-gray-100 hover:bg-gray-200 text-gray-900`
- danger: `bg-red-600 hover:bg-red-700 text-white`

## 간격
- 카드: `p-6 rounded-lg shadow`
- 버튼: `px-4 py-2 rounded-md`

## 타이포
- 제목: `text-2xl font-bold`
- 본문: `text-sm text-gray-700`
```

---

## 🚦 Step 0.5-10~11: fixed-templates/ 고정 (각 30분)

### supabase-client.tsx (ENHANCEMENT_PLAN #9 해결!)
```typescript
// 이 파일은 AI가 생성하지 않고 그대로 복붙
'use client';
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 로직 변경
`ai.service.ts`에서 supabase/client.tsx 생성 호출을 **템플릿 복붙**으로 교체:
```typescript
// Before (F4 주범)
const supabaseClient = await this.generateFile('supabase/client.tsx', prompt);

// After
const supabaseClient = await fs.readFile(
  path.join(__dirname, 'prompts/fixed-templates/supabase-client.tsx'),
  'utf-8'
);
```

---

## 🚦 Step 0.5-12: PromptComposer 서비스 구현 (2시간)

### 신규 파일: `api/src/ai/prompt-composer.service.ts`

```typescript
@Injectable()
export class PromptComposerService {
  private readonly promptsDir = path.join(__dirname, 'prompts');
  private cache = new Map<string, string>();

  async loadCore(): Promise<string> {
    return this.loadCached('core.md');
  }

  async loadPageTemplate(type: 'dashboard' | 'list' | 'form' | 'detail'): Promise<string> {
    return this.loadCached(`pages/${type}.md`);
  }

  async loadPattern(name: 'tailwind' | 'responsive'): Promise<string> {
    return this.loadCached(`patterns/${name}.md`);
  }

  async composeForPage(pageType: string): Promise<string> {
    const core = await this.loadCore();
    const page = await this.loadPageTemplate(pageType as any);
    const tailwind = await this.loadPattern('tailwind');
    return `${core}\n\n${page}\n\n${tailwind}`;
  }

  async loadFixedTemplate(name: string): Promise<string> {
    return fs.readFile(
      path.join(this.promptsDir, 'fixed-templates', name),
      'utf-8'
    );
  }

  private async loadCached(relativePath: string): Promise<string> {
    if (this.cache.has(relativePath)) return this.cache.get(relativePath)!;
    const content = await fs.readFile(
      path.join(this.promptsDir, relativePath),
      'utf-8'
    );
    this.cache.set(relativePath, content);
    return content;
  }
}
```

### 검증
- [ ] tsc 에러 0
- [ ] 단위 테스트 (선택): 각 loadXxx() 호출 시 문자열 반환

---

## 🚦 Step 0.5-13: ai.service.ts 통합 (2시간)

### 기존 FRONTEND_SYSTEM_PROMPT 사용처 교체

```typescript
// Before (라인 1200대 근처)
const result = await this.callWithFallback(tier, FRONTEND_SYSTEM_PROMPT, messages);

// After
const systemPrompt = await this.promptComposer.composeForPage(pageType);
const result = await this.callWithFallback(tier, systemPrompt, messages);
```

### 파일 타입 판별 로직
```typescript
function inferPageType(page: any): 'dashboard' | 'list' | 'form' | 'detail' {
  const name = (page.name || '').toLowerCase();
  const path = (page.path || '').toLowerCase();
  
  if (name.includes('dashboard') || name.includes('대시보드')) return 'dashboard';
  if (name.includes('list') || name.includes('목록') || path.match(/\/[a-z]+s?\/?$/)) return 'list';
  if (name.includes('form') || name.includes('등록') || name.includes('추가')) return 'form';
  if (path.includes('[id]') || path.includes('detail')) return 'detail';
  return 'list'; // 기본값
}
```

### 기존 FRONTEND_SYSTEM_PROMPT 상수
- **삭제 X** (롤백 대비 주석 처리만)
- 리팩토링 검증 완료 후 Step 0.5-17에서 제거

---

## 🚦 Step 0.5-14: 기존 앱 재생성 호환 검증 (1시간)

### 목적
동일 입력 → 동일(수준) 출력 보장. 규격 변경이나 퀄리티 저하 없는지.

### 방법
1. 기존 사용자 프로젝트 중 간단한 것 1개 선택 (예: 심사위원 MediTracker)
2. 같은 입력으로 앱 재생성
3. 생성 결과 비교:
   - pages 배열 동일/유사?
   - 기능 누락 없음?
   - 파일 수 비슷? (±3개 이내)

### 비용: 약 $3~5

### ✅ 통과 조건
- [ ] 기능 누락 0건
- [ ] 파일 수 기존 ±3 이내
- [ ] 빌드 성공

### ❌ 실패 시
- 어떤 .md가 부족한지 분석
- 빠진 지시 추가
- 재생성

---

## 🚦 Step 0.5-15: 풀 E2E 1회 — F4 감소 확인 (30분)

### 시나리오: 어제 심사위원 재현
```
입력:
- 건강관리 템플릿
- 기능 7개: dashboard, auth, goal, medication, tracking, report, reservation, booking
- "스마트 분석 후 생성"
```

### 🎯 성공 기준 (F4 근본 해결 확인!)
- ✅ F4 발생 **< 3건** (기존 7~10건 → 0~2건)
- ✅ 빌드 성공 (F6 1~2회)
- ✅ 모든 기능 포함 (reservation/booking 있음)
- ✅ 배포 성공

### 비용: 약 $3~5 (F4 줄어서 기존 $5~7보다 저렴)

### ❌ F4 ≥ 3건이면
- 원인 분석:
  - (a) .md 지시 부족 → 추가
  - (b) 파일 타입 판별 오분류 → inferPageType 로직 개선
  - (c) 특정 page.tsx가 여전히 긴 인라인 → 컴포넌트 분리 강화 지시
- 수정 후 재테스트

---

## 🚦 Step 0.5-16: tsc + 배포 + 헬스체크 (20분)

```bash
npx tsc --noEmit -p api/tsconfig.build.json
# exit 0

git add api/src/ai/prompts \
        api/src/ai/prompt-composer.service.ts \
        api/src/ai/ai.service.ts \
        api/src/ai/ai.module.ts

git commit -m "refactor: Phase 0.5 — 프롬프트 .md 분리 (F4 근본 해결)"
git push origin main
```

### 90초 대기 후
```bash
gh run list --limit 1
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "curl -s http://localhost:4000/api/health && pm2 status | grep launchpad"
```

### ⚠️ 배포 후 다른 작업 금지 (명탐정 규칙)
90초 대기 중엔 로그 관찰만.

---

## 🚦 Step 0.5-17: 완료 보고

### 사장님 브리핑
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ Phase 0.5 완료 보고
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ✅ 완료 단계 (17/17)
- 롤백 기준점: pre-prompt-refactor ✅
- .md 파일 9개 + 고정 템플릿 3개 ✅
- PromptComposer 구현 ✅
- ai.service.ts 통합 ✅

## 📊 성과 측정
- 프롬프트 크기: 270줄 → 110줄 (60% 감소)
- F4 발생: 7~10건 → X건 (풀 E2E 측정)
- 앱당 비용: $5~7 → $X
- 빌드 시간: 20~36분 → X분

## 🗂️ 변경 파일
- 신규: prompts/ 디렉토리 (11파일)
- 신규: prompt-composer.service.ts
- 수정: ai.service.ts (프롬프트 로딩 부분)
- 수정: ai.module.ts (PromptComposer 등록)

## 🎯 다음 Phase 진입 조건
- [ ] 24시간 에러율 관찰 (자는 동안)
- [ ] 사장님 승인
- [ ] Phase 1A 시작

Phase 1A 시작해도 될까요?
```

---

## ⚠️ 위험 요소 + 대응

| 위험 | 가능성 | 대응 |
|------|-------|------|
| .md 로딩 실패 (경로 오류) | 🟡 중 | Step 0.5-12 유닛 테스트 추가 |
| 특정 페이지 타입 판별 오류 | 🟡 중 | inferPageType 폴백 = 'list' |
| 기존 앱 품질 저하 | 🟢 낮음 | Step 0.5-14 호환 검증 |
| F4 감소 미흡 | 🟡 중 | Step 0.5-15 실패 시 .md 지시 강화 |
| 롤백 필요 | 🟢 낮음 | `git reset --hard pre-prompt-refactor` |

### ❌ 심각한 문제 시
```bash
git reset --hard pre-prompt-refactor
git push --force origin main  # 사장님 승인 후!
```

---

## 📊 Phase 0.5의 파급 효과

### 이후 Phase 영향
- **Phase 1B 풀 E2E**: F4 감소로 통과율 급상승
- **Phase 2 #8 (F4 최적화)**: 거의 해결됨 → 축소
- **Phase 2 #9 (supabase/client.tsx 템플릿)**: 이미 Step 0.5-10에서 해결
- **전체 비용**: 30%↓ (각 풀 E2E 저렴해짐)

### 장기 이점
- **화이트라벨 준비**: .md 교체로 업종별 커스텀 쉬움
- **글로벌 대응**: 언어별 .md (ko/en) 분리 가능
- **핫 리로드**: 프롬프트 수정 = .md만 교체 (재배포 불필요)

---

## 🏁 완료 조건 체크리스트

- [ ] 17단계 전부 완료
- [ ] F4 풀 E2E에서 < 3건
- [ ] 기존 앱 재생성 호환 OK
- [ ] tsc 0 에러
- [ ] 배포 헬스체크 ok
- [ ] 24시간 에러율 정상
- [ ] 사장님 승인

**→ Phase 1A 진입!**
