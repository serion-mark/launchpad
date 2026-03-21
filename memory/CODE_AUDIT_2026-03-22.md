# Foundry 코드 감사 보고서 (2026-03-22)

## 감사 범위
- **Web**: `web/src/` 전체 (15개 페이지 + 컴포넌트 + 유틸리티)
- **API**: `api/src/` 전체 (12개 모듈)
- **빌드 결과**: API 0 에러, Web 0 에러

---

## 🔴 CRITICAL — 즉시 수정 (5건)

### C1. login useState → useEffect
- **파일**: `web/src/app/login/page.tsx:16-23`
- **문제**: `useState(() => { side effect })` — 매 렌더마다 실행, useEffect로 변경 필요
- **수정**: `useEffect(() => { ... }, [])` 로 교체

### C2. Toss 테스트 키 하드코딩
- **파일**: `web/src/app/credits/page.tsx:6`
- **문제**: `TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'` 소스코드 노출
- **수정**: `process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY` 환경변수로 이동

### C3. previousErrors 메모리 누수
- **파일**: `api/src/ai/ai.service.ts` (deploy.service.ts 내 previousErrors 배열)
- **문제**: 빌드 에러 시그니처 배열이 절대 초기화되지 않음 → 무한 증가
- **수정**: 빌드 완료/실패 시 `this.previousErrors = []` 초기화

### C4. rollback 미구현 엔드포인트
- **파일**: `api/src/project/project.controller.ts:81`
- **문제**: `@Post(':id/rollback')` → `projectService.rollback()` 호출하지만 메서드 미존재 → 500 에러
- **수정**: 엔드포인트 제거하거나 rollback 메서드 구현

### C5. console.log 프로덕션
- **파일**: `api/src/main.ts:11`, `api/src/app-generator.ts:137,168,188,219,247`
- **문제**: NestJS Logger 대신 console.log 사용
- **수정**: `this.logger.log()` 로 교체

---

## 🟠 HIGH — 빠른 수정 권장 (6건)

### H1. admin 이메일 하드코딩
- **파일**: `api/src/admin/admin.controller.ts:6-7`
- **문제**: `ADMIN_EMAILS = ['admin@serion.ai.kr', 'mark@serion.ai.kr']` 코드 내 고정
- **수정**: `ADMIN_EMAILS` 환경변수로 이동 (쉼표 구분)

### H2. 크레딧 차감 권한 미검증
- **파일**: `api/src/credit/credit.controller.ts`
- **문제**: `@Post('deduct')` 엔드포인트에서 projectId 소유자 검증 누락
- **수정**: `project.userId !== req.user.id` 검증 추가

### H3. 빈 catch 블록 다수
- **파일**: `web/src/app/admin/page.tsx:56,77,88`, `api/src/project/deploy.service.ts:304,318,349`
- **문제**: `catch { }` 또는 `catch { /* ignore */ }` — 실제 에러 삼킴
- **수정**: 최소 `Logger.warn` 추가

### H4. `isFreeTria` 오타
- **파일**: `api/src/ai/ai.service.ts:494`
- **문제**: 변수명 `isFreeTria` → `isFreeTrial` 오타
- **수정**: 변수명 수정

### H5. 레거시 엔드포인트 정리
- **파일**: `api/src/ai/ai.controller.ts`
- **문제**: `@Post('generate')`, `@Post('modify')` 레거시 엔드포인트 잔존
- **수정**: 프론트에서 미사용 확인 후 제거 또는 `@deprecated` 명시

### H6. Kakao 이메일 검증 갭
- **파일**: `api/src/auth/auth.service.ts:101-107`
- **문제**: Kakao 응답에 email 없을 때 `kakao_{id}@foundry.ai.kr` 생성 — 유니크 충돌 가능
- **수정**: `kakao_{kakaoId}@kakao.foundry.ai.kr` 패턴 + upsert 사용

---

## 🟡 MEDIUM — 기술 부채 (12건)

### M1. `any` 타입 과다 사용
- **위치**: 전체 컨트롤러 `@Req() req: any`, ai.service.ts 8곳, admin/builder 등
- **수정**: `CurrentUserPayload` 타입 정의 + `@Req() req: Request & { user: CurrentUserPayload }`

