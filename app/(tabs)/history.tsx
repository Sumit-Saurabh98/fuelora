import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

export default function HistoryScreen() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="format-list-bulleted"
      title={t('history.emptyTitle')}
      body={t('history.emptyBody')}
    />
  );
}
