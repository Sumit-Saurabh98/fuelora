/**
 * RFC 4180 CSV: fields with a comma, quote or line break are quoted, quotes doubled. Starts with
 * a byte-order mark so spreadsheet apps read ₹ and Hindi text as UTF-8.
 */
export function toCsv(rows: readonly (readonly (string | number | null)[])[]): string {
  const field = (value: string | number | null) => {
    const text = value === null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `\ufeff${rows.map((row) => row.map(field).join(',')).join('\r\n')}\r\n`;
}
