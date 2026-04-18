# Foundry 버그 수정 명령서 (4건)
> 작성: 2026-04-03 (자비스 mk8+ 세션)
> 이 명령서는 새 세션에서 버그 수정할 때 사용하는 상세 설명서입니다.

---

## 필수 선행 파일 읽기!!

이 순서대로 읽고 시작:
1. `memory/BASICS.md` — 서버/계정/기술스택/배포 방식
2. `memory/MEMORY.md` — Foundry 장기 기억 (상단 100줄만)
3. **이 파일** — 버그 수정 명령서

---

## 프로젝트 정보

- **프로젝트**: Foundry (AI MVP 빌더)
- **경로**: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/`
- **프론트**: `web/` (Next.js 16 App Router, TypeScript, Tailwind v4)
- **백엔드**: `api/` (NestJS, Prisma 6.x, PostgreSQL)
- **서버**: 175.45.200.162 (SSH 포트 3181)
- **배포**: `git push` → GitHub Actions 자동배포 (SSH 직접 배포 X)
- **도메인**: foundry.ai.kr

---

## 수정 순서 (이 순서 지켜!)

1. **버그 A**: 앱 생성 중 뒤로가기/새로고침 방지 (프론트, 간단)
2. **버그 B**: AI 수정 실패 시 고객 안내 (프론트, 중간)
3. **버그 C**: subdomain 재배포 500 에러 (백엔드, 간단)
4. **버그 D**: 회의실 새로고침 내용 소실 (프론트, 중간)

---

## 버그 A: 앱 생성 중 뒤로가기/새로고침 방지

### 문제 상황
Foundry 빌더(foundry.ai.kr/builder)에서 AI가 앱을 생성하는 중(7~17분 소요)에
사용자가 **브라우저 뒤로가기** 또는 **F5 새로고침**을 누르면:
- 프론트엔드 SSE 연결이 끊어짐
- 서버는 계속 작업 중이지만 사용자는 진행상황을 볼 수 없음
- 생성 중이던 크레딧(6,800cr)이 날아갈 수 있음

### 재현 방법
1. foundry.ai.kr 로그인 → 새 앱 생성 시작
2. Step 3 (프론트엔드 파일 생성 중) 단계에서 브라우저 뒤로가기 누르기
3. → 아무 경고 없이 페이지 이탈 → 생성 상태 소실

### 정상 동작 (수정 후)
- 생성 중 페이지 이탈 시도 → **"앱을 만들고 있습니다. 페이지를 떠나시겠습니까?"** 브라우저 경고 팝업
- 사용자가 "떠나기" 선택하면 이탈 허용, "머물기" 선택하면 잔류

### 수정 대상 파일
```
web/src/app/builder/page.tsx
```

### 현재 코드 분석
- **라인 69**: `const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');`
  - buildPhase가 `'generating'`이면 AI가 앱 생성 중인 상태
- **라인 226~390**: `handleGenerate()` 함수 — SSE 스트림으로 앱 생성 프로세스 진행
- **라인 588**: `if (buildPhase === 'generating' ...)` — 생성 상태 체크하는 조건문 존재

### 수정 방법
BuilderContent 컴포넌트 내부(라인 60~717 범위)에 useEffect 훅 추가:

```typescript
// 앱 생성 중 페이지 이탈 방지
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    // 최신 브라우저는 커스텀 메시지 무시하지만, 기본 경고 팝업은 표시됨
  };

  if (buildPhase === 'generating') {
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [buildPhase]);
```

### 삽입 위치
- BuilderContent 함수 내부, 기존 useEffect 훅들 근처에 추가
- buildPhase state 선언(라인 69) 이후, return JSX 이전

### 검증 방법
1. foundry.ai.kr/builder에서 앱 생성 시작
2. 생성 진행 중 F5 또는 뒤로가기 누르기
3. → 브라우저 경고 팝업 표시 확인
4. "머물기" 클릭 → 페이지 유지 확인
5. 생성 완료 후에는 경고 없이 이탈 가능 확인

---

## 버그 B: AI 수정 실패 시 고객 안내

### 문제 상황
빌더에서 사용자가 채팅으로 "버튼 색상 빨간색으로 바꿔줘" 같은 AI 수정 요청을 했을 때,
AI 수정이 실패하면:
- 사용자에게 **아무 피드백 없이 조용히 실패**
- "좀 더 구체적으로 말씀해주세요" 같은 **부정확한 안내**만 표시
- 실제 원인(크레딧 부족, API 오류, 빌드 실패 등)을 알 수 없음

### 재현 방법
1. foundry.ai.kr/builder → 기존 앱 열기
2. 채팅에서 복잡한 수정 요청 ("페이지 5개 추가하고 전부 DB 연동해줘")
3. AI 수정 실패 시 → 에러 원인 표시 없이 "좀 더 구체적으로..." 안내

### 정상 동작 (수정 후)
- 수정 실패 시 → **구체적 에러 안내** 표시:
  - "AI 수정에 실패했습니다. 다시 시도해주세요." (API 에러)
  - "크레딧이 부족합니다." (잔액 부족)
  - "빌드 오류가 발생했습니다. 더 간단한 요청으로 시도해주세요." (빌드 실패)
