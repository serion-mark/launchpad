import { Module, forwardRef } from '@nestjs/common';
import { AgentBuilderController } from './agent-builder.controller';
import { AgentBuilderService } from './agent-builder.service';
import { AgentBuilderSdkService } from './agent-builder-sdk.service';
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';
import { SessionStoreService } from './session-store.service';
import { AnswerParserService } from './answer-parser.service';
import { ProjectPersistenceService } from './project-persistence.service';
import { EventTranslatorService } from './event-translator.service';
import { AgentDeployService } from './agent-deploy.service';
import { AttachmentService } from './attachment.service';
import { AttachmentCleanupService } from './attachment-cleanup.service';
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
  controllers: [AgentBuilderController],
  providers: [
    AgentBuilderService,
    AgentBuilderSdkService,
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
  exports: [AgentBuilderService, AgentBuilderSdkService],
})
export class AgentBuilderModule {}