### M2. 색상 하드코딩
- **위치**: 모든 프론트엔드 파일 (`#3182f6`, `#2c2c35`, `#8b95a1` 등)
- **수정**: `web/src/lib/colors.ts` 디자인 토큰 파일 생성

### M3. 중복 코드
- **위치**: 상태 배지(STATUS_BADGE), 기능 칩 렌더링이 admin/dashboard/credits에 중복
- **수정**: `web/src/components/StatusBadge.tsx` 공유 컴포넌트 추출

### M4. execSync 이벤트 루프 블로킹
- **파일**: `api/src/project/deploy.service.ts:284,300,408`
- **문제**: `execSync()` → 빌드 중 전체 서버 블로킹
- **수정**: `child_process.exec()` + promisify 비동기 전환

### M5. 에러 바운더리 미적용
- **위치**: builder, dashboard, start 페이지
- **수정**: `web/src/components/ErrorBoundary.tsx` 생성 + 주요 페이지 래핑

### M6. 전역 에러 필터 미적용
- **파일**: `api/src/main.ts`
- **문제**: NestJS `@Catch()` 전역 필터 없음 — 예외 시 500 스택 노출
- **수정**: `AllExceptionsFilter` 추가

### M7. localStorage 직접 접근
- **파일**: `web/src/app/builder/page.tsx:485`, `login/page.tsx:51`
- **문제**: `typeof window !== 'undefined'` 가드 없이 직접 접근
- **수정**: SSR 안전 가드 추가

### M8. admin setTimeout 레이스 컨디션
- **파일**: `web/src/app/admin/page.tsx:403`
- **문제**: `setTimeout(() => loadProjects(1), 0)` 상태 업데이트 우회
- **수정**: useEffect 의존성으로 처리

### M9. Supabase region 하드코딩
- **파일**: `api/src/supabase/supabase.service.ts:88`
- **문제**: `region: 'ap-northeast-1'` 고정
- **수정**: `SUPABASE_REGION` 환경변수

### M10. 빌드 타임아웃 하드코딩
- **파일**: `api/src/project/deploy.service.ts:16`
- **문제**: 5분 타임아웃 고정 — 큰 프로젝트 시 부족할 수 있음
- **수정**: `BUILD_TIMEOUT_MS` 환경변수

### M11. Apple 로그인 버튼 빈 라벨
- **파일**: `web/src/app/login/page.tsx:174`
- **문제**: `<span className="text-sm font-bold"></span>` — 빈 텍스트
- **수정**: Apple 로그인 미구현이면 버튼 제거, 구현할거면 텍스트 추가

### M12. 접근성 (aria) 누락
- **위치**: admin 탭 (`role="tab"` 없음), guide 아코디언 (`aria-expanded` 없음)
- **수정**: ARIA 속성 추가

---

## 수정 작업 체크리스트

```
[ ] C1. login useState → useEffect
[ ] C2. Toss 키 환경변수 이동
[ ] C3. previousErrors 초기화
[ ] C4. rollback 엔드포인트 처리
[ ] C5. console.log → Logger
[ ] H1. admin 이메일 환경변수
[ ] H2. 크레딧 차감 권한 검증
[ ] H3. 빈 catch 블록 수정
[ ] H4. isFreeTria 오타
[ ] H5. 레거시 엔드포인트 정리
[ ] H6. Kakao 이메일 검증
[ ] M1~M12. 기술 부채 항목
```

---

## 감사 방법 (재사용 가능)
이 보고서를 재생성하려면 아래 명령어 사용:
```
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

전체 코드 감사 진행해줘. memory/CODE_AUDIT_2026-03-22.md 형식 참고해서 새 리포트 생성해줘.

점검 항목:
1. console.log 잔존
2. any 타입 과다
3. 빈 catch 블록
4. 하드코딩된 시크릿/값
5. 미사용 import/변수/함수
6. 미구현 엔드포인트
7. 에러 핸들링 누락
8. 메모리 누수
9. 타입 안전성
10. 접근성 (aria)
11. 중복 코드
12. 보안 이슈
```
