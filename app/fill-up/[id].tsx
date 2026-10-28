import { useLocalSearchParams } from 'expo-router';

import { EditFillUpScreen } from '@/features/fill-up/components/edit-fill-up-screen';

export default function EditFillUpRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditFillUpScreen id={id} />;
}
