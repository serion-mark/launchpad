# Phase A-5: 비주얼 에디터 최종 안정화 — 완료 보고서
> 작성: 자비스 (세션 7, 2026-03-26)
> 커밋: ae3763d → GitHub Actions 자동 배포 완료

---

## 배경 — 왜 이걸 했는가

A-1~A-4에서 비주얼 에디터(인라인 편집)를 만들었다.
- 미리보기에서 텍스트 클릭 → 편집 → [적용] → 화면 즉시 반영 ✅
- DB 저장 성공 (JSX 4단계 매칭으로 "오늘두끼" DB에 들어간 거 확인!) ✅
- [수정사항 적용] 버튼도 만듦 ✅

**근데 배포하면 원래대로 돌아간다!! 2일 동안 삽질했던 문제!**

원인: F6(빌드 에러 자동 수정)이 에러를 고치면서 **DB 전체를 옛날 코드로 덮어쓰기** → 인라인 편집 내용이 날아감.
추가로 F6이 globals.css import를 제거해버려서 CSS가 깨지는 문제도 있었음.

---

## 뭘 했는가 (5개 작업)

### 【1】 F6 패턴 매칭 DB 동기화 — 뒷문 봉쇄 (최핵심!!)

**문제**: deploy.service.ts의 패턴 매칭 자동 수정(626~682줄)이 **디스크 파일만 수정하고 DB에 반영 안 함** → F6 AI가 DB에서 옛날 코드를 읽어서 작업 → 인라인 편집 내용이 밀림

**비유**: 패턴 수정이 거실 벽지(디스크)는 새 걸로 바꿨는데, 설계도(DB)는 옛날 그대로 → 수리공(F6 AI)이 옛날 설계도 보고 작업 → 새 벽지가 다시 옛날 걸로

**해결**:
- 패턴 매칭 수정 후 **DB 머지 동기화 추가** (682줄 뒤)
- 최신 DB에서 generatedCode 읽기 → 패턴 수정된 파일만 교체 → 저장
- `lastModifiedFiles` 보호: 사용자 인라인 편집 파일은 **절대 건드리지 않음**
- F6 최종 수정 시 상세 로그: `[F6] 수정 파일: xxx.ts (N개만 DB 업데이트)`

**전수조사 결과** (generatedCode DB 쓰기 경로 전체):

| 경로 | 파일 | 방식 | 상태 |
|------|------|------|------|
| F4 잘린파일 처리 | deploy.service.ts ~902 | 머지 | ✅ A-4에서 이미 정상 |
| F6 AI 수정 | deploy.service.ts ~945 | 머지 | ✅ A-4에서 이미 정상 |
| **패턴 매칭 수정** | deploy.service.ts ~682 | **디스크만** | ⚠️→ ✅ **이번에 DB 동기화 추가** |
| 초기 생성 | ai.service.ts | 전체 덮어쓰기 | ✅ 초기값이라 문제없음 |
| 인라인 편집 | project.service.ts | 머지 | ✅ A-1에서 이미 정상 |
| editCode/cleanCode | ai.service.ts | 머지 | ✅ 기존 정상 |

→ **모든 DB 쓰기 경로가 머지 방식으로 통일됨. 뒷문 없음!**

### 【2】 F6 CSS 보호 — globals.css import 삭제 방지

**문제**: F6 AI가 빌드 에러 고치면서 globals.css import를 제거 → 전체 CSS 깨짐

**해결 (2중 보호)**:
1. **프롬프트 규칙 추가** — `ai.service.ts fixBuildErrors()`에:
   > "globals.css import는 절대 제거하지 마! — 이걸 삭제하면 전체 CSS가 깨짐"
2. **후처리 자동 복구** — `deploy.service.ts` F6 수정 적용 후:
   - layout.tsx에서 globals.css import가 삭제됐는지 자동 체크
   - 없으면 `import './globals.css'` 자동 삽입 + 로그

### 【3】 빌드 루프 내 syncLatestCodeToDisk 보강

**문제**: `syncLatestCodeToDisk()`가 빌드 루프 전 **1회만** 호출 → F6이 DB에 머지 저장한 뒤 재빌드할 때 디스크가 옛날 상태

**해결**:
- `for` 루프 안에서 `attempt > 0`일 때 `syncLatestCodeToDisk()` 추가 호출
- 흐름: F6 수정 → DB 머지 저장 → **재빌드 전 sync** → 디스크 = DB 100% 일치

**수정 전**: `sync → [빌드 → 실패 → F6 → DB저장 → 빌드 → 실패 → ...]`
**수정 후**: `sync → [빌드 → 실패 → F6 → DB저장 → **sync** → 빌드 → ...]`

### 【4】 subdomain 앱 생성 시 즉시 배정

**문제**: subdomain이 배포 시점에 할당 → 배포 실패하면 null로 남음 → URL 없음

**해결**:
- `project.service.ts` create()에서 프로젝트 생성 **즉시** subdomain 배정
- 형식: `"app-" + 4자리 hex` (예: `app-x7k2`, `app-3fa1`)
- unique constraint 충돌 시 최대 5회 재시도 → 극히 드물면 6자리 fallback
- 사용자 지정 subdomain도 지원 (검증 + 중복 체크 통과 시)
- deploy() 로직은 기존 그대로 (이미 subdomain 있으면 재사용)

