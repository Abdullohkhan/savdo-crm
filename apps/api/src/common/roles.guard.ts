import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@savdo/shared';
import type { AuthedRequest } from './auth-user.js';
import { ROLES_KEY } from './decorators.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const { user } = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!user || !roles.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}
