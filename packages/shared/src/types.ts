import type { Locale, Role } from './enums.js';

export interface UserDto {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
  locale: Locale;
  createdAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  inn: string;
  address: string;
  markupPercent: number;
  advancePercent: number;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}
