#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Foundry 와일드카드 서브도메인 + SSL 설정 스크립트
# 실행: ssh -i ~/.ssh/serion-key.pem -p 3181 root@175.45.200.162
#       bash /root/launchpad/scripts/setup-wildcard.sh
# ══════════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="foundry.ai.kr"
DEPLOY_DIR="/var/www/apps"
NGINX_CONF="/etc/nginx/conf.d/wildcard-apps.conf"

echo "═══ Foundry 와일드카드 서브도메인 설정 시작 ═══"

# ── 1. 배포 디렉토리 생성 ──
echo "[1/4] 배포 디렉토리 생성..."
mkdir -p "$DEPLOY_DIR"
chown -R root:root "$DEPLOY_DIR"

# ── 2. certbot + DNS 플러그인 설치 (와일드카드 SSL) ──
echo "[2/4] certbot 확인..."
if ! command -v certbot &> /dev/null; then
  echo "certbot 설치 중..."
  apt-get update && apt-get install -y certbot python3-certbot-nginx
fi

# 와일드카드 인증서 존재 여부 확인
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "기존 인증서 발견 — 갱신 시도..."
  certbot renew --quiet || true
else
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "와일드카드 SSL 인증서 발급이 필요합니다."
  echo ""
  echo "가비아 DNS에 다음 레코드를 먼저 추가하세요:"
  echo "  타입: A    이름: *         값: 175.45.200.162"
  echo "  타입: A    이름: @         값: 175.45.200.162"
  echo ""
  echo "DNS 전파 후 아래 명령어로 인증서 발급:"
  echo "  certbot certonly --manual --preferred-challenges dns \\"
  echo "    -d '${DOMAIN}' -d '*.${DOMAIN}'"
  echo ""
  echo "(DNS TXT 레코드 입력 프롬프트가 표시됩니다)"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  read -p "지금 인증서 발급을 진행하시겠습니까? (y/N): " REPLY
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    certbot certonly --manual --preferred-challenges dns \
      -d "${DOMAIN}" -d "*.${DOMAIN}" \
      --agree-tos --email mark@serion.ai.kr
  else
    echo "인증서 발급을 건너뜁니다. 나중에 수동으로 실행하세요."
    echo "임시로 기존 foundry.ai.kr 인증서를 사용합니다."
  fi
fi

# ── 3. nginx 와일드카드 서브도메인 설정 ──
echo "[3/4] nginx 와일드카드 설정 생성..."

# SSL 인증서 경로 (와일드카드 또는 기존)
SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

cat > "$NGINX_CONF" << 'NGINX_HEREDOC'
# ══════════════════════════════════════════════════════════════
# Foundry 와일드카드 서브도메인 → Static Export 파일 서빙
# *.foundry.ai.kr → /var/www/apps/{subdomain}/
# ══════════════════════════════════════════════════════════════

server {
    listen 80;
    server_name *.foundry.ai.kr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ~^(?<subdomain>[a-z0-9][a-z0-9-]+)\.foundry\.ai\.kr$;

    ssl_certificate     /etc/letsencrypt/live/foundry.ai.kr-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/foundry.ai.kr-0001/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/apps/$subdomain;
    index index.html;

    # SPA 라우팅: 파일이 없으면 index.html로 폴백
    location / {
        try_files $uri $uri.html $uri/index.html /index.html =404;
    }

    # Static assets 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # _next/static 캐싱 (Next.js Static Export 에셋)
    location /_next/static/ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 보안 헤더
    add_header Content-Security-Policy "frame-ancestors https://foundry.ai.kr" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 에러 페이지
    error_page 404 /404.html;
    error_page 500 502 503 504 /index.html;

    # 서브도메인 디렉토리가 없으면 → 배포 준비 중 페이지
    location @fallback {
        return 503 '{"error":"앱이 아직 배포되지 않았거나 빌드 중입니다.","subdomain":"$subdomain"}';
        add_header Content-Type application/json;
    }
}
NGINX_HEREDOC

echo "nginx 설정 파일 생성: $NGINX_CONF"

# ── 4. nginx 문법 검사 + 리로드 ──
echo "[4/4] nginx 문법 검사 + 리로드..."
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "nginx 리로드 완료!"
else
  echo "nginx 설정 오류! 수동으로 확인하세요: nginx -t"
  exit 1
fi

echo ""
echo "═══ 설정 완료! ═══"
echo "배포 디렉토리: $DEPLOY_DIR"
echo "nginx 설정: $NGINX_CONF"
echo ""
echo "테스트 방법:"
echo "  1. mkdir -p /var/www/apps/test-app"
echo "  2. echo '<h1>Hello Foundry!</h1>' > /var/www/apps/test-app/index.html"
echo "  3. curl -k https://test-app.foundry.ai.kr/"
echo ""
echo "⚠️  가비아 DNS에 *.foundry.ai.kr → 175.45.200.162 A레코드 추가 필요!"