- **"다시 시도" 버튼** 또는 안내 메시지

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
```typescript
const modifyResult = await callModifyFiles(...);
// ...
if (modifyResult === null) {
  // 라인 476: "좀 더 구체적으로 말씀해주세요..." ← 원인불명 안내
}
```

#### 3) 대화 기반 수정 결과 처리 (라인 764~800)
```typescript
const result = await callModifyFiles(...);
// ...
// result === null 케이스에서 일반적 메시지만
```

### 수정 방법

#### Step 1: callModifyFiles 반환값 구조 변경 (라인 66~89)
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

#### Step 3: 두 번째 수정 핸들러(라인 794~799)도 동일하게 수정

### 주의사항
- `callModifyFiles`를 사용하는 모든 곳에서 반환값 구조 변경에 맞춰 수정 필요
- 기존 `if (modifyResult === null)` → `if (!modifyResult.success)` 로 변경
- `modifyResult.data`로 기존 성공 데이터 접근

### 검증 방법
1. 크레딧을 0으로 설정 후 수정 요청 → "크레딧 부족" 안내 확인
2. 서버 중지 후 수정 요청 → "네트워크 오류" 안내 확인
3. 복잡한 수정 요청으로 실패 유도 → "AI 수정 실패" 안내 확인
4. 정상 수정 요청 → 기존대로 정상 작동 확인 (회귀 테스트!)

---

## 버그 C: subdomain 재배포 500 에러

### 문제 상황
이미 배포(온라인 게시)된 앱을 수정한 뒤 다시 "온라인 게시"를 누르면:
- Prisma에서 `Unique constraint failed on the fields: (subdomain)` 에러 발생
- 500 Internal Server Error 반환
- 사용자는 다시 배포 불가

### 재현 방법
1. foundry.ai.kr에서 앱 생성 + 배포 완료 (subdomain 할당됨)
2. 채팅으로 수정 후 "온라인 게시" 다시 클릭
3. → 500 에러

