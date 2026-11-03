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

// ---------- 3-bosqich: savdo ----------

export const CustomerType = { JISMONIY: 'JISMONIY', YURIDIK: 'YURIDIK' } as const;
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];
export const CUSTOMER_TYPES = Object.values(CustomerType) as [CustomerType, ...CustomerType[]];

export const OrderStatus = {
  QORALAMA: 'QORALAMA',
  TASDIQLANGAN: 'TASDIQLANGAN',
  AVANS_KUTILMOQDA: 'AVANS_KUTILMOQDA',
  YIGILMOQDA: 'YIGILMOQDA',
  JONATILDI: 'JONATILDI',
  YAKUNLANDI: 'YAKUNLANDI',
  BEKOR: 'BEKOR',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const ORDER_STATUSES = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];
/** Bosqichlar chizig'i tartibi (BEKOR'siz) */
export const ORDER_FLOW: readonly OrderStatus[] = [
  'QORALAMA',
  'TASDIQLANGAN',
  'AVANS_KUTILMOQDA',
  'YIGILMOQDA',
  'JONATILDI',
  'YAKUNLANDI',
];

export const PaymentMethod = { NAQD: 'NAQD', KARTA: 'KARTA', OTKAZMA: 'OTKAZMA' } as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PAYMENT_METHODS = Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]];

export const PaymentStatus = {
  KUTILMOQDA: 'KUTILMOQDA',
  TASDIQLANGAN: 'TASDIQLANGAN',
  RAD_ETILGAN: 'RAD_ETILGAN',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export const PAYMENT_STATUSES = Object.values(PaymentStatus) as [PaymentStatus, ...PaymentStatus[]];

/** Mijoz qo'shish/tahrirlash, buyurtma tuzish */
export const SALES_ROLES: readonly Role[] = [Role.OWNER, Role.SOTUVCHI];
/** Mijozlarni ko'rish va tahrirlash */
export const CUSTOMER_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER, Role.SOTUVCHI];
/** To'lov qabul qilish */
export const PAYMENT_RECEIVE_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER, Role.SOTUVCHI];
/** To'lovni tasdiqlash/rad etish */
export const PAYMENT_CONFIRM_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER];
/** Yig'ish va jo'natish */
export const WAREHOUSE_ROLES: readonly Role[] = [Role.OWNER, Role.OMBORCHI];
/** Buyurtmani yakunlash */
export const COMPLETE_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER, Role.SOTUVCHI];
/** Buyurtmani bekor qilish (jo'natilgandan keyin — faqat OWNER) */
export const ORDER_CANCEL_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER, Role.SOTUVCHI];
