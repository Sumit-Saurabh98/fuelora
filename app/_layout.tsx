import '@/i18n/i18n';

import { SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';

import { useOnboarding } from '@/features/onboarding/onboarding.store';
import { StartupError } from '@/features/startup/startup-error';
import { useAppStartup } from '@/features/startup/use-app-startup';
import { navigationTheme, paperTheme } from '@/ui/theme';
import { useResolvedColorScheme } from '@/ui/use-color-scheme';

void SplashScreen.preventAutoHideAsync();

// Pushed screens show a header. Minimal back button: the tabs group has no title, so iOS would
// otherwise show "(tabs)" next to the arrow.
const withHeader = { headerShown: true, headerBackButtonDisplayMode: 'minimal' } as const;

export default function RootLayout() {
  const scheme = useResolvedColorScheme();
  const theme = useMemo(() => paperTheme(scheme), [scheme]);
  const navTheme = useMemo(() => navigationTheme(theme, scheme), [theme, scheme]);
  const startup = useAppStartup();
  const onboarded = useOnboarding((s) => s.onboarded);

  useEffect(() => {
    if (startup !== 'loading') void SplashScreen.hideAsync();
  }, [startup]);

  if (startup === 'loading') return null;

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={navTheme}>
        {startup === 'error' ? (
          <StartupError />
        ) : (
          // Exactly one group is reachable; flipping `onboarded` switches groups automatically.
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={onboarded}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="vehicles/index" options={withHeader} />
              <Stack.Screen name="vehicles/new" options={withHeader} />
              <Stack.Screen name="vehicles/[id]" options={withHeader} />
              <Stack.Screen name="fill-up/new" options={withHeader} />
              <Stack.Screen name="fill-up/result" options={withHeader} />
              <Stack.Screen name="fill-up/[id]" options={withHeader} />
              <Stack.Screen name="service/new" options={withHeader} />
              <Stack.Screen name="service/[id]" options={withHeader} />
            </Stack.Protected>
            <Stack.Protected guard={!onboarded}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
          </Stack>
        )}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </PaperProvider>
  );
}
