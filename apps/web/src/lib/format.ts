import i18n from '@/i18n';

const LOCALE_TAG: Record<string, string> = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU' };

function tag(): string {
  return LOCALE_TAG[i18n.language] ?? 'uz-UZ';
}

/**
 * Raqam formati brauzer lokal ma'lumotiga bog'liq bo'lmasin (ba'zi brauzerlarda uz-UZ yo'q):
 * uz/ru — "1 234 567,5", en — "1,234,567.5".
 */
export function formatNumber(n: number, maxFraction = 0): string {
  const en = i18n.language === 'en';
  const group = en ? ',' : '\u00a0';
  const decimal = en ? '.' : ',';
  const fixed = Math.abs(n).toFixed(maxFraction);
  const [int = '0', frac = ''] = fixed.split('.');
  const trimmed = frac.replace(/0+$/, '');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return `${n < 0 ? '−' : ''}${grouped}${trimmed ? decimal + trimmed : ''}`;
}

/** Butun so'm: 1 234 567 so'm */
export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${formatNumber(n)} ${i18n.t('common.currency')}`;
}

export function formatQty(n: number): string {
  return formatNumber(n, 3);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(tag(), { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** Ixtiyoriy son maydoni: bo'sh → undefined */
export const optionalNumber = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);
/** Bo'sh → null */
export const nullableNumber = (v: unknown) =>
  v === '' || v === null || v === undefined ? null : Number(v);
