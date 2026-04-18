import { Module, forwardRef } from '@nestjs/common';
import { AgentBuilderController } from './agent-builder.controller';
import { AgentBuilderService } from './agent-builder.service';
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';
import { SessionStoreService } from './session-store.service';
import { AnswerParserService } from './answer-parser.service';
import { ProjectPersistenceService } from './project-persistence.service';
import { ProjectModule } from '../project/project.module';

// Agent Mode 전용 모듈 — 기존 AiModule과 격리
// Project 모듈은 재사용 (forwardRef로 순환 참조 대비)
@Module({
  imports: [forwardRef(() => ProjectModule)],
  controllers: [AgentBuilderController],
  providers: [
    AgentBuilderService,
    SandboxService,
    PromptLoaderService,
    SessionStoreService,
    AnswerParserService,
    ProjectPersistenceService,
  ],
  exports: [AgentBuilderService],
})
export class AgentBuilderModule {}
