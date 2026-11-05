import { createHash, randomInt } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import type { Locale, TelegramLinkDto } from '@savdo/shared';
import { Bot } from 'grammy';
import type { AuthUser } from '../common/auth-user.js';
import { audit } from '../common/db.js';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LINK_TEXT } from './messages.js';

/** Bog'lash kodi amal qilish muddati */
export const LINK_CODE_TTL_MS = 10 * 60 * 1000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type TelegramSender = (chatId: string, text: string, url?: string) => Promise<void>;

function hashCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('Telegram');
  private bot: Bot | null = null;
  /** Testlarda almashtiriladi */
  private sender: TelegramSender | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    if (config.telegramBotToken) {
      this.bot = new Bot(config.telegramBotToken);
      const bot = this.bot;
      this.sender = async (chatId, text, url) => {
        await bot.api.sendMessage(chatId, text, {
          link_preview_options: { is_disabled: true },
          ...(url && url.startsWith('https://')
            ? { reply_markup: { inline_keyboard: [[{ text: '↗', url }]] } }
            : {}),
        });
      };
    }
  }

  get enabled(): boolean {
    return this.sender !== null;
  }

  setSender(sender: TelegramSender | null): void {
    this.sender = sender;
  }

  onApplicationBootstrap(): void {
    if (!this.bot || !this.config.telegramPolling) return;
    const bot = this.bot;
    bot.command('start', async (ctx) => {
      const code = (ctx.match ?? '').trim();
      const lang = ctx.from?.language_code;
      const fallback: Locale = lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'uz';
      if (!code) {
        await ctx.reply(LINK_TEXT[fallback].help);
        return;
      }
      const r = await this.handleStart(code, String(ctx.chat.id));
      await ctx.reply(LINK_TEXT[r.locale ?? fallback][r.result]);
    });
    bot.catch((e) => this.log.warn(`bot xatosi: ${String(e.error)}`));
    // Long polling — fon rejimida; xato bo'lsa ilova ishlashda davom etadi
    void bot.start({ drop_pending_updates: true }).catch((e: unknown) => {
      this.log.warn(`polling to'xtadi: ${String(e)}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot?.isRunning()) await this.bot.stop();
  }

  /** Bir martalik bog'lash kodi (10 daqiqa) */
  async createLinkCode(actor: AuthUser, now = new Date()): Promise<TelegramLinkDto> {
    let code = '';
    for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];
    const expiresAt = new Date(now.getTime() + LINK_CODE_TTL_MS);
    await this.prisma.user.update({
      where: { id: actor.id },
      data: { telegramLinkHash: hashCode(code), telegramLinkExpiresAt: expiresAt },
    });
    const username = this.config.telegramBotUsername ?? null;
    return {
      code,
      expiresAt: expiresAt.toISOString(),
      botUsername: username,
      deepLink: username ? `https://t.me/${username}?start=${code}` : null,
    };
  }

  /** Botga `/start <kod>` keldi */
  async handleStart(
    code: string,
    chatId: string,
    now = new Date(),
  ): Promise<{ result: 'linked' | 'invalid' | 'expired'; locale?: Locale }> {
    if (!/^[A-Za-z0-9]{4,16}$/.test(code.trim())) return { result: 'invalid' };
    const u = await this.prisma.user.findUnique({ where: { telegramLinkHash: hashCode(code) } });
    if (!u || !u.isActive) return { result: 'invalid' };
    if (!u.telegramLinkExpiresAt || u.telegramLinkExpiresAt <= now) {
      await this.prisma.user.update({
        where: { id: u.id },
        data: { telegramLinkHash: null, telegramLinkExpiresAt: null },
      });
      return { result: 'expired', locale: u.locale };
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: u.id },
        data: { telegramChatId: chatId, telegramLinkHash: null, telegramLinkExpiresAt: null },
      });
      await audit(
        tx,
        { id: u.id, organizationId: u.organizationId, role: u.role },
        'User',
        u.id,
        'telegram.link',
        {},
      );
    });
    return { result: 'linked', locale: u.locale };
  }

  async unlink(actor: AuthUser): Promise<void> {
    await this.prisma.user.update({
      where: { id: actor.id },
      data: { telegramChatId: null, telegramLinkHash: null, telegramLinkExpiresAt: null },
    });
  }

  async send(chatId: string, text: string, url?: string): Promise<boolean> {
    if (!this.sender) return false;
    await this.sender(chatId, text, url);
    return true;
  }
}
