# KPN PG 단건결제 연동 명령서
> 작성: 2026-04-08 (자비스 mk8+ 세션)
> 이 명령서는 새 세션에서 KPN PG 결제 연동할 때 사용하는 상세 설명서입니다.

---

## 필수 선행 파일 읽기!!

이 순서대로 읽고 시작:
1. `memory/BASICS.md` — 서버/계정/기술스택/배포 방식
2. `memory/MEMORY.md` — Foundry 장기 기억 (상단 100줄만)
3. **이 파일** — KPN PG 연동 명령서

---

## 프로젝트 정보

- **프로젝트**: Foundry (AI MVP 빌더) — AI로 웹앱을 자동 생성하는 SaaS
- **경로**: `/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/`
- **프론트**: `web/` (Next.js 16 App Router, TypeScript, Tailwind v4)
- **백엔드**: `api/` (NestJS, Prisma 6.x, PostgreSQL)
- **서버**: 175.45.200.162 (SSH 포트 3181)
- **배포**: `git push` → GitHub Actions 자동배포 (SSH 직접 배포 X)
- **도메인**: foundry.ai.kr

---

## 배경 — 왜 이 작업을 하는가

### 현재 상태
- Foundry에서 고객이 크레딧을 충전하려면 **결제 수단이 없음**
- /credits 페이지에 패키지가 있지만, 결제 버튼 누르면 **"문의해주세요" 모달**만 뜸
- 기존에 토스페이먼츠 연동 코드가 구현되어 있었으나 **토스는 세리온 POS용**
- **파운더리는 KPN PG**로 결제 연동 진행 (KPN 내부 검토 완료, 계약 진행 중)

### 목표
- KPN PG JavaScript SDK 연동 → 크레딧 충전 시 **실제 카드결제** 가능
- 개발계(테스트) 환경에서 먼저 연동 + 테스트 완료
- KPN에 테스트 결과 전달 → 카드사 심사 진행

### 결제 플로우 (완성 후)
```
고객이 /credits에서 패키지 선택 (49,000원 / 149,000원 / 299,000원)
  ↓
"충전하기" 버튼 클릭
  ↓
KPN 결제창 팝업 (카드/카카오페이/네이버페이/토스페이 등)
  ↓
고객이 결제 완료
  ↓
KPN 인증 완료 → returnUrl로 리다이렉트 (인증 데이터 전달)
  ↓
백엔드에서 KPN 승인 API 호출 → 승인 성공
  ↓
크레딧 자동 충전 + DB 기록
  ↓
고객에게 "충전 완료!" 표시
```

---

## KPN PG API 정보 (연동 가이드 PDF 기반)

### 엔드포인트
| 환경 | URL |
|------|-----|
| **개발계 (테스트)** | https://dev.firstpay.co.kr |
| 운영계 (실서비스) | https://pay.firstpay.co.kr |

### 테스트 계정
| 항목 | 값 |
|------|-----|
| mxId (가맹점 ID) | `testcorp` |
| passKey | `6aMoJujE34XnL9gvUqdKGMqs9GzYaNo6` |

⚠️ 운영 계정(실제 가맹점 ID + passKey)은 KPN 계약 후 별도 발급됨.
지금은 테스트 계정으로 개발!

### 방화벽
| 연결 대상 | 포트 | 방향 |
|----------|------|------|
| 210.182.8.123 / 222.110.146.236 | 443 | OUTBOUND (결제서비스) |
| 210.182.8.137 / 222.110.146.137 | 443 | INBOUND (입금통보) |

### 기술지원
- 이메일: eCommSolutionTeam@kpn.co.kr
- 연동 문의 시: 연동 환경, 가맹점 아이디, 주문번호, 거래시간, 호출 URL 포함

---

## 단건 결제 Flow (8단계)

