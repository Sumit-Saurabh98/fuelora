// Dev builds only: empties every app table (never the migration log) so first-launch flows can be
// re-tested like a fresh install. A test fails if a migration adds a table missing from this list.
export const APP_TABLES = ['fill_ups', 'vehicles', 'settings'] as const;

export function resetAllData(exec: (sql: string) => void): void {
  // Children before parents, in one transaction: all or nothing.
  exec(`BEGIN; ${APP_TABLES.map((t) => `DELETE FROM ${t};`).join(' ')} COMMIT;`);
}
