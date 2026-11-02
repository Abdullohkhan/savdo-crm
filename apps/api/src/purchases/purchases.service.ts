import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  allocateExpenses,
  type CancelInput,
  canSeeCost,
  MovementType,
  type PurchaseDraftInput,
  type PurchaseDto,
  type PurchaseListItemDto,
  PurchaseStatus,
} from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import {
  audit,
  dec,
  Decimal,
  lockOrganization,
  lockProducts,
  money,
  qty,
  type Tx,
} from '../common/db.js';
import { PricingService } from '../catalog/pricing.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { lineValue, unitCostOf, weightedAverageIn, weightedAverageOut } from '../stock/costing.js';
import { StockService } from '../stock/stock.service.js';

const purchaseInclude = {
  supplier: { select: { name: true } },
  createdBy: { select: { name: true } },
  lines: { include: { product: { select: { name: true, unit: true } } } },
  expenses: true,
} satisfies Prisma.PurchaseInclude;

type PurchaseFull = Prisma.PurchaseGetPayload<{ include: typeof purchaseInclude }>;

function purchaseTotal(p: PurchaseFull): number | null {
  if (p.status === PurchaseStatus.TASDIQLANGAN || p.lines.every((l) => l.landedTotal !== null)) {
    if (p.lines.length > 0 && p.lines.every((l) => l.landedTotal !== null)) {
      return money(p.lines.reduce((a, l) => a + (l.landedTotal ?? 0n), 0n));
    }
  }
  if (p.lines.some((l) => l.price === null)) return null;
  const goods = p.lines.reduce((a, l) => a + lineValue(l.quantity, l.price ?? 0), 0n);
  const exp = p.expenses.reduce((a, e) => a + e.amount, 0n);
  return money(goods + exp);
}

