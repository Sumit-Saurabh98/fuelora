import {
  checkOdometerOrder,
  localDateOf,
  resolveAmounts,
  validateFillUp,
  type NewFillUpInput,
} from '../fill-up';
import { Money } from '../money';

const NOW = new Date('2026-10-28T10:00:00.000Z');

describe('resolveAmounts (any two of three, FR-9)', () => {
  it('quantity + price → total, rounded to minor units', () => {
    // 5.3 L × ₹104.50 = ₹553.85
    expect(
      resolveAmounts({
        mode: 'qty_price',
        quantityBase: 5300,
        unitPrice: 104.5,
        unit: 'L',
        currency: 'INR',
      }),
    ).toEqual({ quantityBase: 5300, total: Money.ofMinor(55_385, 'INR') });
  });

  it('quantity + price in US gallons', () => {
    // 10 US gal (37,854 mL) × $3.459 = $34.59
    const result = resolveAmounts({
      mode: 'qty_price',
      quantityBase: 37_854,
      unitPrice: 3.459,
      unit: 'gal_us',
      currency: 'USD',
    });
    expect(result?.total.amountMinor).toBe(3459);
  });

  it('quantity + total keeps both as typed', () => {
    const total = Money.fromMajor(500, 'INR');
    expect(resolveAmounts({ mode: 'qty_total', quantityBase: 4780, total })).toEqual({
      quantityBase: 4780,
      total,
    });
  });

  it('price + total → quantity, rounded to base units', () => {
    const total = Money.fromMajor(200, 'INR');
    expect(resolveAmounts({ mode: 'price_total', unitPrice: 104.5, unit: 'L', total })).toEqual({
      quantityBase: 1914,
      total,
    });
  });

  it('amount-only uses the remembered price the same way (LLD §4.4 #8)', () => {
    const total = Money.fromMajor(200, 'INR');
    expect(
      resolveAmounts({ mode: 'amount_only', unitPrice: 104.5, unit: 'L', total })?.quantityBase,
    ).toBe(1914);
  });

  it('kWh for EV charges', () => {
    const total = Money.fromMajor(360, 'INR');
    expect(
      resolveAmounts({ mode: 'price_total', unitPrice: 18, unit: 'kWh', total })?.quantityBase,
    ).toBe(20_000);
  });

  it('no result without a usable price', () => {
    const total = Money.fromMajor(200, 'INR');
    expect(resolveAmounts({ mode: 'price_total', unitPrice: 0, unit: 'L', total })).toBeNull();
    expect(
      resolveAmounts({
        mode: 'qty_price',
        quantityBase: 5000,
        unitPrice: Number.NaN,
        unit: 'L',
        currency: 'INR',
      }),
    ).toBeNull();
  });
});

const input = (change: Partial<NewFillUpInput> = {}): NewFillUpInput => ({
  vehicleId: 'v1',
  filledAt: new Date('2026-10-28T09:00:00.000Z'),
  odometerM: 12_500_000,
  quantityBase: 5000,
  totalMinor: 52_250,
  currency: 'INR',
  isFull: true,
  missedPrevious: false,
  entryMode: 'qty_total',
  ...change,
});

describe('validateFillUp', () => {
  it('accepts a normal fill-up and normalizes optional text', () => {
    const result = validateFillUp(input({ station: '  HP Indiranagar ', note: '  ' }), NOW);
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ station: 'HP Indiranagar', note: null }),
    });
  });

  it('reports every bad field at once', () => {
    const result = validateFillUp(
      input({
        odometerM: -1,
        quantityBase: 0,
        totalMinor: 1.5,
        station: 'x'.repeat(61),
        note: 'x'.repeat(501),
      }),
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      issues: {
        odometerM: 'out_of_range',
        quantityBase: 'out_of_range',
        totalMinor: 'out_of_range',
        station: 'too_long',
        note: 'too_long',
      },
    });
  });

  it('allows a free charge (total 0)', () => {
    expect(validateFillUp(input({ totalMinor: 0 }), NOW).ok).toBe(true);
  });

  it('rejects a date in the future, tolerating a few minutes of clock skew', () => {
    const soon = new Date(NOW.getTime() + 4 * 60 * 1000);
    const later = new Date(NOW.getTime() + 60 * 60 * 1000);
    expect(validateFillUp(input({ filledAt: soon }), NOW).ok).toBe(true);
    expect(validateFillUp(input({ filledAt: later }), NOW)).toEqual({
      ok: false,
      issues: { filledAt: 'in_future' },
    });
    expect(validateFillUp(input({ filledAt: new Date(Number.NaN) }), NOW)).toEqual({
      ok: false,
      issues: { filledAt: 'required' },
    });
  });

  it('rejects an absurd quantity', () => {
    expect(validateFillUp(input({ quantityBase: 1_000_001 }), NOW).ok).toBe(false);
  });
});

describe('checkOdometerOrder (FR-7)', () => {
  const others = [
    { filledAt: '2026-10-01T09:00:00.000Z', odometerM: 12_000_000 },
    { filledAt: '2026-10-10T09:00:00.000Z', odometerM: 12_300_000 },
    { filledAt: '2026-10-20T09:00:00.000Z', odometerM: 12_650_000 },
  ];
  const at = (iso: string, odometerM: number) => ({ filledAt: new Date(iso), odometerM });

  it('accepts a reading after the latest entry', () => {
    expect(checkOdometerOrder(at('2026-10-28T09:00:00.000Z', 13_000_000), others, 0)).toBeNull();
  });

  it('accepts a back-dated entry that fits between its neighbours', () => {
    expect(checkOdometerOrder(at('2026-10-15T09:00:00.000Z', 12_500_000), others, 0)).toBeNull();
  });

  it('blocks a reading not above the previous entry by date', () => {
    expect(checkOdometerOrder(at('2026-10-28T09:00:00.000Z', 12_600_000), others, 0)).toEqual({
      code: 'ODOMETER_NOT_INCREASING',
      limitM: 12_650_000,
    });
  });

  it('blocks a back-dated reading not below the next entry', () => {
    expect(checkOdometerOrder(at('2026-10-15T09:00:00.000Z', 12_700_000), others, 0)).toEqual({
      code: 'ODOMETER_AFTER_NEXT',
      limitM: 12_650_000,
    });
  });

  it('blocks a duplicate odometer on the same vehicle', () => {
    expect(checkOdometerOrder(at('2026-10-28T09:00:00.000Z', 12_300_000), others, 0)).toEqual({
      code: 'DUPLICATE_ODOMETER',
    });
  });

  it('blocks a reading below the vehicle starting odometer; equal is fine', () => {
    expect(checkOdometerOrder(at('2026-10-28T09:00:00.000Z', 9_000_000), [], 10_000_000)).toEqual({
      code: 'ODOMETER_BELOW_START',
      limitM: 10_000_000,
    });
    expect(
      checkOdometerOrder(at('2026-10-28T09:00:00.000Z', 10_000_000), [], 10_000_000),
    ).toBeNull();
  });

  it('the first fill-up only needs to clear the start', () => {
    expect(checkOdometerOrder(at('2026-10-28T09:00:00.000Z', 5_000), [], 0)).toBeNull();
  });
});

describe('localDateOf', () => {
  it('uses the phone time zone, not UTC', () => {
    const instant = new Date(2026, 9, 31, 23, 30); // 31 Oct 23:30 local
    expect(localDateOf(instant)).toBe('2026-10-31');
  });
});
