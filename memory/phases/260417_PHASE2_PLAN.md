# 🛠️ Phase 2 — 안정화 (v2 — 촘촘한 그물망)

> **버전:** 2026-04-17 v2 (사장님 요청 재작성)
> **목표:** 무한버그지옥 방지! 흠 없이 매끄럽게
> **소요 시간:** 5일 → **3일 (Phase 0.5로 작업 1/2 대부분 이동)**
> **선행 조건:** Phase 0, 0.5, 1 완료 + 24시간 모니터링 정상

---

## ⚠️ Phase 0.5 영향 (2026-04-17 명탐정 검증 후)

**작업 1 (F4 최적화) + 작업 2 (F6 성공률) 대부분이 Phase 0.5로 선이동:**
- ✅ F4 근본 원인(FRONTEND 프롬프트 ~270줄) → Phase 0.5에서 .md 분리로 해결
- ✅ supabase/client.tsx 템플릿 고정 → Phase 0.5 Step 0.5-10에서 완료

**Phase 2에 남는 작업:**
- 작업 1은 **사후 측정 + 잔여 튜닝**만 (30분)
- 작업 2는 **F6 빌드 재시도 횟수 축소 + 로그 정리**만 (1시간)
- 작업 3~7은 그대로

---

## 🎯 v2 변경점

### v1 약점
- F4/F6 측정 기준 부재
- nginx 설정 백업 없음
- Supabase API 변경 가능성 미체크
- 각 작업 사후 검증 부족

### v2 강점
- **사전 측정** (F4/F6 현재 빈도)
- **nginx 설정 백업 필수**
- **Supabase API 사전 호출**
- **각 작업 끝마다 효과 측정**

### 절대 원칙
1. 각 작업 시작 전 사전 측정
2. 각 작업 끝 효과 검증
3. 모호하면 사장님 호출
4. 운영 중인 nginx 직접 수정 시 백업 필수

---

## 📋 7개 작업 흐름 (Phase 0.5 반영 후)

```
[작업 1] F4 잘림 사후 측정 + 잔여 튜닝 (30분) ⭐ 축소! (Phase 0.5 선해결)
[작업 2] F6 빌드 재시도 축소 + 로그 (1시간) ⭐ 축소! (Phase 0.5 선해결)
[작업 3] 404 → 로딩 화면 (4시간, 5단계)
[작업 4] Supabase 이름 충돌 해결 (4시간) ⭐ 축소! (Storage는 0.5에서 해결)
[작업 5] 회의 사이드바 (4시간, 4단계)
[작업 6] 생성 단계 표시 (4시간, 4단계)
[작업 7] 패키지/소셜 숨김 (30분, 3단계)
```

---

## 🚨 정황

### F4 잘림 — 어제 심사위원 케이스
```
30파일 생성 중 F4 8건
매 발생: 5~30초 + Haiku 폴백
사용자 영향: 일부 기능 죽음
```

### F6 빌드 실패 — supabase/client.tsx
```
매번 잘려서 빌드 실패 → F6 자동 수정
시간 낭비 + 비용
```

### 404 화면 — 심사위원 발견!
```
4/16 15:08 빌드 중 외부 URL 접속 → nginx 404
첫인상 망침
```

### Supabase 이슈
- 이름 충돌: 같은 이름 재생성 시 에러
- Storage 404: 이미지 업로드 안 됨 (Phase 1 Vision과 직결!)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 1 — F4 잘림 사후 측정 + 잔여 튜닝 (30분) ⭐ 축소!
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚠️ Phase 0.5 이전 완료 사항
- ✅ 프롬프트 .md 분리 (FRONTEND 270줄 → 110줄)
- ✅ 파일당 300줄 제한 (core.md)
- ✅ 페이지 타입별 최적화된 프롬프트
- ✅ F4 풀 E2E 측정: < 3건 달성 (Step 0.5-15)

## Phase 2 잔여 작업
- 실사용자 데이터로 F4 발생률 재측정
- .md 튜닝 필요 케이스 발견 시 소폭 수정

## 🚦 Step 2-1-0: 사전 측정 (30분, 기존 1시간 → 축소)

### 목적
Phase 0.5 이후 실사용자 앱 10개 기준 F4 발생률 확인.

