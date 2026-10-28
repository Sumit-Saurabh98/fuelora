import { averageDailyM, predictedDueDate } from '../distance-forecaster';

const today = '2026-10-28';

describe('averageDailyM (LLD §5.2)', () => {
  it('distance over days between the first and last reading in 90 days', () => {
    expect(
      averageDailyM(
        [
          { date: '2026-10-01', odometerM: 12_000_000 },
          { date: '2026-10-11', odometerM: 12_300_000 },
          { date: '2026-10-21', odometerM: 12_600_000 },
        ],
        today,
      ),
    ).toBe(30_000); // 600 km in 20 days
  });

  it('ignores readings older than 90 days', () => {
    expect(
      averageDailyM(
        [
          { date: '2026-01-01', odometerM: 1_000_000 },
          { date: '2026-10-01', odometerM: 12_000_000 },
          { date: '2026-10-21', odometerM: 12_600_000 },
        ],
        today,
      ),
    ).toBe(30_000);
  });

  it('needs two readings spanning at least a week, and movement', () => {
    expect(averageDailyM([{ date: '2026-10-21', odometerM: 1 }], today)).toBeNull();
    expect(
      averageDailyM(
        [
          { date: '2026-10-20', odometerM: 12_000_000 },
          { date: '2026-10-25', odometerM: 12_300_000 },
        ],
        today,
      ),
    ).toBeNull();
    expect(
      averageDailyM(
        [
          { date: '2026-10-01', odometerM: 12_000_000 },
          { date: '2026-10-21', odometerM: 12_000_000 },
        ],
        today,
      ),
    ).toBeNull();
  });
});

describe('predictedDueDate', () => {
  it('today + ceil(remaining / daily)', () => {
    // 1,000 km left at 30 km/day → 33.3 → 34 days
    expect(predictedDueDate(13_600_000, 12_600_000, 30_000, today)).toBe('2026-12-01');
  });

  it('today when already reached; null without a rate', () => {
    expect(predictedDueDate(12_000_000, 12_600_000, 30_000, today)).toBe(today);
    expect(predictedDueDate(13_600_000, 12_600_000, null, today)).toBeNull();
  });
});
