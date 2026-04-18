# 🛡️ Phase 0 — 안전망 + 마이그레이션 (v2 — 촘촘한 그물망)

> **버전:** 2026-04-17 v2 (사장님 요청으로 재작성)
> **목표:** 무한버그지옥 방지! 단계별 사전 검증 + 명확한 실패 대응
> **소요 시간:** 1.5~3시간 (정상 1.5시간, 검증 포함)
> **세분화 단계:** 26개 (0-1 ~ 0-26)

---

## 🎯 v2의 변경점

### v1 약점
- old_string 매칭 실패 시 무한지옥
- Sonnet 4.6 호환성 미검증
- macOS/Linux 환경 분기 없음
- 단계별 사전 검증 부족

### v2 강점
- **각 단계 전 사전 검증** (실패 조기 발견)
- **각 단계 후 즉시 검증** (다음 단계 진입 조건)
- **자비스 판단 금지 명시** (모호하면 사장님 호출)
- **OS 환경 분기** (macOS/Linux)
- **Sonnet 4.6 사전 호출 검증**
- **사장님 보고 시점 명시**

### 절대 원칙 (자비스 기억!)
1. **사전 검증 통과 못하면 다음 단계 X**
2. **모호하면 추측 X, 사장님 호출 O**
3. **"아마 될 거야" 금지 → 실제 검증 필수**
4. **에러 발생 시 즉시 stop + 보고**
5. **각 Edit 후 즉시 grep/tsc로 확인**

---

## 📋 26단계 흐름

```
[준비] 0-1. 환경 검증
[준비] 0-2. Sonnet 4.6 사전 호출
[준비] 0-3. 백업 3중

[서버 패치] 0-4. DB surrogate
[서버 패치] 0-5. 빨간 배너
[서버 패치] 0-6. 튜토리얼
[서버 패치] 0-7. ✅ 검증

[모델] 0-8. 모델 9곳 치환
[모델] 0-9. ✅ 검증

[4.6 호환] 0-10. prefill 제거
[4.6 호환] 0-11. ✅ 검증
[4.6 호환] 0-12. 400 폴백
[4.6 호환] 0-13. ✅ 검증

[누락 버그] 0-14. selectedFeatures 강제
[누락 버그] 0-15. ✅ 검증

[빌드] 0-16. tsc 1차
[빌드] 0-17. tsc 에러 대응

[배포] 0-18. 사장님 브리핑 + 승인
[배포] 0-19. git commit
[배포] 0-20. git push
[배포] 0-21. Actions 모니터링
[배포] 0-22. 배포 확인

[운영] 0-23. 헬스체크
[운영] 0-24. PM2 확인
[운영] 0-25. E2E 테스트
[운영] 0-26. 모니터링 시작
```

---

# 🚦 Step 0-1: 환경 검증 (5분)

## 목적
macOS/Linux 차이로 sed 등 명령 실패 방지.

## 사전 검증 (반드시 OK!)

```bash
# 1. OS 확인
echo "OS: $OSTYPE"
# 예상: darwin23 (macOS) 또는 linux-gnu

# 2. SSH 키 권한
ls -la ~/.ssh/serion-key.pem
# 예상: -rw------- (600 권한)

# 3. SSH 접속 테스트
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 "echo 'SSH OK'"
# 예상: SSH OK

# 4. gh CLI
gh --version

# 5. 프로젝트 경로
ls "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/.git" > /dev/null && echo "OK" || echo "FAIL"
```

## ✅ 진행 조건
- [ ] OS 확인됨
- [ ] SSH 접속 OK
- [ ] gh CLI 작동
- [ ] 프로젝트 경로 OK

## ❌ 실패 시
- SSH 권한: `chmod 600 ~/.ssh/serion-key.pem`
- gh CLI 없음: `brew install gh && gh auth login`
- 경로 다름: 사장님께 정확한 경로 확인

## 🚨 자비스 절대 금지
- "아마 될 거야"로 진행 X
- 검증 실패하면 즉시 사장님 보고

---

# 🚦 Step 0-2: Sonnet 4.6 호환성 사전 호출 (5분) ⭐ 신규!

## 목적
Sonnet 4.6 모델이 실제 작동하는지 확인. 안 되면 마이그레이션 자체 불가.

## 호출 테스트

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
API_KEY=$(grep '^ANTHROPIC_API_KEY=' /root/launchpad/api/.env | cut -d= -f2 | tr -d '"')
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 50,
    "messages": [{"role":"user","content":"안녕! 한 단어로 답해."}]
  }' | head -c 500
