import type {
  NotificationContent,
  NotificationGateway,
  PermissionState,
  ScheduledNotification,
} from './notification-gateway';

export class InMemoryNotificationGateway implements NotificationGateway {
  state: PermissionState = 'granted';
  /** What the user answers when prompted. */
  answer: PermissionState = 'granted';
  prompts = 0;
  readonly scheduled = new Map<string, ScheduledNotification & NotificationContent>();
  private n = 0;

  async permission(): Promise<PermissionState> {
    return this.state;
  }

  async requestPermission(): Promise<PermissionState> {
    if (this.state === 'undetermined') {
      this.prompts += 1;
      this.state = this.answer;
    }
    return this.state;
  }

  async listScheduled(): Promise<ScheduledNotification[]> {
    return [...this.scheduled.values()].map(({ id, key, fireAt, signature }) => ({
      id,
      key,
      fireAt,
      signature,
    }));
  }

  async schedule(key: string, fireAt: Date, content: NotificationContent, signature: string) {
    const id = `n${++this.n}`;
    this.scheduled.set(id, { id, key, fireAt: fireAt.getTime(), signature, ...content });
    return id;
  }

  async cancel(id: string): Promise<void> {
    this.scheduled.delete(id);
  }
}
