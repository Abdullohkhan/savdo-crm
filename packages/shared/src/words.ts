import type { DocLocale } from './enums.js';

/**
 * Summa so'z bilan (hujjatlar uchun): 1250000 → "Bir million ikki yuz ellik ming so‘m".
 * Faqat butun so'm, manfiy emas. O'zbekcha apostrof — ‘ (U+2018, PDF shriftida bor).
 */

const UZ_UNITS = ['', 'bir', 'ikki', 'uch', 'to‘rt', 'besh', 'olti', 'yetti', 'sakkiz', 'to‘qqiz'];
const UZ_TENS = [
  '',
  'o‘n',
  'yigirma',
  'o‘ttiz',
  'qirq',
  'ellik',
  'oltmish',
  'yetmish',
  'sakson',
  'to‘qson',
];
const UZ_SCALES = ['', 'ming', 'million', 'milliard', 'trillion'];

const RU_UNITS_M = [
  '',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
];
const RU_UNITS_F = ['', 'одна', 'две', ...RU_UNITS_M.slice(3)];
const RU_TEENS = [
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
];
const RU_TENS = [
  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
];
const RU_HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
];
/** [bitta, 2–4, 5+], ayol jinsi */
const RU_SCALES: { forms: [string, string, string]; female: boolean }[] = [
  { forms: ['', '', ''], female: false },
  { forms: ['тысяча', 'тысячи', 'тысяч'], female: true },
  { forms: ['миллион', 'миллиона', 'миллионов'], female: false },
  { forms: ['миллиард', 'миллиарда', 'миллиардов'], female: false },
  { forms: ['триллион', 'триллиона', 'триллионов'], female: false },
];
const RU_SUM: [string, string, string] = ['сум', 'сума', 'сумов'];

/** Rus tilida son shakli: 1 → 0, 2–4 → 1, qolgani → 2 */
export function ruPlural(n: number): 0 | 1 | 2 {
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return 2;
  const m10 = n % 10;
  if (m10 === 1) return 0;
  if (m10 >= 2 && m10 <= 4) return 1;
  return 2;
}

/** Sonni 3 xonali guruhlarga ajratadi (kichigidan boshlab) */
function groups(n: bigint): number[] {
  const out: number[] = [];
  let v = n;
  while (v > 0n) {
    out.push(Number(v % 1000n));
    v /= 1000n;
  }
  return out;
}

function uzTriad(n: number): string[] {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const w: string[] = [];
  if (h) w.push(UZ_UNITS[h]!, 'yuz');
  if (t) w.push(UZ_TENS[t]!);
  if (u) w.push(UZ_UNITS[u]!);
  return w;
}

function ruTriad(n: number, female: boolean): string[] {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const w: string[] = [];
  if (h) w.push(RU_HUNDREDS[h]!);
  if (t === 1) {
    w.push(RU_TEENS[u]!);
  } else {
    if (t) w.push(RU_TENS[t]!);
    if (u) w.push((female ? RU_UNITS_F : RU_UNITS_M)[u]!);
  }
  return w;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Faqat son (valyutasiz), kichik harf bilan */
export function numberToWords(value: number | bigint, locale: DocLocale): string {
  const n = typeof value === 'bigint' ? value : BigInt(value);
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError('numberToWords: butun manfiy bo‘lmagan son kerak');
  }
  if (n < 0n) throw new RangeError('numberToWords: manfiy son');
  if (n === 0n) return locale === 'ru' ? 'ноль' : 'nol';
  const g = groups(n);
  if (g.length > UZ_SCALES.length) throw new RangeError('numberToWords: juda katta son');
  const words: string[] = [];
  for (let i = g.length - 1; i >= 0; i--) {
    const v = g[i]!;
    if (v === 0) continue;
    if (locale === 'ru') {
      const scale = RU_SCALES[i]!;
      words.push(...ruTriad(v, scale.female));
      if (i > 0) words.push(scale.forms[ruPlural(v)]);
    } else {
      words.push(...uzTriad(v));
      if (i > 0) words.push(UZ_SCALES[i]!);
    }
  }
  return words.join(' ');
}

/** Summa so'z bilan, valyuta bilan, bosh harf bilan */
export function amountInWords(value: number | bigint, locale: DocLocale): string {
  const text = numberToWords(value, locale);
  if (locale === 'ru') {
    const n = typeof value === 'bigint' ? value : BigInt(value);
    const last = Number(n % 100n);
    return capitalize(`${text} ${RU_SUM[ruPlural(last)]}`);
  }
  return capitalize(`${text} so‘m`);
}
