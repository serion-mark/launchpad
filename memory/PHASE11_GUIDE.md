# Phase 11: 프로 기능 — 개발 가이드 (4/14~4/28)

> 이 Phase 완료 시 마일스톤: "돈 받을 수 있는 제품" + 유료 고객 1호

---

## 빌더 UX 개선 (Phase 10에서 이관)

### 앱 생성 진행률 표시
**현재 문제**: "페이지 생성 중... (3개 완료)"만 보임 → 전체 몇 개인지, 얼마나 남았는지 모름

**개선안**:
```
현재: ● 페이지 생성 중... (3개 완료)              17개 파일

개선: ● 페이지 생성 중... (3/6 완료)  50%         17개 파일
     ████████████░░░░░░░░░░  예상 2~3분 남음
```

**구현**:
- `builder/page.tsx` 하단 상태바에 프로그레스 바 추가
- SSE `progress` 이벤트에서 `totalFiles` 값 활용 → 퍼센트 계산
- 예상 시간: 파일당 평균 생성 시간 × 남은 파일 수
- 단계별 표시: "아키텍처 설계 중" → "DB 스키마 생성 중" → "페이지 생성 중 (3/6)" → "빌드 중" → "배포 중"

### AI 모델 미선택 시 생성 멈춤 버그
**현재 문제**: AI 모델을 선택하지 않으면 생성이 시작되지 않는데, 사용자에게 아무 안내 없음. 우측에 "AI가 앱을 생성하고 있습니다"만 보이고 단계 목록 전부 회색으로 멈춰있음.

**개선안 (모델 선택 UI 제거 — 확정)**:
- 사용자에게 모델 선택을 맡기지 않음. 혼란+이탈 원인
- 무조건 Smart(Sonnet) 고정 사용 → 품질 보장
- 상단 Flash/Smart 드롭다운 제거
- 내부적으로만 모델 결정 (크레딧 패키지에 비용 포함)
- Lovable도 사용자에게 모델 선택 안 시킴 — "잘 만들어주는 것"이 전부

**파일**:
- `web/src/app/builder/page.tsx` — 모델 선택 UI 제거, `model` 기본값 'smart' 고정
- `api/src/ai/ai.service.ts` — 모델 파라미터 기본값 처리

---

## Week 1: 결제 + 호스팅 MRR

### 결제 실연동

**현재 상태**:
- 토스페이먼츠 빌링 가입 완료 (MID: bill_serioi8u1)
- 프론트: credits/page.tsx에 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 환경변수 준비됨
- 심사 완료 후 테스트키 → 실키 교체만 하면 됨

**작업**:
1. 프로덕션 .env에 실제 Toss Client Key 설정
2. 결제 성공 콜백 (`/credits/success`) → 크레딧 충전 API 호출 → DB 반영
3. 결제 실패/취소 처리
4. 세금계산서 발행 연동 (토스페이먼츠 API 또는 팝빌 연동)
   - 정부사업비 정산에 세금계산서 필수!
   - `POST /billing/invoice` → 세금계산서 자동 발행

**파일**:
- `web/src/app/credits/page.tsx` — 결제 UI (이미 있음)
- `web/src/app/credits/success/page.tsx` — 결제 성공 콜백 (있으면 확인, 없으면 생성)
- `api/src/credit/credit.service.ts` — charge 메서드에 실결제 검증 로직

### 호스팅 월 과금 (MRR — 이게 진짜 돈)

**비즈니스 모델**:
```
크레딧: 일회성 매출 (앱 생성/수정)
호스팅: 월 반복 매출 MRR (앱이 살아있는 한 계속)

호스팅 가격안:
- 무료: foundry.ai.kr 서브도메인, 월 1,000 방문자 제한
- Basic ₩9,900/월: 무제한 방문자
- Pro ₩29,900/월: 커스텀 도메인 안내 + 우선 지원
```

**구현**:

1. **DB 스키마 추가** (schema.prisma):
```prisma
model Hosting {
  id          String   @id @default(cuid())
  projectId   String   @unique
  project     Project  @relation(fields: [projectId], references: [id])
  plan        HostingPlan @default(FREE)
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
}
enum HostingPlan { FREE BASIC PRO }
```