EOF
```

## ✅ 예상 결과
```json
{"id":"msg_xxx","type":"message","role":"assistant",
 "content":[{"type":"text","text":"안녕!"}],
 "model":"claude-sonnet-4-6",
 "usage":{"input_tokens":15,"output_tokens":3}}
```

## ✅ 진행 조건
- [ ] HTTP 200 응답
- [ ] content[0].text 정상
- [ ] model: "claude-sonnet-4-6"

## ❌ 실패 시 대응

### 케이스 1: 404 not_found
```
{"error":{"type":"not_found_error","message":"model: claude-sonnet-4-6"}}
```
→ **모델 이름이 다름!** 즉시 stop, 사장님 보고
→ WebSearch로 정확한 모델 ID 확인

### 케이스 2: 401 unauthorized
→ API 키 만료 → 사장님 보고

### 케이스 3: 400 invalid_request
→ 메시지 분석 + 사장님 보고

## 🚨 절대 금지
- 응답 없는데 "아마 작동" 진행 X
- 모델 이름 임의 변경 X (사장님 승인 필수)

---

# 🚦 Step 0-3: 백업 3중 (15분)

## 목적
사고 시 1분 내 롤백.

## 0-3-A: git 태그

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

# 깨끗한 상태 확인
git status
# 예상: "nothing to commit"
# 변경사항 있으면 → 사장님 보고

git tag -a backup-before-phase0 -m "Phase 0 시작 전 (2026-04-18)"
git push origin backup-before-phase0

# 검증
git tag -l backup-before-phase0
# 예상: backup-before-phase0
```

## 0-3-B: DB 백업

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
TS=$(date +%Y%m%d_%H%M%S)
PGPASSWORD=launchpad1234 pg_dump -U launchpad -h localhost launchpaddb \
  > /root/backup_phase0_${TS}.sql
ls -la /root/backup_phase0_${TS}.sql
EOF
# 예상: 50MB 이상
```

## 0-3-C: .env 백업

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
TS=$(date +%Y%m%d_%H%M%S)
cp /root/launchpad/api/.env /root/backup_env_${TS}.bak
ls -la /root/backup_env_${TS}.bak
EOF
```

## ✅ 진행 조건
- [ ] git tag 존재 (로컬 + 원격)
- [ ] DB 백업 50MB 이상
- [ ] .env 백업 존재

## ❌ 실패 시
- git status 변경사항: 사장님 보고
- DB 백업 실패: 디스크 확인 (`df -h`)
- .env 권한: sudo 필요?

---

# 🚦 Step 0-4: 서버 패치 1 — DB surrogate (10분)

## 0-4-A: 서버 코드 확인

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "sed -n '1395,1402p' /root/launchpad/api/src/ai/ai.service.ts"
```

## ✅ 예상
```typescript
      // ── DB 저장 ───────────────────────────────────
      await this.prisma.project.update({
        where: { id: params.projectId },
        data: {
          generatedCode: JSON.parse(JSON.stringify(allFiles).replace(/[\uD800-\uDFFF]/g, '')) as any,
          status: 'active',
          modelUsed: actualTier,
```

## 0-4-B: 로컬 확인

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
sed -n '1395,1402p' api/src/ai/ai.service.ts
```

## ✅ 예상 (로컬 미패치)
```typescript
          generatedCode: allFiles as any,
```

## 0-4-C: Edit

```
Edit 도구:
  file_path: /Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/api/src/ai/ai.service.ts
  old_string: "          generatedCode: allFiles as any,"
  new_string: "          generatedCode: JSON.parse(JSON.stringify(allFiles).replace(/[\\uD800-\\uDFFF]/g, '')) as any,"
```

## 0-4-D: 즉시 검증

```bash
sed -n '1399p' api/src/ai/ai.service.ts
# 예상: 변경된 코드
grep -c "uD800-uDFFF" api/src/ai/ai.service.ts
# 예상: 1
```

## ✅ 진행 조건
- [ ] 서버 = 예상
- [ ] 로컬 미패치 확인
- [ ] Edit 후 검증

## ❌ 실패 시 (old_string 매칭 실패)
→ **즉시 stop! 추측 금지!**
→ `grep -n "generatedCode:" api/src/ai/ai.service.ts`로 정확한 위치 확인
→ 사장님 보고

---

# 🚦 Step 0-5: 서버 패치 2 — 빨간 경고 배너 (10분)

## 0-5-A: 서버 확인

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "sed -n '620,635p' /root/launchpad/web/src/app/builder/page.tsx"
```

## ✅ 서버 예상
```typescript
  if (!projectId) return null;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 앱 생성 중 경고 배너 */}
      {buildPhase === "generating" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#ef4444", color: "#fff", padding: "12px 20px", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
          🚨 앱 생성 중입니다! 보통 20분 ~ MVP 설계가 클수록 시간이 길어집니다. 새로고침·뒤로가기·창 닫기 시 모든 생성이 취소됩니다!
        </div>
      )}

      {/* 왼쪽: 채팅 */}
      <BuilderChat
```

## 0-5-B: 로컬 확인

```bash
sed -n '620,635p' web/src/app/builder/page.tsx
```

## ✅ 로컬 예상 (미패치)
```typescript
  if (!projectId) return null;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 왼쪽: 채팅 */}
      <BuilderChat
