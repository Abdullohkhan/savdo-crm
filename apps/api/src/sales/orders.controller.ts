import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  type CancelInput,
  cancelSchema,
  COMPLETE_ROLES,
  type CompleteOrderInput,
  completeOrderSchema,
  ORDER_CANCEL_ROLES,
  ORDER_STATUSES,
  type OrderDraftInput,
  orderDraftSchema,
  type OrderDraftUpdateInput,
  orderDraftUpdateSchema,
  type OrderDto,
  type OrderListItemDto,
  type OrderStatus,
  pickLineSchema,
  type PickLineInput,
  PURCHASE_DRAFT_ROLES,
  type PurchaseDto,
  Role,
  SALES_ROLES,
  type ShortageDto,
  WAREHOUSE_ROLES,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { OrdersService } from './orders.service.js';

const UUID_RE = /^[0-9a-f-]{36}$/i;

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ): Promise<OrderListItemDto[]> {
    return this.orders.list(user, {
      status: (ORDER_STATUSES as readonly string[]).includes(status ?? '')
        ? (status as OrderStatus)
        : undefined,
      customerId: customerId && UUID_RE.test(customerId) ? customerId : undefined,
    });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<OrderDto> {
    return this.orders.get(user, id);
  }

  @Roles(...SALES_ROLES)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(orderDraftSchema)) body: OrderDraftInput,
  ): Promise<OrderDto> {
    return this.orders.create(user, body);
  }

  @Roles(...SALES_ROLES)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(orderDraftUpdateSchema)) body: OrderDraftUpdateInput,
  ): Promise<OrderDto> {
    return this.orders.update(user, id, body);
  }

  @Roles(Role.OWNER)
  @Post(':id/approve-price')
  approvePrice(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDto> {
    return this.orders.approvePrice(user, id);
  }

  @Roles(...SALES_ROLES)
  @Post(':id/confirm')
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDto> {
    return this.orders.confirm(user, id);
  }

  @Roles(...WAREHOUSE_ROLES)
  @Patch(':id/lines/:lineId')
  pick(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body(new ZodPipe(pickLineSchema)) body: PickLineInput,
  ): Promise<OrderDto> {
    return this.orders.pick(user, id, lineId, body.picked);
  }

  @Get(':id/shortages')
  shortages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShortageDto[]> {
    return this.orders.shortages(user, id);
  }

  @Roles(...PURCHASE_DRAFT_ROLES)
  @Post(':id/shortage-purchase')
  shortagePurchase(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseDto> {
    return this.orders.shortagePurchase(user, id);
  }

  @Roles(...WAREHOUSE_ROLES)
  @Post(':id/ship')
  ship(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<OrderDto> {
    return this.orders.ship(user, id);
  }

  @Roles(...COMPLETE_ROLES)
  @Post(':id/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(completeOrderSchema)) body: CompleteOrderInput,
  ): Promise<OrderDto> {
    return this.orders.complete(user, id, body);
  }

  @Roles(...ORDER_CANCEL_ROLES)
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(cancelSchema)) body: CancelInput,
  ): Promise<OrderDto> {
    return this.orders.cancel(user, id, body);
  }
}