```
사용자         가맹점(Foundry)        KPN 인증         KPN 승인
  │                │                    │                │
  │─1.결제시작────→│                    │                │
  │                │─2.결제화면호출────→│                │
  │                │                    │─3.인증요청───→│
  │                │                    │←4.인증완료────│
  │                │←5.인증완료(리턴)──│                │
  │                │─────────6.승인요청─────────────────→│
  │                │←────────7.승인응답─────────────────│
  │←8.결제완료────│                    │                │
```

---

## 작업 순서 (이 순서 지켜!!)

### Phase 1: 백엔드 — KPN 결제 서비스 (1시간)
| # | 작업 | 파일 |
|---|------|------|
| 1 | KPN 결제 서비스 파일 신규 생성 | api/src/credit/kpn-payment.service.ts |
| 2 | 환경변수 추가 (.env) | api/.env |
| 3 | credit.controller.ts에 KPN 전용 엔드포인트 추가 | api/src/credit/credit.controller.ts |
| 4 | credit.module.ts에 서비스 등록 | api/src/credit/credit.module.ts |

### Phase 2: 프론트엔드 — KPN SDK 연동 (1시간)
| # | 작업 | 파일 |
|---|------|------|
| 5 | /credits 페이지에서 토스 → KPN SDK로 교체 | web/src/app/credits/page.tsx |
| 6 | /credits/success 페이지 수정 (KPN 승인 처리) | web/src/app/credits/success/page.tsx |
| 7 | 환경변수 추가 | web/.env.local |

### Phase 3: 테스트 + 배포 (30분)
| # | 작업 |
|---|------|
| 8 | 로컬에서 테스트 결제 |
| 9 | tsc 에러 0 확인 |
| 10 | 사장님 확인 → 배포 |

---

## Phase 1: 백엔드 구현

### 1-1. KPN 결제 서비스 (신규 파일)

**파일**: `api/src/credit/kpn-payment.service.ts`

이 서비스가 하는 일:
- callHash 생성 (SHA256)
- 주문번호 생성
- KPN 승인 API 호출
- 취소 API 호출

```typescript
// 핵심 메서드:

// 1. callHash 생성
// SHA256(mxId + mxIssueNo + amount + passKey)
generateCallHash(mxId: string, mxIssueNo: string, amount: number, passKey: string): string

// 2. 승인 요청
// POST {approvalUrl} (인증 응답에서 받은 URL)
// Body: { mxId, mxIssueNo, fdTid, callHash }
// callHash = SHA256(mxId + mxIssueNo + passKey)  ← 승인 시에는 amount 없음!
async confirmPayment(params: { mxId, mxIssueNo, fdTid, approvalUrl }): Promise<KpnApprovalResponse>

// 3. 취소 요청
// POST {EndPoint}/cancel
// Body: { payMethod, mxId, mxIssueNo, mxIssueDate, amount, callHash }
// callHash = SHA256(mxId + mxIssueNo + amount + passKey)
async cancelPayment(params: { mxId, mxIssueNo, mxIssueDate, amount }): Promise<KpnCancelResponse>
```

### 1-2. 환경변수

**파일**: `api/.env` (서버에도 동일하게 설정!)

```
# KPN PG (개발계)
KPN_MX_ID=testcorp
KPN_PASS_KEY=6aMoJujE34XnL9gvUqdKGMqs9GzYaNo6
KPN_ENDPOINT=https://dev.firstpay.co.kr
```

⚠️ 운영 전환 시 이 3개 값만 바꾸면 됨 (운영 가맹점 ID + passKey + 운영 URL)

### 1-3. 컨트롤러 엔드포인트 추가

**파일**: `api/src/credit/credit.controller.ts`

기존 `confirm-payment` (토스용, 라인 61~122)은 **그대로 두고**, KPN 전용 엔드포인트 추가:

```
POST /credits/kpn-confirm   ← KPN 승인 요청
POST /credits/kpn-cancel    ← KPN 취소 요청 (나중에 필요 시)
```

#### POST /credits/kpn-confirm

프론트에서 KPN 인증 완료 후 호출. 처리 흐름:

