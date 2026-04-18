# Foundry 버그 수정 + 기능 추가 명령서 (7건)
> 작성: 2026-04-03 (자비스 mk8+ 세션)
> 이 명령서는 새 세션에서 순서대로 실행하는 상세 설명서입니다.
> 버그 4건 + 긴급 수정 1건 + 기능 추가 2건

---

## 필수 선행 파일 읽기!!

이 순서대로 읽고 시작:
1. `memory/BASICS.md` — 서버/계정/기술스택/배포 방식
2. `memory/MEMORY.md` — Foundry 장기 기억 (상단 100줄만)
3. **이 파일** — 버그 수정 + 기능 추가 명령서

---

## 프로젝트 정보

- **프로젝트**: Foundry (AI MVP 빌더) — AI로 웹앱을 자동 생성하는 SaaS
- **경로**: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/`
- **프론트**: `web/` (Next.js 16 App Router, TypeScript, Tailwind v4)
- **백엔드**: `api/` (NestJS, Prisma 6.x, PostgreSQL)
- **서버**: 175.45.200.162 (SSH 포트 3181)
- **배포**: `git push` → GitHub Actions 자동배포 (SSH 직접 배포 X)
- **도메인**: foundry.ai.kr
- **DB**: PostgreSQL / launchpaddb / launchpad / launchpad1234

---

## 작업 순서 (이 순서 지켜!!)

### Phase 1: 긴급 수정 (10분)
| # | 작업 | 파일 | 난이도 |
|---|------|------|--------|
| 1 | **Gemini 모델 변경** | api/src/llm-router.ts | 5분 |
| 2 | **뒤로가기 방지 (beforeunload)** | web/src/app/builder/page.tsx | 5분 |

### Phase 2: 버그 수정 (1~2시간)
| # | 작업 | 파일 | 난이도 |
|---|------|------|--------|
| 3 | **AI 수정 실패 시 고객 안내** | web/src/app/builder/components/BuilderChat.tsx | 중간 |
| 4 | **subdomain 재배포 500 에러** | api/src/project/deploy.service.ts | 간단 |
| 5 | **회의실 새로고침 내용 소실** | web/src/app/meeting/page.tsx | 중간 |

### Phase 3: 기능 추가 (2~3시간)
| # | 작업 | 파일 | 난이도 |
|---|------|------|--------|
| 6 | **회의 기록 저장 + 히스토리 UI** | schema.prisma + meeting.service.ts + page.tsx | 높음 |
| 7 | **빌더 채팅 가이드 (플레이스홀더 + 첫 방문 말풍선)** | BuilderChat.tsx + builder/page.tsx | 중간 |

→ Phase 1~2 완료 후 배포 → Phase 3 완료 후 배포 (2회 나눠서 배포)

---

## 1. Gemini 모델 변경 (긴급!)

### 문제 상황
AI 회의실(foundry.ai.kr/meeting)에서 3개 AI(Claude+GPT+Gemini)가 토론하는 구조인데,
**Gemini가 404 에러로 작동 안 함.** Google이 `gemini-2.0-flash` 모델을 폐기해서 발생.
현재 Gemini 없이 Claude+GPT만으로 회의가 진행되고 있음.

### 서버 에러 로그 (실제)
```
[Gemini 패스] [GoogleGenerativeAI Error]: Error fetching from
.../models/gemini-2.0-flash:generateContent:
[404 Not Found] This model models/gemini-2.0-flash is no longer available
to new users. Please update your code to use a newer model.
```

### 수정 대상 파일
```
api/src/llm-router.ts
```

### 수정 방법
`gemini-2.0-flash`를 `gemini-2.5-flash`로 변경.
파일 내에서 `gemini-2.0-flash` 문자열을 검색해서 **전부** `gemini-2.5-flash`로 바꾸면 됨.

주의: 파일 내 여러 곳에서 모델명이 참조될 수 있으므로 검색해서 빠짐없이 변경.

### 검증 방법
1. foundry.ai.kr/meeting → 아무 주제로 회의 시작
2. Gemini(빨간색) 발언이 나오는지 확인
3. 서버 로그에서 404 에러 안 나오는지 확인:
   `ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 "tail -20 /root/.pm2/logs/launchpad-api-out.log"`

---

## 2. 앱 생성 중 뒤로가기/새로고침 방지

### 문제 상황
Foundry 빌더(foundry.ai.kr/builder)에서 AI가 앱을 생성하는 중(7~17분 소요)에
사용자가 **브라우저 뒤로가기** 또는 **F5 새로고침**을 누르면:
- 프론트엔드 SSE 연결이 끊어짐
- 서버는 계속 작업 중이지만 사용자는 진행상황을 볼 수 없음
- 생성 중이던 크레딧(6,800cr)이 날아갈 수 있음
- **현재 아무 경고 없이 이탈됨**

### 재현 방법
1. foundry.ai.kr 로그인 → 새 앱 생성 시작
2. Step 3 (프론트엔드 파일 생성 중) 단계에서 브라우저 뒤로가기 누르기
3. → 아무 경고 없이 페이지 이탈 → 생성 상태 소실

### 수정 대상 파일
```
web/src/app/builder/page.tsx
```

### 현재 코드 분석
- **라인 69**: `const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');`
  - `buildPhase`가 `'generating'`이면 AI가 앱 생성 중인 상태