function toDto(p: PurchaseFull, showCost: boolean): PurchaseDto {
  return {
    id: p.id,
    number: p.number,
    status: p.status,
    supplierId: p.supplierId,
    supplierName: p.supplier?.name ?? null,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
    confirmedAt: p.confirmedAt?.toISOString() ?? null,
    cancelledAt: p.cancelledAt?.toISOString() ?? null,
    cancelReason: p.cancelReason,
    createdByName: p.createdBy.name,
    lines: p.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      unit: l.product.unit,
      quantity: qty(l.quantity),
      ...(showCost
        ? {
            price: l.price,
            allocatedExpense: money(l.allocatedExpense),
            landedTotal: money(l.landedTotal),
            unitCost: l.unitCost,
          }
        : {}),
    })),
    ...(showCost
      ? {
          expenses: p.expenses.map((e) => ({ id: e.id, title: e.title, amount: money(e.amount)! })),
          total: purchaseTotal(p),
        }
      : {}),
  };
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly pricing: PricingService,
  ) {}

  async list(actor: AuthUser, status?: PurchaseStatus): Promise<PurchaseListItemDto[]> {
    const rows = await this.prisma.purchase.findMany({
      where: { organizationId: actor.organizationId, ...(status ? { status } : {}) },
      orderBy: { number: 'desc' },
      take: 200,
      include: purchaseInclude,
    });
    const show = canSeeCost(actor.role);
    return rows.map((p) => ({
      id: p.id,
      number: p.number,
      status: p.status,
      supplierName: p.supplier?.name ?? null,
      createdAt: p.createdAt.toISOString(),
      lineCount: p.lines.length,
      ...(show ? { total: purchaseTotal(p) } : {}),
    }));
  }

  async get(actor: AuthUser, id: string): Promise<PurchaseDto> {
    return toDto(await this.load(this.prisma, actor, id), canSeeCost(actor.role));
  }

  async create(actor: AuthUser, input: PurchaseDraftInput): Promise<PurchaseDto> {
    this.assertCostPermission(actor, input);
    const id = await this.prisma.$transaction(async (tx) => {
      await this.validateRefs(tx, actor, input);
      const warehouseId = await this.stock.defaultWarehouseId(tx, actor.organizationId);
      await lockOrganization(tx, actor.organizationId);
      const last = await tx.purchase.aggregate({
        where: { organizationId: actor.organizationId },
        _max: { number: true },
      });
      const p = await tx.purchase.create({
        data: {
          organizationId: actor.organizationId,
          number: (last._max.number ?? 0) + 1,
          warehouseId,
          supplierId: input.supplierId ?? null,
          note: input.note ?? '',
          createdById: actor.id,
          lines: {
            create: (input.lines ?? []).map((l) => ({
              productId: l.productId,
              quantity: dec(l.quantity),
              price: l.price ?? null,
            })),
          },
          expenses: {
            create: (input.expenses ?? []).map((e) => ({
              title: e.title,
              amount: BigInt(e.amount),
            })),
          },
        },
      });
      return p.id;
    });
    return this.get(actor, id);
  }

  async update(actor: AuthUser, id: string, input: PurchaseDraftInput): Promise<PurchaseDto> {
    this.assertCostPermission(actor, input);
    await this.prisma.$transaction(async (tx) => {
      const p = await this.lockDraft(tx, actor, id);
      await this.validateRefs(tx, actor, input);
      await tx.purchase.update({
        where: { id },
        data: {
          ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        },
      });
      if (input.lines) {
        // OMBORCHI narx kiritmaydi — avval kiritilgan narxlar tovar bo'yicha saqlanadi
        const keepPrice = !canSeeCost(actor.role);
        const oldPrice = new Map(p.lines.map((l) => [l.productId, l.price]));
        await tx.purchaseLine.deleteMany({ where: { purchaseId: id } });
        await tx.purchaseLine.createMany({
          data: input.lines.map((l) => ({
            purchaseId: id,
            productId: l.productId,
            quantity: dec(l.quantity),
            price: keepPrice ? (oldPrice.get(l.productId) ?? null) : (l.price ?? null),
          })),
        });
      }
      if (input.expenses) {
        await tx.purchaseExpense.deleteMany({ where: { purchaseId: id } });
        await tx.purchaseExpense.createMany({
          data: input.expenses.map((e) => ({
            purchaseId: id,
            title: e.title,
            amount: BigInt(e.amount),
          })),
        });
      }
    });
    return this.get(actor, id);
  }

  /** Tasdiqlash: xarajat taqsimoti, o'rtacha tannarx, KIRIM harakatlari, sotuv narxi */
  async confirm(actor: AuthUser, id: string): Promise<PurchaseDto> {
    await this.prisma.$transaction(async (tx) => {
      const p = await this.lockDraft(tx, actor, id);
      if (p.lines.length === 0) throw new BadRequestException('purchases.noLines');
      if (p.lines.some((l) => l.price === null))
        throw new BadRequestException('purchases.priceMissing');

      const productIds = p.lines.map((l) => l.productId);
      await lockProducts(tx, productIds);
      const products = new Map(
        (await tx.product.findMany({ where: { id: { in: productIds } } })).map((x) => [x.id, x]),
      );
      const stock = await this.stock.stockMap(tx, actor.organizationId, productIds);

      const values = p.lines.map((l) => lineValue(l.quantity, l.price!));
      const expensesTotal = p.expenses.reduce((a, e) => a + e.amount, 0n);
      const alloc = allocateExpenses(
        money(expensesTotal)!,
        values.map((v) => money(v)!),
      );

      for (const [i, line] of p.lines.entries()) {
        const product = products.get(line.productId)!;
        const landedTotal = values[i]! + BigInt(alloc[i]!);
        const unitCost = unitCostOf(landedTotal, line.quantity);
        const oldQty = stock.get(line.productId) ?? new Decimal(0);
        const newAvg = weightedAverageIn(oldQty, product.avgCost, line.quantity, landedTotal);

        await tx.purchaseLine.update({
          where: { id: line.id },
          data: { allocatedExpense: BigInt(alloc[i]!), landedTotal, unitCost },
        });
        await tx.product.update({ where: { id: product.id }, data: { avgCost: newAvg } });
        await tx.stockMovement.create({
          data: {
            organizationId: actor.organizationId,
            warehouseId: p.warehouseId,
            productId: product.id,
            type: MovementType.KIRIM,
            quantity: line.quantity,
            unitCost,
            purchaseId: p.id,
            userId: actor.id,
          },
        });
        if (newAvg !== product.avgCost) {
          await audit(tx, actor, 'Product', product.id, 'cost.update', {
            from: product.avgCost,
            to: newAvg,
            purchaseId: p.id,
          });
        }
      }

      await tx.purchase.update({
        where: { id },
        data: { status: PurchaseStatus.TASDIQLANGAN, confirmedAt: new Date() },
      });
      await audit(tx, actor, 'Purchase', id, 'status', {
        from: PurchaseStatus.QORALAMA,
        to: PurchaseStatus.TASDIQLANGAN,
      });
      await this.pricing.recompute(tx, actor, productIds);
    });
    return this.get(actor, id);
  }

  /** Bekor qilish. Tasdiqlangan bo'lsa — qoldiq yetsa teskari harakat va tannarx qayta hisobi */
  async cancel(actor: AuthUser, id: string, input: CancelInput): Promise<PurchaseDto> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id = ${id} FOR UPDATE`;
      const p = await this.load(tx, actor, id);
      if (p.status === PurchaseStatus.BEKOR)
        throw new BadRequestException('purchases.alreadyCancelled');

      if (p.status === PurchaseStatus.TASDIQLANGAN) {
        const productIds = p.lines.map((l) => l.productId);
        await lockProducts(tx, productIds);
        const products = new Map(
          (await tx.product.findMany({ where: { id: { in: productIds } } })).map((x) => [x.id, x]),
        );
        const stock = await this.stock.stockMap(tx, actor.organizationId, productIds);
        const short = p.lines.filter((l) =>
          (stock.get(l.productId) ?? new Decimal(0)).lessThan(l.quantity),
        );
        if (short.length > 0) {
          throw new BadRequestException({
            message: 'stock.insufficient',
            products: short.map((l) => l.product.name),
          });
        }
        for (const line of p.lines) {
          const product = products.get(line.productId)!;
          const oldQty = stock.get(line.productId)!;
          const newAvg = weightedAverageOut(
            oldQty,
            product.avgCost,
            line.quantity,
            line.landedTotal ?? 0n,
          );
          await tx.product.update({ where: { id: product.id }, data: { avgCost: newAvg } });
          await tx.stockMovement.create({
            data: {
              organizationId: actor.organizationId,
              warehouseId: p.warehouseId,
              productId: product.id,
              type: MovementType.KIRIM,
              quantity: line.quantity.negated(),
              unitCost: line.unitCost ?? 0,
              purchaseId: p.id,
              note: input.reason,
              userId: actor.id,
            },
          });
          if (newAvg !== product.avgCost) {
            await audit(tx, actor, 'Product', product.id, 'cost.update', {
              from: product.avgCost,
              to: newAvg,
              purchaseId: p.id,
            });
          }
        }
        await this.pricing.recompute(tx, actor, productIds);
      }

      await tx.purchase.update({
        where: { id },
        data: { status: PurchaseStatus.BEKOR, cancelledAt: new Date(), cancelReason: input.reason },
      });
      await audit(tx, actor, 'Purchase', id, 'status', {
        from: p.status,
        to: PurchaseStatus.BEKOR,
        reason: input.reason,
      });
    });
    return this.get(actor, id);
  }

  private assertCostPermission(actor: AuthUser, input: PurchaseDraftInput): void {
    if (canSeeCost(actor.role)) return;
    const hasPrice = (input.lines ?? []).some((l) => l.price !== undefined && l.price !== null);
    if (hasPrice || input.expenses !== undefined) {
      throw new ForbiddenException('purchases.costForbidden');
    }
  }

  private async validateRefs(tx: Tx, actor: AuthUser, input: PurchaseDraftInput): Promise<void> {
    if (input.supplierId) {
      const s = await tx.supplier.findFirst({
        where: { id: input.supplierId, organizationId: actor.organizationId },
      });
      if (!s) throw new NotFoundException('purchases.supplierNotFound');
    }
    const ids = (input.lines ?? []).map((l) => l.productId);
    if (ids.length > 0) {
      const count = await tx.product.count({
        where: { id: { in: ids }, organizationId: actor.organizationId, isActive: true },
      });
      if (count !== ids.length) throw new BadRequestException('purchases.productNotFound');
    }
  }

  private async lockDraft(tx: Tx, actor: AuthUser, id: string): Promise<PurchaseFull> {
    await tx.$queryRaw`SELECT id FROM "Purchase" WHERE id = ${id} FOR UPDATE`;
    const p = await this.load(tx, actor, id);
    if (p.status !== PurchaseStatus.QORALAMA) throw new BadRequestException('purchases.notDraft');
    return p;
  }

  private async load(tx: Tx | PrismaService, actor: AuthUser, id: string): Promise<PurchaseFull> {
    const p = await tx.purchase.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: purchaseInclude,
    });
    if (!p) throw new NotFoundException();
    return p;
  }
}
