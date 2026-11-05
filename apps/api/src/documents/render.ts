import { advanceRequired, amountInWords, type DocLocale, type Unit } from '@savdo/shared';
import Handlebars from 'handlebars';

/**
 * Shablonni xavfsiz render qilish.
 * - Alohida Handlebars muhiti, faqat ichki helperlar (if/each/unless/with), partial yo'q.
 * - `{{ }}` qiymatlari HTML-escape qilinadi; `{{{ }}}` / `{{& }}` taqiqlangan.
 * - Skript, iframe, on*-atributlar, javascript: havolalar taqiqlangan.
 * Kontekstda tannarx/foyda YO'Q — hujjatga chiqishi mumkin emas.
 */

const hb = Handlebars.create();

const FORBIDDEN: { re: RegExp; reason: string }[] = [
  { re: /\{\{\{|\{\{~?\s*&/, reason: 'rawOutput' },
  { re: /\{\{~?\s*>/, reason: 'partial' },
  { re: /<\s*(script|iframe|object|embed|link|meta|base|form|input|svg|math)\b/i, reason: 'tag' },
  { re: /\son[a-z]+\s*=/i, reason: 'eventAttr' },
  { re: /=\s*["']?\s*(javascript|vbscript|data)\s*:/i, reason: 'url' },
];

export class TemplateError extends Error {
  constructor(
    readonly reason: string,
    readonly detail?: string,
  ) {
    super(`templates.${reason}`);
  }
}

/** Shablonni tekshiradi; xato bo'lsa TemplateError */
export function validateTemplate(html: string): void {
  for (const f of FORBIDDEN) {
    if (f.re.test(html)) throw new TemplateError('unsafe', f.reason);
  }
  try {
    hb.precompile(html, { strict: false, knownHelpersOnly: true });
  } catch (e) {
    throw new TemplateError('syntax', e instanceof Error ? e.message.split('\n')[0] : undefined);
  }
}

export interface DocContext {
  org: {
    name: string;
    inn: string;
    address: string;
    phone: string;
    director: string;
    bankName: string;
    bankAccount: string;
    bankMfo: string;
  };
  customer: { name: string; inn: string; address: string; phone: string };
  document: { number: string; date: string };
  order: { number: number; date: string };
  contract: { number: string; date: string };
  seller: { name: string };
  lines: {
    n: number;
    name: string;
    sku: string;
    unit: string;
    quantity: string;
    price: string;
    total: string;
  }[];
  total: string;
  totalWords: string;
  advancePercent: number;
  advance: string;
  advanceWords: string;
  paid: string;
  remaining: string;
}

export function renderTemplate(html: string, ctx: DocContext): string {
  validateTemplate(html);
  const tpl = hb.compile(html, { strict: false, knownHelpersOnly: true });
  return tpl(ctx, { allowProtoPropertiesByDefault: false, allowProtoMethodsByDefault: false });
}

// ---------- formatlash ----------

/** 1250000 → "1 250 000" */
export function fmtMoney(v: number | bigint): string {
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** 1.5 → "1,5" */
export function fmtQty(v: number): string {
  return String(v).replace('.', ',');
}

/** Date → "04.11.2026" (Toshkent vaqti) */
export function fmtDate(d: Date): string {
  const [y, m, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' })
    .format(d)
    .split('-');
  return `${day}.${m}.${y}`;
}

const UNIT_LABELS: Record<DocLocale, Record<Unit, string>> = {
  uz: { dona: 'dona', kg: 'kg', m: 'm', quti: 'quti' },
  ru: { dona: 'шт.', kg: 'кг', m: 'м', quti: 'кор.' },
};

export function unitLabel(u: Unit, locale: DocLocale): string {
  return UNIT_LABELS[locale][u];
}

export interface ContextSource {
  locale: DocLocale;
  org: DocContext['org'];
  customer: DocContext['customer'];
  document: { number: string; createdAt: Date };
  order: { number: number; createdAt: Date };
  contract: { number: string; createdAt: Date } | null;
  sellerName: string;
  lines: {
    name: string;
    sku: string;
    unit: Unit;
    quantity: number;
    price: number;
    total: bigint;
  }[];
  total: bigint;
  advancePercent: number;
  advance: number;
  paid: bigint;
}

export function buildContext(s: ContextSource): DocContext {
  const remaining = s.total - s.paid;
  return {
    org: s.org,
    customer: s.customer,
    document: { number: s.document.number, date: fmtDate(s.document.createdAt) },
    order: { number: s.order.number, date: fmtDate(s.order.createdAt) },
    contract: s.contract
      ? { number: s.contract.number, date: fmtDate(s.contract.createdAt) }
      : { number: '', date: '' },
    seller: { name: s.sellerName },
    lines: s.lines.map((l, i) => ({
      n: i + 1,
      name: l.name,
      sku: l.sku,
      unit: unitLabel(l.unit, s.locale),
      quantity: fmtQty(l.quantity),
      price: fmtMoney(l.price),
      total: fmtMoney(l.total),
    })),
    total: fmtMoney(s.total),
    totalWords: amountInWords(s.total, s.locale),
    advancePercent: s.advancePercent,
    advance: fmtMoney(s.advance),
    advanceWords: amountInWords(s.advance, s.locale),
    paid: fmtMoney(s.paid),
    remaining: fmtMoney(remaining < 0n ? 0n : remaining),
  };
}

/** Oldindan ko'rish uchun namunaviy ma'lumot */
export function sampleSource(locale: DocLocale, org: DocContext['org']): ContextSource {
  const now = new Date();
  const lines = [
    {
      name: locale === 'ru' ? 'Ноутбук' : 'Noutbuk',
      sku: 'NB-001',
      unit: 'dona' as Unit,
      quantity: 2,
      price: 8_500_000,
    },
    {
      name: locale === 'ru' ? 'Мышь' : 'Sichqoncha',
      sku: 'MS-010',
      unit: 'dona' as Unit,
      quantity: 3,
      price: 150_000,
    },
  ].map((l) => ({ ...l, total: BigInt(l.quantity * l.price) }));
  const total = lines.reduce((a, l) => a + l.total, 0n);
  return {
    locale,
    org,
    customer: {
      name: locale === 'ru' ? 'ООО «Пример»' : '“Namuna” MCHJ',
      inn: '123456789',
      address: locale === 'ru' ? 'г. Ташкент' : 'Toshkent sh.',
      phone: '+998901234567',
    },
    document: { number: 'SH-2026-0001', createdAt: now },
    order: { number: 1, createdAt: now },
    contract: { number: 'SH-2026-0001', createdAt: now },
    sellerName: locale === 'ru' ? 'Продавец' : 'Sotuvchi',
    lines,
    total,
    advancePercent: 30,
    advance: advanceRequired(Number(total), 30),
    paid: 0n,
  };
}