### 측정

```bash
# 최근 10개 앱 생성의 F4 빈도 (서버 로그)
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
echo "[최근 F4 발생 (50건)]"
pm2 logs launchpad-api --lines 5000 --nostream 2>&1 | grep -E "F4 이어서 생성|잘린 파일 감지" | tail -50

echo ""
echo "[프로젝트별 F4 카운트]"
pm2 logs launchpad-api --lines 10000 --nostream 2>&1 | \
  grep "F4 이어서 생성" | \
  awk -F'[][]' '{print $2}' | sort | uniq -c | sort -rn | head -10
EOF
```

### 기록

```
Phase 2 시작 시 F4 측정:
- 최근 10개 앱 평균: __개
- 최대 발생 앱: __개
- 가장 자주 잘리는 파일: __

목표: 평균 70% 감소 (예: 7~10건 → 2~3건)
```

### ✅ 진행 조건
- [ ] 측정값 기록됨

---

## 🚦 Step 2-1-1: 프롬프트 수정 (3시간)

### 파일: `api/src/ai/ai.service.ts` PAGE_GENERATION_SYSTEM_PROMPT

### 추가할 내용

```typescript
const PAGE_GENERATION_SYSTEM_PROMPT = `
... (기존 프롬프트)

⚠️ 파일 크기 제한 규칙 (필수!)
1. 한 파일 최대 200줄 이하
2. 200줄 초과 예상 → 컴포넌트 분리
3. 분리 예시:
   - page.tsx (메인) → page.tsx + components/HeaderSection.tsx + components/MainContent.tsx
   - form.tsx → form.tsx + components/FormFields.tsx + components/FormButtons.tsx
4. 분리 기준:
   - 50줄 이상 JSX 블록 → 별도 컴포넌트
   - 재사용 UI → 별도 컴포넌트
   - 복잡한 로직 → 별도 hook 또는 util

⚠️ max_tokens 제한 때문에 파일 잘리면 안 됩니다!
가능한 짧고 명확하게.
`;
```

### Edit
정확한 매칭으로 PAGE_GENERATION_SYSTEM_PROMPT 끝부분에 추가.

---

## 🚦 Step 2-1-2: max_tokens 상향 검토 (사장님 승인) (1시간)

### 파일: `api/src/llm-router.ts`

```diff
standard: { ..., maxTokens: 16384 },
premium: { ..., maxTokens: 16384 },
```

```diff
standard: { ..., maxTokens: 32768 },  // 2배 상향
premium: { ..., maxTokens: 32768 },
```

### 위험 평가
- 비용 증가: ~10% (사장님 결정 필요!)
- F4 빈도 감소 예상

### 사장님 보고
"max_tokens 16k → 32k 상향 검토. 비용 ~10% 증가 vs F4 감소 효과. 진행할까요?"

---

## 🚦 Step 2-1-3: 컴포넌트 분리 가이드 강화 (2시간)

### ARCHITECTURE_SYSTEM_PROMPT 수정

```typescript
[페이지 설계 시 필수]
각 페이지는 다음 구조로 분리:
- page.tsx (라우팅 + 데이터 로딩)
- components/{PageName}Header.tsx
- components/{PageName}Body.tsx
- components/{PageName}Actions.tsx (버튼, 모달)

이렇게 분리하면 각 파일 100줄 이하로.
```

---

## 🚦 Step 2-1-4: tsc 검증 (5분)

---

## 🚦 Step 2-1-5: ✅ 부분 배포 + 효과 측정 (1시간)

### 사장님 브리핑 + 배포

### 효과 측정 (테스트 앱 5개 생성)

```bash
# 새 측정값
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "pm2 logs launchpad-api --lines 5000 --nostream 2>&1 | \
   grep 'F4 이어서 생성' | tail -50"
```

### ✅ 진행 조건
- [ ] F4 평균 50% 이상 감소 (목표 70%)
- [ ] 빌드 시간 단축

