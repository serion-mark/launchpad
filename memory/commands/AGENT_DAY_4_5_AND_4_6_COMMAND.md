# Agent Mode Day 4.5 + 4.6 통합 명령서

> 사장님 첫 메디트래커 테스트 결과 발견 2가지 누락 → 긴급 보강

---

## 배경 (왜 하는가)

사장님이 메디트래커(2726cfe5) 직접 테스트 → 2가지 발견:

### 발견 1: 코드만 생성, 실제 작동 X
- 페이지 6개 + 컴포넌트 깔끔하게 빌드 성공
- 하지만 Supabase 연결 X (목업 데이터만)
- 배포 X (사용자가 볼 URL 없음)
- Agent가 "Supabase 붙일까요?" 추가 질문 = 사장님 룰 위반

### 발견 2: 클로드 냄새 너무 강함
UI에 표시되는 것들:
- "Bash", "Write", "Read" (도구 이름)
- `ls /workspace/meditacker` (터미널 명령)
- `AGENTS.md`, `CLAUDE.md` (클로드 공식 파일)
- `mkdir`, `npx`, `npm install` (개발자 명령)

→ 사장님: "파운더리만의 AI처럼 보여야 한다"

---

## Day 4.5: Supabase 자동 + 배포 자동 (3시간)

### 작업 1: agent-tools.ts에 도구 3개 추가

```typescript
// api/src/agent-builder/agent-tools.ts

export const AGENT_TOOLS = [
  // 기존 도구들...
  
  {
    name: 'provision_supabase',
    description: '새 Supabase 프로젝트 생성 + SQL 스키마 push + .env.local 자동 생성',
    input_schema: {
      type: 'object',
      properties: {
        projectName: { type: 'string', description: '프로젝트 슬러그' },
        sqlSchema: { type: 'string', description: 'CREATE TABLE 등 SQL' },
      },
      required: ['projectName', 'sqlSchema'],
    },
  },
  {
    name: 'deploy_to_subdomain',
    description: '/tmp 앱을 /var/www/apps로 복사 + PM2 등록 + nginx 서브도메인',
    input_schema: {
      type: 'object',
      properties: {
        appSlug: { type: 'string', description: '앱 식별자 (예: meditacker)' },
      },
      required: ['appSlug'],
    },
  },
  {
    name: 'check_build',
    description: 'npm run build 실행 후 결과 반환 (성공/실패 + 에러)',
    input_schema: { type: 'object', properties: {} },
  },
];
```

### 작업 2: 도구 구현 (재활용)

```typescript
// api/src/agent-builder/agent-builder.service.ts

async executeTool(name: string, input: any, sandboxPath: string) {
  switch (name) {
    case 'provision_supabase':
      // 기존 ai.service.ts Step 2.5 로직 재활용
      // Supabase Management API 호출 → 새 프로젝트
      // SQL 실행 → 스키마 적용
      // .env.local 파일 작성 (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)
      // prompts/fixed-templates/supabase-client.ts 복사
      return { success: true, supabaseUrl, anonKey };
    
    case 'deploy_to_subdomain':
      const appSlug = input.appSlug;
      const uniqueId = nanoid(6);
      const fullSlug = `${appSlug}-${uniqueId}`;
      
      // 1. /tmp/foundry-agent-.../ → /var/www/apps/${fullSlug}/ 복사
      await execSync(`cp -r ${sandboxPath}/${appSlug} /var/www/apps/${fullSlug}`);
      
      // 2. 빈 포트 찾기 (3500부터 +1씩)
      const port = await findFreePort(3500);
      
      // 3. PM2 등록
      await execSync(`cd /var/www/apps/${fullSlug} && PORT=${port} pm2 start npm --name "agent-${fullSlug}" -- start`);
      
      // 4. nginx 동적 서브도메인 (와일드카드 *.foundry.ai.kr 가정)
      // /etc/nginx/sites-enabled/agent-apps.conf 에 location 추가
      // 또는 와일드카드 한 번 설정해두고 PORT만 매핑
      
      const previewUrl = `https://${fullSlug}.foundry.ai.kr`;
      return { success: true, previewUrl, port };
    
    case 'check_build':
      const { stdout, stderr } = await execAsync('npm run build', { cwd: sandboxPath });
      return { success: !stderr.includes('error'), output: stdout };
  }
}
```

### 작업 3: 기존 파운더리 코드 import

```typescript
// 기존 ai.service.ts Step 2.5 함수 추출
import { provisionSupabaseProject } from '../ai/supabase-provisioning.service';
import { registerSubdomain } from '../projects/subdomain.service';
```

(없으면 신규 작성. 기존 동작 코드 참조)

### 작업 4: agent-core.md 보강

`api/src/ai/prompts/agent/agent-core.md`에 추가:

```markdown
## 작업 완료 정의 (전부 자동)

