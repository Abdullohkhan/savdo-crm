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

// ---------- 4-bosqich: hujjat va xabar ----------

export const DocumentType = {
  SHARTNOMA: 'SHARTNOMA',
  HISOB_FAKTURA: 'HISOB_FAKTURA',
  YUK_XATI: 'YUK_XATI',
  AKT: 'AKT',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];
export const DOCUMENT_TYPES = Object.values(DocumentType) as [DocumentType, ...DocumentType[]];

export const DocumentStatus = {
  YARATILDI: 'YARATILDI',
  IMZOLANDI: 'IMZOLANDI',
  BEKOR: 'BEKOR',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
export const DOCUMENT_STATUSES = Object.values(DocumentStatus) as [
  DocumentStatus,
  ...DocumentStatus[],
];

/** Hujjat shabloni tillari (en yo'q — hujjatlar faqat o'zbek va rus tilida) */
export const DocLocale = { uz: 'uz', ru: 'ru' } as const;
export type DocLocale = (typeof DocLocale)[keyof typeof DocLocale];
export const DOC_LOCALES = Object.values(DocLocale) as [DocLocale, ...DocLocale[]];

/** Hujjatlarni ko'rish (OMBORCHI — faqat yuk xati) */
export const DOCUMENT_VIEW_ROLES: readonly Role[] = [
  Role.OWNER,
  Role.BUXGALTER,
  Role.SOTUVCHI,
  Role.OMBORCHI,
];
/** Hujjatni qayta yaratish va aktni "imzolandi" belgilash */
export const DOCUMENT_SIGN_ROLES: readonly Role[] = [Role.OWNER, Role.BUXGALTER, Role.SOTUVCHI];

export function canSeeDocumentType(role: Role | undefined, type: DocumentType): boolean {
  if (role === undefined) return false;
  if (role === Role.OMBORCHI) return type === DocumentType.YUK_XATI;
  return DOCUMENT_VIEW_ROLES.includes(role);
}

export const NotificationType = {
  /** Buyurtma avans kutmoqda → BUXGALTER */
  ORDER_AWAITING_ADVANCE: 'ORDER_AWAITING_ADVANCE',
  /** Yig'ish kerak → OMBORCHI */
  ORDER_TO_PICK: 'ORDER_TO_PICK',
  /** Jo'natildi → mas'ul sotuvchi */
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  /** Yangi to'lov tasdiq kutmoqda → BUXGALTER */
  PAYMENT_TO_CONFIRM: 'PAYMENT_TO_CONFIRM',
  /** To'lov rad etildi → qabul qilgan xodim */
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  /** Tannarxdan past narx — ruxsat kerak → OWNER */
  PRICE_APPROVAL: 'PRICE_APPROVAL',
  /** Nasiya muddatiga 3 kun qoldi → sotuvchi + OWNER */
  DEBT_DUE_SOON: 'DEBT_DUE_SOON',
  /** Nasiya muddati o'tdi → sotuvchi + OWNER */
  DEBT_OVERDUE: 'DEBT_OVERDUE',
  /** Kam qolgan tovarlar → OMBORCHI + OWNER */
  LOW_STOCK: 'LOW_STOCK',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NOTIFICATION_TYPES = Object.values(NotificationType) as [
  NotificationType,
  ...NotificationType[],
];

/** Bildirishnoma havolasi qaysi ob'ektga */
export const NotificationEntity = {
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  PRODUCT: 'PRODUCT',
} as const;
export type NotificationEntity = (typeof NotificationEntity)[keyof typeof NotificationEntity];
