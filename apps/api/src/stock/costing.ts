import { Prisma } from '../generated/prisma/client.js';

/**
 * O'rtacha tortilgan tannarx (butun so'm).
 * oldQty × oldAvg + kelganSumma  /  (oldQty + kelganMiqdor)
 * Masalan: 10 × 100 000 + 10 × 120 000 → 110 000.
 */
export function weightedAverageIn(
  oldQty: Prisma.Decimal,
  oldAvg: number,
  inQty: Prisma.Decimal,
  inTotal: bigint,
): number {
  const base = oldQty.lessThan(0) ? new Prisma.Decimal(0) : oldQty;
  const newQty = base.plus(inQty);
  if (newQty.lessThanOrEqualTo(0)) return oldAvg;
  const value = base.times(oldAvg).plus(inTotal.toString());
  return value.dividedBy(newQty).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/** Kirim bekor qilinganda: o'sha summa va miqdorni olib tashlab qayta hisoblash */
export function weightedAverageOut(
  oldQty: Prisma.Decimal,
  oldAvg: number,
  outQty: Prisma.Decimal,
  outTotal: bigint,
): number {
  const newQty = oldQty.minus(outQty);
  if (newQty.lessThanOrEqualTo(0)) return oldAvg;
  const value = oldQty.times(oldAvg).minus(outTotal.toString());
  if (value.lessThan(0)) return 0;
  return value.dividedBy(newQty).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/** round(miqdor × narx) — aniq Decimal bilan */
export function lineValue(quantity: Prisma.Decimal, price: number): bigint {
  return BigInt(quantity.times(price).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0));
}

export function unitCostOf(total: bigint, quantity: Prisma.Decimal): number {
  return new Prisma.Decimal(total.toString())
    .dividedBy(quantity)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
}