```
1. 요청 받기: { mxIssueNo, fdTid, approvalUrl, amount, packageId }
2. 패키지 가격 검증 (amount와 패키지 가격 일치 확인)
3. 중복 결제 방지 (mxIssueNo로 CreditTransaction 조회)
4. KPN 승인 API 호출 (kpnPaymentService.confirmPayment)
5. 응답의 replyCode === '0000' 확인 (성공)
6. 크레딧 충전 (creditService.charge)
7. CreditTransaction 기록 (paymentRefId = KPN tid)
8. 응답: { balance, charged, package }
```

### 1-4. 모듈 등록

**파일**: `api/src/credit/credit.module.ts`

- `KpnPaymentService`를 providers에 추가

---

## Phase 2: 프론트엔드 구현

### 2-1. /credits 페이지 수정 (토스 → KPN)

**파일**: `web/src/app/credits/page.tsx`

#### 현재 코드 (라인 124~164, handlePurchase 함수):
- 토스페이먼츠 SDK 로드 → `payment.requestPayment()` 호출
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` 없으면 → "문의" 모달 표시

#### 수정 방향:
토스 SDK 코드를 **KPN SDK 코드로 교체**

```typescript
// KPN SDK 로드 (layout.tsx 또는 page.tsx의 <Script>)
// <script src="https://dev.firstpay.co.kr/js/firstpay_v2.js"></script>

async function handlePurchase(pkgId: string) {
  if (!user) { router.push('/login'); return; }
  if (!agreedTerms || !agreedRefund) {
    alert('이용약관과 환불 규정에 동의해주세요.');
    return;
  }

  const pkg = packages.find(p => p.id === pkgId);
  if (!pkg) return;

  // 주문번호 생성
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const mxIssueNo = `credit-${pkgId}-${Date.now()}`;
  const mxIssueDate = dateStr;

  // callHash 생성 (SHA256)
  // SHA256(mxId + mxIssueNo + amount + passKey)
  const mxId = process.env.NEXT_PUBLIC_KPN_MX_ID || 'testcorp';
  const passKey = process.env.NEXT_PUBLIC_KPN_PASS_KEY || '';
  const callHash = await sha256(`${mxId}${mxIssueNo}${pkg.price}${passKey}`);

  // KPN SDK 호출
  const pay = new (window as any).FirstPay({
    env: process.env.NEXT_PUBLIC_KPN_ENV || 'develop',  // 'develop' | 'production'
    openType: 'popup',
    onFailure: (error: any) => {
      console.error(`[${error.code}] ${error.message}`);
      alert(`결제 요청 실패: ${error.message}`);
    }
  });

  pay.goPay({
    mxId,
    mxIssueNo,
    mxIssueDate,
    orderName: `Foundry ${pkg.name} (${pkg.credits.toLocaleString()}cr)`,
    amount: pkg.price,
    custName: user.name || '',
    email: user.email || '',
    returnUrl: `${window.location.origin}/credits/success?pkg=${pkgId}`,
    callHash,
  });
}
```

#### SHA256 유틸 함수 (Web Crypto API 사용)
```typescript
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

#### KPN SDK 스크립트 로드
page.tsx 상단 또는 layout.tsx에 추가:
```typescript
import Script from 'next/script';
// ...
<Script src={`${process.env.NEXT_PUBLIC_KPN_ENDPOINT || 'https://dev.firstpay.co.kr'}/js/firstpay_v2.js`} strategy="beforeInteractive" />
```

### 2-2. /credits/success 페이지 수정

**파일**: `web/src/app/credits/success/page.tsx`

#### 현재 코드 (라인 36~42):
토스페이먼츠 confirm API 호출

#### 수정 방향:
KPN은 returnUrl로 **Form Submit** (POST가 아니라 GET params 또는 form data)으로 인증 결과가 전달됨.

```
KPN 인증 완료 → returnUrl로 리다이렉트
→ URL params: mxId, mxIssueNo, mxIssueDate, amount, mallApReserved, code, message, fdTid, approvalUrl
→ code === '0000' 이면 인증 성공
→ fdTid + approvalUrl을 백엔드에 보내서 승인 요청
```

