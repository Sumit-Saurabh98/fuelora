import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, RadioButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { isLanguage, SUPPORTED_LANGUAGES } from '@/i18n/i18n';

import { usePreferences, type ThemeMode } from '../preferences.store';

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

function isThemeMode(value: string): value is ThemeMode {
  return THEME_MODES.some((m) => m === value);
}

const themeLabelKey = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
} as const;

export function AppearanceSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { themeMode, language, setThemeMode, setLanguage } = usePreferences();

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <List.Section title={t('settings.appearance')}>
        <View style={styles.row}>
          <Text variant="bodyLarge" style={styles.label}>
            {t('settings.theme')}
          </Text>
          <SegmentedButtons
            value={themeMode}
            onValueChange={(v) => {
              if (isThemeMode(v)) setThemeMode(v);
            }}
            buttons={THEME_MODES.map((m) => ({ value: m, label: t(themeLabelKey[m]) }))}
          />
        </View>
      </List.Section>
      <List.Section title={t('settings.language')}>
        <RadioButton.Group
          value={language}
          onValueChange={(v) => {
            if (isLanguage(v)) setLanguage(v);
          }}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <RadioButton.Item key={l} value={l} label={t(`languages.${l}`)} />
          ))}
        </RadioButton.Group>
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 8 },
  label: { marginBottom: 4 },
});
