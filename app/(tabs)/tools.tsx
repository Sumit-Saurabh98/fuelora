import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

export default function ToolsScreen() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="calculator-variant"
      title={t('tools.emptyTitle')}
      body={t('tools.emptyBody')}
    />
  );
}
