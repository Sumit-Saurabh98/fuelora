// Writing a file and handing it to the OS share sheet (Drive, WhatsApp, Files, email). The only
// way user data leaves the phone (AGENTS.md rule 2).
export type ShareKind = { mimeType: string; uti: string };

export const SHARE_KINDS = {
  backup: { mimeType: 'application/json', uti: 'public.json' },
  csv: { mimeType: 'text/csv', uti: 'public.comma-separated-values-text' },
} as const satisfies Record<string, ShareKind>;

export interface ShareFiles {
  /** Writes `text` to a temporary file and opens the share sheet for it. */
  share(fileName: string, text: string, kind: ShareKind, dialogTitle: string): Promise<void>;
}