```

## 0-5-C: Edit

⚠️ **여러 줄 추가 — 정확한 매칭 필수!**

old_string (정확히 2줄):
```
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 왼쪽: 채팅 */}
```

new_string (10줄 — 배너 8줄 추가):
```
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* 앱 생성 중 경고 배너 */}
      {buildPhase === "generating" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#ef4444", color: "#fff", padding: "12px 20px", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
          🚨 앱 생성 중입니다! 보통 20분 ~ MVP 설계가 클수록 시간이 길어집니다. 새로고침·뒤로가기·창 닫기 시 모든 생성이 취소됩니다!
        </div>
      )}

      {/* 왼쪽: 채팅 */}
```

## 0-5-D: 검증

```bash
grep -c "🚨 앱 생성 중입니다" web/src/app/builder/page.tsx
# 예상: 1
```

## ❌ 실패 시
- buildPhase 변수 없음 → 다른 변수명? 사장님 보고
- old_string 매칭 실패 → 위 정확한 2줄 확인 후 사장님 보고

---

# 🚦 Step 0-6: 서버 패치 3 — 튜토리얼 4번 삭제 (10분)

## 0-6-A: 서버 확인 (4번 이미 삭제됨, 3번 보강됨)

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "sed -n '28,42p' /root/launchpad/web/src/app/builder/components/BuilderTutorial.tsx"
```

## ✅ 서버 예상 (3번만, 보강된 상태)
```typescript
  {
    title: '버튼에 기능 부여하기',
    description: '미리보기에서 버튼을 클릭한 뒤\n"AI에게 수정 요청" 버튼을 누르세요.\n채팅창에 위치 정보가 자동으로 입력됩니다.\n그 뒤에 원하는 기능을 적으면 끝!\n예: "회원가입 페이지로 이동하게 해줘"',
    icon: '🔗',
    targetSelector: '[data-tutorial="preview"]',
    position: 'left',
  },
  {
    title: '온라인 게시 (중요!)',
    ...
```

## 0-6-B: 로컬 확인 (4번 있음)

```bash
sed -n '28,45p' web/src/app/builder/components/BuilderTutorial.tsx
```

## ✅ 로컬 예상 (4번 존재)
```typescript
  {
    title: '버튼에 기능 부여하기',
    description: '미리보기에서 버튼을 클릭한 뒤\n"버튼에 기능 부여하기"를 누르세요.\n예: "회원가입 페이지로 이동하게 만들어줘"',
    icon: '🔗',
    targetSelector: '[data-tutorial="preview"]',
    position: 'left',
  },
  {
    title: '채팅으로 AI에게 요청',
    description: '더 복잡한 수정은 채팅으로!\n"메뉴 추가해줘", "페이지 만들어줘"\n자연어로 말하면 AI가 코드를 수정합니다.',
    icon: '💬',
    targetSelector: '[data-tutorial="chat-input"]',
    position: 'top',
  },
```

## 0-6-C: Edit (3번 보강 + 4번 삭제 한 번에)

old_string (위 로컬 14줄 그대로)
new_string (3번만, 보강됨):
```typescript
  {
    title: '버튼에 기능 부여하기',
    description: '미리보기에서 버튼을 클릭한 뒤\n"AI에게 수정 요청" 버튼을 누르세요.\n채팅창에 위치 정보가 자동으로 입력됩니다.\n그 뒤에 원하는 기능을 적으면 끝!\n예: "회원가입 페이지로 이동하게 해줘"',
    icon: '🔗',
    targetSelector: '[data-tutorial="preview"]',
    position: 'left',
  },
```

## 0-6-D: 검증

```bash
grep -c "채팅으로 AI에게 요청" web/src/app/builder/components/BuilderTutorial.tsx
# 예상: 0

grep -c "AI에게 수정 요청" web/src/app/builder/components/BuilderTutorial.tsx
# 예상: 1 이상
```