다음 5개를 모두 완료해야 "끝":
1. 페이지 + 컴포넌트 생성 (Write 도구)
2. 빌드 검증 (check_build 도구)
3. Supabase 자동 생성 + 연결 (provision_supabase 도구)
4. 서버 배포 (deploy_to_subdomain 도구)
5. 사용자에게 작동 URL 전달

⛔ 절대 금지
- "Supabase 붙여드릴까요?" 같은 추가 질문
- "DB 연결 어떻게 할까요?" 같은 옵션 제시
- 답지 받은 후 사용자에게 묻기 (작업만)
- 빌드만 하고 멈추기 (배포까지 필수)

✅ 완료 메시지 형식 (반드시 이렇게)
"✅ {앱이름} 완성됐어요!
🔗 https://{slug}.foundry.ai.kr
👤 회원가입하시면 데이터가 저장됩니다.
추가로 수정할 부분 있으세요? (예: 색깔, 페이지 추가 등)"
```

### 작업 5: 환경변수 추가

```bash
# .env (서버)
AGENT_SUPABASE_AUTO=true
AGENT_DEPLOY_AUTO=true
AGENT_SUBDOMAIN_BASE=foundry.ai.kr
AGENT_DEPLOY_DIR=/var/www/apps
```

---

## Day 4.6: Foundry AI 브랜딩 (2시간)

### 작업 6: event-translator.service.ts 신규

```typescript
// api/src/agent-builder/event-translator.service.ts

export const STAGES = [
  { id: 'intent',   label: '의도 파악',     emoji: '💭' },
  { id: 'setup',    label: '프로젝트 초기화', emoji: '⚙️' },
  { id: 'design',   label: '디자인 시스템',   emoji: '🎨' },
  { id: 'pages',    label: '페이지 작성',     emoji: '📄' },
  { id: 'verify',   label: '빌드 검증',       emoji: '🏗' },
  { id: 'database', label: '데이터베이스 연결', emoji: '🔌' },
  { id: 'deploy',   label: '서버 배포',       emoji: '🚀' },
];

