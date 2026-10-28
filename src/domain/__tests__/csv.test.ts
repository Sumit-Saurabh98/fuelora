import { toCsv } from '../csv';

describe('toCsv', () => {
  it('quotes only what needs it and doubles quotes', () => {
    expect(
      toCsv([
        ['Date', 'Note'],
        ['2026-10-28', 'Said "full", then 3 L'],
        ['x', null],
      ]),
    ).toBe('\ufeffDate,Note\r\n2026-10-28,"Said ""full"", then 3 L"\r\nx,\r\n');
  });

  it('keeps line breaks inside a quoted field', () => {
    expect(toCsv([['a\nb']])).toBe('\ufeff"a\nb"\r\n');
  });
});
