import en from '../en.json';
import hi from '../hi.json';

function flatten(obj: object, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') Object.assign(acc, flatten(value, path));
    else acc[path] = value;
    return acc;
  }, {});
}

describe('translations', () => {
  const enFlat = flatten(en);
  const hiFlat = flatten(hi);

  it('hi has exactly the same keys as en (AGENTS.md rule 9)', () => {
    expect(Object.keys(hiFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it.each([
    ['en', enFlat],
    ['hi', hiFlat],
  ])('%s has no empty strings', (_lang, flat) => {
    for (const [key, value] of Object.entries(flat)) {
      expect({ key, ok: typeof value === 'string' && value.trim().length > 0 }).toEqual({
        key,
        ok: true,
      });
    }
  });
});
