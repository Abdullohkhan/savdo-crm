import { Body, Controller, Post } from '@nestjs/common';
import { STOCKTAKE_ROLES, type StockAdjustmentInput, stockAdjustmentSchema } from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { StockService } from './stock.service.js';

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Roles(...STOCKTAKE_ROLES)
  @Post('adjustments')
  adjust(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(stockAdjustmentSchema)) body: StockAdjustmentInput,
  ): Promise<{ movementId: string; stock: number }> {
    return this.stock.adjust(user, body);
  }
}
