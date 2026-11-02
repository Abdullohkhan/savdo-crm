import type { UserDto } from '@savdo/shared';
import type { User } from '../generated/prisma/client.js';

export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    organizationId: u.organizationId,
    name: u.name,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    locale: u.locale,
    createdAt: u.createdAt.toISOString(),
  };
}
