// Files the user picks to restore from, and the automatic safety copies kept on the phone
// before a restore replaces everything (AGENTS.md rule 12).
export type PickedFile = { uri: string; name: string };

export interface BackupFiles {
  /** Opens the system file picker; null when the user cancels. */
  pick(): Promise<PickedFile | null>;
  readText(uri: string): Promise<string>;
  /** Saves a safety copy in app storage (kept across launches); returns its file name. */
  saveSafetyCopy(fileName: string, text: string): Promise<string>;
}

export class InMemoryBackupFiles implements BackupFiles {
  /** What the picker returns next (null = cancelled). */
  next: { name: string; text: string } | null = null;
  readonly files = new Map<string, string>();
  readonly safety = new Map<string, string>();
  failSafety = false;

  async pick(): Promise<PickedFile | null> {
    if (!this.next) return null;
    const uri = `memory://${this.next.name}`;
    this.files.set(uri, this.next.text);
    return { uri, name: this.next.name };
  }

  async readText(uri: string): Promise<string> {
    const text = this.files.get(uri);
    if (text === undefined) throw new Error(`No file ${uri}`);
    return text;
  }

  async saveSafetyCopy(fileName: string, text: string): Promise<string> {
    if (this.failSafety) throw new Error('storage full');
    this.safety.set(fileName, text);
    return fileName;
  }
}
