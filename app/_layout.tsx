import '@/i18n/i18n';

import { useFonts } from 'expo-font';
import { SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';

import { FONT_ASSETS } from '@/ui/fonts';
import { navigationTheme, paperTheme } from '@/ui/theme';
import { useResolvedColorScheme } from '@/ui/use-color-scheme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useResolvedColorScheme();
  const theme = useMemo(() => paperTheme(scheme), [scheme]);
  const navTheme = useMemo(() => navigationTheme(theme, scheme), [theme, scheme]);
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  // Fonts are bundled, so this takes milliseconds; on error we still start with system fonts.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </PaperProvider>
  );
}
