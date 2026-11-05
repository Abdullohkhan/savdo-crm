import { Module } from '@nestjs/common';
import { NotificationsController, TelegramController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { RemindersService } from './reminders.service.js';
import { TelegramService } from './telegram.service.js';

@Module({
  controllers: [NotificationsController, TelegramController],
  providers: [NotificationsService, TelegramService, RemindersService],
  exports: [NotificationsService, TelegramService, RemindersService],
})
export class NotificationsModule {}