---

# 🚦 Step 0-7: ✅ 서버 패치 3건 통합 검증 (5분)

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

echo "[1] DB surrogate"
grep -c "uD800-uDFFF" api/src/ai/ai.service.ts
# 예상: 1

echo "[2] 빨간 배너"
grep -c "🚨 앱 생성 중입니다" web/src/app/builder/page.tsx
# 예상: 1

echo "[3] 튜토리얼 4번 삭제"
grep -c "채팅으로 AI에게 요청" web/src/app/builder/components/BuilderTutorial.tsx
# 예상: 0

echo "[3-1] 튜토리얼 3번 보강"
grep -c "AI에게 수정 요청" web/src/app/builder/components/BuilderTutorial.tsx
# 예상: 1 이상

echo "[git diff]"
git diff --stat
# 예상: 3개 파일
```

## ✅ 진행 조건 (모두 OK!)
- [ ] DB surrogate = 1
- [ ] 빨간 배너 = 1
- [ ] 4번 삭제 = 0
- [ ] 3번 보강 = 1+
- [ ] git diff = 3개 파일

## ❌ 하나라도 실패 → stop, 사장님 보고

---

# 🚦 Step 0-8: Sonnet 4.6 모델 ID 9곳 치환 (10분)

## 0-8-A: 사전 확인

```bash
grep -rn 'claude-sonnet-4-20250514' api/src --include='*.ts'
```

## ✅ 예상 (정확히 9곳)
```
api/src/llm-router.ts:39    standard
api/src/llm-router.ts:47    premium
api/src/llm-router.ts:89    MEETING_MODELS standard
api/src/llm-router.ts:94    MEETING_MODELS premium
api/src/llm-router.ts:122   callAnthropic 기본값
api/src/ai/ai.service.ts:30 smart
api/src/ai/ai.service.ts:31 pro
api/src/ai/agent.service.ts:242 decideAction
```

(8곳 또는 10곳 이상이면 → 사장님 보고)

## 0-8-B: 일괄 치환 (OS 분기!)

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad/api/src"

if [[ "$OSTYPE" == "darwin"* ]]; then
  grep -rl 'claude-sonnet-4-20250514' . --include='*.ts' | \
    xargs sed -i '' 's/claude-sonnet-4-20250514/claude-sonnet-4-6/g'
else
  grep -rl 'claude-sonnet-4-20250514' . --include='*.ts' | \
    xargs sed -i 's/claude-sonnet-4-20250514/claude-sonnet-4-6/g'
fi
```

## 0-8-C: 검증

```bash
echo "[구버전 잔존 (0이어야!)]"
grep -rn 'claude-sonnet-4-20250514' . --include='*.ts' | wc -l

echo "[신버전 (9 이상)]"
grep -rn 'claude-sonnet-4-6' . --include='*.ts' | wc -l
```

---

# 🚦 Step 0-9: ✅ 모델 변경 검증 (3분)

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"
git diff --stat api/src/

# 예상:
#  api/src/ai/agent.service.ts | 2 +-
#  api/src/ai/ai.service.ts    | 4 ++--
#  api/src/llm-router.ts       | 10 +++++-----
```

## ✅ 진행 조건
- [ ] 3개 파일 변경
- [ ] 구버전 0건

---

# 🚦 Step 0-10: assistant prefill 제거 (10분) ⚠️ 어제 사고 진짜 원인!

## 0-10-A: 사전 확인

```bash
grep -n "role: 'assistant'" api/src/ai/ai.service.ts
```

## ✅ 예상 (2건)
```
655:  ... { role: 'user', content: ... }, { role: 'assistant', content }];  ← DB 저장용 (유지!)
2125:        role: 'assistant',                                              ← prefill (제거!)
```

## 0-10-B: 컨텍스트 확인

```bash
sed -n '2118,2128p' api/src/ai/ai.service.ts
```

## ✅ 예상
```typescript
${existingFiles.slice(0, 15).map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n')}
마크다운 코드 블록(```) 사용 금지! 순수 코드만 출력하세요.

잘린 코드의 마지막 30줄:
${lastLines}`,
      }, {
        role: 'assistant',
        content: lastLines.split('\n').slice(-3).join('\n').trimEnd() || '// continue',
      }]);
```

## 0-10-C: Edit

⚠️ **백틱(`) 처리 주의!** old_string에 백틱 그대로 포함

old_string (5줄):
```
잘린 코드의 마지막 30줄:
${lastLines}`,
      }, {
        role: 'assistant',
        content: lastLines.split('\n').slice(-3).join('\n').trimEnd() || '// continue',
      }]);
