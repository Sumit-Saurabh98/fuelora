import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { Card, Text, useTheme } from 'react-native-paper';

import { getContainer } from '@/container';
import { localDateOf } from '@/domain/fill-up';
import { STATS_RANGES, statsSeries, type StatsRange } from '@/domain/stats';
import type { Vehicle } from '@/domain/vehicle';
import { efficiencyFormatFor } from '@/domain/vehicle-stats';
import { EmptyState } from '@/ui/empty-state';
import { formatDay, formatFixed, formatMonth } from '@/ui/format';
import { SegmentedControl } from '@/ui/segmented-control';

import { costPerDistanceText, distanceText, efficiencyText } from '../../fill-up/figures-text';
import { useVehicleFillUps } from '../../fill-up/hooks/use-vehicle-fill-ups';
import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useVehicles } from '../../vehicles/hooks/use-vehicles';

/** Mileage and spend over time for the current vehicle (F-08). */
export function StatsScreen() {
  const { t } = useTranslation();
  const { active, currentId } = useVehicles();
  const vehicle = active.find((v) => v.id === currentId);
  if (!vehicle) {
    return (
      <EmptyState icon="chart-line" title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />
    );
  }
  return <VehicleStats key={vehicle.id} vehicle={vehicle} />;
}

function VehicleStats({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { units, locale } = useUnitPreferences();
  const fillUps = useVehicleFillUps(vehicle.id);
  const [range, setRange] = useState<StatsRange>('6m');
  const format = efficiencyFormatFor(vehicle.fuelType, units);
  const today = localDateOf(getContainer().clock.now());
  const ctx = { t, units, locale };

  const series = useMemo(
    () =>
      fillUps
        ? statsSeries(fillUps, { range, today, format, distanceUnit: units.distanceUnit })
        : null,
    [fillUps, range, today, format, units.distanceUnit],
  );
  if (!series) return null; // one frame while SQLite answers

  // Bars show the app currency; a traveller's other currencies stay in the totals.
  const currency = units.currency;
  const bars = series.monthly.map((m) => ({
    value: m.spend.find((s) => s.currency === currency)?.major ?? 0,
    label: formatMonth(m.month, locale).slice(0, 3),
    frontColor: theme.colors.primary,
  }));
  const chartWidth = Math.max(200, width - 32 - 32 - 40);
  const points = series.efficiency.map((p) => ({ value: p.value }));
  const axisText = { color: theme.colors.onSurfaceVariant, fontSize: 10 };

  const tiles = [
    { label: t('stats.average'), value: efficiencyText(series.average, format, ctx) },
    { label: t('stats.best'), value: efficiencyText(series.best, format, ctx) },
    { label: t('stats.worst'), value: efficiencyText(series.worst, format, ctx) },
    {
      label: t('dashboard.costPerDistance', { unit: t(`units.${units.distanceUnit}`) }),
      value: costPerDistanceText(series.costPerDistance, ctx) || '—',
    },
    {
      label: t('stats.spend'),
      value: series.totalSpend.length
        ? series.totalSpend.map((m) => m.format(locale)).join(' · ')
        : '—',
    },
    {
      label: t('stats.distance'),
      value: series.distanceM > 0 ? distanceText(series.distanceM, ctx) : '—',
    },
  ];

  const first = series.efficiency[0];
  const last = series.efficiency.at(-1);
  // NFR-6: charts get a text summary for screen readers.
  const lineSummary =
    first && last && series.average !== null
      ? t('stats.lineSummary', {
          from: formatDay(first.date, locale),
          to: formatDay(last.date, locale),
          average: efficiencyText(series.average, format, ctx),
          count: series.segments,
        })
      : '';

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="titleMedium">{vehicle.name}</Text>
      <SegmentedControl
        value={range}
        onChange={setRange}
        accessibilityLabel={t('stats.range')}
        segments={STATS_RANGES.map((r) => ({ value: r, label: t(`stats.ranges.${r}`) }))}
      />

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Card key={tile.label} mode="outlined" style={styles.tile}>
            <Card.Content style={styles.tileContent}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {tile.label}
              </Text>
              <Text variant="titleMedium">{tile.value}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Card mode="outlined">
        <Card.Title title={t('stats.mileageOverTime')} titleVariant="titleMedium" />
        <Card.Content accessible accessibilityLabel={lineSummary || t('stats.needTwo')}>
          {points.length >= 2 ? (
            <LineChart
              data={points}
              width={chartWidth}
              height={180}
              color={theme.colors.primary}
              dataPointsColor={theme.colors.primary}
              thickness={2}
              curved
              noOfSections={4}
              spacing={Math.max(24, chartWidth / Math.max(points.length, 2))}
              initialSpacing={12}
              yAxisTextStyle={axisText}
              yAxisColor={theme.colors.outline}
              xAxisColor={theme.colors.outline}
              rulesColor={theme.colors.surfaceVariant}
              formatYLabel={(v) => formatFixed(Number(v), locale, 0)}
            />
          ) : (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('stats.needTwo')}
            </Text>
          )}
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title={t('stats.monthlySpend')} titleVariant="titleMedium" />
        <Card.Content
          accessible
          accessibilityLabel={t('stats.barSummary', {
            total: series.totalSpend.map((m) => m.format(locale)).join(' · ') || '—',
            months: series.monthly.length,
          })}
        >
          {bars.some((b) => b.value > 0) ? (
            <BarChart
              data={bars}
              width={chartWidth}
              height={180}
              barWidth={Math.max(8, Math.min(28, chartWidth / Math.max(bars.length, 1) - 8))}
              spacing={8}
              roundedTop
              noOfSections={4}
              yAxisTextStyle={axisText}
              xAxisLabelTextStyle={axisText}
              yAxisColor={theme.colors.outline}
              xAxisColor={theme.colors.outline}
              rulesColor={theme.colors.surfaceVariant}
              formatYLabel={(v) => formatFixed(Number(v), locale, 0)}
            />
          ) : (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('stats.noSpend')}
            </Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexGrow: 1, flexBasis: 150 },
  tileContent: { gap: 4 },
});
