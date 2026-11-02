import { describe, expect, it } from 'vitest';
import { createUserSchema, loginSchema, updateMeSchema } from './index.js';

describe('shared schemas', () => {
  it('login: telefon formatini tekshiradi', () => {
    expect(loginSchema.safeParse({ phone: '+998901234567', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ phone: 'abc', password: 'x' }).success).toBe(false);
  });

  it('createUser: noma`lum rolni rad etadi', () => {
    const r = createUserSchema.safeParse({
      name: 'A',
      phone: '+998901234567',
      password: '123456',
      role: 'ADMIN',
    });
    expect(r.success).toBe(false);
  });

  it('updateMe: yangi parol uchun joriy parol kerak', () => {
    expect(updateMeSchema.safeParse({ newPassword: '123456' }).success).toBe(false);
    expect(
      updateMeSchema.safeParse({ newPassword: '123456', currentPassword: 'old' }).success,
    ).toBe(true);
  });
});
