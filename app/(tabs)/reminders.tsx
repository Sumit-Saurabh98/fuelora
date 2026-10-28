import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

export default function RemindersRoute() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="bell-outline"
      title={t('reminders.emptyTitle')}
      body={t('reminders.emptyBody')}
    />
  );
}
