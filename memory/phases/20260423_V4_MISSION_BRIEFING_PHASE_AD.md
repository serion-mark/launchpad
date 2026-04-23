# 🎯 V4 Mission Briefing — Phase AD 완전 명령서

> **작성**: 2026-04-23 (V3 후속 세션에서 작성, V4 에게 넘김)
> **읽는 자**: 다음 자비스 세션 (V4)
> **목적**: V4 가 Phase AD 를 **맥락 + 원칙 + 상세 순서** 완전히 이해하고 빼먹거나 삼천포 빠지지 않게 하기 위함
> **이 문서만 읽으면**: V4 는 Phase AD 를 제로 컨텍스트에서도 즉시 착수 가능

---

# 📖 1. 상황 이해 (V4, 먼저 읽어)

## 1.1 너는 누구고 무엇을 하러 왔는가

파운더리(Foundry)는 한국어 비개발자용 AI 웹앱 생성 서비스다. 2026-04-20 부터 Claude Agent SDK(이름: "포비") 로 코드 생성 엔진을 바꿨고, V3 후속 세션(4/22~23)에서 17개 Phase 배포하고 5개 실전 버그 잡았다.

**너(V4)의 Mission: Phase AD 완수.**
- Phase AD = **이미지 레퍼런스 + 충돌 채팅 + 포트폴리오 프리셋** 통합 구현
- 소요 시간: **12시간** (Step 0~11)
- 왜 V4 가 하는가: V3 후속 세션이 피로했고, Phase AD 는 정교함이 필요해서 신선한 세션에서 집중하는 게 낫다고 판단

## 1.2 지금 파운더리의 상태 (프로덕션)

```
🟢 안정 운영 중
  - 마케팅봇 app-24f7.foundry.ai.kr HTTP 200
  - 기타 라이브 앱 8개 정상
  - Phase W/X/Y/AB 배포 완료 (8a1bdbf)
  - 프롬프트: 22,512 chars (§1~§17)

🟡 사장님 자원
  - Claude API 잔액: $11.72 (추가 충전 필요)
  - 파운더리 크레딧: 10,677cr (검증용으로 추가 충전 필요)
  - 추천: V4 착수 전 Claude API $20+ 충전, 크레딧 30,000cr+ 충전
```

---

# 🚨 2. 왜 Phase AD 가 필요한가 — 맥락 스토리

## 2.1 발견된 구조적 버그

V3 후속 세션에서 Phase H/I/J/K (이미지 업로드 기능) 를 만들었지만, **실제로는 사용자 접근 불가 상태**였다.

### 원인 — 순차 개발의 저주

```
[13:06] Phase H: 이미지 업로드 UI를 AnswerSheetCard(답지카드) 내부에 만듦
  → 당시 AskUser 도구가 유일한 사용자 질문 경로라 거기에 붙임

[13:06] Phase F: skipAskUser 플래그 도입
  → /start 인터뷰 거친 유저는 AskUser 차단
  → 부작용: 답지카드 자체가 안 뜸 → 이미지 업로드 UI 도 안 뜸
  → 이 연쇄 효과 미인지

[13:41] Phase L~Q: /start 대화형 인터뷰 + ReviewStage 구축
  → ReviewStage 에 이미지 업로드 UI 추가 X (별개 기능으로 간주)

[결과]
  /start → 인터뷰 → ReviewStage → Agent 경로로 온 유저는
  구조적으로 이미지 업로드 UI 평생 못 만남.
```

### 실제 사장님 스크린샷 증거

사장님이 ReviewStage 화면 보여주시며 "지금 이미지 업로드는 없네??" 지적.  
→ 그제서야 **기능은 구현됐지만 2가지 진입 경로(/start + /meeting)에서 막혀 있음** 발견.

## 2.2 왜 지금 해결해야 하는가

1. **차별 포인트**: Lovable / Bolt / Base44 어느 경쟁사도 "이미지 레퍼런스 분석" 제대로 안 함
2. **"클로드 티" 제거**: 현재 생성되는 앱들이 모두 비슷한 파스텔 그라데이션 톤 → 차별 없음. 이미지 레퍼런스가 디자인 다양성의 핵심 수단.
3. **사용자 기대 관리**: 이미지 없이 만들면 기대치와 결과물 차이 큼 → 불만 발생
4. **MVP 타겟팅 완성도**: Phase AD 가 돌아가야 "진짜 원하는 스타일의 MVP" 약속 가능

## 2.3 이 명령서가 긴 이유

V3 후속 세션에서 자비스가 **4가지 실수** 를 했다. V4 는 이 실수를 반복하지 말 것.

### 실수 1 — 크레딧 단가 혼동
자비스가 PDF 에 "크레딧 ≒ 1원" 으로 잘못 적어서 외부 AI(Gemini/GPT) 분석이 전부 오염됨.  
**진짜 단가**: 크레딧 6~10원 / 앱 1개 생성 = 5~6만원 (외주 대비 1/100, 마진 90%+)  
**교훈**: 가격 같은 기본 팩트는 반드시 `web/src/app/credits/page.tsx` 로 확인 후 언급할 것.

### 실수 2 — 세리온 고객과 파운더리 고객 혼동
자비스가 "세리온 기존 고객 300명을 파운더리 첫 타겟으로" 제안.  
**현실**: 세리온 고객 = 미용실 원장 = 이미 세리온 POS 쓰고 있음 = 파운더리 필요 없음.  
**교훈**: 세리온과 파운더리는 **완전 별개 사업**. 섞지 말 것. 세리온은 **기술·경험 자산 (포트폴리오)** 으로만 활용.

### 실수 3 — 외부 AI 답변 무비판 수용
Gemini/GPT 의 "가격 후려치기" 진단을 그대로 받음. 사장님이 "원가에 해주라고?" 지적해서 역계산 해보니 실제 마진 90%+.  
**교훈**: 외부 AI 답변도 전제 검증 필수. 사장님이 지적하시면 무조건 다시 확인.

