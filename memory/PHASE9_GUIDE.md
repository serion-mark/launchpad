# Phase 9: 기본기 완성 — 개발 가이드 (3/24~3/31)

> 이 문서는 새 세션의 Claude가 읽고 바로 개발할 수 있도록 작성됨
> 마감: 4/1 전 배포. 안정성 최우선.

---

## Day 1: 빌드 성공률 80%+ 달성

### 현재 문제
AI가 생성한 코드가 `next build`에서 자주 실패함 (체감 50~60%)

### 실패 원인 (빈도순)
1. 존재하지 않는 npm 패키지 import (예: `@heroicons/react`, `framer-motion` 설치 안 됨)
2. 마크다운 혼입 (```, ###, ** 등이 코드에 섞임)
3. TypeScript 타입 에러 (인터페이스 불일치)
4. 동적 라우트 `[id]` → static export에서 generateStaticParams 없으면 실패
5. `next/headers` 등 서버 전용 import → static export 불가
6. 존재하지 않는 아이콘 import

### 작업 1-1: 패키지 화이트리스트
**파일**: `api/src/ai/ai.service.ts`

AI 프롬프트에 "사용 가능한 패키지 목록"을 명시적으로 주입:
```
사용 가능한 npm 패키지 (이것만 import 가능):
- react, react-dom (이미 설치됨)
- next (이미 설치됨)
- @supabase/supabase-js (이미 설치됨)
- recharts (차트)
- date-fns (날짜)
- zustand (상태관리)
- react-hook-form (폼)
- zod (유효성검증)
- lucide-react (아이콘 — heroicons 사용 금지!)
- tailwindcss, tailwind-merge, clsx (스타일링)

절대 사용 금지:
- @heroicons/react (설치 안 됨)
- framer-motion (설치 안 됨)
- next/headers, next/server (static export 불가)
- prisma, @prisma/client (클라이언트 앱에서 사용 불가, Supabase 사용)
- 위 목록에 없는 패키지
```

**구현 방법**: `buildPrompt()` 또는 시스템 프롬프트에 위 목록 삽입

### 작업 1-2: 빌드 전 코드 사전검증
**파일**: `api/src/ai/ai.service.ts` (generateFullApp 메서드 내)

생성된 코드가 빌드에 들어가기 전에 검증하는 단계 추가:
```typescript
function validateGeneratedCode(files: {path: string, content: string}[]): string[] {
  const errors: string[] = [];
  const allowedPackages = ['react', 'next', '@supabase/supabase-js', 'recharts',
    'date-fns', 'zustand', 'react-hook-form', 'zod', 'lucide-react',
    'tailwind-merge', 'clsx'];
  const bannedImports = ['@heroicons', 'framer-motion', 'next/headers',
    'next/server', '@prisma/client', 'prisma'];

  for (const file of files) {
    // 1. 마크다운 혼입 체크
    if (file.content.includes('```') || file.content.match(/^#{1,3}\s/m)) {
      errors.push(`${file.path}: 마크다운 혼입 감지`);
    }
    // 2. 금지 패키지 import 체크
    for (const banned of bannedImports) {
      if (file.content.includes(`from '${banned}`) || file.content.includes(`from "${banned}`)) {
        errors.push(`${file.path}: 금지 패키지 ${banned} import`);
      }
    }
    // 3. 허용되지 않은 외부 패키지 체크
    const importMatches = file.content.matchAll(/from\s+['"]([^./][^'"]*)['"]/g);
    for (const match of importMatches) {
      const pkg = match[1].split('/')[0];
      if (pkg.startsWith('@')) {
        const scopedPkg = match[1].split('/').slice(0, 2).join('/');
        if (!allowedPackages.some(a => scopedPkg.startsWith(a))) {
          errors.push(`${file.path}: 미허용 패키지 ${scopedPkg}`);
        }
      }
    }
  }
  return errors;
}
```

검증 실패 시 → AI에게 "이 부분 수정해줘" 재요청 (빌드 전에 잡기)

### 작업 1-3: 빌드 에러 자동수정 패턴 확장
**파일**: `api/src/project/deploy.service.ts` (aiBuildFix 메서드)

현재 에러 패턴에 추가할 것:
- `Module not found` → 해당 import 제거 또는 대체 패키지로 교체
- `Type error` → 타입 단언 추가 또는 any로 우회
- `'X' is not exported from` → named export 확인 후 수정
- `Cannot find module` → 상대 경로 확인
- `Image Optimization` → next.config에 `images: { unoptimized: true }` 추가
- `getServerSideProps` → getStaticProps로 교체 또는 제거
- `useRouter from 'next/router'` → `next/navigation`으로 교체

### 검증
- 3개 템플릿 (미용실POS, 쇼핑몰, 매칭앱)으로 연속 빌드 성공 확인
- `npx tsc --noEmit` API + Web 0 에러

---

## Day 2: 실시간 미리보기

### 현재 상태
- SSE 스트리밍 (F7): `POST /ai/generate-app-sse` → EventEmitter → SSE 이벤트 전송 ✅
- LivePreview.tsx: iframe으로 생성된 HTML 렌더링 ✅
- builder/page.tsx: SSE 수신 + 진행상황 표시 ✅
- **문제**: SSE 진행상황은 표시되지만, 실제 코드가 LivePreview에 실시간 반영 안 됨

### 목표
코드가 파일 단위로 생성될 때마다 LivePreview가 즉시 갱신되어
"만들어지고 있다"를 시각적으로 체감

### 구현 방법
**파일**: `web/src/app/builder/page.tsx`

현재 SSE 이벤트에 `type: 'progress'`로 단계별 메시지만 옴.
여기에 `type: 'file_generated'` 이벤트를 추가:

1. **API 수정** (`api/src/ai/ai.service.ts`):
```typescript
// generateFullAppSSE 내에서 파일이 생성될 때마다 이벤트 발송
emitter.emit('progress', {
  step: 'frontend',
  message: `${fileName} 생성 완료`,
  detail: fileName,
  fileContent: content,  // ← 이 필드 추가
  fileCount: currentCount,
  totalFiles: totalCount,
});
```

2. **프론트 수정** (`web/src/app/builder/page.tsx`):
```typescript
// SSE 수신 시 파일 내용이 있으면 LivePreview에 즉시 반영
if (data.fileContent && data.detail) {
  setGeneratedFiles(prev => [...prev, { path: data.detail, content: data.fileContent }]);
  // LivePreview 컴포넌트에 새 파일 전달 → iframe 갱신
}
```

3. **LivePreview 수정** (`web/src/app/builder/components/LivePreview.tsx`):
```typescript
// generatedFiles가 변경될 때마다 HTML 재조립 → iframe srcDoc 갱신
useEffect(() => {
  const html = buildPreviewHtml(generatedFiles);
  setPreviewHtml(html);
}, [generatedFiles]);
```

### 핵심 포인트
- LivePreview.tsx에 이미 `buildPreviewHtml()` 함수가 있음 (코드를 HTML로 변환)
- 이걸 SSE 이벤트마다 호출하면 됨
- 전체 빌드 완료를 기다리지 않고 파일이 올 때마다 갱신

### 검증
- 빌더에서 앱 생성 시작 → 코드 생성 중에 미리보기가 점진적으로 변화하는지 확인
- 네트워크 탭에서 SSE 이벤트에 fileContent 포함 확인

---

## Day 3: 자연어 자유 입력 + 테마 중앙 관리

### 자연어 자유 입력
**파일**: `web/src/app/start/page.tsx`

현재 구조: 템플릿 10개 카드 → 클릭 → 질문지 → 테마 → 생성

변경:
```
/start 페이지 상단:
┌─────────────────────────────────────────┐
│  💬 어떤 앱을 만들까요?                    │
│  ┌───────────────────────────────┐      │
│  │ "반려동물 돌봄 매칭 앱 만들어줘"  │ [시작] │
│  └───────────────────────────────┘      │
│  예시: 미용실 예약, 학원 관리, 배달 앱...    │
└─────────────────────────────────────────┘

하단: 기존 템플릿 10개 카드 (그대로 유지)
"또는 템플릿으로 시작하기 ↓"
```

**구현 방법**:
1. start/page.tsx 상단에 입력 폼 추가 (input + submit 버튼)
2. 입력값 → custom 템플릿의 질문지 플로우로 연결
   - 입력값을 첫 번째 답변으로 자동 채움
   - 나머지 질문은 AI가 대화형으로 진행
3. 기존 템플릿 카드는 "또는 템플릿으로 시작하기" 구분선 아래 유지

### 테마 중앙 관리
**파일**: 생성되는 코드의 `tailwind.config.ts` + 전역 CSS

현재: AI가 생성할 때 색상을 하드코딩 (`bg-blue-500`, `text-gray-900`)
목표: CSS 변수로 통합, 테마 변경 시 한 곳만 수정

AI 프롬프트에 테마 변수 규칙 추가:
```
색상은 반드시 CSS 변수로 사용:
--color-primary, --color-secondary, --color-background, --color-surface
--color-text-primary, --color-text-secondary, --color-border, --color-accent

Tailwind 사용 시: bg-[var(--color-primary)] 또는 tailwind.config의 extend.colors로 매핑
```

### 검증
- /start 페이지에서 대화창 입력 → 빌더 플로우 진입 확인
- 템플릿 카드 클릭 → 기존 플로우 정상 확인 (회귀 없음)

---

## Day 4: 부분 수정 (스마트 선별)

### 현재 상태
- `POST /ai/modify-files` API 존재 ✅
- `targetFiles` 파라미터 존재 ✅
- **문제**: 어떤 파일을 수정할지 AI가 정확히 판단 못 함 → 전체 재생성 fallback

### 목표
"메인 페이지 배경색 바꿔줘" → AI가 `app/page.tsx`만 수정 → 빠르고 저렴

### 구현 방법
**파일**: `api/src/ai/ai.service.ts` (modifyFiles 메서드)

2단계 접근:
1. **파일 선별 AI 호출** (Haiku — 빠르고 저렴):
```
사용자 요청: "${message}"
현재 프로젝트 파일 목록: ${fileList}

이 요청을 처리하려면 어떤 파일을 수정해야 하나요?
JSON 배열로 답변: ["app/page.tsx", "components/Header.tsx"]
```

2. **선별된 파일만 수정 AI 호출** (Sonnet — 정확):
```
수정 대상 파일: ${targetFiles}
현재 코드: ${currentCode}
요청: "${message}"
수정된 코드를 반환하세요.
```

### 핵심 포인트
- 1단계는 Haiku (빠름, 저렴) → 파일 선별만
- 2단계는 Sonnet (정확) → 실제 코드 수정
- 크레딧 소모: 전체 재생성 3,000cr → 부분 수정 500cr

### 검증
- "헤더 색상 빨간색으로 변경" → Header.tsx만 수정되는지 확인
- "새 페이지 추가해줘" → 새 파일 생성 + layout 수정되는지 확인

---

## Day 5~7: E2E 3개 앱 + 빌드 성공률 90%

### E2E 테스트 앱 3종
1. **지역커머스 (스마트팜)**: 상품목록 + 장바구니 + 주문 + 관리자
2. **매칭앱 (펫돌봄)**: 프로필 + 매칭 + 예약 + 리뷰
3. **관리앱 (학원)**: 학생관리 + 수업일정 + 출석 + 청구

각 앱에 대해:
1. /start에서 생성 시작
2. 빌드 성공 확인
3. *.foundry.ai.kr 배포 확인
4. 배포된 앱 접속 + 페이지 이동 확인
5. 실패 시 → 원인 분석 → Day 1 패턴에 추가

### 빌드 성공률 계산
10개 다른 프롬프트로 생성 시도 → 성공 횟수 / 10 = 성공률
목표: 8/10 이상 (80%), 가능하면 9/10 (90%)

### 배포된 URL 기록
모두의창업 서류 + IR 시연용으로 URL 보관:
- https://smartfarm-xxxx.foundry.ai.kr
- https://petmate-xxxx.foundry.ai.kr
- https://academy-xxxx.foundry.ai.kr
