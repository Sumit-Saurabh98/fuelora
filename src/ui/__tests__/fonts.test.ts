import { brandFonts, FONT_ASSETS } from '../fonts';

describe('brandFonts', () => {
  const fonts = brandFonts();

  it('uses bundled Poppins families for headings and titles', () => {
    expect(fonts.displayLarge.fontFamily).toBe('Poppins_700Bold');
    expect(fonts.headlineSmall.fontFamily).toBe('Poppins_700Bold');
    expect(fonts.titleMedium.fontFamily).toBe('Poppins_600SemiBold');
    expect(Object.keys(FONT_ASSETS)).toEqual(
      expect.arrayContaining(['Poppins_700Bold', 'Poppins_600SemiBold']),
    );
  });

  it('keeps body text on the system font', () => {
    expect(fonts.bodyMedium.fontFamily).not.toMatch(/Poppins/);
  });

  it('gives Poppins variants room for Devanagari vowel signs', () => {
    for (const variant of ['displayLarge', 'headlineMedium', 'titleSmall'] as const) {
      const { fontSize, lineHeight } = fonts[variant];
      expect(lineHeight).toBeGreaterThanOrEqual(fontSize * 1.4 - 0.5);
    }
  });
});
