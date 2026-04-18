import { Module } from '@nestjs/common';
import { AgentBuilderController } from './agent-builder.controller';
import { AgentBuilderService } from './agent-builder.service';
import { SandboxService } from './sandbox.service';
import { PromptLoaderService } from './prompt-loader.service';

// Agent Mode 전용 모듈 — 기존 AiModule과 격리
@Module({
  controllers: [AgentBuilderController],
  providers: [AgentBuilderService, SandboxService, PromptLoaderService],
  exports: [AgentBuilderService],
})
export class AgentBuilderModule {}
