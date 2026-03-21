import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [SupabaseService, PrismaService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
