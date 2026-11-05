import { type OrderStatus, Role } from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import type { Prisma } from '../generated/prisma/client.js';

/** OMBORCHI ko'radigan holatlar */
export const WAREHOUSE_VISIBLE: OrderStatus[] = ['YIGILMOQDA', 'JONATILDI', 'YAKUNLANDI'];

/** Rolga qarab ko'rinadigan buyurtmalar sharti */
export function visibleOrdersWhere(actor: AuthUser): Prisma.SalesOrderWhereInput {
  const where: Prisma.SalesOrderWhereInput = { organizationId: actor.organizationId };
  if (actor.role === Role.SOTUVCHI) where.sellerId = actor.id;
  if (actor.role === Role.OMBORCHI) where.status = { in: WAREHOUSE_VISIBLE };
  return where;
}
