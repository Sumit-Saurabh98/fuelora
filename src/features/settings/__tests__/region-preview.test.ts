import { buildRegionPreview } from '../region-preview';

const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

function preview(region: 'IN' | 'US' | 'GB' | 'OTHER', language: 'en' | 'hi' = 'en') {
  const p = buildRegionPreview({
    region,
    language,
    deviceCurrency: 'EUR',
    deviceLanguageTag: 'de-DE',
  });
  return { ...p, sample: { ...p.sample, money: plain(p.sample.money) } };
}

describe('buildRegionPreview', () => {
  it('India: 100 km, 10 L, lakh grouping, PUC', () => {
    const p = preview('IN');
    expect(p.locale).toBe('en-IN');
    expect(p.sample).toEqual({ distance: '100', quantity: '10', money: '₹1,00,000.00' });
    expect(p.emissionNameKey).toBe('regionNames.emission.puc');
  });

  it('India in Hindi keeps Latin digits and lakh grouping', () => {
    const p = preview('IN', 'hi');
    expect(p.locale).toBe('hi-IN');
    expect(p.sample.money).toBe('₹1,00,000.00');
  });

  it('US: miles and US gallons', () => {
    const p = preview('US');
    expect(p.sample).toEqual({ distance: '62.1', quantity: '2.64', money: '$100,000.00' });
    expect(p.defaults.efficiencyLiquid).toBe('mpg_us');
  });

  it('UK: miles but litres, MOT', () => {
    const p = preview('GB');
    expect(p.sample).toEqual({ distance: '62.1', quantity: '10', money: '£100,000.00' });
    expect(p.emissionNameKey).toBe('regionNames.emission.mot');
  });

  it("Other: the device's currency and number style", () => {
    const p = preview('OTHER');
    expect(p.locale).toBe('de-DE');
    expect(p.sample).toEqual({ distance: '100', quantity: '10', money: '100.000,00 €' });
  });
});
