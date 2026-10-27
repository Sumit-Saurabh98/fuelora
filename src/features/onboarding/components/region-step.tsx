import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { List, RadioButton, Text, useTheme } from 'react-native-paper';

import { isRegion, REGIONS } from '@/domain/regions';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { usePreferences } from '../../settings/preferences.store';
import { buildUnitsPreview } from '../../settings/units-preview';
import { useOnboarding } from '../onboarding.store';
import { ChoiceCard } from './choice-card';
import { OnboardingFrame } from './onboarding-frame';

export function RegionStep() {
  const { t } = useTranslation();
  const theme = useTheme();
  const setRegion = usePreferences((s) => s.setRegion);
  const complete = useOnboarding((s) => s.complete);
  const { region, units, locale, deviceCurrency } = useUnitPreferences();
  const [saving, setSaving] = useState(false);

  const { sample, emissionNameKey } = useMemo(
    () => buildUnitsPreview({ region, units, locale }),
    [region, units, locale],
  );

  const onContinue = async () => {
    setSaving(true);
    try {
      // 4.4 replaces this with the first-vehicle step.
      await complete();
    } finally {
      setSaving(false);
    }
  };

  const rows: { icon: string; title: string; value: string }[] = [
    { icon: 'cash', title: t('settings.currency'), value: units.currency },
    {
      icon: 'map-marker-distance',
      title: t('settings.distanceUnit'),
      value: t(`units.${units.distanceUnit}`),
    },
    { icon: 'gas-station', title: t('settings.volumeUnit'), value: t(`units.${units.volumeUnit}`) },
    {
      icon: 'speedometer',
      title: t('settings.efficiency'),
      value: t(`efficiencyFormats.${units.efficiencyLiquid}`),
    },
    { icon: 'smog', title: t('settings.emissionName'), value: t(emissionNameKey) },
  ];

  return (
    <OnboardingFrame
      step={2}
      title={t('onboarding.regionTitle')}
      subtitle={t('onboarding.regionSubtitle')}
      primary={{ label: t('onboarding.continue'), onPress: onContinue, loading: saving }}
      secondary={{ label: t('onboarding.back'), onPress: () => router.back() }}
    >
      <RadioButton.Group
        value={region}
        onValueChange={(v) => {
          if (isRegion(v)) setRegion(v);
        }}
      >
        {REGIONS.map((r) => (
          <ChoiceCard key={r} value={r} selected={r === region} onPress={() => setRegion(r)}>
            {t(`regions.${r}`, { currency: deviceCurrency })}
          </ChoiceCard>
        ))}
      </RadioButton.Group>

      <View style={[styles.preview, { borderColor: theme.colors.outlineVariant }]}>
        {rows.map((row) => (
          <List.Item
            key={row.icon}
            title={row.title}
            description={row.value}
            style={styles.row}
            left={(props) => <List.Icon {...props} icon={row.icon} />}
          />
        ))}
        <Text variant="bodyMedium" style={[styles.example, { color: theme.colors.primary }]}>
          {`${sample.distance} ${t(`units.${units.distanceUnit}`)} · ${sample.quantity} ${t(`units.${units.volumeUnit}`)} · ${sample.money}`}
        </Text>
      </View>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {t('onboarding.regionLater')}
      </Text>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  preview: { borderWidth: 1, borderRadius: 16, paddingVertical: 4 },
  row: { paddingVertical: 2 },
  example: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
});
