import { useLocalSearchParams } from 'expo-router';

import { AddFillUpScreen } from '@/features/fill-up/components/add-fill-up-screen';

export default function NewFillUpRoute() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  return <AddFillUpScreen vehicleId={vehicleId} />;
}
