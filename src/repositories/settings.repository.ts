// Key/value settings (LLD §2 `settings`). Keys are owned by SettingsService.
export interface SettingsRepository {
  getAll(): Promise<Map<string, string>>;
  set(key: string, value: string, updatedAt: string): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
}