- **라인 226~390**: `handleGenerate()` 함수 — SSE 스트림으로 앱 생성 프로세스 진행
- 현재 `beforeunload` 이벤트 리스너가 **없음**

### 수정 방법
BuilderContent 컴포넌트 내부, 기존 useEffect 훅들 근처(buildPhase state 선언 이후, return JSX 이전)에 추가:

```typescript
// 앱 생성 중 페이지 이탈 방지
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
  };

  if (buildPhase === 'generating') {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [buildPhase]);
```

이렇게 하면 생성 중 뒤로가기/새로고침/탭닫기 시 브라우저 기본 경고 팝업이 표시됨:
```
"이 사이트에서 나가시겠습니까?"
"변경사항이 저장되지 않을 수 있습니다."
[나가기] [취소]
```

### 검증 방법
1. 빌더에서 앱 생성 시작
2. 생성 진행 중 F5 또는 뒤로가기 → 브라우저 경고 팝업 확인
3. "취소" 클릭 → 페이지 유지 확인
4. 생성 완료 후 → 경고 없이 이탈 가능 확인

---

## 3. AI 수정 실패 시 고객 안내

### 문제 상황
빌더에서 사용자가 채팅으로 "버튼 색상 빨간색으로 바꿔줘" 같은 AI 수정 요청을 했을 때,
AI 수정이 실패하면:
- 사용자에게 **아무 피드백 없이 조용히 실패**하거나
- "좀 더 구체적으로 말씀해주세요" 같은 **부정확한 안내**만 표시
- 실제 원인(크레딧 부족, API 오류, 빌드 실패 등)을 알 수 없음

### 수정 대상 파일
```
web/src/app/builder/components/BuilderChat.tsx
```

### 현재 코드 분석

#### 1) API 호출 함수 (라인 66~89)
```typescript
async function callModifyFiles(...) {
  // ...
  if (!res.ok) return null;  // ← 문제! 에러 상세 정보 버림
  // ...
}
```
- 실패 시 `null`만 반환 → 에러 원인(크레딧, 네트워크, 서버에러 등) 전달 불가

#### 2) 첫 번째 수정 결과 처리 (라인 420~485)
- `modifyResult === null`인 경우 → "좀 더 구체적으로 말씀해주세요..." (라인 476)

#### 3) 대화 기반 수정 결과 처리 (라인 764~800)
- `result === null` 케이스에서 일반적 메시지만

### 수정 방법

#### Step 1: callModifyFiles 반환값 구조 변경 (라인 66~89)
- `null` 반환 대신 `{ success: boolean; data?: any; error?: string }` 형태로 변경
- `res.ok`가 아닐 때 응답 바디에서 에러 메시지 추출
- 에러 유형 분류: `'credit'` (잔액 부족) / `'network'` (연결 실패) / `'api'` (서버 에러)

