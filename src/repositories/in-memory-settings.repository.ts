import type { SettingsRepository } from './settings.repository';

export class InMemorySettingsRepository implements SettingsRepository {
  readonly rows = new Map<string, { value: string; updatedAt: string }>();

  async getAll(): Promise<Map<string, string>> {
    return new Map([...this.rows].map(([key, row]) => [key, row.value]));
  }

  async set(key: string, value: string, updatedAt: string): Promise<void> {
    this.rows.set(key, { value, updatedAt });
  }

  async remove(keys: readonly string[]): Promise<void> {
    for (const key of keys) this.rows.delete(key);
  }
}
