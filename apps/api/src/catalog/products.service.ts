import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canSeeCost,
  type ProductCreateInput,
  type ProductDto,
  type ProductUpdateInput,
  type StockMovementDto,
} from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import { audit, dec, Decimal, isUniqueViolation, qty, type Tx } from '../common/db.js';
import type { Prisma, Product } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StockService } from '../stock/stock.service.js';
import { PricingService } from './pricing.service.js';

export interface ProductListQuery {
  q?: string;
  categoryId?: string;
  low?: boolean;
  includeInactive?: boolean;
}

export function toProductDto(p: Product, stock: Decimal, showCost: boolean): ProductDto {
  const min = p.minStock;
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode ?? '',
    name: p.name,
    unit: p.unit,
    categoryId: p.categoryId,
    salePrice: p.salePrice,
    priceManual: p.priceManual,
    minStock: qty(min),
    stock: qty(stock),
    isLow: min.greaterThan(0) && stock.lessThanOrEqualTo(min),
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    ...(showCost ? { avgCost: p.avgCost } : {}),
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly pricing: PricingService,
  ) {}

  async list(actor: AuthUser, query: ProductListQuery): Promise<ProductDto[]> {
    const where: Prisma.ProductWhereInput = { organizationId: actor.organizationId };
    if (!query.includeInactive) where.isActive = true;
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: q },
      ];
    }
    if (query.categoryId) {
      where.categoryId = { in: await this.categoryWithDescendants(actor, query.categoryId) };
    }
    const products = await this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 1000,
    });
    const stock = await this.stock.stockMap(
      this.prisma,
      actor.organizationId,
      products.map((p) => p.id),
    );
    const show = canSeeCost(actor.role);
    const dtos = products.map((p) => toProductDto(p, stock.get(p.id) ?? new Decimal(0), show));
    return query.low ? dtos.filter((d) => d.isLow) : dtos;
  }

  async get(actor: AuthUser, id: string): Promise<ProductDto> {
    const p = await this.findInOrg(this.prisma, actor, id);
    const stock = await this.stock.stockMap(this.prisma, actor.organizationId, [id]);
    return toProductDto(p, stock.get(id) ?? new Decimal(0), canSeeCost(actor.role));
  }

  async movements(actor: AuthUser, id: string): Promise<StockMovementDto[]> {
    await this.findInOrg(this.prisma, actor, id);
    const rows = await this.prisma.stockMovement.findMany({
      where: { organizationId: actor.organizationId, productId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { name: true } },
        purchase: { select: { number: true } },
        order: { select: { number: true } },
      },
    });
    const show = canSeeCost(actor.role);
    return rows.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: qty(m.quantity),
      purchaseId: m.purchaseId,
      purchaseNumber: m.purchase?.number ?? null,
      orderId: m.orderId,
      orderNumber: m.order?.number ?? null,
      note: m.note,
      userName: m.user.name,
      createdAt: m.createdAt.toISOString(),
      ...(show ? { unitCost: m.unitCost } : {}),
    }));
  }

  async create(actor: AuthUser, input: ProductCreateInput): Promise<ProductDto> {
    if (input.salePrice !== undefined && !canSeeCost(actor.role)) {
      throw new ForbiddenException('catalog.priceForbidden');
    }
    if (input.categoryId) await this.assertCategory(actor, input.categoryId);
    try {
      const p = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            organizationId: actor.organizationId,
            sku: input.sku,
            barcode: input.barcode || null,
            name: input.name,
            unit: input.unit,
            categoryId: input.categoryId ?? null,
            minStock: dec(input.minStock ?? 0),
            salePrice: input.salePrice ?? 0,
            priceManual: input.salePrice !== undefined,
          },
        });
        if (input.salePrice !== undefined) {
          await audit(tx, actor, 'Product', created.id, 'price.manual', {
            from: null,
            to: input.salePrice,
          });
        }
        return created;
      });
      return toProductDto(p, new Decimal(0), canSeeCost(actor.role));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('catalog.skuOrBarcodeTaken');
      throw e;
    }
  }

  async update(actor: AuthUser, id: string, input: ProductUpdateInput): Promise<ProductDto> {
    if (
      (input.salePrice !== undefined || input.priceManual !== undefined) &&
      !canSeeCost(actor.role)
    ) {
      throw new ForbiddenException('catalog.priceForbidden');
    }
    if (input.categoryId) await this.assertCategory(actor, input.categoryId);
    try {
      await this.prisma.$transaction(async (tx) => {
        const current = await this.findInOrg(tx, actor, id);
        const { salePrice, priceManual, minStock, barcode, ...rest } = input;
        const data: Prisma.ProductUpdateInput = { ...rest };
        if (minStock !== undefined) data.minStock = dec(minStock);
        if (barcode !== undefined) data.barcode = barcode || null;
        if (salePrice !== undefined) {
          data.salePrice = salePrice;
          data.priceManual = true;
        } else if (priceManual !== undefined) {
          data.priceManual = priceManual;
        }
        const updated = await tx.product.update({ where: { id }, data });
        if (updated.salePrice !== current.salePrice) {
          await audit(tx, actor, 'Product', id, 'price.manual', {
            from: current.salePrice,
            to: updated.salePrice,
          });
        }
        // Avtomatik narxga qaytdi yoki toifa (ustama) o'zgardi
        if (!updated.priceManual) await this.pricing.recompute(tx, actor, [id]);
      });
      return this.get(actor, id);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('catalog.skuOrBarcodeTaken');
      throw e;
    }
  }

  private async findInOrg(tx: Tx | PrismaService, actor: AuthUser, id: string): Promise<Product> {
    const p = await tx.product.findFirst({ where: { id, organizationId: actor.organizationId } });
    if (!p) throw new NotFoundException();
    return p;
  }

  private async assertCategory(actor: AuthUser, id: string): Promise<void> {
    const c = await this.prisma.category.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!c) throw new NotFoundException('catalog.categoryNotFound');
  }

  private async categoryWithDescendants(actor: AuthUser, rootId: string): Promise<string[]> {
    const all = await this.prisma.category.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, parentId: true },
    });
    const result = new Set<string>([rootId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of all) {
        if (c.parentId && result.has(c.parentId) && !result.has(c.id)) {
          result.add(c.id);
          grew = true;
        }
      }
    }
    return [...result];
  }
}
