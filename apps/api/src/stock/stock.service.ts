import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, type StockAdjustmentInput } from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import { audit, dec, Decimal, lockOrganization, lockProducts, qty, type Tx } from '../common/db.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /** Korxonaning asosiy ombori (MVP'da bitta); yo'q bo'lsa yaratiladi */
  async defaultWarehouseId(tx: Tx, organizationId: string): Promise<string> {
    const found = await tx.warehouse.findFirst({ where: { organizationId, isDefault: true } });
    if (found) return found.id;
    await lockOrganization(tx, organizationId);
    const again = await tx.warehouse.findFirst({ where: { organizationId, isDefault: true } });
    if (again) return again.id;
    const w = await tx.warehouse.create({
      data: { organizationId, name: 'Asosiy ombor', isDefault: true },
    });
    return w.id;
  }

  /** Qoldiq = harakatlar yig'indisi */
  async stockMap(
    tx: Tx | PrismaService,
    organizationId: string,
    productIds?: string[],
  ): Promise<Map<string, Decimal>> {
    const rows = await tx.stockMovement.groupBy({
      by: ['productId'],
      where: { organizationId, ...(productIds ? { productId: { in: productIds } } : {}) },
      _sum: { quantity: true },
    });
    return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? new Decimal(0)]));
  }

  /** Inventarizatsiya: haqiqiy miqdor → farq TUZATISH harakati */
  async adjust(actor: AuthUser, input: StockAdjustmentInput) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: input.productId, organizationId: actor.organizationId },
      });
      if (!product) throw new NotFoundException();
      await lockProducts(tx, [product.id]);
      const current =
        (await this.stockMap(tx, actor.organizationId, [product.id])).get(product.id) ??
        new Decimal(0);
      const actual = dec(input.actualQuantity);
      const diff = actual.minus(current);
      if (diff.isZero()) throw new BadRequestException('stock.noDifference');

      const warehouseId = await this.defaultWarehouseId(tx, actor.organizationId);
      const m = await tx.stockMovement.create({
        data: {
          organizationId: actor.organizationId,
          warehouseId,
          productId: product.id,
          type: MovementType.TUZATISH,
          quantity: diff,
          unitCost: product.avgCost,
          note: input.reason,
          userId: actor.id,
        },
      });
      await audit(tx, actor, 'Product', product.id, 'stock.adjust', {
        before: current.toString(),
        after: actual.toString(),
        reason: input.reason,
      });
      return { movementId: m.id, stock: qty(actual) };
    });
  }
}
