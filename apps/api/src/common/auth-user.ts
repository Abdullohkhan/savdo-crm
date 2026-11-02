import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@savdo/shared';
import type { Request } from 'express';

/** JWT'dan olingan joriy foydalanuvchi */
export interface AuthUser {
  id: string;
  organizationId: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  org: string;
  role: Role;
}

export type AuthedRequest = Request & { user?: AuthUser };

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.user) throw new Error('CurrentUser: user yo`q (Public endpointmi?)');
  return req.user;
});