```typescript
// success/page.tsx 수정

useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  const code = params.get('code');
  const mxIssueNo = params.get('mxIssueNo');
  const fdTid = params.get('fdTid');
  const approvalUrl = params.get('approvalUrl');
  const amount = params.get('amount');
  const pkg = params.get('pkg'); // mallApReserved에서 패키지 ID 추출

  if (code !== '0000') {
    setError(params.get('message') || '인증에 실패했습니다.');
    return;
  }

  // 백엔드에 승인 요청
  authFetch('/credits/kpn-confirm', {
    method: 'POST',
    body: JSON.stringify({
      mxIssueNo,
      fdTid,
      approvalUrl,
      amount: Number(amount),
      packageId: pkg,
    }),
  })
  .then(res => res.json())
  .then(data => {
    setCharged(data.charged);
    setBalance(data.balance);
  })
  .catch(err => {
    setError('결제 승인에 실패했습니다. 고객센터에 문의해주세요.');
  });
}, []);
```

### 2-3. 프론트 환경변수

**파일**: `web/.env.local` (서버에도 동일하게!)

```
NEXT_PUBLIC_KPN_MX_ID=testcorp
NEXT_PUBLIC_KPN_PASS_KEY=6aMoJujE34XnL9gvUqdKGMqs9GzYaNo6
NEXT_PUBLIC_KPN_ENDPOINT=https://dev.firstpay.co.kr
NEXT_PUBLIC_KPN_ENV=develop
```

⚠️ **passKey를 프론트에 노출하면 안 됨!**
→ callHash 생성을 **백엔드 API로 이동**하는 것을 강력 권장.
→ `POST /credits/kpn-prepare` → { callHash, mxIssueNo, mxIssueDate } 반환
→ 프론트는 이 값을 받아서 SDK에 전달만 하면 됨.

### 보안 개선: callHash 백엔드 생성 (권장!)

```
[프론트]                              [백엔드]
패키지 선택 + "충전하기" 클릭
  ↓
POST /credits/kpn-prepare
{ packageId: "standard" }
  ↓                                   → mxIssueNo 생성
                                      → mxIssueDate 생성
                                      → callHash = SHA256(mxId + mxIssueNo + amount + passKey)
  ← { mxIssueNo, mxIssueDate, callHash, mxId, amount, orderName }
  ↓
KPN SDK goPay({ ...받은 값들, returnUrl })
```

이렇게 하면 **passKey가 프론트에 노출되지 않음!**

---

## Phase 3: 테스트 + 배포

### 테스트 체크리스트
- [ ] /credits 페이지에서 패키지 선택 → KPN 결제창 팝업 뜨는지
- [ ] 테스트 카드로 결제 → 인증 성공 → /credits/success로 리다이렉트
- [ ] 승인 API 호출 → replyCode '0000' 확인
- [ ] 크레딧 잔액 증가 확인 (DB)
- [ ] CreditTransaction 기록 확인 (DB)
- [ ] 중복 결제 방지 (같은 mxIssueNo로 2번 시도 → 차단)
- [ ] 결제 실패 시 → /credits/fail로 이동 + 에러 메시지 표시
- [ ] tsc 에러 0개

### 배포

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
cd web && npx tsc --noEmit && cd ..
cd api && npx tsc --noEmit && cd ..
# tsc 에러 0 확인!!
# 사장님께 확인받기!!
git add -A
git commit -m "feat: KPN PG 단건결제 연동 (크레딧 충전)"
git push origin main
```

### 서버 환경변수 추가 (배포 후!)
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
# api/.env에 KPN 환경변수 추가
# web/.env.local에 KPN 환경변수 추가
# pm2 restart all
```

**배포 전 사장님께 반드시 확인받을 것!**

---

## 주의사항 — 꼭 읽어!!

