import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { efficiencyFormatFor, fillUpResult } from '@/domain/vehicle-stats';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { costPerDistanceText, distanceText, efficiencyText, quantityText } from '../figures-text';
import { useVehicleFillUps } from '../hooks/use-vehicle-fill-ups';

/** Shown after saving: this tank's mileage, or why there isn't one yet (FR-10). */
export function FillUpResultScreen({
  fillUpId,
  vehicleId,
}: {
  fillUpId: string;
  vehicleId: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale } = useUnitPreferences();
  const vehicle = useVehicle(vehicleId);
  const fillUps = useVehicleFillUps(vehicleId);

  if (!vehicle || !fillUps) return null; // one frame while SQLite answers
  const format = efficiencyFormatFor(vehicle.fuelType, units);
  const result = fillUpResult(fillUps, fillUpId, { format, distanceUnit: units.distanceUnit });
  const ctx = { t, units, locale };
  const isEv = vehicle.fuelType === 'electric';

  let icon: 'gauge' | 'flag-checkered' | 'progress-clock' | 'alert-circle-outline' = 'gauge';
  let title: string;
  let body: string | null = null;
  let big: string | null = null;
  let details: string[] = [];
  switch (result?.kind) {
    case 'segment': {
      const f = result.figures;
      title = isEv ? t('fillUpResult.thisCharge') : t('fillUpResult.thisTank');
      big = efficiencyText(f.efficiency, format, ctx);
      details = [
        t('fillUpResult.distanceOn', {
          distance: distanceText(f.distanceM, ctx),
          quantity: quantityText(f.quantityBase, vehicle.fuelType, ctx),
        }),
        costPerDistanceText(f.costPerDistance, ctx),
      ].filter(Boolean);
      break;
    }
    case 'baseline':
      icon = 'flag-checkered';
      title = isEv ? t('fillUpResult.baselineEv') : t('fillUpResult.baseline');
      body = isEv ? t('fillUpResult.baselineEvBody') : t('fillUpResult.baselineBody');
      break;
    case 'partial':
      icon = 'progress-clock';
      title = t('fillUpResult.partial');
      body = isEv ? t('fillUpResult.partialEvBody') : t('fillUpResult.partialBody');
      break;
    case 'missed':
      icon = 'alert-circle-outline';
      title = t('fillUpResult.saved');
      body = t('fillUpResult.missedBody');
      break;
    default:
      title = t('fillUpResult.saved');
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons name={icon} size={56} color={theme.colors.primary} />
        <Text variant="titleMedium" style={styles.center}>
          {title}
        </Text>
        {big ? (
          <Text
            variant="displaySmall"
            style={[styles.center, { color: theme.colors.primary }]}
            accessibilityLabel={`${title}: ${big}`}
          >
            {big}
          </Text>
        ) : null}
        {details.map((line) => (
          <Text key={line} variant="bodyLarge" style={styles.center}>
            {line}
          </Text>
        ))}
        {body ? (
          <Text
            variant="bodyLarge"
            style={[styles.center, styles.body, { color: theme.colors.onSurfaceVariant }]}
          >
            {body}
          </Text>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Button mode="contained" onPress={() => router.back()} contentStyle={styles.button}>
          {t('fillUpResult.done')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  center: { textAlign: 'center' },
  body: { maxWidth: 340 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});
