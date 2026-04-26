import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { CreditModule } from './credit/credit.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { AgentBuilderModule } from './agent-builder/agent-builder.module';
import { AgentBuilderV2Module } from './agent-builder-v2/agent-builder-v2.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ProjectModule,
    SubscriptionModule,
    CreditModule,
    AiModule,
    AdminModule,
    InquiryModule,
    AgentBuilderModule,
    AgentBuilderV2Module, // v2 격리 실험 (Foundry 자체 백엔드, 2026-04-27)
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
