import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CancelInput,
  cancelSchema,
  COST_VISIBLE_ROLES,
  PURCHASE_DRAFT_ROLES,
  PURCHASE_STATUSES,
  type PurchaseDraftInput,
  purchaseDraftSchema,
  type PurchaseDto,
  type PurchaseListItemDto,
  type PurchaseStatus,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PurchasesService } from './purchases.service.js';

@Controller('purchases')
@Roles(...PURCHASE_DRAFT_ROLES)
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ): Promise<PurchaseListItemDto[]> {
    const s = (PURCHASE_STATUSES as readonly string[]).includes(status ?? '')
      ? (status as PurchaseStatus)
      : undefined;
    return this.purchases.list(user, s);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<PurchaseDto> {
    return this.purchases.get(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(purchaseDraftSchema)) body: PurchaseDraftInput,
  ): Promise<PurchaseDto> {
    return this.purchases.create(user, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(purchaseDraftSchema)) body: PurchaseDraftInput,
  ): Promise<PurchaseDto> {
    return this.purchases.update(user, id, body);
  }

  @Roles(...COST_VISIBLE_ROLES)
  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseDto> {
    return this.purchases.confirm(user, id);
  }

  @Roles(...COST_VISIBLE_ROLES)
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(cancelSchema)) body: CancelInput,
  ): Promise<PurchaseDto> {
    return this.purchases.cancel(user, id, body);
  }
}
