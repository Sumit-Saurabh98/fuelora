import { regionDefaults, type Region } from '@/domain/regions';
import { resolveUnits, type UnitOverrides } from '@/domain/unit-preferences';

import { buildUnitsPreview } from '../units-preview';

const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

function preview(region: Region, locale: string, overrides: UnitOverrides = {}) {
  const units = resolveUnits(regionDefaults(region, 'EUR'), overrides);
  const p = buildUnitsPreview({ region, units, locale });
  return { ...p, sample: { ...p.sample, money: plain(p.sample.money) } };
}

describe('buildUnitsPreview', () => {
  it('India: 100 km, 10 L, lakh grouping, PUC', () => {
    const p = preview('IN', 'en-IN');
    expect(p.sample).toEqual({ distance: '100', quantity: '10', money: '₹1,00,000.00' });
    expect(p.emissionNameKey).toBe('regionNames.emission.puc');
  });

  it('India in Hindi keeps Latin digits and lakh grouping', () => {
    expect(preview('IN', 'hi-IN').sample.money).toBe('₹1,00,000.00');
  });

  it('US: miles and US gallons', () => {
    expect(preview('US', 'en-US').sample).toEqual({
      distance: '62.1',
      quantity: '2.64',
      money: '$100,000.00',
    });
  });

  it('UK: miles but litres, MOT', () => {
    const p = preview('GB', 'en-GB');
    expect(p.sample).toEqual({ distance: '62.1', quantity: '10', money: '£100,000.00' });
    expect(p.emissionNameKey).toBe('regionNames.emission.mot');
  });

  it("Other: the device's currency and number style", () => {
    expect(preview('OTHER', 'de-DE').sample).toEqual({
      distance: '100',
      quantity: '10',
      money: '100.000,00 €',
    });
  });

  it('follows overrides: India with miles, UK gallons and euros', () => {
    expect(
      preview('IN', 'en-IN', { distanceUnit: 'mi', volumeUnit: 'gal_uk', currency: 'EUR' }).sample,
    ).toEqual({ distance: '62.1', quantity: '2.2', money: '€1,00,000.00' });
  });
});
