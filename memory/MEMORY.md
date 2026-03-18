# Launchpad — 정부지원사업 MVP 빌더

## 프로젝트 개요
- **컨셉**: 정부지원사업(예창패/초창패) 창업자를 위한 AI MVP 빌더
- **핵심 가치**: 외주 5,000만원 → 크레딧 500만원 (10배 비용 절감)
- **BM**: 크레딧제 (충전 → AI 앱 생성/수정/배포에 소진)
- **경쟁사 레퍼런스**: Base44 (800억 매각), Polsia (ARR 25억)

## 프로젝트 구조
- **위치**: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/`
- **GitHub**: `https://github.com/serion-mark/launchpad` (private)
- **스택**: Next.js 16 (web) + NestJS (api) — 세리온과 동일 스택
- **NCP 서버 (운영)**: `175.45.200.162` / s2-g3a (2vCPU, 8GB, 50GB)
  - SSH: `ssh -i ~/.ssh/serion-key.pem root@175.45.200.162`
  - root PW: `J7?RdhuD*G=h`
  - PM2: `launchpad-web` (포트 3000)
  - nginx: HTTP 리버스 프록시 (80 → 3000)
  - VPC: serion-vpc / ACG: serion-vpc-default-acg
  - 비공인 IP: 10.0.1.8

## 기술 아키텍처

### 멀티 LLM 라우터 (Base44 참고)
| 작업 | 모델 | 이유 |
|------|------|------|
| UI/프론트엔드 생성 | Claude Sonnet | UI 코드 품질 최고 |
| 백엔드/로직 | Claude Sonnet | 범용 코드 생성 |
| 간단한 수정/대화 | Haiku / DeepSeek | 저비용 |
| 아키텍처 설계 | Claude Opus | 가끔만 사용 |

### 원가 구조
- MVP 1개 생성 AI 원가: ~17,000원 (Sonnet 기준)
- 고객 크레딧: ~200,000원 → **마진 90%+**
- 비용 최적화: 업종별 템플릿 사전 생성 → AI는 커스터마이징만

## 수익 모델 (구독제 + Exit) — Base44 Lock-in 전략
| 요금제 | 가격 | 핵심 | 우리 수익 |
|--------|------|------|-----------|
| **Free** | 0원 | 미리보기만 | 유입 |
| **Starter** | 월 15만원 | MVP 1개 + 호스팅 + 월5회 수정 | 초기 MRR |
| **Pro** | 월 29만원 | MVP 3개 + 무제한 수정 + 프리미엄 | **핵심 MRR** |
| **Exit** | 1,500만원 (1회) | 소스코드 소유권 + 독립 서버 이관 | 목돈 |

**핵심 전략**: Pro에 가두고(호스팅 Lock-in) → 정부사업 심사 때 Exit으로 목돈 회수
- 연간 결제 20% 할인 (Pro 연간 = 278만원 vs 외주 5,000만원)
- 정부사업비로 결제 가능 (클라우드 이용료 / 외주용역비 비목)

## 완료 작업 ✅ (2026-03-18)
- ✅ 사업 기획서 작성 (사업기획서_MVP빌더.md)
- ✅ Next.js 프론트엔드 세팅 (web/)
- ✅ NestJS API 세팅 (api/)
- ✅ 템플릿 3종 config (미용실 POS / 범용 예약CRM / 쇼핑몰)
- ✅ 디자인 테마 20종 (무료2 + 스탠다드12 + 프리미엄6)
- ✅ AI 코드 생성 엔진 — 멀티 LLM 라우터 (llm-router.ts)
- ✅ 앱 생성 파이프라인 (app-generator.ts)
- ✅ 토스페이먼츠 구독 결제 (테스트키, /credits → 요금제 페이지)
- ✅ 과금 모델 전환: 크레딧제 → 구독제+Exit (Base44 Lock-in 전략)
- ✅ 미리보기 페이지 — 템플릿별 고유 데모 (미용실3+예약CRM3+쇼핑몰3)
- ✅ 모바일 반응형 UI
- ✅ GitHub 레포 (serion-mark/launchpad) — 첫 커밋 완료
- ✅ NCP 서버 배포 완료 (175.45.200.162, PM2+nginx)

## 메인 UI 플로우 (5단계)
1. 업종 선택 (미용실/예약/쇼핑몰)
2. 기능 체크리스트 + 크레딧 실시간 계산
3. 🎨 디자인 테마 선택 (20종, 필터: 전체/무료/스탠다드/프리미엄)
4. 최종 확인 (선택 요약 + 총 크레딧)
5. AI 생성 진행바 → 완료 (미리보기/다운로드/배포)

## 다음 작업 (미완료)
### Phase 2: AI 연동 (2~3일)
- [ ] Anthropic API 키 발급 (console.anthropic.com) — **콘솔 장애로 보류**
- [ ] .env에 ANTHROPIC_API_KEY 설정
- [ ] llm-router.ts 실제 API 연동 테스트
- [ ] 업종별 템플릿 실제 코드 채우기 (세리온 → 미용실 템플릿 1호)

### Phase 3: 회원가입/DB/크레딧 (3~4일)
- [ ] PostgreSQL 스키마 (User, Credit, Project, Template)
- [ ] 회원가입/로그인 (JWT)
- [ ] 크레딧 충전 → DB 반영 (토스 웹훅)
- [ ] 프로젝트 CRUD

### Phase 4: 코드 다운로드 + 배포 (2~3일)
- [ ] ZIP 다운로드 (생성된 코드)
- [ ] NCP 서버 원클릭 배포
- [ ] 도메인 연결

### Phase 5: 런칭 (2~3일)
- [ ] 테스트 + 버그 수정
- [ ] 도메인 구매 + SSL
- [ ] NCP 배포 (nginx + PM2)
- [ ] 랜딩페이지 최종

## 전략
- **타겟 시장**: 예창패/초창패 합격자 (연간 수천 팀, 사업비로 결제)
- **CAC 전략**: K-Startup, 창진원, 창업보육센터에서 직접 홍보
- **확장 방향**: 세리온(미용실) → 요식업 → 피트니스 → 병원 템플릿
- **장기 비전**: 토스 슈퍼앱 제휴, SaaS + 원스톱 창업 패키지
- **Base44 교훈**: Claude for UI, Gemini for Logic / 모노레포 / LLM 친화적 설계

## 재시작 명령어
```
Launchpad 이어서 작업해줘. memory/MEMORY.md 참고.

[완료] GitHub + UI(5단계) + 테마20종 + NCP배포(175.45.200.162) + 구독제전환(Free/Starter/Pro/Exit) + 템플릿별 고유 데모화면(미용실3+예약3+쇼핑몰3)
[BM] 구독제+Exit Lock-in (Base44전략): Pro월29만→가두리 / Exit1,500만→코드소유권이전
[다음] Anthropic API 키 발급 → AI 연동 → 회원가입/DB → 코드 다운로드 → 도메인+HTTPS
```
