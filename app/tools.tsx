import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

export default function ToolsRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('tabs.tools') }} />
      <EmptyState
        icon="calculator-variant"
        title={t('tools.emptyTitle')}
        body={t('tools.emptyBody')}
      />
    </>
  );
}
