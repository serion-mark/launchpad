import { Module, forwardRef } from '@nestjs/common';
import { AgentBuilderV2Controller } from './agent-builder-v2.controller';
import { AgentBuilderV2Service } from './agent-builder-v2.service';
import { AgentBuilderSdkV2Service } from './agent-builder-sdk-v2.service';
import { SandboxService } from '../agent-builder/sandbox.service';
import { PromptLoaderService } from '../agent-builder/prompt-loader.service';
import { SessionStoreService } from '../agent-builder/session-store.service';
import { AnswerParserService } from '../agent-builder/answer-parser.service';
import { ProjectPersistenceService } from '../agent-builder/project-persistence.service';
import { EventTranslatorService } from '../agent-builder/event-translator.service';
import { AgentDeployService } from '../agent-builder/agent-deploy.service';
import { AttachmentService } from '../agent-builder/attachment.service';
import { AttachmentCleanupService } from '../agent-builder/attachment-cleanup.service';
import { ProjectModule } from '../project/project.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';
import { CreditModule } from '../credit/credit.module';
import { PrismaService } from '../prisma.service';

// Agent Mode 전용 모듈 — 기존 AiModule과 격리
// Project + Supabase 재사용 (forwardRef로 순환 참조 대비)
// Day 4: AiModule 도 forwardRef 로 import → MemoryService 주입 (Z안 메모리 통합)
// Phase 0 (2026-04-22): CreditModule import → SDK + 수제 루프 양쪽에서 과금 차감
@Module({
  imports: [
    forwardRef(() => ProjectModule),
    SupabaseModule,
    forwardRef(() => AiModule),
    CreditModule,
  ],
  controllers: [AgentBuilderV2Controller],
  providers: [
    AgentBuilderV2Service,
    AgentBuilderSdkV2Service,
    SandboxService,
    PromptLoaderService,
    SessionStoreService,
    AnswerParserService,
    ProjectPersistenceService,
    EventTranslatorService,
    AgentDeployService,
    AttachmentService,
    AttachmentCleanupService,
    PrismaService,
  ],
  exports: [AgentBuilderV2Service, AgentBuilderSdkV2Service],
})
export class AgentBuilderV2Module {}
