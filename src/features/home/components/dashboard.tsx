import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import type { Vehicle } from '@/domain/vehicle';

import { costPerDistanceText, distanceText, efficiencyText } from '../../fill-up/figures-text';
import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import type { DashboardStats } from '../hooks/use-vehicle-stats';

type Tile = { label: string; value: string; note?: string };

/** Last and average mileage, cost per distance, this month (F-06). */
export function Dashboard({ vehicle, stats }: { vehicle: Vehicle; stats: DashboardStats }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale } = useUnitPreferences();
  const ctx = { t, units, locale };
  const isEv = vehicle.fuelType === 'electric';

  const tiles: Tile[] = [
    {
      label: isEv ? t('dashboard.lastCharge') : t('dashboard.lastTank'),
      value: efficiencyText(stats.last?.efficiency ?? null, stats.format, ctx),
    },
    {
      label: t('dashboard.average'),
      value: efficiencyText(stats.average?.efficiency ?? null, stats.format, ctx),
      note: stats.average
        ? t(isEv ? 'dashboard.overCharges' : 'dashboard.overTanks', {
            count: stats.average.segments,
          })
        : undefined,
    },
    {
      label: t('dashboard.costPerDistance', { unit: t(`units.${units.distanceUnit}`) }),
      value: stats.average ? costPerDistanceText(stats.average.costPerDistance, ctx) || '—' : '—',
    },
    {
      label: t('dashboard.thisMonth'),
      value: stats.monthSpend.length
        ? stats.monthSpend.map((m) => m.format(locale)).join(' · ')
        : '—',
      note:
        stats.monthDistanceM !== null
          ? t('dashboard.driven', { distance: distanceText(stats.monthDistanceM, ctx) })
          : undefined,
    },
  ];

  return (
    <View style={styles.wrap}>
      {stats.average === null ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {stats.entries === 0
            ? isEv
              ? t('dashboard.startEv')
              : t('dashboard.start')
            : isEv
              ? t('dashboard.needTwoEv')
              : t('dashboard.needTwo')}
        </Text>
      ) : null}
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Card key={tile.label} mode="outlined" style={styles.tile}>
            <Card.Content style={styles.tileContent}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {tile.label}
              </Text>
              <Text variant="titleLarge">{tile.value}</Text>
              {tile.note ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {tile.note}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // Two per row on a 360dp phone; one per row when the font is scaled up a lot.
  tile: { flexGrow: 1, flexBasis: 150 },
  tileContent: { gap: 4 },
});
