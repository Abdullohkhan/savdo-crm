import { Prisma } from '../generated/prisma/client.js';
import type { AuthUser } from './auth-user.js';

export type Tx = Prisma.TransactionClient;

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

/** Miqdor (Decimal(14,3)) → number (API javobi uchun) */
export function qty(d: Prisma.Decimal | null | undefined): number {
  return d ? d.toNumber() : 0;
}

export function dec(n: number): Prisma.Decimal {
  // String orqali — float xatoligini Decimal'ga olib o'tmaslik uchun 3 xonagacha yaxlitlaymiz
  return new Prisma.Decimal(n.toFixed(3));
}

/** BigInt (so'm) → number; xavfsiz chegaradan oshsa xato */
export function money(b: bigint | null | undefined): number | null {
  if (b === null || b === undefined) return null;
  if (b > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Summa juda katta');
  return Number(b);
}

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/** Korxona qatorini qulflash — raqamlash va bir martalik yaratishlar uchun */
export async function lockOrganization(tx: Tx, organizationId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
}

/** Tovar qatorlarini qulflash — qoldiq va tannarxni parallel o'zgartirishdan himoya */
export async function lockProducts(tx: Tx, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  const sorted = [...productIds].sort(); // deadlock bo'lmasligi uchun bir xil tartib
  await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join(sorted)}) ORDER BY id FOR UPDATE`;
}

export async function audit(
  tx: Tx,
  actor: AuthUser,
  entity: string,
  entityId: string,
  action: string,
  data: Prisma.InputJsonValue,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      organizationId: actor.organizationId,
      userId: actor.id,
      entity,
      entityId,
      action,
      data,
    },
  });
}

/** Qatorni qulflash (SELECT ... FOR UPDATE) — jadval nomi faqat kod ichidan beriladi */
export async function lockRow(
  tx: Tx,
  table: 'SalesOrder' | 'Customer' | 'Payment' | 'Purchase',
  id: string,
): Promise<void> {
  await tx.$queryRawUnsafe(`SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`, id);
}

/** Bugungi sana Toshkent vaqti bo'yicha (YYYY-MM-DD) */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(now);
}

export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
