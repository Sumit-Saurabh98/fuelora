import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CalculatorsScreen } from '@/features/calculators/components/calculators-screen';

export default function ToolsRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('tools.emptyTitle') }} />
      <CalculatorsScreen />
    </>
  );
}
