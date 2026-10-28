// A tiny in-process signal so code outside the sync hook (e.g. right after the permission was
// granted) can ask for a re-plan without importing expo-notifications.
const listeners = new Set<() => void>();

export function onNotificationSyncRequest(run: () => void): () => void {
  listeners.add(run);
  return () => listeners.delete(run);
}

/** Re-plan now, e.g. right after the notification permission was granted. */
export function requestNotificationSync(): void {
  for (const run of listeners) run();
}
