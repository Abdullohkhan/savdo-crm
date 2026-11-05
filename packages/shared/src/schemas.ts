import { z } from 'zod';
import { isValidQuantity } from './costing.js';
import {
  CUSTOMER_TYPES,
  DOC_LOCALES,
  DOCUMENT_TYPES,
  LOCALES,
  PAYMENT_METHODS,
  ROLES,
  UNITS,
} from './enums.js';

/**
 * Xato xabarlari i18n kalitlari ko'rinishida (masalan `validation.required`) —
 * web ularni tarjima qiladi.
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{9,15}$/, { message: 'validation.phone' });

export const passwordSchema = z.string().min(6, { message: 'validation.passwordMin' }).max(128);

const nameSchema = z.string().trim().min(1, { message: 'validation.required' }).max(100);

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, { message: 'validation.required' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(ROLES),
  locale: z.enum(LOCALES).optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    password: passwordSchema,
    role: z.enum(ROLES),
    isActive: z.boolean(),
  })
  .partial();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateMeSchema = z
  .object({
    locale: z.enum(LOCALES).optional(),
    currentPassword: z.string().min(1, { message: 'validation.required' }).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((v) => !v.newPassword || !!v.currentPassword, {
    message: 'validation.currentPasswordRequired',
    path: ['currentPassword'],
  });
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

const percentSchema = z.number().int().min(0).max(1000);

/** Hujjat raqami prefiksi: SH → SH-2026-0001 */
const docPrefixSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,10}$/, { message: 'validation.docPrefix' });

export const organizationSettingsSchema = z
  .object({
    name: nameSchema,
    inn: z
      .string()
      .trim()
      .regex(/^(\d{9}|\d{14})?$/, { message: 'validation.inn' }),
    address: z.string().trim().max(300),
    markupPercent: percentSchema,
    advancePercent: z.number().int().min(0).max(100),
    phone: z.string().trim().max(50),
    director: z.string().trim().max(100),
    bankName: z.string().trim().max(150),
    bankAccount: z
      .string()
      .trim()
      .regex(/^(\d{20})?$/, { message: 'validation.bankAccount' }),
    bankMfo: z
      .string()
      .trim()
      .regex(/^(\d{5})?$/, { message: 'validation.bankMfo' }),
    docLocale: z.enum(DOC_LOCALES),
    shartnomaPrefix: docPrefixSchema,
    hisobFakturaPrefix: docPrefixSchema,
    yukXatiPrefix: docPrefixSchema,
    aktPrefix: docPrefixSchema,
  })
  .partial();
export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;

// ---------- 2-bosqich: katalog va ombor ----------

const optionalText = (max: number) => z.string().trim().max(max);
const moneySchema = z
  .number({ message: 'validation.number' })
  .int({ message: 'validation.number' })
  .min(0, { message: 'validation.min0' })
  .max(1_000_000_000_000, { message: 'validation.tooLarge' });
const uuid = z.uuid({ message: 'validation.required' });

export const quantitySchema = z
  .number({ message: 'validation.number' })
  .positive({ message: 'validation.positive' })
  .max(1_000_000_000, { message: 'validation.tooLarge' })
  .refine(isValidQuantity, { message: 'validation.quantityDecimals' });

/** Inventarizatsiyada haqiqiy miqdor 0 bo'lishi mumkin */
export const actualQuantitySchema = z
  .number({ message: 'validation.number' })
  .min(0, { message: 'validation.min0' })
  .max(1_000_000_000, { message: 'validation.tooLarge' })
  .refine(isValidQuantity, { message: 'validation.quantityDecimals' });

