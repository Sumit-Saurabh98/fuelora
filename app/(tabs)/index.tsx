import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

export default function HomeScreen() {
  const { t } = useTranslation();
  return <EmptyState icon="car-outline" title={t('home.emptyTitle')} body={t('home.emptyBody')} />;
}