```

new_string (4줄, prefill 제거 + user 메시지로 통합):
```
잘린 코드의 마지막 30줄:
${lastLines}

위 코드의 마지막 줄부터 이어서 나머지 코드만 작성해주세요.`,
      }]);
```

## 0-10-D: 즉시 검증

```bash
grep -n "role: 'assistant'" api/src/ai/ai.service.ts
# 예상: 1건만 (라인 655)
```

---

# 🚦 Step 0-11: ✅ prefill 제거 검증 (3분)

```bash
echo "[prefill 사용처]"
grep -n "role: 'assistant'" api/src/ai/ai.service.ts

# 예상:
# 655:  ... DB 저장용 ...
# (2125 제거됨!)
```

## ✅ 진행 조건
- [ ] grep 결과 1건만 (라인 655)

## ❌ 2건 이상 남으면 → stop, 사장님 보고

---

# 🚦 Step 0-11.5: ⭐ prefill 제거 후 F4 이어서 생성 동작 확인 (명탐정 catch!)

## 목적
prefill은 F4 루프(긴 코드 잘림 시 이어서 생성)에도 쓰였음. 제거 후 이어서 생성 기능이 정상 동작하는지 확인 필수. **배포 전 or 배포 직후 반드시 관찰!**

## 대상 코드
- `ai.service.ts:2118~2128` 근처 "잘린 코드의 마지막 30줄" 메시지가 user 메시지로 통합됐는지
- 기존 prefill 제거 → user 프롬프트에 "위 코드의 마지막 줄부터 이어서 나머지 코드만 작성해주세요" 포함

## 검증 방법 (택 1)

### 방법 A: 로컬 테스트 (추천, 비용 $0)
```bash
# API 로컬 실행
cd launchpad/api && npm run start:dev

# 긴 코드 요청 유발 (F4 트리거)
# 파일 15개 이상의 복잡한 앱 요청
# 로그에서 "F4 재시도" 또는 "잘린 코드" 메시지 확인
```

### 방법 B: 배포 후 실관찰 (Step 0-25 E2E와 통합)
- Step 0-25 E2E 앱 생성 시 F4 로그 실시간 관찰
- F4 발생 → 이어서 생성 성공 → prefill 제거 안전 확인
- F4 발생 → 이어서 생성 **실패** → 즉시 롤백

## ❌ F4 이어서 생성 실패 시 대응
- 즉시 stop + 사장님 보고
- 원인 분석: Sonnet 4.6이 user 프롬프트만으로 이어서 생성 못하는지
- 대응안 1: user 메시지에 "직전 코드 마지막 3줄을 중복 출력 후 이어서" 추가
- 대응안 2: role: 'assistant' → role: 'user'로 변경하고 내용을 "이전 출력: ..." 형식으로

## ✅ 진행 조건
- [ ] F4 루프 정상 동작 확인 (로컬 또는 E2E에서)
- [ ] 이어서 생성 성공 건 최소 1건 관찰

---

# 🚦 Step 0-12: 400 에러 폴백 추가 (5분)

## 0-12-A: 사전 확인

```bash
grep -n "error.status === 404" api/src/ai/ai.service.ts
```

## ✅ 예상
```
862:      if (tier !== 'flash' && (error.status === 404 || error.status === 403 || error.message?.includes('model'))) {
```

## 0-12-B: Edit

old_string (3줄):
```
      // 404 또는 모델 접근 불가 → Haiku(flash)로 폴백
      if (tier !== 'flash' && (error.status === 404 || error.status === 403 || error.message?.includes('model'))) {
        this.logger.warn(`${tier} 모델 사용 불가 (${error.status}), flash로 폴백합니다`);
```

new_string (3줄, 400 추가):
```
      // 400/404/403 또는 모델 접근 불가 → Haiku(flash)로 폴백
      if (tier !== 'flash' && (error.status === 400 || error.status === 404 || error.status === 403 || error.message?.includes('model'))) {
        this.logger.warn(`${tier} 모델 사용 불가 (${error.status}), flash로 폴백합니다. 상세: ${error.message?.slice(0, 200)}`);
```

## 0-12-C: 검증

```bash
grep -n "error.status === 400" api/src/ai/ai.service.ts
# 예상: 1건
```

---

# 🚦 Step 0-13: ✅ 400 폴백 검증 (2분)

```bash
grep -n "error.status === 400 ||" api/src/ai/ai.service.ts
# 예상: 1건
```

## ✅ 진행 조건
- [ ] 400 폴백 추가 확인

