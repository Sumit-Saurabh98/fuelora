import {
  baseTo,
  baseUnitFor,
  distanceToMetres,
  metresTo,
  parseDecimalInput,
  quantityToBase,
  quantityUnitsFor,
  type NumberSeparators,
} from '../units';

describe('distance', () => {
  it('stores km and miles as whole metres', () => {
    expect(distanceToMetres(12345, 'km')).toBe(12_345_000);
    expect(distanceToMetres(1, 'mi')).toBe(1609); // 1609.344 rounds down
    expect(distanceToMetres(100, 'mi')).toBe(160_934);
    expect(distanceToMetres(0.1, 'km')).toBe(100);
  });

  it('converts metres back for display', () => {
    expect(metresTo(160_934, 'mi')).toBeCloseTo(99.9998, 4);
    expect(metresTo(12_345_000, 'km')).toBe(12345);
  });

  it('round-trips an odometer reading without drift', () => {
    for (const km of [0, 1, 999, 12345, 99_999.9, 999_999]) {
      expect(metresTo(distanceToMetres(km, 'km'), 'km')).toBeCloseTo(km, 3);
    }
    for (const mi of [1, 12345, 199_999]) {
      expect(metresTo(distanceToMetres(mi, 'mi'), 'mi')).toBeCloseTo(mi, 3);
    }
  });
});

describe('quantity', () => {
  it('stores litres and gallons as whole mL', () => {
    expect(quantityToBase(1.95, 'L')).toBe(1950);
    expect(quantityToBase(1, 'gal_us')).toBe(3785);
    expect(quantityToBase(1, 'gal_uk')).toBe(4546);
    expect(quantityToBase(12.5, 'gal_us')).toBe(47_318);
  });

  it('stores CNG in grams and electricity in Wh', () => {
    expect(quantityToBase(4.2, 'kg')).toBe(4200);
    expect(quantityToBase(18.75, 'kWh')).toBe(18_750);
  });

  it('converts base units back for display', () => {
    expect(baseTo(47_318, 'gal_us')).toBeCloseTo(12.5, 3);
    expect(baseTo(1950, 'L')).toBe(1.95);
    expect(baseTo(18_750, 'kWh')).toBe(18.75);
  });

  it('maps each fuel to its base unit and allowed input units', () => {
    expect(baseUnitFor('petrol')).toBe('mL');
    expect(baseUnitFor('diesel')).toBe('mL');
    expect(baseUnitFor('lpg')).toBe('mL');
    expect(baseUnitFor('cng')).toBe('g');
    expect(baseUnitFor('electric')).toBe('Wh');
    expect(quantityUnitsFor('petrol')).toEqual(['L', 'gal_us', 'gal_uk']);
    expect(quantityUnitsFor('cng')).toEqual(['kg']);
    expect(quantityUnitsFor('electric')).toEqual(['kWh']);
  });
});

describe('parseDecimalInput', () => {
  const india: NumberSeparators = { decimal: '.', group: ',' };
  const germany: NumberSeparators = { decimal: ',', group: '.' };

  it.each([
    ['12.5', 12.5],
    ['12,5', 12.5], // comma typed on an Android keypad
    ['200', 200],
    ['0', 0],
    ['.5', 0.5],
    ['5.', 5], // still typing
    [' 1 250 ', 1250],
    ['12,345', 12345], // odometer with grouping, NOT 12.345
    ['1,00,000', 100_000], // Indian lakh grouping
    ['12,34,567', 1_234_567],
    ['12,345.6', 12345.6],
    ['12.345', 12.345], // '.' is the decimal point in India
    ['3.785', 3.785],
  ])('India: %p → %p', (input, expected) => {
    expect(parseDecimalInput(input, india)).toBe(expected);
  });

  it.each([
    ['12,5', 12.5],
    ['12.345', 12345], // German grouping
    ['1.234,5', 1234.5],
    ['12,345', 12.345], // ',' is the decimal point in Germany
  ])('Germany: %p → %p', (input, expected) => {
    expect(parseDecimalInput(input, germany)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    '-5',
    'abc',
    '12a',
    '1.2.3',
    '1,2,3',
    '1,000,00',
    '1234,567', // first group too long to be grouping
    '1,234.5,6',
    '₹200',
  ])('rejects ambiguous or invalid input %p', (input) => {
    expect(parseDecimalInput(input, india)).toBeNull();
  });
});