2. **방문자 대시보드**:
- nginx 로그 파싱 또는 간단한 카운터 (앱에 analytics 스크립트 주입)
- `GET /projects/:id/analytics` → 일별/주별 방문자 수
- dashboard에 차트로 표시

3. **무료 방문자 제한**:
- nginx에서 서브도메인별 rate limit
- 또는 앱에 주입되는 analytics 스크립트에서 카운트 → 초과 시 "업그레이드" 페이지

---

## Week 2: AI 이미지 생성 + 대시보드

### AI 이미지 생성

**1순위: Gemini API (Imagen 3)**
```typescript
// api/src/ai/image.service.ts (새 파일)
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  async generateImage(prompt: string, style?: string): Promise<string> {
    // Gemini API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/imagen-3:generateImage`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${prompt}. Style: ${style || 'modern, clean, professional'}`,
          // 옵션: 사이즈, 포맷 등
        }),
      }
    );
    // 이미지 → Supabase Storage 업로드 → URL 반환
    const imageBuffer = await response.arrayBuffer();
    const url = await this.uploadToStorage(imageBuffer);
    return url;
  }
}
```

**프론트 연동**:
- 빌더 채팅에서 "로고 만들어줘" 감지 → ImageService 호출
- 생성된 이미지 → 미리보기에 즉시 반영
- 이미지 선택/재생성 UI

**비용 관리**:
- 이미지 1장 = 크레딧 200cr (시장가 대비 저렴하게)
- Gemini API 비용이 너무 비싸면 → Flux (오픈소스) 셀프호스팅으로 대체

### 앱별 방문자 대시보드

**파일**: `web/src/app/dashboard/page.tsx` (기존 대시보드에 추가)

각 프로젝트 카드에 표시:
```
┌─────────────────────────────────────┐
│ 🛒 스마트팜 직거래                    │
│ https://smartfarm-xxxx.foundry.ai.kr │
│                                      │
│ 📊 이번 주: 142명 방문 (+23%)        │
│ 📈 [미니 차트 ─╱──╲─╱]              │
│                                      │
│ [빌더 열기]  [배포 URL]  [분석 보기]  │
└─────────────────────────────────────┘
```

---

## AI 회의실 (/meeting) — Foundry 킬러 기능

> 원래 독립 서비스(플랜 C)로 기획했으나, 브레인스토밍 중
> "이거 Foundry에 넣으면?" 인사이트로 내장 기능으로 전환.
> 결과: 추가 서버/도메인 0원, 고객·크레딧 공유, Lovable 차별점 확보.

### 개요
GenSpark 스타일의 멀티 AI 브레인스토밍 기능.
하나의 주제에 대해 AI 3개가 각자 관점으로 분석하고 서로 토론.

### 메뉴 구조
```
사이드바:
🏠 홈
🧠 AI 회의실 ← NEW
🚀 앱 만들기
🔨 내 프로젝트
💰 크레딧
📚 가이드
```

### 2단계 요금제

**⚡ 스탠다드 회의 (300cr)**
- Claude Sonnet + GPT-4o + Gemini Pro
- 빠른 분석, 일반 브레인스토밍에 적합
- 응답: ~15초

**🔥 프리미엄 회의 (1,500cr)**
- Claude Opus + GPT-o3 + Gemini Ultra
- 최고급 AI 3개가 진지하게 토론
- 사업계획서 평가, 중요한 결정에 추천
- "비쌈... 그치만 정확함"
- 응답: ~45초

### AI 역할 (페르소나)
```
🔵 전략가 (Claude): 기술+전략 관점, 실행 가능성 중심
🟢 분석가 (GPT): 시장+비즈니스 관점, 데이터 중심
🔴 비평가 (Gemini): 리스크+반론 관점, 약점 집중 공격
```

### 핑퐁 로직 — 순차 누적형 (핵심 구현)

> 병렬(3개 동시)이 아닌 **순차 누적형** 채택 — 대표 실사용 검증.
> 이유: 뒤로 갈수록 앞의 분석을 기반으로 새 관점만 추가 → 분석이 점점 깊어짐.
> 병렬은 같은 깊이에서 시작하므로 관점이 겹칠 수 있음.