---

# 🚦 Step 0-14: selectedFeatures 강제 반영 (15분)

## 0-14-A: 사전 확인

```bash
grep -n "선택한 기능: \${params.selectedFeatures" api/src/ai/ai.service.ts
```

## ✅ 예상
```
1020:선택한 기능: ${params.selectedFeatures.join(', ')}
```

## 0-14-B: 컨텍스트

```bash
sed -n '1018,1024p' api/src/ai/ai.service.ts
```

## ✅ 예상
```typescript
사용자 답변:
${answersText}

선택한 기능: ${params.selectedFeatures.join(', ')}
테마: ${params.theme || 'basic-light'}
```

## 0-14-C: Edit

old_string (5줄):
```
사용자 답변:
${answersText}

선택한 기능: ${params.selectedFeatures.join(', ')}
테마: ${params.theme || 'basic-light'}
```

new_string (Sonnet 4.6 원리 기반 — 번호 리스트 + 긍정 명령 + 자체검증 루프):
```
사용자 답변:
${answersText}

### 필수 구현 기능 목록 (전부 구현)
아래 ${params.selectedFeatures.length}개 기능을 모두 구현하세요. 각 기능은 pages 배열에 **최소 1개 페이지**로 존재해야 합니다.

${params.selectedFeatures.map((f, i) => `${i + 1}. ${f} — 전용 페이지 + 관련 DB 테이블 (필요 시)`).join('\n')}

### 구현 규칙
- 도메인(헬스케어/커머스 등)과 무관해 보여도, 사용자가 명시한 기능이므로 전부 포함
- 각 기능은 pages 배열에 {path, name, description, components} 엔트리로 반영
- DB가 필요한 기능은 dbTables 배열에도 추가

### 자체 검증 단계 (architecture.json 출력 직전 수행)
출력하기 전에, 아래 ${params.selectedFeatures.length}개 기능명이 pages 배열의 name 또는 description에 포함되었는지 스스로 확인하세요:
${params.selectedFeatures.map(f => `  ✓ ${f}`).join('\n')}

빠진 기능이 있으면 pages 배열에 즉시 추가한 후 출력하세요.

테마: ${params.theme || 'basic-light'}
```

## 📘 프롬프트 설계 근거 (명탐정 원리 분석)
- **번호 리스트**: Sonnet 4.6은 콤마 나열보다 번호 리스트의 누락률이 낮음
- **긍정 명령**: "누락 금지"보다 "전부 구현" + "~에 존재해야 합니다"가 강함
- **자체 검증 루프**: 출력 직전 자기 확인 단계 강제 → 환각/누락 대폭 감소
- **"절대" 금지 준수**: 사장님 규칙 반영 (예: "~금지!" 표현 제거)

## 0-14-D: 검증

```bash
grep -c "필수 구현 기능 목록" api/src/ai/ai.service.ts
# 예상: 1

grep -c "자체 검증 단계" api/src/ai/ai.service.ts
# 예상: 1
```

---

# 🚦 Step 0-15: ✅ selectedFeatures 검증 (3분)

```bash
grep -c "필수 구현 기능 목록" api/src/ai/ai.service.ts
# 예상: 1

grep -c "자체 검증 단계" api/src/ai/ai.service.ts
# 예상: 1
```

## ✅ 진행 조건
- [ ] 강제 반영 프롬프트 1건

---

# 🚦 Step 0-16: TypeScript 검증 1차 (5분)

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

echo "[API tsc]"
npx tsc --noEmit -p api/tsconfig.build.json
echo "exit: $?"
# 예상: 0

echo "[Web tsc]"
npx tsc --noEmit -p web/tsconfig.json
echo "exit: $?"
# 예상: 0
```

## ✅ 진행 조건
- [ ] API exit 0
- [ ] Web exit 0

## ❌ 에러 → Step 0-17

---

# 🚦 Step 0-17: tsc 에러 대응 (필요 시)

## 자비스 해야 할 것
1. **에러 메시지 정확히 캡쳐**
2. **에러 파일 + 라인 확인**
3. **사장님께 즉시 보고** (자비스 추측 X)

## 흔한 에러

### 케이스 1: prefill 제거 후 타입 불일치
```
api/src/ai/ai.service.ts(2123,XX): error TS2345: 
Argument of type '{ role: "user"; content: string; }[]' ...
```
→ 사장님 보고

### 케이스 2: 백틱 깨짐
→ Step 0-10 또는 0-14에서 Edit 실수
→ 해당 파일 직접 읽고 사장님 보고

## 🚨 절대 금지
- 자비스 임의 추가 수정 X
- "이 에러 무시 가능" 판단 X
- 사장님 승인 없이 코드 추가 X

---

# 🚦 Step 0-18: 사장님 브리핑 + 승인 (10분) ⚠️ 필수!

## 자비스 보여줄 것

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "■ Phase 0 변경 사항"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git diff --stat

echo ""
echo "■ 상세"
git diff --no-color | head -200
```

