import { Module, forwardRef } from '@nestjs/common';
import { AgentBuilderController } from './agent-builder.controller';
import { AgentBuilderService } from './agent-builder.service';
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';
import { SessionStoreService } from './session-store.service';
import { AnswerParserService } from './answer-parser.service';
import { ProjectPersistenceService } from './project-persistence.service';
import { EventTranslatorService } from './event-translator.service';
import { ProjectModule } from '../project/project.module';
import { SupabaseModule } from '../supabase/supabase.module';

// Agent Mode 전용 모듈 — 기존 AiModule과 격리
// Project + Supabase 재사용 (forwardRef로 순환 참조 대비)
@Module({
  imports: [forwardRef(() => ProjectModule), SupabaseModule],
  controllers: [AgentBuilderController],
  providers: [
    AgentBuilderService,
    SandboxService,
    PromptLoaderService,
    SessionStoreService,
    AnswerParserService,
    ProjectPersistenceService,
    EventTranslatorService,
  ],
  exports: [AgentBuilderService],
})
export class AgentBuilderModule {}