### 1. 보안
- **passKey는 백엔드에서만 사용!** 프론트 코드에 하드코딩하면 안 됨
- callHash 생성은 백엔드 API(`/credits/kpn-prepare`)로 구현 권장
- NEXT_PUBLIC_KPN_PASS_KEY를 프론트에 쓰는 건 **테스트 단계에서만 허용**, 운영 전환 시 반드시 백엔드로 이동

### 2. 기존 코드 보존
- 토스페이먼츠 관련 코드 (confirm-payment 등) **삭제하지 말 것** — 세리온에서 사용할 수 있음
- 기존 크레딧 시스템 (charge, deduct, balance) 건드리지 말 것 — 잘 돌아가고 있음
- KPN 전용 엔드포인트를 **별도로 추가**하는 방식

### 3. 개발계 vs 운영계
- 지금은 개발계(dev.firstpay.co.kr) + 테스트 계정(testcorp)으로 개발
- 운영 전환 시: 환경변수 3개만 바꾸면 됨 (mxId, passKey, endpoint URL)
- KPN에서 운영 계정 발급받은 후 전환

### 4. returnUrl
- returnUrl은 **https://foundry.ai.kr/credits/success?pkg={packageId}** 형식
- KPN이 인증 완료 후 이 URL로 form submit (GET params)
- URL에 code, fdTid, approvalUrl 등이 붙어서 옴

### 5. callHash 규칙 (중요!!)
- **결제창 호출 시**: `SHA256(mxId + mxIssueNo + amount + passKey)`
- **승인 요청 시**: `SHA256(mxId + mxIssueNo + passKey)` ← **amount 없음!!**
- **취소 요청 시**: `SHA256(mxId + mxIssueNo + amount + passKey)`
- 이 규칙 틀리면 에러남!

### 6. 승인 요청 URL
- 승인 요청은 **고정 URL이 아님!** 인증 응답에서 받은 `approvalUrl`로 POST
- 이 URL은 매 거래마다 다를 수 있음

---

## 현재 코드 구조 참고 (수정할 파일)

### 프론트엔드
| 파일 | 역할 | 수정 내용 |
|------|------|---------|
| `web/src/app/credits/page.tsx` | 크레딧 충전 페이지 | 토스 SDK → KPN SDK 교체, handlePurchase 수정 |
| `web/src/app/credits/success/page.tsx` | 결제 성공 처리 | 토스 confirm → KPN confirm 교체 |
| `web/src/app/credits/fail/page.tsx` | 결제 실패 처리 | 그대로 사용 가능 |

### 백엔드
| 파일 | 역할 | 수정 내용 |
|------|------|---------|
| `api/src/credit/kpn-payment.service.ts` | **신규** KPN 결제 서비스 | callHash 생성, 승인/취소 API |
| `api/src/credit/credit.controller.ts` | 크레딧 컨트롤러 | `/kpn-prepare`, `/kpn-confirm` 엔드포인트 추가 |
| `api/src/credit/credit.module.ts` | 크레딧 모듈 | KpnPaymentService 등록 |
| `api/src/credit/credit.service.ts` | 크레딧 서비스 | **수정 불필요** (기존 charge/deduct 그대로) |

### 현재 크레딧 패키지 (page.tsx 라인 11~27)
```
lite:     5,000cr  /  49,000원  (9.8원/cr)
standard: 20,000cr / 149,000원  (7.5원/cr) [인기]
pro:      50,000cr / 299,000원  (6.0원/cr) [BEST]
```

### 현재 DB 스키마 (수정 불필요)
- `CreditBalance`: balance, totalCharged, totalUsed
- `CreditTransaction`: type, amount, balanceAfter, paymentRefId, description

paymentRefId에 **KPN tid**를 저장하면 결제 추적 가능.

---

## KPN 기술지원
- 이메일: eCommSolutionTeam@kpn.co.kr
- 연동 문의 시 포함: 연동 환경(개발계), 가맹점 ID(testcorp), 주문번호, 거래시간, 호출 URL
