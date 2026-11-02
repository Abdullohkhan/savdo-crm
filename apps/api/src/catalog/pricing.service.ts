import { Injectable } from '@nestjs/common';
import { salePriceFrom } from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import { audit, type Tx } from '../common/db.js';

/**
 * Sotuv narxi = tannarx × (1 + ustama). Ustama: tovar toifasi (yoki eng yaqin ota-toifa)
 * ustamasi, bo'lmasa korxona ustamasi.
 */
@Injectable()
export class PricingService {
  async markupResolver(
    tx: Tx,
    organizationId: string,
  ): Promise<(categoryId: string | null) => number> {
    const [org, cats] = await Promise.all([
      tx.organization.findUniqueOrThrow({ where: { id: organizationId } }),
      tx.category.findMany({
        where: { organizationId },
        select: { id: true, parentId: true, markupPercent: true },
      }),
    ]);
    const byId = new Map(cats.map((c) => [c.id, c]));
    return (categoryId) => {
      const seen = new Set<string>();
      let cur = categoryId ? byId.get(categoryId) : undefined;
      while (cur && !seen.has(cur.id)) {
        if (cur.markupPercent !== null) return cur.markupPercent;
        seen.add(cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return org.markupPercent;
    };
  }

  /** Avtomatik narxli tovarlarning sotuv narxini qayta hisoblaydi; o'zgarganlarini AuditLog'ga yozadi */
  async recompute(tx: Tx, actor: AuthUser, productIds?: string[]): Promise<void> {
    const markup = await this.markupResolver(tx, actor.organizationId);
    const products = await tx.product.findMany({
      where: {
        organizationId: actor.organizationId,
        priceManual: false,
        ...(productIds ? { id: { in: productIds } } : {}),
      },
      select: { id: true, avgCost: true, salePrice: true, categoryId: true },
    });
    for (const p of products) {
      const price = salePriceFrom(p.avgCost, markup(p.categoryId));
      if (price === p.salePrice) continue;
      await tx.product.update({ where: { id: p.id }, data: { salePrice: price } });
      await audit(tx, actor, 'Product', p.id, 'price.auto', { from: p.salePrice, to: price });
    }
  }
}
