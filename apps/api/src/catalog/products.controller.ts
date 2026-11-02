import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  CATALOG_EDIT_ROLES,
  type ProductCreateInput,
  productCreateSchema,
  type ProductDto,
  type ProductUpdateInput,
  productUpdateSchema,
  type StockMovementDto,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ProductsService } from './products.service.js';

const UUID_RE = /^[0-9a-f-]{36}$/i;

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('low') low?: string,
    @Query('inactive') inactive?: string,
  ): Promise<ProductDto[]> {
    return this.products.list(user, {
      q: q || undefined,
      categoryId: categoryId && UUID_RE.test(categoryId) ? categoryId : undefined,
      low: low === '1' || low === 'true',
      includeInactive: inactive === '1' || inactive === 'true',
    });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<ProductDto> {
    return this.products.get(user, id);
  }

  @Get(':id/movements')
  movements(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StockMovementDto[]> {
    return this.products.movements(user, id);
  }

  @Roles(...CATALOG_EDIT_ROLES)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(productCreateSchema)) body: ProductCreateInput,
  ): Promise<ProductDto> {
    return this.products.create(user, body);
  }

  @Roles(...CATALOG_EDIT_ROLES)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(productUpdateSchema)) body: ProductUpdateInput,
  ): Promise<ProductDto> {
    return this.products.update(user, id, body);
  }
}
