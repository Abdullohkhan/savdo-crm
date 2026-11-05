import { describe, expect, it } from 'vitest';
import { amountInWords, numberToWords, ruPlural } from './words.js';

describe('summa so`z bilan — o`zbekcha', () => {
  it.each([
    [0, 'Nol so‘m'],
    [1, 'Bir so‘m'],
    [10, 'O‘n so‘m'],
    [11, 'O‘n bir so‘m'],
    [19, 'O‘n to‘qqiz so‘m'],
    [40, 'Qirq so‘m'],
    [99, 'To‘qson to‘qqiz so‘m'],
    [100, 'Bir yuz so‘m'],
    [101, 'Bir yuz bir so‘m'],
    [999, 'To‘qqiz yuz to‘qson to‘qqiz so‘m'],
    [1000, 'Bir ming so‘m'],
    [1001, 'Bir ming bir so‘m'],
    [10_000, 'O‘n ming so‘m'],
    [1_000_000, 'Bir million so‘m'],
    [1_000_001, 'Bir million bir so‘m'],
    [1_250_000, 'Bir million ikki yuz ellik ming so‘m'],
    [2_000_000_000, 'Ikki milliard so‘m'],
    [1_000_000_000_000, 'Bir trillion so‘m'],
  ])('%d', (n, text) => {
    expect(amountInWords(n, 'uz')).toBe(text);
  });
});

describe('summa so`z bilan — ruscha', () => {
  it.each([
    [0, 'Ноль сумов'],
    [1, 'Один сум'],
    [2, 'Два сума'],
    [5, 'Пять сумов'],
    [11, 'Одиннадцать сумов'],
    [12, 'Двенадцать сумов'],
    [14, 'Четырнадцать сумов'],
    [21, 'Двадцать один сум'],
    [22, 'Двадцать два сума'],
    [100, 'Сто сумов'],
    [111, 'Сто одиннадцать сумов'],
    [1000, 'Одна тысяча сумов'],
    [2000, 'Две тысячи сумов'],
    [5000, 'Пять тысяч сумов'],
    [11_000, 'Одиннадцать тысяч сумов'],
    [21_000, 'Двадцать одна тысяча сумов'],
    [1_000_000, 'Один миллион сумов'],
    [2_500_001, 'Два миллиона пятьсот тысяч один сум'],
    [5_000_000_000, 'Пять миллиардов сумов'],
    [1_000_000_002, 'Один миллиард два сума'],
  ])('%d', (n, text) => {
    expect(amountInWords(n, 'ru')).toBe(text);
  });

  it('ruPlural', () => {
    expect([1, 2, 4, 5, 11, 14, 21, 101, 111].map(ruPlural)).toEqual([0, 1, 1, 2, 2, 2, 0, 0, 2]);
  });
});

describe('chegaralar', () => {
  it('bigint va xatolar', () => {
    expect(numberToWords(12n, 'uz')).toBe('o‘n ikki');
    expect(() => amountInWords(-1, 'uz')).toThrow(RangeError);
    expect(() => amountInWords(1.5, 'ru')).toThrow(RangeError);
    expect(() => amountInWords(10n ** 15n, 'uz')).toThrow(RangeError);
  });
});
