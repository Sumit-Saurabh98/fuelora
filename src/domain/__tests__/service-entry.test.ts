import { validateService, type NewServiceInput } from '../service-entry';

const TODAY = '2026-10-28';
const input = (change: Partial<NewServiceInput> = {}): NewServiceInput => ({
  vehicleId: 'v1',
  servicedDate: '2026-10-20',
  typeKey: 'general_service',
  currency: 'INR',
  ...change,
});

describe('validateService', () => {
  it('accepts a preset service with only a date', () => {
    expect(validateService(input(), TODAY)).toEqual({
      ok: true,
      value: {
        vehicleId: 'v1',
        servicedDate: '2026-10-20',
        odometerM: null,
        typeKey: 'general_service',
        title: null,
        costMinor: null,
        currency: null,
        note: null,
      },
    });
  });

  it('keeps cost with its currency, and a custom title', () => {
    const result = validateService(
      input({
        typeKey: 'custom',
        title: ' Horn replaced ',
        costMinor: 45_000,
        odometerM: 12_500_000,
      }),
      TODAY,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { title: 'Horn replaced', costMinor: 45_000, currency: 'INR', odometerM: 12_500_000 },
    });
  });

  it('a preset never stores a title (its name comes from the app language)', () => {
    expect(validateService(input({ title: 'x' }), TODAY)).toMatchObject({ value: { title: null } });
  });

  it('reports every problem at once', () => {
    expect(
      validateService(
        input({
          servicedDate: '2026-10-29',
          typeKey: 'custom',
          title: ' ',
          odometerM: -1,
          costMinor: 1.5,
          note: 'x'.repeat(501),
        }),
        TODAY,
      ),
    ).toEqual({
      ok: false,
      issues: {
        servicedDate: 'in_future',
        title: 'required',
        odometerM: 'out_of_range',
        costMinor: 'out_of_range',
        note: 'too_long',
      },
    });
  });

  it('rejects a malformed date and an unknown type', () => {
    expect(
      validateService(input({ servicedDate: '28/10/2026', typeKey: 'oil' as never }), TODAY),
    ).toEqual({ ok: false, issues: { servicedDate: 'required', typeKey: 'invalid' } });
  });
});
