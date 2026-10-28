import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FillUpResultScreen } from '@/features/fill-up/components/fill-up-result-screen';

export default function FillUpResultRoute() {
  const { t } = useTranslation();
  const { id, vehicleId } = useLocalSearchParams<{ id: string; vehicleId: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('fillUpResult.title') }} />
      <FillUpResultScreen fillUpId={id} vehicleId={vehicleId} />
    </>
  );
}
