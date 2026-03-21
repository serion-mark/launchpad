# Phase 10: Lovable 핵심 기능 — 개발 가이드 (4/1~4/14)

> 이 Phase 완료 시 마일스톤: "Lovable 동급" 달성

---

## Week 1: Agent Mode + Chat Mode 고도화

### Agent Mode (자율 수정)

**현재 상태**: F6 빌드 에러 자동수정 루프가 원형 (deploy.service.ts aiBuildFix)
**목표**: 빌드 에러뿐 아니라 모든 종류의 문제를 자율적으로 해결

**구현 방법**:

새 파일: `api/src/ai/agent.service.ts`
```typescript
@Injectable()
export class AgentService {
  // Agent가 자율적으로 수행하는 작업 루프
  async runAgent(projectId: string, task: string): Promise<AgentResult> {
    const maxSteps = 10;
    const context: AgentContext = { steps: [], files: {} };

    for (let i = 0; i < maxSteps; i++) {
      // 1. 현재 상황 분석 (코드베이스 읽기)
      const analysis = await this.analyzeContext(projectId, task, context);

      // 2. 다음 행동 결정
      const action = await this.decideAction(analysis);
      // action 종류: 'read_file' | 'modify_file' | 'search_web' | 'run_build' | 'done'

      // 3. 행동 실행
      switch (action.type) {
        case 'read_file':
          context.files[action.path] = await this.readProjectFile(projectId, action.path);
          break;
        case 'modify_file':
          await this.modifyProjectFile(projectId, action.path, action.content);
          break;
        case 'search_web':
          context.webResults = await this.searchWeb(action.query);
          break;
        case 'run_build':
          const result = await this.deployService.testBuild(projectId);
          context.buildResult = result;
          break;
        case 'done':
          return { success: true, steps: context.steps };
      }

      context.steps.push({ step: i + 1, action, result: '...' });
    }

    return { success: false, steps: context.steps, reason: 'max_steps_reached' };
  }
}
```

**AI 프롬프트 (Agent용)**:
```
당신은 Foundry Agent입니다. 사용자의 앱에서 발생한 문제를 자율적으로 해결합니다.

가능한 행동:
1. read_file(path) — 프로젝트 파일 읽기
2. modify_file(path, content) — 파일 수정
3. search_web(query) — 웹에서 해결법 검색
4. run_build() — 빌드 테스트
5. done() — 작업 완료

현재 상황: {context}
사용자 요청: {task}

다음 행동을 JSON으로 반환:
{ "type": "read_file", "path": "app/page.tsx", "reason": "에러가 이 파일에서 발생" }
```

**프론트엔드 UI** (`web/src/app/builder/page.tsx`):
- Agent 실행 중 → 각 단계를 실시간 표시
- "파일 분석 중..." → "문제 발견" → "수정 중..." → "빌드 테스트..." → "완료!"
- SSE로 각 단계 스트리밍

### Chat Mode 고도화

**현재 상태**: 단순 수정 요청 → AI가 바로 코드 수정
**목표**: 맥락을 이해하고 확인 질문을 하는 대화형 개발

**구현 방법**:
**파일**: `api/src/ai/ai.service.ts` (chat 메서드)

1. 대화 히스토리를 프로젝트 단위로 DB에 저장 (현재 chatHistory는 프론트에서만 관리)
2. AI에게 "코드베이스 컨텍스트" 주입:
```
현재 프로젝트 파일 목록: ${fileList}
현재 아키텍처: ${architecture}
이전 대화: ${chatHistory}

사용자가 모호한 요청을 하면, 바로 코드를 수정하지 말고 먼저 확인 질문을 하세요.
예: "차트 추가해줘" → "어떤 형태의 차트를 원하시나요? 바차트, 라인차트, 파이차트?"
```

3. AI 응답 파싱:
- `[QUESTION]`: 사용자에게 질문 → 채팅 UI에 표시
- `[CODE_CHANGE]`: 코드 수정 → 빌드 → 미리보기 갱신
- `[EXPLANATION]`: 설명만 → 채팅 UI에 표시

---

## Week 2: Visual Edits + GitHub 연동 + 빌드 95%

### Visual Edits (미리보기 클릭 → 수정)

**목표**: 미리보기에서 UI 요소를 클릭하면 해당 컴포넌트를 수정할 수 있는 UI

**구현 방법**:

1. **LivePreview iframe에 클릭 인터셉터 주입**:
`web/src/app/builder/components/LivePreview.tsx`
```typescript
// iframe 로드 후 모든 요소에 클릭 이벤트 주입
const injectClickHandler = () => {
  const iframeDoc = iframeRef.current?.contentDocument;
  if (!iframeDoc) return;

  iframeDoc.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement;

    // 요소 정보 추출
    const elementInfo = {
      tagName: target.tagName,
      className: target.className,
      textContent: target.textContent?.slice(0, 50),
      // 가장 가까운 data-component 속성 찾기
      component: target.closest('[data-component]')?.getAttribute('data-component'),
    };

    // 부모 컴포넌트에 전달
    window.parent.postMessage({ type: 'element-clicked', element: elementInfo }, '*');
  });

  // 호버 시 하이라이트 (파란색 아웃라인)
  iframeDoc.addEventListener('mouseover', (e) => {
    (e.target as HTMLElement).style.outline = '2px solid #3182f6';
  });
  iframeDoc.addEventListener('mouseout', (e) => {
    (e.target as HTMLElement).style.outline = '';
  });
};
```

