export const Role = {
  OWNER: 'OWNER',
  BUXGALTER: 'BUXGALTER',
  SOTUVCHI: 'SOTUVCHI',
  OMBORCHI: 'OMBORCHI',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role) as [Role, ...Role[]];

export const Locale = { uz: 'uz', en: 'en', ru: 'ru' } as const;
export type Locale = (typeof Locale)[keyof typeof Locale];
export const LOCALES = Object.values(Locale) as [Locale, ...Locale[]];
export const DEFAULT_LOCALE: Locale = 'uz';

export const Theme = { light: 'light', dark: 'dark', system: 'system' } as const;
export type Theme = (typeof Theme)[keyof typeof Theme];
export const THEMES = Object.values(Theme) as [Theme, ...Theme[]];

/** Tannarx/foydani ko'ra oladigan rollar */
export const COST_VISIBLE_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER];
