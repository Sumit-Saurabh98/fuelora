/* eslint-disable no-restricted-properties, @typescript-eslint/no-require-imports -- this test deletes Intl APIs to simulate iOS and re-requires modules in isolation. */
// Hermes on iOS lacks parts of Intl (formatToParts crashed the vehicle step on device,
// 2026-10-28). Remove those APIs here so Node behaves like the iPhone.
describe('Intl helpers without formatToParts / resolvedOptions (Hermes on iOS)', () => {
  const proto = Intl.NumberFormat.prototype as unknown as Record<string, unknown>;
  const saved = { formatToParts: proto.formatToParts, resolvedOptions: proto.resolvedOptions };

  beforeAll(() => {
    delete proto.formatToParts;
    delete proto.resolvedOptions;
  });
  afterAll(() => {
    proto.formatToParts = saved.formatToParts;
    proto.resolvedOptions = saved.resolvedOptions;
  });

  it('really removed the APIs', () => {
    expect(
      typeof (new Intl.NumberFormat('en') as unknown as Record<string, unknown>).formatToParts,
    ).toBe('undefined');
  });

  it('still reads number separators', () => {
    jest.isolateModules(() => {
      const { numberSeparators } = require('../format') as typeof import('../format');
      expect(numberSeparators('en-IN')).toEqual({ decimal: '.', group: ',' });
      expect(numberSeparators('hi-IN')).toEqual({ decimal: '.', group: ',' });
      expect(numberSeparators('de-DE')).toEqual({ decimal: ',', group: '.' });
      expect(numberSeparators('en-US')).toEqual({ decimal: '.', group: ',' });
    });
  });

  it('still knows each currency’s minor digits', () => {
    jest.isolateModules(() => {
      const { currencyDigits } = require('@/domain/money') as typeof import('@/domain/money');
      expect(currencyDigits('INR')).toBe(2);
      expect(currencyDigits('USD')).toBe(2);
      expect(currencyDigits('JPY')).toBe(0);
      expect(currencyDigits('KWD')).toBe(3);
    });
  });
});