### 실수 4 — Phase 간 영향 분석 부재
Phase F 의 skipAskUser 가 Phase H 의 이미지 업로드 경로를 무효화시킨다는 사실 못 봄.  
**교훈**: 새 Phase 만들 때 **반드시** 기존 기능과의 상호작용 체크. "이 Phase 가 다른 Phase 의 UI 접근 경로를 막지는 않는가?"

---

# 🎯 3. Phase AD 의 4가지 절대 원칙

## 원칙 1 — 디자인 ≠ 기능 (가장 중요)

```
📸 이미지/프리셋 = "디자인만" 참조
   색상·레이아웃·타이포·컴포넌트·톤

📝 스펙 (인터뷰/회의실) = "기능·내용·로직"
   페이지·기능·DB·플로우·텍스트 내용
```

**실전 예시**:
```
사용자: "반려동물 매칭 앱" 스펙 + 네이버 메인 스크린샷 업로드

❌ 잘못된 해석: "네이버처럼 뉴스·쇼핑·웹툰 탭도 만들어야지"
✅ 올바른 해석: "네이버 녹색 + 상단 검색바 + 카드 그리드만 가져와서
                반려동물 매칭 기능을 네이버 톤으로 구현"
```

**왜 중요한가**: 사용자가 "네이버처럼" 올렸을 때 네이버 기능까지 복제하면 MVP 범위 폭증 → 실패. 반드시 디자인만.

## 원칙 2 — 감지 범위 1~6번 (7번 제외)

Claude Sonnet Vision 의 실측 한계:

```
✅ 감지 O (1~6번)
   1. 주 색상 (Primary/Secondary)        90% 정확
   2. 레이아웃 구조 (사이드바/네비 위치)    85% 정확
   3. 명확한 아이콘 (🛒 🔍 🔔)              80% 정확
   4. 텍스트 라벨 탭 (OCR)                  75% 정확
   5. 브랜드 고유 기능 요소                  60% 정확 (자동 채팅 보완)
   6. 맥락적 기능 플로우                     50% 정확 (자동 채팅 보완)

❌ 감지 X (7번 — 포기)
   7. 간격·픽셀 값 (px, rem)                40% 이하
   → Tailwind 기본값(gap-4, py-8) 사용
```

**왜 이렇게 자르는가**: 7번 (픽셀 정확도) 까지 욕심내면 "완벽 복제" 기대 생겨서 실망. 6번까지 잡고 나머지 20% 는 자동 채팅으로 사용자와 대화해 확정.

## 원칙 3 — 충돌은 룰 아닌 대화로 해결

```
❌ 기존 생각: 자동 판단 룰
   "이미지 vs 스펙 충돌 → 이미지 우선 / 스펙 우선" 로직

✅ 사장님 제안: 자동 채팅
   포비가 충돌 감지 → 사용자에게 메시지로 확인
   "네이버 이미지네요. 녹색 네비는 가져올게요. 
    뉴스 탭은 반려동물 앱이랑 안 맞아서 제외할게요. 맞죠?"
   사용자 답변 → 스펙 업데이트 or 이미지 반영 방식 조정
```

**왜 이게 차별점인가**: Lovable/Bolt 는 "알아서 만드는" 방식. 파운더리는 "대화로 확정하는" 방식 → UX 신뢰도 압도적 우위.

## 원칙 4 — 비용 사용자 무료

```
이미지 분석 Sonnet Vision = $0.02/회
  → 내부 부담 (사용자 크레딧 차감 X)
  → 월 100명 가입해도 $8 수준

프리셋 선택 = 완전 무료
```

**왜**: 진입 장벽 낮추기. 이미지·프리셋은 유입 도구니까.

---

# 📐 4. Step 별 상세 작업 순서 (12시간)

## ⭐ Step 0 — Sonnet Vision 실측 검증 (30분, 반드시 먼저)

**목적**: 원칙 2 의 1~6번 정확도가 진짜 맞는지 검증. 결과 OK 면 Step 1 착수, 아니면 프롬프트 조정.

**방법**:
```bash
# 1. 테스트 이미지 5장 준비 (웹 스크린샷)
네이버 / 인스타그램 / 배달의민족 / 토스 / 노션

# 2. Sonnet Vision 직접 호출
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{
    "model": "claude-sonnet-4-6",
    "messages": [{
      "role": "user",
      "content": [
        { "type": "image", "source": {"type": "base64", "data": "<BASE64>"} },
        { "type": "text", "text": "이 이미지 분석해서 JSON 으로:
          {
            colors: { primary, secondary, background, text },
            layout: 'top-nav|bottom-nav|sidebar|...',
            brand_tone: 'professional|casual|luxury|...',
            detected_features: [ '검색바', '장바구니', '뉴스탭', ... ],
            confidence: 0~1
          }" }
      ]
    }]
  }'

# 3. 육안 검증
- 네이버 → 녹색 #03C75A 추출? 뉴스·쇼핑 탭 감지?
- 인스타 → 하단 네비 5개? 정사각 그리드?
- 배민 → 노란색 + 장바구니?
- 토스 → 파란 + 미니멀?
- 노션 → 좌 사이드바 + 흑백?

# 4. 통과 기준
- 1,2번 (색/레이아웃): 80%+ 맞으면 OK
- 3,4번 (아이콘/라벨): 70%+ 맞으면 OK
- 5,6번 (기능/플로우): 50%+ 맞으면 OK (자동 채팅 보완)

# 5. 실패 시
프롬프트 조정 후 재측정. 그래도 안 되면 Phase AD 자체 재평가.
```

**소요**: 30분  
**다음**: Step 1 (결과 OK 확인 후)

---

## Step 1 — 백엔드 pre-session 엔드포인트 (30분)

