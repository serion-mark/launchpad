import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import Anthropic from '@anthropic-ai/sdk';
import { CreditService, type ModelTier as CreditModelTier } from '../credit/credit.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma.service';

// ── F7: SSE 진행상황 이벤트 타입 ─────────────────────
export type GenerationProgress = {
  step: 'architecture' | 'schema' | 'supabase' | 'frontend' | 'config' | 'quality' | 'credits' | 'complete' | 'error';
  progress: string;     // "1/4", "2/4" 등
  message: string;      // 사용자에게 보여줄 메시지
  detail?: string;      // 파일명 등 상세 정보
  fileCount?: number;   // 현재까지 생성된 파일 수
  totalFiles?: number;  // 예상 전체 파일 수
};

// ── 모델 티어 (레거시 호환) ─────────────────────────────
type ModelTier = 'fast' | 'standard' | 'premium';

// ── 새 모델 3단계 (코드 생성 엔진) ─────────────────────
type AppModelTier = 'flash' | 'smart' | 'pro';

const APP_MODELS: Record<AppModelTier, { model: string; maxTokens: number; label: string }> = {
  flash: { model: 'claude-haiku-4-5-20251001', maxTokens: 8192, label: 'Flash (빠르고 저렴)' },
  smart: { model: 'claude-sonnet-4-5-20250514', maxTokens: 16384, label: 'Smart (균형잡힌)' },
  pro:   { model: 'claude-sonnet-4-5-20250514', maxTokens: 16384, label: 'Pro (최고 품질)' },
};

// 레거시 모델맵 (기존 chat/generate 호환)
const MODELS: Record<ModelTier, { model: string; maxTokens: number }> = {
  fast:     { model: 'claude-haiku-4-5-20251001', maxTokens: 8192 },
  standard: { model: 'claude-haiku-4-5-20251001', maxTokens: 8192 },
  premium:  { model: 'claude-haiku-4-5-20251001', maxTokens: 8192 },
};

// ── 빌더 시스템 프롬프트 ─────────────────────────────
const BUILDER_SYSTEM_PROMPT = `당신은 Foundry AI 빌더 어시스턴트입니다.
사용자가 만들고 싶은 웹 애플리케이션을 대화를 통해 함께 설계합니다.

역할:
1. 사용자의 비즈니스 요구사항을 파악
2. 적절한 기능과 페이지 구성을 제안
3. 기술적 구현 방향을 한국어로 쉽게 설명
4. 추가 질문으로 요구사항을 구체화

규칙:
- 항상 한국어로 답변
- 마크다운 형식 사용 (**굵게**, - 목록, 코드블록)
- 답변은 간결하게 (200자 이내 권장, 필요시 더 길게)
- 기술 용어는 쉽게 풀어서 설명
- 사용자가 "생성해줘"라고 하면 구체적인 기능 목록을 정리하여 확인

⚠️ 중요: 반드시 현재 선택된 템플릿/업종에 맞는 용어와 기능만 이야기하세요.
다른 업종의 용어를 절대 섞지 마세요.`;

// ── 업종별 상세 프롬프트 ─────────────────────────────
const TEMPLATE_PROMPTS: Record<string, string> = {
  'beauty-salon': `이 프로젝트는 **미용실/살롱** 앱입니다.
관련 기능: 예약 관리, 디자이너 스케줄, 시술 메뉴, 매출/정산, 고객 CRM, 포인트 적립, 알림톡
관련 용어: 디자이너, 시술, 커트, 펌, 염색, 클리닉, 워크인, 노쇼, 재방문율, 지명율
절대 사용하지 말 것: 상품, 장바구니, 배송, 수강, 강의, 민원, 매칭`,

  'ecommerce': `이 프로젝트는 **쇼핑몰/커머스** 앱입니다.
관련 기능: 상품 등록, 장바구니, 주문/결제, 배송 관리, 재고 관리, 쿠폰/할인, 리뷰/평점, 회원 등급
관련 용어: 상품, 주문, 장바구니, 배송, 택배, 재고, SKU, 환불, 교환, CS
절대 사용하지 말 것: 예약, 노쇼, 오버부킹, 디자이너, 시술, 수강, 민원, 매칭`,

  'booking-crm': `이 프로젝트는 **범용 예약/CRM** 앱입니다.
관련 기능: 예약 캘린더, 고객 CRM, 매출 관리, 알림톡/SMS, 출석 체크, 통계 대시보드
관련 용어: 예약, 고객, 스태프, 매출, 정산, 알림, 일정
절대 사용하지 말 것: 상품, 장바구니, 배송, 매칭, 민원`,

  'o2o-matching': `이 프로젝트는 **O2O 매칭 플랫폼** 앱입니다.
관련 기능: 양면 마켓 (고객↔제공자), 매칭 알고리즘, 실시간 상태 추적, 지도 연동, 양방향 리뷰, 수수료 정산, 1:1 채팅
관련 용어: 매칭, 제공자, 수요자, 견적, 수수료, 에스크로, 실시간 추적, 평점
절대 사용하지 말 것: 예약, 노쇼, 디자이너, 시술, 상품, 장바구니, 민원, 수강`,

  'edutech': `이 프로젝트는 **에듀테크/LMS** 앱입니다.
관련 기능: 강의 관리, 수강생 대시보드, 진도율 추적, 퀴즈/시험, 수료증 발급, 결제/수강권, Q&A 게시판, 출석
관련 용어: 강의, 수강생, 진도율, 수료증, 퀴즈, 과제, 커리큘럼, VOD, 라이브, 수강권
절대 사용하지 말 것: 예약, 노쇼, 디자이너, 시술, 상품, 장바구니, 배송, 민원, 매칭`,

  'facility-mgmt': `이 프로젝트는 **관리업체/시설관리** 앱입니다.
관련 기능: 민원 접수/처리, 입주민 관리, 공지사항, 시설 보수, 시설 예약 (회의실/주차), 관리비 청구/수납, 전화 기록, 만족도 조사
관련 용어: 민원, 입주민, 세대, 동/호, 관리비, 하자보수, 층간소음, 공지, 시설 예약
절대 사용하지 말 것: 예약(고객), 노쇼, 디자이너, 시술, 상품, 장바구니, 배송, 수강, 매칭`,
};

// ── Supabase SQL 스키마 생성 프롬프트 ─────────────────
const SCHEMA_SYSTEM_PROMPT = `당신은 Supabase PostgreSQL 전문가입니다.
주어진 모델 정의를 기반으로 Supabase SQL 마이그레이션을 생성합니다.

규칙:
- 모든 테이블에 id (uuid, gen_random_uuid()), created_at (timestamptz), updated_at (timestamptz) 필드 포함
- user_id uuid references auth.users not null — Supabase Auth 연동
- 테이블명은 소문자 복수형 (snake_case)
- 외래키는 references로 명확히 정의 + on delete cascade
- 인덱스와 유니크 제약조건 적절히 추가
- enum은 PostgreSQL CREATE TYPE으로 정의
- 반드시 RLS(Row Level Security) 활성화 + 정책 작성
- RLS 정책: 본인 데이터만 CRUD 가능 (auth.uid() = user_id)
- 코드 블록(\`\`\`) 절대 사용 금지! 순수 SQL만 출력 (-- 주석 허용)
- 마크다운 문법(###, **, ✅ 등) 사용 금지
- updated_at 자동 갱신 트리거 포함

출력 예시:
-- Users Profile (auth.users 확장)
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can CRUD own profile" on profiles for all using (auth.uid() = user_id);`;

// ── 백엔드 모듈 생성 프롬프트 (레거시 호환용 유지) ───
const BACKEND_SYSTEM_PROMPT = `당신은 NestJS 백엔드 전문가입니다.
주어진 엔드포인트 정의를 기반으로 NestJS 모듈(Controller + Service)을 생성합니다.

규칙:
- NestJS + Prisma 패턴 사용
- Controller: @Controller, @Get/@Post/@Patch/@Delete, DTO 타입 정의
- Service: @Injectable, PrismaService 주입, 비즈니스 로직
- 에러 처리: NotFoundException, BadRequestException 등 적절히 사용
- 각 파일을 [FILE: 경로] 형식으로 구분하여 출력

출력 형식:
[FILE: controller.ts]
(컨트롤러 코드)

[FILE: service.ts]
(서비스 코드)

[FILE: dto.ts]
(DTO 정의)`;

