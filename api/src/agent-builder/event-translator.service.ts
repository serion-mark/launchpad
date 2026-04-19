import { Injectable } from '@nestjs/common';

// 7단계 (Notion 풍 표)
// Agent 의 raw 도구 호출을 포비 어휘로 번역한다.
// 목표: 사용자에게 "Bash", "Write", "AGENTS.md" 등 클로드 냄새 0건.
export const STAGES = [
  { id: 'intent',   label: '의도 파악',    emoji: '📋' },
  { id: 'setup',    label: '프로젝트 셋업', emoji: '📦' },
  { id: 'design',   label: '디자인 시스템', emoji: '🎨' },
  { id: 'pages',    label: '페이지 작성',   emoji: '📄' },
  { id: 'verify',   label: '빌드 검증',     emoji: '🔍' },
  { id: 'database', label: '데이터베이스',  emoji: '🗄' },
  { id: 'deploy',   label: '서버 배포',     emoji: '🌐' },
] as const;

export type StageId = typeof STAGES[number]['id'];

export type TranslatedEvent = {
  stage: StageId;
  label: string;       // 사용자에게 표시될 짧은 문구 ("🏠 홈 페이지 디자인 중")
  emoji: string;
};

// 클로드/SDK 흔적 필터용 정규식 (output sanitize)
const CLAUDE_TRACES = /(AGENTS\.md|CLAUDE\.md|\.claude\/|claude-agent-sdk|claude\.ai|anthropic)/i;

@Injectable()
export class EventTranslatorService {
  /**
   * raw 도구 호출을 사용자 표시용 이벤트로 번역.
   * 반환 null = 사용자에게 감춤 (내부 동작).
   */
  translate(tool: string, input: any): TranslatedEvent | null {
    // ── Bash ─────────────────────────────
    if (tool === 'Bash' || tool === 'bash') {
      const cmd = String(input?.command ?? '').trim();
      if (/create-next-app/.test(cmd)) return s('setup', '프로젝트 초기화 중', '📦');
      if (/npm\s+install|yarn\s+install|pnpm\s+install/.test(cmd)) return s('setup', '필수 라이브러리 설치 중', '📦');
      if (/npm\s+run\s+build/.test(cmd))                            return s('verify', '빌드 검증 중', '🔍');
      if (/^(ls|cat|mkdir|cd|echo|pwd|find|touch|cp|mv|rm)\b/.test(cmd)) return null; // 내부 명령
      return null;
    }

    // ── Write / Read / Glob / Grep ─────────
    if (tool === 'Write' || tool === 'write') {
      const p = String(input?.path ?? '');
      // 페이지 패턴 — 기본 app/.../page.tsx 및 주요 도메인
      if (/\/app\/page\.tsx$/.test(p))                   return s('pages', '🏠 홈 페이지 디자인 중', '📄');
      if (/\/dashboard/.test(p))                          return s('pages', '📊 대시보드 만드는 중', '📄');
      if (/\/medications?|\/meds/.test(p))                return s('pages', '💊 복약 관리 페이지', '📄');
      if (/\/health-metrics?|\/health/.test(p))           return s('pages', '📈 건강 지표 페이지', '📄');
      if (/\/appointments?|\/reservations?/.test(p))      return s('pages', '📅 예약 페이지', '📄');
      if (/\/medical-records?|\/records?/.test(p))        return s('pages', '📋 기록 페이지', '📄');
      if (/\/providers?|\/staff|\/doctors?/.test(p))      return s('pages', '👨‍⚕️ 담당자 페이지', '📄');
      if (/\/customers?/.test(p))                          return s('pages', '👥 고객 페이지', '📄');
      if (/\/orders?/.test(p))                             return s('pages', '🛒 주문 페이지', '📄');
      if (/\/products?/.test(p))                           return s('pages', '🛍️ 상품 페이지', '📄');
      if (/\/settings?/.test(p))                           return s('pages', '⚙️ 설정 페이지', '📄');
      if (/\/login|\/signup|\/signin|\/register/.test(p)) return s('pages', '🔐 로그인 페이지', '📄');
      if (/\/mypage|\/profile|\/account/.test(p))         return s('pages', '👤 마이페이지', '📄');
      // 디자인 시스템
      if (/\/components\/ui\//.test(p))                   return s('design', '🎨 디자인 컴포넌트', '🎨');
      if (/\/components\/layout\//.test(p))               return s('design', '🧩 레이아웃 만들기', '🎨');
      if (/\/components\//.test(p))                        return s('design', '🧱 컴포넌트 작성', '🎨');
      // Supabase 클라이언트
      if (/supabase|\.env/.test(p))                        return null; // 부가도구에서 이미 표시
      // 내부 유틸/타입/설정 — 감춤
      if (/\/lib\//.test(p))                               return null;
      if (/\/hooks\//.test(p))                             return s('design', '🪝 로직 훅 작성', '🎨');
      if (/\/types\//.test(p))                             return null;
      if (/\.gitignore|tsconfig|next\.config|postcss|eslint|tailwind\.config/.test(p)) return null;
      if (/\.md$/.test(p))                                 return null;
      // 그 외 일반 페이지
      if (/\/app\/[^/]+\/page\.tsx$/.test(p))              return s('pages', '📄 페이지 작성 중', '📄');
      return null;
    }

    if (tool === 'Read' || tool === 'read')   return null;
    if (tool === 'Glob' || tool === 'glob')   return null;
    if (tool === 'Grep' || tool === 'grep')   return null;

    // ── 부가 도구 ───────────────────────
    if (tool === 'provision_supabase')  return s('database', '🔌 데이터베이스 자동 생성 중', '🗄');
    if (tool === 'deploy_to_subdomain') return s('deploy',   '🚀 서버에 배포 중',            '🌐');
    if (tool === 'check_build')         return s('verify',   '🔍 빌드 검증 중',              '🔍');

    // ── AskUser ────────────────────────
    if (tool === 'AskUser')             return s('intent',   '💭 답지 확인 중',              '📋');

    // 알 수 없는 도구는 감춤
    return null;
  }

  /**
   * bash output / tool output 에서 클로드 흔적 제거.
   * 사용자에게는 sanitize 된 내용만 보이고, raw 는 devLog 로 별도 노출.
   */
  sanitizeOutput(output: string): string {
    if (!output) return '';
    return output
      .split('\n')
      .filter((line) => !CLAUDE_TRACES.test(line))
      .join('\n');
  }
}

function s(stage: StageId, label: string, emoji: string): TranslatedEvent {
  return { stage, label, emoji };
}