### 【5】 질문지에 서브도메인 입력 필드 + 중복 확인 API

**API**: `GET /projects/check-subdomain?name=xxx`
- 영문 소문자, 숫자, 하이픈만 허용 (정규식 검증)
- 3~30자 길이 제한
- 예약어 27개 차단 (www, api, admin, app, mail, cdn, static 등)
- DB 중복 체크 → `{ available: boolean, reason?: string }`
- 컨트롤러에서 `:id` 경로 **위에** 배치 (라우트 충돌 방지)

**Frontend**: `start/page.tsx` → "최종 확인" 단계에 서브도메인 입력 UI 추가
- 입력 필드 + `.foundry.ai.kr` 접미사 표시
- **[중복 확인] 버튼 클릭 시에만 API 호출** (실시간 검증 절대 금지! 서버 과부하 방지)
- 사용 가능: 초록색 "사용 가능합니다"
- 사용 불가: 빨간색 + 사유 표시 (이미 사용 중 / 예약어 / 길이 초과 등)
- 미입력 시: 자동 생성 (기존 `app-XXXX` 방식)

---

## 왜 그렇게 했는가

### 패턴 매칭 DB 동기화를 별도로 추가한 이유
- A-4에서 F6 AI 수정(~945줄)과 F4 잘린파일(~902줄)은 이미 머지 방식으로 고침
- **패턴 매칭은 AI 호출 없이 정규식으로 빠르게 처리하는 로직**이라 DB 저장이 빠져있었음
- 패턴 수정 → 디스크만 변경 → F6 AI가 DB에서 옛날 코드 읽음 → "이미 고친 import 에러"를 또 고치려 함 → 삽질
- 비유: 현장 수리(패턴)는 했는데 본사 도면(DB)은 안 바꿈 → 다음 수리공(F6 AI)이 옛날 도면 보고 엉뚱한 작업

### F6 CSS 보호를 프롬프트 + 후처리 2중으로 한 이유
- AI 프롬프트만으로는 100% 보장 불가 (AI는 가끔 규칙 무시)
- 후처리 체크로 확실하게 보장 — "AI가 실수해도 코드가 잡는다"

### subdomain을 생성 시점에 배정한 이유
- 배포 실패해도 URL 확보 → 사용자가 "내 앱 URL" 확인 가능
- 배포 재시도 시 같은 subdomain 유지 (기존 로직 `project.subdomain || generate()`)

---

## 변경 파일 요약

| 파일 | 변경 | 줄수 |
|------|------|------|
| `api/src/project/deploy.service.ts` | 【1】패턴수정 DB 동기화 + 【2】globals.css 자동 복구 + 【3】sync 보강 + F6 로그 | +66 |
| `api/src/ai/ai.service.ts` | 【2】F6 프롬프트에 globals.css 보호 규칙 | +1 |
| `api/src/project/project.service.ts` | 【4】generateUniqueSubdomain + validateSubdomain + checkSubdomainAvailable + create() subdomain | +79 |
| `api/src/project/project.controller.ts` | 【5】GET check-subdomain + create body subdomain | +10 |
| `web/src/app/start/page.tsx` | 【5】서브도메인 입력 UI + 상태 + 중복확인 + create 전달 | +62 |
| **총 변경** | | **+305줄, -8줄** |

---

## 테스트 결과

### 로컬 검증 ✅
- [x] API `tsc --noEmit`: **0 에러**
- [x] Web `tsc --noEmit`: **0 에러**
- [x] 서버 빌드 에러: **없음**
- [x] 콘솔 에러: **없음**
- [x] /start 페이지 렌더링: **정상**
- [x] 템플릿 선택 → 질문지 → 테마 → 최종 확인 흐름: **정상**
- [x] 서브도메인 입력 필드 렌더링: **정상** (입력, `.foundry.ai.kr` 접미사, [중복 확인] 버튼)
- [x] 서브도메인 입력값 타이핑: **영문/숫자/하이픈만 허용** (한글 자동 필터)

### 배포 후 실서비스 테스트 필요
- [ ] 새 앱 생성 → DB에서 subdomain 즉시 배정 확인
- [ ] [중복 확인] 버튼 → API 응답 확인 (사용 가능/불가)
- [ ] 인라인 편집 → [적용] → [수정사항 적용] → F6 발동 → **인라인 편집 보존 확인!!**
- [ ] CSS 깨지지 않는지 확인
- [ ] 사용자 지정 서브도메인으로 앱 생성 → URL 접속 확인

---

## 삽질 기록

### 이번에는 삽질 없음!
- A-4 보고서에서 원인 분석이 정확했고, PHASE_A5_PLAN.md 지시가 명확해서 바로 구현
- 전수조사로 모든 DB 쓰기 경로를 확인 → 빠진 곳(패턴 매칭) 정확히 파악
- **교훈**: 계획서를 잘 쓰면 구현은 빠르다

---

## 다음에 할 것

### 즉시 (배포 후)
1. foundry.ai.kr에서 새 앱 생성 → subdomain 확인
2. 인라인 편집 E2E 테스트 (F6 발동 시나리오)
3. 서브도메인 중복 확인 동작 확인

### Phase B 후보
- 드래그로 요소 이동
- 복수 요소 동시 선택
- 편집 히스토리 (Ctrl+Z)
- 비주얼 에디터에서 섹션 순서 변경
