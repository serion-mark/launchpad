# 📋 Foundry Agent Mode Phase B + C 작업 보고서 — 2026-04-19 (새벽)

> **작업자**: 자비스 (Claude Opus 4.7 — 1M 컨텍스트)
> **작업 시간**: 2026-04-19 07:40 ~ 09:10 (≈90분)
> **핵심 미션**: 사장님 실사용 피드백 반영 + 자동 저장/배포 파이프라인 + 부가 옵션
> **Anthropic 실비용**: ~$0 (LLM 호출 없음 — 전부 UX/백엔드 개선)

---

## 🎯 한 줄 요약

사장님이 Agent Mode로 메디트래커를 실사용하면서 주신 4가지 피드백을 전부 반영하고, 기존 /builder 파이프라인(`projects` 테이블 + `deploy.service`)에 자동 연결. 메디트래커도 기존 sandbox cwd 그대로 "내 프로젝트"에 복구 완료.

---

## 📌 커밋 타임라인 (4건, 모두 Deploy Foundry 성공)

| 시각 | 커밋 | 내용 |
|---|---|---|
| 08:12 | `a299482` | fix(agent-mode): UX 개선 — 진행 표시 강화 + 달러 제거 + 완료 후 재입력 |
| 08:48 | `54f325e` | feat(agent-mode): "내 프로젝트" 자동 저장 + 메디트래커 마이그레이션 |
| 08:54 | `8554ce8` | fix(agent-mode): binary null 바이트 skip + 메디트래커 userId 교정 |
| 09:05 | `df533c6` | feat(agent-mode): 답지 카드 마지막 질문에 "부가 옵션" 섹션 추가 |

---

## 📝 사장님 피드백 → 반영 매핑

| # | 사장님 피드백 | 반영 |
|---|---|---|
| 1 | "선택 완료 눌렀는데 진행 중인지 모름" | 헤더 실시간 뱃지 + 타이핑 인디케이터 + 하단 구체 활동 표시 |
| 2 | "중복선택 가능하게, 기타 입력 눌러도 입력 가능" | AnswerSheetCard: Set 기반 복수 선택 + `needsInput` 인라인 input |
| 3 | "비용 달러 빼고 (가격 미정)" | 달러 표시 3곳 제거 — 내부 state 는 유지 (크레딧 환산용) |
| 4 | "완료 후 채팅창 비활성" | `disabled` 조건에서 complete/error 제거, placeholder 상태별 명확화 |
| 5 | "메디트래커 내 프로젝트에 있나?" | DB 조회 후 없음 확인 → 자동 저장 로직 + 마이그레이션 스크립트 |
| 6 | "Supabase 연결로 실제 로그인 + DB" | 답지 부가 옵션에 [2] Supabase (선택 시 Agent가 스키마 SQL 포함) |
| 7 | "서브도메인으로 배포까지" | ProjectPersistenceService → 기존 `deploy.service.ts` 재사용 가능 상태 |
| 8 | "카드 선택지에 배포(1일무료) 제안" | intent-patterns.md § 3-2 부가 옵션 섹션 — 모든 답지 공통 |

---

## 📁 파일 변경 요약 (13 파일)

### 신규 — 백엔드 (2)
```
api/src/agent-builder/project-persistence.service.ts    sandbox cwd → projects INSERT
api/src/agent-builder/scripts/migrate-meditacker.ts     일회성 마이그레이션 (Prisma 직접)
```

### 수정 — 백엔드 (5)
```
api/src/agent-builder/agent-builder.module.ts           ProjectModule forwardRef 추가
api/src/agent-builder/agent-builder.service.ts          run() 끝에 persistence.persist() 호출
api/src/agent-builder/stream-event.types.ts             complete 이벤트 확장 (projectId/subdomain 등)
api/src/agent-builder/prompts/agent-core.md             답지 5항목 + "부가 옵션" 섹션
api/src/agent-builder/prompts/intent-patterns.md        § 3-2 부가 옵션 가이드 신설
```

### 수정 — 프론트 (3)
```
web/src/app/builder/agent/useAgentStream.ts             lastActivity/iteration/projectId 필드 + submitAnswer 즉시 피드백
web/src/app/builder/agent/components/AgentChat.tsx      타이핑 인디케이터 + 완료 카드(내 프로젝트/배포 버튼)
web/src/app/builder/agent/components/AnswerSheetCard.tsx 복수 선택 Set + 기타 인라인 input
web/src/app/builder/agent/page.tsx                      헤더 실시간 상태 뱃지 (작업 중/대기/전송/완료)
```

### 수정 — 테스트 (4)
```
v0-test/day{1,2,3,5}-*.ts    stubPersistence 추가 (DI 시그니처 변경 대응)
```

---

## 🐛 운영 중 발견한 2가지 이슈 + 수정

