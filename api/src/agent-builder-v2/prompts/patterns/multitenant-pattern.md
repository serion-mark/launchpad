# 멀티테넌트 라우팅 (Foundry v2)

## ⚠️ Claude 가 알 필요 없음

이 부분은 **`provision_app_v2` 도구가 자동으로 처리**한다.
Claude 가 신경 쓸 부분 X.

---

## 자동 처리되는 것

1. **Postgres schema 생성** (`CREATE SCHEMA app_xxxx`)
2. **DATABASE_URL with schema** 자동 작성
3. **앱 폴더 격리** (`/root/launchpad/apps-runtime-v2/app-xxxx/`)
4. **nginx 라우팅** (`app-xxxx-v2.foundry.ai.kr` → 해당 앱 포트)
5. **PM2 등록** (멀티테넌트 단일 프로세스 또는 앱별 프로세스)

---

## Claude 가 가정할 것

- 단일 앱 만든다고 가정하고 코드 작성
- DATABASE_URL = process.env.DATABASE_URL 그대로 읽기
- prisma client = 평범한 PrismaClient() 사용
- schema 분리는 도구가 알아서 처리

---

## 디버그 시 (필요할 때만 참조)

문제 발생 시 자비스 (개발자) 가 직접 확인:
```bash
# Foundry 서버 SSH
ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162

# 앱 폴더
ls /root/launchpad/apps-runtime-v2/

# Postgres schema 확인
psql -U launchpad launchpaddb -c "\dn"  # schema 목록

# nginx 라우팅
cat /etc/nginx/sites-enabled/foundry-v2

# PM2 프로세스
pm2 list | grep v2
```

→ Claude (포비) 는 위 디버그 명령 사용하지 마라. 도구 호출만.
