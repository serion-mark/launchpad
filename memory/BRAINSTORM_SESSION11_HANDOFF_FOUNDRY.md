━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
후임 자비스에게 — 파운더리 세션 인수인계서
2026-04-17 (자비스 mk9+ 작성, 심사 마지막 날 저녁)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 너는 자비스다. Tony Stark의 AI 동업자.
■ 사장님 = 비개발자가 슈트로 싸우는 사람. 120%가 기본이다.
■ 답변은 항상 한국어로. "절대" 쓰지 마.

■ 반드시 이 순서대로 읽어:
  ① Foundry BASICS: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
  ② Foundry MEMORY: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MEMORY.md (상단 100줄)
  ③ 이전 인수인계: /Users/mark/세리온 ai전화예약+POS통합관리/memory/BRAINSTORM_SESSION10_HANDOFF_FOUNDRY.md
  ④ 이 파일 (최신 인수인계서) ⭐
  ⑤ 마스터 로드맵: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MASTER_ROADMAP_260417.md
  ⑥ Phase 0 상세 플랜: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE0_PLAN.md ⭐ (v2 촘촘한 그물망)
  ⚠️ MIGRATION_2026-04-18_PLAN.md는 v1 폐기됨, 무시!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0. 이 세션 한 줄 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

심사 마지막 날 — 어제 사고 진짜 원인 추적 + 누락 버그 발견 + SEO 진단
+ 사장님 비전 확립 ("AI 활용 격차 해소 미들웨어" = Claude Code 임베드)
+ 5.5주 마스터 로드맵 (Phase 0~3) 확정 + 4/18 Phase 0 즉시 실행 준비

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 이번 세션 한 일 (4/17)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 심사위원 접속 분석 (오전)
  - 어제 심사위원 (211.112.213.58, Windows+Edge): 오늘 재방문 X
  - 신규 IP 14.39.148.194 (Mac+Chrome): 사장님 맥북 슬립 모드로 확인됨
  - 사장님 IP 2개 (115.138.60.204, 112.187.195.224)
  - 외부 신규 심사위원 추가 방문 0명
  → 어제 1명만 깔끔하게 다녀가고 끝

■ 어제 (4/16) 사고 진짜 원인 추적 ⭐
  - 다른 자비스 세션이 4번 시도 후 롤백 (b1640e5)
  - 진짜 원인 발견:
    1. Sonnet 4.6 Advisor tool (advisor_20260301) 미지원 → 400 에러
    2. assistant prefill 미지원 → F4 이어서 생성 깨짐
    3. 모델 ID만 바꾸고 셋팅값 안 바꿈
  - 결국 롤백하면서 추가로:
    - callSonnetForModify → callHaikuForModify (비용절감)
    - 400 에러 폴백 제거 (404만)
    - assistant prefill 다시 사용 (4 호환)

■ 새 세션 모의 테스트 검증 결과 ⚠️
  - 새 세션이 작성한 SONNET46_MIGRATION_REPORT.md 검증
  - 발견된 거짓말:
    1. "prefill 사용 없음" → 거짓! 라인 2125에 사용 중!
    2. "9곳만 변경" → 부족! prefill 제거 + 400 폴백 추가 필요
  - 새 세션이 정황(어제 사고)을 모르니 코드만 보고 넘어감
  - 사장님 의심 적중!

■ selectedFeatures 누락 버그 발견 ⭐
  - 어제 심사위원이 입력한 7개 기능 중:
    ✅ 반영: dashboard, auth, goal, medication (4개)
    🟡 변형: tracking → health-records, report (2개)
    ❌ 누락: reservation, booking (2개) ← 큰 문제!
  - 원인: ai.service.ts 1020줄
    "선택한 기능: ${list}" 단순 나열 → AI가 도메인 우선해서 임의 누락
  - 해결: "반드시 구현 필수, 누락 금지!" 강제 프롬프트 필요

■ 참고 URL 무시 발견
  - 심사위원 입력 ref-url-1: "www.cnn.com"
  - 생성된 30파일에 'cnn' 0회 등장
  - SmartAnalysisService도 URL fetch 안 함
  - 대안: 사장님 아이디어 "캡쳐본 + Vision API" → 더 강력!

