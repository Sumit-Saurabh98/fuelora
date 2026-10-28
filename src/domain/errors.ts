// Codes are stable identifiers: screens map them to i18n messages, so never rename one.
// Add codes here as features need them.
export const ERROR_CODES = [
  'MIGRATION_FAILED',
  'INVALID_AMOUNT',
  'INVALID_CURRENCY',
  'CURRENCY_MISMATCH',
  'INVALID_VEHICLE',
  'VEHICLE_NOT_FOUND',
  'INVALID_FILL_UP',
  'FILL_UP_NOT_FOUND',
  'DUPLICATE_ODOMETER',
  'ODOMETER_BELOW_START',
  'ODOMETER_NOT_INCREASING',
  'ODOMETER_AFTER_NEXT',
  'INVALID_SERVICE',
  'SERVICE_NOT_FOUND',
  'INVALID_REMINDER',
  'REMINDER_NOT_FOUND',
  'BACKUP_INVALID_FILE',
  'BACKUP_NEWER_VERSION',
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