## 사장님께 보고

```
사장님, Phase 0 작업 완료. 배포 승인 부탁드립니다.

■ 변경 파일 (5개)
1. api/src/ai/ai.service.ts (5곳)
   - DB surrogate 패치
   - assistant prefill 제거 (어제 사고 진짜 원인!)
   - 400 에러 폴백 추가
   - selectedFeatures 강제 반영
   - Sonnet 4.6 모델 ID

2. api/src/llm-router.ts (5곳)
   - Sonnet 4.6 모델 ID

3. api/src/ai/agent.service.ts (1곳)
   - Sonnet 4.6 모델 ID

4. web/src/app/builder/page.tsx
   - 빨간 경고 배너 추가

5. web/src/app/builder/components/BuilderTutorial.tsx
   - 튜토리얼 4번 삭제, 3번 보강

■ 검증
- tsc 에러 0개 ✅
- 모델 9곳 변경 ✅
- prefill 제거 ✅
- selectedFeatures 강제 ✅

배포해도 될까요?
```

## ✅ 진행 조건
- [ ] **사장님 OK 받음**

## 🚨 절대 금지
- 사장님 미승인 git push X
- 일방적 진행 X

---

# 🚦 Step 0-19: git commit (5분)

```bash
cd "/Users/mark/Desktop/정부지원사업 MVP 빌더(가칭)/launchpad"

git add api/src/ai/ai.service.ts \
        api/src/llm-router.ts \
        api/src/ai/agent.service.ts \
        web/src/app/builder/page.tsx \
        web/src/app/builder/components/BuilderTutorial.tsx

git status
# 예상: 5개 파일 staged

git commit -m "$(cat <<'EOF'
feat: Phase 0 — Sonnet 4.6 마이그레이션 + 누락 버그 수정 + 어제 사고 방지

- 서버 패치 3건 git 커밋 (DB surrogate, 빨간 배너, 튜토리얼)
- 모델 ID 9곳 치환 (claude-sonnet-4-20250514 → claude-sonnet-4-6)
- assistant prefill 제거 (4.6 호환, F4 이어서 생성)
- 400 에러 폴백 추가 (안전망)
- selectedFeatures 강제 반영 프롬프트 (어제 누락 버그 해결)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git log -1 --stat
# 예상: 5개 파일 변경 + 커밋 메시지
```

---

# 🚦 Step 0-20: git push (2분)

```bash
git push origin main
# 예상: 정상 푸시
```

## ❌ push 거부 시
- remote 변경: `git pull --rebase` 후 다시
- 권한: 사장님 보고

---

# 🚦 Step 0-21: GitHub Actions 모니터링 (3분)

```bash
echo "[10초 대기]"
sleep 10

gh run list --limit 3
```

## ✅ 진행 조건
- [ ] 최신 워크플로우 status: "in_progress"

---

# 🚦 Step 0-22: 배포 확인 (3분)

```bash
echo "[90초 대기]"
sleep 90

gh run list --limit 1
# 예상: status: "completed", conclusion: "success"
```

## ❌ 실패 시
- `gh run view --log-failed`
- 사장님 보고 + 즉시 롤백

---

# 🚦 Step 0-23: 헬스체크 (3분)

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "curl -s http://localhost:4000/api/health"
# 예상: {"status":"ok"}
```

## ❌ 비정상 → 즉시 롤백

---

# 🚦 Step 0-24: PM2 + 메모리 + 에러 (3분)

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
echo "[PM2]"
pm2 status | grep -E "launchpad|name"
echo ""
echo "[메모리]"
free -h
echo ""
echo "[최근 에러]"
pm2 logs launchpad-api --lines 50 --nostream 2>&1 | grep -i error | tail -10
EOF
```

## ✅ 진행 조건
- [ ] launchpad-api, launchpad-web 둘 다 'online'
- [ ] API 메모리 < 1GB
- [ ] Sonnet 4.6 관련 에러 없음

---

# 🚦 Step 0-25: E2E 테스트 (selectedFeatures 검증, 30분) ⭐

## 목적
실제 앱 1개 생성해서 누락 버그 해결됐는지 확인.