### 에러 로그 (서버)
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
// api/prisma/schema.prisma 라인 54
model Project {
  subdomain   String?  @unique   // ← UNIQUE 제약
}
```

### 현재 코드 분석

#### deploy() 함수 (라인 366~381)
```typescript
async deploy(projectId: string) {
  const project = await this.prisma.project.findUnique({ where: { id: projectId } });

  const subdomain = project.subdomain || this.generateSubdomain(...);  // 라인 367
  // ↑ 이미 subdomain이 있어도 같은 값을 다시 SET하려고 함

  await this.prisma.project.update({  // 라인 371~381
    where: { id: projectId },
    data: {
      subdomain,          // ← 이미 같은 값인데 다시 SET → UNIQUE 충돌
      buildStatus: 'pending',
      deployedUrl: `https://${subdomain}.${DEPLOY_DOMAIN}`,
      // ...
    },
  });
}
```

#### deployTrial() 함수 (라인 410~431)
- deploy()와 동일한 구조, 동일한 문제

### 근본 원인
- 재배포 시 `project.subdomain`이 이미 존재하는데, UPDATE문에서 같은 값을 SET
- Prisma의 UNIQUE 체크에서 충돌 발생 (자기 자신과의 충돌)

### 수정 방법

#### deploy() 함수 수정 (라인 367~381)
```typescript
async deploy(projectId: string) {
  const project = await this.prisma.project.findUnique({ where: { id: projectId } });

  // 기존 subdomain 있으면 재사용, 없으면 새로 생성
  const isNewDeploy = !project.subdomain;
  const subdomain = project.subdomain || this.generateSubdomain(...);

  await this.prisma.project.update({
    where: { id: projectId },
    data: {
      // subdomain은 새 배포일 때만 SET
      ...(isNewDeploy && { subdomain }),
      buildStatus: 'pending',
      deployedUrl: `https://${subdomain}.${DEPLOY_DOMAIN}`,
      buildStartedAt: new Date(),
      buildLog: '',
    },
  });

  // 이후 빌드 로직은 동일...
}
```

#### deployTrial() 함수도 동일하게 수정 (라인 410~431)
- 같은 패턴으로 `isNewDeploy` 체크 후 조건부 subdomain SET

### 주의사항
- `deployedUrl`은 매번 SET해도 됨 (UNIQUE 아니니까)
- subdomain만 조건부로 SET하면 해결
- 기존 배포되지 않은 앱의 첫 배포는 기존대로 작동해야 함 (회귀 테스트!)

### 검증 방법
1. 새 앱 생성 → "온라인 게시" → 성공 확인 (첫 배포)
2. 같은 앱에서 수정 → "온라인 게시" 다시 클릭 → 500 없이 성공 확인 (재배포)
3. 서버 로그에서 `Unique constraint` 에러 없음 확인

---

## 버그 D: 회의실 새로고침 → 내용 소실

### 문제 상황
AI 회의실(foundry.ai.kr/meeting)에서 Claude+GPT+Gemini 멀티AI 토론을 진행하는 중에
**F5 새로고침**을 누르면:
- 회의 주제, 진행 단계, 모든 대화 내용이 **전부 사라짐**
- 사용자가 토론 내용을 참고하려고 새로고침하면 전체 소실
- 크레딧(300cr~1,000cr)도 이미 소진된 상태

### 재현 방법
1. foundry.ai.kr/meeting → 주제 입력 → 회의 시작
2. AI 토론 진행 (브리핑 → 토론 → 보고서)
3. 중간에 F5 새로고침
4. → 모든 대화 사라짐, 빈 화면

### 정상 동작 (수정 후)
- 새로고침 → 직전 상태 복원 (주제, 대화 내용, 진행 단계)
- 또는 최소한 **"새로고침하면 내용이 사라집니다" 경고** 표시

### 수정 대상 파일
```
web/src/app/meeting/page.tsx
```

### 현재 코드 분석

#### State 선언 (라인 44~67)
```typescript
const [topic, setTopic] = useState('');
const [file, setFile] = useState('');
const [phase, setPhase] = useState<MeetingPhase>('idle');
const [messages, setMessages] = useState<MeetingMessage[]>([]);
const [chatMessages, setChatMessages] = useState<{ role: string; content: string; ai?: string }[]>([]);
```
- 모든 state가 **메모리 기반 useState**만 사용
- 새로고침 시 전부 초기값으로 리셋

#### 유일한 저장 (라인 287)
```typescript
sessionStorage.setItem('meeting_context', report.content);
```
- **보고서 완성 후에만** sessionStorage 저장
- 브리핑~토론 단계에서는 저장 안 함

### 수정 방법

#### 방법 1: beforeunload 경고 (간단, 최소한의 보호)
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

#### 방법 2: sessionStorage 자동 저장 + 복원 (추천, 완전한 해결)

**저장 (messages 변경될 때마다):**
```typescript
useEffect(() => {
  if (messages.length > 0) {
    sessionStorage.setItem('meeting_state', JSON.stringify({
      topic,
      phase,
      messages,
      chatMessages,
      savedAt: new Date().toISOString(),
    }));
  }
}, [messages, chatMessages, phase, topic]);
```

**복원 (페이지 로드 시):**
```typescript
useEffect(() => {
  const saved = sessionStorage.getItem('meeting_state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      // 1시간 이내 데이터만 복원
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

**초기화 (새 회의 시작 시):**
- `startMeeting()` 함수(라인 163) 시작 부분에서 `sessionStorage.removeItem('meeting_state');` 추가

### 주의사항
- sessionStorage는 탭 닫으면 사라짐 (의도적, 다음 방문 시 빈 상태)
- MeetingMessage 타입이 JSON.stringify/parse 가능한지 확인 (Date 객체 등)
- 복원 시 SSE 스트림은 이어붙일 수 없으므로, 마지막 저장 상태까지만 복원
- phase가 'idle'이 아닌 상태에서 복원되면, SSE가 끊긴 상태이므로 "회의가 중단되었습니다. 대화 내용은 보존되었습니다." 안내 표시 권장
- **방법 1 + 방법 2 둘 다 적용** 추천 (경고 + 저장 이중 보호)

### 검증 방법
1. 회의 시작 → 토론 중간에 F5 → 경고 팝업 확인 (방법 1)
2. "떠나기" 선택 → 새로고침 후 → 이전 대화 복원 확인 (방법 2)
3. 1시간 지난 데이터 → 복원 안 됨 확인
4. 새 회의 시작 → 이전 데이터 초기화 확인

---

## 배포 방법

4개 버그 전부 수정 완료 후:

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

# 1. tsc 에러 확인 (0 에러 필수!)
cd web && npx tsc --noEmit && cd ..
cd api && npx tsc --noEmit && cd ..

# 2. 사장님께 확인받기!!

# 3. git push → GitHub Actions 자동배포
git add -A
git commit -m "fix: 빌더 4건 버그 수정 (뒤로가기방지/수정실패안내/재배포500/회의실새로고침)"
git push origin main
```

**배포 전 사장님께 반드시 확인받을 것!**

---

## 체크리스트 (전부 확인 후 배포)

- [ ] 버그 A: 빌더 생성 중 새로고침 → 경고 팝업 뜸
- [ ] 버그 A: 생성 완료 후 → 경고 없이 이탈 가능
- [ ] 버그 B: AI 수정 실패 → 구체적 에러 메시지 표시
- [ ] 버그 B: AI 수정 성공 → 기존대로 정상 작동
- [ ] 버그 C: 새 앱 첫 배포 → 정상 작동
- [ ] 버그 C: 기존 앱 재배포 → 500 에러 없이 성공
- [ ] 버그 D: 회의 중 새로고침 → 경고 팝업 뜸
- [ ] 버그 D: 새로고침 후 → 대화 내용 복원됨
- [ ] tsc 에러 0개
- [ ] 사장님 확인 완료
