import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CATALOG_EDIT_ROLES,
  PURCHASE_DRAFT_ROLES,
  type SupplierCreateInput,
  supplierCreateSchema,
  type SupplierDto,
  type SupplierUpdateInput,
  supplierUpdateSchema,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { Supplier } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

function toDto(s: Supplier): SupplierDto {
  return { id: s.id, name: s.name, phone: s.phone, inn: s.inn, isActive: s.isActive };
}

/** Ta'minotchilar kirim bilan ishlovchilarga kerak — SOTUVCHI'ga emas */
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles(...PURCHASE_DRAFT_ROLES)
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('q') q?: string): Promise<SupplierDto[]> {
    const rows = await this.prisma.supplier.findMany({
      where: {
        organizationId: user.organizationId,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(toDto);
  }

  @Roles(...CATALOG_EDIT_ROLES)
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(supplierCreateSchema)) body: SupplierCreateInput,
  ): Promise<SupplierDto> {
    const s = await this.prisma.supplier.create({
      data: {
        organizationId: user.organizationId,
        name: body.name,
        phone: body.phone ?? '',
        inn: body.inn ?? '',
      },
    });
    return toDto(s);
  }

  @Roles(...CATALOG_EDIT_ROLES)
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(supplierUpdateSchema)) body: SupplierUpdateInput,
  ): Promise<SupplierDto> {
    const found = await this.prisma.supplier.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!found) throw new NotFoundException();
    return toDto(await this.prisma.supplier.update({ where: { id }, data: body }));
  }
}
