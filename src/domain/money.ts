import { AppError } from './errors';
import { baseTo, type QuantityUnit } from './units';

// Money is stored as integer minor units + ISO 4217 code (AGENTS.md rule 4): no floats in storage,
// arithmetic only here, display via Intl.NumberFormat.

const CURRENCY_CODE = /^[A-Z]{3}$/;
const digitsCache = new Map<string, number>();

/** Minor-unit digits for a currency from Intl: INR 2, USD 2, JPY 0, KWD 3. */
export function currencyDigits(currency: string): number {
  const cached = digitsCache.get(currency);
  if (cached !== undefined) return cached;
  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    // Unknown to this device's Intl data: 2 is right for the vast majority of currencies.
  }
  digitsCache.set(currency, digits);
  return digits;
}

// Shift by decimal exponent instead of multiplying, so 1.005 → 100.5 (not 100.49999…) → 101.
function shift(value: number, digits: number): number {
  return Number(`${value}e${digits}`);
}

export class Money {
  private constructor(
    readonly amountMinor: number,
    readonly currency: string,
  ) {}

  static ofMinor(amountMinor: number, currency: string): Money {
    if (!Number.isSafeInteger(amountMinor)) {
      throw new AppError('INVALID_AMOUNT', 'Money amount must be a whole number of minor units', {
        amountMinor,
      });
    }
    if (!CURRENCY_CODE.test(currency)) {
      throw new AppError('INVALID_CURRENCY', 'Currency must be an ISO 4217 code', { currency });
    }
    return new Money(amountMinor, currency);
  }

  /** From what the user typed in major units (₹200.50), rounded half away from zero. */
  static fromMajor(amount: number, currency: string): Money {
    if (!Number.isFinite(amount)) {
      throw new AppError('INVALID_AMOUNT', 'Money amount must be a finite number', { amount });
    }
    const shifted = shift(Math.abs(amount), currencyDigits(currency));
    return Money.ofMinor(Math.sign(amount) * Math.round(shifted), currency);
  }

  static zero(currency: string): Money {
    return Money.ofMinor(0, currency);
  }

  /** Amount in major units (₹200.50 → 200.5), for display and derived values only. */
  get major(): number {
    return shift(this.amountMinor, -currencyDigits(this.currency));
  }

  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofMinor(this.amountMinor + other.amountMinor, this.currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofMinor(this.amountMinor - other.amountMinor, this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  format(locale: string): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: this.currency }).format(
      this.major,
    );
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      // Old entries keep their entry-time currency (KB §3), so mixing must be explicit.
      throw new AppError('CURRENCY_MISMATCH', 'Cannot combine different currencies', {
        left: this.currency,
        right: other.currency,
      });
    }
  }
}

/** Totals per currency in first-seen order; mixed-currency totals are shown per currency (KB §3). */
export function sumByCurrency(amounts: readonly Money[]): Money[] {
  const totals = new Map<string, Money>();
  for (const m of amounts) {
    const current = totals.get(m.currency);
    totals.set(m.currency, current ? current.plus(m) : m);
  }
  return [...totals.values()];
}

/**
 * Price per display unit (₹ per L, $ per US gal) in major units, derived for display only;
 * stored fill-ups keep total + quantity (KB §3). Null when there is no quantity.
 */
export function unitPrice(total: Money, quantityBase: number, unit: QuantityUnit): number | null {
  if (quantityBase <= 0) return null;
  return total.major / baseTo(quantityBase, unit);
}
