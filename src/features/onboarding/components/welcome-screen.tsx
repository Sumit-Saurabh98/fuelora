import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import { RadioButton, Text, useTheme } from 'react-native-paper';

import { LANGUAGES } from '@/domain/preferences';

import { usePreferences } from '../../settings/preferences.store';
import { ChoiceCard } from './choice-card';
import { OnboardingFrame } from './onboarding-frame';

const DROP = require('../../../../assets/images/splash-icon.png') as number;

export function WelcomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);

  return (
    <OnboardingFrame
      step={1}
      header={
        <View style={styles.brand}>
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
        </View>
      }
      primary={{
        label: t('onboarding.continue'),
        onPress: () => router.push('/onboarding/region'),
      }}
      // New phone: bring everything over from a backup instead of starting fresh (FR-22).
      secondary={{ label: t('onboarding.restore'), onPress: () => router.push('/restore') }}
    >
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
        {LANGUAGES.map((l) => (
          <ChoiceCard key={l} value={l} selected={l === language} onPress={() => setLanguage(l)}>
            {t(`languages.${l}`)}
          </ChoiceCard>
        ))}
      </RadioButton.Group>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  brand: { gap: 8, marginBottom: 8 },
  logo: { width: 96, height: 96, alignSelf: 'center', marginTop: 8 },
  center: { textAlign: 'center' },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  promiseText: { flex: 1 },
  label: { marginTop: 8 },
});