```
핵심 로직 (순차 누적):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1: 브리핑 생성 (Haiku — 저렴)
   [원본 파일/주제] → 핵심 요약 + 분석 포인트 추출
   = AI들이 읽을 "브리핑 문서"

Phase 2: 순차 누적 분석 (메인)
   GPT:    [브리핑]만 읽고 → 1차 분석
   Gemini: [브리핑] + [GPT 분석] 읽고 → 공감/반박/추가 제안
   Claude: [브리핑] + [GPT] + [Gemini] 전부 읽고 → 종합 평가

Phase 3: 쟁점 핑퐁 (프리미엄만)
   의견 갈린 부분만 추출 → 2~3회 추가 토론

Phase 4: 종합 보고서 (Haiku — 저렴)
   전체 내용 → 깔끔한 보고서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```typescript
// api/src/ai/meeting.service.ts (새 파일)
@Injectable()
export class MeetingService {
  async *runMeeting(
    topic: string,
    file: string | null,  // 원본 파일 (사업계획서 등)
    tier: 'standard' | 'premium'
  ): AsyncGenerator<MeetingEvent> {
    const models = tier === 'standard'
      ? { claude: 'sonnet', gpt: '4o', gemini: 'pro' }
      : { claude: 'opus', gpt: 'o3', gemini: 'ultra' };

    // Phase 1: 브리핑 생성 (Haiku — 저렴)
    const briefing = await this.callClaude(
      `다음 주제/파일의 핵심을 요약하고 분석 포인트를 추출하세요:\n\n주제: ${topic}\n${file || ''}`,
      'briefing', 'haiku'
    );
    yield { phase: 'briefing', content: briefing };

    // Phase 2-1: GPT가 먼저 (브리핑만 읽고 분석)
    const gptAnalysis = await this.callGPT(
      `[분석 브리핑]\n${briefing}\n\n시장 분석가로서 분석하세요: 시장성, 경쟁력, 수익 모델, 데이터 근거`,
      '시장 분석가', models.gpt
    );
    yield { phase: 'analysis', ai: 'GPT', content: gptAnalysis };

    // Phase 2-2: Gemini (브리핑 + GPT 분석 둘 다 읽고)
    const geminiAnalysis = await this.callGemini(
      `[분석 브리핑]\n${briefing}\n\n[GPT 시장 분석가의 분석]\n${gptAnalysis}\n\n데이터 분석가로서: GPT 분석에 공감하는 부분과 반박할 부분을 구분하고, GPT가 놓친 관점을 추가 제안하세요.`,
      '데이터 분석가', models.gemini
    );
    yield { phase: 'analysis', ai: 'Gemini', content: geminiAnalysis };

    // Phase 2-3: Claude (브리핑 + GPT + Gemini 전부 읽고 종합)
    const claudeAnalysis = await this.callClaude(
      `[분석 브리핑]\n${briefing}\n\n[GPT 시장 분석가]\n${gptAnalysis}\n\n[Gemini 데이터 분석가]\n${geminiAnalysis}\n\n전략 종합가로서: 두 AI의 분석을 종합 평가하세요. 동의/반박 구분, 빠진 관점 추가, 최종 실행 제안.`,
      '전략 종합가', models.claude
    );
    yield { phase: 'analysis', ai: 'Claude', content: claudeAnalysis };

    // Phase 3: 쟁점 핑퐁 (프리미엄만)
    if (tier === 'premium') {
      const disputes = await this.callClaude(
        `다음 3개 분석에서 의견이 갈리는 핵심 쟁점을 1~3개 추출하세요:\n\nGPT: ${gptAnalysis}\nGemini: ${geminiAnalysis}\nClaude: ${claudeAnalysis}\n\nJSON 배열로 반환: ["쟁점1", "쟁점2"]`,
        'dispute-finder', 'haiku'
      );

      const disputeList = JSON.parse(disputes);
      for (const dispute of disputeList) {
        const gptRebuttal = await this.callGPT(
          `쟁점: "${dispute}"\n\nGemini는 이렇게 말했고: ${geminiAnalysis}\nClaude는 이렇게 말했습니다: ${claudeAnalysis}\n\n당신의 추가 반론 또는 수정된 의견을 제시하세요.`,
          '시장 분석가', models.gpt
        );
        const geminiRebuttal = await this.callGemini(
          `쟁점: "${dispute}"\nGPT 추가 반론: ${gptRebuttal}\n\n데이터로 검증하고 최종 의견을 제시하세요.`,
          '데이터 분석가', models.gemini
        );
        yield { phase: 'debate', dispute, responses: [gptRebuttal, geminiRebuttal] };
      }
    }

    // Phase 4: 종합 보고서 (Haiku — 저렴하게 요약)
    const report = await this.callClaude(
      `다음 AI 회의 전체 내용을 종합 보고서로 정리하세요:\n\n주제: ${topic}\nGPT 분석: ${gptAnalysis}\nGemini 분석: ${geminiAnalysis}\nClaude 분석: ${claudeAnalysis}\n${tier === 'premium' ? '추가 토론 내용 포함' : ''}\n\n형식: 요약(3줄) → 주요 발견 → 리스크 → 액션아이템`,
      'report', 'haiku'
    );
    yield { phase: 'report', content: report };
  }
}
```
    yield { round: 2, type: 'debate', responses: [debate1, debate2] };

    // Round 3: 종합 보고서 (Haiku — 저렴하게 요약)
    const summary = await this.callClaude(
      `Round 1,2 전체 내용을 종합 보고서로 정리:\n${allResponses}`,
      '종합', 'haiku'
    );
    yield { round: 3, type: 'summary', report: summary };
  }
}
```

