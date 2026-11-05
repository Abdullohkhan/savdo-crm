import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { Role } from '@savdo/shared';
import { dateToIso, Decimal, isoToDate, money, todayIso } from '../common/db.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { fmtDate, fmtMoney } from '../documents/render.js';
import { NotificationsService } from './notifications.service.js';

const DAY = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((isoToDate(toIso).getTime() - isoToDate(fromIso).getTime()) / DAY);
}

/**
 * Kunlik eslatmalar (Toshkent vaqti 09:00):
 * - nasiya: muddatdan 3 kun oldin; muddat o'tgan kuni va keyin har 3 kunda → sotuvchi + OWNER;
 * - kam qoldiq → OMBORCHI + OWNER.
 * Idempotent: dedupeKey'da sana bor, qayta ishga tushsa takrorlanmaydi.
 */
@Injectable()
export class RemindersService {
  private readonly log = new Logger('Reminders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 9 * * *', { name: 'daily-reminders', timeZone: 'Asia/Tashkent' })
  async cron(): Promise<void> {
    try {
      await this.runDaily();
    } catch (e) {
      this.log.error(`kunlik eslatmalar xatosi: ${String(e)}`);
    }
  }

  /** Telegram outbox — qayta urinish */
  @Interval('telegram-outbox', 30_000)
  async outbox(): Promise<void> {
    await this.notifications.dispatchTelegram().catch((e: unknown) => this.log.warn(String(e)));
  }

  async runDaily(now = new Date()): Promise<{ debts: number; lowStock: number }> {
    const today = todayIso(now);
    const debts = await this.debtReminders(today);
    const lowStock = await this.lowStockReminders(today);
    this.notifications.kick();
    return { debts, lowStock };
  }

  private async owners(organizationId: string): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { organizationId, role: Role.OWNER, isActive: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async debtReminders(today: string): Promise<number> {
    const limit = new Date(isoToDate(today).getTime() + 3 * DAY);
    const debts = await this.prisma.debt.findMany({
      where: { closedAt: null, remaining: { gt: 0 }, dueDate: { lte: limit } },
      include: {
        order: { select: { id: true, number: true, sellerId: true } },
        customer: { select: { name: true } },
      },
    });
    const ownerCache = new Map<string, string[]>();
    let count = 0;
    for (const d of debts) {
      const due = dateToIso(d.dueDate);
      const diff = daysBetween(due, today); // >0 — o'tgan kunlar
      let type: 'DEBT_DUE_SOON' | 'DEBT_OVERDUE' | null = null;
      if (diff === -3) type = 'DEBT_DUE_SOON';
      else if (diff >= 1 && (diff - 1) % 3 === 0) type = 'DEBT_OVERDUE';
      if (!type) continue;
      if (!ownerCache.has(d.organizationId)) {
        ownerCache.set(d.organizationId, await this.owners(d.organizationId));
      }
      count += await this.notifications.notifyUsers(
        this.prisma,
        d.organizationId,
        [d.order.sellerId, ...ownerCache.get(d.organizationId)!],
        {
          type,
          params: {
            orderNumber: d.order.number,
            customerName: d.customer.name,
            remaining: fmtMoney(money(d.remaining)!),
            dueDate: fmtDate(d.dueDate),
          },
          entity: 'ORDER',
          entityId: d.order.id,
          dedupeKey: `${type}:${d.id}:${today}`,
        },
      );
    }
    return count;
  }

  private async lowStockReminders(today: string): Promise<number> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, minStock: { gt: 0 } },
      select: { id: true, organizationId: true, minStock: true },
    });
    if (products.length === 0) return 0;
    const sums = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { productId: { in: products.map((p) => p.id) } },
      _sum: { quantity: true },
    });
    const stock = new Map(sums.map((s) => [s.productId, s._sum.quantity ?? new Decimal(0)]));
    const perOrg = new Map<string, number>();
    for (const p of products) {
      const q = stock.get(p.id) ?? new Decimal(0);
      if (q.lessThanOrEqualTo(p.minStock)) {
        perOrg.set(p.organizationId, (perOrg.get(p.organizationId) ?? 0) + 1);
      }
    }
    let count = 0;
    for (const [organizationId, n] of perOrg) {
      count += await this.notifications.notifyRoles(
        this.prisma,
        organizationId,
        [Role.OMBORCHI, Role.OWNER],
        {
          type: 'LOW_STOCK',
          params: { count: n },
          entity: 'PRODUCT',
          dedupeKey: `LOW_STOCK:${today}`,
        },
      );
    }
    return count;
  }
}
