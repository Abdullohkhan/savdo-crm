import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  advanceRequired,
  type CancelInput,
  type PaymentCreateInput,
  type PaymentDto,
  type PaymentStatus,
  Role,
} from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import { audit, lockRow, money } from '../common/db.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService, orderTotal } from './orders.service.js';
import { paymentInclude, toPaymentDto } from './payments.mapper.js';

const listInclude = {
  ...paymentInclude,
  order: { select: { number: true, sellerId: true, customer: { select: { name: true } } } },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  async list(
    actor: AuthUser,
    filter: { status?: PaymentStatus; orderId?: string },
  ): Promise<PaymentDto[]> {
    const rows = await this.prisma.payment.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.orderId ? { orderId: filter.orderId } : {}),
        ...(actor.role === Role.SOTUVCHI ? { order: { sellerId: actor.id } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: listInclude,
    });
    return rows.map(toPaymentDto);
  }

  /** To'lov qabul qilish (KUTILMOQDA) — qolgan summadan oshmasin */
  async create(actor: AuthUser, input: PaymentCreateInput): Promise<PaymentDto> {
    const id = await this.prisma.$transaction(async (tx) => {
      const o = await this.orders.lockAndLoad(tx, actor, input.orderId);
      this.orders.assertOwnOrder(actor, o);
      if (o.status === 'QORALAMA' || o.status === 'BEKOR') {
        throw new BadRequestException({ message: 'orders.wrongStatus', status: o.status });
      }
      const confirmed = o.payments
        .filter((p) => p.status === 'TASDIQLANGAN')
        .reduce((a, p) => a + p.amount, 0n);
      const pending = o.payments
        .filter((p) => p.status === 'KUTILMOQDA')
        .reduce((a, p) => a + p.amount, 0n);
      let due: bigint;
      if (o.status === 'YAKUNLANDI') {
        if (!o.debt || o.debt.closedAt) throw new BadRequestException('payments.nothingDue');
        due = o.debt.remaining - pending;
      } else {
        due = orderTotal(o.lines) - confirmed - pending;
      }
      if (BigInt(input.amount) > due) {
        throw new BadRequestException({
          message: 'payments.exceedsDue',
          due: money(due < 0n ? 0n : due),
        });
      }
      const p = await tx.payment.create({
        data: {
          organizationId: actor.organizationId,
          orderId: o.id,
          method: input.method,
          amount: BigInt(input.amount),
          isAdvance: input.isAdvance ?? o.status === 'AVANS_KUTILMOQDA',
          note: input.note ?? '',
          receivedById: actor.id,
        },
      });
      await audit(tx, actor, 'Payment', p.id, 'create', {
        orderId: o.id,
        amount: input.amount,
        method: input.method,
      });
      return p.id;
    });
    return this.getOne(actor, id);
  }

  /** BUXGALTER tasdig'i: avans yetsa — YIG'ILMOQDA, nasiya bo'lsa — qarz kamayadi */
  async confirm(actor: AuthUser, id: string): Promise<PaymentDto> {
    await this.prisma.$transaction(async (tx) => {
      const pay = await this.findPending(actor, id);
      const o = await this.orders.lockAndLoad(tx, actor, pay.orderId);
      await lockRow(tx, 'Payment', id);
      const fresh = await tx.payment.findUniqueOrThrow({ where: { id } });
      if (fresh.status !== 'KUTILMOQDA') throw new BadRequestException('payments.notPending');

      await tx.payment.update({
        where: { id },
        data: { status: 'TASDIQLANGAN', confirmedById: actor.id, confirmedAt: new Date() },
      });
      await audit(tx, actor, 'Payment', id, 'status', { from: 'KUTILMOQDA', to: 'TASDIQLANGAN' });

      const confirmed =
        o.payments.filter((p) => p.status === 'TASDIQLANGAN').reduce((a, p) => a + p.amount, 0n) +
        fresh.amount;

      if (o.status === 'AVANS_KUTILMOQDA') {
        const required = advanceRequired(money(orderTotal(o.lines))!, o.advancePercent);
        if (confirmed >= BigInt(required)) {
          await this.orders.transition(tx, actor, o.id, o.status, 'YIGILMOQDA');
        }
      }
      if (o.status === 'YAKUNLANDI' && o.debt && !o.debt.closedAt) {
        const remaining = o.debt.remaining - fresh.amount;
        await tx.debt.update({
          where: { id: o.debt.id },
          data: {
            remaining: remaining < 0n ? 0n : remaining,
            ...(remaining <= 0n ? { closedAt: new Date() } : {}),
          },
        });
      }
    });
    return this.getOne(actor, id);
  }

  async reject(actor: AuthUser, id: string, input: CancelInput): Promise<PaymentDto> {
    await this.prisma.$transaction(async (tx) => {
      const pay = await this.findPending(actor, id);
      await this.orders.lockAndLoad(tx, actor, pay.orderId);
      await lockRow(tx, 'Payment', id);
      const fresh = await tx.payment.findUniqueOrThrow({ where: { id } });
      if (fresh.status !== 'KUTILMOQDA') throw new BadRequestException('payments.notPending');
      await tx.payment.update({
        where: { id },
        data: {
          status: 'RAD_ETILGAN',
          confirmedById: actor.id,
          confirmedAt: new Date(),
          rejectReason: input.reason,
        },
      });
      await audit(tx, actor, 'Payment', id, 'status', {
        from: 'KUTILMOQDA',
        to: 'RAD_ETILGAN',
        reason: input.reason,
      });
    });
    return this.getOne(actor, id);
  }

  private async findPending(actor: AuthUser, id: string) {
    const p = await this.prisma.payment.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!p) throw new NotFoundException();
    if (p.status !== 'KUTILMOQDA') throw new BadRequestException('payments.notPending');
    return p;
  }

  private async getOne(actor: AuthUser, id: string): Promise<PaymentDto> {
    const p = await this.prisma.payment.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        ...(actor.role === Role.SOTUVCHI ? { order: { sellerId: actor.id } } : {}),
      },
      include: listInclude,
    });
    if (!p) throw new NotFoundException();
    return toPaymentDto(p);
  }
}