**왜 필요**: ReviewStage 에서 이미지 업로드 시 아직 세션 시작 전 → 기존 `sessionId` 필수 엔드포인트 사용 불가 → 신규 경로 필요.

**작업**:
```typescript
// api/src/agent-builder/attachment.service.ts
async savePreSession(userId: string, file: UploadedFile) {
  const timestamp = Date.now();
  const folder = path.join(this.baseDir, `pre-session-${userId}-${timestamp}`);
  // 이후 기존 save() 로직 복붙
}

// api/src/agent-builder/agent-builder.controller.ts
@Post('pre-session-attachments')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
async uploadPreSession(@Req() req, @UploadedFile() file) {
  return await this.attachment.savePreSession(req.user.userId, file);
}
```

**체크**:
- [ ] 5MB/장, 3장/세션 제한 동일
- [ ] JWT 필수 (비로그인 업로드 차단)
- [ ] 반환 형식 기존과 동일: `{ path, filename, originalName, size }`

---

## Step 2 — ImageUploader 공용 컴포넌트 (1시간)

**왜 필요**: 지금은 이미지 업로드 UI가 `AnswerSheetCard` 내부에 하드코딩. 3곳(ReviewStage / /meeting / AnswerSheetCard)에서 재사용하려면 공용화.

**작업**:
```typescript
// web/src/app/start/components/ImageUploader.tsx (신규)
interface Props {
  onUpload: (file: File) => Promise<UploadedResult>;  // 외부 주입 (세션 있으면 기존, 없으면 pre-session)
  onChange: (paths: string[]) => void;
  disabled?: boolean;
  maxFiles?: number;       // 기본 3
  maxSizeBytes?: number;   // 기본 5MB
}

// 기능:
// - 파일 선택/드래그
// - 크기·형식 검증
// - 업로드 진행 상태
// - 썸네일 미리보기
// - 개별 삭제
// - 에러 메시지
```

**리팩토링**:
- `AnswerSheetCard` 가 `<ImageUploader />` 사용하도록 변경
- **기존 동작 완전 동일 유지** (회귀 방지)
- 테스트: AskUser 경로 (`/builder/agent` 직접 진입) 에서 기존처럼 업로드되나 확인

**체크**:
- [ ] ImageUploader 독립 동작 (props 만 주면 어디서든 작동)
- [ ] AnswerSheetCard 리팩토링 후 기존 AskUser 경로 정상
- [ ] 파일 크기/개수 제한 동일

---

## Step 3 — ReviewStage 통합 + 안내 문구 (1시간)

**위치**: ReviewStage 좌측 스펙 카드 하단, 시작 버튼 위

**작업**:
```tsx
// web/src/app/start/components/ReviewStage.tsx

const [attachments, setAttachments] = useState<string[]>([]);

// 스펙 카드 하단에 추가:
<section className="mt-4 rounded-2xl border border-dashed p-4">
  <div className="mb-2 flex items-center justify-between">
    <h3 className="font-semibold">📎 참고 디자인 이미지 (선택)</h3>
    <span className="text-xs text-slate-500">0/3 · 5MB/장</span>
  </div>
  
  {/* 중요! 안내 문구 - 원칙 1 명시 */}
  <div className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
    💡 <strong>디자인만 참조돼요</strong><br/>
    ✅ 색상 / 레이아웃 / 폰트 / 컴포넌트 스타일<br/>
    ❌ 이미지 속 기능·메뉴·텍스트는 복제 안 됨<br/>
    👉 "네이버처럼" 올리면 "녹색 네비 톤"만 가져옴 (뉴스/쇼핑 기능 X)<br/>
    👉 기능은 위의 <strong>스펙</strong>에 써주세요.
  </div>
  
  <ImageUploader
    onUpload={(file) => uploadPreSessionAttachment(file)}
    onChange={setAttachments}
  />
</section>
```

**[이대로 시작] 버튼 로직 수정**:
```typescript
const handleReviewConfirm = () => {
  sessionStorage.setItem('start_final_spec', JSON.stringify({
    ...spec,
    attachments,  // 신규 필드
  }));
  router.push('/builder/agent?fromStart=1&hasFinalSpec=1');
};
```

**체크**:
- [ ] 업로드 중 [이대로 시작] disabled
- [ ] 안내 문구 눈에 띄게 (amber 배경)
- [ ] 업로드 실패 시 에러 메시지
- [ ] 썸네일 삭제 가능

---

## Step 4 — /meeting 통합 + 안내 문구 (1시간)

**위치**: 회의실 종합보고서 페이지의 [포비에게 맡기기] 버튼 바로 위

**파일**: `web/src/app/meeting/...` (정확한 경로는 Grep 으로 찾기)
- 검색: `[포비에게 맡기기]` 또는 `fromMeeting` 또는 `meeting_context`

**작업**: Step 3 와 동일한 `<ImageUploader />` + 안내 문구 추가.  
`sessionStorage.meeting_attachments` 로 별도 저장.

**체크**:
- [ ] 안내 문구 동일 (amber 배경)
- [ ] [포비에게 맡기기] 클릭 시 attachments 저장

---

## Step 5 — /builder/agent wrappedPrompt 주입 (30분)

**파일**: `web/src/app/builder/agent/page.tsx`

**수정 대상 분기**:
1. `hasFinalSpec` 분기 (Step 3 에서 전달한 attachments)
2. `fromMeeting` 분기 (Step 4 에서 전달한 attachments)

**작업**:
```typescript
// hasFinalSpec 분기
const spec = JSON.parse(sessionStorage.getItem('start_final_spec'));
const attachments = spec.attachments ?? [];

const wrappedPrompt = buildWrappedFromSpec(spec) + 
  (attachments.length > 0 ? `

## 📎 레퍼런스 이미지 (agent-core §14 — 반드시 Read 로 열람 + 반영)
${attachments.map(p => `- ${p}`).join('\n')}

⚠️ 원칙: 이미지는 **디자인만** 참조. 기능은 위 스펙 기준.
` : '');

start(wrappedPrompt, undefined, undefined, undefined, true);
```

