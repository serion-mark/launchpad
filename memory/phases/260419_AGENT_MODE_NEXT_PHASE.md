# 260419 Agent Mode — 남은 작업 마스터 플랜 (v3)

> 자비스(전략)가 작성, 명탐정(작업)이 실행. 새 세션에서 이 파일 그대로 읽고 시작.
>
> **이전 플랜**: `260418_AGENT_MODE_PLAN.md` (v2, 1683줄) — Day 0~4 + Phase B+C 완료분 포함, 참고용
>
> **이 파일**: 남은 작업 (Day 4.5/4.6/5) + 정체성 결정 사항 + 명탐정 명령

---

## 📋 한 쪽 요약

### 완료된 것 (다른 세션에서 진행)
- Phase 0 (Sonnet 4.6 마이그)
- Phase 0.5 v1/v2 (.md 리팩토링 + 이중 안전망)
- Agent Mode Day 0~4 (V-0 + 실행 엔진 + 답지 + 카드 + 프론트엔드)
- Phase B (UX 개선: 헤더 뱃지, 복수선택, 달러 제거, 채팅 활성화)
- Phase C (자동 저장: ProjectPersistenceService + 메디트래커 DB 등록)
- 답지 부가 옵션 (Supabase / 배포 1일무료) 카드에 추가
- 누적 비용 $0.75 + 메디트래커 1개 $1.39 = $2.14

### 남은 것 (이 플랜의 범위)
- **Day 4.5**: Supabase 자동 프로비저닝 + 서브도메인 자동 배포
- **Day 4.6**: Foundry AI (포비) 정체성 디자인 — 클로드 냄새 제거
- **Day 5**: E2E 5개 시나리오 + 안정화

---

## 🎭 정체성 — 사장님 결정 (확정)

| 요소 | 값 |
|---|---|
| **이름** | Foundry AI / 별명 **포비** |
| **메인 색** | Foundry 블루 `#3182F6` (토스풍) |
| **톤** | 친근 + 전문 (자비스 톤) — 카톡처럼 ㅋㅋ OK, "네 알겠습니다" 일변도 X |
| **시그니처 이모지** | ✨ 시작 / ✅ 완료 / 💡 제안 |
| **단계 UI** | **Notion 풍 표** + 미니멀 이모지 |
| **단계 이모지** | 📋 의도 / 📦 셋업 / 🎨 디자인 / 📄 페이지 / 🔍 검증 / 🗄 DB / 🌐 배포 |
| **수정 UX** | 미세 선택지 카드 (번호 [1] [2] + 자유입력) |
| **반응형** | 모바일 우선 (h-12 터치 영역, font-16 iOS 줌 방지) |

### 사장님 강조 — 정체성은 모든 단계 일관
1. **답지 카드** (이미 있음, 일관성 보강)
2. **작업 중** (Day 4.6 단계 UI)
3. **빌드 검증** (포비 톤)
4. **DB 연결** (Supabase 단어 X, "데이터베이스")
5. **배포** (nginx/PM2 단어 X, "서버 배포")
6. **완료** (✅ + 💡 인사이트 1개)
7. **수정 중** (배포 이후도 파운더리 색깔)
8. **에러** (자동 회복, "잠깐 다시 시도할게요")

---

## 🚨 8단 사장님 통찰 (잊지 말 것)

```
1. 단계 분리 X → 이중 안전망
2. 피벗 X → 업그레이드
3. 카테고리 X → 자유 대화
4. 자비스-사장님 협업 패턴 재현
5. 원샷 종합 카드 (꼬리 질문 X)
6. 답지 채우기 모델
7. 답지에 참조(벤치마킹/디자인) 필수
8. 번호 입력 + 반응형 + 모바일
+ 4/19 추가:
9. 포비 정체성 일관 (모든 단계, 배포 후도)
10. 클로드 냄새 0 (Bash/Write/AGENTS.md 노출 X)
11. Notion 풍 표 + 미니멀 이모지
```

→ Agent system prompt 첫 줄에 박을 것.

---

## 작업 1 ─ Day 4.5: Supabase 자동 + 서브도메인 자동 배포

### 목표
답지 부가 옵션에서 사용자가 [Supabase] 또는 [배포] 선택 시 **자동 실행** (현재는 옵션만 추가됨, 실제 자동화 X).

### 작업 1-A: agent-tools.ts에 도구 3개 추가

