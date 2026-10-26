import '@/i18n/i18n';

import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';

import { navigationTheme, paperTheme } from '@/ui/theme';
import { useResolvedColorScheme } from '@/ui/use-color-scheme';

export default function RootLayout() {
  const scheme = useResolvedColorScheme();
  const theme = useMemo(() => paperTheme(scheme), [scheme]);
  const navTheme = useMemo(() => navigationTheme(theme, scheme), [theme, scheme]);

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </PaperProvider>
  );
}
