# Agent Mode 대화 이력 (agentMessages) 버그 전체 교차검증 보고서

> **작성**: 2026-04-19 저녁 (자비스)
> **목적**: 사장님 지적 "진짜 원인 5번 말했음" → 전체 시스템 조망 + 남은 가능성 열거
> **결론 미리 말씀**: 5개 커밋 중 **마지막 c854ed1 이 정말 마지막**일 가능성 높음. 하지만 검증은 사장님 다음 세션으로만 가능. 예상 실패 케이스 4종도 미리 열거.

---

## 🙇 반성

5번의 "진짜 원인" 주장:

| # | 커밋 | 당시 주장 | 실제 | 왜 놓쳤나 |
|---|---|---|---|---|
| 1 | `b491ccf` | "tool_result user 시작점" | 맞았지만 뒷부분 clean end 로직이 과도 | 로컬 verify 불가, 서버 로그 안 봄 |
| 2 | `8c80e18` | "앞쪽 스킵만 고치면 끝" | 뒷부분이 assistant(tool_use) 로 끝나면 잘라냄 → 0턴 | 코드 플로우 전체 조망 X |
| 3 | `87c6502` | "pair 단위 검증이 근본" | save 쪽 `slice(-20)` 이 user_prompt 잘라냄 | 서버 로그 안 보고 다음 배포 |
| 4 | `44d938d` | "cycle 단위 truncate 가 해결" | **load 쪽 `slice(-20)` 그대로 남음** | save 로직만 보고 load 빼먹음 |
| 5 | `c854ed1` | "load slice 제거로 끝" | (검증 대기) | — |

**공통 실수**: 서버 로그로 실제 동작 확인 전에 코드 수정 → 배포 반복. 배포만 5번. 사장님 시간/비용 낭비.

---

## 🗺 전체 시스템 맵 (save → DB → load → Anthropic)

```
[한 세션 끝]
  run() 종료 직전
     ↓
  messages[] (raw 누적)
     ↓
  sanitizeMessageHistory(messages)   ← 짝 단위 검증
     ↓
  cycle 단위 truncate (30KB 초과 시)
     ↓
  prisma.project.update({ agentMessages })
                   ↓
              [DB 저장]
                   ↓
[다음 세션 시작]
  run() 시작
     ↓
  prisma.project.findFirst({ agentMessages })
     ↓
  sanitizeMessageHistory(prior)      ← slice 없이 전체 (c854ed1 수정)
     ↓
  messages = [...sanitized]
  messages.push({ role:'user', content: new_prompt })
     ↓
  Anthropic API 호출
```

---

## 🔬 각 단계별 검증 체크리스트

### ① `sanitizeMessageHistory(messages)` 동작 정확성

**입력 가정**: Agent run() 이 돌아간 후 messages 는 다음 중 하나로 끝남
- 정상 종료: `[..., assistant(text only)]` (`stop_reason: end_turn`)
- cancel/에러: `[..., assistant(tool_use)]` 또는 `[..., user(tool_result)]` (중간 끊김)

**sanitize 로직 흐름**:
1. 앞 스킵: `user && !hasToolResult` 첫 지점까지
2. pair 단위 push:
   - `assistant(tool_use)` + `user(tool_result)` 짝 → 쌍으로 push
   - `assistant(text only)` → 단독 push
   - `user(text only)` → 단독 push
   - 고아 `user(tool_result)` → break
3. 첫 메시지 일반 user 아니면 빈 배열

**검증 결론**:
- ✅ 정상 종료 케이스: 전체 보존
- ✅ 중간 끊긴 케이스: 끊긴 지점 전까지 보존
- ✅ 빈 입력: 빈 배열
- ⚠️ 예외: assistant content 가 string(배열 아님)인 경우 — Anthropic SDK 는 배열로 주는 게 표준이지만 혹시 string 이면 tool_use/result 탐지 실패. 현재 코드는 string 이면 `hasToolUse=false` 처리 → 단독 push → OK