```typescript
// api/src/agent-builder/agent-tools.ts

{
  name: 'provision_supabase',
  description: '새 Supabase 프로젝트 자동 생성 + SQL 스키마 push + .env.local 자동 작성',
  input_schema: {
    type: 'object',
    properties: {
      projectSlug: { type: 'string' },
      sqlSchema: { type: 'string', description: 'CREATE TABLE 등 풀 SQL' },
    },
    required: ['projectSlug', 'sqlSchema'],
  },
}

{
  name: 'deploy_to_subdomain',
  description: '/tmp 앱을 /var/www/apps로 복사 + PM2 + nginx 서브도메인 (1일 무료 트라이얼)',
  input_schema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'projects 테이블 id' },
    },
    required: ['projectId'],
  },
}

{
  name: 'check_build',
  description: 'npm run build 실행 → 성공/실패 + 에러 메시지 반환',
  input_schema: { type: 'object', properties: {} },
}
```

### 작업 1-B: 도구 구현 (기존 코드 재활용)

```typescript
// agent-builder.service.ts executeTool()

case 'provision_supabase':
  // 기존 ai.service.ts의 Step 2.5 (Supabase 자동 프로비저닝) 함수 import
  // 또는 supabase-js Management API 직접 호출
  // 1. 새 Supabase 프로젝트 생성
  // 2. SQL 실행 (스키마 적용)
  // 3. {sandboxPath}/{appSlug}/.env.local 작성
  //    NEXT_PUBLIC_SUPABASE_URL=...
  //    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  // 4. prompts/fixed-templates/supabase-client.ts → src/lib/supabase.ts 복사
  return { success, supabaseUrl, anonKey };

case 'deploy_to_subdomain':
  // 기존 deploy.service.ts (있으면) 또는 ProjectService.deployTrial() 재활용
  // 1. /tmp 앱 → /var/www/apps/{projectId}/ 복사
  // 2. 빈 포트 찾기 (3500부터)
  // 3. PM2 등록: pm2 start npm --name "agent-${id}" -- start
  // 4. nginx 와일드카드 *.foundry.ai.kr 매핑
  // 5. previewUrl 반환
  return { success, previewUrl };

case 'check_build':
  const r = await execAsync('npm run build', { cwd: sandboxPath });
  return { success: r.exitCode === 0, output: r.stdout };
```

### 작업 1-C: agent-core.md 보강

`prompts/agent/agent-core.md`에 추가:

```markdown
## 작업 완료 정의 (사용자가 [부가 옵션] 선택 시)

### Supabase 선택한 경우 (자동, 사용자에게 묻지 X)
1. 페이지 + 컴포넌트 생성
2. SQL 스키마 설계
3. provision_supabase 도구 호출 (자동 DB + .env)
4. 빌드 검증 (check_build)
5. 사용자에게 "✅ 완성! Supabase 연결됨"

### 배포 선택한 경우 (자동)
1. 모든 코드 + Supabase 완료 후
2. deploy_to_subdomain 도구 호출 (자동)
3. previewUrl 받기
4. 사용자에게 "🌐 https://xxx.foundry.ai.kr 작동 중!"

### 둘 다 선택 안 한 경우
1. 빌드 검증만 (check_build)
2. "내 프로젝트"에 저장 (이미 자동)
3. 사용자에게 "✅ 완성! 내 프로젝트에서 확인하세요"

⛔ 절대 금지
- "Supabase 붙여드릴까요?" 같은 추가 질문 (답지에 이미 받음)
- "배포할까요?" (답지에 이미 받음)
```

### 환경변수
```bash
AGENT_SUPABASE_AUTO=true
AGENT_DEPLOY_AUTO=true
AGENT_SUBDOMAIN_BASE=foundry.ai.kr
AGENT_DEPLOY_DIR=/var/www/apps
```

### 검증
- 답지 [Supabase] 선택 후 작업 → 새 Supabase 프로젝트 생성됨 + .env 주입 확인
- 답지 [배포] 선택 후 → https://xxx.foundry.ai.kr 접속 가능

---

## 작업 2 ─ Day 4.6: Foundry AI (포비) 정체성 디자인

### 목표
클로드 냄새 100% 제거 + 포비 정체성 모든 단계 일관 적용.

### 작업 2-A: event-translator.service.ts 신규

