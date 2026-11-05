import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { NotificationDto, TelegramLinkDto, UnreadCountDto } from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { NotificationsService } from './notifications.service.js';
import { TelegramService } from './telegram.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string): Promise<NotificationDto[]> {
    const n = Number(limit);
    return this.notifications.list(user, Number.isInteger(n) && n > 0 ? n : 50);
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthUser): Promise<UnreadCountDto> {
    return { count: await this.notifications.unreadCount(user) };
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: AuthUser): Promise<UnreadCountDto> {
    await this.notifications.markAllRead(user);
    return { count: 0 };
  }

  @Post(':id/read')
  read(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationDto> {
    return this.notifications.markRead(user, id);
  }
}

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Post('link-code')
  linkCode(@CurrentUser() user: AuthUser): Promise<TelegramLinkDto> {
    return this.telegram.createLinkCode(user);
  }

  @Delete('link')
  async unlink(@CurrentUser() user: AuthUser): Promise<{ ok: true }> {
    await this.telegram.unlink(user);
    return { ok: true };
  }
}
