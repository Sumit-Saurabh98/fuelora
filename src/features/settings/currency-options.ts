// Currencies offered in Settings: the user's region and device currency first, then common ones
// for our markets (KB §1). Any ISO code from the device is accepted even if not listed here.
const COMMON = [
  'INR',
  'USD',
  'GBP',
  'EUR',
  'AED',
  'SAR',
  'PKR',
  'BDT',
  'NPR',
  'LKR',
  'IDR',
  'PHP',
  'THB',
  'MYR',
  'SGD',
  'JPY',
  'CAD',
  'AUD',
  'NZD',
  'ZAR',
] as const;

export function currencyOptions(current: string, regionCurrency: string, device: string): string[] {
  return [...new Set([current, regionCurrency, device, ...COMMON])];
}
