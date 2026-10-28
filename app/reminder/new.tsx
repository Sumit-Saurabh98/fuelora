import { useLocalSearchParams } from 'expo-router';

import { AddReminderScreen } from '@/features/reminders/components/reminder-screens';

export default function NewReminderRoute() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  return <AddReminderScreen vehicleId={vehicleId} />;
}