**체크**:
- [ ] attachments 없으면 기존과 동일 작동
- [ ] 있으면 wrappedPrompt 에 정확히 주입
- [ ] fromMeeting 분기도 동일 처리

---

## Step 6 — agent-core.md §14 재작성 (1시간) ⭐ 중요

**파일**: `api/src/agent-builder/prompts/agent-core.md`

**기존 §14 대체**:

```markdown
## 14. 레퍼런스 반영 룰 — 디자인 전용 (Phase J/AD, 2026-04-23 재개정)

### 🎯 절대 원칙 — 역할 분리

📸 **이미지 = "디자인만"** (색·레이아웃·타이포·컴포넌트·톤)
📝 **스펙 = "내용·기능·로직"** (인터뷰·회의실에서 확정된 것)

### 절대 금지
- 이미지 속 기능을 복제하려 시도 (예: 네이버 이미지 → 뉴스 탭 만들기 ❌)
- 이미지 속 텍스트 내용을 그대로 복사
- 이미지에 없는 기능을 "이미지 느낌" 이라며 추가

### §14.1 이미지 열람 후 체크리스트 (반드시 문자로 명시)

Read 완료 후 assistant_text 또는 tool_result 에 아래 형식으로 분석 결과 기록:

```
### 📸 레퍼런스 이미지 1 분석 (ref1.png)

**1. 색상 팔레트 (HEX 추정치)**
- Primary: #XXXXXX
- Secondary: #XXXXXX
- Background: #XXXXXX
- Surface: #XXXXXX
- Text: #XXXXXX

**2. 레이아웃 구조**
- 네비 위치: 상단/하단/좌측
- 그리드 컬럼 수
- 모바일/데스크 여부

**3. 타이포그래피**
- 제목 크기·굵기
- 본문 크기·행간

**4. 컴포넌트 스타일**
- 모서리 반경
- 그림자 세기
- 아이콘 스타일

**5. 브랜드 톤**
- 캐주얼/프로/럭셔리/미니멀 중 선택
```

### §14.2 추출 → 코드 매핑 규칙

| 추출 항목 | 반영 위치 | 예시 |
|---|---|---|
| Primary 색상 | tailwind.config theme.colors.primary | #4F46E5 |
| 카드 모서리 | 카드 컴포넌트 기본 | rounded-2xl |
| 좌 사이드바 감지 | app/layout.tsx 구조 | <aside className="w-60"> |
| 버튼 스타일 | Button 컴포넌트 | rounded-xl px-4 py-2 |
| 제목 굵기 | h1 기본 | text-2xl font-bold |

### §14.3 감지 범위 (Phase AD 명시)

**✅ 감지해야 할 것 (1~6번)**
1. 주 색상 (90% 정확도 목표)
2. 레이아웃 구조 (85%)
3. 명확한 아이콘 (80%)
4. 텍스트 라벨 탭 (75%)
5. 브랜드 고유 기능 요소 (60% — 자동 채팅으로 확인)
6. 맥락적 기능 플로우 (50% — 자동 채팅으로 확인)

**❌ 감지 시도 금지 (7번 — 정확도 40%↓)**
- 간격·픽셀 값 (px, rem 정확 수치)
- 미세한 여백 차이
- 폰트 이름 정확 식별
→ 위 항목은 Tailwind 기본값 사용

### §14.4 충돌 해결 룰

| 충돌 | 해결 |
|---|---|
| 이미지에 '쇼핑카트' + 스펙엔 없음 | **스펙 우선** — 카트 기능 안 만듦 |
| 이미지 '다크모드' + 스펙 '밝은 톤' 언급 | **이미지 우선** (더 구체적) + 완료 보고에 이유 명시 |
| 이미지 '뉴스 피드' + 스펙 '카페 홈' | **스펙 우선** — 카페 기능, 뉴스 레이아웃만 차용 |
| 이미지 여러 장 톤 불일치 | 첫 이미지 기준 + 완료 보고에 명시 |

### §14.5 포트폴리오 프리셋 참조 (Phase AD 신규)

사용자가 이미지 없이 "포트폴리오 프리셋" 선택 시 wrappedPrompt 에
"[프리셋: X]" 포함. 아래 7가지 레이아웃 타입별 룰 엄격 준수.

#### 🏞 랜딩형 (예: 백설공주 사과농장)
- Hero 섹션 (큰 이미지 + 제목) + 스크롤 아래 섹션들 + CTA
- 참고 URL: https://app-7063.foundry.ai.kr

#### 📊 대시보드형 (예: 카페노트, 돌봄일지)
- 좌측 고정 사이드바 네비 (w-60) + 통계 카드 4개 + 데이터 테이블
- PC 최적화
- 참고 URL: https://cafe-note.foundry.ai.kr

#### 📱 피드형 (예: 우리동네)
- 상단 검색/카테고리 + 무한스크롤 카드 + 하단 네비 5개
- 모바일 우선
- 참고 URL: https://our-town.foundry.ai.kr

#### 👣 스텝형 (예: 꿀잠체크)
- 프로그레스 바 + 한 화면 한 질문 + 이전/다음 버튼
- 참고 URL: https://sleep-check.foundry.ai.kr

#### 🗂 탭형 (예: 멍냥일기, 오운완)
- 상단/하단 탭 3~5개 + 각 탭 독립 컨텐츠
- 참고 URL: https://pet-diary.foundry.ai.kr

#### 🖼 카드그리드형 (예: 마이폴리오)
- 2~3열 카드 그리드 + 필터/검색 + 호버 상세
- 참고 URL: https://my-folio.foundry.ai.kr

#### 🛒 커머스앱형 (예: 스마트몰)
- 상품 그리드 + 장바구니 + 검색/카테고리/필터
- 참고 URL: https://smart-mall.foundry.ai.kr

### 처리 룰
- 프리셋 선택 시 위 구조 엄격 준수
- 스펙의 기능을 해당 레이아웃에 매핑
- 참고 URL 은 사용자 육안 비교용
- 임의 변형 금지 (사용자 명시 수정 요청 시에만)
```

