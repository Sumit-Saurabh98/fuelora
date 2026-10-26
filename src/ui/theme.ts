import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

export type ColorScheme = 'light' | 'dark';

// Brand tokens. Placeholder palette until store assets are designed (Phase 5).
const brand = {
  light: {
    primary: '#1F6FD1',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D6E3FF',
    onPrimaryContainer: '#001B3E',
    secondary: '#2E7D5B',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#B4F1CF',
    onSecondaryContainer: '#002113',
  },
  dark: {
    primary: '#A9C7FF',
    onPrimary: '#003063',
    primaryContainer: '#00468C',
    onPrimaryContainer: '#D6E3FF',
    secondary: '#98D5B4',
    onSecondary: '#003822',
    secondaryContainer: '#105237',
    onSecondaryContainer: '#B4F1CF',
  },
} as const;

export function paperTheme(scheme: ColorScheme): MD3Theme {
  const base = scheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  return { ...base, colors: { ...base.colors, ...brand[scheme] } };
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
