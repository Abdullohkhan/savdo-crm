import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CUSTOMER_ROLES,
  type CustomerCreateInput,
  customerCreateSchema,
  type CustomerDto,
  type CustomerUpdateInput,
  customerUpdateSchema,
  Role,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { audit, money } from '../common/db.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { Customer } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { debtSummary } from './debts.js';

function toDto(c: Customer, s?: { debt: bigint; hasOverdue: boolean }): CustomerDto {
  return {
    id: c.id,
    type: c.type,
    name: c.name,
    phone: c.phone,
    inn: c.inn,
    address: c.address,
    creditLimit: money(c.creditLimit)!,
    debt: money(s?.debt ?? 0n)!,
    hasOverdue: s?.hasOverdue ?? false,
    isActive: c.isActive,
  };
}

@Controller('customers')
@Roles(...CUSTOMER_ROLES)
export class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('inactive') inactive?: string,
  ): Promise<CustomerDto[]> {
    const term = q?.trim();
    const rows = await this.prisma.customer.findMany({
      where: {
        organizationId: user.organizationId,
        ...(inactive === '1' ? {} : { isActive: true }),
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term } },
                { inn: { contains: term } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 1000,
    });
    const sums = await debtSummary(
      this.prisma,
      user.organizationId,
      rows.map((r) => r.id),
    );
    return rows.map((c) => toDto(c, sums.get(c.id)));
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerDto> {
    const c = await this.find(user, id);
    const sums = await debtSummary(this.prisma, user.organizationId, [id]);
    return toDto(c, sums.get(id));
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(customerCreateSchema)) body: CustomerCreateInput,
  ): Promise<CustomerDto> {
    if (body.creditLimit !== undefined && user.role !== Role.OWNER) {
      throw new ForbiddenException('customers.limitForbidden');
    }
    const c = await this.prisma.customer.create({
      data: {
        organizationId: user.organizationId,
        type: body.type,
        name: body.name,
        phone: body.phone ?? '',
        inn: body.inn ?? '',
        address: body.address ?? '',
        creditLimit: BigInt(body.creditLimit ?? 0),
      },
    });
    return toDto(c);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(customerUpdateSchema)) body: CustomerUpdateInput,
  ): Promise<CustomerDto> {
    if (body.creditLimit !== undefined && user.role !== Role.OWNER) {
      throw new ForbiddenException('customers.limitForbidden');
    }
    const current = await this.find(user, id);
    const { creditLimit, ...rest } = body;
    const c = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...rest,
          ...(creditLimit !== undefined ? { creditLimit: BigInt(creditLimit) } : {}),
        },
      });
      if (creditLimit !== undefined && BigInt(creditLimit) !== current.creditLimit) {
        await audit(tx, user, 'Customer', id, 'creditLimit.update', {
          from: money(current.creditLimit),
          to: creditLimit,
        });
      }
      return updated;
    });
    const sums = await debtSummary(this.prisma, user.organizationId, [id]);
    return toDto(c, sums.get(id));
  }

  private async find(user: AuthUser, id: string): Promise<Customer> {
    const c = await this.prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!c) throw new NotFoundException();
    return c;
  }
}
