import type { DebtDto } from '@savdo/shared';
import { dateToIso, isoToDate, money, todayIso, type Tx } from '../common/db.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export const debtInclude = {
  order: { select: { number: true } },
  customer: { select: { name: true } },
} satisfies Prisma.DebtInclude;

export type DebtFull = Prisma.DebtGetPayload<{ include: typeof debtInclude }>;

export function toDebtDto(d: DebtFull, today = todayIso()): DebtDto {
  const due = dateToIso(d.dueDate);
  return {
    id: d.id,
    orderId: d.orderId,
    orderNumber: d.order.number,
    customerId: d.customerId,
    customerName: d.customer.name,
    amount: money(d.amount)!,
    remaining: money(d.remaining)!,
    dueDate: due,
    closedAt: d.closedAt?.toISOString() ?? null,
    isOverdue: !d.closedAt && due < today,
  };
}

/** Mijozlar bo'yicha ochiq qarz va muddati o'tganmi */
export async function debtSummary(
  db: Tx | PrismaService,
  organizationId: string,
  customerIds?: string[],
): Promise<Map<string, { debt: bigint; hasOverdue: boolean }>> {
  const where: Prisma.DebtWhereInput = {
    organizationId,
    closedAt: null,
    ...(customerIds ? { customerId: { in: customerIds } } : {}),
  };
  const [sums, overdue] = await Promise.all([
    db.debt.groupBy({ by: ['customerId'], where, _sum: { remaining: true } }),
    db.debt.groupBy({
      by: ['customerId'],
      where: { ...where, dueDate: { lt: isoToDate(todayIso()) } },
      _count: { _all: true },
    }),
  ]);
  const overdueSet = new Set(overdue.map((o) => o.customerId));
  return new Map(
    sums.map((s) => [
      s.customerId,
      { debt: s._sum.remaining ?? 0n, hasOverdue: overdueSet.has(s.customerId) },
    ]),
  );
}
