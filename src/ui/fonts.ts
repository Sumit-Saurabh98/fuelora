// Subpath imports: the package root would bundle all 18 Poppins weights (~3 MB).
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { configureFonts, MD3LightTheme, type MD3Theme } from 'react-native-paper';

// Poppins covers Latin and Devanagari, so Hindi headings match English ones.
// Body and label text stay on the system font for small-size readability.
export const FONT_ASSETS = {
  Poppins_600SemiBold,
  Poppins_700Bold,
} as const;

type FontFamily = keyof typeof FONT_ASSETS;
type Variant = keyof MD3Theme['fonts'];

const DISPLAY_VARIANTS: Partial<Record<Variant, FontFamily>> = {
  displayLarge: 'Poppins_700Bold',
  displayMedium: 'Poppins_700Bold',
  displaySmall: 'Poppins_700Bold',
  headlineLarge: 'Poppins_700Bold',
  headlineMedium: 'Poppins_700Bold',
  headlineSmall: 'Poppins_700Bold',
  titleLarge: 'Poppins_600SemiBold',
  titleMedium: 'Poppins_600SemiBold',
  titleSmall: 'Poppins_600SemiBold',
};

// Poppins' natural line height is ~1.4× its size; Paper's tighter defaults clip
// Devanagari vowel signs on Android.
const LINE_HEIGHT_RATIO = 1.4;

export function brandFonts(): MD3Theme['fonts'] {
  const config: Record<string, object> = {};
  for (const [variant, fontFamily] of Object.entries(DISPLAY_VARIANTS)) {
    const base = MD3LightTheme.fonts[variant as Variant];
    if (!('fontSize' in base)) continue;
    config[variant] = {
      fontFamily,
      // The family file already carries the weight; a numeric weight makes Android synthesize bold.
      fontWeight: 'normal',
      lineHeight: Math.round(base.fontSize * LINE_HEIGHT_RATIO),
    };
  }
  return configureFonts({ config });
}
