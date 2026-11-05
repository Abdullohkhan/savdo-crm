import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { NotificationDto, NotificationEntity, NotificationType, Role } from '@savdo/shared';
import type { AuthUser } from '../common/auth-user.js';
import type { Tx } from '../common/db.js';
import { APP_CONFIG, type AppConfig } from '../config.js';
import type { Notification } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { formatMessage, OPEN_TEXT } from './messages.js';
import { TelegramService } from './telegram.service.js';

export interface NotifyPayload {
  type: NotificationType;
  params: Record<string, string | number>;
  entity?: NotificationEntity;
  entityId?: string;
  /** Takror yubormaslik kaliti (foydalanuvchi bo'yicha unique) */
  dedupeKey?: string;
}

function toDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    params: (n.params ?? {}) as Record<string, string | number>,
    entity: n.entity,
    entityId: n.entityId,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

/** Bildirishnoma havolasi (web yo'li) */
export function linkPath(n: {
  entity: NotificationEntity | null;
  entityId: string | null;
}): string {
  if (n.entity === 'ORDER' && n.entityId) return `/orders/${n.entityId}`;
  if (n.entity === 'PAYMENT') return '/payments';
  if (n.entity === 'PRODUCT') return '/products?low=1';
  return '/';
}

const MAX_TRIES = 3;

@Injectable()
export class NotificationsService {
  private readonly log = new Logger('Notifications');
  private dispatching = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Berilgan foydalanuvchilarga (tranzaksiya ichida); dedupeKey bo'lsa takrorlanmaydi */
  async notifyUsers(
    tx: Tx | PrismaService,
    organizationId: string,
    userIds: string[],
    p: NotifyPayload,
  ): Promise<number> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return 0;
    const r = await tx.notification.createMany({
      data: ids.map((userId) => ({
        organizationId,
        userId,
        type: p.type,
        params: p.params,
        entity: p.entity ?? null,
        entityId: p.entityId ?? null,
        dedupeKey: p.dedupeKey ?? null,
      })),
      skipDuplicates: true,
    });
    return r.count;
  }

  /** Rol bo'yicha faol xodimlarga; amalni bajargan xodimning o'ziga yuborilmaydi */
  async notifyRoles(
    tx: Tx | PrismaService,
    organizationId: string,
    roles: readonly Role[],
    p: NotifyPayload,
    exceptUserId?: string,
  ): Promise<number> {
    const users = await tx.user.findMany({
      where: { organizationId, isActive: true, role: { in: [...roles] } },
      select: { id: true },
    });
    return this.notifyUsers(
      tx,
      organizationId,
      users.map((u) => u.id).filter((id) => id !== exceptUserId),
      p,
    );
  }

  async list(actor: AuthUser, limit = 50): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId: actor.id, organizationId: actor.organizationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map(toDto);
  }

  async unreadCount(actor: AuthUser): Promise<number> {
    return this.prisma.notification.count({
      where: { userId: actor.id, organizationId: actor.organizationId, readAt: null },
    });
  }

  async markRead(actor: AuthUser, id: string): Promise<NotificationDto> {
    const n = await this.prisma.notification.findFirst({
      where: { id, userId: actor.id, organizationId: actor.organizationId },
    });
    if (!n) throw new NotFoundException();
    if (n.readAt) return toDto(n);
    return toDto(
      await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } }),
    );
  }

  async markAllRead(actor: AuthUser): Promise<number> {
    const r = await this.prisma.notification.updateMany({
      where: { userId: actor.id, organizationId: actor.organizationId, readAt: null },
      data: { readAt: new Date() },
    });
    return r.count;
  }

  /** Tranzaksiyadan keyin chaqiriladi — natijani kutmaydi */
  kick(): void {
    if (!this.telegram.enabled) return;
    void this.dispatchTelegram().catch((e: unknown) => this.log.warn(String(e)));
  }

  /**
   * Telegram'ga yuborilmagan bildirishnomalarni yuboradi (outbox).
   * Telegram ishlamasa — ilova ichidagisi baribir saqlangan; 3 marta urinib ko'riladi.
   */
  async dispatchTelegram(now = new Date()): Promise<number> {
    if (!this.telegram.enabled || this.dispatching) return 0;
    this.dispatching = true;
    let sent = 0;
    try {
      const rows = await this.prisma.notification.findMany({
        where: {
          telegramSentAt: null,
          telegramTries: { lt: MAX_TRIES },
          createdAt: { gt: new Date(now.getTime() - 24 * 3600_000) },
          user: { telegramChatId: { not: null }, isActive: true },
        },
        include: { user: { select: { telegramChatId: true, locale: true } } },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      for (const n of rows) {
        const text = formatMessage(
          n.user.locale,
          n.type,
          (n.params ?? {}) as Record<string, string | number>,
        );
        const url = `${this.config.webOrigin}${linkPath(n)}`;
        try {
          await this.telegram.send(
            n.user.telegramChatId!,
            `${text}\n${OPEN_TEXT[n.user.locale]}: ${url}`,
            url,
          );
          await this.prisma.notification.update({
            where: { id: n.id },
            data: { telegramSentAt: new Date(), telegramTries: { increment: 1 } },
          });
          sent++;
        } catch (e) {
          this.log.warn(`telegram yuborilmadi: ${String(e)}`);
          await this.prisma.notification.update({
            where: { id: n.id },
            data: { telegramTries: { increment: 1 } },
          });
        }
      }
    } finally {
      this.dispatching = false;
    }
    return sent;
  }
}