### ② Cycle 단위 truncate (save 쪽)

**로직**:
```typescript
while (serialized.length > 30_000 && tail.length > 1) {
  // 첫 cycle 끝 찾기 — 다음 plain user 까지
  let nextCycle = 1;
  while (nextCycle < tail.length && !isPlainUser(tail[nextCycle])) nextCycle++;
  if (nextCycle >= tail.length) break;
  tail = tail.slice(nextCycle);
}
```

**검증 결론**:
- ✅ 여러 cycle 있으면: 앞 cycle 제거 → 결과는 항상 plain user 시작
- ⚠️ **단일 cycle (user_prompt 1개 + 긴 tool 연쇄)**: while 조건 `nextCycle >= tail.length` 로 break → **95KB 저장됨** (실제 서버 로그로 확인)
- 🔴 **잠재 문제**: DB row 크기 (Prisma Json 기본 1MB), Anthropic API input 제한 (200K tokens), 이 둘은 아직 멀지만 장기적 폭주 가능

### ③ Load 쪽 (c854ed1 수정 후)

```typescript
const prior = p.agentMessages as ...;
const sanitized = this.sanitizeMessageHistory(prior);   // slice 없음
messages.push(...sanitized);
messages.push({ role: 'user', content: prompt });
```

**검증 결론**:
- ✅ 저장된 값이 이미 sanitize + cycle truncate 된 상태 → sanitize 재적용해도 결과 동일
- ✅ slice 없음 → user_prompt 보존

### ④ Anthropic API 호출 시

**API 제약**:
1. 첫 메시지 `role=user` 필수
2. `assistant(tool_use)` 뒤엔 `user(tool_result)` 필수, 모든 `id` 매칭
3. `user(tool_result)` 뒤엔 assistant 응답 필수

**검증 결론**:
- ✅ sanitize 결과가 이 제약 100% 만족 (pair 단위 push + 고아 tool_result break)
- ✅ 마지막에 새 user_prompt 붙이므로 마지막 메시지는 항상 user → API 요구사항 충족

---

## 🚨 남아있는 실패 케이스 (예측)

### Case A: **단일 cycle 이 무한정 커짐** (장기)
- 사장님이 한 번 앱 생성 시 iter=20~30 → 95KB~150KB
- 수정 모드에서 이어 작업 → messages 에 누적 (새 세션이 들어감)
- 시간 지나면 agentMessages 가 500KB, 1MB 육박
- **대응 필요**: 단일 cycle 도 pair 단위로 잘라낼 수 있게 → 가장 오래된 `(assistant, user(tool_result))` 쌍 제거 후 sanitize 재검증

### Case B: **Prisma Json 필드 저장 실패** (단기)
- Postgres JSON 은 NULL byte `\u0000` 저장 불가
- Agent 응답에 어쩌다 null byte 포함되면 `prisma.update` 에서 throw
- 현재 코드는 `catch` 로 무시하지만 → 다음 세션에 과거 이력 로드 실패 (저장 실패라 그냥 0턴 로드)

### Case C: **tool_use id 매칭 실패** (재현 가능성 낮음)
- sanitize 가 `useIds.every(id => resIds.includes(id))` 로 체크
- JSON 직렬화/역직렬화 과정에서 id 가 변형되면 매칭 실패 → break → 앞부분 일부만 남음
- Anthropic SDK 는 id 를 문자열로 보장하지만 혹시 변형 발생 가능

### Case D: **load 타이밍 경쟁 조건** (희박)
- 사장님이 동일 프로젝트에 2 브라우저 탭으로 동시 세션
- 두 번째 세션이 시작할 때 첫 번째 세션의 저장이 아직 안 끝남 → 이전 이력 로드
- 두 세션이 서로 덮어씀
- 현재 대응 없음. 보통은 단일 사용자라 문제 안 남

---

## ✅ c854ed1 이 마지막일 근거

