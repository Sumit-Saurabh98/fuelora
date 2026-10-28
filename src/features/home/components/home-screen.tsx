import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, FAB, Text, useTheme } from 'react-native-paper';

import { metresTo } from '@/domain/units';
import type { Vehicle } from '@/domain/vehicle';
import { EmptyState } from '@/ui/empty-state';
import { formatNumber } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { VEHICLE_TYPE_ICONS, vehicleDetails } from '../../vehicles/vehicle-display';
import { useVehicleStats } from '../hooks/use-vehicle-stats';
import { Dashboard } from './dashboard';
import { VehicleSwitcher } from './vehicle-switcher';

export function HomeScreen() {
  const { t } = useTranslation();
  const { active, archived, currentId } = useVehicles();
  const vehicle = active.find((v) => v.id === currentId);

  if (!vehicle) {
    // Archived vehicles still hold data, so don't claim there are none.
    return archived.length > 0 ? (
      <EmptyState
        icon="archive-outline"
        title={t('home.allArchivedTitle')}
        body={t('home.allArchivedBody')}
        action={{ label: t('home.manageVehicles'), onPress: () => router.push('/vehicles') }}
      />
    ) : (
      <EmptyState
        icon="car-outline"
        title={t('home.emptyTitle')}
        body={t('home.emptyBody')}
        action={{ label: t('home.addFirstVehicle'), onPress: () => router.push('/vehicles/new') }}
      />
    );
  }

  return <VehicleHome vehicle={vehicle} active={active} />;
}

function VehicleHome({ vehicle, active }: { vehicle: Vehicle; active: Vehicle[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale } = useUnitPreferences();
  const stats = useVehicleStats(vehicle);
  const odometerM = stats?.odometerM ?? vehicle.initialOdometerM;
  const odometer = `${formatNumber(metresTo(odometerM, units.distanceUnit), locale, 0)} ${t(`units.${units.distanceUnit}`)}`;
  const details = vehicleDetails(vehicle);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <VehicleSwitcher vehicles={active} current={vehicle} />
        <Card mode="contained" style={{ backgroundColor: theme.colors.primaryContainer }}>
          <Card.Content style={styles.card}>
            <MaterialCommunityIcons
              name={VEHICLE_TYPE_ICONS[vehicle.type]}
              size={40}
              color={theme.colors.onPrimaryContainer}
            />
            <View style={styles.text}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {vehicle.name}
              </Text>
              {details ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  {details}
                </Text>
              ) : null}
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                {t('home.odometer')}: {odometer}
              </Text>
            </View>
          </Card.Content>
        </Card>
        {stats ? <Dashboard vehicle={vehicle} stats={stats} /> : null}
      </ScrollView>
      <FAB
        icon={vehicle.fuelType === 'electric' ? 'ev-station' : 'gas-station'}
        label={vehicle.fuelType === 'electric' ? t('home.addCharge') : t('home.addFillUp')}
        style={styles.fab}
        onPress={() => router.push({ pathname: '/fill-up/new', params: { vehicleId: vehicle.id } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Room under the last card so the FAB never covers it.
  content: { padding: 16, gap: 12, paddingBottom: 96 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  text: { flex: 1, gap: 2 },
});
