import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CreditModule } from '../credit/credit.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [CreditModule, SupabaseModule],
  controllers: [AiController],
  providers: [AiService, PrismaService],
  exports: [AiService],
})
export class AiModule {}
