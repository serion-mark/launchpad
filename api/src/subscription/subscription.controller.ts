import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  getCurrent(@Req() req: any) {
    return this.subscriptionService.getCurrent(req.user.userId);
  }

  @Post('change-plan')
  changePlan(@Req() req: any, @Body() body: { plan: string }) {
    return this.subscriptionService.changePlan(req.user.userId, body.plan);
  }

  @Get('invoices')
  getInvoices(@Req() req: any) {
    return this.subscriptionService.getInvoices(req.user.userId);
  }

  @Patch('invoices/:id/pay')
  markPaid(@Req() req: any, @Param('id') id: string, @Body() body: { paymentMethod: string; paymentRefId?: string }) {
    return this.subscriptionService.markPaid(id, body.paymentMethod, body.paymentRefId);
  }

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlanPrices();
  }
}