// ── Supabase 프론트엔드 페이지 생성 프롬프트 ─────────
const FRONTEND_SYSTEM_PROMPT = `당신은 Next.js 16 + Supabase 풀스택 전문가입니다.
주어진 페이지 정의를 기반으로 Next.js App Router 페이지를 생성합니다.

⚠️ 핵심: 별도 백엔드 서버 없음! Supabase가 DB+Auth+API를 모두 처리합니다.

규칙:
- 'use client' 디렉티브 필수 (상태 사용 시)
- TypeScript + Tailwind CSS 사용
- 반응형 디자인 (모바일 우선)
- DB 조회/저장은 반드시 Supabase 클라이언트 사용:
  import { createClient } from '@/utils/supabase/client'
  const supabase = createClient()
  const { data, error } = await supabase.from('테이블명').select('*')
- 인증 상태 확인: const { data: { user } } = await supabase.auth.getUser()
- 로그인: await supabase.auth.signInWithPassword({ email, password })
- 회원가입: await supabase.auth.signUp({ email, password })
- 로그아웃: await supabase.auth.signOut()
- 한국어 UI 텍스트
- 컴포넌트는 같은 파일에 정의 (작은 경우) 또는 [FILE:] 태그로 분리
- 모던하고 깔끔한 UI (rounded-xl, shadow-sm, 적절한 패딩)
- 로딩/에러 상태 처리 포함
- 절대 fetch('/api/...') 사용 금지! Supabase 클라이언트만 사용
- 테이블/컬럼명은 snake_case (PostgreSQL 규칙)

⚠️ 매우 중요 — 코드 출력 규칙:
- 절대 마크다운 코드 블록(\`\`\`) 사용 금지! 순수 코드만 출력
- ###, ##, **, ✅, ❌, 📌 등 마크다운/이모지 문법 금지
- 주석은 // 또는 /* */ 형식만 사용
- 설명 텍스트 없이 코드만 출력
- import 문에서 실제 존재하는 패키지만 사용 (react, next, @supabase/supabase-js, @supabase/ssr만 허용)
- lucide-react 아이콘은 사용 가능 (설치됨)
- @heroicons/react, react-icons 등 미설치 패키지 import 금지

출력 형식:
[FILE: page.tsx]
(페이지 코드)`;

// ── 코드 수정 프롬프트 (Supabase 기반) ──────────────
const MODIFY_SYSTEM_PROMPT = `당신은 Next.js + Supabase 풀스택 코드 수정 전문가입니다.
사용자의 수정 요청에 따라 기존 코드를 수정합니다.

규칙:
- 수정된 파일만 [FILE: 경로] 형식으로 출력
- 수정하지 않은 파일은 출력하지 마세요
- 기존 코드 스타일과 패턴을 유지
- TypeScript 타입 안전성 유지
- 한국어 주석/UI 텍스트 유지
- DB 조회/저장은 반드시 Supabase 클라이언트 사용 (fetch API 금지)
- 인증: supabase.auth (Supabase Auth)

⚠️ 코드 출력 규칙:
- 절대 마크다운 코드 블록(\`\`\`) 사용 금지! 순수 코드만 출력
- ###, **, ✅, ❌ 등 마크다운 문법 금지
- 미설치 패키지 import 금지 (@heroicons, react-icons 등)

출력 형식:
[FILE: 수정된파일경로]
(수정된 전체 코드)`;

// ── 앱 생성 시스템 프롬프트 (Supabase 기반) ──────────
const GENERATE_SYSTEM_PROMPT = `당신은 풀스택 웹 앱 아키텍트입니다.
사용자의 대화 내역을 기반으로, 완전한 앱 아키텍처를 설계합니다.

기술 스택:
- 프론트엔드: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- 백엔드: Supabase (PostgreSQL + Auth + Realtime + Storage)
- DB: Supabase PostgreSQL (RLS 보안)
- 인증: Supabase Auth (이메일/비밀번호)

⚠️ 중요: 별도 백엔드 서버(NestJS 등) 없음! Supabase가 DB+Auth+API를 모두 처리합니다.

반드시 아래 JSON 형식으로만 출력하세요 (다른 텍스트 없이):
{
  "appName": "앱 이름",
  "description": "한줄 설명",
  "pages": [{ "path": "/xxx", "name": "페이지명", "description": "설명", "components": ["컴포넌트1"] }],
  "dbTables": [{ "name": "table_name", "fields": [{ "name": "field_name", "type": "uuid|text|int4|timestamptz|boolean|jsonb", "optional": false, "references": "other_table(id)" }] }],
  "features": ["기능1", "기능2"],
  "estimatedPages": 5,
  "hasAuth": true,
  "hasFileUpload": false
}`;

@Injectable()
export class AiService {
  private anthropic: Anthropic;
  private readonly logger = new Logger('AiService');

