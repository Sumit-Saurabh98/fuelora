import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, List, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Vehicle } from '@/domain/vehicle';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useVehicles } from '../hooks/use-vehicles';
import { fuelLabelKey, VEHICLE_TYPE_ICONS, vehicleDetails } from '../vehicle-display';

/** All vehicles: active ones first, archived ones below (FR-4, FR-5). */
export function VehiclesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { region } = useUnitPreferences();
  const { active, archived, currentId } = useVehicles();

  const row = (vehicle: Vehicle) => {
    const kind = `${t(`vehicleForm.types.${vehicle.type}`)} · ${t(fuelLabelKey(vehicle.fuelType, region))}`;
    const details = vehicleDetails(vehicle);
    const isCurrent = vehicle.id === currentId;
    return (
      <List.Item
        key={vehicle.id}
        title={vehicle.name}
        description={details ? `${kind}\n${details}` : kind}
        descriptionNumberOfLines={2}
        left={(props) => (
          <List.Icon
            {...props}
            icon={({ size, color }) => (
              <MaterialCommunityIcons
                name={VEHICLE_TYPE_ICONS[vehicle.type]}
                size={size}
                color={color}
              />
            )}
          />
        )}
        right={() =>
          isCurrent ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {t('vehicles.current')}
              </Text>
            </View>
          ) : null
        }
        accessibilityLabel={isCurrent ? `${vehicle.name}, ${t('vehicles.current')}` : vehicle.name}
      />
    );
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView>
        {active.length === 0 ? (
          <Text
            variant="bodyMedium"
            style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('vehicles.noActive')}
          </Text>
        ) : (
          <List.Section>{active.map(row)}</List.Section>
        )}
        {archived.length > 0 ? (
          <List.Section title={t('vehicles.archived')}>{archived.map(row)}</List.Section>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => router.push('/vehicles/new')}
          contentStyle={styles.button}
        >
          {t('vehicles.add')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  empty: { padding: 24, textAlign: 'center' },
  badge: { alignSelf: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});