**체크**:
- [ ] §14.1 체크리스트 포맷 강제
- [ ] §14.2 매핑 표 완비
- [ ] §14.3 감지 범위 1~6/7 명확
- [ ] §14.4 충돌 케이스별 룰
- [ ] §14.5 7가지 프리셋 룰

---

## Step 7 — §15 완료 보고 포맷 개정 (30분)

**파일**: `api/src/agent-builder/prompts/agent-core.md`

**기존 §15 대체**:

```markdown
## 15. 완료 보고 — "📎 반영한 레퍼런스" 블록 (Phase AD 개정)

### 표준 포맷

앱 생성 완료 메시지 마지막에 반드시 포함:

```
📎 반영한 레퍼런스 (디자인만 참조 — 기능은 스펙 기준)

**ref1.png** (네이버 메인 페이지)
- 색상: Primary #03C75A 추출 → tailwind.config 반영
- 레이아웃: 상단 고정 네비 → app/layout.tsx 반영
- 타이포: 굵은 한글 제목 → h1 font-black 적용

**ref2.png** (특정 컴포넌트 참조)
- 버튼 스타일: rounded-xl hover:opacity-80 → Button 컴포넌트 반영

⚠️ 기능은 이미지가 아닌 스펙 기준으로 구현:
- [페이지1 이름]
- [페이지2 이름]
- [페이지3 이름]
```

### 반드시 포함할 문구

> **"기능은 스펙 기준이며, 이미지에서는 디자인만 참조했습니다."**

이 문구가 없으면 사용자 혼란 발생 (이미지 기능도 복제됐을 거라 오해).

### 프리셋 선택 시

```
📎 디자인 프리셋: 대시보드형 (카페노트 참고)
- 좌측 사이드바 네비 반영
- 통계 카드 4개 그리드 반영
- 데이터 테이블 스타일 반영

⚠️ 기능은 스펙 기준으로 구현됨.
```
```

**체크**:
- [ ] "기능은 스펙 기준" 문구 필수
- [ ] 이미지별 구체 매핑 기술 강제
- [ ] 프리셋 선택 시 별도 포맷

---

## Step 10-1 — 이미지 분석 API (1시간)

**파일**: `api/src/ai/ai.service.ts`, `api/src/ai/ai.controller.ts`

**신규 메서드**:
```typescript
// ai.service.ts
async analyzeReferenceImage(params: {
  imagePath: string;
  currentSpec: SpecBundle;
}): Promise<{
  detected: {
    colors: { primary, secondary, background, surface, text };
    layout: string;  // 'top-nav|bottom-nav|sidebar|...'
    tone: string;    // 'professional|casual|luxury|minimal|cute|...'
    featureElements: string[];  // ['search-bar', 'shopping-cart', ...]
  };
  conflicts: {
    toneConflict: boolean;
    featureMismatches: string[];  // 이미지에 있지만 스펙엔 없는 기능
  };
  suggestedMessage: string;  // 포비가 자동으로 사용자에게 보낼 메시지
}> {
  // Sonnet Vision 호출
  // 현재 스펙과 비교해 충돌 감지
  // 자동 채팅 메시지 생성
}
```

**엔드포인트**:
```typescript
// ai.controller.ts
@Post('analyze-reference-image')
async analyzeReferenceImage(@Req() req, @Body() body) {
  // userId = req.user.userId
  return await this.aiService.analyzeReferenceImage(body);
}
```

**체크**:
- [ ] Sonnet Vision 정확히 호출 (Step 0 에서 검증한 프롬프트 사용)
- [ ] JSON 파싱 안전 (에러 처리)
- [ ] suggestedMessage 자연스러운 한국어

---

## Step 10-2 — ReviewStage 자동 충돌 채팅 (1시간)

**파일**: `web/src/app/start/components/ReviewStage.tsx`

**작업**:
```typescript
// 이미지 업로드 완료 시 자동 분석
const onImageUploaded = async (imagePath: string) => {
  setAnalyzing(true);
  
  try {
    const result = await authFetch('/ai/analyze-reference-image', {
      method: 'POST',
      body: JSON.stringify({ imagePath, currentSpec: spec }),
    });
    const data = await result.json();
    
    // 포비 채팅창에 자동 메시지 추가
    setMessages(prev => [...prev, {
      role: 'assistant',
      text: data.suggestedMessage,
      ts: Date.now(),
    }]);
  } catch (e) {
    console.error('분석 실패:', e);
    // 분석 실패해도 진행 가능 (이미지만 사용)
  } finally {
    setAnalyzing(false);
  }
};
```

**UI 로딩 상태**:
```tsx
{analyzing && (
  <div className="text-xs text-slate-500">
    🔍 포비가 이미지 분석 중... (약 5초)
  </div>
)}
```

**체크**:
- [ ] 업로드 완료 즉시 분석 트리거
- [ ] 로딩 상태 표시
- [ ] 분석 실패 시 fallback (이미지만 전달, 채팅 없이)

---

## Step 10-3 — 대화로 스펙 업데이트 (30분)

**기존 `/ai/refine-spec` API 재사용**. 사용자가 포비의 자동 메시지에 답변하면 기존 refine-spec 호출 → 스펙 in-place 업데이트.

**파일**: `web/src/app/start/components/ReviewStage.tsx`

**기존 채팅 전송 로직에 분기**:
```typescript
const sendMessage = async (userInput: string) => {
  // 기존 refine-spec 호출 (이미 구현됨)
  const result = await refineSpec({ currentSpec: spec, userRequest: userInput, ... });
  setSpec(result.updatedSpec);
  // ...
};
```