```typescript
async function callModifyFiles(...): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(...);
    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      if (res.status === 402 || errorBody.includes('크레딧')) {
        return { success: false, error: 'credit' };
      }
      return { success: false, error: 'api' };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: 'network' };
  }
}
```

#### Step 2: 실패 케이스 안내 메시지 개선 (라인 476 근처 + 라인 794 근처)
```typescript
if (!modifyResult.success) {
  let errorMsg = '';
  switch (modifyResult.error) {
    case 'credit':
      errorMsg = '크레딧이 부족합니다. 충전 후 다시 시도해주세요.';
      break;
    case 'network':
      errorMsg = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      break;
    default:
      errorMsg = 'AI 수정에 실패했습니다. 더 간단한 요청으로 다시 시도해주세요.';
  }
  // 채팅 메시지로 에러 안내 표시
}
```

#### Step 3: 기존 `modifyResult === null` → `!modifyResult.success` 로 변경
- callModifyFiles를 사용하는 모든 곳에서 반환값 구조 변경에 맞춰 수정
- 성공 데이터는 `modifyResult.data`로 접근

### 검증 방법
1. 크레딧 0인 계정으로 수정 요청 → "크레딧 부족" 안내 확인
2. 서버 중지 후 수정 요청 → "네트워크 오류" 안내 확인
3. 정상 수정 요청 → 기존대로 정상 작동 확인 (회귀 테스트 중요!)

---

## 4. subdomain 재배포 500 에러

### 문제 상황
이미 배포(온라인 게시)된 앱을 수정한 뒤 다시 "온라인 게시"를 누르면:
- Prisma에서 `Unique constraint failed on the fields: (subdomain)` 에러 발생
- 500 Internal Server Error 반환
- 사용자는 수정 후 다시 배포 불가

### 서버 에러 로그 (실제)
```
ERROR [500] Unique constraint failed on the fields: (`subdomain`)
  at deploy.service.ts:325
```

### 수정 대상 파일
```
api/src/project/deploy.service.ts
```

### DB 스키마 참고
```prisma
// api/prisma/schema.prisma
model Project {
  subdomain   String?  @unique   // ← UNIQUE 제약
}
```

### 현재 코드 분석

#### deploy() 함수 (라인 366~381)
```typescript
const subdomain = project.subdomain || this.generateSubdomain(...);  // 라인 367
// ↑ 이미 subdomain이 있어도 같은 값을 다시 SET하려고 함

await this.prisma.project.update({  // 라인 371~381
  data: {
    subdomain,          // ← 이미 같은 값인데 다시 SET → UNIQUE 충돌
    buildStatus: 'pending',
    deployedUrl: `https://${subdomain}.${DEPLOY_DOMAIN}`,
  },
});
```

#### deployTrial() 함수 (라인 410~431) — 동일한 구조, 동일한 문제

### 수정 방법

#### deploy() + deployTrial() 둘 다 수정
```typescript
// 기존 subdomain 있으면 재사용, 없으면 새로 생성
const isNewDeploy = !project.subdomain;
const subdomain = project.subdomain || this.generateSubdomain(...);

await this.prisma.project.update({
  where: { id: projectId },
  data: {
    // subdomain은 새 배포일 때만 SET (재배포 시 UNIQUE 충돌 방지)
    ...(isNewDeploy && { subdomain }),
    buildStatus: 'pending',
    deployedUrl: `https://${subdomain}.${DEPLOY_DOMAIN}`,
    buildStartedAt: new Date(),
    buildLog: '',
  },
});
```

**핵심**: `...(isNewDeploy && { subdomain })` — 처음 배포할 때만 subdomain SET, 재배포 시 생략

### 검증 방법
1. 새 앱 생성 → "온라인 게시" → 성공 (첫 배포)
2. 같은 앱 수정 → "온라인 게시" 다시 클릭 → 500 없이 성공 (재배포)
3. 서버 로그에서 `Unique constraint` 에러 없음 확인

---

## 5. 회의실 새로고침 → 내용 소실

### 문제 상황
AI 회의실(foundry.ai.kr/meeting)에서 Claude+GPT+Gemini 멀티AI 토론 진행 중에
**F5 새로고침**을 누르면:
- 회의 주제, 진행 단계, 모든 대화 내용이 **전부 사라짐**
- 크레딧(300~1,000cr)은 이미 소진된 상태인데 내용이 없어짐

### 수정 대상 파일
```
web/src/app/meeting/page.tsx
```

### 현재 코드 분석

#### State 선언 (라인 44~67) — 전부 메모리 기반
```typescript
const [topic, setTopic] = useState('');
const [phase, setPhase] = useState<MeetingPhase>('idle');
const [messages, setMessages] = useState<MeetingMessage[]>([]);
const [chatMessages, setChatMessages] = useState<...[]>([]);
```
- 새로고침 시 전부 초기값으로 리셋

#### 유일한 저장 (라인 287) — 보고서만, 앱 전환 시에만
```typescript
sessionStorage.setItem('meeting_context', report.content);
```

### 수정 방법 — 이중 보호 (beforeunload + sessionStorage 저장/복원)

#### A. beforeunload 경고 추가
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
  };
  if (phase !== 'idle') {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [phase]);
```

