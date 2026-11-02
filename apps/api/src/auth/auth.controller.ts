import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { type AuthResponse, type LoginInput, loginSchema, type UserDto } from '@savdo/shared';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Public } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toUserDto } from '../users/user.mapper.js';
import { AuthService, type IssuedTokens } from './auth.service.js';
import { REFRESH_COOKIE } from './tokens.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.login(body));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    try {
      return this.respond(res, await this.auth.refresh(this.readCookie(req)));
    } catch (e) {
      this.clearCookie(res);
      throw e;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.readCookie(req));
    this.clearCookie(res);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    const u = await this.prisma.user.findFirst({
      where: { id: user.id, organizationId: user.organizationId },
    });
    if (!u) throw new NotFoundException();
    return toUserDto(u);
  }

  private readCookie(req: Request): string | undefined {
    const v = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    return typeof v === 'string' ? v : undefined;
  }

  private respond(res: Response, t: IssuedTokens): AuthResponse {
    res.cookie(REFRESH_COOKIE, t.refreshToken, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/auth',
      expires: t.refreshExpiresAt,
    });
    return { accessToken: t.accessToken, user: t.user };
  }

  private clearCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }
}