  constructor(
    private creditService: CreditService,
    private supabaseService: SupabaseService,
    private prisma: PrismaService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ── 빌더 채팅 (실시간 대화) ────────────────────────
  async chat(userId: string, params: {
    projectId: string;
    message: string;
    chatHistory: { role: string; content: string }[];
    template?: string;
  }) {
    // 크레딧 차감 (chat = 10 크레딧 → 빌더 대화는 무료로 처리)
    // 대화는 무료, 실제 생성에서만 과금
    const tier: ModelTier = 'fast';
    const model = MODELS[tier];

    // 대화 히스토리를 Anthropic 형식으로 변환
    const messages: Anthropic.MessageParam[] = params.chatHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // 현재 메시지 추가
    messages.push({ role: 'user', content: params.message });

    try {
      const response = await this.anthropic.messages.create({
        model: model.model,
        max_tokens: model.maxTokens,
        system: BUILDER_SYSTEM_PROMPT + '\n\n' + (TEMPLATE_PROMPTS[params.template || ''] || `현재 선택된 템플릿: ${params.template || 'unknown'}`),
        messages,
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        content,
        model: model.model,
        tier,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error: any) {
      this.logger.error(`AI Chat error: ${error.message}`);
      throw error;
    }
  }

  // ── 앱 아키텍처 생성 (크레딧 차감) ─────────────────
  async generateArchitecture(userId: string, params: {
    projectId: string;
    chatHistory: { role: string; content: string }[];
    template: string;
  }) {
    // 맛보기 체크 (freeTrialUsed가 false면 무료)
    const balance = await this.creditService.getBalance(userId);
    const isFreeTria = !balance.freeTrialUsed;

    if (isFreeTria) {
      await this.creditService.deduct(userId, {
        action: 'free_trial',
        projectId: params.projectId,
        taskType: 'architecture',
        modelTier: 'standard',
        description: `맛보기 설계안: ${params.template}`,
      });
    } else {
      await this.creditService.deduct(userId, {
        action: 'app_generate',
        projectId: params.projectId,
        taskType: 'architecture',
        modelTier: 'standard',
        description: `앱 생성: ${params.template}`,
      });
    }

    const tier: ModelTier = 'standard';
    const model = MODELS[tier];

    // 대화 히스토리에서 요구사항 추출
    const conversationSummary = params.chatHistory
      .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n');

    try {
      const response = await this.anthropic.messages.create({
        model: model.model,
        max_tokens: model.maxTokens,
        system: GENERATE_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `아래 대화 내역을 기반으로 앱 아키텍처를 설계해주세요.\n\n템플릿: ${params.template}\n${TEMPLATE_PROMPTS[params.template] || ''}\n\n대화 내역:\n${conversationSummary}`,
        }],
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      // JSON 파싱 시도
      let architecture: any;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        architecture = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
      } catch {
        architecture = { raw: content };
      }

      // 프로젝트에 생성 결과 저장
      await this.prisma.project.update({
        where: { id: params.projectId },
        data: {
          generatedCode: architecture,
          status: 'active',
        },
      });

      return {
        architecture,
        isFreeTrial: isFreeTria,
        model: model.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (error: any) {
      this.logger.error(`AI Generate error: ${error.message}`);
      throw error;
    }
  }

  // ── AI 코드 수정 (크레딧 차감) ─────────────────────
  async modifyCode(userId: string, params: {
    projectId: string;
    instruction: string;
    currentCode?: string;
  }) {
    await this.creditService.deduct(userId, {
      action: 'ai_modify',
      projectId: params.projectId,
      taskType: 'modify',
      modelTier: 'fast',
      description: `AI 수정: ${params.instruction.slice(0, 50)}`,
    });

    const tier: ModelTier = 'fast';
    const model = MODELS[tier];

    const response = await this.anthropic.messages.create({
      model: model.model,
      max_tokens: model.maxTokens,
      system: '코드 수정 전문가입니다. 사용자의 요청에 따라 코드를 수정합니다. 수정된 전체 코드를 출력하세요.',
      messages: [{
        role: 'user',
        content: `수정 요청: ${params.instruction}\n\n현재 코드:\n${params.currentCode || '(없음)'}`,
      }],
    });

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');

    return { content, model: model.model };
  }

  // ══════════════════════════════════════════════════════
  // ── 코드 생성 엔진 (Sprint 1~) ──────────────────────
  // ══════════════════════════════════════════════════════

  /** rate limit 대응 딜레이 */
  private async rateLimitDelay(ms: number = 3000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** 모델별 폴백 호출 — Sonnet/Opus 404 시 Haiku로 자동 폴백 + 크레딧 보정 + rate limit 재시도 */
  private async callWithFallback(
    tier: AppModelTier,
    system: string,
    messages: Anthropic.MessageParam[],
    retryCount: number = 0,
  ): Promise<{ content: string; actualTier: AppModelTier; inputTokens: number; outputTokens: number; fellBack: boolean }> {
    const model = APP_MODELS[tier];

    // 호출 간 딜레이 (rate limit 방지)
    if (retryCount === 0) await this.rateLimitDelay(2000);

    try {
      const response = await this.anthropic.messages.create({
        model: model.model,
        max_tokens: model.maxTokens,
        system,
        messages,
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        content,
        actualTier: tier,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        fellBack: false,
      };
    } catch (error: any) {
      // rate limit → 대기 후 재시도 (최대 3회)
      if (error.status === 429 && retryCount < 3) {
        const waitSec = Math.min(30, 10 * (retryCount + 1)); // 10s, 20s, 30s
        this.logger.warn(`Rate limit 도달, ${waitSec}초 후 재시도 (${retryCount + 1}/3)`);
        await this.rateLimitDelay(waitSec * 1000);
        return this.callWithFallback(tier, system, messages, retryCount + 1);
      }

      // 404 또는 모델 접근 불가 → Haiku(flash)로 폴백
      if (tier !== 'flash' && (error.status === 404 || error.status === 403 || error.message?.includes('model'))) {
        this.logger.warn(`${tier} 모델 사용 불가 (${error.status}), flash로 폴백합니다`);

        await this.rateLimitDelay(3000);
        const fallbackModel = APP_MODELS.flash;
        const response = await this.anthropic.messages.create({
          model: fallbackModel.model,
          max_tokens: fallbackModel.maxTokens,
          system,
          messages,
        });

        const content = response.content
          .filter(block => block.type === 'text')
          .map(block => (block as Anthropic.TextBlock).text)
          .join('\n');

        return {
          content,
          actualTier: 'flash',
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          fellBack: true,
        };
      }
      throw error;
    }
  }

  /** 사용 가능한 모델 목록 조회 (프론트 ModelSelector용) */
  getAvailableModels() {
    return Object.entries(APP_MODELS).map(([tier, config]) => ({
      tier,
      label: config.label,
      model: config.model,
      // ⚠️ Sonnet/Opus는 현재 사용 불가 → 표시만 하되 폴백 안내
      available: tier === 'flash', // TODO: API 키 확보 후 true로 변경
      fallbackNote: tier !== 'flash' ? '현재 Flash로 자동 전환됩니다 (비용은 Flash 기준)' : undefined,
    }));
  }

  /** 예상 크레딧 비용 계산 (차감 없이) */
  estimateGenerationCost(tier: AppModelTier, estimatedFileCount: number) {
    return this.creditService.estimateCost(tier as CreditModelTier, estimatedFileCount);
  }

  // ══════════════════════════════════════════════════════
  // ── Sprint 2: 코드 생성 파이프라인 ────────────────────
  // ══════════════════════════════════════════════════════

  /**
   * F7: SSE 스트리밍 앱 생성 — EventEmitter를 반환하여 실시간 진행상황 전송
   */
  generateFullAppSSE(userId: string, params: {
    projectId: string;
    template: string;
    answers: Record<string, string | string[]>;
    selectedFeatures: string[];
    modelTier: AppModelTier;
    theme?: string;
    chatHistory?: { role: string; content: string }[];
  }): EventEmitter {
    const emitter = new EventEmitter();
    // 비동기 실행 (emitter를 통해 진행상황 전송)
    this.generateFullApp(userId, params, emitter)
      .then(result => {
        emitter.emit('progress', {
          step: 'complete',
          progress: '4/4',
          message: `앱 생성 완료! ${result.fileCount}개 파일`,
          fileCount: result.fileCount,
        } as GenerationProgress);
        emitter.emit('done', result);
      })
      .catch(err => {
        emitter.emit('progress', {
          step: 'error',
          progress: '0/4',
          message: `생성 실패: ${err.message?.slice(0, 100)}`,
        } as GenerationProgress);
        emitter.emit('error', err);
      });
    return emitter;
  }

  /**
   * 전체 앱 생성 (4단계 Supabase 파이프라인)
   * 1. 아키텍처 설계 → JSON (Supabase 기반)
   * 2. Supabase SQL 스키마 생성 (CREATE TABLE + RLS)
   * 3. 프론트엔드 페이지 생성 (Next.js + Supabase Client)
   * 4. 설정 파일 + Supabase 유틸리티 생성
   */
  async generateFullApp(userId: string, params: {
    projectId: string;
    template: string;
    answers: Record<string, string | string[]>;
    selectedFeatures: string[];
    modelTier: AppModelTier;
    theme?: string;
    chatHistory?: { role: string; content: string }[];
  }, emitter?: EventEmitter): Promise<{
    success: boolean;
    files: { path: string; content: string }[];
    architecture: any;
    fileCount: number;
    totalCredits: number;
    actualTier: AppModelTier;
    fellBack: boolean;
    assessment: { confidence: number; incompleteFeatures: string[]; suggestions: string[] };
    steps: { step: string; status: string; fileCount: number }[];
  }> {
    const steps: { step: string; status: string; fileCount: number }[] = [];
    const allFiles: { path: string; content: string }[] = [];
    let totalCredits = 0;
    let fellBack = false;
    const tier = params.modelTier;

    // 프로젝트 상태 → generating
    await this.prisma.project.update({
      where: { id: params.projectId },
      data: { status: 'generating', modelUsed: tier },
    });

    try {
      // ── Step 1: 아키텍처 설계 (Supabase 기반) ─────
      this.logger.log(`[${params.projectId}] Step 1: 아키텍처 설계 (${tier})`);
      steps.push({ step: 'architecture', status: 'in_progress', fileCount: 0 });
      emitter?.emit('progress', { step: 'architecture', progress: '1/4', message: '아키텍처 설계 중...' } as GenerationProgress);

      const answersText = Object.entries(params.answers)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');

      const chatSummary = params.chatHistory
        ?.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
        .join('\n') || '';

      const archResult = await this.callWithFallback(tier, GENERATE_SYSTEM_PROMPT, [{
        role: 'user',
        content: `앱 아키텍처를 설계해주세요.

템플릿: ${params.template}
${TEMPLATE_PROMPTS[params.template] || ''}

사용자 답변:
${answersText}

선택한 기능: ${params.selectedFeatures.join(', ')}
테마: ${params.theme || 'basic-light'}

${chatSummary ? `대화 내역:\n${chatSummary}` : ''}`,
      }]);

      if (archResult.fellBack) fellBack = true;

      let architecture: any;
      try {
        const jsonMatch = archResult.content.match(/\{[\s\S]*\}/);
        architecture = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: archResult.content };
      } catch {
        architecture = { raw: archResult.content };
      }

      const archFile = { path: '_architecture.json', content: JSON.stringify(architecture, null, 2) };
      allFiles.push(archFile);
      steps[0] = { step: 'architecture', status: 'completed', fileCount: 1 };

      // ── Step 2: Supabase SQL 스키마 생성 ──────────
      this.logger.log(`[${params.projectId}] Step 2: Supabase SQL 스키마 생성`);
      steps.push({ step: 'schema', status: 'in_progress', fileCount: 0 });
      emitter?.emit('progress', { step: 'schema', progress: '2/4', message: 'DB 스키마 생성 중...', fileCount: allFiles.length } as GenerationProgress);

      const dbTables = architecture.dbTables || architecture.dbModels || [];
      const schemaResult = await this.callWithFallback(tier, SCHEMA_SYSTEM_PROMPT, [{
        role: 'user',
        content: `아래 테이블 정의를 기반으로 Supabase SQL 마이그레이션을 생성해주세요.

DB 테이블:
${JSON.stringify(dbTables, null, 2)}

앱 이름: ${architecture.appName || params.answers['biz_name'] || 'MyApp'}
기능: ${params.selectedFeatures.join(', ')}
인증: Supabase Auth (이메일/비밀번호)

반드시 포함:
1. profiles 테이블 (auth.users 확장 — name, phone, role 등)
2. 모든 테이블에 user_id uuid references auth.users
3. RLS 정책 (본인 데이터만 접근)
4. updated_at 자동 갱신 트리거`,
      }]);

      if (schemaResult.fellBack) fellBack = true;

      const schemaContent = this.extractCodeBlock(schemaResult.content, 'sql') || schemaResult.content;
      allFiles.push({ path: 'supabase/migrations/001_initial.sql', content: schemaContent });
      steps[1] = { step: 'schema', status: 'completed', fileCount: 1 };

      // ── Step 2.5: Supabase 자동 프로비저닝 ─────────
      let supabaseUrl = '';
      let supabaseAnonKey = '';

      if (this.supabaseService.isEnabled()) {
        this.logger.log(`[${params.projectId}] Step 2.5: Supabase 프로비저닝`);
        steps.push({ step: 'supabase', status: 'in_progress', fileCount: 0 });

        const provResult = await this.supabaseService.provisionForProject(
          params.projectId,
          architecture.appName || params.answers['biz_name'] as string || 'MyApp',
          schemaContent,
        );

        if (provResult.success) {
          supabaseUrl = provResult.supabaseUrl!;
          supabaseAnonKey = provResult.supabaseAnonKey!;
          steps[steps.length - 1] = { step: 'supabase', status: 'completed', fileCount: 0 };
          this.logger.log(`[${params.projectId}] ✅ Supabase 프로비저닝 완료: ${supabaseUrl}`);
        } else {
          steps[steps.length - 1] = { step: 'supabase', status: 'skipped', fileCount: 0 };
          this.logger.warn(`[${params.projectId}] ⚠️ Supabase 프로비저닝 실패 (코드 생성은 계속): ${provResult.error}`);
        }
      } else {
        this.logger.log(`[${params.projectId}] Supabase 프로비저닝 건너뜀 (미설정)`);
      }

      // ── Step 3: 프론트엔드 페이지 생성 (Supabase 연동) ──
      this.logger.log(`[${params.projectId}] Step 3: 프론트엔드 페이지 생성 (Supabase)`);
      steps.push({ step: 'frontend', status: 'in_progress', fileCount: 0 });

      const pages = architecture.pages || [];
      emitter?.emit('progress', { step: 'frontend', progress: '3/4', message: '프론트엔드 페이지 생성 중...', fileCount: allFiles.length, totalFiles: (pages.length || 5) + 15 } as GenerationProgress);
      let frontendFileCount = 0;

      // 테이블 이름 목록 (프론트엔드에서 참조)
      const tableNames = dbTables.map((t: any) => t.name).join(', ');

      for (const page of pages) {
        const frontendResult = await this.callWithFallback(tier, FRONTEND_SYSTEM_PROMPT, [{
          role: 'user',
          content: `Next.js + Supabase 페이지를 생성해주세요.

페이지: ${page.name} (${page.path})
설명: ${page.description}
컴포넌트: ${(page.components || []).join(', ')}

앱 이름: ${architecture.appName || ''}
테마: ${params.theme || 'basic-light'}
DB 테이블: ${tableNames}

Supabase SQL 스키마:
${schemaContent}

⚠️ 반드시 Supabase 클라이언트로 데이터 조회/저장하세요:
import { createClient } from '@/utils/supabase/client'
const supabase = createClient()

로그인/회원가입 페이지인 경우:
- supabase.auth.signInWithPassword({ email, password })
- supabase.auth.signUp({ email, password, options: { data: { name } } })
- 성공 시 router.push('/dashboard')

데이터 페이지인 경우:
- const { data } = await supabase.from('테이블명').select('*').eq('user_id', user.id)
- await supabase.from('테이블명').insert([{ ... }])`,
        }]);

        if (frontendResult.fellBack) fellBack = true;

        const frontendFiles = this.parseFileOutput(frontendResult.content, `src/app${page.path}`);
        if (frontendFiles.length === 0) {
          allFiles.push({ path: `src/app${page.path}/page.tsx`, content: frontendResult.content });
          frontendFileCount++;
        } else {
          allFiles.push(...frontendFiles);
          frontendFileCount += frontendFiles.length;
        }
        emitter?.emit('progress', { step: 'frontend', progress: '3/4', message: `페이지 생성 완료: ${page.name}`, detail: page.path, fileCount: allFiles.length } as GenerationProgress);
      }

      // Supabase 유틸 + 인증 페이지 + 레이아웃
      allFiles.push(...this.generateSupabaseUtils());
      allFiles.push(...this.generateAuthPages(architecture));
      allFiles.push(...this.generateCommonFrontendFiles(architecture, params.theme || 'basic-light'));
      frontendFileCount += 10; // utils(3) + auth pages(4) + layout(2) + middleware(1)
      steps[2] = { step: 'frontend', status: 'completed', fileCount: frontendFileCount };

      // ── Step 4: 설정 파일 생성 ────────────────────
      this.logger.log(`[${params.projectId}] Step 4: 설정 파일 생성`);
      steps.push({ step: 'config', status: 'in_progress', fileCount: 0 });
      emitter?.emit('progress', { step: 'config', progress: '4/4', message: '설정 파일 생성 중...', fileCount: allFiles.length } as GenerationProgress);

      const configFiles = this.generateConfigFiles(architecture, params.template, supabaseUrl, supabaseAnonKey);
      allFiles.push(...configFiles);
      steps[3] = { step: 'config', status: 'completed', fileCount: configFiles.length };

      // ── F2+F3: 코드 품질 자동 보정 ─────────────────
      this.logger.log(`[${params.projectId}] 코드 품질 보정: 마크다운 제거 + Import 검증`);
      emitter?.emit('progress', { step: 'quality', progress: '4/4', message: '코드 품질 검증 중... (마크다운 제거 + Import 검증)', fileCount: allFiles.length } as GenerationProgress);

      // F2: 마크다운 혼입 제거 + F4: 코드 잘림 감지 → 이어서 생성
      for (let i = 0; i < allFiles.length; i++) {
        allFiles[i] = { ...allFiles[i], content: this.sanitizeCode(allFiles[i].content, allFiles[i].path) };
        // F4: 코드 잘림 감지 → 이어서 생성
        if (allFiles[i].path.match(/\.(tsx?|jsx?)$/) && this.isCodeTruncated(allFiles[i].content)) {
          this.logger.warn(`[F4 코드 잘림 감지] ${allFiles[i].path} — 이어서 생성 시도`);
          allFiles[i] = {
            ...allFiles[i],
            content: await this.continueGeneration(tier, FRONTEND_SYSTEM_PROMPT, allFiles[i].content, allFiles[i].path),
          };
        }
      }

      // F3: Import 검증 + 미설치 패키지 자동 추가
      const validatedFiles = this.validateAndFixImports(allFiles);
      allFiles.length = 0;
      allFiles.push(...validatedFiles);

      // ── 크레딧 차감 (모델 + 파일 수 기반) ─────────
      const fileCount = allFiles.length;
      const actualTier: CreditModelTier = fellBack ? 'flash' : (tier as CreditModelTier);

      // 맛보기 체크
      const balance = await this.creditService.getBalance(userId);
      if (!balance.freeTrialUsed) {
        await this.creditService.deduct(userId, {
          action: 'free_trial',
          projectId: params.projectId,
          taskType: 'generate_full_app',
          modelTier: actualTier,
          description: `맛보기 앱 생성: ${architecture.appName || params.template}`,
        });
      } else {
        const creditResult = await this.creditService.deductByModel(userId, {
          tier: actualTier,
          fileCount,
          projectId: params.projectId,
          taskType: 'generate_full_app',
          description: `앱 생성: ${architecture.appName || params.template} (${fileCount}파일, ${actualTier})`,
        });
        totalCredits = creditResult.cost;
      }

      // ── AI 자기 평가 추출 ─────────────────────────
      const assessment = this.extractAssessment(allFiles);

      // ── DB 저장 ───────────────────────────────────
      await this.prisma.project.update({
        where: { id: params.projectId },
        data: {
          generatedCode: allFiles as any,
          status: 'active',
          modelUsed: actualTier,
          currentVersion: 1,
          versions: [{
            version: 1,
            createdAt: new Date().toISOString(),
            description: '최초 생성 (Supabase)',
            fileCount,
          }] as any,
          projectContext: {
            completedFeatures: architecture.features || params.selectedFeatures,
            pendingFeatures: assessment.incompleteFeatures,
            lastAction: '앱 생성 완료 (Supabase)',
            userPreferences: { model: actualTier, theme: params.theme || 'basic-light' },
            architecture: { appName: architecture.appName, pages: (architecture.pages || []).length, tables: dbTables.length },
          } as any,
        },
      });

      this.logger.log(`[${params.projectId}] ✅ Supabase 앱 생성 완료! ${fileCount}파일, ${totalCredits}cr`);

      return {
        success: true,
        files: allFiles,
        architecture,
        fileCount,
        totalCredits,
        actualTier: actualTier as AppModelTier,
        fellBack,
        assessment,
        steps,
      };
    } catch (error: any) {
      this.logger.error(`[${params.projectId}] 생성 실패: ${error.message}`);

      // 실패 시 상태 복원
      await this.prisma.project.update({
        where: { id: params.projectId },
        data: { status: 'draft' },
      });

      throw error;
    }
  }

  // ── 파일 수정 (채팅 기반) ─────────────────────────────
  async modifyFiles(userId: string, params: {
    projectId: string;
    message: string;
    modelTier: AppModelTier;
    targetFiles?: string[];
  }): Promise<{
    modifiedFiles: { path: string; content: string }[];
    totalCredits: number;
    actualTier: AppModelTier;
    fellBack: boolean;
    suggestHealthCheck: boolean;
    totalModifications: number;
  }> {
    // 기존 프로젝트 로드
    const project = await this.prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new Error('권한이 없습니다');

    const existingFiles = (project.generatedCode as { path: string; content: string }[]) || [];
    const tier = params.modelTier;

    // 수정 대상 파일 추출
    const targetFileContents = params.targetFiles
      ? existingFiles.filter(f => params.targetFiles!.some(t => f.path.includes(t)))
      : existingFiles.slice(0, 10); // 최대 10개

    const result = await this.callWithFallback(tier, MODIFY_SYSTEM_PROMPT, [{
      role: 'user',
      content: `수정 요청: ${params.message}

현재 파일:
${targetFileContents.map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n\n')}

프로젝트 컨텍스트:
${JSON.stringify(project.projectContext || {}, null, 2)}`,
    }]);

    const modifiedFiles = this.parseFileOutput(result.content, '');
    const actualTier: CreditModelTier = result.fellBack ? 'flash' : (tier as CreditModelTier);

    // 크레딧 차감
    const creditResult = await this.creditService.deductByModel(userId, {
      tier: actualTier,
      fileCount: modifiedFiles.length || 1,
      projectId: params.projectId,
      taskType: 'modify',
      description: `AI 수정: ${params.message.slice(0, 50)} (${modifiedFiles.length}파일)`,
    });

    // 기존 파일에 수정 적용
    const updatedFiles = [...existingFiles];
    for (const mod of modifiedFiles) {
      const idx = updatedFiles.findIndex(f => f.path === mod.path);
      if (idx >= 0) {
        updatedFiles[idx] = mod;
      } else {
        updatedFiles.push(mod);
      }
    }

    // 버전 + 수정 횟수 업데이트 (수정 전 스냅샷 저장 → 롤백 가능)
    const versions = (project.versions as any[]) || [];
    const newVersion = (project.currentVersion || 1) + 1;
    versions.push({
      version: newVersion,
      createdAt: new Date().toISOString(),
      description: params.message.slice(0, 100),
      fileCount: modifiedFiles.length,
      modifiedPaths: modifiedFiles.map(f => f.path),
      snapshot: existingFiles, // 수정 전 상태 저장 (롤백용)
    });

    await this.prisma.project.update({
      where: { id: params.projectId },
      data: {
        generatedCode: updatedFiles as any,
        currentVersion: newVersion,
        versions: versions as any,
        totalModifications: { increment: 1 },
        modelUsed: actualTier,
        projectContext: {
          ...(project.projectContext as any || {}),
          lastAction: `수정: ${params.message.slice(0, 50)}`,
          lastModifiedAt: new Date().toISOString(),
          userPreferences: {
            ...((project.projectContext as any)?.userPreferences || {}),
            model: actualTier,
          },
        } as any,
      },
    });

    // 5회 수정마다 헬스체크 제안 플래그
    const newTotal = (project.totalModifications || 0) + 1;
    const suggestHealthCheck = newTotal > 0 && newTotal % 5 === 0;

    return {
      modifiedFiles,
      totalCredits: creditResult.cost,
      actualTier: actualTier as AppModelTier,
      fellBack: result.fellBack,
      suggestHealthCheck,
      totalModifications: newTotal,
    };
  }

  // ══════════════════════════════════════════════════════
  // ── Sprint 4: 코드 헬스체크 ────────────────────────────
  // ══════════════════════════════════════════════════════

  async healthCheck(userId: string, projectId: string): Promise<{
    score: number;
    issues: { type: string; severity: 'low' | 'medium' | 'high'; count: number; description: string }[];
    summary: string;
    suggestCleanup: boolean;
  }> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new Error('권한이 없습니다');

    const files = (project.generatedCode as { path: string; content: string }[]) || [];
    if (files.length === 0) return { score: 100, issues: [], summary: '생성된 코드가 없습니다.', suggestCleanup: false };

    const allContent = files.map(f => f.content).join('\n');
    const issues: { type: string; severity: 'low' | 'medium' | 'high'; count: number; description: string }[] = [];

    // 1. TODO/FIXME 카운트
    const todoCount = (allContent.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
    if (todoCount > 0) {
      issues.push({ type: 'todo', severity: todoCount > 5 ? 'high' : 'medium', count: todoCount, description: `TODO/FIXME 주석 ${todoCount}개 발견` });
    }

    // 2. placeholder/빈 함수 감지
    const placeholderCount = (allContent.match(/placeholder|lorem ipsum|dummy|sample data/gi) || []).length;
    if (placeholderCount > 0) {
      issues.push({ type: 'placeholder', severity: 'medium', count: placeholderCount, description: `플레이스홀더/더미 데이터 ${placeholderCount}개` });
    }

    // 3. console.log 잔여
    const consoleCount = (allContent.match(/console\.(log|debug|warn|error)\(/g) || []).length;
    if (consoleCount > 3) {
      issues.push({ type: 'console', severity: 'low', count: consoleCount, description: `console.log 등 ${consoleCount}개 (배포 전 제거 권장)` });
    }

    // 4. type any 사용
    const anyCount = (allContent.match(/:\s*any\b/g) || []).length;
    if (anyCount > 5) {
      issues.push({ type: 'any-type', severity: 'low', count: anyCount, description: `any 타입 ${anyCount}개 (타입 안전성 개선 권장)` });
    }

    // 5. 빈 catch 블록
    const emptyCatchCount = (allContent.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) || []).length;
    if (emptyCatchCount > 0) {
      issues.push({ type: 'empty-catch', severity: 'medium', count: emptyCatchCount, description: `빈 catch 블록 ${emptyCatchCount}개 (에러 처리 필요)` });
    }

    // 6. 중복 import 패턴 (대략적)
    const importLines = allContent.match(/^import .+$/gm) || [];
    const importSet = new Set(importLines);
    const dupImports = importLines.length - importSet.size;
    if (dupImports > 3) {
      issues.push({ type: 'dup-import', severity: 'low', count: dupImports, description: `중복 import ${dupImports}개` });
    }

    // 점수 계산 (100점 만점)
    let score = 100;
    for (const issue of issues) {
      const penalty = issue.severity === 'high' ? issue.count * 5 : issue.severity === 'medium' ? issue.count * 3 : issue.count * 1;
      score -= penalty;
    }
    score = Math.max(0, Math.min(100, score));

    const summary = issues.length === 0
      ? '✅ 코드 품질이 우수합니다!'
      : `${issues.length}가지 개선 항목이 있습니다. ${score >= 80 ? '전체적으로 양호합니다.' : score >= 50 ? '일부 개선이 필요합니다.' : '코드 정리를 권장합니다.'}`;

    // DB에 점수 저장
    await this.prisma.project.update({
      where: { id: projectId },
      data: { healthScore: score },
    });

    return { score, issues, summary, suggestCleanup: score < 70 };
  }

  // ── Sprint 5: AI 코드 정리 ──────────────────────────

  async cleanupCode(userId: string, params: {
    projectId: string;
    modelTier: AppModelTier;
  }): Promise<{
    cleanedFiles: { path: string; content: string }[];
    totalCredits: number;
    improvements: string[];
    actualTier: AppModelTier;
    fellBack: boolean;
  }> {
    const project = await this.prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다');
    if (project.userId !== userId) throw new Error('권한이 없습니다');

    const existingFiles = (project.generatedCode as { path: string; content: string }[]) || [];
    if (existingFiles.length === 0) throw new Error('정리할 코드가 없습니다');

    const tier = params.modelTier;

    // 코드 정리 프롬프트
    const cleanupPrompt = `다음 코드를 정리해주세요. 수정한 파일만 [FILE: path] 형식으로 반환하세요.

정리 항목:
- TODO/FIXME 주석 제거 또는 구현
- placeholder/더미 데이터 정리
- console.log 불필요한 것 제거
- any 타입을 구체적 타입으로 변경
- 빈 catch 블록에 에러 처리 추가
- 중복 코드 통합
- 코드 스타일 정리

마지막에 <!--IMPROVEMENTS ["개선1", "개선2"]--> 형식으로 개선사항 목록을 추가하세요.

현재 파일:
${existingFiles.slice(0, 15).map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n\n')}`;

    const result = await this.callWithFallback(tier, MODIFY_SYSTEM_PROMPT, [{
      role: 'user',
      content: cleanupPrompt,
    }]);

    const cleanedFiles = this.parseFileOutput(result.content, '');
    const actualTier: CreditModelTier = result.fellBack ? 'flash' : (tier as CreditModelTier);

    // 개선사항 추출
    const impMatch = result.content.match(/<!--IMPROVEMENTS\s*(\[.*?\])\s*-->/s);
    let improvements: string[] = [];
    try {
      if (impMatch) improvements = JSON.parse(impMatch[1]);
    } catch { /* */ }

    // 크레딧 차감
    const creditResult = await this.creditService.deductByModel(userId, {
      tier: actualTier,
      fileCount: cleanedFiles.length || 1,
      projectId: params.projectId,
      taskType: 'cleanup',
      description: `코드 정리 (${cleanedFiles.length}파일)`,
    });

    // 기존 파일에 정리 적용
    const updatedFiles = [...existingFiles];
    for (const cleaned of cleanedFiles) {
      const idx = updatedFiles.findIndex(f => f.path === cleaned.path);
      if (idx >= 0) updatedFiles[idx] = cleaned;
    }

    // 버전 + 스냅샷 저장
    const versions = (project.versions as any[]) || [];
    const newVersion = (project.currentVersion || 1) + 1;
    versions.push({
      version: newVersion,
      createdAt: new Date().toISOString(),
      description: `코드 정리 (${cleanedFiles.length}파일 개선)`,
      fileCount: cleanedFiles.length,
      snapshot: existingFiles,
    });

    await this.prisma.project.update({
      where: { id: params.projectId },
      data: {
        generatedCode: updatedFiles as any,
        currentVersion: newVersion,
        versions: versions as any,
        totalModifications: { increment: 1 },
        modelUsed: actualTier,
        projectContext: {
          ...(project.projectContext as any || {}),
          lastAction: `코드 정리 완료`,
          lastModifiedAt: new Date().toISOString(),
        } as any,
      },
    });

    return {
      cleanedFiles,
      totalCredits: creditResult.cost,
      improvements,
      actualTier: actualTier as AppModelTier,
      fellBack: result.fellBack,
    };
  }

  // ══════════════════════════════════════════════════════
  // ── 유틸리티 메서드 ───────────────────────────────────
  // ══════════════════════════════════════════════════════

  /** [FILE: path] 태그로 구분된 AI 출력을 파싱 */
  private parseFileOutput(output: string, defaultDir: string): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];
    const regex = /\[FILE:\s*(.+?)\]\s*\n([\s\S]*?)(?=\[FILE:|$)/g;
    let match;

    while ((match = regex.exec(output)) !== null) {
      let filePath = match[1].trim();
      // 상대 경로 보정
      if (defaultDir && !filePath.startsWith('src/') && !filePath.startsWith('prisma/') && !filePath.includes('/')) {
        filePath = `${defaultDir}/${filePath}`;
      }
      files.push({ path: filePath, content: match[2].trim() });
    }

    // [FILE:] 태그가 없으면 코드 블록 추출 시도
    if (files.length === 0 && output.trim()) {
      const codeBlock = this.extractCodeBlock(output, 'typescript') || this.extractCodeBlock(output, 'tsx') || output.trim();
      if (defaultDir) {
        files.push({ path: `${defaultDir}/index.ts`, content: codeBlock });
      }
    }

    return files;
  }

  /** 코드 블록 추출 (```lang ... ```) */
  private extractCodeBlock(text: string, lang: string): string | null {
    const regex = new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)```', 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  // ══════════════════════════════════════════════════════
  // ── F2: 마크다운 혼입 방지 (post-processing) ──────────
  // ══════════════════════════════════════════════════════

  /** AI 생성 코드에서 마크다운/이모지 오염 제거 */
  private sanitizeCode(content: string, filePath: string): string {
    // SQL 파일은 별도 처리
    if (filePath.endsWith('.sql')) return this.sanitizeSql(content);
    // JSON 파일은 건드리지 않음
    if (filePath.endsWith('.json')) return content;

    let cleaned = content;

    // 1. 코드 블록 래퍼 제거 (```tsx ... ``` → 내부 코드만)
    const codeBlockMatch = cleaned.match(/^```(?:tsx?|jsx?|typescript|javascript)?\s*\n([\s\S]*?)```\s*$/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1];
    }
    // 남아있는 ``` 라인 제거
    cleaned = cleaned.replace(/^```\w*\s*$/gm, '');

    // 2. 마크다운 헤더 제거 (### 제목 → // 제목)
    cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '// $1');

    // 3. 마크다운 볼드/이탤릭 제거 (줄 시작 또는 공백 뒤에서만 — 코드의 곱하기 * 보호)
    cleaned = cleaned.replace(/(?:^|\s)\*\*(.+?)\*\*(?=\s|$|[.,;:!?)])/gm, ' $1');
    // 단일 * 이탤릭은 코드 곱하기와 충돌하므로 제거하지 않음

    // 4. 이모지 체크마크/X 제거 (줄 시작 부분)
    cleaned = cleaned.replace(/^[✅❌📌🔴🟡🟢⚠️🚀💡]\s*/gm, '');

    // 5. 빈 줄 정리 (3줄 이상 연속 빈 줄 → 2줄)
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

    return cleaned.trim();
  }

  /** SQL 파일에서 마크다운 오염 제거 */
  private sanitizeSql(content: string): string {
    let cleaned = content;
    // 코드 블록 래퍼 제거
    const sqlBlock = cleaned.match(/^```sql\s*\n([\s\S]*?)```\s*$/);
    if (sqlBlock) cleaned = sqlBlock[1];
    cleaned = cleaned.replace(/^```\w*\s*$/gm, '');
    // 마크다운 헤더 → SQL 주석
    cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '-- $1');
    return cleaned.trim();
  }

  // ══════════════════════════════════════════════════════
  // ── F3: Import 검증 + 미설치 패키지 감지 ──────────────
  // ══════════════════════════════════════════════════════

  /** 생성된 파일들의 import를 검증하고 package.json 의존성 자동 보정 */
  private validateAndFixImports(files: { path: string; content: string }[]): { path: string; content: string }[] {
    // 허용된 패키지 목록 (설치 보장)
    const ALLOWED_PACKAGES = new Set([
      'react', 'react-dom', 'next', 'next/navigation', 'next/link', 'next/image', 'next/font',
      '@supabase/supabase-js', '@supabase/ssr',
      'lucide-react', // 아이콘 패키지 (허용)
    ]);

    // 내부 경로 패턴 (검증 불필요)
    const INTERNAL_PATTERNS = [/^@\//, /^\./, /^\//];

    // 자동 추가 가능한 패키지 (npm 이름 → 버전)
    const AUTO_ADD_PACKAGES: Record<string, string> = {
      'lucide-react': '^0.460.0',
      'date-fns': '^4.1.0',
      'recharts': '^2.15.0',
      'zod': '^3.24.0',
      'clsx': '^2.1.0',
    };

    // 금지 패키지 (import 발견 시 제거)
    const BANNED_PACKAGES = new Set([
      '@heroicons/react', '@heroicons/react/24/outline', '@heroicons/react/24/solid',
      'react-icons', 'react-icons/fi', 'react-icons/fa', 'react-icons/md',
      '@radix-ui/react-icons',
    ]);

    const detectedPackages = new Set<string>();

    const fixedFiles = files.map(file => {
      if (!file.path.match(/\.(tsx?|jsx?)$/)) return file;

      let content = file.content;
      const lines = content.split('\n');
      const fixedLines: string[] = [];

      for (const line of lines) {
        // import ... from 'package' 패턴 감지
        const importMatch = line.match(/^import\s+.*from\s+['"]([@\w][^'"]*)['"]/);
        if (importMatch) {
          const pkg = importMatch[1];
          const pkgName = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];

          // 금지 패키지 → 줄 제거
          if (BANNED_PACKAGES.has(pkgName) || BANNED_PACKAGES.has(pkg)) {
            this.logger.warn(`[Import 제거] ${file.path}: ${pkg} (금지 패키지)`);
            continue; // 이 줄 스킵
          }

          // 내부 경로 → 통과
          if (INTERNAL_PATTERNS.some(p => p.test(pkg))) {
            fixedLines.push(line);
            continue;
          }

          // 허용/자동추가 가능 패키지 → 통과 + 기록
          if (ALLOWED_PACKAGES.has(pkgName) || ALLOWED_PACKAGES.has(pkg) || AUTO_ADD_PACKAGES[pkgName]) {
            detectedPackages.add(pkgName);
            fixedLines.push(line);
            continue;
          }

          // 알 수 없는 패키지 → 일단 통과 (빌드 시 에러로 잡힘)
          this.logger.warn(`[Import 경고] ${file.path}: 미확인 패키지 ${pkg}`);
          fixedLines.push(line);
          continue;
        }

        fixedLines.push(line);
      }

      return { path: file.path, content: fixedLines.join('\n') };
    });

    // package.json에 감지된 패키지 자동 추가
    const pkgFileIdx = fixedFiles.findIndex(f => f.path === 'package.json');
    if (pkgFileIdx >= 0) {
      try {
        const pkg = JSON.parse(fixedFiles[pkgFileIdx].content);
        const deps = pkg.dependencies || {};
        for (const detected of detectedPackages) {
          if (AUTO_ADD_PACKAGES[detected] && !deps[detected]) {
            deps[detected] = AUTO_ADD_PACKAGES[detected];
            this.logger.log(`[Import 자동추가] package.json: ${detected} ${AUTO_ADD_PACKAGES[detected]}`);
          }
        }
        pkg.dependencies = deps;
        fixedFiles[pkgFileIdx] = { path: 'package.json', content: JSON.stringify(pkg, null, 2) };
      } catch { /* JSON 파싱 실패 시 무시 */ }
    }

    return fixedFiles;
  }

  // ══════════════════════════════════════════════════════
  // ── F4: 코드 잘림 감지 + 이어서 생성 ──────────────────
  // ══════════════════════════════════════════════════════

  /** 코드가 중간에 잘렸는지 감지 (deploy.service에서도 호출) */
  isCodeTruncated(content: string): boolean {
    const trimmed = content.trim();
    if (!trimmed) return false;

    // 열린 중괄호/괄호 수 체크
    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;
    if (opens > closes + 1) return true;

    // 마지막 줄이 불완전한 패턴
    const lastLine = trimmed.split('\n').pop()?.trim() || '';
    const incompletePatterns = [
      /^\s*(const|let|var|function|class|import|export)\s+\w+\s*$/, // 선언 미완성
      /[{(,]\s*$/, // 열린 블록/파라미터
      /=>\s*$/, // 화살표 함수 미완성
      /\?\s*$/, // 삼항 연산자 미완성
    ];
    if (incompletePatterns.some(p => p.test(lastLine))) return true;

    // 페이지/컴포넌트 파일이 export default 없이 끝나면 잘림 가능성 높음
    const hasDefaultExport = /export\s+default\s/.test(trimmed) || /export\s+\{[^}]*default/.test(trimmed);
    const isPageOrComponent = trimmed.includes('return') && (trimmed.includes('function') || trimmed.includes('=>'));
    if (isPageOrComponent && !hasDefaultExport) return true;

    // 줄 수 대비 중괄호 불균형 (짧은 파일인데 열린 게 더 많으면)
    const lines = trimmed.split('\n');
    if (lines.length < 100 && opens > closes) return true;

    return false;
  }

  /** F4: 잘린 코드 이어서 생성 (최대 2회 continuation, deploy.service에서도 호출) */
  async continueGeneration(
    tier: AppModelTier,
    systemPrompt: string,
    truncatedContent: string,
    filePath: string,
  ): Promise<string> {
    let fullContent = truncatedContent;
    const MAX_CONTINUATIONS = 2;

    for (let attempt = 0; attempt < MAX_CONTINUATIONS; attempt++) {
      if (!this.isCodeTruncated(fullContent)) break;

      this.logger.log(`[F4 이어서 생성] ${filePath} — 시도 ${attempt + 1}/${MAX_CONTINUATIONS}`);

      const lastLines = fullContent.split('\n').slice(-30).join('\n');
      const contResult = await this.callWithFallback(tier, systemPrompt, [{
        role: 'user',
        content: `아래 코드가 중간에 잘렸습니다. 잘린 부분부터 이어서 작성해주세요.
절대 처음부터 다시 작성하지 마세요. 잘린 지점부터 나머지만 출력하세요.
마크다운 코드 블록(\`\`\`) 사용 금지! 순수 코드만 출력하세요.

잘린 코드의 마지막 30줄:
${lastLines}`,
      }, {
        role: 'assistant',
        content: lastLines.split('\n').slice(-3).join('\n'),
      }]);

      // 이어붙이기 (중복 줄 제거)
      const continuation = this.sanitizeCode(contResult.content, filePath);
      const existingLines = fullContent.split('\n');
      const newLines = continuation.split('\n');

      // 겹치는 부분 찾기 (마지막 3줄 비교)
      let overlapIdx = -1;
      for (let i = 0; i < Math.min(5, newLines.length); i++) {
        if (existingLines[existingLines.length - 1]?.trim() === newLines[i]?.trim() && newLines[i]?.trim()) {
          overlapIdx = i;
          break;
        }
      }

      if (overlapIdx >= 0) {
        fullContent = fullContent + '\n' + newLines.slice(overlapIdx + 1).join('\n');
      } else {
        fullContent = fullContent + '\n' + continuation;
      }
    }

    return fullContent;
  }

  // ══════════════════════════════════════════════════════
  // ── F6: 빌드 에러 AI 자동 수정 ────────────────────────
  // ══════════════════════════════════════════════════════

  /** 빌드 에러를 분석하고 파일을 수정하여 반환 */
  async fixBuildErrors(
    tier: string,
    targetFiles: { path: string; content: string }[],
    errorLog: string,
  ): Promise<{ path: string; content: string }[]> {
    const modelTier = (tier === 'smart' || tier === 'pro') ? tier as AppModelTier : 'flash' as AppModelTier;

    const fixPrompt = `아래 Next.js 프로젝트에서 빌드 에러가 발생했습니다.
에러 로그를 분석하고, 문제가 있는 파일을 수정해주세요.

⚠️ 규칙:
- 수정된 파일만 [FILE: 경로] 형식으로 반환
- 파일의 전체 코드를 출력 (부분 수정 아님)
- 마크다운 코드 블록(\`\`\`) 절대 금지
- 미설치 패키지 import 금지 (@heroicons, react-icons 등)
- lucide-react 아이콘은 사용 가능

빌드 에러 로그:
${errorLog.slice(0, 1500)}

현재 파일:
${targetFiles.map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n\n')}`;

    const result = await this.callWithFallback(modelTier, MODIFY_SYSTEM_PROMPT, [{
      role: 'user',
      content: fixPrompt,
    }]);

    const fixedFiles = this.parseFileOutput(result.content, '');

    // 수정된 파일에 F2+F3 적용
    return fixedFiles.map(f => ({
      path: f.path,
      content: this.sanitizeCode(f.content, f.path),
    }));
  }

  /** API 엔드포인트를 모듈 단위로 그룹핑 */
  private groupEndpointsByModule(endpoints: any[]): Record<string, any[]> {
    const modules: Record<string, any[]> = {};
    for (const ep of endpoints) {
      if (!ep.path) continue;
      const parts = ep.path.split('/').filter(Boolean);
      // /api/reservations/xxx → reservations
      const moduleName = parts[1] || parts[0] || 'main';
      if (!modules[moduleName]) modules[moduleName] = [];
      modules[moduleName].push(ep);
    }
    return modules;
  }

  /** AI 자기 평가 추출 */
  private extractAssessment(files: { path: string; content: string }[]): {
    confidence: number;
    incompleteFeatures: string[];
    suggestions: string[];
  } {
    let todoCount = 0;
    let placeholderCount = 0;
    const incompleteFeatures: string[] = [];

    for (const file of files) {
      const content = file.content;
      const todos = (content.match(/TODO|FIXME|HACK/g) || []).length;
      const placeholders = (content.match(/placeholder|lorem|dummy|sample/gi) || []).length;
      todoCount += todos;
      placeholderCount += placeholders;

      if (todos > 0 || placeholders > 0) {
        incompleteFeatures.push(file.path);
      }
    }

    const totalFiles = files.filter(f => !f.path.startsWith('_')).length;
    const cleanFiles = totalFiles - incompleteFeatures.length;
    const confidence = totalFiles > 0 ? Math.round((cleanFiles / totalFiles) * 100) : 50;

    const suggestions: string[] = [];
    if (confidence < 70) suggestions.push('더 정확한 결과를 위해 Smart 모델을 추천합니다');
    if (todoCount > 5) suggestions.push(`TODO가 ${todoCount}개 남아있습니다. 추가 수정이 필요합니다`);
    if (placeholderCount > 3) suggestions.push('플레이스홀더 데이터를 실제 데이터로 교체하세요');

    return { confidence: Math.min(confidence, 100), incompleteFeatures, suggestions };
  }

  /** 공통 백엔드 파일 생성 (레거시 — Supabase 모드에서는 사용 안함) */
  private generateCommonBackendFiles(architecture: any, moduleNames: string[]): { path: string; content: string }[] {
    const appName = (architecture.appName || 'my-app').toLowerCase().replace(/[^a-z0-9]/g, '-');

    return [
      {
        path: 'src/main.ts',
        content: `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(process.env.PORT || 4000);
  console.log(\`🚀 \${process.env.npm_package_name || '${appName}'} API running on port \${process.env.PORT || 4000}\`);
}
bootstrap();`,
      },
      {
        path: 'src/app.module.ts',
        content: `import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
${moduleNames.map(m => `// import { ${this.capitalize(m)}Module } from './${m}/${m}.module';`).join('\n')}

@Module({
  imports: [
    ${moduleNames.map(m => `// ${this.capitalize(m)}Module,`).join('\n    ')}
  ],
  providers: [PrismaService],
})
export class AppModule {}`,
      },
      {
        path: 'src/prisma.service.ts',
        content: `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}`,
      },
    ];
  }

  // ══════════════════════════════════════════════════════
  // ── Supabase 유틸리티 파일 생성 ────────────────────────
  // ══════════════════════════════════════════════════════

  /** Supabase 클라이언트 유틸리티 (브라우저 + 서버 + 미들웨어) */
  private generateSupabaseUtils(): { path: string; content: string }[] {
    return [
      {
        path: 'src/utils/supabase/client.ts',
        content: `import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}`,
      },
      {
        path: 'src/utils/supabase/server.ts',
        content: `import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 무시 — middleware가 처리
          }
        },
      },
    }
  )
}`,
      },
      {
        path: 'src/middleware.ts',
        content: `import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }))
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 토큰 갱신 (getSession 아닌 getUser 사용 — 보안)
  const { data: { user } } = await supabase.auth.getUser()

  // 비로그인 사용자 → 로그인 페이지로 리다이렉트 (공개 경로 제외)
  const publicPaths = ['/', '/login', '/signup', '/auth']
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith('/auth'))

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}`,
      },
    ];
  }

  /** Supabase Auth 페이지 생성 (로그인 + 회원가입 + 콜백) */
  private generateAuthPages(architecture: any): { path: string; content: string }[] {
    const appName = architecture.appName || 'My App';

    return [
      {
        path: 'src/app/login/page.tsx',
        content: `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">${appName}</h1>
          <p className="text-gray-500 text-center mb-8">로그인하여 시작하세요</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="email@example.com" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••" required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-blue-600 font-medium hover:underline">회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  );
}`,
      },
      {
        path: 'src/app/signup/page.tsx',
        content: `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold mb-2">이메일을 확인해주세요</h2>
          <p className="text-gray-500 mb-6">{email}로 확인 링크를 보냈습니다.</p>
          <Link href="/login" className="text-blue-600 font-medium hover:underline">로그인 페이지로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">회원가입</h1>
          <p className="text-gray-500 text-center mb-8">새 계정을 만들어 시작하세요</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="홍길동" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="email@example.com" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="6자 이상" required minLength={6}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}`,
      },
      {
        path: 'src/app/auth/callback/route.ts',
        content: `import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(\`\${origin}\${next}\`)
    }
  }

  return NextResponse.redirect(\`\${origin}/login?error=auth_failed\`)
}`,
      },
      {
        path: 'src/components/AuthGuard.tsx',
        content: `'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (!user) return null;

  return <>{children}</>;
}`,
      },
    ];
  }

  /** 공통 프론트엔드 파일 생성 */
  private generateCommonFrontendFiles(architecture: any, theme: string): { path: string; content: string }[] {
    const appName = architecture.appName || 'My App';

    return [
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${appName}',
  description: '${architecture.description || 'Foundry AI로 생성된 앱'}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}`,
      },
      {
        path: 'src/app/globals.css',
        content: `@import "tailwindcss";

:root {
  --color-primary: #3182f6;
  --color-background: #ffffff;
  --color-foreground: #171717;
}`,
      },
    ];
  }

  /** 설정 파일 생성 (Supabase 기반) */
  private generateConfigFiles(architecture: any, template: string, supabaseUrl?: string, supabaseAnonKey?: string): { path: string; content: string }[] {
    const appName = (architecture.appName || template || 'my-app').toLowerCase().replace(/[^a-z0-9가-힣]/g, '-');
    const dbTables = architecture.dbTables || architecture.dbModels || [];

    return [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: appName,
          version: '1.0.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            next: '^16.0.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            typescript: '^5.0.0',
            tailwindcss: '^4.0.0',
            '@supabase/supabase-js': '^2.49.0',
            '@supabase/ssr': '^0.5.0',
          },
          devDependencies: {
            '@types/node': '^22.0.0',
            '@types/react': '^19.0.0',
          },
        }, null, 2),
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'es2017',
            lib: ['dom', 'es2017'],
            jsx: 'preserve',
            module: 'esnext',
            moduleResolution: 'bundler',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            paths: { '@/*': ['./src/*'] },
          },
          include: ['**/*.ts', '**/*.tsx'],
          exclude: ['node_modules'],
        }, null, 2),
      },
      {
        path: '.env.local',
        content: supabaseUrl && supabaseAnonKey
          ? `# Supabase 설정 (Foundry가 자동으로 생성했습니다)
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`
          : `# Supabase 설정 — Supabase 대시보드 > Settings > API에서 복사
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`,
      },
      {
        path: 'next.config.ts',
        content: `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Supabase 연동 시 이미지 도메인 허용
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;`,
      },
      {
        path: 'README.md',
        content: `# ${architecture.appName || appName}

${architecture.description || 'Foundry AI MVP 빌더로 생성된 프로젝트입니다.'}

## 기술 스택
- **프론트엔드**: Next.js 16 + TypeScript + Tailwind CSS
- **백엔드**: Supabase (PostgreSQL + Auth + Realtime)
- **인증**: Supabase Auth (이메일/비밀번호)

## 시작하기

### 1. Supabase 프로젝트 생성
1. [supabase.com](https://supabase.com)에서 무료 계정 생성
2. New Project 클릭 → 프로젝트 생성
3. Settings > API에서 URL과 anon key 복사

### 2. 환경변수 설정
\`\`\`bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY 입력
\`\`\`

### 3. DB 테이블 생성
Supabase 대시보드 > SQL Editor에서 \`supabase/migrations/001_initial.sql\` 내용을 실행

### 4. 개발 서버 실행
\`\`\`bash
npm install
npm run dev
\`\`\`

## 생성 정보
- 템플릿: ${template}
- 페이지 수: ${(architecture.pages || []).length}
- DB 테이블 수: ${dbTables.length}
- 인증: Supabase Auth ✅
- RLS 보안: 적용 ✅
`,
      },
    ];
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