`api/src/agent-builder/event-translator.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

export const STAGES = [
  { id: 'intent',   label: '의도 파악',     emoji: '📋' },
  { id: 'setup',    label: '프로젝트 셋업',  emoji: '📦' },
  { id: 'design',   label: '디자인 시스템',  emoji: '🎨' },
  { id: 'pages',    label: '페이지 작성',    emoji: '📄' },
  { id: 'verify',   label: '빌드 검증',      emoji: '🔍' },
  { id: 'database', label: '데이터베이스',   emoji: '🗄' },
  { id: 'deploy',   label: '서버 배포',      emoji: '🌐' },
] as const;

export type StageId = typeof STAGES[number]['id'];

@Injectable()
export class EventTranslatorService {
  translate(raw: { tool: string; input: any; output?: string }): TranslatedEvent | null {
    if (raw.tool === 'bash') {
      const cmd = String(raw.input?.command || '');
      
      if (/create-next-app/.test(cmd))   return s('setup', '프로젝트 초기화 중', '📦');
      if (/npm install/.test(cmd))       return s('setup', '필수 라이브러리 설치 중', '📦');
      if (/npm run build/.test(cmd))     return s('verify', '빌드 검증 중', '🔍');
      
      // 내부 명령은 사용자에게 안 보임
      if (/^(ls|cat|mkdir|cd|echo|pwd|find|grep|chmod|cp|mv|rm)\b/.test(cmd)) return null;
      
      return null; // 모르는 bash 명령은 일단 숨김
    }
    
    if (raw.tool === 'write') {
      const path = String(raw.input?.path || '');
      
      // 페이지 매핑
      if (/\/app\/page\.tsx$/.test(path))           return s('pages', '🏠 홈 페이지 디자인 중', '📄');
      if (/\/dashboard/.test(path))                  return s('pages', '📊 대시보드 만드는 중', '📄');
      if (/\/medications/.test(path))                return s('pages', '💊 복약 관리 페이지', '📄');
      if (/\/health-metrics|\/health/.test(path))    return s('pages', '📈 건강 지표 페이지', '📄');
      if (/\/appointments|\/reservations/.test(path)) return s('pages', '📅 예약 페이지', '📄');
      if (/\/medical-records|\/records/.test(path))  return s('pages', '📋 기록 페이지', '📄');
      if (/\/providers|\/staff/.test(path))          return s('pages', '👨‍⚕️ 담당자 페이지', '📄');
      if (/\/customers/.test(path))                   return s('pages', '👥 고객 페이지', '📄');
      if (/\/orders/.test(path))                      return s('pages', '🛒 주문 페이지', '📄');
      if (/\/settings/.test(path))                    return s('pages', '⚙️ 설정 페이지', '📄');
      
      // 디자인 시스템
      if (/\/components\/ui\//.test(path))            return s('design', '🎨 디자인 컴포넌트', '🎨');
      if (/\/components\/layout\//.test(path))        return s('design', '🧩 레이아웃 만들기', '🎨');
      
      // 내부 (mock-data, types, utils)
      if (/\/lib\//.test(path))                       return null;
      if (/\.env|\.gitignore|tsconfig|next\.config|postcss|eslint/.test(path)) return null;
      if (/\.md$/.test(path) && !/page\./.test(path)) return null;
      
      // 그 외 페이지로 보이면
      if (/\/app\/.+\/page\.tsx$/.test(path)) return s('pages', '📄 페이지 작성 중', '📄');
      
      return null;
    }
    
    if (raw.tool === 'provision_supabase') return s('database', '🔌 데이터베이스 자동 생성 중', '🗄');
    if (raw.tool === 'deploy_to_subdomain') return s('deploy', '🚀 서버에 배포 중', '🌐');
    if (raw.tool === 'check_build')        return s('verify', '🔍 빌드 검증 중', '🔍');
    if (raw.tool === 'ask_user')           return s('intent', '💭 답지 확인 중', '📋');
    
    // Read/Glob/Grep — 사용자에게 안 보임 (Agent 내부 사고)
    return null;
  }
  
  // bash output에서 클로드/AGENTS.md 흔적 필터
  sanitizeOutput(output: string): string {
    return output
      .split('\n')
      .filter(line => !/(AGENTS\.md|CLAUDE\.md|\.claude\/|claude-agent-sdk)/i.test(line))
      .join('\n');
  }
}

function s(stage: StageId, label: string, emoji: string): TranslatedEvent {
  return { stage, label, emoji };
}

export type TranslatedEvent = {
  stage: StageId;
  label: string;
  emoji: string;
};
```

