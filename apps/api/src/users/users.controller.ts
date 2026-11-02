import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  type CreateUserInput,
  createUserSchema,
  Role,
  type UpdateMeInput,
  updateMeSchema,
  type UpdateUserInput,
  updateUserSchema,
  type UserDto,
} from '@savdo/shared';
import { type AuthUser, CurrentUser } from '../common/auth-user.js';
import { Roles } from '../common/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Har kim o'z tili va parolini o'zgartiradi. `:id` dan oldin turishi shart. */
  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(updateMeSchema)) body: UpdateMeInput,
  ): Promise<UserDto> {
    return this.users.updateMe(user, body);
  }

  @Roles(Role.OWNER)
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<UserDto[]> {
    return this.users.list(user);
  }

  @Roles(Role.OWNER)
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    return this.users.get(user, id);
  }

  @Roles(Role.OWNER)
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createUserSchema)) body: CreateUserInput,
  ): Promise<UserDto> {
    return this.users.create(user, body);
  }

  @Roles(Role.OWNER)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateUserSchema)) body: UpdateUserInput,
  ): Promise<UserDto> {
    return this.users.update(user, id, body);
  }
}
