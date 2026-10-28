import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RestoreScreen } from '@/features/backup/components/restore-screen';

export default function RestoreRoute() {
  const { t } = useTranslation();
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('restore.title') }} />
      <RestoreScreen uri={uri} />
    </>
  );
}