### ❌ 효과 미달 시
- 사장님 보고
- 추가 프롬프트 강화 검토

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 2 — F6 빌드 재시도 축소 + 로그 (1시간) ⭐ 축소!
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚠️ Phase 0.5 이전 완료 사항
- ✅ supabase/client.tsx 고정 템플릿 (ENHANCEMENT #9 근본 해결)
- ✅ F6 주요 원인(supabase client 잘림) 제거됨

## Phase 2 잔여 작업
- F6 재시도 한도 3회 → 2회로 축소 (불필요한 대기 시간 절감)
- F6 로그 정리 (어떤 파일이 빌드 실패시켰는지 명확히)

## 🚦 Step 2-2-0: 사전 측정 (30분)

```bash
# 최근 빌드 1차 성공률
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
echo "[next build 결과]"
pm2 logs launchpad-api --lines 10000 --nostream 2>&1 | \
  grep -E "next build (완료|실패)" | tail -30

echo ""
echo "[F6 자동 수정 발생]"
pm2 logs launchpad-api --lines 10000 --nostream 2>&1 | \
  grep "F6.*수정" | wc -l
EOF
```

### 기록
```
F6 사전 측정:
- 최근 30개 빌드 1차 성공률: __%
- F6 자동 수정 횟수: __

목표: 1차 성공률 60% → 90%
```

---

## 🚦 Step 2-2-1: supabase/client.tsx 템플릿 (4시간)

### 파일: `api/src/ai/templates/supabase-client-template.ts` (신규)

```typescript
export const SUPABASE_CLIENT_TEMPLATE = `'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
`;
```

### ai.service.ts에서 적용

```typescript
import { SUPABASE_CLIENT_TEMPLATE } from './templates/supabase-client-template';

// 생성 후 처리
const filesWithClient = [
  ...generatedFiles.filter(f => f.path !== 'src/utils/supabase/client.tsx'),
  { path: 'src/utils/supabase/client.tsx', content: SUPABASE_CLIENT_TEMPLATE },
];
```

---

## 🚦 Step 2-2-2: AI 프롬프트에서 supabase/client 제외 (2시간)

```typescript
const PAGE_GENERATION_SYSTEM_PROMPT = `
...
⚠️ supabase/client.tsx는 자동 생성됩니다.
직접 만들지 마세요. 다른 파일에서 import만:

import { createClient } from '@/utils/supabase/client';
`;
```

---

## 🚦 Step 2-2-3: tsc 검증

---

## 🚦 Step 2-2-4: ✅ 부분 배포 + 효과 측정

테스트 앱 10개 생성 후:
- 빌드 1차 성공률 측정
- 목표: 80% 이상

---

## 🚦 Step 2-2-5: 추가 보강 (필요 시)

다른 자주 잘리는 파일도 템플릿화 검토.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 3 — 404 → 로딩 화면 (4시간, 5단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 2-3-0: nginx 설정 백업 ⭐ 필수! (10분)

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
TS=$(date +%Y%m%d_%H%M%S)
cp -r /etc/nginx/conf.d /root/backup_nginx_${TS}/
ls -la /root/backup_nginx_${TS}/
EOF
```

### ✅ 진행 조건
- [ ] nginx 백업 폴더 존재

---

## 🚦 Step 2-3-1: 정적 로딩 페이지 (1시간)

### 서버에 직접 생성: `/var/www/apps/_loading/index.html`

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
mkdir -p /var/www/apps/_loading
cat > /var/www/apps/_loading/index.html << 'HTML'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>앱 준비 중 - Foundry</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      text-align: center;
    }
    .container { max-width: 500px; padding: 40px; }
    .emoji { font-size: 80px; animation: bounce 2s infinite; }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
    h1 { font-size: 32px; margin: 20px 0; }
    p { font-size: 18px; opacity: 0.9; }
    .progress {
      width: 100%; height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px; overflow: hidden; margin: 30px 0;
    }
    .progress-bar {
      height: 100%; background: white;
      animation: progress 3s ease-in-out infinite;
    }
    @keyframes progress {
      0% { width: 10%; margin-left: 0; }
      50% { width: 50%; margin-left: 25%; }
      100% { width: 10%; margin-left: 90%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">⚙️</div>
    <h1>앱을 준비하고 있어요!</h1>
    <div class="progress"><div class="progress-bar"></div></div>
    <p>잠시만 기다려주세요. 1~2분 안에 완성됩니다.</p>
    <p style="font-size: 14px; opacity: 0.7; margin-top: 30px;">Foundry — AI MVP 빌더</p>
  </div>
  <script>
    setTimeout(() => location.reload(), 10000);
  </script>
</body>
</html>
HTML
ls -la /var/www/apps/_loading/
EOF
```

---

## 🚦 Step 2-3-2: nginx 설정 수정 (1시간)

### 현재 와일드카드 설정 확인

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "cat /etc/nginx/conf.d/wildcard-apps.conf 2>/dev/null || \
   cat /etc/nginx/sites-available/* 2>/dev/null | grep -A 30 'foundry.ai.kr'"
```

### 수정 (try_files 추가)

```nginx
server {
  listen 443 ssl;
  server_name ~^(?<subdomain>.+)\.foundry\.ai\.kr$;
  
  ssl_certificate /etc/letsencrypt/live/foundry.ai.kr-0001/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/foundry.ai.kr-0001/privkey.pem;
  
  root /var/www/apps/$subdomain;
  index index.html;
  
  # 폴더/파일 없으면 → 로딩 페이지
  try_files $uri $uri/ /var/www/apps/_loading/index.html;
  
  error_page 404 = @loading;
  
  location @loading {
    root /var/www/apps/_loading;
    try_files /index.html =500;
  }
}
```

---

## 🚦 Step 2-3-3: nginx 검증 + 재시작 (30분)

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
echo "[설정 검증]"
nginx -t

echo ""
echo "[재시작]"
nginx -s reload

echo ""
echo "[상태]"
systemctl status nginx | head -10
EOF
```

### ❌ nginx -t 실패 시
- 즉시 백업으로 복원: `cp -r /root/backup_nginx_*/  /etc/nginx/conf.d/`
- 사장님 보고

---

## 🚦 Step 2-3-4: ✅ 검증 (30분)

```bash
# 존재하지 않는 서브도메인 → 로딩 화면
curl -I https://nonexistent-test-12345.foundry.ai.kr
# 예상: 200 OK + 로딩 페이지 응답

# 실제 앱 → 정상 작동
curl -I https://app-be40.foundry.ai.kr
# 예상: 200 OK + 진짜 앱
```

### ✅ 진행 조건
- [ ] 존재 X 서브도메인 → 로딩 화면
- [ ] 실제 앱 → 정상

---

## 🚦 Step 2-3-5: 사장님 시연 (10분)

브라우저에서:
1. 존재 안 하는 서브도메인 접속 → 로딩 화면 ✅
2. 실제 앱 접속 → 정상 ✅

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 4 — Supabase 이슈 (1일, 6단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 2-4-0: Supabase API 사전 호출 ⭐ 신규! (30분)

### 목적
Management API 동작 확인.

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
PAT=$(grep '^SUPABASE_PAT=' /root/launchpad/api/.env | cut -d= -f2 | tr -d '"')

echo "[프로젝트 목록]"
curl -s -H "Authorization: Bearer ${PAT}" \
  https://api.supabase.com/v1/projects | head -c 500

echo ""
echo "[Storage API (특정 프로젝트)]"
PROJECT_REF="cvyhqsfmdzfapqnecmrq"  # MediTracker 예시
curl -s -X GET "https://${PROJECT_REF}.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer ${PAT}" \
  -H "apikey: ${PAT}" | head -c 500
EOF
```

---

## 🚦 Step 2-4-1: 이름 충돌 해결 (4시간)

### 파일: `api/src/ai/supabase-provisioner.service.ts` (수정)

```typescript
async provisionProject(projectName: string): Promise<SupabaseProject> {
  // 1. 기존 프로젝트 검색
  const existing = await this.findExistingProject(projectName);
  if (existing) {
    this.logger.log(`기존 Supabase 프로젝트 재사용: ${existing.id}`);
    return existing;
  }
  
  // 2. 새 프로젝트 생성
  return this.createNewProject(projectName);
}

async findExistingProject(name: string): Promise<SupabaseProject | null> {
  const response = await fetch(
    'https://api.supabase.com/v1/projects',
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_PAT}` } }
  );
  const projects = await response.json();
  return projects.find((p: any) => p.name === name) || null;
}
```

---

## 🚦 Step 2-4-2: Storage 버킷 디버깅 (3시간)

### 현재 코드 확인

```bash
grep -rn "storage/v1/bucket\|createBucket" api/src/ | head -10
```

### 올바른 엔드포인트 + 권한

```typescript
const response = await fetch(
  `https://${projectRef}.supabase.co/storage/v1/bucket`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,  // anon key X, service_role O!
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'images',
      public: true,
    }),
  }
);
```

---

## 🚦 Step 2-4-3: tsc 검증

---

## 🚦 Step 2-4-4: ✅ 부분 배포 + E2E

### 시나리오
1. 이미 존재하는 이름으로 앱 생성 → 재사용 메시지
2. Storage 버킷 생성 → 정상
3. 이미지 업로드 → 정상

---

## 🚦 Step 2-4-5: Phase 1C와 시너지

Storage 작동하면 Phase 1C Vision 정상 작동 → 검증.

---

## 🚦 Step 2-4-6: 사장님 보고

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 5 — 회의 사이드바 (4시간, 4단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 2-5-1: 사이드바 컴포넌트 (3시간)

### `web/src/app/meeting/components/MeetingSidebar.tsx` (신규)

```typescript
'use client';
export default function MeetingSidebar({ onSelectMeeting }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  
  useEffect(() => {
    authFetch('/ai/meeting-history').then(r => r.json()).then(setMeetings);
  }, []);
  
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} border-r bg-[var(--bg-secondary)] transition-all`}>
      <div className="p-4 border-b flex justify-between">
        {!collapsed && <h2 className="font-bold">회의 히스토리</h2>}
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
        </button>
      </div>
      
      <button className="w-full p-3 bg-blue-600 text-white">
        + 새 회의
      </button>
      
      <ul className="overflow-y-auto">
        {meetings.map(m => (
          <li 
            key={m.id} 
            onClick={() => onSelectMeeting(m.id)}
            className="p-3 hover:bg-[var(--bg-elevated)] cursor-pointer border-b"
          >
            {!collapsed && (
              <>
                <div className="font-semibold truncate">{m.title}</div>
                <div className="text-xs text-gray-500">{formatDate(m.createdAt)}</div>
              </>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

---

## 🚦 Step 2-5-2: meeting 페이지 통합 (1시간)

```typescript
// web/src/app/meeting/page.tsx
return (
  <div className="flex h-screen">
    <MeetingSidebar onSelectMeeting={loadMeeting} />
    <main className="flex-1">
      {/* 기존 회의 컨텐츠 */}
    </main>
  </div>
);
```

---

## 🚦 Step 2-5-3: tsc 검증

---

## 🚦 Step 2-5-4: ✅ 배포 + 검증

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 6 — 생성 단계 표시 (4시간, 4단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 2-6-1: SSE 진행 단계 명시 (2시간)

### `api/src/ai/ai.service.ts` (이미 emit 있음, 확장)

```typescript
emitter?.emit('progress', { 
  step: 'architecture', 
  step_label: '🎨 1/5: 아키텍처 설계 중...',
  progress: '1/5', 
  detail: '페이지 구조와 DB 스키마를 결정하고 있어요',
  fileCount: 0 
});

