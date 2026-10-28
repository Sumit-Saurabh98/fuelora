import { addDays, addMonths, daysBetween } from '../dates';

describe('calendar days', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('adds months, clamping to the last day', () => {
    expect(addMonths('2026-10-28', 6)).toBe('2027-04-28');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-10-31', 12)).toBe('2027-10-31');
  });

  it('counts whole days either way', () => {
    expect(daysBetween('2026-10-28', '2026-11-04')).toBe(7);
    expect(daysBetween('2026-11-04', '2026-10-28')).toBe(-7);
    // A DST change in between doesn't make it 6.96 days.
    expect(daysBetween('2026-03-25', '2026-04-01')).toBe(7);
  });
});
