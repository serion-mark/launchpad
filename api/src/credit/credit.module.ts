import { Module } from '@nestjs/common';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { KpnPaymentService } from './kpn-payment.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CreditController],
  providers: [CreditService, KpnPaymentService, PrismaService],
  exports: [CreditService],
})
export class CreditModule {}
