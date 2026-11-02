import { describe, expect, it } from 'vitest';
import { allocateExpenses, computeLandedCosts, salePriceFrom } from './costing.js';
import { purchaseDraftSchema, quantitySchema } from './schemas.js';

describe('allocateExpenses', () => {
  it('qiymatiga mutanosib taqsimlaydi', () => {
    expect(allocateExpenses(1000, [100, 300])).toEqual([250, 750]);
  });
  it("yaxlitlash qoldig'i yo'qolmaydi", () => {
    const r = allocateExpenses(100, [1, 1, 1]);
    expect(r.reduce((a, b) => a + b, 0)).toBe(100);
    expect(r.sort()).toEqual([33, 33, 34]);
  });
  it("qiymatlar 0 bo'lsa teng taqsimlaydi", () => {
    expect(allocateExpenses(10, [0, 0])).toEqual([5, 5]);
  });
  it('katta summalar (BigInt ichida) aniq', () => {
    const r = allocateExpenses(9_000_000_000_000, [3_000_000_000_000, 6_000_000_000_000]);
    expect(r).toEqual([3_000_000_000_000, 6_000_000_000_000]);
  });
});

describe('salePriceFrom', () => {
  it('10% ustama', () => {
    expect(salePriceFrom(110_000, 10)).toBe(121_000);
    expect(salePriceFrom(333, 10)).toBe(366);
  });
});

describe('computeLandedCosts', () => {
  it("xarajat tannarxga qo'shiladi", () => {
    const r = computeLandedCosts(
      [
        { quantity: 10, price: 100_000 },
        { quantity: 5, price: 200_000 },
      ],
      100_000,
    );
    expect(r.map((x) => x.allocatedExpense)).toEqual([50_000, 50_000]);
    expect(r.map((x) => x.unitCost)).toEqual([105_000, 210_000]);
  });
  it('kasr miqdor (kg)', () => {
    const [r] = computeLandedCosts([{ quantity: 2.5, price: 10_001 }], 0);
    expect(r!.value).toBe(25_003);
    expect(r!.unitCost).toBe(10_001);
  });
});

describe('schemas', () => {
  it('miqdor 3 kasr xonadan oshmaydi', () => {
    expect(quantitySchema.safeParse(1.234).success).toBe(true);
    expect(quantitySchema.safeParse(1.2345).success).toBe(false);
    expect(quantitySchema.safeParse(0).success).toBe(false);
  });
  it('kirimda bir tovar ikki marta kelmaydi', () => {
    const id = '7d9f4c1e-8b2a-4c3d-9e5f-1a2b3c4d5e6f';
    const r = purchaseDraftSchema.safeParse({
      lines: [
        { productId: id, quantity: 1 },
        { productId: id, quantity: 2 },
      ],
    });
    expect(r.success).toBe(false);
  });
});
