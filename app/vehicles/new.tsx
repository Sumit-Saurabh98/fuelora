import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AddVehicleScreen } from '@/features/vehicles/components/add-vehicle-screen';

export default function NewVehicleRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('addVehicle.title') }} />
      <AddVehicleScreen />
    </>
  );
}
