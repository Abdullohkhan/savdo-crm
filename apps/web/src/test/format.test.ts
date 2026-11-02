import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { formatMoney, formatQty } from '@/lib/format';

describe('format', () => {
  afterEach(() => void i18n.changeLanguage('uz'));
  it("uz: bo'sh joy bilan guruhlash", () => {
    expect(formatMoney(1234567)).toBe("1 234 567 so'm");
    expect(formatQty(12.5)).toBe('12,5');
    expect(formatQty(-3)).toBe('−3');
  });
  it('en: vergul bilan', async () => {
    await i18n.changeLanguage('en');
    expect(formatMoney(1234567)).toBe('1,234,567 UZS');
    expect(formatQty(0.125)).toBe('0.125');
  });
});
