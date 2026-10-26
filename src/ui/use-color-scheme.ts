import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePreferences } from '@/features/settings/preferences.store';

import type { ColorScheme } from './theme';

export function useResolvedColorScheme(): ColorScheme {
  const system = useSystemColorScheme();
  const mode = usePreferences((s) => s.themeMode);
  if (mode !== 'system') return mode;
  return system === 'dark' ? 'dark' : 'light';
}
