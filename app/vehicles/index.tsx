import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { VehiclesScreen } from '@/features/vehicles/components/vehicles-screen';

export default function VehiclesRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('vehicles.title') }} />
      <VehiclesScreen />
    </>
  );
}