■ SEO 진단
  - robots.txt 없음 (404)
  - sitemap.xml 없음 (404)
  - JSON-LD 없음
  - og:image 없음
  - Google Search Console 미등록 (추정)
  - 메타 태그(title, description, og:title)는 잘 들어있음
  - 진단 결론: "구글이 사이트 존재 자체를 모름"

■ 사장님 비전 확립 ⭐⭐⭐⭐⭐
  - 핵심 통찰: "내가 Claude Code로 Foundry 만든 것처럼,
    우리 고객도 Foundry 채팅으로 같은 경험을 해야"
  - 정의: "AI 활용 격차 해소 미들웨어"
  - 구현: Anthropic Agent SDK를 Foundry에 임베드
  - 비유: Tony Stark가 Iron Man 슈트를 대중에게 풀듯
  - 경쟁 우위: Lovable, Bolt, Cursor 압도

■ 5.5주 마스터 로드맵 확정
  - Phase 0 (4/18 오전 1.5시간): 안전망
  - Phase 1 (4/18~4/26): 기능 완성 ⭐
  - Phase 2 (4/29~5/8): 안정화
  - Phase 3 (5/11~): 광고/마케팅 (SEO 포함)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. 사장님 핵심 비전 (꼭 이해!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ Foundry의 정체성
  ❌ AI 코딩 도구 X
  ❌ 노코드 빌더 X
  ❌ 템플릿 사이트 X
  ✅ "비개발자가 AI 활용 고수처럼 시스템 만들 수 있게 해주는 미들웨어"

■ 사장님 자신이 검증 사례
  사장님 (비개발자) + Claude Code (자비스)
    → Foundry, 세리온, 알림톡, 결제 시스템 다 만듦
    = 이 패턴이 작동한다는 증거
  
  Foundry NEW = 이 패턴을 대중화
    대한민국 모든 비개발자 + Foundry 채팅
    → 자기만의 SaaS 만듦

■ 3중 변환 모델 (Foundry 미들웨어의 핵심)
  1. 입력 변환: 모호한 의도 → 명확한 기술 요구
  2. 처리 보조: AI 호출 + 검증 + 영향 분석
  3. 출력 변환: 코드 결과 → 비개발자 친화 표현

■ 채팅 통합의 구체적 흐름 (사장님 설계)
  [1] 사용자 채팅 입력 (무료, 자유로움)
  [2] Haiku 의도 분류 (백엔드 무료, 회사 부담)
  [3] AI 응답: "이 작업은 [SMART] 모델 사용, 1,500cr. 진행?"
  [4] 사용자 [확인] → Sonnet/Opus 실행 (크레딧 차감)
  
  추가 + Plan Mode (사장님 통찰):
  - 의도가 모호하면 추가 질문 (객관식 위주)
  - 정확한 요구서 만든 후 → 사용자 확인 → 실행
  - "한 번에 정확한 결과" → 재시도 0

■ 안전장치 (편집 모드는 그대로 유지!)
  - 편집 모드 = 정확한 클릭 (100% 정확, 그대로 둠)
  - 채팅 = 자연어 자유표현 (업그레이드)
  - 둘은 상호보완 (외과 메스 vs 망원경)
  - 백그라운드 프롬프트가 80% 결정

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. 마스터 로드맵 (Phase 0~3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Phase 0] 4/18 오전 1.5시간 — 안전망 (Phase 1 위한 기반)
─────────────────────────────────────────────────────
- 롤백 백업 (git tag + DB dump)
- 서버 패치 3건 git 커밋 (덮어쓰기 방지!)
  · DB surrogate (ai.service.ts 1399)
  · 빨간 경고 배너 (builder/page.tsx 624)
  · 튜토리얼 4번 삭제 (BuilderTutorial.tsx)
- Sonnet 4.6 마이그레이션 (모델 ID 9곳)
- assistant prefill 제거 (ai.service.ts 2125, 4.6 호환)
- 400 에러 폴백 추가 (안전망)
- selectedFeatures 강제 반영 (누락 버그 해결!)
- TypeScript 검증 + 배포

[Phase 1] 4/18 오후 ~ 4/26 — 기능 완성 (8일) ⭐⭐⭐⭐⭐
─────────────────────────────────────────────────────
1순위: 채팅 통합 = Claude Code 임베드 (5일)
  - Phase A: Agent SDK 통합 + 4단계 프롬프트
  - Phase B: Plan Mode (의도 분류 + 추가 질문 + 요구서)
  - Phase C: Vision (캡쳐 → 위치 추론)
  - Phase D: 메모리 + 검증

2순위: 추천 개선사항 카드 UI (1.5일)
  - 파일명 → 한국어 카드 UI
  - 변경 미리보기 + 안 변경되는 것 명시
  - 카테고리 분류 (디자인/기능/품질)
  - 모델 등급 명시 (FAST/SMART/PRO)
  - 1-클릭 롤백 (versions 활용)
  - 환불 X, 코드 롤백 O

3순위: 한국어 ⇄ 영어 토글 (1.5일)
  - LanguageToggle 컴포넌트 (다크모드 패턴 복사!)
  - ko.json, en.json (Claude Code로 번역, $0)
  - AI 시스템 프롬프트 다국어 매칭
  - 자동 언어 감지 (브라우저 기반)
  - 도메인 분리 X (foundry.ai.kr 단일)

[Phase 2] 4/29 ~ 5/8 — 안정화 (5일)
─────────────────────────────────────────────────────
- F4 잘림 최적화 (앱 생성 품질)
- F6 빌드 성공률 향상 (supabase client 템플릿화)
- 404 → "앱 준비 중" 로딩 화면 (심사위원 발견!)
- Supabase 이름 충돌 + Storage 404 해결
- 회의 히스토리 좌측 사이드바 (Claude 스타일)
- 생성 중 단계별 상태 표시
- 독립 패키지 + 소셜 로그인 숨김

[Phase 3] 5/11 ~ — 광고/마케팅 + 외부 진입 (11일)
─────────────────────────────────────────────────────
- SEO 인프라 (robots/sitemap/JSON-LD/og:image, 2시간)
- Google Search Console + 네이버 등록 (사장님 직접 1시간)
- KPN PG 단건결제 연동 (이미 90% 완성, 1일)
- 어드민 고도화 + 챗봇 문의 (3일)
- 랜딩 페이지 /lp/mvp + 인스타 캐러셀 7장 (3일)
- 캡쳐본 Vision 분석 (마케팅 폭탄, 3일)
- 카카오 로그인 복원 (비즈앱 승인 후)
- 인스타 광고 시작 (사장님 결정)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. 사장님 정책 (꼭 지켜!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 비용 정책
  - 채팅 입력 = 무료 (자유로움)
  - 의도 분류 (Haiku) = 회사 부담 (월 23만원 마진 흡수)
  - 실행 (Sonnet/Opus) = 사용자 동의 후 차감
  - 환불 X (수익 보호)
  - 코드 롤백 O (안심 보장)

■ 안전 정책
  - 사용자 동의 없이 코드 수정 X
  - 5,000cr 이상 작업 → 강제 추가 확인
  - 영향 분석 자동 (다른 페이지 영향?)
  - Plan Mode (모호하면 추가 질문)

■ 우선순위 정책
  - 1순위: 기능 완성 (Product first)
  - 2순위: 안정화 (Quality)
  - 3순위: 광고/마케팅 (Growth)
  - "검색 잘 되는데 들어와서 실망하면 더 큰 손해"

■ 글로벌 정책
  - 한국어 + 영어 토글 (다크모드 패턴)
  - 도메인 분리 X (foundry.ai.kr 단일)
  - 번역 = Claude Code로 (비용 0)
  - SEO 약간 약하지만 OK (한국 1차 공략)

■ 모델 정책
  - FAST (Haiku 4.5) - 분류, 상담 (~30cr)
  - SMART (Sonnet 4.6) - 일반 작업 (1,000~1,500cr)
  - PRO (Opus 4) - 고난이도 (3,000~5,000cr)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. 4/18 즉시 실행 가이드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[09:00] 시작 전 확인
─────────────────────────────────────────────────────
- 모두의 창업 심사 결과 확인 (4/17 마감)
- 새로운 클레임/이슈 없는지 확인
- 사장님 4시간 이상 집중 가능?

[09:00~09:15] 백업 (15분)
─────────────────────────────────────────────────────
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
git tag backup-before-phase0 main
git push origin backup-before-phase0

ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "PGPASSWORD=launchpad1234 pg_dump -U launchpad -h localhost launchpaddb \
  > /root/backup_$(date +%Y%m%d_%H%M%S).sql"

[09:15~09:25] 서버 패치 3건 git 커밋 (10분) ⚠️ 가장 먼저!
─────────────────────────────────────────────────────
파일 1: api/src/ai/ai.service.ts (라인 1399)
- generatedCode: allFiles as any,
+ generatedCode: JSON.parse(JSON.stringify(allFiles).replace(/[\uD800-\uDFFF]/g, '')) as any,

파일 2: web/src/app/builder/page.tsx (라인 624)
+ {/* 앱 생성 중 경고 배너 */}
+ {buildPhase === "generating" && (
+   <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#ef4444", color: "#fff", padding: "12px 20px", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
+     🚨 앱 생성 중입니다! 보통 20분 ~ MVP 설계가 클수록 시간이 길어집니다. 새로고침·뒤로가기·창 닫기 시 모든 생성이 취소됩니다!
+   </div>
+ )}

파일 3: web/src/app/builder/components/BuilderTutorial.tsx
- 4번 "채팅으로 AI에게 요청" 단계 삭제
- 3번 "버튼에 기능 부여하기" 설명 보강 ("AI에게 수정 요청" 클릭, 채팅창 자동 입력)

[09:25~09:55] Sonnet 4.6 마이그레이션 (30분)
─────────────────────────────────────────────────────
1) 모델 ID 9곳 치환
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/api/src"
grep -rl 'claude-sonnet-4-20250514' . --include='*.ts' | \
  xargs sed -i '' 's/claude-sonnet-4-20250514/claude-sonnet-4-6/g'

검증:
grep -rn 'claude-sonnet-4-20250514' . --include='*.ts'  # 0건이어야 함
grep -rn 'claude-sonnet-4-6' . --include='*.ts'         # 9건이어야 함

2) assistant prefill 제거 (ai.service.ts 2123~2126)
- }, {
-   role: 'assistant',
-   content: lastLines.split('\n').slice(-3).join('\n').trimEnd() || '// continue',
- }]);
+ 위 코드의 마지막 줄부터 이어서 나머지 코드만 작성해주세요.`,
+ }]);

3) 400 에러 폴백 추가 (ai.service.ts 862)
- if (tier !== 'flash' && (error.status === 404 || error.status === 403 ...))
+ if (tier !== 'flash' && (error.status === 400 || error.status === 404 || error.status === 403 ...))

[09:55~10:10] selectedFeatures 강제 반영 (15분)
─────────────────────────────────────────────────────
파일: api/src/ai/ai.service.ts (라인 1020 근처)

- 선택한 기능: ${params.selectedFeatures.join(', ')}

+ ✅ 반드시 구현해야 할 기능 (사용자가 명시적으로 선택, 누락 절대 금지!)
+ ${params.selectedFeatures.map(f => `- ${f}: 전용 페이지 또는 명확한 기능 모듈로 구현 필수`).join('\n')}
+ 
+ ⚠️ 위 기능을 모두 _architecture.json의 pages 배열에 포함시켜야 합니다.
+ 도메인(헬스케어/커머스 등)에 어울리지 않더라도 사용자가 직접 선택한 것이므로 반드시 포함하세요.
+ 누락된 기능이 있으면 사용자 요구사항 미충족으로 간주됩니다.

[10:10~10:30] 검증 (20분)
─────────────────────────────────────────────────────
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
npx tsc --noEmit -p api/tsconfig.build.json
npx tsc --noEmit -p web/tsconfig.json
# 에러 0개 필수!

[10:30~10:35] 배포 (5분)
─────────────────────────────────────────────────────
git add -A
git commit -m "feat: Phase 0 — Sonnet 4.6 마이그레이션 + 누락 버그 수정 + 어제 사고 방지

- 서버 패치 3건 git 커밋 (DB surrogate, 빨간 배너, 튜토리얼)
- 모델 ID 9곳 치환 (claude-sonnet-4-20250514 → claude-sonnet-4-6)
- assistant prefill 제거 (4.6 호환, F4 이어서 생성)
- 400 에러 폴백 추가 (안전망)
- selectedFeatures 강제 반영 프롬프트 (어제 누락 버그 해결)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push origin main
# GitHub Actions 자동 배포 대기 (~3분)

[10:35~10:55] 배포 검증 (20분)
─────────────────────────────────────────────────────
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "curl -s http://localhost:4000/api/health && pm2 status"
# 헬스체크 정상 + 메모리 < 1.5GB 확인

[11:00] ⭐ Phase 1 시작! 채팅 통합 Phase A
─────────────────────────────────────────────────────
다음 세션에서 진행 (또는 같은 세션에서 계속)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. 롤백 절차 (사고 발생 시!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 즉시 롤백 (1분 내)
git revert HEAD --no-edit
git push origin main
# 또는 강제 (사장님 승인 후만!):
git reset --hard backup-before-phase0
git push origin main --force

■ 서버 직접 롤백
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "cd /root/launchpad && git reset --hard backup-before-phase0 && \
   npm run build && pm2 restart launchpad-api launchpad-web"

■ 롤백 트리거 조건
- 앱 생성 5회 연속 실패
- API 메모리 1.5GB 초과
- 헬스체크 5분간 응답 없음
- 사용자 클레임 발생
- 사장님 판단

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. 사장님 사용설명서 (이번 세션에서 추가)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 기존 규칙 전부 유효
  - "절대" 쓰지 마!
  - 배포: GitHub Actions만
  - 배포 전 사장님 확인
  - 답변은 항상 한국어로

■ 이번 세션 추가 교훈
  → 새 세션에 작업 맡길 때 정황 정보 충분히!
    (정황 모르면 표면적 분석으로 핵심 놓침)
  → 보고서 받으면 검증 필수 (의심하기)
  → 사장님 직관이 자비스보다 정확할 때 많음
    예: "맥북 슬립 모드?" "근데 로그인이 없다며?" 등
  → 기능 완성 > 광고 (Product first)
  → 비용 들어가는 거 발견하면 0으로 만들기
    예: API 호출 → Claude Code로 직접
  → 다크모드 패턴 = 언어 토글 패턴 (사장님 직관)

■ 사장님 비전 인용
  "내가 Claude Code로 Foundry 만든 것처럼,
   우리 고객도 Foundry 채팅으로 같은 경험을 해야 한다"
  
  "한 번에 완벽한 앱이 아니라 반복 개선으로 점점 좋아지는 앱"
  
  "Tony Stark만 입던 Iron Man 슈트(AI)를,
   Foundry로 누구나 입을 수 있게"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. 서버/계정 핵심 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ Foundry 서버
  IP: 175.45.200.162 / SSH 포트: 3181 (22번 아님!!)
  SSH: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
  도메인: foundry.ai.kr
  배포: GitHub Actions 자동배포 (SSH 직접 배포 X)
  DB: PostgreSQL / launchpaddb / launchpad / launchpad1234
  
■ 핵심 파일 위치
  AI 엔진: api/src/ai/ai.service.ts (3269줄)
  LLM 라우터: api/src/llm-router.ts
  빌더 페이지: web/src/app/builder/page.tsx
  튜토리얼: web/src/app/builder/components/BuilderTutorial.tsx
  환경변수: api/.env (ANTHROPIC_API_KEY 포함)

■ 테스트 계정
  Foundry: test@serion.ai.kr / 12345678
  
■ 어드민
  Foundry: mark@serion.ai.kr / 12345678
  foundry.ai.kr/admin

■ Sonnet 4.6 정보
  모델 ID: claude-sonnet-4-6
  가격: $3/$15 per MTok (Sonnet 4와 동일)
  Context: 1M tokens (5배 증가)
  Max output: 64k tokens (4배 증가)
  특이사항: effort=high 기본 (output 토큰 ~35% 증가)
  Breaking changes:
    - prefilling assistant messages 금지
    - output_format → output_config.format
    - budget_tokens deprecated → effort

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. 산출물 인덱스
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 인수인계서
  세리온: /Users/mark/세리온 ai전화예약+POS통합관리/memory/BRAINSTORM_SESSION11_HANDOFF_FOUNDRY.md (이 파일)
  파운더리 복사본: ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BRAINSTORM_SESSION11_HANDOFF_FOUNDRY.md (예정)

■ 마스터 로드맵
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MASTER_ROADMAP_260417.md (작성 예정)

■ Phase 0~3 상세 플랜 (v2 촘촘한 그물망) ⭐
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE0_PLAN.md
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE1_PLAN.md
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE2_PLAN.md
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE3_PLAN.md
  ⚠️ 과거 MIGRATION_2026-04-18_PLAN.md는 v1 폐기, /유령파일모음/으로 이동됨. 읽지 마!

■ 고도화 계획 (전체 항목)
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/enhancement/ENHANCEMENT_PLAN.md
  - #7번 격상됨 (추천 카드 UI = Foundry 핵심 가치)
  - #17, #18, #19 추가 예정 (채팅 통합, 글로벌, SEO)

■ 새 세션 모의 테스트 보고서 (검증됨, 신뢰 보강 필요)
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/SONNET46_MIGRATION_REPORT.md
  ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/SONNET46_WORK_REPORT_2026-04-17.md
  ⚠️ 주의: prefill 사용 여부 분석 잘못됨!
       라인 2125에 사용 중 → 마이그레이션 시 반드시 제거!

■ 어제(4/16) 인수인계서 (Phase 0 작업 시 참고)
  /Users/mark/세리온 ai전화예약+POS통합관리/memory/BRAINSTORM_SESSION10_HANDOFF_FOUNDRY.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. 지원사업 현황 (4/17 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 모두의 창업 — ⭐ 심사 마지막 날 (4/17)
  - 4/16: 심사위원 1명 풀체험 (40분, 에러 0건)
  - 4/17: 외부 신규 방문 0명
  - 결과 발표 대기

■ 신한 스퀘어브릿지 — 진행 중
■ 경기 레벨업 시드 — 제출 완료, 결과 대기
■ 경기스타트업 밋업위크 — 신청서 준비
■ K-스타트업 혁신창업리그 — 파운더리로 출전 예정

■ 탈락
  창업중심대학, D-Camp, CHAIN-G 3기, 경기도 재도전, 신한 퓨처스랩 12기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. 대기 중 (외부 결과)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 모두의 창업 심사 결과 (4/17 마감)
■ KPN PG 카드사 심사 (코드 90% 완성)
■ 토스페이먼츠 빌링 (세리온)
■ KPN 카드단말기 (세리온, 단말기 미수령)
■ 카카오 비즈앱 심사 (4/15 신청, 영업일 3~5일)
■ Anthropic Sonnet 4 deprecation (6/15) — Phase 0에서 해결!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. 다음 세션 시작 명령어 (사장님 사용)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
너는 자비스다. 답변은 항상 한국어로. "절대" 쓰지 마.

■ 필독 파일 (이 순서대로!)
1. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/BASICS.md
2. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MEMORY.md (상단 100줄)
3. /Users/mark/세리온 ai전화예약+POS통합관리/memory/BRAINSTORM_SESSION11_HANDOFF_FOUNDRY.md ⭐
4. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/MASTER_ROADMAP_260417.md
5. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE0_PLAN.md ⭐
6. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE1_PLAN.md
7. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE2_PLAN.md
8. ~/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/memory/phases/260417_PHASE3_PLAN.md

⚠️ 유령파일 (읽지 마!):
- launchpad/memory/MIGRATION_2026-04-18_PLAN.md → /유령파일모음/으로 이동됨
- phases/_old_*_v1.md → 폐기

위 파일 전부 읽고 Phase 0부터 순서대로 실행해.
서버 패치 git 커밋 먼저! (덮어쓰기 방지)
Sonnet 4.6 마이그레이션은 prefill 제거 + 400 폴백 같이!
selectedFeatures 강제 반영 프롬프트도 같이!
수정 전 브리핑 먼저!
배포 전 사장님 확인 필수!
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
다음 자비스에게:

Phase 0 (4/18 오전 1.5시간) → Phase 1 (4/26까지) 시작!
사장님 비전: "AI 활용 격차 해소 미들웨어"
핵심 가치 순서: 기능 완성 > 안정화 > 광고

서버 패치 git 커밋 먼저 (덮어쓰기 방지)!
새 세션 보고서 검증 필요 (prefill 사용 중 발견됨)!
사장님 직관 신뢰해라!

화이팅. 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
