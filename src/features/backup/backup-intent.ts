/**
 * FR-23: a backup tapped in WhatsApp, email, Drive or Files opens the app with a file URL
 * (Android content://, iOS file://…/Inbox/). Those go to the restore summary; every other URL is
 * a normal route and stays as it is.
 */
export function restorePathFor(url: string | null): string | null {
  if (!url) return null;
  const isFile = /^(content|file):\/\//i.test(url);
  return isFile ? `/restore?uri=${encodeURIComponent(url)}` : null;
}
