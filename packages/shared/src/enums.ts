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

/** Tovarlarni qo'shish/tahrirlash, toifa va ta'minotchilar */
export const CATALOG_EDIT_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER, Role.OMBORCHI];
/** Kirim qoralamasi (tovar va miqdor) */
export const PURCHASE_DRAFT_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER, Role.OMBORCHI];
/** Inventarizatsiya (TUZATISH) */
export const STOCKTAKE_ROLES: readonly Role[] = [Role.OWNER, Role.OMBORCHI];

export function canSeeCost(role: Role | undefined): boolean {
  return role !== undefined && COST_VISIBLE_ROLES.includes(role);
}

export const Unit = { dona: 'dona', kg: 'kg', m: 'm', quti: 'quti' } as const;
export type Unit = (typeof Unit)[keyof typeof Unit];
export const UNITS = Object.values(Unit) as [Unit, ...Unit[]];

export const MovementType = {
  KIRIM: 'KIRIM',
  CHIQIM: 'CHIQIM',
  QAYTARISH: 'QAYTARISH',
  TUZATISH: 'TUZATISH',
  KOCHIRISH: 'KOCHIRISH',
} as const;
export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export const PurchaseStatus = {
  QORALAMA: 'QORALAMA',
  TASDIQLANGAN: 'TASDIQLANGAN',
  BEKOR: 'BEKOR',
} as const;
export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];
export const PURCHASE_STATUSES = Object.values(PurchaseStatus) as [
  PurchaseStatus,
  ...PurchaseStatus[],
];
