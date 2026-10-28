import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  NotificationContent,
  NotificationGateway,
  PermissionState,
  ScheduledNotification,
} from './notification-gateway';

const CHANNEL_ID = 'reminders';

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted) return 'granted';
  // iOS "provisional" still delivers quietly; treat it as allowed.
  if (p.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** expo-notifications, local only: no push token is ever requested (AGENTS.md rule 1). */
export class ExpoNotificationGateway implements NotificationGateway {
  /** Android 8+ needs a channel; its name shows in the system settings, so it's translated. */
  async ensureChannel(name: string): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name,
      importance: AndroidImportance.DEFAULT,
    });
  }

  async permission(): Promise<PermissionState> {
    return toState(await Notifications.getPermissionsAsync());
  }

  async requestPermission(): Promise<PermissionState> {
    return toState(await Notifications.requestPermissionsAsync());
  }

  async listScheduled(): Promise<ScheduledNotification[]> {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.flatMap((n) => {
      const data = n.content.data as { key?: unknown; fireAt?: unknown; signature?: unknown };
      return typeof data.key === 'string' && typeof data.fireAt === 'number'
        ? [
            {
              id: n.identifier,
              key: data.key,
              fireAt: data.fireAt,
              signature: typeof data.signature === 'string' ? data.signature : '',
            },
          ]
        : [];
    });
  }

  schedule(key: string, fireAt: Date, content: NotificationContent, signature: string) {
    return Notifications.scheduleNotificationAsync({
      content: { ...content, data: { key, fireAt: fireAt.getTime(), signature } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: CHANNEL_ID,
      },
    });
  }

  cancel(id: string): Promise<void> {
    return Notifications.cancelScheduledNotificationAsync(id);
  }
}