### 빠른 시작 프리셋
```
/meeting 페이지 하단:
[📋 사업계획서 평가]  → PDF 업로드 → 3개 AI가 점수+피드백
[📊 시장 분석]       → 주제 입력 → 시장규모/경쟁/트렌드
[💡 아이디어 검증]   → 아이디어 → 실현가능성/차별점/리스크
[🎤 IR 피드백]      → 발표자료 → 투자자 관점 평가
[⚔️ 경쟁사 분석]    → 경쟁사명 → 강점/약점/차별화 전략
[🆓 자유 주제]      → 아무 주제나 AI 3개 토론
```

### "이걸로 앱 만들기" 연결
```
종합 보고서 하단:
[📥 보고서 저장]  [🚀 이 분석으로 앱 만들기]
                        ↓
              /start로 이동 + 분석 결과가 컨텍스트로 자동 주입
              → AI가 시장 데이터 기반으로 설계
              → 품질 3배 향상 (대표 비법 자동화)
```

### 앱 생성 플로우 스마트 분석 (대표 비법 자동화)
```
질문지 완료 후:
┌─────────────────────────────────────┐
│ 🧠 AI 스마트 분석 (추천)             │
│                                     │
│ 앱 생성 전에 AI 3개가 자동으로:       │
│ ✅ 시장 조사 (Gemini)               │
│ ✅ 벤치마크 (GPT)                   │
│ ✅ 설계 최적화 (Claude)              │
│                                     │
│ 스탠다드: 200cr / 프리미엄: 1,000cr  │
│                                     │
│ [🧠 스마트 분석 후 생성]             │
│ [⚡ 바로 생성 (건너뛰기)]            │
└─────────────────────────────────────┘

내부 동작 (대표 비법 자동화):
Step 1: Gemini → 유사 서비스 5개 조사 + 시장 규모 (= Gemini 딥리서치)
Step 2: GPT → 유사 앱 UI 패턴 분석 (= 경쟁사 캡쳐 대체)
Step 3: Claude → Step 1+2 받아서 아키텍처 설계 (= 컨텍스트 주입)
→ 같은 프롬프트인데 결과 3배 (정보의 질이 다르니까)
```

### 전체 크레딧 소모 구조
```
기능                스탠다드    프리미엄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI 회의실            300cr     1,500cr
사업계획서 평가       500cr     2,500cr
스마트 분석           200cr     1,000cr
앱 생성             3,000cr    10,000cr
AI 수정              500cr     1,500cr
이미지 생성           200cr       200cr
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
크레딧 소모 채널 6개 → Lovable(1개) 대비 ARPU 5배+
```
