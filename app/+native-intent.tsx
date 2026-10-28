import { restorePathFor } from '@/features/backup/backup-intent';

// "Open in Fuelora" for backup files (FR-23); everything else routes as usual.
export function redirectSystemPath({ path }: { path: string | null; initial: boolean }) {
  try {
    return restorePathFor(path) ?? path;
  } catch {
    // Expo Router: never throw here, it would crash the app at launch.
    return path;
  }
}
