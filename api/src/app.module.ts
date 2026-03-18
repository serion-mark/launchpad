import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ProjectModule,
    SubscriptionModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