// 5단계:
// 1/5: 🎨 아키텍처 설계
// 2/5: 🗄️ DB 스키마 생성
// 2.5/5: ☁️ Supabase 프로젝트 생성
// 3/5: 📄 페이지 생성 (X/30)
// 4/5: ⚙️ 설정 파일 + 코드 검증
// 5/5: 🚀 빌드 + 배포
```

---

## 🚦 Step 2-6-2: 프론트 표시 (2시간)

### `web/src/app/builder/page.tsx`

```typescript
const handleProgress = (event) => {
  const data = JSON.parse(event.data);
  setBuildProgress({
    step_label: data.step_label,
    detail: data.detail,
    progress: data.progress,
    fileCount: data.fileCount,
  });
};

{buildPhase === 'generating' && buildProgress && (
  <div className="progress-card">
    <h3>{buildProgress.step_label}</h3>
    <p className="text-sm">{buildProgress.detail}</p>
    <div className="progress-bar">
      <div style={{ width: `${(buildProgress.fileCount / 30) * 100}%` }} />
    </div>
    <p className="text-xs">파일 {buildProgress.fileCount} / 30</p>
  </div>
)}
```

---

## 🚦 Step 2-6-3: tsc 검증

---

## 🚦 Step 2-6-4: ✅ 배포 + 시연

사장님이 직접 앱 1개 생성 → 단계별 표시 확인.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 작업 7 — 패키지/소셜 숨김 (30분, 3단계)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚦 Step 2-7-1: 독립 패키지 가격 숨김 (15분)

### `web/src/app/dashboard/page.tsx`

```typescript
{INDEPENDENCE_PACKAGES.map(pkg => (
  <div className="package-card opacity-60">
    <h3>{pkg.label}</h3>
    <p className="text-gray-500">준비 중</p>
    {/* 가격 숨김 */}
  </div>
))}
```

---

## 🚦 Step 2-7-2: 소셜 로그인 숨김 (10분)

### `web/src/app/login/page.tsx`

```typescript
{/* TODO: 카카오 비즈앱 승인 후 재활성화 (Phase 3 작업 6)
<button>카카오로 로그인</button>
<button>네이버로 로그인</button>
*/}
```

---

## 🚦 Step 2-7-3: tsc + 배포 (5분)

---

# 🆘 Phase 2 비상 롤백

## 작업 단위
```bash
git revert <작업 커밋>
git push origin main
```

## nginx 롤백
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "cp -r /root/backup_nginx_*/  /etc/nginx/conf.d/ && nginx -s reload"
```

