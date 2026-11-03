/**
 * Pul — butun so'm. Bu funksiyalar faqat butun sonlar bilan ishlaydi
 * (Number.MAX_SAFE_INTEGER ≈ 9·10¹⁵ so'm — yetarli).
 */

function assertSafeInt(n: number, name: string): void {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(`${name} manfiy bo'lmagan butun son bo'lishi kerak`);
}

/**
 * Qo'shimcha xarajatni qatorlarga qiymatiga mutanosib taqsimlaydi.
 * Yaxlitlash qoldig'i eng katta kasr qismga ega qatorlardan boshlab 1 so'mdan beriladi
 * (largest remainder), shuning uchun yig'indi har doim `total` ga teng.
 * Hamma qator qiymati 0 bo'lsa — teng taqsimlanadi.
 */
export function allocateExpenses(total: number, values: readonly number[]): number[] {
  assertSafeInt(total, 'total');
  values.forEach((v) => assertSafeInt(v, 'value'));
  if (values.length === 0) return [];
  const weights = values.some((v) => v > 0) ? values : values.map(() => 1);
  const sum = weights.reduce((a, b) => a + b, 0);

  const big = BigInt(total);
  const bigSum = BigInt(sum);
  const parts = weights.map((w) => (big * BigInt(w)) / bigSum);
  const rema = weights.map((w, i) => ({ i, r: (big * BigInt(w)) % bigSum }));
  let left = Number(big - parts.reduce((a, b) => a + b, 0n));
  rema.sort((a, b) => (a.r === b.r ? weights[b.i]! - weights[a.i]! : a.r > b.r ? -1 : 1));
  for (const { i } of rema) {
    if (left <= 0) break;
    parts[i]! += 1n;
    left -= 1;
  }
  return parts.map(Number);
}

/** Sotuv narxi = tannarx × (1 + ustama%), butun so'mga yaxlitlanadi */
export function salePriceFrom(cost: number, markupPercent: number): number {
  assertSafeInt(cost, 'cost');
  return Math.round((cost * (100 + markupPercent)) / 100);
}

/** Miqdor: musbat, ko'pi bilan 3 kasr xona (kg/m uchun) */
export function isValidQuantity(q: number): boolean {
  return Number.isFinite(q) && Math.abs(Math.round(q * 1000) - q * 1000) < 1e-6;
}

/**
 * Kirim tannarxini oldindan hisoblash (UI va API bir xil formuladan foydalanadi).
 * Qator qiymati = round(miqdor × narx); unda xarajat qo'shiladi; birlik tannarxi = to'liq / miqdor.
 */
export interface CostLineInput {
  quantity: number;
  price: number;
}
export interface CostLineResult {
  value: number;
  allocatedExpense: number;
  landedTotal: number;
  unitCost: number;
}

export function computeLandedCosts(
  lines: readonly CostLineInput[],
  expensesTotal: number,
): CostLineResult[] {
  const values = lines.map((l) => Math.round(l.quantity * l.price));
  const alloc = allocateExpenses(expensesTotal, values);
  return lines.map((l, i) => {
    const landedTotal = values[i]! + alloc[i]!;
    return {
      value: values[i]!,
      allocatedExpense: alloc[i]!,
      landedTotal,
      unitCost: l.quantity > 0 ? Math.round(landedTotal / l.quantity) : 0,
    };
  });
}

/** Buyurtma qatori summasi: round(miqdor × narx) */
export function orderLineTotal(quantity: number, price: number): number {
  return Math.round(quantity * price);
}

/** Talab qilinadigan avans: jami × avans%, yuqoriga yaxlitlanadi */
export function advanceRequired(total: number, advancePercent: number): number {
  assertSafeInt(total, 'total');
  if (advancePercent <= 0) return 0;
  return Math.ceil((total * advancePercent) / 100);
}

/** Chegirma foizi (ko'rsatish uchun), butun songa yaxlitlanadi */
export function discountPercent(listPrice: number, price: number): number {
  if (listPrice <= 0 || price >= listPrice) return 0;
  return Math.round(((listPrice - price) / listPrice) * 100);
}