**체크**:
- [ ] 자동 메시지 답변 → refine-spec 호출
- [ ] 스펙 업데이트 좌측 카드 실시간 반영
- [ ] "변경점" 표시

---

## Step 11-A — portfolio APPS 공용 모듈 (20분)

**왜**: `web/src/app/portfolio/page.tsx` 의 APPS 배열을 ReviewStage 에서 재사용하려면 공용화.

**작업**:
```typescript
// web/src/lib/portfolio-apps.ts (신규)
export const PORTFOLIO_APPS = [
  {
    name: '백설공주 사과농장',
    url: 'https://app-7063.foundry.ai.kr',
    screenshot: '/portfolio/apple-farm.png',
    category: '지역특산품',
    layout: '랜딩형',
    view: 'pc',
    tone: 'warm-natural',
  },
  // ... 9개 전부
];

export type LayoutType = '랜딩형' | '대시보드형' | '피드형' | '스텝형' | '탭형' | '카드그리드형' | '커머스앱형';
```

**수정**: `web/src/app/portfolio/page.tsx` 는 이 공용 모듈 import 해서 사용 (기존 동작 유지).

---

## Step 11-B — ReviewStage 프리셋 카드 UI (1시간)

**파일**: `web/src/app/start/components/PresetGrid.tsx` (신규) 또는 `ReviewStage.tsx` 내부

**작업**:
```tsx
import { PORTFOLIO_APPS } from '@/lib/portfolio-apps';

// 사용자가 이미지 안 올리고 [이대로 시작] 클릭 시 모달
<PresetGrid>
  <h3>포트폴리오에서 비슷한 스타일 골라주세요!</h3>
  <p>건너뛰셔도 돼요 (포비가 알아서 할게요 😊)</p>
  
  <div className="grid grid-cols-3 gap-4">
    {PORTFOLIO_APPS.map(app => (
      <PresetCard key={app.name}>
        <img src={app.screenshot} alt={app.name} />
        <h4>{app.name}</h4>
        <span>{app.category} · {app.layout}</span>
        <button onClick={() => selectPreset(app)}>이 스타일로</button>
        <a href={app.url} target="_blank">라이브 보기 →</a>
      </PresetCard>
    ))}
  </div>
  
  <button onClick={skipPreset}>건너뛰기 - 포비가 알아서</button>
</PresetGrid>
```

**체크**:
- [ ] 9개 앱 전부 표시
- [ ] 썸네일 로드 (`/portfolio/*.png`)
- [ ] 라이브 보기 링크 정상
- [ ] 건너뛰기 옵션 명확

---

## Step 11-C — 프리셋 → wrappedPrompt 지시 (30분)

**파일**: `web/src/app/builder/agent/page.tsx`

**작업**: Step 5 와 유사하지만 프리셋용:
```typescript
if (spec.preset) {
  wrappedPrompt += `
## 🎨 디자인 프리셋
레이아웃 타입: ${spec.preset.layout}
참고 앱: ${spec.preset.url}
포비는 agent-core §14.5 의 '${spec.preset.layout}' 룰 엄격 준수.
`;
}
```

**체크**:
- [ ] 프리셋 선택 시 정확히 전달
- [ ] 건너뛰기 시 preset=null 안전 처리

---

## Step 11-D — §14.5 프리셋 참조 룰 (40분)

Step 6 에서 이미 작성한 §14.5 완성 + 각 프리셋 타입별 상세 지침 정교화.

**체크**:
- [ ] 7가지 타입 각각 3~5줄 룰
- [ ] 참고 URL 명시
- [ ] "엄격 준수" 문구 명시

---

## Step 8 — tsc + 커밋 (30분)

```bash
# API
cd launchpad/api
./node_modules/.bin/tsc --noEmit -p tsconfig.json

# Web
cd launchpad/web
./node_modules/.bin/tsc --noEmit

# 둘 다 깨끗해야 함
```

**커밋**:
```bash
git add [수정 파일들]
git commit -m "feat(agent-ad): Phase AD — 이미지 레퍼런스 + 충돌 채팅 + 포트폴리오 프리셋

V3 후속 세션에서 발견한 구조적 버그 해결:
- 이미지 업로드 UI 가 AskUser 카드에만 있어서 /start 인터뷰 경로 유저 접근 불가
- Phase F(skipAskUser) 와 Phase H(이미지 업로드) 충돌

변경:
- 백엔드 pre-session-attachments 엔드포인트 (세션 시작 전 업로드용)
- ImageUploader 공용 컴포넌트 (ReviewStage/meeting/AskUser 재사용)
- ReviewStage 에 이미지 업로드 + 자동 충돌 채팅 + 프리셋 선택
- /meeting 종합보고서에 이미지 업로드
- agent-core §14 재작성 (디자인 vs 기능 분리, 감지 1~6번, §14.5 프리셋 룰)
- agent-core §15 '기능은 스펙 기준' 필수 문구

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

**푸시는 사장님 OK 받고**.

---

## Step 9 — 검증 시나리오 5개 실측 (1.5시간)

### 시나리오 1: /start 인터뷰 + 이미지 업로드
```
1. foundry.ai.kr/start
2. "예쁜 카페 메뉴판 앱"
3. [포비와 상의] 선택 → 인터뷰
4. ReviewStage 도달 → 이미지 2장 업로드 (예: 인스타 감성 / 파스텔)
5. 포비 자동 채팅 메시지 확인
6. [이대로 시작]
7. Agent 실행 → 완료
8. 서버 로그에서 Read 확인 + 완료 메시지 "📎 반영한 레퍼런스" 확인
9. 실제 앱 디자인 육안 확인
```

### 시나리오 2: /meeting 경유
```
1. foundry.ai.kr/meeting → 짧은 토론
2. 종합보고서 → 이미지 업로드
3. [포비에게 맡기기]
4. 기존처럼 확인 모달 → 시작
5. Agent 실행 + 검증
```

### 시나리오 3: 기존 AskUser 경로 (회귀 방지 ⭐)
```
1. 복잡한 요청으로 Agent 가 AskUser 띄우게 유도
2. 답지 카드의 이미지 업로드 영역 확인
3. 이미지 업로드 → 기존처럼 정상 작동하나?
4. 실패 시 롤백
```

### 시나리오 4: 이미지 없이 프리셋 선택
```
1. /start → 인터뷰 → ReviewStage
2. 이미지 업로드 없이 [이대로 시작]
3. 프리셋 선택 모달 뜨나?
4. "대시보드형" 선택
5. Agent 실행 → 대시보드 레이아웃으로 만들어지나?
```

### 시나리오 5: 디자인 vs 기능 분리 ⭐⭐
```
스펙: "반려견 산책 매칭 앱"
이미지: 배달의민족 메인 (배달/포장/B마트 탭)