---

# ✅ Phase 2 완료 체크리스트

## 작업 1 (F4)
- [ ] 2-1-0. 사전 측정 ⭐
- [ ] 2-1-1. 프롬프트 수정
- [ ] 2-1-2. max_tokens 검토
- [ ] 2-1-3. 분리 가이드
- [ ] 2-1-4. tsc
- [ ] 2-1-5. 배포 + 효과 측정 (50%+ 감소)

## 작업 2 (F6)
- [ ] 2-2-0. 사전 측정
- [ ] 2-2-1. supabase 템플릿
- [ ] 2-2-2. 프롬프트 제외
- [ ] 2-2-3. tsc
- [ ] 2-2-4. 배포 + 효과 (1차 80%+)
- [ ] 2-2-5. 추가 보강

## 작업 3 (404)
- [ ] 2-3-0. nginx 백업 ⭐
- [ ] 2-3-1. 로딩 페이지
- [ ] 2-3-2. nginx 설정
- [ ] 2-3-3. 재시작
- [ ] 2-3-4. 검증
- [ ] 2-3-5. 사장님 시연

## 작업 4 (Supabase)
- [ ] 2-4-0. API 사전 호출 ⭐
- [ ] 2-4-1. 이름 충돌
- [ ] 2-4-2. Storage 디버깅
- [ ] 2-4-3. tsc
- [ ] 2-4-4. 배포 + E2E
- [ ] 2-4-5. Phase 1C 시너지
- [ ] 2-4-6. 사장님 보고

## 작업 5 (사이드바)
- [ ] 2-5-1. 컴포넌트
- [ ] 2-5-2. 통합
- [ ] 2-5-3. tsc
- [ ] 2-5-4. 배포

## 작업 6 (단계 표시)
- [ ] 2-6-1. SSE 단계 명시
- [ ] 2-6-2. 프론트 표시
- [ ] 2-6-3. tsc
- [ ] 2-6-4. 시연

## 작업 7 (숨김)
- [ ] 2-7-1. 독립 패키지
- [ ] 2-7-2. 소셜 로그인
- [ ] 2-7-3. tsc + 배포

## 효과 측정
- [ ] F4 평균 50%+ 감소
- [ ] F6 1차 80%+ 성공
- [ ] 404 → 로딩 화면
- [ ] Supabase 정상

---

# 🚨 자비스 절대 금지 (Phase 2)

1. **사전 측정 없이 진행 X** (효과 비교 불가)
2. **nginx 백업 없이 수정 X** (장애 위험)
3. **Supabase API 변경 가정 X** (실제 호출)
4. **각 작업 후 효과 측정 필수**

---

**작성:** 자비스 mk9+ (2026-04-17 v2)
**핵심:** 측정 + 검증 + 효과 비교
