import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  advanceRequired,
  type CancelInput,
  canSeeCost,
  type CompleteOrderInput,
  MovementType,
  type OrderDraftInput,
  type OrderDraftUpdateInput,
  type OrderDto,
  type OrderListItemDto,
  OrderStatus,
  PaymentStatus,
  type PurchaseDto,
  Role,
  type ShortageDto,
} from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import {
  audit,
  dec,
  Decimal,
  isoToDate,
  lockOrganization,
  lockProducts,
  lockRow,
  money,
  qty,
  todayIso,
  type Tx,
} from '../common/db.js';
import { PricingService } from '../catalog/pricing.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PurchasesService } from '../purchases/purchases.service.js';
import { lineValue, weightedAverageIn } from '../stock/costing.js';
import { StockService } from '../stock/stock.service.js';
import { toDebtDto } from './debts.js';
import { paymentInclude, toPaymentDto } from './payments.mapper.js';

export const orderInclude = {
  customer: { select: { name: true } },
  seller: { select: { name: true } },
  lines: {
    include: { product: { select: { name: true, sku: true, unit: true, avgCost: true } } },
    orderBy: { id: 'asc' },
  },
  statusLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
  payments: { include: paymentInclude, orderBy: { createdAt: 'asc' } },
  debt: { include: { order: { select: { number: true } }, customer: { select: { name: true } } } },
} satisfies Prisma.SalesOrderInclude;

export type OrderFull = Prisma.SalesOrderGetPayload<{ include: typeof orderInclude }>;

/** OMBORCHI ko'radigan holatlar */
const WAREHOUSE_VISIBLE: OrderStatus[] = ['YIGILMOQDA', 'JONATILDI', 'YAKUNLANDI'];

export function orderTotal(lines: { quantity: Decimal; price: number }[]): bigint {
  return lines.reduce((a, l) => a + lineValue(l.quantity, l.price), 0n);
}

function sumPayments(o: OrderFull, status: PaymentStatus): bigint {
  return o.payments.filter((p) => p.status === status).reduce((a, p) => a + p.amount, 0n);
}

/** Narx tannarxdan pastmi: jo'natilgandan keyin — o'sha paytdagi tannarx, oldin — joriy */
function isBelowCost(l: OrderFull['lines'][number]): boolean {
  return l.price < (l.unitCost ?? l.product.avgCost);
}

function needsApproval(o: OrderFull): boolean {
  return !o.priceApprovedById && o.lines.some(isBelowCost);
}

export function toOrderListItem(o: OrderFull): OrderListItemDto {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    customerName: o.customer.name,
    sellerName: o.seller.name,
    total: money(orderTotal(o.lines))!,
    paidConfirmed: money(sumPayments(o, 'TASDIQLANGAN'))!,
    needsPriceApproval: o.status === 'QORALAMA' && needsApproval(o),
    createdAt: o.createdAt.toISOString(),
  };
}

export function toOrderDto(o: OrderFull, showCost: boolean): OrderDto {
  const total = orderTotal(o.lines);
  const shipped = o.lines.length > 0 && o.lines.every((l) => l.unitCost !== null);
  const costTotal = shipped
    ? o.lines.reduce((a, l) => a + lineValue(l.quantity, l.unitCost ?? 0), 0n)
    : null;
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    customerId: o.customerId,
    customerName: o.customer.name,
    sellerId: o.sellerId,
    sellerName: o.seller.name,
    note: o.note,
    total: money(total)!,
    advancePercent: o.advancePercent,
    advanceRequired: advanceRequired(money(total)!, o.advancePercent),
    paidConfirmed: money(sumPayments(o, 'TASDIQLANGAN'))!,
    paidPending: money(sumPayments(o, 'KUTILMOQDA'))!,
    needsPriceApproval: o.status === 'QORALAMA' && needsApproval(o),
    priceApproved: !!o.priceApprovedById,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    lines: o.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      sku: l.product.sku,
      unit: l.product.unit,
      quantity: qty(l.quantity),
      listPrice: l.listPrice,
      price: l.price,
      total: money(lineValue(l.quantity, l.price))!,
      picked: l.picked,
      belowCost: isBelowCost(l),
      ...(showCost ? { unitCost: l.unitCost } : {}),
    })),
    history: o.statusLogs.map((s) => ({
      from: s.from,
      to: s.to,
      userName: s.user.name,
      reason: s.reason,
      createdAt: s.createdAt.toISOString(),
    })),
    payments: o.payments.map((p) => toPaymentDto({ ...p, order: o })),
    debt: o.debt ? toDebtDto(o.debt) : null,
    ...(showCost
      ? {
          costTotal: money(costTotal),
          profit: costTotal !== null ? money(total - costTotal) : null,
        }
      : {}),
  };
}

