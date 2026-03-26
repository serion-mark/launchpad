# Phase A-5: 비주얼 에디터 최종 안정화 — 완료 보고서
> 작성: 자비스 (세션 7, 2026-03-26)

---

## 뭘 했는가

### 【1】 F6 패턴 매칭 DB 동기화 — 뒷문 봉쇄 (최핵심)

**문제**: deploy.service.ts의 패턴 매칭 자동 수정(라인 626-682)이 디스크 파일만 수정하고 DB에 반영 안 함 → F6 AI가 DB에서 옛날 코드를 읽어서 작업 → 인라인 편집 내용이 밀림

**해결**:
- 패턴 매칭 수정 후 DB 머지 동기화 추가 (라인 682 뒤)
- 최신 DB에서 generatedCode 읽기 → 패턴 수정된 파일만 교체 → 저장
- `lastModifiedFiles` 보호: 사용자 인라인 편집 파일은 절대 건드리지 않음
- F6 최종 수정 시 상세 로그 추가: `[F6] 수정 파일: xxx.ts (N개만 DB 업데이트)`

**전수조사 결과**:
| 경로 | 파일 | 방식 | 상태 |
|------|------|------|------|
| F4 잘린파일 처리 | deploy.service.ts ~902 | 머지 | ✅ 기존 정상 |
| F6 AI 수정 | deploy.service.ts ~945 | 머지 | ✅ 기존 정상 |
| 패턴 매칭 수정 | deploy.service.ts ~682 | **디스크만** | ⚠️→ ✅ **DB 동기화 추가** |
| 초기 생성 | ai.service.ts | 전체 덮어쓰기 | ✅ 초기값이므로 문제없음 |
| 인라인 편집 | project.service.ts | 머지 | ✅ 기존 정상 |

### 【2】 F6 CSS 보호 — globals.css import 삭제 방지

**문제**: F6 AI가 빌드 에러 고치면서 globals.css import를 제거 → 전체 CSS 깨짐

**해결 (2중 보호)**:
1. F6 AI 프롬프트에 규칙 추가: `ai.service.ts fixBuildErrors()`
   - "globals.css import는 절대 제거하지 마!" 명시
2. 후처리 자동 복구: `deploy.service.ts` F6 수정 후
   - layout.tsx에서 globals.css import가 삭제됐으면 자동 복원
   - 로그: `[F6] globals.css import 자동 복구: src/app/layout.tsx`

### 【3】 빌드 루프 내 syncLatestCodeToDisk 보강

**문제**: `syncLatestCodeToDisk()`가 빌드 루프 전 1회만 호출 → F6이 DB에 머지 저장한 뒤 재빌드할 때 디스크가 옛날 상태

**해결**:
- `for` 루프 안에서 `attempt > 0`일 때 `syncLatestCodeToDisk()` 추가 호출
- F6 → DB 머지 저장 → 재빌드 전 디스크 = DB 100% 일치 보장

### 【4】 subdomain 앱 생성 시 즉시 배정

**문제**: subdomain이 배포 시점에 할당 → 배포 실패하면 null → URL 없음

**해결**:
- `project.service.ts` create() 에서 프로젝트 생성 즉시 subdomain 배정
- 형식: `"app-" + 4자리 hex` (예: `app-x7k2`)
- unique constraint 충돌 시 최대 5회 재시도, 6자리 fallback
- 사용자 지정 subdomain도 지원 (검증 + 중복 체크 후)
- deploy() 로직은 기존과 동일 (이미 subdomain 있으면 재사용)

### 【5】 질문지에 서브도메인 입력 필드 + 중복 확인 API

**API**: `GET /projects/check-subdomain?name=xxx`
- 영문 소문자, 숫자, 하이픈만 허용
- 3~30자 길이 제한
- 예약어 차단 (www, api, admin, app 등 27개)
- DB 중복 체크 → `{ available: boolean, reason?: string }`
- 컨트롤러에서 `:id` 경로 위에 배치 (라우트 충돌 방지)

**Frontend**: `start/page.tsx` customize 단계에 서브도메인 입력 UI
- 입력 필드 + `.foundry.ai.kr` 접미사 표시
- `[중복 확인]` 버튼 (클릭 시에만 API 호출! 실시간 검증 없음!)
- 사용 가능: 초록색 "사용 가능합니다"
- 사용 불가: 빨간색 + 사유 표시
- 미입력 시 자동 생성 (기존 방식)

---

## 변경 파일 요약

| 파일 | 변경 |
|------|------|
| `api/src/project/deploy.service.ts` | 【1】패턴수정 DB 동기화 + 【2】globals.css 자동 복구 + 【3】sync 보강 + F6 로그 보강 |
| `api/src/ai/ai.service.ts` | 【2】F6 프롬프트에 globals.css 보호 규칙 추가 |
| `api/src/project/project.service.ts` | 【4】generateUniqueSubdomain + validateSubdomain + checkSubdomainAvailable + create()에 subdomain 즉시 배정 |
| `api/src/project/project.controller.ts` | 【5】GET /projects/check-subdomain 엔드포인트 + create body에 subdomain 추가 |
| `web/src/app/start/page.tsx` | 【5】서브도메인 입력 UI (customize 단계) + 중복 확인 버튼 + create 시 subdomain 전달 |

---

## 테스트 결과

- [x] API tsc --noEmit: 0 에러
- [x] Web tsc --noEmit: 0 에러
- [ ] 새 앱 생성 → subdomain 즉시 배정 확인 (배포 후 확인 필요)
- [ ] 인라인 편집 → [수정사항 적용] → F6 발동 → 인라인 편집 보존 확인 (배포 후 실서비스 테스트)
- [ ] 서브도메인 중복 확인 API 동작 확인

---

## 다음 작업

### 즉시 테스트 (배포 후)
1. 새 앱 생성 → DB에서 subdomain 확인
2. 인라인 편집 → [적용] → [수정사항 적용] → F6 발동 → 인라인 편집 유지 확인
3. 서브도메인 입력 → [중복 확인] → 앱 생성 → URL 확인

### Phase B 후보
- 드래그로 요소 이동
- 편집 히스토리 (Ctrl+Z)
- 섹션 순서 변경
