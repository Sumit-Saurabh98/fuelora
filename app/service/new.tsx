import { useLocalSearchParams } from 'expo-router';

import { AddServiceScreen } from '@/features/services/components/add-service-screen';

export default function NewServiceRoute() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  return <AddServiceScreen vehicleId={vehicleId} />;
}
