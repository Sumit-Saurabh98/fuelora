import { isLanguage, isThemeMode } from '../preferences';

describe('preferences', () => {
  it.each([
    ['system', true],
    ['dark', true],
    ['neon', false],
    [undefined, false],
  ])('isThemeMode(%p) = %p', (value, expected) => {
    expect(isThemeMode(value)).toBe(expected);
  });

  it.each([
    ['en', true],
    ['hi', true],
    ['fr', false],
    [null, false],
  ])('isLanguage(%p) = %p', (value, expected) => {
    expect(isLanguage(value)).toBe(expected);
  });
});
