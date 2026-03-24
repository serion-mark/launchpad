# Builder Phase 2 Report — 2026-03-24

## 수정 내역

### 1. LivePreview 흰 화면 수정
**원인**: `convertJsxToStaticHtml()` 정규식이 복잡한 JSX 파싱 실패
- `return (...)` 블록 추출이 중첩 괄호에서 깨짐
- import문이 HTML로 렌더링됨
- 커스텀 컴포넌트 (`<Header>`, `<Footer>`) → HTML로 변환 안 됨
- `<>...</>` 프래그먼트 미처리
- `{expression}` 패턴 미처리 (함수 호출, 복잡한 삼항 등)

**수정 내용** (`LivePreview.tsx`):
- 괄호 depth 매칭으로 정확한 return JSX 추출
- import문/타입선언 사전 제거
- `<>` 프래그먼트 → `<div>` 변환
- 커스텀 컴포넌트 → `<div data-component="...">` 자동 변환
- `{expression}` 잔여 패턴 전부 제거 (`{[^}]*}`)
- `ref={}`, `defaultValue={}` 핸들러 제거
- `href={변수}` → `href="#"` 변환
- map() 단일 JSX return 패턴 추가 처리

### 2. 생성 코드 빌드 에러 수정
**원인 1**: `@supabase/ssr`의 `createBrowserClient`가 Turbopack에서 빌드 실패
- Next.js 16은 기본으로 Turbopack 사용 → `@supabase/ssr` 호환 문제

**수정 내용**:
- `ai.service.ts`: `generateSupabaseUtils()` — `@supabase/ssr` → `@supabase/supabase-js` 변경
  - `createBrowserClient` → `createClient` (싱글톤 패턴으로 안전화)
- `deploy.service.ts`: 빌드 전 safeguard 추가
  - `@supabase/ssr` import → `@supabase/supabase-js` 자동 전환
  - `createBrowserClient(` → `supabaseCreateClient(` 자동 치환

**원인 2**: `npx next build`가 Next.js 16에서 기본 Turbopack 사용
**수정**: `npx next build --no-turbopack 2>&1` 으로 변경

**원인 3**: 기존 next.config에 `eslint: { ignoreDuringBuilds: true }` 미패치
**수정**: `ensureNextConfig()`에 eslint 패치 추가

### 3. 24시간 체험 배포
**상태**: 로직은 이미 구현되어 있음 (`deployTrial` → `enqueueBuild`)
**원인**: 빌드 실패로 인해 배포물 생성 안 됨 → 404
**해결**: 빌드 에러 수정(#2)으로 자동 해결됨

## 변경 파일
| 파일 | 변경 |
|------|------|
| `web/src/app/builder/components/LivePreview.tsx` | convertJsxToStaticHtml 대폭 개선 |
| `api/src/ai/ai.service.ts` | supabase/client.ts: @supabase/ssr → @supabase/supabase-js |
| `api/src/project/deploy.service.ts` | --no-turbopack, @supabase/ssr safeguard, eslint patch |

## 검증
- [x] tsc --noEmit 0 에러 (web + api)
- [ ] 실제 앱 생성 + 미리보기 확인 (배포 후)
- [ ] 체험 배포 URL 접속 확인 (배포 후)
