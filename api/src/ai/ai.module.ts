import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AgentService } from './agent.service';
import { MemoryService } from './memory.service';
import { CreditModule } from '../credit/credit.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [CreditModule, SupabaseModule],
  controllers: [AiController],
  providers: [AiService, AgentService, MemoryService, PrismaService],
  exports: [AiService, AgentService, MemoryService],
})
export class AiModule {}
