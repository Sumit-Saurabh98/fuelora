import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';

import {
  isRegion,
  regionDefaults,
  regionFromCountry,
  regionNameKey,
  regionNames,
  REGIONS,
  type RegionNames,
} from '../regions';

describe('regionDefaults (LLD §3)', () => {
  it('India: INR, km, litres, km/L', () => {
    expect(regionDefaults('IN', 'EUR')).toEqual({
      currency: 'INR',
      distanceUnit: 'km',
      volumeUnit: 'L',
      efficiencyLiquid: 'km_per_l',
      efficiencyEv: 'km_per_kwh',
    });
  });

  it('US: USD, miles, US gallons, mpg (US)', () => {
    expect(regionDefaults('US', 'EUR')).toMatchObject({
      currency: 'USD',
      distanceUnit: 'mi',
      volumeUnit: 'gal_us',
      efficiencyLiquid: 'mpg_us',
    });
  });

  it('UK: GBP, miles, litres for entry, mpg (UK) for display', () => {
    expect(regionDefaults('GB', 'EUR')).toMatchObject({
      currency: 'GBP',
      distanceUnit: 'mi',
      volumeUnit: 'L',
      efficiencyLiquid: 'mpg_uk',
    });
  });

  it('Other: device currency, km, litres, L/100km', () => {
    expect(regionDefaults('OTHER', 'EUR')).toEqual({
      currency: 'EUR',
      distanceUnit: 'km',
      volumeUnit: 'L',
      efficiencyLiquid: 'l_per_100km',
      efficiencyEv: 'kwh_per_100km',
    });
  });
});

describe('regionFromCountry', () => {
  it.each([
    ['IN', 'IN'],
    ['in', 'IN'],
    ['US', 'US'],
    ['GB', 'GB'],
    ['DE', 'OTHER'],
    ['AE', 'OTHER'],
    [null, 'OTHER'],
    [undefined, 'OTHER'],
  ])('%p → %p', (country, region) => {
    expect(regionFromCountry(country)).toBe(region);
  });

  it('validates stored ids', () => {
    expect(isRegion('IN')).toBe(true);
    expect(isRegion('FR')).toBe(false);
  });
});

describe('regionNames (KB §4)', () => {
  it('uses PUC / RC in India, MOT / road tax in the UK, smog check / gas in the US', () => {
    expect(regionNames('IN')).toMatchObject({ emission: 'puc', registration: 'rcRenewal' });
    expect(regionNames('GB')).toMatchObject({ emission: 'mot', registration: 'roadTax' });
    expect(regionNames('US')).toMatchObject({
      emission: 'smog',
      licence: 'driversLicense',
      fuel: 'gasoline',
    });
    expect(regionNames('OTHER')).toMatchObject({ emission: 'emissionTest' });
  });

  it('builds full i18n keys', () => {
    expect(regionNameKey('IN', 'emission')).toBe('regionNames.emission.puc');
  });

  it('has text for every name in English and Hindi', () => {
    const concepts: (keyof RegionNames)[] = [
      'emission',
      'registration',
      'insurance',
      'licence',
      'fuel',
    ];
    const lookup = (dict: unknown, key: string) =>
      key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict);
    for (const region of REGIONS) {
      for (const concept of concepts) {
        const key = regionNameKey(region, concept);
        expect({ key, en: typeof lookup(en, key) }).toEqual({ key, en: 'string' });
        expect({ key, hi: typeof lookup(hi, key) }).toEqual({ key, hi: 'string' });
      }
    }
  });
});
