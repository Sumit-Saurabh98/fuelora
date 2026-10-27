import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { brandFonts } from './fonts';

export type ColorScheme = 'light' | 'dark';

// Bold, dark-first brand: ink + electric lime, violet and hot pink.
// Every text/background pair is ≥ 4.5:1 (NFR-6). Lime fails on white, so in light mode
// violet carries text and lime is used only as a fill with ink on top.
const palette = {
  ink: '#0E0E14',
  inkLight: '#14121F',
  lime: '#C8F542',
  violet: '#9D7BFF',
  violetDeep: '#5B2EE6',
  pink: '#FF5C93',
  pinkDeep: '#C2185B',
} as const;

const brand: Record<ColorScheme, Partial<MD3Theme['colors']>> = {
  dark: {
    primary: palette.lime,
    onPrimary: palette.ink,
    primaryContainer: '#3A4A12',
    onPrimaryContainer: '#E4FF9E',
    secondary: palette.violet,
    onSecondary: palette.ink,
    secondaryContainer: '#3B2A80',
    onSecondaryContainer: '#E9E1FF',
    tertiary: palette.pink,
    onTertiary: palette.ink,
    tertiaryContainer: '#6B1238',
    onTertiaryContainer: '#FFD9E4',
    background: palette.ink,
    onBackground: '#F4F3FA',
    surface: '#17171F',
    onSurface: '#F4F3FA',
    surfaceVariant: '#262633',
    onSurfaceVariant: '#B9B6CC',
    outline: '#77748C',
    outlineVariant: '#33323F',
    inverseSurface: '#F4F3FA',
    inverseOnSurface: palette.ink,
    inversePrimary: palette.violetDeep,
    elevation: {
      level0: 'transparent',
      level1: '#151320',
      level2: '#191727',
      level3: '#1E1A2E',
      level4: '#1F1B30',
      level5: '#221D35',
    },
  },
  light: {
    primary: palette.violetDeep,
    onPrimary: '#FFFFFF',
    primaryContainer: palette.lime,
    onPrimaryContainer: palette.inkLight,
    secondary: palette.violetDeep,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E6DEFF',
    onSecondaryContainer: '#1E0A66',
    tertiary: palette.pinkDeep,
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD9E4',
    onTertiaryContainer: '#3E0019',
    background: '#F6F5FB',
    onBackground: palette.inkLight,
    surface: '#FFFFFF',
    onSurface: palette.inkLight,
    surfaceVariant: '#EAE8F2',
    onSurfaceVariant: '#4A4760',
    outline: '#7A7790',
    outlineVariant: '#D6D3E2',
    inverseSurface: palette.inkLight,
    inverseOnSurface: '#F4F3FA',
    inversePrimary: palette.lime,
    elevation: {
      level0: 'transparent',
      level1: '#FAF9FE',
      level2: '#F7F5FE',
      level3: '#F2EEFD',
      level4: '#F0ECFD',
      level5: '#EDE8FC',
    },
  },
};

export function paperTheme(scheme: ColorScheme): MD3Theme {
  const base = scheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  // Paper multiplies roundness per component; 6 gives pill buttons and ~24px cards.
  return {
    ...base,
    roundness: 6,
    fonts: brandFonts(),
    colors: { ...base.colors, ...brand[scheme] },
  };
}

export function navigationTheme(theme: MD3Theme, scheme: ColorScheme): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };
}
