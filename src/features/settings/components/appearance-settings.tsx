import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { List, RadioButton, Text } from 'react-native-paper';

import { isLanguage, LANGUAGES, THEME_MODES } from '@/domain/preferences';
import { SegmentedControl } from '@/ui/segmented-control';

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
          <SegmentedControl
            value={themeMode}
            onChange={setThemeMode}
            accessibilityLabel={t('settings.theme')}
            segments={THEME_MODES.map((m) => ({ value: m, label: t(themeLabelKey[m]) }))}
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
