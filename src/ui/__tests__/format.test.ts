import { formatLocale, numberSeparators } from '../format';

describe('numberSeparators', () => {
  it.each([
    ['en-IN', '.', ','],
    ['hi-IN', '.', ','],
    ['en-US', '.', ','],
    ['de-DE', ',', '.'],
  ])('%s uses %p as decimal and %p as grouping', (locale, decimal, group) => {
    expect(numberSeparators(locale)).toEqual({ decimal, group });
  });
});

describe('formatLocale', () => {
  it('combines language and region, or uses the device locale for Other', () => {
    expect(formatLocale('hi', 'IN', 'de-DE')).toBe('hi-IN');
    expect(formatLocale('en', 'OTHER', 'de-DE')).toBe('de-DE');
  });
});
