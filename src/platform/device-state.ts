// Small device-only values (LLD §2: MMKV, not backed up): they describe this phone, so a restore
// must not bring another phone's values back.
export interface DeviceState {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
}

export const DEVICE_KEYS = {
  lastExportAt: 'last_export_at',
  lastBackupNudgeAt: 'nudge.backup_shown_at',
} as const;

export class InMemoryDeviceState implements DeviceState {
  readonly values = new Map<string, string>();
  getString(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setString(key: string, value: string): void {
    this.values.set(key, value);
  }
}
