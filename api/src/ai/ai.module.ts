import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { StartChatController } from './start-chat.controller';
import { AiService } from './ai.service';
import { AgentService } from './agent.service';
import { MemoryService } from './memory.service';
import { MeetingService } from './meeting.service';
import { SmartAnalysisService } from './smart-analysis.service';
import { ImageService } from './image.service';
import { CreditModule } from '../credit/credit.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [CreditModule, SupabaseModule],
  controllers: [AiController, StartChatController],
  providers: [AiService, AgentService, MemoryService, MeetingService, SmartAnalysisService, ImageService, PrismaService],
  exports: [AiService, AgentService, MemoryService, MeetingService, SmartAnalysisService, ImageService],
})
export class AiModule {}