### 작업 2-B: stream-event.types.ts 확장

```typescript
type StreamEvent =
  | { type: 'foundry_progress'; stage: StageId; label: string; emoji: string; percent: number; elapsedMs: number }
  | { type: 'dev_log'; raw: any }   // 개발자 모드 only
  | { type: 'card_request'; ... }    // 기존
  | { type: 'complete'; previewUrl?: string; projectId?: string; ... }
  | ...
```

### 작업 2-C: agent-builder.service.ts 통합

raw 도구 호출 발생 시:
```typescript
const userEvent = this.translator.translate(raw);
if (userEvent) {
  emit({ type: 'foundry_progress', ...userEvent, percent: this.calcProgress(), elapsedMs });
}
emit({ type: 'dev_log', raw });  // 별도 채널
```

### 작업 2-D: FoundryProgress 컴포넌트 (Notion 풍 표)

`web/src/app/builder/agent/components/FoundryProgress.tsx`

```tsx
import { STAGES } from '../constants';

export function FoundryProgress({ stages, currentStage, currentLabel, percent, elapsed }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          🌗 포비가 작업 중
        </h3>
        <span className="text-xs text-gray-500">{elapsed}</span>
      </div>
      
      {/* 진행률 바 (Foundry 블루) */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-5 overflow-hidden">
        <div 
          className="h-full bg-[#3182F6] transition-all duration-500 ease-out" 
          style={{ width: `${percent}%` }} 
        />
      </div>
      
      {/* Notion 풍 표 */}
      <div className="space-y-2">
        {STAGES.map(stage => {
          const isCompleted = stages.completed.includes(stage.id);
          const isCurrent = stage.id === currentStage;
          const isPending = !isCompleted && !isCurrent;
          
          return (
            <div 
              key={stage.id} 
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors
                ${isCurrent ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
            >
              {/* 상태 아이콘 */}
              <div className="w-5 h-5 flex items-center justify-center text-sm">
                {isCompleted ? <span className="text-emerald-500">✓</span> : 
                 isCurrent ? <span className="animate-pulse">{stage.emoji}</span> : 
                 <span className="text-gray-400">{stage.emoji}</span>}
              </div>
              
              {/* 라벨 */}
              <div className="flex-1">
                <div className={`text-sm font-medium 
                  ${isCompleted ? 'text-gray-500' : isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                  {stage.label}
                </div>
                {isCurrent && currentLabel && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    ↳ {currentLabel}
                  </div>
                )}
              </div>
              
              {/* 시간 */}
              <div className="text-xs text-gray-400 tabular-nums">
                {stages.times[stage.id] || ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 작업 2-E: AgentChat 수정 — 기존 ToolCallBlock 숨김

```tsx
// 기존: 모든 tool_call 이벤트를 ToolCallBlock으로 렌더링 (클로드 냄새)
// 수정: foundry_progress 이벤트만 FoundryProgress로 렌더링

// 화면에 표시되는 것:
{currentProgress && <FoundryProgress {...currentProgress} />}

// 개발자 모드 토글 (기본 닫힘)
<details className="mt-3">
  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
    ▼ 작업 로그 (개발자 모드)
  </summary>
  <div className="mt-2 text-xs text-gray-500 font-mono">
    {devLogs.map(log => <div key={log.id}>{log.raw.tool} {JSON.stringify(log.raw.input).slice(0, 80)}</div>)}
  </div>
</details>
```

### 작업 2-F: FoundryEditCard — 수정 단계 일관성 ⭐ (사장님 강조)

배포 후 사용자가 "헤더 색깔 부드럽게" 같은 수정 요청 시:

```tsx
// FoundryEditCard.tsx
<div className="bg-white rounded-xl border border-gray-200 p-4">
  <div className="text-sm font-medium mb-3">
    🎨 헤더 색 변경
  </div>
  <div className="text-xs text-gray-500 mb-3">
    현재: 진한 파랑 (#3182F6)
  </div>
  <div className="space-y-1.5">
    <button className="w-full text-left p-2 rounded-lg hover:bg-gray-50">
      <span className="font-mono text-blue-600">[1]</span> 하늘색 (#7DD3FC)
    </button>
    <button className="w-full text-left p-2 rounded-lg hover:bg-gray-50">
      <span className="font-mono text-blue-600">[2]</span> 민트 (#34D399)
    </button>
    <button className="w-full text-left p-2 rounded-lg hover:bg-gray-50">
      <span className="font-mono text-blue-600">[3]</span> 직접 입력
    </button>
  </div>
</div>
```

→ 답지 카드와 동일한 디자인 언어. 배포 후 수정도 포비 정체성 유지.

### 작업 2-G: FoundryComplete — 완료 카드 ✨

```tsx
<div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-2xl">✅</span>
    <h3 className="font-bold text-gray-900">{appName} 완성!</h3>
  </div>
  
  {previewUrl && (
    <div className="my-3 p-3 bg-white rounded-lg border border-gray-100">
      <div className="text-xs text-gray-500 mb-1">🌐 작동하는 URL</div>
      <a href={previewUrl} className="text-sm text-blue-600 font-mono truncate block">
        {previewUrl}
      </a>
    </div>
  )}
  
  <div className="my-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
    <div className="text-xs font-medium text-amber-700 mb-1">💡 한 가지 제안</div>
    <div className="text-sm text-amber-900">{insight}</div>
  </div>
  
  <div className="flex gap-2 mt-4">
    <button className="flex-1 h-11 bg-[#3182F6] text-white rounded-xl font-medium">
      📁 내 프로젝트에서 열기
    </button>
    <button className="flex-1 h-11 border border-gray-200 rounded-xl font-medium">
      💬 추가 수정
    </button>
  </div>
</div>
```

### 작업 2-H: FoundryError — 에러 처리 (자동 회복)

```tsx
// 사용자에게는 raw 에러 절대 X
<div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
  <div className="flex items-center gap-2">
    <span>⚠️</span>
    <span className="text-sm text-amber-900">잠깐 다시 시도할게요</span>
  </div>
  <div className="text-xs text-amber-700 mt-1">
    포비가 자동으로 해결 중...
  </div>
</div>
```

### 어휘 매핑표 (intent-patterns.md에 추가)

| 도구/명령 | Foundry 어휘 | 단계 |
|---|---|---|
| Bash mkdir/cd/ls/cat/cp/mv/rm | (안 보임) | - |
| Bash npx create-next-app | 프로젝트 초기화 중 | 📦 |
| Bash npm install | 필수 라이브러리 설치 중 | 📦 |
| Bash npm run build | 빌드 검증 중 | 🔍 |
| Write app/page.tsx | 🏠 홈 페이지 디자인 | 📄 |
| Write dashboard/* | 📊 대시보드 만들기 | 📄 |
| Write medications/* | 💊 복약 관리 페이지 | 📄 |
| Write components/ui/* | 🎨 디자인 컴포넌트 | 🎨 |
| Write components/layout/* | 🧩 레이아웃 | 🎨 |
| Write lib/* | (안 보임) | - |
| Read/Glob/Grep | (안 보임) | - |
| provision_supabase | 데이터베이스 자동 생성 중 | 🗄 |
| deploy_to_subdomain | 서버에 배포 중 | 🌐 |
| check_build | 빌드 검증 중 | 🔍 |
| ask_user | 답지 확인 중 | 📋 |

### 검증 (Day 4.6 게이트)

사장님 새 앱 1개 만들면서 확인:
1. ✅ "Bash", "Write", "Read" 0건 (사용자 화면)
2. ✅ `ls /workspace`, `mkdir`, `npx` 0건
3. ✅ `AGENTS.md`, `CLAUDE.md` 0건
4. ✅ Notion 풍 표 + 7단계 이모지 (📋 📦 🎨 📄 🔍 🗄 🌐) 표시
5. ✅ "포비가 작업 중" 헤더
6. ✅ Foundry 블루 #3182F6 진행률 바
7. ✅ 완료 시 ✨/✅/💡 시그니처
8. ✅ 수정 단계도 동일한 카드 디자인 (FoundryEditCard)
9. ✅ 에러 시 "잠깐 다시 시도할게요" (raw 에러 X)
10. ✅ 개발자 모드 토글로 raw 로그 볼 수 있음 (디버깅용)

---

## 작업 3 ─ Day 5: E2E 5개 시나리오

명탐정이 직접 사장님에게 "테스트 시나리오 5개 돌릴게요" 후 진행:

| # | 시나리오 | 검증 포인트 |
|---|---|---|
| 1 | "할일 관리 앱" | 단순 case, 답지 1라운드, 빌드 성공 |
| 2 | "예쁜 미용실 예약앱" | 명확 요구, 선택지 X, Phase 0.5 .md 활용 |
| 3 | "매출 분석 대시보드" | recharts 복잡, F4 0건 |
| 4 | "뭐 하나 만들어줘" | 의도적 모호, 시드 1줄 + 종합 카드 |
| 5 | "방금 만든 앱에 다크모드 추가" | 수정 시나리오, FoundryEditCard 작동 |

### 측정 지표
- 평균 비용/앱: 목표 $1 미만
- 평균 시간/앱: 목표 10분 이내
- F4 발생: 목표 0건
- 클로드 냄새: 0건
- 빌드 성공률: 100%

### 비용 예산
- 5개 시나리오 × $1~2 = **$5~10 예상**

---

## 💰 예상 비용 (남은 작업)

| 작업 | LLM 비용 | 시간 |
|---|---|---|
| Day 4.5 (도구 구현, 단위 테스트) | $1 | 3시간 |
| Day 4.6 (UI/변환 레이어, LLM 0) | $0 | 2시간 |
| Day 5 (E2E 5개) | $5~10 | 4시간 |
| **총 남은 비용** | **$6~11** | **9시간** |

사장님 잔액 $20 - 누적 $1.39 = **잔여 $18.61** → 충분 (안전 범위)

---

## 🎯 명탐정 새 세션 시작 명령 (복붙용)

```
파운더리 Agent Mode 남은 작업 시작 (Day 4.5/4.6/5).

[먼저 읽기 — 5개]
1. /Users/mark/세리온 ai전화예약+POS통합관리/CLAUDE.md
2. /Users/mark/세리온 ai전화예약+POS통합관리/memory/FOUNDRY_GUIDE.md
3. ⭐ launchpad/memory/phases/260419_AGENT_MODE_NEXT_PHASE.md (이게 마스터)
4. launchpad/memory/phases/260419_AGENT_MODE_PHASE_B_C_REPORT.md (직전 작업)
5. launchpad/api/src/agent-builder/ (현재 코드)

[작업 순서]
Day 4.5 (Supabase + 배포 자동) → commit
Day 4.6 (포비 정체성, 클로드 냄새 제거) → commit
Day 5 (E2E 5개 시나리오) → 사장님 승인 후 진행

[원칙]
✓ 격리: agent-builder/ + prompts/agent/ + web/builder/agent/만 손대기
✓ 기존 /builder, ai.service.ts 손대지 않기
✓ Day별 1 commit (어제 9커밋 사고 X)
✓ "절대" 단어 사용 금지 → "반드시/금지" 등으로
✓ 포비 정체성 (Notion 풍, 📋 📦 🎨 📄 🔍 🗄 🌐, Foundry 블루) baked in
✓ 수정 단계도 동일 정체성 (FoundryEditCard)
✓ 클로드 냄새 0 (Bash/Write/AGENTS.md 노출 X)

[Day 4.5 시작 명령]
"Day 4.5 시작. 작업 1-A ~ 1-C 진행.
도구 3개 구현 + agent-core.md 보강 후 단위 테스트.
끝나면 자비스에게 보고."

GO!
```

---

## 📊 통합 진척도 (한눈에)

```
✅ Phase 0          (Sonnet 4.6 마이그)
✅ Phase 0.5 v1/v2  (.md 리팩토링 + 이중 안전망)
✅ Day 0            (V-0 SDK 검증)
✅ Day 1            (Agent SDK 실행 엔진)
✅ Day 2            (답지 + .md)
✅ Day 3            (종합 카드 + 3중 입력 파서)
✅ Day 4            (프론트엔드 + 반응형)
✅ Phase B          (UX 개선)
✅ Phase C          (자동 저장 + 메디트래커 DB 등록)
🔄 Day 4.5          (Supabase 자동 + 배포 자동) ← 다음
🔄 Day 4.6          (포비 정체성 + 클로드 냄새 제거) ← 다음
⏳ Day 5            (E2E 5개)
```

---

## 마지막 한 마디

이 작업의 본질:

> **"파운더리 AI 에이전트 (포비)의 정체성과 자동화 완성"**

기능: Supabase + 배포 자동 = 사용자가 답지만 채우면 작동 URL 받음.
정체성: 포비 = 클로드 wrapping 아닌 진짜 파운더리 AI로 보임.

→ Day 4.5 + 4.6 끝나면 **마누스급 한국형 Agent SaaS 완성**.

GO!
