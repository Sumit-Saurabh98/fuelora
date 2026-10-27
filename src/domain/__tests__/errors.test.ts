import { AppError, isAppError } from '../errors';

describe('AppError', () => {
  it('carries a code, message and details', () => {
    const error = new AppError('MIGRATION_FAILED', 'Database migration failed', { step: 1 });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('MIGRATION_FAILED');
    expect(error.details).toEqual({ step: 1 });
  });

  it('is recognised by isAppError, plain errors are not', () => {
    expect(isAppError(new AppError('MIGRATION_FAILED', 'x'))).toBe(true);
    expect(isAppError(new Error('x'))).toBe(false);
    expect(isAppError('x')).toBe(false);
  });
});
