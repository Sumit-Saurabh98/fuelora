import type { FillUp } from '@/domain/fill-up';
import { regionDefaults } from '@/domain/regions';
import type { ServiceEntry } from '@/domain/service-entry';
import type { Vehicle } from '@/domain/vehicle';
import { i18n } from '@/i18n/i18n';

import { csvFileName, vehicleCsv } from '../vehicle-csv';

const vehicle = { id: 'v1', name: 'My Activa (2023)', fuelType: 'petrol' } as Vehicle;
const fill = {
  localDate: '2026-10-01',
  odometerM: 12_100_000,
  quantityBase: 1914,
  totalMinor: 20_000,
  currency: 'INR',
  isFull: false,
  missedPrevious: false,
  station: 'HP, Indiranagar',
  note: null,
} as FillUp;
const service = {
  servicedDate: '2026-10-12',
  odometerM: null,
  typeKey: 'engine_oil',
  title: null,
  costMinor: 45_000,
  currency: 'INR',
  note: null,
} as ServiceEntry;

describe('vehicleCsv (FR-18)', () => {
  it('display units, oldest first, plain numbers, quoted where needed', async () => {
    await i18n.changeLanguage('en');
    const csv = vehicleCsv(vehicle, [fill], [service], {
      t: i18n.t,
      units: regionDefaults('IN', 'INR'),
    });
    expect(csv.split('\r\n')).toEqual([
      '\ufeffType,Date,Odometer (km),Quantity (L),Amount,Currency,Full tank,Missed before,Station / service,Note',
      'Fill-up,2026-10-01,12100,1.914,200,INR,no,no,"HP, Indiranagar",',
      'Service,2026-10-12,,,450,INR,,,Engine oil change,',
      '',
    ]);
  });

  it('US gallons and miles', async () => {
    await i18n.changeLanguage('en');
    const csv = vehicleCsv(vehicle, [fill], [], { t: i18n.t, units: regionDefaults('US', 'USD') });
    expect(csv).toContain('Odometer (mi),Quantity (US gal)');
    expect(csv).toContain(',7518.6,0.506,'); // 7,518.59 mi, 0.5056 gal
  });

  it('ASCII file name', () => {
    expect(csvFileName(vehicle, '2026-10-28')).toBe('fuelora-my-activa-2023-2026-10-28.csv');
    expect(csvFileName({ ...vehicle, name: 'मेरी स्कूटी' }, '2026-10-28')).toBe(
      'fuelora-vehicle-2026-10-28.csv',
    );
  });
});