#### B. messages 변경 시 sessionStorage 자동 저장
```typescript
useEffect(() => {
  if (messages.length > 0) {
    sessionStorage.setItem('meeting_state', JSON.stringify({
      topic, phase, messages, chatMessages,
      savedAt: new Date().toISOString(),
    }));
  }
}, [messages, chatMessages, phase, topic]);
```

#### C. 페이지 로드 시 복원
```typescript
useEffect(() => {
  const saved = sessionStorage.getItem('meeting_state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      const savedAt = new Date(state.savedAt);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (savedAt > hourAgo) {
        setTopic(state.topic || '');
        setPhase(state.phase || 'idle');
        setMessages(state.messages || []);
        setChatMessages(state.chatMessages || []);
      } else {
        sessionStorage.removeItem('meeting_state');
      }
    } catch (e) {
      sessionStorage.removeItem('meeting_state');
    }
  }
}, []);
```

#### D. 새 회의 시작 시 이전 데이터 초기화
- `startMeeting()` 함수(라인 163) 시작 부분에:
  `sessionStorage.removeItem('meeting_state');`

### 주의사항
- 복원 시 SSE 스트림은 이어붙일 수 없음 → "회의가 중단되었습니다. 대화 내용은 보존되었습니다." 안내 표시
- 1시간 지난 데이터는 자동 만료 (stale 방지)
- phase가 'idle'이 아닌 상태로 복원되면 SSE가 끊긴 상태이므로, phase를 적절히 처리 필요

### 검증 방법
1. 회의 시작 → 토론 중 F5 → 경고 팝업 확인
2. "떠나기" 선택 → 새로고침 후 이전 대화 복원 확인
3. 새 회의 시작 → 이전 데이터 초기화 확인

---

