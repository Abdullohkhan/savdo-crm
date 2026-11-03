import { Controller, Get, Query } from '@nestjs/common';
import {
  CUSTOMER_ROLES,
  type DashboardDto,
  type DebtDto,
  PAYMENT_CONFIRM_ROLES,
  Role,
  WAREHOUSE_ROLES,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { dateToIso, isoToDate, todayIso } from '../common/db.js';
import { Roles } from '../common/decorators.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { debtInclude, toDebtDto } from './debts.js';
import { orderInclude, toOrderListItem, visibleOrdersWhere } from './orders.service.js';
import { paymentInclude, toPaymentDto } from './payments.mapper.js';

/** "Bugun + n kun" (YYYY-MM-DD) */
function addDays(iso: string, n: number): string {
  const d = isoToDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToIso(d);
}

@Controller()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /** Nasiyalar: open | overdue | due (3 kun ichida yoki o'tgan) */
  @Roles(...CUSTOMER_ROLES)
  @Get('debts')
  async debts(
    @CurrentUser() user: AuthUser,
    @Query('filter') filter?: string,
    @Query('customerId') customerId?: string,
  ): Promise<DebtDto[]> {
    return this.findDebts(user, filter ?? 'open', customerId);
  }

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthUser): Promise<DashboardDto> {
    const role = user.role;
    const orders = (where: Prisma.SalesOrderWhereInput) =>
      this.prisma.salesOrder
        .findMany({
          where: { ...visibleOrdersWhere(user), ...where },
          include: orderInclude,
          orderBy: { number: 'asc' },
          take: 20,
        })
        .then((rows) => rows.map(toOrderListItem));

    const out: DashboardDto = {};
    if (role === Role.OWNER) {
      out.priceApprovals = (await orders({ status: 'QORALAMA' })).filter(
        (o) => o.needsPriceApproval,
      );
    }
    if (PAYMENT_CONFIRM_ROLES.includes(role)) {
      const rows = await this.prisma.payment.findMany({
        where: { organizationId: user.organizationId, status: 'KUTILMOQDA' },
        include: {
          ...paymentInclude,
          order: { select: { number: true, customer: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      out.paymentsToConfirm = rows.map(toPaymentDto);
    }
    if (role !== Role.OMBORCHI) out.awaitingAdvance = await orders({ status: 'AVANS_KUTILMOQDA' });
    if (WAREHOUSE_ROLES.includes(role)) out.toPick = await orders({ status: 'YIGILMOQDA' });
    if (role !== Role.OMBORCHI) out.toComplete = await orders({ status: 'JONATILDI' });
    if (role === Role.SOTUVCHI) out.drafts = await orders({ status: 'QORALAMA' });
    if (CUSTOMER_ROLES.includes(role)) out.debtsDue = await this.findDebts(user, 'due');
    return out;
  }

  private async findDebts(user: AuthUser, filter: string, customerId?: string) {
    const today = todayIso();
    const where: Prisma.DebtWhereInput = {
      organizationId: user.organizationId,
      ...(user.role === Role.SOTUVCHI ? { order: { sellerId: user.id } } : {}),
      ...(customerId && /^[0-9a-f-]{36}$/i.test(customerId) ? { customerId } : {}),
    };
    if (filter !== 'all') where.closedAt = null;
    if (filter === 'overdue') where.dueDate = { lt: isoToDate(today) };
    // Spec: muddatdan 3 kun oldin va muddat o'tganda eslatma
    if (filter === 'due') where.dueDate = { lte: isoToDate(addDays(today, 3)) };
    const rows = await this.prisma.debt.findMany({
      where,
      include: debtInclude,
      orderBy: { dueDate: 'asc' },
      take: 300,
    });
    return rows.map((d) => toDebtDto(d, today));
  }
}
