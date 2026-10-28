import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EditVehicleScreen } from '@/features/vehicles/components/edit-vehicle-screen';

export default function EditVehicleRoute() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('editVehicle.title') }} />
      <EditVehicleScreen id={id} />
    </>
  );
}