export const categoryCreateSchema = z.object({
  name: nameSchema,
  parentId: uuid.nullable().optional(),
  markupPercent: z.number().int().min(0).max(1000).nullable().optional(),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = categoryCreateSchema
  .extend({ isActive: z.boolean() })
  .partial();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export const productCreateSchema = z.object({
  sku: z.string().trim().min(1, { message: 'validation.required' }).max(64),
  barcode: optionalText(64).optional(),
  name: z.string().trim().min(1, { message: 'validation.required' }).max(200),
  unit: z.enum(UNITS),
  categoryId: uuid.nullable().optional(),
  minStock: actualQuantitySchema.optional(),
  /** Faqat OWNER/BUXGALTER; berilsa narx qo'lda qotiriladi */
  salePrice: moneySchema.optional(),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema
  .extend({
    isActive: z.boolean(),
    /** false — narx yana avtomatik (tannarx × ustama) hisoblanadi */
    priceManual: z.boolean(),
  })
  .partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const supplierCreateSchema = z.object({
  name: nameSchema,
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d{9,15})?$/, { message: 'validation.phone' })
    .optional(),
  inn: z
    .string()
    .trim()
    .regex(/^(\d{9}|\d{14})?$/, { message: 'validation.inn' })
    .optional(),
});
export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;

export const supplierUpdateSchema = supplierCreateSchema
  .extend({ isActive: z.boolean() })
  .partial();
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;

export const purchaseLineInputSchema = z.object({
  productId: uuid,
  quantity: quantitySchema,
  /** Xarid narxi (birlik uchun). Faqat OWNER/BUXGALTER kiritadi */
  price: moneySchema.nullable().optional(),
});
export type PurchaseLineInput = z.infer<typeof purchaseLineInputSchema>;

export const purchaseExpenseInputSchema = z.object({
  title: z.string().trim().min(1, { message: 'validation.required' }).max(100),
  amount: moneySchema,
});
export type PurchaseExpenseInput = z.infer<typeof purchaseExpenseInputSchema>;

export const purchaseDraftSchema = z.object({
  supplierId: uuid.nullable().optional(),
  note: optionalText(500).optional(),
  lines: z
    .array(purchaseLineInputSchema)
    .max(500)
    .refine((ls) => new Set(ls.map((l) => l.productId)).size === ls.length, {
      message: 'validation.duplicateProduct',
    })
    .optional(),
  /** Faqat OWNER/BUXGALTER */
  expenses: z.array(purchaseExpenseInputSchema).max(50).optional(),
});
export type PurchaseDraftInput = z.infer<typeof purchaseDraftSchema>;

export const cancelSchema = z.object({
  reason: z.string().trim().min(3, { message: 'validation.reasonRequired' }).max(500),
});
export type CancelInput = z.infer<typeof cancelSchema>;

export const stockAdjustmentSchema = z.object({
  productId: uuid,
  actualQuantity: actualQuantitySchema,
  reason: z.string().trim().min(3, { message: 'validation.reasonRequired' }).max(500),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

// ---------- 3-bosqich: savdo ----------

export const customerCreateSchema = z.object({
  type: z.enum(CUSTOMER_TYPES),
  name: nameSchema,
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d{9,15})?$/, { message: 'validation.phone' })
    .optional(),
  inn: z
    .string()
    .trim()
    .regex(/^(\d{9}|\d{14})?$/, { message: 'validation.inn' })
    .optional(),
  address: optionalText(300).optional(),
  /** Nasiya limiti, so'm. Faqat OWNER o'zgartiradi */
  creditLimit: moneySchema.optional(),
});
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const customerUpdateSchema = customerCreateSchema
  .extend({ isActive: z.boolean() })
  .partial();
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const orderLineInputSchema = z.object({
  productId: uuid,
  quantity: quantitySchema,
  /** Chegirmadan keyingi birlik narxi; berilmasa — tovarning sotuv narxi */
  price: moneySchema.optional(),
});
export type OrderLineInput = z.infer<typeof orderLineInputSchema>;

export const orderDraftSchema = z.object({
  customerId: uuid,
  note: optionalText(500).optional(),
  lines: z
    .array(orderLineInputSchema)
    .max(500)
    .refine((ls) => new Set(ls.map((l) => l.productId)).size === ls.length, {
      message: 'validation.duplicateProduct',
    }),
});
export type OrderDraftInput = z.infer<typeof orderDraftSchema>;
export const orderDraftUpdateSchema = orderDraftSchema.partial();
export type OrderDraftUpdateInput = z.infer<typeof orderDraftUpdateSchema>;

export const pickLineSchema = z.object({ picked: z.boolean() });
export type PickLineInput = z.infer<typeof pickLineSchema>;

/** Yakunlash: to'liq to'lanmagan bo'lsa — nasiya muddati (YYYY-MM-DD) */
export const completeOrderSchema = z.object({
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.date' })
    .optional(),
});
export type CompleteOrderInput = z.infer<typeof completeOrderSchema>;

export const paymentCreateSchema = z.object({
  orderId: uuid,
  method: z.enum(PAYMENT_METHODS),
  amount: moneySchema.refine((v) => v > 0, { message: 'validation.positive' }),
  /** Berilmasa: buyurtma avans kutayotgan bo'lsa — avans */
  isAdvance: z.boolean().optional(),
  note: optionalText(300).optional(),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;

// ---------- 4-bosqich: hujjat va xabar ----------

const templateHtmlSchema = z
  .string()
  .min(1, { message: 'validation.required' })
  .max(200_000, { message: 'validation.tooLarge' });

export const templateCreateSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  locale: z.enum(DOC_LOCALES),
  name: nameSchema,
  html: templateHtmlSchema,
  isDefault: z.boolean().optional(),
});
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;

export const templateUpdateSchema = z
  .object({ name: nameSchema, html: templateHtmlSchema, isDefault: z.boolean() })
  .partial();
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

/** Shablonni oldindan ko'rish: buyurtma berilmasa — namunaviy ma'lumot */
export const templatePreviewSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  locale: z.enum(DOC_LOCALES),
  html: templateHtmlSchema,
  orderId: uuid.optional(),
});
export type TemplatePreviewInput = z.infer<typeof templatePreviewSchema>;

/** Hujjatni (qayta) yaratish — eskisi BEKOR bo'ladi */
export const documentCreateSchema = z.object({ type: z.enum(DOCUMENT_TYPES) });
export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
