import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { List } from 'react-native-paper';

import { useVehicles } from '../../vehicles/hooks/use-vehicles';

export function VehiclesSettings() {
  const { t } = useTranslation();
  const { active, archived } = useVehicles();

  return (
    <List.Section title={t('settings.vehicles')}>
      <List.Item
        title={t('settings.manageVehicles')}
        description={t('settings.vehicleCount', { count: active.length + archived.length })}
        left={(props) => <List.Icon {...props} icon="car-multiple" />}
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => router.push('/vehicles')}
      />
    </List.Section>
  );
}