## ★ Phase 1~2 완료 후 중간 배포! ★

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
cd web && npx tsc --noEmit && cd ..
cd api && npx tsc --noEmit && cd ..
# 사장님 확인 후!
git add -A
git commit -m "fix: Gemini 모델 업데이트 + 빌더 4건 버그 수정"
git push origin main
```

---

## 6. 회의 기록 저장 + 히스토리 UI (신규 기능)

### 왜 필요한가
현재 AI 회의실에서 토론한 내용이 **어디에도 저장되지 않음.**
- 크레딧 300~1,000cr 써서 회의했는데 새로고침하면 사라짐
- 이전에 어떤 주제로 회의했는지 확인 불가
- "이걸로 앱 만들기" 눌렀을 때만 sessionStorage에 임시 저장
- **고객 입장: 돈 내고 회의했는데 기록이 없다? → 불만**
- 클로드(Claude)처럼 좌측에 채팅 히스토리 목록이 있어야 자연스러움

### 구현 순서

#### Step 1: DB 모델 추가

**파일**: `api/prisma/schema.prisma`

```prisma
model MeetingHistory {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  topic       String
  preset      String   @default("custom")
  tier        String   @default("standard")
  messages    Json     // 전체 대화 내용 (MeetingMessage[])
  report      String?  // 종합 보고서 마크다운
  creditUsed  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([projectId])
}
```

- User, Project 모델에 `meetings MeetingHistory[]` 관계 추가
- 마이그레이션: `npx prisma db push`

#### Step 2: 백엔드 API

**파일**: `api/src/ai/meeting.service.ts` + `api/src/ai/ai.controller.ts`

**저장 API** — 회의 완료 시 자동 호출:
- `meetingSSE()` 메서드(ai.controller.ts)에서 회의 완료 후 DB 저장
- meeting.service.ts의 회의 결과(messages + report)를 그대로 JSON 저장

```
POST /api/ai/meeting-history (회의 저장 - 내부 호출)
GET  /api/ai/meeting-history (히스토리 목록 조회 - userId 기준)
GET  /api/ai/meeting-history/:id (상세 조회 - 메시지 전체 반환)
DELETE /api/ai/meeting-history/:id (삭제)
```

#### Step 3: 프론트엔드 히스토리 UI

**파일**: `web/src/app/meeting/page.tsx` + 새 컴포넌트

**레이아웃 변경:**
- 현재: 회의실이 화면 전체
- 변경: 좌측에 히스토리 사이드바 (250px) + 우측에 기존 회의실

**히스토리 사이드바 구성:**
```
┌──────────────────────────────────────────────┐
│ [+ 새 회의]                                    │
│                                               │
│ 📋 회사소개서 분석      4/1 19:35             │
│ 📋 경쟁사 벤치마킹      3/30 14:20            │
│ 📋 MVP 기능 검증        3/28 10:15            │
│                                               │
│ (더보기...)                                    │
└──────────────────────────────────────────────┘
```

- 각 항목 클릭 → 해당 회의 내용 우측에 표시 (읽기 전용)
- "새 회의" 클릭 → 기존처럼 주제 입력 화면
- 모바일: 사이드바 접기/펼치기 토글

#### Step 4: 프로젝트 연결 (선택사항, 시간 되면)

**빌더 페이지에서:**
- "이 프로젝트의 회의 기록" 탭 또는 버튼
- 클릭 시 해당 projectId로 필터된 회의 목록 표시

### 주의사항
- messages JSON이 클 수 있음 (Premium 회의 시 10KB+) → 목록 API에서는 messages 제외, 상세에서만 포함
- 기존 로직(크레딧 차감, SSE 스트림) 건드리지 말 것 — DB 저장은 회의 완료 후 추가
- 히스토리 목록은 최근 20개만 기본 표시 + 페이지네이션 또는 더보기

### 검증 방법
1. 회의 진행 → 완료 후 좌측 히스토리에 자동 추가 확인
2. 히스토리 항목 클릭 → 이전 대화 내용 표시 확인
3. "새 회의" → 새로운 회의 정상 진행 확인
4. 삭제 기능 동작 확인

---

## 7. 빌더 채팅 가이드 (고객이 수정 방법을 모르는 문제)

### 왜 필요한가
Foundry 빌더에서 앱이 생성된 후, 사용자가 **채팅으로 수정할 수 있다는 걸 모름.**
- 프리뷰에 "지금 둘러보기" 버튼이 보이는데 클릭해도 작동 안 함 (데모 데이터)
- "이 버튼을 누르면 상품이 보이게 해줘" 같은 수정을 채팅으로 해야 하는데
- **고객은 채팅창에 뭘 입력해야 하는지 모름**
- 사장님 원문: "채팅창에 입력하는게 너무 불편하고 고객은 이걸 어떻게 하는지 모를거 같음"

### 수정 대상 파일
```
web/src/app/builder/components/BuilderChat.tsx
web/src/app/builder/page.tsx
```

### 구현 내용

#### A. 채팅 입력창 플레이스홀더 개선
현재: `"메시지를 입력하세요..."` 같은 일반적 문구
변경: 상황별 구체적 예시 힌트

```
앱 생성 완료 후: "예: 버튼을 누르면 상품 목록이 보이게 해줘"
수정 1회 후: "예: 배경색을 파란색으로 바꿔줘"
수정 2회 후: "예: 새 페이지를 추가해줘"
```

- 플레이스홀더 텍스트를 배열로 관리, 수정 횟수에 따라 순환
- 고객이 "아, 이런 식으로 말하면 되는구나!" 자연스럽게 학습

#### B. 첫 방문 가이드 말풍선 (앱 생성 완료 직후)
앱이 처음 생성 완료되면 채팅 영역 상단에 가이드 말풍선 표시:

```
┌─────────────────────────────────────────────────┐
│  💡 앱이 완성됐어요! 이제 채팅으로 수정할 수 있어요.   │
│                                                  │
│  이렇게 말해보세요:                                │
│  • "버튼을 누르면 상품이 보이게 해줘"               │
│  • "메인 색상을 빨간색으로 바꿔줘"                  │
│  • "회원가입 페이지를 추가해줘"                     │
│                                                  │
│                               [알겠어요! ✕]       │
└─────────────────────────────────────────────────┘
```

- `localStorage.getItem('builder_guide_shown')` 체크 → 한 번만 표시
- "알겠어요!" 클릭 시 닫기 + localStorage에 표시 완료 기록
- 또는 앱 생성 완료 직후에 AI 채팅 메시지로 자동 표시해도 좋음

#### C. 퀵 액션 칩 (시간 되면 추가)
채팅 입력창 위에 자주 쓰는 수정 요청을 칩 버튼으로:

```
[색상 변경] [페이지 추가] [버튼 활성화] [텍스트 수정]
```

- 칩 클릭 → 채팅 입력창에 자동 입력 (예: "메인 색상을 _____으로 바꿔줘")
- 필수는 아니고 시간 되면

### 검증 방법
1. 앱 생성 완료 → 가이드 말풍선 표시 확인
2. 말풍선 닫기 → 새로고침해도 안 뜸 확인
3. 채팅 입력창 플레이스홀더에 구체적 예시 표시 확인
4. 다른 프로젝트 열어도 가이드 정상 작동 확인

---

## 배포 방법

### Phase 1~2 배포 (버그 수정 5건)
```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
cd web && npx tsc --noEmit && cd ..
cd api && npx tsc --noEmit && cd ..
# tsc 에러 0 확인!!
# 사장님께 확인받기!!
git add -A
git commit -m "fix: Gemini 모델 업데이트 + 빌더 버그 4건 수정 (뒤로가기방지/수정실패안내/재배포500/회의실새로고침)"
git push origin main
```

### Phase 3 배포 (기능 추가 2건)
```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
cd web && npx tsc --noEmit && cd ..
cd api && npx tsc --noEmit && cd ..
# tsc 에러 0 확인!!
# DB 마이그레이션: npx prisma db push
# 사장님께 확인받기!!
git add -A
git commit -m "feat: 회의 히스토리 저장 + 빌더 채팅 가이드 UX 개선"
git push origin main
```

**배포 전 사장님께 반드시 확인받을 것!**

---

## 전체 체크리스트

### Phase 1 (긴급)
- [ ] Gemini `gemini-2.5-flash` 변경 → 회의실 3AI 토론 정상 확인
- [ ] 빌더 생성 중 새로고침 → 브라우저 경고 팝업

### Phase 2 (버그 수정)
- [ ] AI 수정 실패 → 구체적 에러 메시지 (크레딧/네트워크/일반)
- [ ] AI 수정 성공 → 기존대로 정상 (회귀 테스트!)
- [ ] 기존 앱 재배포 → 500 에러 없이 성공
- [ ] 새 앱 첫 배포 → 정상 (회귀 테스트!)
- [ ] 회의 중 새로고침 → 경고 팝업 + 내용 복원
- [ ] tsc 에러 0개
- [ ] 사장님 확인 → 배포

### Phase 3 (기능 추가)
- [ ] DB: MeetingHistory 모델 생성 + prisma db push
- [ ] 회의 완료 → 히스토리에 자동 저장
- [ ] 히스토리 사이드바 표시 + 항목 클릭 → 내용 표시
- [ ] 빌더: 채팅 플레이스홀더 개선
- [ ] 빌더: 첫 방문 가이드 말풍선
- [ ] tsc 에러 0개
- [ ] 사장님 확인 → 배포
