import { useLocalSearchParams } from 'expo-router';

import { EditReminderScreen } from '@/features/reminders/components/reminder-screens';

export default function EditReminderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditReminderScreen id={id} />;
}
