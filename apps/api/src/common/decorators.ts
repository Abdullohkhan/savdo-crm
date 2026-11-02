import { SetMetadata } from '@nestjs/common';
import type { Role } from '@savdo/shared';

export const IS_PUBLIC = 'isPublic';
/** Auth talab qilinmaydigan endpoint */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
/** Faqat ko'rsatilgan rollarga ruxsat */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