@Injectable()
export class EventTranslatorService {
  translate(raw: { tool: string; input: any }): UserEvent | null {
    if (raw.tool === 'bash') {
      const cmd = raw.input.command || '';
      if (/create-next-app/.test(cmd))   return { stage: 'setup', label: '프로젝트 초기화 중', emoji: '⚙️' };
      if (/npm install/.test(cmd))       return { stage: 'setup', label: '필수 라이브러리 설치 중', emoji: '📦' };
      if (/npm run build/.test(cmd))     return { stage: 'verify', label: '빌드 검증 중', emoji: '🏗' };
      // 내부 명령은 사용자에게 안 보임
      if (/^(ls|cat|mkdir|cd|echo|pwd|find|grep)\b/.test(cmd)) return null;
    }
    
    if (raw.tool === 'write') {
      const path = raw.input.path || '';
      // 페이지
      if (path.endsWith('/app/page.tsx'))     return { stage: 'pages', label: '🏠 홈 페이지 디자인 중', emoji: '🏠' };
      if (path.includes('dashboard'))          return { stage: 'pages', label: '📊 대시보드 만드는 중', emoji: '📊' };
      if (path.includes('medications'))        return { stage: 'pages', label: '💊 복약 관리 페이지', emoji: '💊' };
      if (path.includes('health-metrics'))     return { stage: 'pages', label: '📈 건강 지표 페이지', emoji: '📈' };
      if (path.includes('appointments'))       return { stage: 'pages', label: '📅 예약 페이지', emoji: '📅' };
      if (path.includes('medical-records'))    return { stage: 'pages', label: '📋 진료 기록 페이지', emoji: '📋' };
      if (path.includes('providers'))          return { stage: 'pages', label: '👨‍⚕️ 의료진 연동 페이지', emoji: '👨‍⚕️' };
      // 디자인
      if (path.includes('components/ui/'))     return { stage: 'design', label: '🎨 디자인 컴포넌트', emoji: '🎨' };
      if (path.includes('components/layout/')) return { stage: 'design', label: '🧩 레이아웃 만들기', emoji: '🧩' };
      // 내부 (mock-data, types, utils, lib)
      if (path.includes('lib/') || path.endsWith('.ts') && !path.endsWith('.tsx')) return null;
      // 일반 페이지
      if (path.includes('/app/')) return { stage: 'pages', label: '📄 페이지 작성 중', emoji: '📄' };
    }
    
    if (raw.tool === 'provision_supabase') return { stage: 'database', label: '🔌 데이터베이스 자동 생성 중', emoji: '🔌' };
    if (raw.tool === 'deploy_to_subdomain') return { stage: 'deploy', label: '🚀 서버에 배포 중', emoji: '🚀' };
    if (raw.tool === 'check_build')         return { stage: 'verify', label: '🏗 빌드 검증 중', emoji: '🏗' };
    if (raw.tool === 'ask_user')            return { stage: 'intent', label: '💭 답지 확인 중', emoji: '💭' };
    
    // Read/Glob/Grep — 사용자 안 보임
    return null;
  }
  
  // Bash output에서 클로드/AGENTS.md 흔적 필터
  sanitizeOutput(output: string): string {
    return output
      .split('\n')
      .filter(line => !/(AGENTS\.md|CLAUDE\.md|\.claude\/)/i.test(line))
      .join('\n');
  }
}
```

### 작업 7: stream-event.types.ts 확장

```typescript
type StreamEvent = 
  | { type: 'foundry_progress'; stage: string; label: string; emoji: string; percent: number }
  | { type: 'dev_log'; raw: any }  // 개발자 모드용
  | { type: 'card_request'; ... }  // 기존
  | { type: 'complete'; previewUrl: string; ... }
  | ...
```

### 작업 8: agent-builder.service.ts 통합

```typescript
// 매 tool_use 발생 시:
const userEvent = translator.translate(raw);
if (userEvent) {
  emit({ type: 'foundry_progress', ...userEvent, percent: calcProgress() });
}
emit({ type: 'dev_log', raw });  // 개발자 모드
```

### 작업 9: FoundryProgress.tsx 신규

```tsx
// web/src/app/builder/agent/components/FoundryProgress.tsx

const STAGES = [/* 위와 동일 */];

