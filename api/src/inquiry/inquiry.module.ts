import { Module } from '@nestjs/common';
import { InquiryController } from './inquiry.controller';
import { InquiryService } from './inquiry.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [InquiryController],
  providers: [InquiryService, PrismaService],
  exports: [InquiryService],
})
export class InquiryModule {}
