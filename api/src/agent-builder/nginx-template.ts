// Agent Mode SSR 앱용 nginx config 템플릿
// 기존 /etc/nginx/conf.d/wildcard-apps.conf 는 static 앱 서빙 (건드리지 않음)
// 이 파일이 만드는 sites-available/agent-<sub>.conf 는 specific server_name 이라
// wildcard 보다 우선순위가 높아 SSR 앱 요청을 먼저 받는다.

export const NGINX_SITES_AVAILABLE = '/etc/nginx/sites-available';
export const NGINX_SITES_ENABLED = '/etc/nginx/sites-enabled';
export const WILDCARD_CERT_DIR = '/etc/letsencrypt/live/foundry.ai.kr-0001';

export function renderAgentNginxConf(subdomain: string, port: number, projectId: string): string {
  return `# Agent Mode SSR 앱 — ${subdomain} (projectId=${projectId})
# 자동 생성 — 수동 편집 금지. AgentDeployService 가 관리.

server {
    listen 80;
    server_name ${subdomain}.foundry.ai.kr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${subdomain}.foundry.ai.kr;

    # 와일드카드 인증서 재사용 (foundry.ai.kr-0001)
    ssl_certificate     ${WILDCARD_CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${WILDCARD_CERT_DIR}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Next.js SSR 프록시
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js 정적 자원 (오래 캐시 OK)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:${port};
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Content-Type-Options "nosniff" always;
    # foundry.ai.kr (부모 빌더 도메인) 에서 iframe 으로 프리뷰 가능해야 함 → X-Frame-Options 대신 CSP
    add_header Content-Security-Policy "frame-ancestors 'self' https://foundry.ai.kr https://*.foundry.ai.kr" always;
}
`;
}

export function agentConfFileNames(subdomain: string): { available: string; enabled: string } {
  const fileName = `agent-${subdomain}.conf`;
  return {
    available: `${NGINX_SITES_AVAILABLE}/${fileName}`,
    enabled: `${NGINX_SITES_ENABLED}/${fileName}`,
  };
}
