import type { EvEfficiencyFormat, LiquidEfficiencyFormat } from './efficiency-formats';
import type { DistanceUnit, VolumeUnit } from './units';

// Region drives currency, units and the names of documents (LLD §3, KB §4).
// Ids are stored in settings, so never rename one.
export const REGIONS = ['IN', 'US', 'GB', 'OTHER'] as const;
export type Region = (typeof REGIONS)[number];

export function isRegion(value: unknown): value is Region {
  return REGIONS.some((r) => r === value);
}

/** Device country (ISO 3166 alpha-2) → region; anything we don't special-case is OTHER. */
export function regionFromCountry(countryCode: string | null | undefined): Region {
  const code = countryCode?.toUpperCase();
  return code === 'IN' || code === 'US' || code === 'GB' ? code : 'OTHER';
}

export type RegionDefaults = {
  currency: string;
  distanceUnit: DistanceUnit;
  volumeUnit: VolumeUnit;
  efficiencyLiquid: LiquidEfficiencyFormat;
  efficiencyEv: EvEfficiencyFormat;
};

const DEFAULTS: Record<Exclude<Region, 'OTHER'>, RegionDefaults> = {
  IN: {
    currency: 'INR',
    distanceUnit: 'km',
    volumeUnit: 'L',
    efficiencyLiquid: 'km_per_l',
    efficiencyEv: 'km_per_kwh',
  },
  US: {
    currency: 'USD',
    distanceUnit: 'mi',
    volumeUnit: 'gal_us',
    efficiencyLiquid: 'mpg_us',
    efficiencyEv: 'mi_per_kwh',
  },
  // UK drivers buy fuel in litres but talk about mpg (imperial).
  GB: {
    currency: 'GBP',
    distanceUnit: 'mi',
    volumeUnit: 'L',
    efficiencyLiquid: 'mpg_uk',
    efficiencyEv: 'mi_per_kwh',
  },
};

/**
 * Defaults for a region. OTHER uses the device's currency (passed in: the domain has no locale
 * access) with metric units and the European L/100km convention.
 */
export function regionDefaults(region: Region, deviceCurrency: string): RegionDefaults {
  if (region !== 'OTHER') return DEFAULTS[region];
  return {
    currency: deviceCurrency,
    distanceUnit: 'km',
    volumeUnit: 'L',
    efficiencyLiquid: 'l_per_100km',
    efficiencyEv: 'kwh_per_100km',
  };
}

// Region-specific names (KB §4). These are i18n key suffixes, not text: the strings live in
// en.json / hi.json under `regionNames.<concept>.<key>` (AGENTS.md rule 9).
export type RegionNames = {
  emission: 'puc' | 'mot' | 'smog' | 'emissionTest';
  registration: 'rcRenewal' | 'roadTax' | 'registrationRenewal' | 'registration';
  insurance: 'insurance';
  licence: 'drivingLicence' | 'driversLicense';
  fuel: 'petrol' | 'gasoline';
};

const NAMES: Record<Region, RegionNames> = {
  IN: {
    emission: 'puc',
    registration: 'rcRenewal',
    insurance: 'insurance',
    licence: 'drivingLicence',
    fuel: 'petrol',
  },
  GB: {
    emission: 'mot',
    registration: 'roadTax',
    insurance: 'insurance',
    licence: 'drivingLicence',
    fuel: 'petrol',
  },
  US: {
    emission: 'smog',
    registration: 'registrationRenewal',
    insurance: 'insurance',
    licence: 'driversLicense',
    fuel: 'gasoline',
  },
  OTHER: {
    emission: 'emissionTest',
    registration: 'registration',
    insurance: 'insurance',
    licence: 'drivingLicence',
    fuel: 'petrol',
  },
};

export function regionNames(region: Region): RegionNames {
  return NAMES[region];
}

/** Full i18n key for a region name, e.g. regionNameKey('IN', 'emission') → 'regionNames.emission.puc'. */
export function regionNameKey(region: Region, concept: keyof RegionNames): string {
  return `regionNames.${concept}.${NAMES[region][concept]}`;
}