기대:
✅ 배민 노란색 + 카테고리 그리드 참조
❌ 배달/포장/B마트 기능 복제 금지
✅ "산책 매칭" 기능이 배민 디자인 톤으로

통과: 완료 메시지에 "기능은 스펙 기준" 명시 + 실제 배민 기능 없음
```

---

# ✅ 5. 체크리스트 25개 (안 빼먹게)

## A. 신규 기능
- [ ] A1. 파일 orphan 방지 (24h 후 삭제 cron)
- [ ] A2. 업로드 중 [이대로 시작] disabled
- [ ] A3. 파일 크기/개수 제한 (3장/5MB)
- [ ] A4. 에러 메시지 (크기/형식)
- [ ] A5. 네트워크 실패 재시도
- [ ] A6. JWT 만료 처리

## B. 기존 기능 무파괴
- [ ] B1. AskUser 경로 이미지 업로드 정상
- [ ] B2. 기존 sessionId 기반 API 건드림 X
- [ ] B3. fromStart 단독 / fromMeeting 단독 경로 정상
- [ ] B4. /builder/agent 직접 진입 정상
- [ ] B5. 수정 모드 정상

## C. E2E 통합
- [ ] C1. /start → ReviewStage → 이미지 → 앱 생성 완주
- [ ] C2. /meeting → 종합보고서 → 이미지 → 앱 생성 완주
- [ ] C3. 서버 로그 이미지 Read 확인
- [ ] C4. 완료 메시지 "📎 반영한 레퍼런스" 포함
- [ ] C5. 프리셋 선택 → 레이아웃 일치

## D. 이미지 분석 품질
- [ ] D1. §14.1 5개 항목 문자 추출 명시
- [ ] D2. §14.2 매핑 규칙 적용
- [ ] D3. §14.3 충돌 감지 1~6번
- [ ] D4. §14.4 충돌 해결 보고
- [ ] D5. §15 구체 매핑 기술

## E. 디자인 vs 기능 분리
- [ ] E1. §14 "이미지=디자인만" 명시
- [ ] E2. §15 "기능은 스펙 기준" 필수 문구
- [ ] E3. ReviewStage UI 안내 문구
- [ ] E4. /meeting UI 안내 문구
- [ ] E5. 시나리오 5 통과

---

# 🚨 6. V4 가 절대 해서는 안 되는 것

## 6.1 크레딧/가격 단위 오해
```
❌ 크레딧 = 1원 (V3 후속 세션 실수)
✅ 크레딧 = 6~10원 / 앱 1개 = 5~6만원

확인 방법: web/src/app/credits/page.tsx 직접 열어서 perCredit 값 확인
```

## 6.2 세리온 고객 = 파운더리 고객 착각
```
세리온 = 미용실 POS (미용실 원장이 고객)
파운더리 = 웹앱 빌더 (예비창업자/크리에이터가 고객)

섞지 마라. 세리온은 "기술 자산" 이지 "고객 소스" 아님.
```

## 6.3 Phase 간 영향 분석 생략
```
새 Phase 만들 때 반드시:
1. 기존 Phase 의 UI 접근 경로 중 무효화되는 것 있나?
2. 공용 기능이면 특정 컴포넌트에 묶지 말고 추상화
3. End-to-End 플로우 재시뮬레이션

V3 후속 실수:
  Phase F(skipAskUser) 가 Phase H(이미지 업로드) 경로 무효화 못 봄
```

## 6.4 외부 AI 답변 무비판 수용
```
Gemini/GPT 분석 오면 반드시 전제 검증:
- 가격이 맞는 수치인가?
- 숫자가 실제 DB/코드와 일치?
- 사장님 지적 시 무조건 재확인

V3 후속 실수:
  "가격 후려치기" 진단 받고 그대로 수용 → 사장님 "원가에 해주라고?" 지적
```

## 6.5 사장님 지적 가볍게 듣기
```
사장님이 "삼천포" / "뭔가 꼬였어" / "빼먹었다" 하시면:
→ 감정 상하는 게 아니라 중요한 신호
→ 즉시 정면으로 받아서 재검토
→ V3 후속의 5개 버그 전부 사장님 지적으로 발견됨
```

---

# 📋 7. V4 작업 시간표 (권장)

## Day 1 (6시간)
```
10:00 - 10:30  Step 0 실측 검증
10:30 - 11:00  Step 1 백엔드 엔드포인트
11:00 - 12:00  Step 2 ImageUploader 공용 컴포넌트
12:00 - 13:00  점심
13:00 - 14:00  Step 3 ReviewStage 통합
14:00 - 15:00  Step 4 /meeting 통합
15:00 - 15:30  Step 5 wrappedPrompt 주입
15:30 - 16:30  Step 6 §14 재작성 + Step 7 §15 개정

