import { useLocalSearchParams } from 'expo-router';

import { EditServiceScreen } from '@/features/services/components/edit-service-screen';

export default function EditServiceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditServiceScreen id={id} />;
}