## 시나리오 (어제 심사위원과 동일)

1. 브라우저 → foundry.ai.kr/start
2. test 계정 (test@serion.ai.kr / 12345678)
3. 빌더 질문지:
   - 템플릿: 헬스케어
   - **selectedFeatures (체크):** tracking, dashboard, auth, goal, **reservation, booking,** medication
   - 테마: startup-bold
4. "앱 만들기"
5. 20분 대기

## 검증

```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 << 'EOF'
PGPASSWORD=launchpad1234 psql -U launchpad -d launchpaddb -h localhost -t -c "
SELECT jsonb_array_elements(\"generatedCode\"::jsonb)->>'path'
FROM projects 
WHERE \"userId\" = (SELECT id FROM users WHERE email = 'test@serion.ai.kr')
ORDER BY \"createdAt\" DESC
LIMIT 1
" | grep -E "reservation|booking|appointment|book"
EOF
```

## ✅ 진행 조건
- [ ] reservation 또는 appointment 페이지 존재
- [ ] booking 또는 book 페이지 존재
- [ ] 7개 selectedFeatures 모두 페이지로 반영

## ❌ 누락 시
→ 사장님 보고
→ Step 0-14 프롬프트 추가 강화 검토

---

# 🚦 Step 0-26: 24시간 모니터링 시작

## 자비스 → 사장님 인계

```
사장님, Phase 0 완료!

■ 검증 결과
✅ 서버 패치 3건 git 커밋
✅ Sonnet 4.6 마이그레이션 (9곳)
✅ assistant prefill 제거
✅ 400 에러 폴백 추가
✅ selectedFeatures 강제 반영
✅ tsc 에러 0
✅ 배포 성공
✅ 헬스체크 정상
✅ E2E 테스트: reservation, booking 페이지 포함됨!

■ 24시간 모니터링 체크리스트
- PM2 메모리 < 1.5GB
- 앱 생성 성공률 > 95%
- F4 정상 (prefill 제거 영향 없음)
- 사용자 클레임 0건

Phase 1 시작 가능합니다!
```

---

# 🆘 비상 롤백 절차

## 옵션 1: Git Revert (안전)
```bash
git revert HEAD --no-edit
git push origin main
```

## 옵션 2: Git Reset (사장님 승인 후만!)
```bash
git reset --hard backup-before-phase0
git push origin main --force
```

## 옵션 3: 서버 직접 (긴급)
```bash
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162 \
  "cd /root/launchpad && git fetch && \
   git reset --hard backup-before-phase0 && \
   npm run build && pm2 restart launchpad-api launchpad-web"
```

---

# 🚨 자비스 절대 금지 (요약)

1. **추측 진행 X** — 모호하면 사장님 호출
2. **사전 검증 통과 못하면 다음 단계 X**
3. **사장님 미승인 배포 X**
4. **에러 무시 X** — 즉시 보고
5. **임의 코드 추가 X** — Plan에 없는 변경 X
6. **"아마 될 거야" 금지** — 실제 검증
7. **OS 환경 가정 X** — darwin/linux 분기

---

# ✅ Phase 0 완료 체크리스트 (26개)

- [ ] 0-1. 환경 검증
- [ ] 0-2. Sonnet 4.6 사전 호출 ⭐
- [ ] 0-3. 백업 3중
- [ ] 0-4. DB surrogate
- [ ] 0-5. 빨간 배너
- [ ] 0-6. 튜토리얼
- [ ] 0-7. ✅ 검증 1
- [ ] 0-8. 모델 9곳
- [ ] 0-9. ✅ 검증 2
- [ ] 0-10. prefill 제거
- [ ] 0-11. ✅ 검증 3
- [ ] 0-12. 400 폴백
- [ ] 0-13. ✅ 검증 4
- [ ] 0-14. selectedFeatures
- [ ] 0-15. ✅ 검증 5
- [ ] 0-16. tsc 1차
- [ ] 0-17. tsc 에러 대응 (필요 시)
- [ ] 0-18. 사장님 브리핑 ⚠️
- [ ] 0-19. git commit
- [ ] 0-20. git push
- [ ] 0-21. Actions 모니터링
- [ ] 0-22. 배포 확인
- [ ] 0-23. 헬스체크
- [ ] 0-24. PM2 확인
- [ ] 0-25. E2E 테스트 ⭐
- [ ] 0-26. 모니터링 시작

---

**작성:** 자비스 mk9+ (2026-04-17 v2)
**핵심 원칙:** 무한버그지옥 방지 = 사전 검증 + 명확한 실패 대응 + 자비스 추측 금지
