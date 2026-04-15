import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { CreditModule } from './credit/credit.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { InquiryModule } from './inquiry/inquiry.module';
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
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