/** Rolga qarab ko'rinadigan buyurtmalar sharti */
export function visibleOrdersWhere(actor: AuthUser): Prisma.SalesOrderWhereInput {
  const where: Prisma.SalesOrderWhereInput = { organizationId: actor.organizationId };
  if (actor.role === Role.SOTUVCHI) where.sellerId = actor.id;
  if (actor.role === Role.OMBORCHI) where.status = { in: WAREHOUSE_VISIBLE };
  return where;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly pricing: PricingService,
    private readonly purchases: PurchasesService,
  ) {}

  async list(
    actor: AuthUser,
    filter: { status?: OrderStatus; customerId?: string },
  ): Promise<OrderListItemDto[]> {
    const where = visibleOrdersWhere(actor);
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.status) {
      if (actor.role === Role.OMBORCHI && !WAREHOUSE_VISIBLE.includes(filter.status)) return [];
      where.status = filter.status;
    }
    const rows = await this.prisma.salesOrder.findMany({
      where,
      orderBy: { number: 'desc' },
      take: 200,
      include: orderInclude,
    });
    return rows.map(toOrderListItem);
  }

  async get(actor: AuthUser, id: string): Promise<OrderDto> {
    return toOrderDto(await this.load(this.prisma, actor, id), canSeeCost(actor.role));
  }

  async create(actor: AuthUser, input: OrderDraftInput): Promise<OrderDto> {
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertCustomer(tx, actor, input.customerId);
      const lines = await this.buildLines(tx, actor, input.lines);
      const warehouseId = await this.stock.defaultWarehouseId(tx, actor.organizationId);
      await lockOrganization(tx, actor.organizationId);
      const last = await tx.salesOrder.aggregate({
        where: { organizationId: actor.organizationId },
        _max: { number: true },
      });
      const o = await tx.salesOrder.create({
        data: {
          organizationId: actor.organizationId,
          number: (last._max.number ?? 0) + 1,
          warehouseId,
          customerId: input.customerId,
          sellerId: actor.id,
          note: input.note ?? '',
          lines: { create: lines },
          statusLogs: { create: { from: null, to: OrderStatus.QORALAMA, userId: actor.id } },
        },
      });
      return o.id;
    });
    return this.get(actor, id);
  }

  async update(actor: AuthUser, id: string, input: OrderDraftUpdateInput): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const o = await this.lockAndLoad(tx, actor, id);
      this.assertOwnOrder(actor, o);
      this.assertStatus(o, ['QORALAMA']);
      if (input.customerId) await this.assertCustomer(tx, actor, input.customerId);
      await tx.salesOrder.update({
        where: { id },
        data: {
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          // Narxlar o'zgarsa avvalgi ruxsat bekor bo'ladi
          ...(input.lines ? { priceApprovedById: null } : {}),
        },
      });
      if (input.lines) {
        const keepList = new Map(o.lines.map((l) => [l.productId, l.listPrice]));
        const lines = await this.buildLines(tx, actor, input.lines, keepList);
        await tx.salesOrderLine.deleteMany({ where: { orderId: id } });
        await tx.salesOrderLine.createMany({ data: lines.map((l) => ({ ...l, orderId: id })) });
      }
    });
    return this.get(actor, id);
  }

  /** OWNER tannarxdan past narxlarga ruxsat beradi */
  async approvePrice(actor: AuthUser, id: string): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const o = await this.lockAndLoad(tx, actor, id);
      this.assertStatus(o, ['QORALAMA']);
      if (!needsApproval(o)) throw new BadRequestException('orders.noApprovalNeeded');
      await tx.salesOrder.update({ where: { id }, data: { priceApprovedById: actor.id } });
      await audit(tx, actor, 'SalesOrder', id, 'price.approve', {
        lines: o.lines.filter(isBelowCost).map((l) => ({
          productId: l.productId,
          price: l.price,
          cost: l.product.avgCost,
        })),
      });
    });
    return this.get(actor, id);
  }

  /** QORALAMA → TASDIQLANGAN → AVANS_KUTILMOQDA (yoki avans 0% bo'lsa YIG'ILMOQDA) */
  async confirm(actor: AuthUser, id: string): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const o = await this.lockAndLoad(tx, actor, id);
      this.assertOwnOrder(actor, o);
      this.assertStatus(o, ['QORALAMA']);
      if (o.lines.length === 0) throw new BadRequestException('orders.noLines');
      if (needsApproval(o)) throw new BadRequestException('orders.priceApprovalRequired');
      const org = await tx.organization.findUniqueOrThrow({ where: { id: actor.organizationId } });
      await tx.salesOrder.update({ where: { id }, data: { advancePercent: org.advancePercent } });
      await this.transition(tx, actor, o.id, o.status, 'TASDIQLANGAN');
      // Shartnoma PDF — 4-bosqich; hozircha avtomatik o'tiladi
      const next = org.advancePercent > 0 ? 'AVANS_KUTILMOQDA' : 'YIGILMOQDA';
      await this.transition(tx, actor, o.id, 'TASDIQLANGAN', next);
    });
    return this.get(actor, id);
  }

  async pick(actor: AuthUser, id: string, lineId: string, picked: boolean): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const o = await this.lockAndLoad(tx, actor, id);
      this.assertStatus(o, ['YIGILMOQDA']);
      if (!o.lines.some((l) => l.id === lineId)) throw new NotFoundException();
      await tx.salesOrderLine.update({ where: { id: lineId }, data: { picked } });
    });
    return this.get(actor, id);
  }

  async shortages(actor: AuthUser, id: string): Promise<ShortageDto[]> {
    const o = await this.load(this.prisma, actor, id);
    return this.computeShortages(this.prisma, actor, o);
  }

  /** Yetishmayotgan tovarlardan kirim qoralamasi */
  async shortagePurchase(actor: AuthUser, id: string): Promise<PurchaseDto> {
    const o = await this.load(this.prisma, actor, id);
    this.assertStatus(o, ['YIGILMOQDA', 'AVANS_KUTILMOQDA', 'TASDIQLANGAN']);
    const short = await this.computeShortages(this.prisma, actor, o);
    if (short.length === 0) throw new BadRequestException('orders.noShortage');
    return this.purchases.create(actor, {
      note: `#${o.number}`,
      lines: short.map((s) => ({ productId: s.productId, quantity: s.missing })),
    });
  }

  /** YIG'ILMOQDA → JO'NATILDI: qoldiqdan CHIQIM */
  async ship(actor: AuthUser, id: string): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const o = await this.lockAndLoad(tx, actor, id);
      this.assertStatus(o, ['YIGILMOQDA']);
      if (o.lines.some((l) => !l.picked)) throw new BadRequestException('orders.notAllPicked');
      await lockProducts(
        tx,
        o.lines.map((l) => l.productId),
      );
      const short = await this.computeShortages(tx, actor, o);
      if (short.length > 0) {
        throw new BadRequestException({ message: 'stock.insufficient', shortages: short });
      }
      const products = new Map(
        (await tx.product.findMany({ where: { id: { in: o.lines.map((l) => l.productId) } } })).map(
          (p) => [p.id, p],
        ),
      );
      for (const l of o.lines) {
        const cost = products.get(l.productId)!.avgCost;
        await tx.salesOrderLine.update({ where: { id: l.id }, data: { unitCost: cost } });
        await tx.stockMovement.create({
          data: {
            organizationId: actor.organizationId,
            warehouseId: o.warehouseId,
            productId: l.productId,
            type: MovementType.CHIQIM,
            quantity: l.quantity.negated(),
            unitCost: cost,
            orderId: o.id,
            userId: actor.id,
          },
        });
      }
      await this.transition(tx, actor, o.id, o.status, 'JONATILDI');
    });
    return this.get(actor, id);
  }

  /** JO'NATILDI → YAKUNLANDI: to'liq to'langan yoki qolgani nasiya */
  async complete(actor: AuthUser, id: string, input: CompleteOrderInput): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const o = await this.lockAndLoad(tx, actor, id);
      this.assertOwnOrder(actor, o);
      this.assertStatus(o, ['JONATILDI']);
      if (o.payments.some((p) => p.status === 'KUTILMOQDA')) {
        throw new BadRequestException('orders.paymentsPending');
      }
      const remaining = orderTotal(o.lines) - sumPayments(o, 'TASDIQLANGAN');
      if (remaining > 0n) {
        if (!input.dueDate) throw new BadRequestException('orders.dueDateRequired');
        if (input.dueDate < todayIso()) throw new BadRequestException('orders.dueDatePast');
        await lockRow(tx, 'Customer', o.customerId);
        const customer = await tx.customer.findUniqueOrThrow({ where: { id: o.customerId } });
        const open = await tx.debt.aggregate({
          where: { customerId: o.customerId, closedAt: null },
          _sum: { remaining: true },
        });
        const debtNow = open._sum.remaining ?? 0n;
        if (debtNow + remaining > customer.creditLimit) {
          throw new BadRequestException({
            message: 'orders.creditLimitExceeded',
            creditLimit: money(customer.creditLimit),
            debt: money(debtNow),
            required: money(remaining),
          });
        }
        await tx.debt.create({
          data: {
            organizationId: actor.organizationId,
            orderId: o.id,
            customerId: o.customerId,
            amount: remaining,
            remaining,
            dueDate: isoToDate(input.dueDate),
          },
        });
        await audit(tx, actor, 'SalesOrder', o.id, 'debt.create', {
          amount: money(remaining),
          dueDate: input.dueDate,
        });
      }
      await this.transition(tx, actor, o.id, o.status, 'YAKUNLANDI');
    });
    return this.get(actor, id);
  }

  /** Bekor qilish; jo'natilgan bo'lsa (faqat OWNER) tovar QAYTARISH bilan omborga qaytadi */
  async cancel(actor: AuthUser, id: string, input: CancelInput): Promise<OrderDto> {
    await this.prisma.$transaction(async (tx) => {
      const o = await this.lockAndLoad(tx, actor, id);
      this.assertOwnOrder(actor, o);
      if (o.status === 'YAKUNLANDI' || o.status === 'BEKOR') {
        throw new BadRequestException('orders.cannotCancel');
      }
      if (o.status === 'JONATILDI') {
        if (actor.role !== Role.OWNER)
          throw new ForbiddenException('orders.cancelShippedOwnerOnly');
        const ids = o.lines.map((l) => l.productId);
        await lockProducts(tx, ids);
        const stock = await this.stock.stockMap(tx, actor.organizationId, ids);
        const products = new Map(
          (await tx.product.findMany({ where: { id: { in: ids } } })).map((p) => [p.id, p]),
        );
        for (const l of o.lines) {
          const p = products.get(l.productId)!;
          const cost = l.unitCost ?? p.avgCost;
          const newAvg = weightedAverageIn(
            stock.get(l.productId) ?? new Decimal(0),
            p.avgCost,
            l.quantity,
            lineValue(l.quantity, cost),
          );
          if (newAvg !== p.avgCost) {
            await tx.product.update({ where: { id: p.id }, data: { avgCost: newAvg } });
            await audit(tx, actor, 'Product', p.id, 'cost.update', {
              from: p.avgCost,
              to: newAvg,
              orderId: o.id,
            });
          }
          await tx.stockMovement.create({
            data: {
              organizationId: actor.organizationId,
              warehouseId: o.warehouseId,
              productId: l.productId,
              type: MovementType.QAYTARISH,
              quantity: l.quantity,
              unitCost: cost,
              orderId: o.id,
              note: input.reason,
              userId: actor.id,
            },
          });
        }
        await this.pricing.recompute(tx, actor, ids);
      }
      await tx.salesOrder.update({ where: { id }, data: { cancelReason: input.reason } });
      await this.transition(tx, actor, o.id, o.status, 'BEKOR', input.reason);
    });
    return this.get(actor, id);
  }

  // ---------- ichki ----------

  async transition(
    tx: Tx,
    actor: AuthUser,
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    reason?: string,
  ): Promise<void> {
    await tx.salesOrder.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderStatusLog.create({
      data: { orderId, from, to, userId: actor.id, reason: reason ?? null },
    });
    await audit(tx, actor, 'SalesOrder', orderId, 'status', {
      from,
      to,
      ...(reason ? { reason } : {}),
    });
  }

  private async computeShortages(
    db: Tx | PrismaService,
    actor: AuthUser,
    o: OrderFull,
  ): Promise<ShortageDto[]> {
    const stock = await this.stock.stockMap(
      db,
      actor.organizationId,
      o.lines.map((l) => l.productId),
    );
    return o.lines
      .map((l) => {
        const available = stock.get(l.productId) ?? new Decimal(0);
        const missing = l.quantity.minus(available);
        return { l, available, missing };
      })
      .filter((x) => x.missing.greaterThan(0))
      .map(({ l, available, missing }) => ({
        productId: l.productId,
        productName: l.product.name,
        unit: l.product.unit,
        required: qty(l.quantity),
        available: qty(available.lessThan(0) ? new Decimal(0) : available),
        missing: qty(missing),
      }));
  }

  private async buildLines(
    tx: Tx,
    actor: AuthUser,
    lines: OrderDraftInput['lines'],
    keepList?: Map<string, number>,
  ) {
    const ids = lines.map((l) => l.productId);
    const products = new Map(
      (
        await tx.product.findMany({
          where: { id: { in: ids }, organizationId: actor.organizationId, isActive: true },
        })
      ).map((p) => [p.id, p]),
    );
    if (products.size !== ids.length) throw new BadRequestException('orders.productNotFound');
    return lines.map((l) => {
      const p = products.get(l.productId)!;
      const listPrice = keepList?.get(l.productId) ?? p.salePrice;
      return {
        productId: l.productId,
        quantity: dec(l.quantity),
        listPrice,
        price: l.price ?? listPrice,
      };
    });
  }

  private async assertCustomer(tx: Tx, actor: AuthUser, id: string): Promise<void> {
    const c = await tx.customer.findFirst({
      where: { id, organizationId: actor.organizationId, isActive: true },
    });
    if (!c) throw new BadRequestException('orders.customerNotFound');
  }

  /** SOTUVCHI faqat o'z buyurtmasi bilan ishlaydi */
  assertOwnOrder(actor: AuthUser, o: { sellerId: string }): void {
    if (actor.role === Role.SOTUVCHI && o.sellerId !== actor.id) throw new NotFoundException();
  }

  private assertStatus(o: { status: OrderStatus }, allowed: OrderStatus[]): void {
    if (!allowed.includes(o.status)) {
      throw new BadRequestException({ message: 'orders.wrongStatus', status: o.status });
    }
  }

  async lockAndLoad(tx: Tx, actor: AuthUser, id: string): Promise<OrderFull> {
    await lockRow(tx, 'SalesOrder', id);
    return this.load(tx, actor, id);
  }

  async load(db: Tx | PrismaService, actor: AuthUser, id: string): Promise<OrderFull> {
    const o = await db.salesOrder.findFirst({
      where: { ...visibleOrdersWhere(actor), id },
      include: orderInclude,
    });
    if (!o) throw new NotFoundException();
    return o;
  }
}
