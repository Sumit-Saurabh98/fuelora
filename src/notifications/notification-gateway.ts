// The OS side of local notifications (LLD §8). Only NotificationScheduler talks to it
// (AGENTS.md rule 8); tests use InMemoryNotificationGateway.

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export type NotificationContent = { title: string; body: string };

/** What we put on each scheduled notification so a later sync can recognise it. */
export type ScheduledNotification = {
  id: string;
  key: string;
  fireAt: number;
  /** Title + body as scheduled; a renamed reminder or new language reschedules it. */
  signature: string;
};

export interface NotificationGateway {
  permission(): Promise<PermissionState>;
  /** Shows the OS prompt when it still can; returns the resulting state. */
  requestPermission(): Promise<PermissionState>;
  listScheduled(): Promise<ScheduledNotification[]>;
  schedule(
    key: string,
    fireAt: Date,
    content: NotificationContent,
    signature: string,
  ): Promise<string>;
  cancel(id: string): Promise<void>;
}
