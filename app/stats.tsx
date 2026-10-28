import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StatsScreen } from '@/features/stats/components/stats-screen';

export default function StatsRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('tabs.stats') }} />
      <StatsScreen />
    </>
  );
}