export function FoundryProgress({ stages, currentStage, currentLabel, percent, elapsed }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🚀 Foundry AI 작업 중</h2>
        <span className="text-sm text-gray-500">{elapsed}</span>
      </div>
      
      {/* 전체 진행률 */}
      <div className="h-2 bg-gray-200 rounded-full mb-6">
        <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
      
      {/* 단계별 타임라인 */}
      <div className="space-y-3">
        {STAGES.map(s => {
          const status = s.id === currentStage ? 'active' : 
                         stages.completed.includes(s.id) ? 'done' : 'pending';
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-xl">
                {status === 'done' ? '✅' : status === 'active' ? s.emoji : '⏳'}
              </span>
              <div className="flex-1">
                <div className="font-semibold">{s.label}</div>
                {s.id === currentStage && currentLabel && (
                  <div className="text-sm text-gray-500">{currentLabel}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 작업 10: AgentChat.tsx 수정

- `tool_call` 이벤트 직접 렌더링 X
- `foundry_progress` 이벤트만 FoundryProgress 컴포넌트로
- `dev_log` 이벤트는 details 안에서만 (개발자 모드)

```tsx
{events.filter(e => e.type === 'foundry_progress').length > 0 && (
  <FoundryProgress {...latestProgress} />
)}

<details>
  <summary className="text-xs text-gray-400 cursor-pointer mt-4">
    ▼ Foundry AI 작업 로그 (개발자 모드)
  </summary>
  <DevLog events={events.filter(e => e.type === 'dev_log')} />
</details>
```

---

## 검증 (사장님 재테스트)

명탐정이 모든 작업 완료 후 사장님이 동일 답지(메디트래커)로 재실행:

| 검증 항목 | 통과 기준 |
|---|---|
| 작동 URL | ✅ https://meditacker-xxx.foundry.ai.kr 접속 가능 |
| Supabase 연결 | ✅ 회원가입/로그인 작동 |
| 데이터 저장 | ✅ 새로고침해도 데이터 유지 |
| 클로드 냄새 | ✅ "Bash", "Write", "ls", "AGENTS.md" 등 0건 |
| Foundry 단계 | ✅ "Foundry AI 작업 중" + 7단계 표시 |
| 추가 질문 | ✅ Agent가 답지 후 사용자에게 0회 묻기 |
| Day별 commit | ✅ Day 4.5와 4.6 별도 commit (2개) |

---

## 비용 예산

| 작업 | 예상 비용 |
|---|---|
| Day 4.5 도구 구현 (LLM 호출 X) | $0 |
| Day 4.5 단위 테스트 (Supabase 1회 + 배포 1회) | $0 |
| Day 4.6 변환 레이어 (LLM 호출 X) | $0 |
| Day 4.6 UI 컴포넌트 (LLM 호출 X) | $0 |
| 메디트래커 v2 재실행 (E2E) | $1~2 |
| **총** | **$1~2** |

---

## 진행 순서

```
1. agent-tools.ts에 도구 3개 추가 (15분)
2. provision_supabase 구현 + 단위 테스트 (45분)
3. deploy_to_subdomain 구현 + 단위 테스트 (45분)
4. check_build 구현 (15분)
5. agent-core.md 보강 (15분)
6. tsc + commit "Day 4.5 — Supabase + 배포 자동화" (10분)
7. event-translator.service.ts 작성 (30분)
8. stream-event.types.ts 확장 (10분)
9. FoundryProgress.tsx + AgentChat 수정 (45분)
10. tsc + commit "Day 4.6 — Foundry AI 브랜딩" (10분)
11. 자비스에게 보고 + 사장님 승인 대기
12. 사장님 메디트래커 재실행 → 검증
```

총 예상: **3.5~4시간** (자비스 기준 / 명탐정 페이스면 1~2시간)

---

## 작업 시작 명령 (사장님이 명탐정 새 세션에 던질 것)

```
파운더리 Agent Mode Day 4.5 + 4.6 작업 시작.

먼저 읽기:
1. memory/commands/AGENT_DAY_4_5_AND_4_6_COMMAND.md ⭐ (이게 마스터)
2. memory/phases/260418_AGENT_MODE_PLAN.md § Day 4.5 + 4.6 부분

작업 순서: 위 명령서 § "진행 순서" 1~12번 그대로.

원칙:
✓ Day 4.5 commit + Day 4.6 commit 분리 (2개)
✓ 격리: agent-builder/ 와 prompts/agent/만 손대기
✓ 검증 게이트 7개 모두 통과 후 사장님께 보고
✓ "절대" 단어 사용 금지

GO!
```
