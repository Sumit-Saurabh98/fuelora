import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

export default function StatsRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('tabs.stats') }} />
      <EmptyState icon="chart-line" title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />
    </>
  );
}