1. 서버 로그 결정적 증거:
   ```
   19:12:04 → 24턴 저장 (95552B)   ← save OK
   19:12:39 → 로드 결과 0턴        ← load 에서 잃음
   ```
   load 쪽 `slice(-20)` 이 유일한 0턴 원인.
2. 수정 범위: `prior.slice(-20)` → `prior` (1 줄 수정)
3. sanitize 는 input == output (같은 sanitize 된 데이터를 재검증 해도 결과 동일)

**따라서 c854ed1 배포 후 로그에 "과거 N턴 로드 (원본 M턴)" N>0 이 찍혀야 정상.**

---

## 📋 사장님 검증 시나리오 (교차검증)

### 1회차 (단순 저장 확인)
1. localpick 수정 모드 진입
2. 아무 질문 "홈 배경색 좀 예쁘게 해줘"
3. Agent 응답 → 세션 끝
4. **서버 로그 확인**: `N턴 저장 (XXXXXB, 원본 N턴)` N>0

### 2회차 (저장 → 로드 검증)
5. **같은 창**에서 "방금 말한 거 적용해줘"
6. Agent 응답 시작
7. **서버 로그 확인**: `과거 N턴 로드 (원본 N턴)` N>0 (1회차에서 저장한 수와 비슷)
8. Agent 응답 품질: "방금 말한 거"를 "홈 배경색"으로 이해하는지

### 3회차 (장기 누적)
9. 5~10번 반복 대화
10. agentMessages 크기 추이 (DB 쿼리로 `LENGTH(agentMessages::text)`)
11. Case A (단일 cycle 폭주) 재현 여부

---

## 🛠 Case A 예방 개선 (제안 — 사장님 승인 후)

단일 cycle 이 MAX_BYTES 초과 시 **pair 단위로 자르기**:

```typescript
// 현재: cycle 단위로만 자름 → 단일 cycle 이면 break
// 제안: cycle 단위 시도 후 여전히 크면 pair (assistant, user(tool_result)) 단위로
while (serialized.length > MAX_BYTES && tail.length > 1) {
  // 1차: cycle 단위 (현재 로직)
  if (hasMultipleCycles(tail)) {
    tail = removeFirstCycle(tail);
  } else {
    // 2차: 첫 user_prompt 다음의 첫 pair 제거
    // [user_prompt, (A1, U1), (A2, U2), ...] → [user_prompt, (A2, U2), ...]
    if (tail.length < 3) break;
    tail = [tail[0], ...tail.slice(3)]; // user_prompt + pair 하나 건너뛰고 나머지
    tail = sanitize(tail); // 짝 재검증
  }
  serialized = JSON.stringify(tail);
}
```

구현 여부는 사장님 판단.

---

## 📊 5번의 배포 비용

| 배포 | 시간 | Agent 세션 비용 (로그 확인) |
|---|---|---|
| b491ccf | 17:32 | (테스트 없음) |
| 8c80e18 | 17:52 | session=1f0fd5f7 $0.135 |
| 87c6502 | 19:01 | (짧은 세션들) |
| 44d938d | 19:07 | session=6e0a6781 $0.330 |
| c854ed1 | 19:15 | 검증 대기 |

**사장님 디버깅 비용**: 약 $1.5~2 (Agent 세션) + 사장님 시간. 자비스 과오.

---

## 🙇 교훈

1. **급하게 fix 반복하지 말 것**: 한 번 "진짜 원인" 주장 전에 전체 시스템 조망 필수
2. **배포 전 서버 로그로 가설 검증**: 로컬 verify 불가해도 기존 로그로 동일 케이스 존재 여부 확인 가능했음
3. **save/load 는 대칭**: save 로직 건드리면 load 도 같이 재검토
4. **로그 하나에만 의존 위험**: "0턴 저장" 으로 save 결론 내렸는데 실제로는 load 에서도 잃고 있었음

사장님, 진심으로 죄송합니다. 이번 c854ed1 이 정말 마지막이라고 판단하지만, **사장님 테스트 전까진 확정 X**. 테스트 결과 기다립니다.
