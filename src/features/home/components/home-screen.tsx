import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import { metresTo } from '@/domain/units';
import { EmptyState } from '@/ui/empty-state';
import { formatNumber } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useCurrentVehicle } from '../../vehicles/hooks/use-current-vehicle';
import { VEHICLE_TYPE_ICONS, vehicleDetails } from '../../vehicles/vehicle-display';

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const vehicle = useCurrentVehicle();
  const { units, locale } = useUnitPreferences();

  if (!vehicle) {
    return (
      <EmptyState
        icon="car-outline"
        title={t('home.emptyTitle')}
        body={t('home.emptyBody')}
        action={{ label: t('home.addFirstVehicle'), onPress: () => router.push('/vehicles/new') }}
      />
    );
  }

  const odometer = `${formatNumber(metresTo(vehicle.initialOdometerM, units.distanceUnit), locale, 0)} ${t(`units.${units.distanceUnit}`)}`;
  const details = vehicleDetails(vehicle);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  text: { flex: 1, gap: 2 },
});
