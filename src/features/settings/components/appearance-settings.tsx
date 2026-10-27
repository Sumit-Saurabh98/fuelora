import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { List, RadioButton, SegmentedButtons, Text } from 'react-native-paper';

import { isLanguage, isThemeMode, LANGUAGES, THEME_MODES } from '@/domain/preferences';

import { usePreferences } from '../preferences.store';

const themeLabelKey = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
} as const;

export function AppearanceSettings() {
  const { t } = useTranslation();
  const { themeMode, language, setThemeMode, setLanguage } = usePreferences();

  return (
    <>
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
          {LANGUAGES.map((l) => (
            <RadioButton.Item key={l} value={l} label={t(`languages.${l}`)} />
          ))}
        </RadioButton.Group>
      </List.Section>
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 8 },
  label: { marginBottom: 4 },
});
