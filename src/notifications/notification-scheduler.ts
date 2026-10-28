import { NOTIFICATION_BUDGET } from '@/domain/reminder-planner';

import type {
  NotificationContent,
  NotificationGateway,
  PermissionState,
} from './notification-gateway';

export type NotificationRequest = { key: string; fireAt: Date; content: NotificationContent };

/**
 * The only way the app schedules notifications (AGENTS.md rule 8). sync() makes the OS match the
 * plan: unchanged ones stay, moved or reworded ones are replaced, stale ones are cancelled.
 */
export class NotificationScheduler {
  constructor(private readonly gateway: NotificationGateway) {}

  permission(): Promise<PermissionState> {
    return this.gateway.permission();
  }

  /** Asks only while the OS still allows a prompt (first reminder, AGENTS.md rule 13). */
  async ensurePermission(): Promise<PermissionState> {
    const state = await this.gateway.permission();
    return state === 'undetermined' ? this.gateway.requestPermission() : state;
  }

  async sync(requests: readonly NotificationRequest[]): Promise<void> {
    // Without permission the OS would drop them; keep what's there for when it's granted.
    if ((await this.gateway.permission()) !== 'granted') return;
    const wanted = new Map(
      requests
        .slice(0, NOTIFICATION_BUDGET)
        .map((r) => [r.key, { ...r, signature: signatureOf(r.content) }]),
    );
    const kept = new Set<string>();
    for (const existing of await this.gateway.listScheduled()) {
      const want = wanted.get(existing.key);
      const same =
        want &&
        !kept.has(existing.key) &&
        want.fireAt.getTime() === existing.fireAt &&
        want.signature === existing.signature;
      if (same) kept.add(existing.key);
      else await this.gateway.cancel(existing.id);
    }
    for (const [key, want] of wanted) {
      if (!kept.has(key))
        await this.gateway.schedule(key, want.fireAt, want.content, want.signature);
    }
  }
}

function signatureOf(content: NotificationContent): string {
  return `${content.title}\n${content.body}`;
}
