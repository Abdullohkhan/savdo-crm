import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateUserInput, UpdateMeInput, UpdateUserInput, UserDto } from '@savdo/shared';
import * as argon2 from 'argon2';
import type { AuthUser } from '../common/auth-user.js';
import { Prisma } from '../generated/prisma/client.js';
import { AuthService } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toUserDto } from './user.mapper.js';

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async list(actor: AuthUser): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { createdAt: 'asc' },
    });
    return users.map(toUserDto);
  }

  async get(actor: AuthUser, id: string): Promise<UserDto> {
    return toUserDto(await this.findInOrg(actor, id));
  }

  async create(actor: AuthUser, input: CreateUserInput): Promise<UserDto> {
    try {
      const u = await this.prisma.user.create({
        data: {
          organizationId: actor.organizationId,
          name: input.name,
          phone: input.phone,
          role: input.role,
          locale: input.locale ?? 'uz',
          passwordHash: await argon2.hash(input.password),
        },
      });
      return toUserDto(u);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('users.phoneTaken');
      throw e;
    }
  }

  async update(actor: AuthUser, id: string, input: UpdateUserInput): Promise<UserDto> {
    await this.findInOrg(actor, id);
    if (
      id === actor.id &&
      (input.isActive === false || (input.role && input.role !== actor.role))
    ) {
      // OWNER o'zini bloklab qo'ymasligi uchun
      throw new ForbiddenException('users.cannotChangeSelf');
    }
    const { password, ...rest } = input;
    try {
      const u = await this.prisma.user.update({
        where: { id },
        data: { ...rest, ...(password ? { passwordHash: await argon2.hash(password) } : {}) },
      });
      if (input.isActive === false || password) await this.auth.revokeAllForUser(id);
      return toUserDto(u);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('users.phoneTaken');
      throw e;
    }
  }

  async updateMe(actor: AuthUser, input: UpdateMeInput): Promise<UserDto> {
    const me = await this.findInOrg(actor, actor.id);
    const data: Prisma.UserUpdateInput = {};
    if (input.locale) data.locale = input.locale;
    if (input.newPassword) {
      if (
        !input.currentPassword ||
        !(await argon2.verify(me.passwordHash, input.currentPassword))
      ) {
        throw new BadRequestException('users.wrongCurrentPassword');
      }
      data.passwordHash = await argon2.hash(input.newPassword);
    }
    return toUserDto(await this.prisma.user.update({ where: { id: me.id }, data }));
  }

  private async findInOrg(actor: AuthUser, id: string) {
    const u = await this.prisma.user.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!u) throw new NotFoundException();
    return u;
  }
}
