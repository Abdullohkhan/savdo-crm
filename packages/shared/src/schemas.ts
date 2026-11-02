import { z } from 'zod';
import { isValidQuantity } from './costing.js';
import { LOCALES, ROLES, UNITS } from './enums.js';

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
