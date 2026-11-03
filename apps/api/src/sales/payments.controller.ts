import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  type CancelInput,
  cancelSchema,
  PAYMENT_CONFIRM_ROLES,
  PAYMENT_RECEIVE_ROLES,
  PAYMENT_STATUSES,
  type PaymentCreateInput,
  paymentCreateSchema,
  type PaymentDto,
  type PaymentStatus,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PaymentsService } from './payments.service.js';

const UUID_RE = /^[0-9a-f-]{36}$/i;

@Controller('payments')
@Roles(...PAYMENT_RECEIVE_ROLES)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
  ): Promise<PaymentDto[]> {
    return this.payments.list(user, {
      status: (PAYMENT_STATUSES as readonly string[]).includes(status ?? '')
        ? (status as PaymentStatus)
        : undefined,
      orderId: orderId && UUID_RE.test(orderId) ? orderId : undefined,
    });
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(paymentCreateSchema)) body: PaymentCreateInput,
  ): Promise<PaymentDto> {
    return this.payments.create(user, body);
  }

  @Roles(...PAYMENT_CONFIRM_ROLES)
  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentDto> {
    return this.payments.confirm(user, id);
  }

  @Roles(...PAYMENT_CONFIRM_ROLES)
  @Post(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(cancelSchema)) body: CancelInput,
  ): Promise<PaymentDto> {
    return this.payments.reject(user, id, body);
  }
}
