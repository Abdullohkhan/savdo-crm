import { z } from 'zod';
import { LOCALES, ROLES } from './enums.js';

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