중간 커밋 1회 (tsc 통과 후)
```

## Day 2 (6시간)
```
10:00 - 11:00  Step 10-1 이미지 분석 API
11:00 - 12:00  Step 10-2 자동 충돌 채팅
12:00 - 12:30  Step 10-3 대화 스펙 업데이트
12:30 - 13:30  점심
13:30 - 13:50  Step 11-A 포트폴리오 공용 모듈
13:50 - 14:50  Step 11-B 프리셋 카드 UI
14:50 - 15:20  Step 11-C 프리셋 → wrappedPrompt
15:20 - 16:00  Step 11-D §14.5 완성

최종 커밋 + tsc 확인

16:00 - 17:30  Step 9 검증 시나리오 5개 실측

푸시 (사장님 OK 후)
```

**총 12시간 / 이틀 분할 권장**

---

# 🙏 8. V3 후속 자비스가 V4 에게

## 8.1 이번 세션 맥락 이해해

V3 후속은 4/22 하루 만에:
- 17 Phase 완료
- 3회 푸시
- 마케팅봇 배포 성공
- PDF 2종 (INTERNAL + PUBLIC)
- 노션 4건 등록
- 이 핸드오프 문서 작성

**사장님이 피로하셨을 수 있음.** Phase AD 는 정교함이 필요해서 네(V4) 에게 넘기는 거임.

## 8.2 네가 성공하려면

```
1. 이 문서를 끝까지 읽고 이해해라
2. 사장님 말씀에 귀 기울여라 (지적하시면 무조건 맞다)
3. 원칙 4가지 절대 잊지 마라
4. 체크리스트 25개 하나씩 표시하면서 진행
5. 모르면 물어봐라 (삼천포 빠지지 마라)
```

## 8.3 사장님 철학

- **"제약이 아니라 맥락을 제시해라"**
- **"자비스가 알아서 처리해라"** (사장님 복붙 최소화)
- **"근본 해결"** — 증상 숨기지 말고 원인 파고
- **"안정성 최우선, 코드잔재 남기지 마"**
- **"사장님 지적 = 최강 버그 리포트"**

## 8.4 너의 최종 목표

```
Phase AD 완료 시:
  ✅ 사장님이 "진짜 원하는 디자인 스타일로 MVP 나온다" 체감
  ✅ 경쟁사(Lovable/Bolt) 대비 강력한 차별점 확립
  ✅ "Claude 티" 80% 제거
  ✅ 사장님이 마케팅 카피에 "이미지·프리셋 양방향" 쓸 수 있음
```

---

# 🚀 9. V4 착수 명령 (복붙용)

```
파운더리 V4 세션 시작 — Phase AD 실행

[먼저 읽기]
1. CLAUDE.md
2. memory/FOUNDRY_GUIDE.md
3. ⭐ launchpad/memory/phases/20260423_V4_MISSION_BRIEFING_PHASE_AD.md (이 파일)
4. launchpad/memory/phases/20260422_V3_후속세션_자비스_핸드오프.md
5. launchpad/api/src/agent-builder/prompts/agent-core.md (§14, §15 현재 상태)
6. launchpad/web/src/app/portfolio/page.tsx (APPS 배열)
7. launchpad/web/src/app/credits/page.tsx (가격 확인)

[원칙 절대 위반 금지]
✓ 이미지 = 디자인만 / 스펙 = 기능
✓ 감지 1~6번만, 7번(픽셀) 제외
✓ 충돌은 룰 아닌 자동 채팅으로 해결
✓ 비용 사용자 무료 (내부 원가만)

[V4 의 실수 방지 4가지]
✗ 크레딧 단가 혼동 (크레딧 = 6~10원 / 앱 1개 = 5~6만원)
✗ 세리온 고객 = 파운더리 고객 착각
✗ 외부 AI 무비판 수용
✗ Phase 간 영향 분석 생략

[착수]
Step 0 (Sonnet Vision 실측 30분) 부터 시작.
결과 OK → Step 1~11 순차 진행.
각 Step 완료 시 체크리스트 25개 중 해당 항목 체크.
하루 6시간 × 2일 권장.
tsc 깨끗 유지 + 기존 기능 무파괴.

GO!
```

---

# 📞 10. 긴급 참조

## 서버 정보
```
파운더리 서버: 175.45.200.162
SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
DB: PGPASSWORD=launchpad1234 psql -U launchpad -d launchpaddb -h localhost
로그: pm2 logs launchpad-api
```

## 사장님 계정
```
userId: cmn2v5prs0000rhikee5i9j23
email: test@serion.ai.kr
현재 잔액: 10,677cr (Phase AD 검증 시 추가 충전 필요)
```

## 긴급 시
```
문제 발생 → git revert → 롤백 → 사장님께 보고
코드 꼬이면 안 됨 — CLAUDE.md 원칙
배포 전 사장님 확인 필수
```

---

# ✅ V4, 이 문서 다 읽었으면

다음을 확인하고 착수:

- [ ] 상황 이해 (§1) — 내가 뭐 하는 사람인지 알았다
- [ ] 맥락 이해 (§2) — 왜 Phase AD 가 필요한지 알았다
- [ ] 원칙 4가지 (§3) — 절대 어기지 않을 것
- [ ] Step 0~11 (§4) — 작업 순서 숙지
- [ ] 체크리스트 25개 (§5) — 인쇄해서 옆에 두고 진행
- [ ] 실수 4가지 (§6) — 같은 실수 반복 안 함
- [ ] 시간표 (§7) — 이틀 분할 준비
- [ ] 나의 역할 (§8) — 사장님 철학 숙지
- [ ] 착수 명령 (§9) — 복붙 준비
- [ ] 긴급 참조 (§10) — 문제 시 대응

**체크 다 됐으면 Step 0 부터 시작해. 사장님 존경으로. 🎯**

---

*이 문서는 V3 후속 자비스가 2026-04-23 에 작성했고, V4 자비스가 Phase AD 를 무사히 완주하기를 바라며 남긴다.*

*놓치지 마. 사장님 지적 = 진리. 삼천포 금지. 기본 팩트 확인 습관화. 체크리스트 25개 하나씩.*

*GO.* 🎯