2. **클릭 시 수정 팝업**:
`web/src/app/builder/components/VisualEditPopup.tsx` (새 파일)
```
요소를 클릭하면 팝업:
┌──────────────────────────────┐
│ <button> "시작하기"           │
│                              │
│ 텍스트: [시작하기        ]    │
│ 배경색: [🔵 #3182f6    ]    │
│ 크기:   [중간 ▼        ]    │
│                              │
│ [AI에게 수정 요청]  [직접 수정] │
└──────────────────────────────┘
```

3. **수정 실행**:
- "AI에게 수정 요청" → modify-files API 호출 (해당 컴포넌트만)
- "직접 수정" → 프론트에서 즉시 CSS 변경 → 코드에 반영

4. **AI 생성 코드에 data-component 속성 자동 삽입**:
AI 프롬프트에 규칙 추가:
```
모든 주요 컴포넌트에 data-component 속성을 추가하세요.
예: <header data-component="Header">, <button data-component="CTAButton">
이것은 Visual Editor에서 클릭 수정을 위해 필요합니다.
```

### GitHub 연동

**구현 방법**:

1. **GitHub OAuth 추가**:
`api/src/auth/auth.controller.ts`에 GitHub OAuth 엔드포인트 추가
- 카카오 OAuth와 동일 패턴 (이미 있으므로 복사)
- GitHub App 생성 필요 (github.com/settings/developers)

2. **프로젝트 → GitHub repo push**:
`api/src/project/github.service.ts` (새 파일)
```typescript
async pushToGitHub(projectId: string, userId: string) {
  // 1. 사용자의 GitHub 토큰 가져오기
  // 2. 새 repo 생성 (octokit API)
  // 3. generatedCode → 파일별 커밋
  // 4. repo URL 반환
}
```

3. **수정 시 자동 커밋**:
modify-files 완료 후 → GitHub에 자동 커밋+push
커밋 메시지: `feat: ${userMessage}` (사용자 요청을 커밋 메시지로)

### 빌드 성공률 95%+

Phase 9에서 80~90% 달성 후 추가:
- **AST 파싱**: 생성 코드를 AST로 파싱하여 문법 오류 사전 감지
  - `@babel/parser` 또는 `typescript` 컴파일러 API 사용
- **TS 사전 컴파일**: `tsc --noEmit`을 빌드 전에 실행하여 타입 에러 선검출
- **Fallback UI**: 빌드 실패해도 에러 화면 대신 → "자동 수정 중..." 표시 → Agent Mode 자동 실행

---

## 프로젝트 메모리 시스템 (세리온 MEMORY.md 패턴 적용)

### 왜 필요한가
대표가 Claude와 MEMORY.md로 세션 간 컨텍스트를 유지하는 것처럼,
Foundry 고객도 다시 접속했을 때 AI가 이전 작업을 기억해야 한다.
이것이 "도구"와 "동업자"의 차이.

### DB 스키마
```prisma
model ProjectMemory {
  id            String   @id @default(cuid())
  projectId     String   @unique
  project       Project  @relation(fields: [projectId], references: [id])
  marketData    Json?    // 스마트 분석: 시장 조사 결과
  benchmarkData Json?    // 스마트 분석: 벤치마크 결과
  chatSummary   String?  // 대화 요약 (Haiku가 매 대화 후 자동 요약)
  preferences   Json?    // 사용자 선호 자동 학습 { style, priority, tone }
  modHistory    Json?    // 수정 히스토리 [{version, change, date}]
  updatedAt     DateTime @updatedAt
}

model UserMemory {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  designPref    Json?    // 색상/폰트/레이아웃 선호 (모든 프로젝트 공통)
  domain        String?  // 업종/분야 ("반려동물", "교육" 등)
  meetingSummary String? // AI 회의실 히스토리 요약
  updatedAt     DateTime @updatedAt
}
```

### 메모리 자동 업데이트 로직
```
매 대화 끝 (자동):
1. Haiku에게 "이 대화에서 기억할 것 3줄 요약" 요청 (비용: ~$0.0005)
2. 기존 ProjectMemory.chatSummary + 새 요약 병합
3. 사용자 선호 자동 감지 ("파란색으로 바꿔줘" → preferences.style 업데이트)
4. DB 저장

매 대화 시작 (자동):
1. ProjectMemory + UserMemory 로드
2. AI 시스템 프롬프트에 주입:
   "이 사용자의 프로젝트: 펫돌봄 매칭앱, 파란색 선호, 매칭>리뷰>결제 우선순위.
    지난 분석: 동네 기반이 핵심. 이 맥락으로 대화하세요."
```

### 적용 범위
- 빌더 채팅: "아까 말한 기능" → AI가 기억
- AI 회의실: 이전 분석 결과 이어서 진행
- 스마트 분석: 2번째 앱 만들 때 첫 앱 경험 참고
- 사업계획서 평가: 이전 평가 대비 개선점 집중 분석
