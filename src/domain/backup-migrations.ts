// One step per backup schemaVersion bump: steps[n] turns a version-n `data` object into n + 1.
// AGENTS.md rule 10: the importer accepts every version ever shipped, so never delete a step.
// A step receives already-JSON data and must not assume fields added later.

export const CURRENT_BACKUP_VERSION = 1;

export const BACKUP_STEPS: Record<
  number,
  (data: Record<string, unknown>) => Record<string, unknown>
> = {
  // 1 → 2 goes here with the first format change.
};

/** Upgrades `data` from `version` to the current one. */
export function migrateBackupData(
  version: number,
  data: Record<string, unknown>,
): Record<string, unknown> {
  let current = data;
  for (let v = version; v < CURRENT_BACKUP_VERSION; v += 1) {
    const step = BACKUP_STEPS[v];
    if (!step) throw new Error(`No backup migration from version ${v}`);
    current = step(current);
  }
  return current;
}
