import { regionDefaults } from '@/domain/regions';

import type { FillUp } from '@/domain/fill-up';

import {
  defaultLayout,
  keepUntouchedFillUp,
  toFillUpFormValues,
  derivedField,
  derivedText,
  rememberedPrice,
  toFillUpInput,
  withEdited,
  type FillUpFormContext,
  type FillUpFormValues,
} from '../fill-up-form-values';

const india: FillUpFormContext = {
  fuelType: 'petrol',
  units: regionDefaults('IN', 'INR'),
  separators: { decimal: '.', group: ',' },
  locale: 'en-IN',
};
const us: FillUpFormContext = {
  fuelType: 'petrol',
  units: regionDefaults('US', 'USD'),
  separators: { decimal: '.', group: ',' },
  locale: 'en-US',
};
const NOW = new Date('2026-10-28T10:00:00.000Z');
const save = (ctx: FillUpFormContext) => ({ ...ctx, vehicleId: 'v1', now: NOW });

const values = (change: Partial<FillUpFormValues> = {}): FillUpFormValues => ({
  layout: 'full',
  filledAt: new Date('2026-10-28T09:00:00.000Z'),
  odometer: '12,345',
  quantity: '',
  price: '',
  total: '',
  sources: [],
  isFull: true,
  missedPrevious: false,
  station: '',
  note: '',
  ...change,
});

describe('withEdited / derivedField', () => {
  it('keeps the two most recently typed fields; the third is derived', () => {
    let sources = withEdited([], 'price', '104.50');
    expect(derivedField(sources)).toBeNull();
    sources = withEdited(sources, 'total', '200');
    expect(sources).toEqual(['price', 'total']);
    expect(derivedField(sources)).toBe('quantity');

    // Typing into the derived field makes it a source; the oldest source becomes derived.
    sources = withEdited(sources, 'quantity', '2');
    expect(sources).toEqual(['total', 'quantity']);
    expect(derivedField(sources)).toBe('price');
  });

  it('a cleared field stops being a source', () => {
    expect(withEdited(['price', 'total'], 'total', ' ')).toEqual(['price']);
  });
});

describe('derivedText (live third value)', () => {
  it('price + total → litres', () => {
    const v = values({ price: '104.50', total: '200', sources: ['price', 'total'] });
    expect(derivedText(v, india)).toBe('1.91');
  });

  it('quantity + price → total in rupees', () => {
    const v = values({ quantity: '5.3', price: '104.50', sources: ['quantity', 'price'] });
    expect(derivedText(v, india)).toBe('553.85');
  });

  it('quantity + total → price per US gallon to a tenth of a cent', () => {
    const v = values({ quantity: '10', total: '34.59', sources: ['quantity', 'total'] });
    expect(derivedText(v, us)).toBe('3.459');
  });

  it('empty until two valid values are typed', () => {
    expect(derivedText(values({ price: '104.5', sources: ['price'] }), india)).toBe('');
    expect(
      derivedText(values({ price: 'abc', total: '200', sources: ['price', 'total'] }), india),
    ).toBe('');
  });
});

describe('toFillUpInput', () => {
  it('stores canonical units and the entry mode', () => {
    const result = toFillUpInput(
      values({ price: '104.50', total: '200', sources: ['price', 'total'], station: ' HP ' }),
      save(india),
    );
    expect(result).toEqual({
      ok: true,
      input: expect.objectContaining({
        vehicleId: 'v1',
        odometerM: 12_345_000,
        quantityBase: 1914,
        totalMinor: 20_000,
        currency: 'INR',
        entryMode: 'price_total',
        isFull: true,
      }),
    });
  });

  it('US: miles, gallons and dollars', () => {
    const result = toFillUpInput(
      values({ odometer: '1,000', quantity: '10', price: '3.459', sources: ['quantity', 'price'] }),
      save(us),
    );
    expect(result).toMatchObject({
      ok: true,
      input: {
        odometerM: 1_609_344,
        quantityBase: 37_854,
        totalMinor: 3459,
        entryMode: 'qty_price',
      },
    });
  });

  it('EV: kWh', () => {
    const result = toFillUpInput(
      values({ quantity: '20', total: '360', sources: ['quantity', 'total'] }),
      save({ ...india, fuelType: 'electric' }),
    );
    expect(result).toMatchObject({ ok: true, input: { quantityBase: 20_000, totalMinor: 36_000 } });
  });

  it('asks for two amounts and the odometer', () => {
    expect(
      toFillUpInput(values({ odometer: '', total: '200', sources: ['total'] }), save(india)),
    ).toEqual({
      ok: false,
      errors: { odometer: 'required', quantity: 'need_two', price: 'need_two' },
    });
  });

  it('reports typos on the field they were typed in', () => {
    expect(
      toFillUpInput(
        values({ odometer: '12.3.4', price: 'x', total: '200', sources: ['price', 'total'] }),
        save(india),
      ),
    ).toEqual({ ok: false, errors: { odometer: 'not_a_number', price: 'not_a_number' } });
  });

  it('a zero price cannot give a quantity', () => {
    expect(
      toFillUpInput(values({ price: '0', total: '200', sources: ['price', 'total'] }), save(india)),
    ).toEqual({ ok: false, errors: { price: 'out_of_range' } });
  });

  it('maps domain rules: future date, too much fuel on a typed field', () => {
    const result = toFillUpInput(
      values({
        filledAt: new Date('2026-10-29T10:00:00.000Z'),
        price: '0.01',
        total: '50000',
        sources: ['price', 'total'],
      }),
      save(india),
    );
    // 5,000,000 L is derived; the problem is shown on the newest typed field.
    expect(result).toEqual({ ok: false, errors: { filledAt: 'in_future', total: 'out_of_range' } });
  });
});

