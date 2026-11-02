import { describe, expect, it } from 'vitest';
import { Decimal } from '../src/common/db.js';
import { lineValue, weightedAverageIn, weightedAverageOut } from '../src/stock/costing.js';

describe('costing', () => {
  it('spec misoli: 10 × 100 000 + 10 × 120 000 → 110 000', () => {
    expect(weightedAverageIn(new Decimal(10), 100_000, new Decimal(10), 1_200_000n)).toBe(110_000);
  });
  it("qoldiq 0 bo'lsa — yangi kirim narxi", () => {
    expect(weightedAverageIn(new Decimal(0), 0, new Decimal(4), 1_000n)).toBe(250);
  });
  it('bekor qilish teskari hisoblaydi', () => {
    expect(weightedAverageOut(new Decimal(20), 110_000, new Decimal(10), 1_200_000n)).toBe(100_000);
  });
  it('kasr miqdor aniq', () => {
    expect(lineValue(new Decimal('2.5'), 10_001)).toBe(25_003n);
    expect(lineValue(new Decimal('1.005'), 200)).toBe(201n);
  });
});
