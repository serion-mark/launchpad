import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { CreditService, type ModelTier as CreditModelTier } from '../credit/credit.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MemoryService } from './memory.service';
import { PrismaService } from '../prisma.service';

// ── F7: SSE 진행상황 이벤트 타입 ─────────────────────
export type GenerationProgress = {
  step: 'architecture' | 'schema' | 'supabase' | 'frontend' | 'config' | 'quality' | 'credits' | 'complete' | 'error';
  progress: string;     // "1/4", "2/4" 등
  message: string;      // 사용자에게 보여줄 메시지
  detail?: string;      // 파일명 등 상세 정보
  fileCount?: number;   // 현재까지 생성된 파일 수
  totalFiles?: number;  // 예상 전체 파일 수
  generatedFiles?: { path: string; content: string }[]; // 실시간 미리보기용 생성 파일
};

// ── 모델 티어 (레거시 호환) ─────────────────────────────
type ModelTier = 'fast' | 'standard' | 'premium';

// ── 새 모델 3단계 (코드 생성 엔진) ─────────────────────
type AppModelTier = 'flash' | 'smart' | 'pro';

const APP_MODELS: Record<AppModelTier, { model: string; maxTokens: number; label: string }> = {
  flash: { model: 'claude-haiku-4-5-20251001', maxTokens: 8192, label: 'Flash (빠르고 저렴)' },
  smart: { model: 'claude-sonnet-4-20250514', maxTokens: 16384, label: 'Smart (균형잡힌)' },
  pro:   { model: 'claude-sonnet-4-20250514', maxTokens: 16384, label: 'Pro (최고 품질)' },
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
- 항상 존칭(~습니다, ~드리겠습니다, ~하시겠어요?)을 사용하세요. 반말 금지!
- 전문적이면서 친절한 톤으로 답변하세요. 한국 비즈니스 문화에 맞는 경어를 사용하세요.
- 마크다운 형식 사용 (**굵게**, - 목록, 코드블록)
- 답변은 간결하게 (200자 이내 권장, 필요시 더 길게)
- 기술 용어 사용 금지! "API" → "서버 기능", "DB 스키마" → "데이터 구조", "Supabase" → "데이터베이스" 등 쉽게 풀어서 설명
- 이모지는 최소한으로 사용하세요
- 사용자가 "생성해줘"라고 하면 구체적인 기능 목록을 정리하여 확인

⚠️ 중요: 반드시 현재 선택된 템플릿/업종에 맞는 용어와 기능만 이야기하세요.
다른 업종의 용어를 절대 섞지 마세요.`;

// ── Chat Mode 고도화: 응답 태그 규칙 ─────────────────
const CHAT_RESPONSE_RULES = `

응답 시 반드시 다음 태그 중 하나로 시작하세요:
[QUESTION] — 사용자에게 확인 질문이 필요할 때 (모호한 요청, 선택지 제시)
[CODE_CHANGE] — 코드를 수정해야 할 때 (이 경우 구체적인 수정 내용 포함)
[EXPLANATION] — 설명만 할 때 (질문에 답변, 개념 설명)

예시:
- "차트 추가해줘" → [QUESTION] 어떤 형태의 차트를 원하시나요? 바차트, 라인차트, 파이차트?
- "로그인 페이지 만들어줘" → [CODE_CHANGE] 로그인 페이지를 생성하겠습니다. 이메일+비밀번호 입력 폼과 소셜 로그인 버튼을 포함합니다.
- "Supabase가 뭐야?" → [EXPLANATION] Supabase는 오픈소스 Firebase 대안으로...

중요 규칙: 너는 코드를 직접 수정할 수 없다. 사용자가 코드 수정, 디자인 변경, 기능 추가, 색상 변경, 레이아웃 변경, 반응형 적용 등을 요청하면 반드시 다음과 같이 답변해라:
"[EXPLANATION] 코드 수정은 채팅창에 구체적인 수정 내용을 입력하시면 자동으로 처리됩니다. 예: '배경색을 파란색으로 바꿔줘', '반응형으로 만들어줘'"
절대로 "수정하겠습니다", "변경하겠습니다", "지금 바로 적용하겠습니다" 등으로 답변하지 마라.
너는 설계 상담과 질문 답변만 가능하다. 코드 수정은 별도 시스템이 처리한다.`;

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

  'local-commerce': `이 프로젝트는 **지역커머스/특산품 직판** 앱입니다.
관련 기능: 상품 등록, 주문/결제, 배송 관리, 생산자 소개, 체험 예약, 정기구독, 리뷰/평점, 고객 관리
관련 용어: 산지직송, 특산품, 생산자, 직거래, 체험관광, 정기배송, 로컬푸드, 친환경
절대 사용하지 말 것: 예약, 노쇼, 디자이너, 시술, 매칭, 수강, 민원`,

  'healthcare': `이 프로젝트는 **헬스케어/습관관리** 앱입니다.
관련 기능: 습관 체크리스트, 건강 데이터 기록(혈압/체중/혈당), 목표 설정, 스트릭(연속달성), 통계/차트, 리마인더 알림, 커뮤니티
관련 용어: 습관, 트래커, 체크리스트, 스트릭, 목표, 기록, 통계, 건강, 웰니스, 루틴
절대 사용하지 말 것: 예약, 노쇼, 디자이너, 시술, 상품, 장바구니, 배송, 매칭, 민원`,

  'matching': `이 프로젝트는 **전문가매칭/견적비교** 플랫폼 앱입니다.
관련 기능: 전문가 프로필/포트폴리오, 견적 요청, 견적 비교, 자동 매칭, 1:1 채팅, 리뷰/평점, 수수료 정산, 관리자 대시보드
관련 용어: 전문가, 견적, 매칭, 포트폴리오, 리뷰, 수수료, 에스크로, 입찰
절대 사용하지 말 것: 예약, 노쇼, 디자이너, 시술, 상품, 장바구니, 배송, 수강, 민원`,

  'custom': `이 프로젝트는 **사용자가 자유롭게 정의한 맞춤 앱**입니다.
업종 제한이 없습니다. 사용자의 설명을 기반으로 최적의 아키텍처를 설계하세요.

중요 판단 기준:
- 사용자가 "브라우저에만 저장" 또는 개인용 도구(타이머, 가계부, 메모 등)를 원하면: Supabase 없이 localStorage/useState만 사용
- 사용자가 "서버에 저장" 또는 로그인이 필요하면: Supabase Auth + Database 사용
- "AI가 판단"이면: 앱 특성에 따라 자동 결정 (2명 이상이 사용하면 Supabase, 개인용이면 localStorage)

생성 가능한 앱 종류 (예시):
- localStorage: 포모도로 타이머, 가계부, 독서기록, 할일관리, 일정관리, 계산기, 변환기, 습관 추적기
- Supabase: 커뮤니티, 블로그, 대시보드, 랜딩페이지, 뉴스피드, 사진갤러리, 매칭앱, CRM
- 고급: 음악플레이어(Web Audio), 그림판(Canvas), 게임(Canvas/DOM), 퀴즈앱

모든 코드는 반드시 Foundry Static Export 규칙을 따라야 합니다 ('use client', 동적 라우트 금지 등).`,
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

🔴 샘플 데이터 필수 삽입 (매우 중요!):
- 모든 주요 테이블에 INSERT문으로 현실적인 한국어 샘플 데이터 3~5개 삽입
- 샘플 데이터는 해당 업종에 맞는 현실적인 이름/설명/가격 사용 (예: 딸기 1kg 25,000원)
- ⚠️ user_id 컬럼 처리 (매우 중요):
  1. 샘플 INSERT 전에 반드시: ALTER TABLE [테이블명] DISABLE ROW LEVEL SECURITY;
  2. user_id NOT NULL 컬럼이 있으면 INSERT 전에: ALTER TABLE [테이블명] ALTER COLUMN user_id DROP NOT NULL;
  3. 샘플 INSERT 실행 (user_id는 null로)
  4. INSERT 후에: ALTER TABLE [테이블명] ENABLE ROW LEVEL SECURITY;
  5. 또는: user_id 컬럼을 nullable로 처음부터 설계 (user_id uuid references auth.users)
- INSERT 전에 반드시 테이블이 생성된 후에 실행되도록 순서 보장

🟢 관계형 데이터 패턴 (반드시 적용):
- 1:N 관계: FK 컬럼에 인덱스 자동 생성 (CREATE INDEX idx_orders_customer_id ON orders(customer_id))
- N:M 관계: junction 테이블 사용 (복합 PK 또는 unique 제약조건)
  예시: create table product_categories (
    product_id uuid references products(id) on delete cascade,
    category_id uuid references categories(id) on delete cascade,
    primary key (product_id, category_id)
  );
- 상태 필드가 있으면 PostgreSQL enum 사용 (CREATE TYPE order_status AS ENUM('pending','confirmed','completed','cancelled'))
- 집계용 컬럼 추가 (visit_count int default 0, total_amount numeric default 0 등 — 트리거로 자동 갱신)
- 소프트 삭제: 중요 데이터는 deleted_at timestamptz nullable + is_active boolean default true
- 복합 유니크: 비즈니스 규칙에 맞는 unique 제약조건 (예: UNIQUE(phone, shop_id))

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
const FRONTEND_SYSTEM_PROMPT = `당신은 Foundry AI MVP 빌더의 코드 생성 엔진입니다.
Foundry는 Static Export 전용 Next.js 앱을 생성합니다.

═══════════════════════════════════════════
📋 Foundry 코드 생성 규칙서 (반드시 준수!)
═══════════════════════════════════════════

📦 사용 가능한 npm 패키지 (이것만 import 가능!):
- react, react-dom (이미 설치됨)
- next (next/navigation, next/link, next/image, next/font만 허용)
- @supabase/supabase-js (이미 설치됨)
- recharts (차트 — import { LineChart, BarChart, ... } from 'recharts')
- date-fns (날짜 — import { format, parseISO } from 'date-fns')
- zustand (상태관리 — import { create } from 'zustand')
- react-hook-form (폼 — import { useForm } from 'react-hook-form')
- zod (유효성검증 — import { z } from 'zod')
- lucide-react (아이콘 — import { Search, Menu, X, ... } from 'lucide-react')
- tailwind-merge, clsx (스타일링)

🔴 절대 사용 금지 패키지 (import하면 빌드 100% 실패!):
- @heroicons/react (설치 안 됨! → lucide-react로 대체)
- framer-motion (설치 안 됨!)
- react-icons (설치 안 됨! → lucide-react로 대체)
- @radix-ui/* (설치 안 됨!)
- prisma, @prisma/client (클라이언트 앱에서 사용 불가)
- 위 목록에 없는 모든 외부 패키지

🔴 금지 사항 (이것을 쓰면 빌드가 100% 실패합니다):
- next/headers import 금지 (cookies(), headers() 사용 불가)
- next/server import 금지 (NextResponse, NextRequest 사용 불가)
- @/utils/supabase/server import 금지 → 반드시 @/utils/supabase/client 사용
- middleware.ts 생성 금지 (static export에서 작동하지 않음)
- [id], [slug] 등 동적 라우트 폴더 생성 금지 (static export 불가)
  → 대신 목록 페이지에서 선택→모달 또는 같은 페이지 내 상세보기 패턴 사용
  → 또는 searchParams + 'use client'에서 useState로 ID 관리
- generateStaticParams() 사용 금지
- Server Components 사용 금지 (async function Page() 금지)
  → 모든 페이지는 'use client' + export default function Page()
- fetch('/api/...') 사용 금지 → Supabase 클라이언트만 사용
- getServerSideProps, getStaticProps 사용 금지 (App Router에서 불가)
- useRouter from 'next/router' 금지 → 반드시 'next/navigation'에서 import

🔴 홈페이지 필수 생성 (매우 중요!):
- 반드시 app/page.tsx (루트 홈페이지)를 첫 번째 페이지로 생성하세요!
- 홈페이지에는: 앱 이름 히어로, 주요 기능 소개, 각 페이지로 이동하는 CTA 버튼 포함
- 홈페이지가 없으면 고객이 메인 URL 접속 시 404 에러 발생

🔴 파일 구조 규칙 (중복/충돌 방지 — 매우 중요!):
- 같은 경로의 파일을 절대 중복 생성하지 마세요! (app/page.tsx가 2개 이상 있으면 안 됨)
- 파일 경로는 반드시 app/ 사용 (src/app/ 사용 금지!)
- next.config 파일은 next.config.ts 하나만 생성 (.mjs, .js 생성 금지)
- supabase 클라이언트는 src/utils/supabase/client.ts 하나만 생성 (.tsx 생성 금지)
- 수정 시 기존 파일을 수정하세요. 같은 파일을 새로 추가하면 중복 발생!
- 반응형 디자인: 모든 페이지에 Tailwind 반응형 클래스(sm:, md:, lg:) 사용

🟢 Visual Edit 지원 (필수!):
- 모든 주요 섹션/컴포넌트에 data-component 속성 추가
- 예: <header data-component="Header">, <section data-component="HeroSection">, <nav data-component="Navigation">
- 버튼, 카드, 네비게이션, 폼 등 수정 가능한 요소에 반드시 포함
- 컴포넌트명은 PascalCase (Header, CTAButton, ServiceCard 등)
- 각 페이지/컴포넌트의 최상위 요소에 data-foundry-file 속성 추가 (파일 경로)
- 예: <div data-foundry-file="app/page.tsx" data-component="HomePage">, <div data-foundry-file="app/about/page.tsx">
- 이 속성으로 비주얼 에디터가 클릭된 요소의 원본 파일을 정확히 찾음

🟢 필수 사항:
- 모든 page.tsx 파일 첫 줄에 'use client' 필수!
- JSX가 있는 파일은 반드시 .tsx 확장자 (절대 .ts에 JSX 쓰지 않기)
- Supabase 클라이언트만 사용:
  import { createClient } from '@/utils/supabase/client'
  const supabase = createClient()
- TypeScript + Tailwind CSS 사용
- 반응형 디자인 (모바일 우선)
- 한국어 UI 텍스트
- 모던하고 깔끔한 UI (rounded-xl, shadow-sm, 적절한 패딩)
- 로딩/에러 상태 처리 포함
- lucide-react 아이콘 사용 가능 (설치됨)
- 테이블/컬럼명은 snake_case (PostgreSQL 규칙)

🎨 테마 CSS 변수 규칙 (반드시 준수!):
- globals.css에는 @import "tailwindcss" + :root(CSS 변수) + @theme inline(Tailwind 4.0 연동) + body 스타일이 모두 포함됨 (자동 생성)
- globals.css를 절대 직접 생성하지 마세요! 시스템이 자동으로 올바른 globals.css를 생성합니다.
- ⚠️ Tailwind v4: @tailwind base/components/utilities 금지! 반드시 @import "tailwindcss"; 사용!
- 모든 컴포넌트에서 아래 CSS 변수를 사용:
  --color-primary: 주요 액션 색상 (버튼, 링크)
  --color-primary-hover: 주요 색상 hover
  --color-secondary: 보조 색상
  --color-background: 페이지 배경
  --color-surface: 카드/컨테이너 배경
  --color-text-primary: 주요 텍스트
  --color-text-secondary: 보조 텍스트
  --color-border: 테두리
  --color-accent: 강조 (배지, 알림)
- Tailwind 사용법: bg-[var(--color-primary)], text-[var(--color-text-primary)], border-[var(--color-border)]
- 하드코딩 색상(bg-blue-500 등) 대신 반드시 CSS 변수 사용!
- 예외: Tailwind 유틸리티 클래스(bg-white, text-gray-50 등)는 중성색에 한해 허용
- body 태그에 bg-gray-50, bg-white 등 하드코딩 배경색 절대 금지! globals.css의 body 스타일이 자동 적용됨

🟢 Supabase 인증 패턴 (이것만 사용):
- 인증 상태: const { data: { user } } = await supabase.auth.getUser()
- 로그인: await supabase.auth.signInWithPassword({ email, password })
- 회원가입: await supabase.auth.signUp({ email, password, options: { data: { name } } })
- 로그아웃: await supabase.auth.signOut()
- 인증 리스너: supabase.auth.onAuthStateChange(callback)

🟢 Supabase CRUD 패턴 (이것만 사용):
- 조회: const { data } = await supabase.from('table').select('*').eq('user_id', user.id)
- 생성: await supabase.from('table').insert([{ ... }])
- 수정: await supabase.from('table').update({ ... }).eq('id', id)
- 삭제: await supabase.from('table').delete().eq('id', id)

🟢 상세 페이지 대안 패턴 (동적 라우트 대신):
// 목록에서 선택하면 같은 페이지에서 상세 표시
const [selectedId, setSelectedId] = useState<string | null>(null)
const [selectedItem, setSelectedItem] = useState<any>(null)
// 선택 시 데이터 로드
const handleSelect = async (id: string) => {
  const { data } = await supabase.from('table').select('*').eq('id', id).single()
  setSelectedItem(data)
  setSelectedId(id)
}
// UI: selectedItem이 있으면 상세, 없으면 목록

🟢 관계형 데이터 조회 패턴 (JOIN 대신 Supabase select 중첩):
// 1:N 관계 조회 (주문 + 주문항목)
const { data: orders } = await supabase
  .from('orders')
  .select('*, items:order_items(*, product:products(name, price))')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

// N:1 관계 조회 (예약 + 고객 + 스태프)
const { data: reservations } = await supabase
  .from('reservations')
  .select('*, customer:customers(name, phone), staff:staff_members(name)')
  .eq('user_id', user.id)

// 집계 쿼리 (RPC 함수 호출)
const { data } = await supabase.rpc('get_monthly_stats', { target_month: '2026-03' })

// 필터 + 정렬 + 페이지네이션
const { data, count } = await supabase
  .from('products')
  .select('*, category:categories(name)', { count: 'exact' })
  .ilike('name', \`%\${search}%\`)
  .order('created_at', { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1)

🟢 파일 업로드 패턴 (Supabase Storage):
// 파일 업로드
const handleUpload = async (file: File) => {
  const ext = file.name.split('.').pop()
  const path = \`\${user.id}/\${Date.now()}.\${ext}\`
  const { error } = await supabase.storage.from('uploads').upload(path, file)
  if (error) { alert('업로드 실패: ' + error.message); return null }
  const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
  return publicUrl
}
// 이미지 미리보기 입력
<input type="file" accept="image/*" onChange={async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const url = await handleUpload(file)
  if (url) setImageUrl(url)
}} />
{imageUrl && <img src={imageUrl} alt="미리보기" className="w-32 h-32 object-cover rounded-lg" />}

🟢 프로덕션 품질 패턴 (세리온 POS 검증):

1. 데이터 변경 안전성 — 복수 테이블 변경 시 하나의 함수에서 순차 처리:
const handleComplete = async () => {
  setLoading(true)
  try {
    // 1) 메인 레코드 업데이트
    const { error: e1 } = await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId)
    if (e1) throw e1
    // 2) 관련 레코드 업데이트
    const { error: e2 } = await supabase.from('customers').update({ visit_count: visitCount + 1 }).eq('id', customerId)
    if (e2) throw e2
    // 3) 성공 시 UI 갱신
    await loadData()
    alert('완료!')
  } catch (err: any) {
    alert('처리 실패: ' + (err.message || '알 수 없는 오류'))
  } finally {
    setLoading(false)
  }
}

2. 상태 전이 — enum 기반 명시적 상태 머신:
type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
// 상태 변경 시 유효성 검사
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
}

3. RBAC 필터링 — role 기반 데이터 접근:
// 관리자: 전체 데이터, 일반: 본인 데이터만
const query = supabase.from('orders').select('*')
if (userRole !== 'admin') {
  query.eq('user_id', user.id)
}
const { data } = await query.order('created_at', { ascending: false })

4. 에러 표시 — 일관된 토스트/알림 패턴:
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
// 사용: setToast({ message: '저장 완료', type: 'success' })
// 3초 후 자동 닫기: useEffect(() => { if (toast) setTimeout(() => setToast(null), 3000) }, [toast])

5. 입력 검증 — 제출 전 클라이언트 검증:
const validate = (): string | null => {
  if (!name.trim()) return '이름을 입력하세요'
  if (!phone.match(/^01[0-9]{8,9}$/)) return '올바른 전화번호를 입력하세요'
  if (price < 0) return '가격은 0 이상이어야 합니다'
  return null
}
const handleSubmit = async () => {
  const err = validate()
  if (err) { setToast({ message: err, type: 'error' }); return }
  // ... 저장 로직
}

6. 로딩/빈 상태 — 모든 데이터 페이지에 로딩+빈 상태 UI 필수:
if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full"/></div>
if (items.length === 0) return <div className="text-center py-20 text-gray-400">데이터가 없습니다</div>

⚠️ 코드 출력 규칙:
- 절대 마크다운 코드 블록(\`\`\`) 사용 금지! 순수 코드만 출력
- ###, ##, **, ✅, ❌, 📌 등 마크다운/이모지 문법 금지
- 주석은 // 또는 /* */ 형식만 사용
- 설명 텍스트 없이 코드만 출력

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
const GENERATE_SYSTEM_PROMPT = `당신은 Foundry AI MVP 빌더의 아키텍처 설계 엔진입니다.
사용자의 대화 내역을 기반으로, 완전한 앱 아키텍처를 설계합니다.

기술 스택:
- 프론트엔드: Next.js 16 (App Router, Static Export) + TypeScript + Tailwind CSS
- 백엔드: Supabase (PostgreSQL + Auth + Realtime + Storage)
- DB: Supabase PostgreSQL (RLS 보안)
- 인증: Supabase Auth (이메일/비밀번호)

⚠️ 중요: 별도 백엔드 서버(NestJS 등) 없음! Supabase가 DB+Auth+API를 모두 처리합니다.

🔴 Static Export 제약 — 아키텍처 설계 시 반드시 준수:
- pages[].path에 동적 라우트 금지! /items/[id] → /items (목록+상세 통합 페이지)
- 상세 페이지가 필요하면 같은 경로에서 선택→모달 또는 목록+상세 분할 레이아웃으로 설계
- API 라우트(/api/*) 설계 금지 → Supabase 클라이언트 직접 호출만 사용
- middleware 설계 금지

반드시 아래 JSON 형식으로만 출력하세요 (다른 텍스트 없이):
{
  "appName": "앱 이름",
  "description": "한줄 설명",
  "pages": [{ "path": "/xxx", "name": "페이지명", "description": "설명", "components": ["컴포넌트1"] }],
  "dbTables": [{ "name": "table_name", "fields": [{ "name": "field_name", "type": "uuid|text|int4|numeric|timestamptz|boolean|jsonb", "optional": false, "references": "other_table(id)" }] }],
  "relations": [{ "from": "orders", "to": "customers", "type": "N:1", "fk": "customer_id" }],
  "features": ["기능1", "기능2"],
  "estimatedPages": 5,
  "hasAuth": true,
  "hasFileUpload": false,
  "hasChatbot": true
}

관계 설계 규칙:
- 1:N 관계가 있으면 반드시 relations 배열에 명시
- N:M 관계는 junction 테이블을 dbTables에 추가하고 relations에 두 개의 N:1로 표현
- 상품+카테고리, 주문+상품, 예약+서비스 등 비즈니스 관계를 누락 없이 설계
- hasFileUpload: 이미지/파일 업로드가 필요한 기능이 하나라도 있으면 true
- hasChatbot: FAQ나 고객 안내가 필요한 서비스형 앱이면 true`;

@Injectable()
export class AiService {
  private anthropic: Anthropic;
  private openai: OpenAI | null = null;
  private readonly logger = new Logger('AiService');

  constructor(
    private creditService: CreditService,
    private supabaseService: SupabaseService,
    private memoryService: MemoryService,
    private prisma: PrismaService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /** Haiku로 코드 수정 호출 (Sonnet 대비 1/12 비용!) */
  private async callHaikuForModify(system: string, userContent: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userContent }],
    });
    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');
    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
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

    // ── 메모리 컨텍스트 로드 ──
    const memoryContext = await this.memoryService.buildContextPrompt(params.projectId, userId);

    // ── 코드베이스 컨텍스트 주입 ──
    let codeContext = '';
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: params.projectId },
        select: { generatedCode: true },
      });
      if (project?.generatedCode) {
        const files = project.generatedCode as { path: string; content: string }[];
        const fileList = files.map(f => f.path).join('\n');
        codeContext = `\n\n[현재 프로젝트 파일 목록]\n${fileList}`;
      }
    } catch { /* 무시 */ }

    // 대화 히스토리를 Anthropic 형식으로 변환
    const messages: Anthropic.MessageParam[] = params.chatHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // 현재 메시지 추가
    messages.push({ role: 'user', content: params.message });

    // ── 고도화된 시스템 프롬프트 ──
    const systemPrompt = BUILDER_SYSTEM_PROMPT
      + '\n\n' + (TEMPLATE_PROMPTS[params.template || ''] || `현재 선택된 템플릿: ${params.template || 'unknown'}`)
      + memoryContext
      + codeContext
      + CHAT_RESPONSE_RULES;

    try {
      const response = await this.anthropic.messages.create({
        model: model.model,
        max_tokens: model.maxTokens,
        system: systemPrompt,
        messages,
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      // ── 응답 타입 파싱 ──
      const responseType = this.parseResponseType(content);

      // ── 비동기: 대화 요약 + 선호 감지 (응답 지연 없이) ──
      const allMessages = [...params.chatHistory, { role: 'user', content: params.message }, { role: 'assistant', content }];
      this.memoryService.summarizeAndSave(params.projectId, allMessages).catch(() => {});
      this.memoryService.detectPreferences(params.projectId, userId, params.message).catch(() => {});

      return {
        content: content.replace(/^\[(QUESTION|CODE_CHANGE|EXPLANATION)\]\s*/i, ''),
        responseType,
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

  /** 응답 타입 파싱: [QUESTION] / [CODE_CHANGE] / [EXPLANATION] */
  private parseResponseType(content: string): 'question' | 'code_change' | 'explanation' {
    const trimmed = content.trim();
    if (trimmed.startsWith('[QUESTION]')) return 'question';
    if (trimmed.startsWith('[CODE_CHANGE]')) return 'code_change';
    if (trimmed.startsWith('[EXPLANATION]')) return 'explanation';
    // 태그 없으면 내용으로 판단
    if (trimmed.includes('?') && trimmed.split('?').length > 2) return 'question';
    return 'explanation';
  }

  // ── 앱 아키텍처 생성 (크레딧 차감) ─────────────────
  async generateArchitecture(userId: string, params: {
    projectId: string;
    chatHistory: { role: string; content: string }[];
    template: string;
  }) {
    // 맛보기 체크 (freeTrialUsed가 false면 무료)
    const balance = await this.creditService.getBalance(userId);
    const isFreeTrial = !balance.freeTrialUsed;

    if (isFreeTrial) {
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
        isFreeTriall: isFreeTrial,
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
      // rate limit → 대기 후 재시도 (최대 3회), 그래도 실패하면 flash 폴백
      if (error.status === 429) {
        if (retryCount < 3) {
          const waitSec = Math.min(30, 10 * (retryCount + 1)); // 10s, 20s, 30s
          this.logger.warn(`Rate limit 도달, ${waitSec}초 후 재시도 (${retryCount + 1}/3)`);
          await this.rateLimitDelay(waitSec * 1000);
          return this.callWithFallback(tier, system, messages, retryCount + 1);
        }
        // 3회 재시도 실패 → flash 폴백 (에러보다 낫다)
        if (tier !== 'flash') {
          this.logger.warn(`Rate limit 3회 재시도 실패, flash로 폴백합니다`);
          await this.rateLimitDelay(5000);
          const fb = APP_MODELS.flash;
          const fbRes = await this.anthropic.messages.create({ model: fb.model, max_tokens: fb.maxTokens, system, messages });
          const fbContent = fbRes.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('\n');
          return { content: fbContent, actualTier: 'flash' as AppModelTier, inputTokens: fbRes.usage.input_tokens, outputTokens: fbRes.usage.output_tokens, fellBack: true };
        }
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
      available: true, // Flash + Sonnet 모두 사용 가능
      fallbackNote: undefined,
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

    // 프로젝트 조회 (description에 스마트 분석 결과 포함 가능)
    const projectData = await this.prisma.project.update({
      where: { id: params.projectId },
      data: { status: 'generating', modelUsed: tier },
    });
    const projectDescription = projectData.description || '';

    try {
      // ── Step 1: 아키텍처 설계 (Supabase 기반) ─────
      this.logger.log(`[${params.projectId}] Step 1: 아키텍처 설계 (${tier})`);
      steps.push({ step: 'architecture', status: 'in_progress', fileCount: 0 });
      emitter?.emit('progress', { step: 'architecture', progress: '1/4', message: '아키텍처 설계 중...' } as GenerationProgress);

      const answersText = params.answers
        ? Object.entries(params.answers)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\n')
        : '';

      const chatSummary = params.chatHistory
        ?.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
        .join('\n') || '';

      // 스마트 분석 결과 + 앱 유형별 필수 구조 프롬프트 동적 주입
      const smartAnalysisContext = projectDescription.includes('[스마트 분석 결과]')
        ? `\n\n⚠️ 중요: 아래 스마트 분석 결과를 반드시 반영하여 앱을 설계하세요. 분석 결과를 무시하면 안 됩니다.
${projectDescription}
위 분석에서 언급된 벤치마크 앱의 UI 패턴을 참고하고, 핵심 기능을 반드시 포함하고, 타겟 사용자에 맞는 디자인을 적용하세요.`
        : (projectDescription ? `\n\n프로젝트 설명: ${projectDescription}` : '');

      const archResult = await this.callWithFallback(tier, GENERATE_SYSTEM_PROMPT, [{
        role: 'user',
        content: `앱 아키텍처를 설계해주세요.

템플릿: ${params.template}
${TEMPLATE_PROMPTS[params.template] || ''}

사용자 답변:
${answersText}

선택한 기능: ${params.selectedFeatures.join(', ')}
테마: ${params.theme || 'basic-light'}

${chatSummary ? `대화 내역:\n${chatSummary}` : ''}${smartAnalysisContext}

⚠️ 앱 이름과 설명에서 유형을 파악하고 해당하는 필수 UI 패턴을 반드시 포함하세요:
- 데이팅/소개팅/매칭 유형: 프로필 카드(사진+이름+소개), 좋아요/패스 인터랙션, 매칭 목록, 1:1 채팅, 프로필 편집, 필터/검색
- 커머스/쇼핑몰/판매/직거래 유형: 상품 목록(그리드, 이미지+가격), 상품 상세(이미지+설명+리뷰), 장바구니, 주문/결제, 주문 내역
- 예약/스케줄링 유형: 캘린더 뷰(날짜 선택), 시간 슬롯(가능 시간 표시), 예약 확정/취소, 예약 내역
- 커뮤니티/SNS 유형: 피드(게시물 목록), 게시물 작성(사진+텍스트), 댓글/좋아요, 프로필, 팔로우
- 교육/학원 유형: 강좌 목록, 수강 신청, 학습 진도 대시보드, 수강생 관리
- 배달/주문 유형: 메뉴/상품 목록, 장바구니, 주문 + 배달 추적, 리뷰
- SaaS/관리도구/POS 유형: 대시보드(KPI 카드), 데이터 테이블(CRUD), 차트/통계, 설정
위 유형에 해당하지 않으면 사용자 설명 기반으로 적절한 UI를 구성하세요.`,
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

      // ── Step 2.6: Supabase Storage 버킷 생성 (파일 업로드 필요 시) ──
      if (architecture.hasFileUpload && this.supabaseService.isEnabled()) {
        const projectRef = await this.prisma.project.findUnique({
          where: { id: params.projectId },
          select: { supabaseProjectRef: true },
        });
        if (projectRef?.supabaseProjectRef) {
          this.logger.log(`[${params.projectId}] Step 2.6: Storage 버킷 생성`);
          const storageResult = await this.supabaseService.createStorageBucket(
            projectRef.supabaseProjectRef,
            'uploads',
          );
          if (storageResult.success) {
            this.logger.log(`[${params.projectId}] ✅ Storage 버킷 생성 완료`);
          } else {
            this.logger.warn(`[${params.projectId}] ⚠️ Storage 버킷 생성 실패: ${storageResult.error}`);
          }
        }
      }

      // ── Step 3: 프론트엔드 페이지 생성 (파일별 개별 생성) ──
      // Phase B-1: 파일 1개씩 개별 생성 → 잘림 없음, F4 불필요, 품질 향상
      this.logger.log(`[${params.projectId}] Step 3: 프론트엔드 페이지 생성 (파일별 분리)`);
      steps.push({ step: 'frontend', status: 'in_progress', fileCount: 0 });

      const pages = architecture.pages || [];
      let frontendFileCount = 0;

      // 테이블 이름 목록 (프론트엔드에서 참조)
      const tableNames = dbTables.map((t: any) => t.name).join(', ');

      // ★ B-1: 아키텍처에서 생성할 파일 목록을 평탄화
      // 각 page → page.tsx 1개 (컴포넌트는 같은 파일에 인라인)
      // 복잡한 컴포넌트가 3개 이상이면 별도 파일로 분리
      interface FileTask {
        filePath: string;       // 예: src/app/dashboard/page.tsx
        pageName: string;       // 예: 대시보드
        pageDescription: string;
        components: string[];   // 이 파일에 포함될 컴포넌트
        isComponent: boolean;   // page.tsx인지 컴포넌트 파일인지
      }

      const fileTasks: FileTask[] = [];
      for (const page of pages) {
        const comps = page.components || [];
        const basePath = `src/app${page.path}`;

        if (comps.length <= 3) {
          // 컴포넌트 3개 이하: page.tsx 1파일에 모두 포함
          fileTasks.push({
            filePath: `${basePath}/page.tsx`,
            pageName: page.name,
            pageDescription: page.description || '',
            components: comps,
            isComponent: false,
          });
        } else {
          // 컴포넌트 4개 이상: page.tsx + 컴포넌트 파일 분리
          // page.tsx: 메인 레이아웃 + import
          fileTasks.push({
            filePath: `${basePath}/page.tsx`,
            pageName: page.name,
            pageDescription: page.description || '',
            components: comps.slice(0, 2), // 핵심 2개만 인라인
            isComponent: false,
          });
          // 나머지 컴포넌트: 2개씩 묶어서 파일로
          const remaining = comps.slice(2);
          for (let i = 0; i < remaining.length; i += 2) {
            const batch = remaining.slice(i, i + 2);
            const fileName = batch[0].replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
            fileTasks.push({
              filePath: `${basePath}/components/${fileName}.tsx`,
              pageName: page.name,
              pageDescription: `${page.name}의 컴포넌트: ${batch.join(', ')}`,
              components: batch,
              isComponent: true,
            });
          }
        }
      }

      const totalFrontendFiles = fileTasks.length;
      emitter?.emit('progress', { step: 'frontend', progress: '3/4', message: `프론트엔드 ${totalFrontendFiles}개 파일 생성 시작...`, fileCount: allFiles.length, totalFiles: totalFrontendFiles + 15 } as GenerationProgress);

      // ★ B-1: 파일별 개별 생성 루프
      const generatedFileList: string[] = []; // 이미 생성된 파일 목록 (import 일관성용)

      for (let fi = 0; fi < fileTasks.length; fi++) {
        const task = fileTasks[fi];

        // 이미 생성된 파일 컨텍스트 (최근 5개만 — 토큰 절약)
        const recentContext = generatedFileList.slice(-5).map(fp => `- ${fp}`).join('\n');

        const filePrompt = task.isComponent
          ? `다음 컴포넌트 파일 1개만 생성해주세요. 다른 파일은 생성하지 마세요!

파일 경로: ${task.filePath}
소속 페이지: ${task.pageName}
생성할 컴포넌트: ${task.components.join(', ')}

앱 이름: ${architecture.appName || ''}
테마: ${params.theme || 'basic-light'}
DB 테이블: ${tableNames}

⚠️ 규칙:
- [FILE: ${task.filePath}] 형식으로 이 파일 1개만 출력!
- export로 컴포넌트를 내보내세요 (page.tsx에서 import할 수 있도록)
- 'use client' 첫 줄 필수
- Supabase 클라이언트: import { createClient } from '@/utils/supabase/client'

${recentContext ? `이미 생성된 파일 (import 참고):\n${recentContext}` : ''}`

          : `다음 페이지 파일 1개만 생성해주세요. 다른 파일은 생성하지 마세요!

파일 경로: ${task.filePath}
페이지: ${task.pageName} (${pages.find(p => task.filePath.includes(p.path))?.path || '/'})
설명: ${task.pageDescription}
포함할 컴포넌트: ${task.components.join(', ') || '없음 (단순 페이지)'}

앱 이름: ${architecture.appName || ''}
테마: ${params.theme || 'basic-light'}
DB 테이블: ${tableNames}

Supabase SQL 스키마:
${schemaContent}

⚠️ 규칙:
- [FILE: ${task.filePath}] 형식으로 이 파일 1개만 출력!
- 컴포넌트는 같은 파일 안에 정의하세요 (별도 파일 X)
- 'use client' 첫 줄 필수
- Supabase 클라이언트: import { createClient } from '@/utils/supabase/client'
- 로그인/회원가입: supabase.auth.signInWithPassword / signUp
- 데이터 CRUD: supabase.from('테이블명').select/insert/update/delete

${recentContext ? `이미 생성된 파일 (import 참고):\n${recentContext}` : ''}
${smartAnalysisContext ? `\n${smartAnalysisContext}\n위 분석을 참고하세요.` : ''}`;

        const frontendResult = await this.callWithFallback(tier, FRONTEND_SYSTEM_PROMPT, [{
          role: 'user',
          content: filePrompt,
        }]);

        if (frontendResult.fellBack) fellBack = true;

        // 파일 파싱 — 1개 파일만 기대하지만 AI가 여러 개 줄 수도 있으므로 parseFileOutput 사용
        const parsedFiles = this.parseFileOutput(frontendResult.content, path.dirname(task.filePath));
        if (parsedFiles.length === 0) {
          // AI가 [FILE:] 태그 없이 코드만 출력한 경우
          allFiles.push({ path: task.filePath, content: frontendResult.content });
          generatedFileList.push(task.filePath);
          frontendFileCount++;
        } else {
          allFiles.push(...parsedFiles);
          generatedFileList.push(...parsedFiles.map(f => f.path));
          frontendFileCount += parsedFiles.length;
        }

        // SSE 진행률
        const latestFiles = parsedFiles.length > 0 ? parsedFiles : [{ path: task.filePath, content: frontendResult.content }];
        emitter?.emit('progress', {
          step: 'frontend', progress: '3/4',
          message: `파일 생성 완료 (${fi + 1}/${totalFrontendFiles}): ${path.basename(task.filePath)}`,
          detail: task.filePath,
          fileCount: allFiles.length,
          generatedFiles: latestFiles.map(f => ({ path: f.path, content: f.content })),
        } as GenerationProgress);
      }

      // Supabase 유틸 + 인증 페이지 + 레이아웃
      allFiles.push(...this.generateSupabaseUtils());
      allFiles.push(...this.generateAuthPages(architecture));
      allFiles.push(...this.generateCommonFrontendFiles(architecture, params.theme || 'basic-light'));
      frontendFileCount += 6; // utils(1) + auth pages(3) + layout(2)
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

      // 루트 page.tsx 미생성 방어 — AI가 안 만들었으면 fallback 자동 삽입
      const hasRootPage = allFiles.some(f => f.path === 'src/app/page.tsx' || f.path === 'app/page.tsx');
      if (!hasRootPage) {
        const pagePaths = (architecture.pages || [])
          .filter((p: any) => p.path !== '/')
          .map((p: any) => `            <a href="${p.path}" className="block p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">\n              <h3 className="font-semibold text-[var(--color-text-primary)]">${p.name}</h3>\n              <p className="text-sm text-[var(--color-text-secondary)] mt-1">${p.description || ''}</p>\n            </a>`)
          .join('\n');
        allFiles.push({
          path: 'src/app/page.tsx',
          content: `'use client';\n\nexport default function Home() {\n  return (\n    <div className="min-h-screen bg-[var(--color-background)]">\n      <div className="max-w-4xl mx-auto px-4 py-16">\n        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">${architecture.appName || 'My App'}</h1>\n        <p className="text-lg text-[var(--color-text-secondary)] mb-12">${architecture.description || ''}</p>\n        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">\n${pagePaths}\n        </div>\n      </div>\n    </div>\n  );\n}`,
        });
        this.logger.warn(`[메인페이지 fallback] AI가 page.tsx 미생성 → fallback 삽입`);
      }

      // F3: Import 검증 + 미설치 패키지 자동 추가
      const validatedFiles = this.validateAndFixImports(allFiles);
      allFiles.length = 0;
      allFiles.push(...validatedFiles);

      // F9: 빌드 전 코드 사전검증
      emitter?.emit('progress', { step: 'quality', progress: '4/4', message: '빌드 사전검증 중... (패키지/문법/패턴 체크)', fileCount: allFiles.length } as GenerationProgress);
      const validation = this.validateGeneratedCode(allFiles);
      if (validation.errors.length > 0) {
        this.logger.warn(`[F9] 사전검증 에러 ${validation.errors.length}건 감지 — AI 수정 시도`);
        // 에러가 있는 파일에 대해 AI 수정 시도
        const errorSummary = validation.errors.join('\n');
        const errorFilePaths = [...new Set(validation.errors.map(e => e.split(':')[0]))];
        const errorFiles = allFiles.filter(f => errorFilePaths.some(ep => f.path === ep));
        if (errorFiles.length > 0) {
          try {
            const fixedFiles = await this.fixBuildErrors(
              tier,
              errorFiles,
              `사전검증 에러:\n${errorSummary}`,
            );
            for (const fixed of fixedFiles) {
              const idx = allFiles.findIndex(f => f.path === fixed.path);
              if (idx >= 0) allFiles[idx] = fixed;
            }
            this.logger.log(`[F9] AI 사전수정 완료: ${fixedFiles.length}개 파일`);
          } catch (fixErr: any) {
            this.logger.warn(`[F9] AI 사전수정 실패: ${fixErr.message}`);
          }
        }
      }

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
          minCost: 6800, // 앱 생성 고정 6,800cr (API 실측 $2.45 → 마진95%)
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

    // 수정 대상 파일 스마트 선별
    let targetFileContents: { path: string; content: string }[];

    if (params.targetFiles && params.targetFiles.length > 0) {
      // 프론트에서 명시적으로 지정한 파일
      targetFileContents = existingFiles.filter(f => params.targetFiles!.some(t => f.path.includes(t)));
    } else {
      // AI가 관련 파일을 자동 선별 (2단계)
      targetFileContents = this.smartFileSelection(existingFiles, params.message);
    }

    // 최대 8개 제한 (토큰 절약)
    if (targetFileContents.length > 8) {
      targetFileContents = targetFileContents.slice(0, 8);
    }

    // 파일 목록 요약 (AI에게 전체 구조 알려주기)
    const fileIndex = existingFiles
      .filter(f => f.path.match(/\.(tsx?|css)$/))
      .map(f => f.path)
      .join('\n');

    // GPT-4o로 코드 수정 (Claude 대비 비용 90%+ 절감!)
    const userContent = `수정 요청: ${params.message}

프로젝트 전체 파일 목록 (참고용):
${fileIndex}

수정 대상 파일:
${targetFileContents.map(f => `[FILE: ${f.path}]\n${f.content}`).join('\n\n')}

프로젝트 컨텍스트:
${JSON.stringify(project.projectContext || {}, null, 2)}`;

    let result: { content: string; inputTokens: number; outputTokens: number; actualTier?: AppModelTier; fellBack?: boolean };
    // Haiku로 코드 수정 (Sonnet 대비 1/12 비용! + Claude용 프롬프트 호환!)
    this.logger.log(`[${params.projectId}] 코드 수정: Claude Haiku 사용 (비용 절감)`);
    const haikuResult = await this.callHaikuForModify(MODIFY_SYSTEM_PROMPT, userContent);
    result = { ...haikuResult, actualTier: 'flash' as AppModelTier, fellBack: true };

    const modifiedFiles = this.parseFileOutput(result.content, '');
    const actualTier: CreditModelTier = result.fellBack ? 'flash' : (tier as CreditModelTier);

    // 크레딧 차감 (단순/복잡 구분)
    const { classifyModifyCost } = await import('../credit/credit.service');
    const modifyCost = classifyModifyCost(params.message);
    const creditResult = await this.creditService.deductByModel(userId, {
      tier: actualTier,
      fileCount: modifiedFiles.length || 1,
      projectId: params.projectId,
      taskType: modifyCost <= 500 ? 'modify_simple' : modifyCost <= 1000 ? 'modify_normal' : 'modify_complex',
      description: `AI 수정(${modifyCost <= 500 ? '단순' : modifyCost <= 1000 ? '보통' : '복잡'}): ${params.message.slice(0, 50)} (${modifiedFiles.length}파일)`,
      minCost: modifyCost,
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
          lastModifiedFiles: modifiedFiles.map(f => f.path),
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
      'recharts', 'date-fns', 'zustand', 'react-hook-form', 'zod',
      'tailwind-merge', 'clsx',
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
      'zustand': '^5.0.0',
      'react-hook-form': '^7.54.0',
      'tailwind-merge': '^2.6.0',
    };

    // 금지 패키지 (import 발견 시 제거)
    const BANNED_PACKAGES = new Set([
      '@heroicons/react', '@heroicons/react/24/outline', '@heroicons/react/24/solid', '@heroicons/react/20/solid',
      'react-icons', 'react-icons/fi', 'react-icons/fa', 'react-icons/md', 'react-icons/hi', 'react-icons/ai',
      '@radix-ui/react-icons', '@radix-ui',
      'framer-motion', 'motion',
      '@prisma/client', 'prisma',
      'next/headers', 'next/server',
      '@emotion/react', '@emotion/styled', 'styled-components',
      'axios', // fetch 또는 supabase 사용
      'mongoose', 'typeorm', 'sequelize',
      'express', 'koa', 'fastify',
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

          // 알 수 없는 패키지 → 제거 (빌드 실패 방지)
          this.logger.warn(`[Import 제거] ${file.path}: 미허용 패키지 ${pkg} — 빌드 실패 방지를 위해 제거`);
          continue; // 이 줄 스킵
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
  // ── F9: 빌드 전 코드 사전검증 ──────────────────────────
  // ══════════════════════════════════════════════════════

  /** 생성된 코드를 빌드 전에 검증하여 실패 요인을 사전 차단 */
  validateGeneratedCode(files: { path: string; content: string }[]): {
    errors: string[];
    warnings: string[];
    autoFixed: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let autoFixed = 0;

    const bannedImports = [
      '@heroicons', 'framer-motion', 'next/headers', 'next/server',
      '@prisma/client', 'prisma', 'react-icons', '@radix-ui',
      'styled-components', '@emotion', 'axios', 'express',
    ];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.path.match(/\.(tsx?|jsx?|css)$/)) continue;

      // 1. 마크다운 혼입 체크
      if (file.content.includes('```')) {
        errors.push(`${file.path}: 마크다운 코드블록(\`\`\`) 혼입`);
      }
      if (file.content.match(/^#{1,3}\s+\w/m) && !file.content.match(/^['"]use client['"]/)) {
        warnings.push(`${file.path}: 마크다운 헤더(#) 혼입 가능성`);
      }

      // 2. 금지 패키지 import 체크
      for (const banned of bannedImports) {
        if (file.content.includes(`from '${banned}`) || file.content.includes(`from "${banned}`)) {
          errors.push(`${file.path}: 금지 패키지 ${banned} import 감지`);
        }
      }

      // 3. page.tsx에 'use client' 누락 체크
      if (file.path.endsWith('page.tsx') && !file.content.includes("'use client'") && !file.content.includes('"use client"')) {
        // 자동 수정
        files[i] = { ...file, content: "'use client';\n\n" + file.content };
        autoFixed++;
        this.logger.log(`[F9 자동수정] ${file.path}: 'use client' 자동 추가`);
      }

      // 4. Server Component 패턴 체크 (async function Page)
      if (file.path.endsWith('page.tsx') && file.content.match(/export\s+default\s+async\s+function/)) {
        warnings.push(`${file.path}: async function Page 감지 (Server Component 패턴 — static export 불가)`);
      }

      // 5. 동적 라우트 경로 체크
      if (file.path.match(/\[[\w]+\]/)) {
        errors.push(`${file.path}: 동적 라우트 [param] 경로 감지 (static export 불가)`);
      }

      // 6. next/router import 체크 (→ next/navigation으로 교체)
      if (file.content.includes("from 'next/router'") || file.content.includes('from "next/router"')) {
        files[i] = {
          ...file,
          content: file.content
            .replace(/from ['"]next\/router['"]/g, "from 'next/navigation'")
            .replace(/\buseRouter\b/g, 'useRouter'),
        };
        autoFixed++;
        this.logger.log(`[F9 자동수정] ${file.path}: next/router → next/navigation`);
      }

      // 7. getServerSideProps/getStaticProps 체크
      if (file.content.match(/export\s+(async\s+)?function\s+getServer(Side)?Props/)) {
        errors.push(`${file.path}: getServerSideProps 사용 (App Router에서 불가)`);
      }
      if (file.content.match(/export\s+(async\s+)?function\s+getStaticProps/)) {
        errors.push(`${file.path}: getStaticProps 사용 (App Router에서 불가)`);
      }

      // 8. 존재하지 않는 lucide 아이콘 체크 (common false positives)
      const lucideImportMatch = file.content.match(/from\s+['"]lucide-react['"]/);
      if (lucideImportMatch) {
        // 유효하지 않은 아이콘 이름 체크
        const iconImports = file.content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/);
        if (iconImports) {
          const iconNames = iconImports[1].split(',').map(s => s.trim()).filter(Boolean);
          const invalidIcons = iconNames.filter(name =>
            /^[a-z]/.test(name) || // lucide 아이콘은 PascalCase
            name.includes('Icon') // lucide에서 Icon 접미사 불필요
          );
          if (invalidIcons.length > 0) {
            warnings.push(`${file.path}: 의심스러운 lucide 아이콘: ${invalidIcons.join(', ')}`);
          }
        }
      }
    }

    if (errors.length > 0 || autoFixed > 0) {
      this.logger.log(`[F9 사전검증] 에러: ${errors.length}건, 경고: ${warnings.length}건, 자동수정: ${autoFixed}건`);
    }

    return { errors, warnings, autoFixed };
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
        content: lastLines.split('\n').slice(-3).join('\n').trimEnd() || '// continue',
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

    const fixPrompt = `아래 Foundry Static Export Next.js 프로젝트에서 빌드 에러가 발생했습니다.
에러 로그를 분석하고, 문제가 있는 파일을 수정해주세요.

⚠️ Foundry 규칙 (반드시 준수):
- 에러가 있는 파일만 수정하고, 나머지 파일은 절대 건드리지 마!
- 새 파일을 추가하지 마! 기존 파일만 수정!
- 수정된 파일만 [FILE: 경로] 형식으로 반환
- 파일의 전체 코드를 출력 (부분 수정 아님)
- 마크다운 코드 블록(\`\`\`) 절대 금지
- 모든 page.tsx 첫 줄에 'use client' 필수
- next/headers, next/server import 금지 → @/utils/supabase/client 사용
- @/utils/supabase/server → @/utils/supabase/client로 교체
- Server Components(async function Page) 금지 → 일반 function + useEffect/useState
- 허용 패키지만 사용: react, next, @supabase/supabase-js, lucide-react, recharts, date-fns, zustand, react-hook-form, zod, clsx
- @heroicons/react, framer-motion, react-icons, @radix-ui/* 절대 금지 → lucide-react로 대체
- useRouter from 'next/router' 금지 → 'next/navigation'에서 import
- getServerSideProps/getStaticProps 금지 → useEffect + useState 패턴 사용
- Image 컴포넌트 최적화 에러 시 → img 태그 사용 또는 next.config에 unoptimized:true
- globals.css import는 절대 제거하지 마! (import './globals.css' 또는 import '@/app/globals.css') — 이걸 삭제하면 전체 CSS가 깨짐
- globals.css는 반드시 @import "tailwindcss"; 한 줄로 시작해! @tailwind base/components/utilities는 v3 방식이라 빌드 실패함!

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

  /** Supabase 클라이언트 유틸리티 (브라우저 전용 — Static Export 호환) */
  private generateSupabaseUtils(): { path: string; content: string }[] {
    return [
      {
        path: 'src/utils/supabase/client.ts',
        content: `import { createClient as supabaseCreateClient } from '@supabase/supabase-js'

let client: ReturnType<typeof supabaseCreateClient> | null = null;

export function createClient() {
  if (client) return client;
  client = supabaseCreateClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}`,
      },
      {
        path: 'src/hooks/useFileUpload.ts',
        content: `'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface UploadResult {
  url: string;
  path: string;
}

export function useFileUpload(bucket: string = 'uploads') {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const upload = async (file: File, folder?: string): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop();
      const fileName = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      const path = folder ? folder + '/' + fileName : fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { url: publicUrl, path };
    } catch (err: any) {
      setError(err.message || '업로드 실패');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string): Promise<boolean> => {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return !error;
  };

  return { upload, remove, uploading, error };
}`,
      },
      // Static Export에서는 server.ts, middleware.ts 불필요 → 생성하지 않음
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
      // auth/callback/route.ts 제거 — Static Export에서 서버 라우트 불가
      // 대신 클라이언트 사이드에서 Supabase onAuthStateChange로 처리
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
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
    const pages = architecture.pages || [];

    // 네비게이션 링크 생성 (로그인/회원가입 제외)
    const navPages = pages
      .filter((p: any) => !['/login', '/signup', '/auth'].includes(p.path))
      .map((p: any) => `{ href: '${p.path}', label: '${p.name}' }`);

    return [
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next';
import './globals.css';
${architecture.hasChatbot ? "import ChatBot from '@/components/ChatBot';" : ''}

export const metadata: Metadata = {
  title: '${appName}',
  description: '${architecture.description || 'Foundry AI로 생성된 앱'}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        {children}
        ${architecture.hasChatbot ? '<ChatBot />' : ''}
      </body>
    </html>
  );
}`,
      },
      {
        path: 'src/app/globals.css',
        content: `@import "tailwindcss";

:root {
  --color-primary: ${this.getThemeColor(theme, 'primary')};
  --color-primary-hover: ${this.getThemeColor(theme, 'primaryHover')};
  --color-secondary: ${this.getThemeColor(theme, 'secondary')};
  --color-background: ${this.getThemeColor(theme, 'background')};
  --color-surface: ${this.getThemeColor(theme, 'surface')};
  --color-text-primary: ${this.getThemeColor(theme, 'textPrimary')};
  --color-text-secondary: ${this.getThemeColor(theme, 'textSecondary')};
  --color-border: ${this.getThemeColor(theme, 'border')};
  --color-accent: ${this.getThemeColor(theme, 'accent')};
  --font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Noto Sans KR', sans-serif;
}

@theme inline {
  --color-background: var(--color-background);
  --color-foreground: var(--color-text-primary);
  --color-primary: var(--color-primary);
  --color-secondary: var(--color-secondary);
  --color-accent: var(--color-accent);
  --color-border: var(--color-border);
  --font-sans: var(--font-sans);
}

body {
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
}

* {
  box-sizing: border-box;
}

::selection {
  background-color: var(--color-primary);
  color: #ffffff;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-surface);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

img {
  max-width: 100%;
  height: auto;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  color: var(--color-primary-hover);
}`,
      },
      // 사이드바 네비게이션 컴포넌트
      {
        path: 'src/components/Sidebar.tsx',
        content: `'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/components/AuthGuard';

const NAV_ITEMS = [
  ${navPages.join(',\n  ')}
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
    </div>
  );

  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <aside className={\`\${collapsed ? 'w-16' : 'w-56'} flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200\`}>
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
          {!collapsed && <span className="text-sm font-bold text-[var(--color-text-primary)]">${appName}</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]">
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={\`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors \${
                  isActive ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]'
                }\`}
              >
                <span className={\`\${collapsed ? 'mx-auto' : ''}\`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-border)] p-3">
          <button onClick={handleLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]">
            {collapsed ? '←' : '로그아웃'}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}`,
      },
      // 챗봇 컴포넌트 (hasChatbot === true 시 자동 포함)
      ...this.generateChatBotComponent(architecture),
    ];
  }

  /** 고객 앱 챗봇 컴포넌트 생성 */
  private generateChatBotComponent(architecture: any): { path: string; content: string }[] {
    if (!architecture.hasChatbot) return [];

    const appName = architecture.appName || 'My App';
    const description = architecture.description || '';
    const pages = architecture.pages || [];

    // 페이지 기반 FAQ 자동 생성
    const faqItems = pages
      .filter((p: any) => !['/login', '/signup', '/auth'].includes(p.path))
      .map((p: any) => `  { q: '${p.name} 기능은 어떻게 사용하나요?', a: '${(p.description || p.name + ' 페이지에서 이용하실 수 있습니다.').replace(/'/g, "\\'")}' }`)
      .slice(0, 6);

    return [
      {
        path: 'src/components/ChatBot.tsx',
        content: `'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
}

const FAQ = [
  { q: '${appName}은 어떤 서비스인가요?', a: '${(description || appName + '은(는) 편리하게 이용할 수 있는 서비스입니다.').replace(/'/g, "\\'")}' },
${faqItems.join(',\n')},
  { q: '문의하고 싶어요', a: '하단의 입력창에 질문을 입력해주세요. 빠른 시일 내 답변 드리겠습니다.' },
];

const QUICK_BUTTONS = ['서비스 소개', '사용 방법', '문의하기'];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'bot', content: '안녕하세요! ${appName}입니다. 무엇을 도와드릴까요?' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const addBotMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'bot',
      content,
    }]);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }]);
    setInput('');

    const match = FAQ.find(f =>
      text.includes(f.q.slice(0, 4)) ||
      f.q.toLowerCase().includes(text.toLowerCase()) ||
      text.toLowerCase().includes(f.q.toLowerCase().slice(0, 6))
    );

    setTimeout(() => {
      if (match) {
        addBotMessage(match.a);
      } else {
        addBotMessage('문의해 주셔서 감사합니다. 담당자가 확인 후 답변 드리겠습니다.');
      }
    }, 500);
  };

  const handleQuick = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    setTimeout(() => {
      if (text === '서비스 소개') addBotMessage(FAQ[0].a);
      else if (text === '사용 방법') addBotMessage('메뉴에서 원하는 기능을 선택하시면 됩니다. 각 페이지에서 상세 안내를 확인하실 수 있어요.');
      else addBotMessage('하단 입력창에 궁금한 점을 입력해주세요!');
    }, 500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center text-2xl"
        aria-label="챗봇 열기"
      >
        \\u{1F4AC}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{ height: '480px' }}>
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-t-2xl">
        <span className="font-semibold text-sm">${appName} 도우미</span>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg">\\u2715</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(m => (
          <div key={m.id} className={\\\`flex \\\${m.role === 'user' ? 'justify-end' : 'justify-start'}\\\`}>
            <div className={\\\`max-w-[80%] px-3 py-2 rounded-xl text-sm \\\${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }\\\`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {messages.length <= 2 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK_BUTTONS.map(btn => (
            <button
              key={btn}
              onClick={() => handleQuick(btn)}
              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
            >
              {btn}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
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
            '@tailwindcss/postcss': '^4.0.0',
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
        path: 'postcss.config.mjs',
        content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`,
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

  /**
   * 사용자 메시지에서 관련 파일을 스마트 선별
   * 키워드 매칭 + 페이지 경로 추론으로 토큰 낭비 방지
   */
  private smartFileSelection(
    files: { path: string; content: string }[],
    message: string,
  ): { path: string; content: string }[] {
    const msg = message.toLowerCase();
    const scored: { file: { path: string; content: string }; score: number }[] = [];

    // 키워드 → 파일 경로/내용 매칭 (확장)
    const keywords: Record<string, string[]> = {
      '로그인|login|signIn|인증': ['login', 'auth'],
      '회원가입|signup|signUp|가입|register': ['signup', 'register'],
      '대시보드|dashboard|홈|메인|home': ['dashboard', 'page.tsx'],
      '예약|reservation|booking|스케줄': ['reservation', 'booking', 'schedule'],
      '고객|customer|회원|사용자|user|프로필|profile': ['customer', 'user', 'member', 'profile'],
      '매출|sales|결제|payment|주문|order': ['sales', 'payment', 'order', 'checkout'],
      '설정|setting|config|환경': ['setting', 'config'],
      '스태프|staff|디자이너|직원|팀': ['staff', 'designer', 'team'],
      '색|color|테마|theme|디자인|스타일': ['globals.css', 'layout', 'theme'],
      '버튼|button|CTA': [],
      '헤더|header|네비|nav|메뉴|사이드바|sidebar': ['layout', 'nav', 'header', 'sidebar'],
      '푸터|footer': ['layout', 'footer'],
      '폼|form|입력|input|검색|search': ['form', 'search'],
      '테이블|table|목록|list|리스트': ['list', 'table'],
      '모달|modal|팝업|popup|다이얼로그': ['modal', 'dialog'],
      '차트|chart|그래프|통계|analytics|분석': ['analytics', 'chart', 'dashboard', 'stats'],
      '상품|product|카탈로그|catalog|아이템|item': ['product', 'catalog', 'item'],
      '장바구니|cart|위시리스트|wishlist': ['cart', 'wishlist'],
      '리뷰|review|평점|rating|후기': ['review', 'rating'],
      '알림|notification|메시지|message': ['notification', 'message'],
      '이미지|image|사진|photo|업로드|upload': ['upload', 'image', 'photo'],
      '지도|map|위치|location': ['map', 'location'],
      '새 페이지|페이지 추가|추가해|만들어': [], // 새 파일 생성 힌트
    };

    for (const file of files) {
      if (!file.path.match(/\.(tsx?|css)$/)) continue;
      let score = 0;
      const pathLower = file.path.toLowerCase();
      const contentLower = file.content.toLowerCase().slice(0, 2000); // 성능: 앞부분만 체크

      // 1. 키워드 → 경로 매칭
      for (const [pattern, paths] of Object.entries(keywords)) {
        if (new RegExp(pattern, 'i').test(msg)) {
          // 경로 매칭
          if (paths.some(p => pathLower.includes(p))) score += 10;
          // 콘텐츠 매칭 (파일 내에 해당 키워드 존재)
          if (new RegExp(pattern, 'i').test(contentLower)) score += 3;
        }
      }

      // 2. 메시지에서 파일명/경로 직접 언급
      const fileName = file.path.split('/').pop()?.replace(/\.tsx?$/, '') || '';
      if (msg.includes(fileName.toLowerCase())) score += 15;

      // 3. 페이지 파일 우선 (page.tsx)
      if (file.path.includes('page.tsx')) score += 2;

      // 4. 레이아웃/스타일은 디자인 관련 요청에만
      if (file.path.includes('layout') || file.path.includes('globals.css')) {
        if (/색|color|테마|theme|디자인|폰트|font|배경|background|스타일|style/i.test(msg)) {
          score += 8;
        }
      }

      // 5. 컴포넌트 파일은 UI 관련 요청에
      if (file.path.includes('components/')) {
        const componentName = fileName.toLowerCase();
        if (msg.includes(componentName)) score += 12;
      }

      // 6. '전체', '모든', '모두' → 모든 page.tsx 포함
      if (/전체|모든|모두|all/i.test(msg) && file.path.includes('page.tsx')) {
        score += 5;
      }

      if (score > 0) scored.push({ file, score });
    }

    // 점수순 정렬
    scored.sort((a, b) => b.score - a.score);

    // 매칭된 파일이 있으면 상위 파일 반환
    if (scored.length > 0) {
      // globals.css + layout은 디자인 요청일 때 항상 포함
      if (/색|color|테마|theme|디자인|폰트|font|배경|스타일/i.test(msg)) {
        const cssFile = files.find(f => f.path.includes('globals.css'));
        const layoutFile = files.find(f => f.path.includes('layout.tsx'));
        const result = scored.map(s => s.file);
        if (cssFile && !result.find(f => f.path === cssFile.path)) result.push(cssFile);
        if (layoutFile && !result.find(f => f.path === layoutFile.path)) result.push(layoutFile);
        return result;
      }
      return scored.map(s => s.file);
    }

    // 매칭 실패 시 page.tsx 파일들 + globals.css 반환
    const pageFiles = files.filter(f => f.path.includes('page.tsx'));
    const cssFiles = files.filter(f => f.path.includes('globals.css'));
    const layoutFiles = files.filter(f => f.path.includes('layout.tsx'));
    return [...pageFiles, ...cssFiles, ...layoutFiles].slice(0, 8);
  }

  /** 테마별 CSS 변수 색상 반환 */
  private getThemeColor(theme: string, token: string): string {
    const themes: Record<string, Record<string, string>> = {
      'basic-light': {
        primary: '#3182f6', primaryHover: '#1b64da', secondary: '#6366f1',
        background: '#ffffff', surface: '#f8fafc', textPrimary: '#1e293b',
        textSecondary: '#64748b', border: '#e2e8f0', accent: '#f59e0b',
      },
      'basic-dark': {
        primary: '#3182f6', primaryHover: '#60a5fa', secondary: '#818cf8',
        background: '#0f172a', surface: '#1e293b', textPrimary: '#f1f5f9',
        textSecondary: '#94a3b8', border: '#334155', accent: '#fbbf24',
      },
      'warm-earth': {
        primary: '#d97706', primaryHover: '#b45309', secondary: '#92400e',
        background: '#fffbeb', surface: '#fef3c7', textPrimary: '#78350f',
        textSecondary: '#a16207', border: '#fde68a', accent: '#dc2626',
      },
      'cool-ocean': {
        primary: '#0891b2', primaryHover: '#0e7490', secondary: '#06b6d4',
        background: '#ecfeff', surface: '#cffafe', textPrimary: '#164e63',
        textSecondary: '#0e7490', border: '#a5f3fc', accent: '#8b5cf6',
      },
      'forest-green': {
        primary: '#059669', primaryHover: '#047857', secondary: '#10b981',
        background: '#f0fdf4', surface: '#dcfce7', textPrimary: '#14532d',
        textSecondary: '#166534', border: '#bbf7d0', accent: '#ea580c',
      },
      'modern-purple': {
        primary: '#7c3aed', primaryHover: '#6d28d9', secondary: '#a78bfa',
        background: '#faf5ff', surface: '#f3e8ff', textPrimary: '#3b0764',
        textSecondary: '#6b21a8', border: '#e9d5ff', accent: '#ec4899',
      },
      'minimal-mono': {
        primary: '#171717', primaryHover: '#404040', secondary: '#525252',
        background: '#fafafa', surface: '#f5f5f5', textPrimary: '#171717',
        textSecondary: '#737373', border: '#e5e5e5', accent: '#3182f6',
      },
    };
    const colors = themes[theme] || themes['basic-light'];
    return colors[token] || '#3182f6';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
