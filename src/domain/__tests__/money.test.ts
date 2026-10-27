import { AppError } from '../errors';
import { currencyDigits, Money, sumByCurrency, unitPrice } from '../money';

// Some locales use non-breaking spaces in currency output; compare on plain spaces.
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('currencyDigits', () => {
  it.each([
    ['INR', 2],
    ['USD', 2],
    ['GBP', 2],
    ['JPY', 0],
    ['KWD', 3],
  ])('%s has %i minor digits', (currency, digits) => {
    expect(currencyDigits(currency)).toBe(digits);
  });
});

describe('Money', () => {
  it('converts typed major amounts to whole minor units', () => {
    expect(Money.fromMajor(200, 'INR').amountMinor).toBe(20_000);
    expect(Money.fromMajor(200.5, 'INR').amountMinor).toBe(20_050);
    expect(Money.fromMajor(1.005, 'INR').amountMinor).toBe(101); // float trap: 1.005*100 = 100.4999…
    expect(Money.fromMajor(199.999, 'INR').amountMinor).toBe(20_000);
    expect(Money.fromMajor(1234.5, 'JPY').amountMinor).toBe(1235);
    expect(Money.fromMajor(1.2345, 'KWD').amountMinor).toBe(1235);
  });

  it('gives major units back', () => {
    expect(Money.ofMinor(20_050, 'INR').major).toBe(200.5);
    expect(Money.ofMinor(1235, 'JPY').major).toBe(1235);
  });

  it('adds and subtracts in the same currency', () => {
    const a = Money.fromMajor(200, 'INR');
    const b = Money.fromMajor(150.75, 'INR');
    expect(a.plus(b).amountMinor).toBe(35_075);
    expect(a.minus(b).amountMinor).toBe(4925);
    expect(a.plus(b).equals(Money.ofMinor(35_075, 'INR'))).toBe(true);
  });

  it('refuses to mix currencies', () => {
    const add = () => Money.fromMajor(1, 'INR').plus(Money.fromMajor(1, 'USD'));
    expect(add).toThrow(AppError);
    expect(add).toThrow(expect.objectContaining({ code: 'CURRENCY_MISMATCH' }));
  });

  it('rejects fractional minor units and bad currency codes', () => {
    expect(() => Money.ofMinor(10.5, 'INR')).toThrow(
      expect.objectContaining({ code: 'INVALID_AMOUNT' }),
    );
    expect(() => Money.fromMajor(Number.NaN, 'INR')).toThrow(
      expect.objectContaining({ code: 'INVALID_AMOUNT' }),
    );
    expect(() => Money.ofMinor(100, 'inr')).toThrow(
      expect.objectContaining({ code: 'INVALID_CURRENCY' }),
    );
  });

  it.each([
    [10_000_000, 'INR', 'en-IN', '₹1,00,000.00'],
    [10_000_000, 'INR', 'hi-IN', '₹1,00,000.00'],
    [123_450, 'USD', 'en-US', '$1,234.50'],
    [123_450, 'GBP', 'en-GB', '£1,234.50'],
    [1235, 'JPY', 'en-US', '¥1,235'],
    [123_450, 'EUR', 'de-DE', '1.234,50 €'],
  ])('formats %i %s in %s as %s', (minor, currency, locale, expected) => {
    expect(plain(Money.ofMinor(minor, currency).format(locale))).toBe(expected);
  });
});

describe('sumByCurrency', () => {
  it('totals per currency in first-seen order', () => {
    const totals = sumByCurrency([
      Money.fromMajor(200, 'INR'),
      Money.fromMajor(40, 'USD'),
      Money.fromMajor(300, 'INR'),
    ]);
    expect(totals.map((m) => [m.currency, m.amountMinor])).toEqual([
      ['INR', 50_000],
      ['USD', 4000],
    ]);
  });

  it('returns nothing for no entries', () => {
    expect(sumByCurrency([])).toEqual([]);
  });
});

describe('unitPrice', () => {
  it('derives price per litre and per US gallon', () => {
    expect(unitPrice(Money.fromMajor(200, 'INR'), 1950, 'L')).toBeCloseTo(102.564, 3);
    expect(unitPrice(Money.fromMajor(43.25, 'USD'), 47_318, 'gal_us')).toBeCloseTo(3.46, 2);
  });

  it('is null without a quantity', () => {
    expect(unitPrice(Money.fromMajor(200, 'INR'), 0, 'L')).toBeNull();
  });
});
