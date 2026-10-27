import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, RadioButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LANGUAGES, type Language } from '@/domain/preferences';

import { usePreferences } from '../../settings/preferences.store';
import { useOnboarding } from '../onboarding.store';

const DROP = require('../../../../assets/images/splash-icon.png') as number;

export function WelcomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const complete = useOnboarding((s) => s.complete);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    setSaving(true);
    try {
      // 4.3 replaces this with the region step; for now the welcome step finishes onboarding.
      await complete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={DROP} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text variant="displaySmall" style={styles.center}>
          Fuelora
        </Text>
        <Text
          variant="titleMedium"
          style={[styles.center, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('onboarding.tagline')}
        </Text>

        <View style={[styles.promise, { backgroundColor: theme.colors.secondaryContainer }]}>
          <MaterialCommunityIcons
            name="shield-lock-outline"
            size={24}
            color={theme.colors.onSecondaryContainer}
          />
          <Text
            variant="bodyLarge"
            style={[styles.promiseText, { color: theme.colors.onSecondaryContainer }]}
          >
            {t('onboarding.privacy')}
          </Text>
        </View>

        <Text variant="titleSmall" style={styles.label}>
          {t('onboarding.chooseLanguage')}
        </Text>
        <RadioButton.Group
          value={language}
          onValueChange={(v) => {
            const chosen = LANGUAGES.find((l) => l === v);
            if (chosen) setLanguage(chosen);
          }}
        >
          {LANGUAGES.map((l: Language) => {
            const selected = l === language;
            return (
              <Pressable
                key={l}
                onPress={() => setLanguage(l)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: selected ? theme.colors.primaryContainer : 'transparent',
                  },
                ]}
              >
                <RadioButton.Android value={l} />
                <Text
                  variant="titleMedium"
                  style={{
                    color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                  }}
                >
                  {t(`languages.${l}`)}
                </Text>
              </Pressable>
            );
          })}
        </RadioButton.Group>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={onContinue}
          loading={saving}
          disabled={saving}
          contentStyle={styles.cta}
        >
          {t('onboarding.continue')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 16 },
  logo: { width: 96, height: 96, alignSelf: 'center', marginTop: 24 },
  center: { textAlign: 'center' },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  promiseText: { flex: 1 },
  label: { marginTop: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingRight: 16,
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 12,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  cta: { minHeight: 52 },
});
