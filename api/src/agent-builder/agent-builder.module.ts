import { Module } from '@nestjs/common';
import { AgentBuilderController } from './agent-builder.controller';
import { AgentBuilderService } from './agent-builder.service';
import { SandboxService } from './sandbox.service';

// Agent Mode 전용 모듈 — 기존 AiModule과 격리
@Module({
  controllers: [AgentBuilderController],
  providers: [AgentBuilderService, SandboxService],
  exports: [AgentBuilderService],
})
export class AgentBuilderModule {}
