import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

export default function StatsScreen() {
  const { t } = useTranslation();
  return <EmptyState icon="chart-line" title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />;
}
