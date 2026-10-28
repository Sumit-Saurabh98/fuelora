import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';
import { Chip, Divider, List, Text, useTheme } from 'react-native-paper';

import type { FillUp } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import {
  efficiencyFormatFor,
  groupByMonth,
  historyItems,
  segmentMarks,
} from '@/domain/vehicle-stats';
import { EmptyState } from '@/ui/empty-state';
import { formatDate, formatDay, formatMonth } from '@/ui/format';

import { distanceText, efficiencyText, quantityText } from '../../fill-up/figures-text';
import { useVehicleFillUps } from '../../fill-up/hooks/use-vehicle-fill-ups';
import { useVehicleServices } from '../../services/hooks/use-vehicle-services';
import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useVehicles } from '../../vehicles/hooks/use-vehicles';

/** The current vehicle's fill-ups by month, newest first (F-07). */
export function HistoryScreen() {
  const { t } = useTranslation();
  const { active, currentId } = useVehicles();
  const vehicle = active.find((v) => v.id === currentId);
  if (!vehicle) {
    return (
      <EmptyState
        icon="format-list-bulleted"
        title={t('history.emptyTitle')}
        body={t('history.emptyBody')}
      />
    );
  }
  return <VehicleHistory key={vehicle.id} vehicle={vehicle} />;
}

function VehicleHistory({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale } = useUnitPreferences();
  const fillUps = useVehicleFillUps(vehicle.id);
  const services = useVehicleServices(vehicle.id);
  const format = efficiencyFormatFor(vehicle.fuelType, units);
  const ctx = { t, units, locale };

  const { sections, marks } = useMemo(() => {
    const rows = fillUps ?? [];
    return {
      marks: segmentMarks(rows, format),
      sections: groupByMonth(historyItems(rows, services ?? [])).map((g) => ({
        ...g,
        data: g.entries,
      })),
    };
  }, [fillUps, services, format]);

  if (!fillUps || !services) return null; // one frame while SQLite answers
  if (fillUps.length === 0 && services.length === 0) {
    return (
      <EmptyState
        icon="format-list-bulleted"
        title={t('history.emptyTitle')}
        body={t('history.emptyBody')}
      />
    );
  }

  const badge = (fillUp: FillUp) => {
    if (!fillUp.isFull) return t('history.partial');
    const mark = marks.get(fillUp.id);
    if (!mark) return t('history.firstFull');
    return mark.kind === 'missed' ? t('history.missed') : efficiencyText(mark.value, format, ctx);
  };

  return (
    <SectionList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(f) => f.id}
      stickySectionHeadersEnabled={false}
      ItemSeparatorComponent={Divider}
      renderSectionHeader={({ section }) => (
        <View style={styles.header}>
          <Text variant="titleSmall" accessibilityRole="header">
            {formatMonth(section.month, locale)}
          </Text>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {section.spend.map((m) => m.format(locale)).join(' · ')}
          </Text>
        </View>
      )}
      renderItem={({ item }) => {
        if (item.kind === 'service') {
          const s = item.service;
          const name = s.typeKey === 'custom' ? (s.title ?? '') : t(`servicePresets.${s.typeKey}`);
          const date = formatDay(s.servicedDate, locale);
          const parts = [
            s.odometerM !== null ? distanceText(s.odometerM, ctx) : null,
            s.note,
          ].filter(Boolean);
          return (
            <List.Item
              title={item.amount ? `${date} · ${item.amount.format(locale)}` : date}
              description={parts.length ? `${name} · ${parts.join(' · ')}` : name}
              descriptionNumberOfLines={2}
              onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })}
              left={(props) => <List.Icon {...props} icon="wrench" />}
            />
          );
        }
        const f = item.fillUp;
        const description = `${distanceText(f.odometerM, ctx)} · ${quantityText(f.quantityBase, vehicle.fuelType, ctx)}${f.station ? ` · ${f.station}` : ''}`;
        return (
          <List.Item
            title={`${formatDate(new Date(f.filledAt), locale)} · ${item.amount.format(locale)}`}
            description={description}
            descriptionNumberOfLines={2}
            onPress={() => router.push({ pathname: '/fill-up/[id]', params: { id: f.id } })}
            left={(props) => (
              <List.Icon
                {...props}
                icon={vehicle.fuelType === 'electric' ? 'ev-station' : 'gas-station'}
              />
            )}
            right={() => (
              <Chip compact style={styles.badge} textStyle={styles.badgeText}>
                {badge(f)}
              </Chip>
            )}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  badge: { alignSelf: 'center' },
  badgeText: { marginVertical: 2 },
});
