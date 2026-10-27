// Codes are stable identifiers: screens map them to i18n messages, so never rename one.
// Add codes here as features need them.
export const ERROR_CODES = [
  'MIGRATION_FAILED',
  'INVALID_AMOUNT',
  'INVALID_CURRENCY',
  'CURRENCY_MISMATCH',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    // Never put user content (names, plates, notes) here; details may reach crash reports.
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
