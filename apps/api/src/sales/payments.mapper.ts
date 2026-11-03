import type { PaymentDto } from '@savdo/shared';
import { money } from '../common/db.js';
import type { Prisma } from '../generated/prisma/client.js';

export const paymentInclude = {
  receivedBy: { select: { name: true } },
  confirmedBy: { select: { name: true } },
} satisfies Prisma.PaymentInclude;

type PaymentWithUsers = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

export function toPaymentDto(
  p: PaymentWithUsers & { order: { number: number; customer: { name: string } } },
): PaymentDto {
  return {
    id: p.id,
    orderId: p.orderId,
    orderNumber: p.order.number,
    customerName: p.order.customer.name,
    method: p.method,
    amount: money(p.amount)!,
    isAdvance: p.isAdvance,
    status: p.status,
    note: p.note,
    receivedByName: p.receivedBy.name,
    confirmedByName: p.confirmedBy?.name ?? null,
    rejectReason: p.rejectReason,
    createdAt: p.createdAt.toISOString(),
  };
}