describe('rememberedPrice', () => {
  it('derives the last unit price in the user units', () => {
    expect(
      rememberedPrice({ totalMinor: 52_250, currency: 'INR', quantityBase: 5000 }, india),
    ).toBe('104.5');
  });

  it('nothing without a last entry, a free charge or a different currency', () => {
    expect(rememberedPrice(null, india)).toBe('');
    expect(rememberedPrice({ totalMinor: 0, currency: 'INR', quantityBase: 5000 }, india)).toBe('');
    expect(rememberedPrice({ totalMinor: 5000, currency: 'EUR', quantityBase: 5000 }, india)).toBe(
      '',
    );
  });
});

describe('amount-only (F-04, KB #25)', () => {
  const remembered = { ...india, rememberedPrice: '104.5' };

  it('two-wheelers start in amount mode when a last price exists; cars do not', () => {
    expect(defaultLayout('scooter', true)).toBe('amount');
    expect(defaultLayout('bike', true)).toBe('amount');
    expect(defaultLayout('car', true)).toBe('full');
    expect(defaultLayout('scooter', false)).toBe('full');
  });

  it('total + untouched remembered price → amount_only, fuel derived', () => {
    const result = toFillUpInput(
      values({ layout: 'amount', price: '104.5', total: '200', sources: ['price'] }),
      save(remembered),
    );
    expect(result).toMatchObject({
      ok: true,
      input: { entryMode: 'amount_only', quantityBase: 1914, totalMinor: 20_000 },
    });
    expect(
      derivedText(values({ layout: 'amount', price: '104.5', total: '200' }), remembered),
    ).toBe('1.91');
  });

  it('a price the user changed makes it price_total', () => {
    const result = toFillUpInput(
      values({ layout: 'amount', price: '106', total: '200', sources: ['price', 'total'] }),
      save(remembered),
    );
    expect(result).toMatchObject({ ok: true, input: { entryMode: 'price_total' } });
  });

  it('the full form with the remembered price and a total is amount_only too', () => {
    const result = toFillUpInput(
      values({ price: '104.5', total: '200', sources: ['price', 'total'] }),
      save(remembered),
    );
    expect(result).toMatchObject({ ok: true, input: { entryMode: 'amount_only' } });
  });

  it('amount mode needs the amount and a price', () => {
    expect(
      toFillUpInput(values({ layout: 'amount', price: '', total: '' }), save(remembered)),
    ).toEqual({ ok: false, errors: { price: 'required', total: 'required' } });
  });

  it('a stale quantity from the full form is ignored in amount mode', () => {
    const result = toFillUpInput(
      values({
        layout: 'amount',
        quantity: '9',
        price: '104.5',
        total: '200',
        sources: ['quantity', 'total'],
      }),
      save(remembered),
    );
    expect(result).toMatchObject({ ok: true, input: { quantityBase: 1914 } });
  });
});

describe('editing a saved fill-up (FR-11)', () => {
  const saved: FillUp = {
    id: 'f1',
    vehicleId: 'v1',
    filledAt: '2026-10-20T09:00:00.000Z',
    localDate: '2026-10-20',
    odometerM: 12_345_678,
    quantityBase: 1914,
    totalMinor: 20_000,
    currency: 'INR',
    isFull: false,
    missedPrevious: false,
    entryMode: 'amount_only',
    station: 'HP',
    note: null,
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  };

  it('shows the entry in the user units with its typed fields as inputs', () => {
    expect(toFillUpFormValues(saved, india)).toEqual({
      layout: 'full',
      filledAt: new Date('2026-10-20T09:00:00.000Z'),
      odometer: '12,345.7',
      quantity: '1.91',
      price: '104.493',
      total: '200',
      sources: ['price', 'total'],
      isFull: false,
      missedPrevious: false,
      station: 'HP',
      note: '',
    });
  });

  it('untouched odometer and amounts keep the exact stored values', () => {
    const initial = toFillUpFormValues(saved, india);
    const current = { ...initial, station: 'Shell', isFull: true };
    const result = toFillUpInput(current, save(india));
    if (!result.ok) throw new Error('expected ok');
    expect(result.input.odometerM).toBe(12_345_700); // re-read from rounded text
    expect(keepUntouchedFillUp(result.input, saved, initial, current)).toMatchObject({
      odometerM: 12_345_678,
      quantityBase: 1914,
      totalMinor: 20_000,
      entryMode: 'amount_only',
      station: 'Shell',
      isFull: true,
    });
  });

  it('changed fields use the new values', () => {
    const initial = toFillUpFormValues(saved, india);
    const current = { ...initial, odometer: '12,400', total: '250' };
    const result = toFillUpInput(current, save(india));
    if (!result.ok) throw new Error('expected ok');
    expect(keepUntouchedFillUp(result.input, saved, initial, current)).toMatchObject({
      odometerM: 12_400_000,
      totalMinor: 25_000,
      entryMode: 'price_total',
    });
  });
});