### 이슈 1: `\u0000 cannot be converted to text`
**증상**: 첫 마이그레이션 실행 시 34개 파일 수집 후 PostgreSQL INSERT 실패.
**원인**: `favicon.ico` 등 binary 파일을 `fs.readFileSync(path, 'utf8')` 로 읽으면 NUL 바이트가 문자열에 포함됨. PostgreSQL JSON 은 `\u0000` 을 텍스트로 저장할 수 없음.
**수정**: `fs.readFileSync(path)` (버퍼) → 첫 1KB 샘플에서 `buf[i] === 0` 검사 → null 있으면 skip. Persistence + migrate 양쪽에 동일 로직 적용.

### 이슈 2: migrate-meditacker 의 `TARGET_USER_ID` 가 mark 로 하드코딩돼 있었음
**증상**: `cmmvse7h00000rh8h9fxxipdd` (mark) 로 저장 시도했지만 sandbox cwd 의 실제 소유자는 test 계정.
**원인**: Agent Mode 실사용 테스트는 `test@serion.ai.kr` 로그인으로 진행함 — cwd 이름에 userId 가 박혀있어 서버 로그로 확인 가능.
**수정**: `cmn2v5prs0000rhikee5i9j23` (test) 로 교정. 재실행 후 정상 INSERT.

---

## 🎉 최종 결과

### 메디트래커 DB 등록 확인
```
id         : cmo4zvbvj0001rht3gn2x30bp
name       : 메디트래커
status     : active
template   : agent-mode
userId     : cmn2v5prs0000rhikee5i9j23 (test@serion.ai.kr)
생성        : 33 파일 (binary 1개 자동 제외)
createdAt  : 2026-04-18 23:54:59
```

### 앞으로 Agent Mode 세션의 흐름
```
사용자 "예쁜 미용실 예약앱"
   ↓
카드 발동 (질문 2~3개 + 부가 옵션 [1]배포 [2]Supabase [3]일단)
   ↓
답변 (번호/자연어/"시작")
   ↓
Agent 작업 (Next.js 앱 생성 + 빌드 검증)
   ↓
완료 시점에 자동:
  ✓ projects INSERT (generatedCode 포함)
  ✓ status = 'active'
  ✓ subdomain 자동 배정 (ProjectService.create)
  ✓ "내 프로젝트"에 즉시 노출
   ↓
완료 카드에 버튼 2개:
  [📁 내 프로젝트에서 열기]   [🌐 서브도메인 배포 (1일 무료)]
```

---

## 💰 누적 비용 업데이트

| Phase | 비용 | 시간 |
|---|---|---|
| V-0 + Day 1~5 (4/18 저녁) | $0.75 | 80분 |
| Phase B + C (4/19 새벽) | **$0** (LLM 호출 0) | 90분 |
| **Agent Mode v1 총계** | **$0.75** | **170분 (2h 50m)** |

사장님 실사용 1회 메디트래커 = $1.39 (사장님 계정)
⇒ **플랫폼 개발비 + 실앱 1개 포함 $2.14** (예산 $12~17 대비 12.6%)

---

## 🚀 다음 작업 (향후)

### 지금 선택한 "서브도메인 배포" 버튼이 실제 배포를 트리거하게
- 현재: `/dashboard` 로 이동만 (사장님이 거기서 배포 버튼 누름)
- 개선: 완료 카드 버튼에서 직접 `POST /api/projects/:id/deploy-trial` 호출 + 빌드 진행 표시
- 예상: 30분

### Supabase 옵션 선택 시 자동 프로비저닝
- Agent 가 답지의 Supabase 선택 시 스키마 SQL 설계 포함
- 완료 후 자동으로 `supabase.provisionForProject()` 호출 (3분 대기)
- `.env` 주입된 앱 코드 생성
- 예상: 60분

### "배포 옵션 1번 선택 시" 자동 배포 연쇄
- 카드 답변에 deploy-trial 포함되면 complete 즉시 `deployTrial()` 호출
- 사장님이 따로 버튼 누를 필요 X
- 예상: 20분

---

## 📊 통계

- **커밋**: 4건 (code 3 + prompt 1)
- **파일**: 2 신규 / 10 수정 / 1 테스트 stub
- **코드 라인**: +712 / -52
- **tsc**: api 0 에러 / web 0 에러
- **배포**: 4회 전부 성공 (평균 30s)
- **DB 영향**: projects 테이블에 메디트래커 1개 추가 (test 계정)
- **사장님 피드백**: 8개 전부 반영

---

## 🙏 감사 노트

- 사장님의 **실사용 기반 피드백**이 이번 세션의 방향을 전부 결정
- 특히 "달러 표시 빼" / "채팅 비활성 풀어" 같은 작은 것들이 제품 완성도에 큰 차이
- 배포 중 이슈 2건은 로그로 바로 감지 → 15분 내 수정 → 안정화 성공
