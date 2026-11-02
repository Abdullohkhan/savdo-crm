import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginInput, UserDto } from '@savdo/shared';
import * as argon2 from 'argon2';
import { APP_CONFIG, type AppConfig } from '../config.js';
import type { JwtPayload } from '../common/auth-user.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toUserDto } from '../users/user.mapper.js';
import { hashToken, newRefreshToken } from './tokens.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: UserDto;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async login({ phone, password }: LoginInput): Promise<IssuedTokens> {
    // Telefon korxona ichida unique; bir nechta korxonada bo'lsa — paroli mos kelgani olinadi
    const candidates = await this.prisma.user.findMany({
      where: { phone, isActive: true },
    });
    for (const u of candidates) {
      if (await argon2.verify(u.passwordHash, password)) return this.issue(u);
    }
    throw new UnauthorizedException('auth.invalidCredentials');
  }

  /** Refresh rotation: eski token bekor qilinadi, yangisi beriladi */
  async refresh(token: string | undefined): Promise<IssuedTokens> {
    if (!token) throw new UnauthorizedException();
    const found = await this.prisma.refreshToken.findUnique({
      where: { hash: hashToken(token) },
      include: { user: true },
    });
    if (!found) throw new UnauthorizedException();

    if (found.revokedAt) {
      // Bekor qilingan token qayta ishlatildi — o'g'irlangan bo'lishi mumkin: barcha sessiyalarni yopamiz
      await this.revokeAllForUser(found.userId);
      throw new UnauthorizedException();
    }
    if (found.expiresAt <= new Date() || !found.user.isActive) throw new UnauthorizedException();

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: found.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count !== 1) throw new UnauthorizedException();
    return this.issue(found.user);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { hash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(user: User): Promise<IssuedTokens> {
    const payload: JwtPayload = { sub: user.id, org: user.organizationId, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + this.config.refreshTokenDays * 86_400_000);
    await this.prisma.refreshToken.create({
      data: { hash: hashToken(refreshToken), userId: user.id, expiresAt: refreshExpiresAt },
    });
    return { accessToken, refreshToken, refreshExpiresAt, user: toUserDto(user) };
  }
}
