import type { TFunction } from 'i18next';

import { toCsv } from '@/domain/csv';
import type { FillUp } from '@/domain/fill-up';
import { Money } from '@/domain/money';
import type { ServiceEntry } from '@/domain/service-entry';
import type { UnitPreferences } from '@/domain/unit-preferences';
import { baseTo, metresTo } from '@/domain/units';
import type { Vehicle } from '@/domain/vehicle';

import { quantityUnitFor } from '../fill-up/fill-up-form-values';

/**
 * FR-18: one vehicle's fill-ups and services in the user's display units, oldest first, with a
 * header row. Plain numbers (no grouping) so spreadsheets can add them up.
 */
export function vehicleCsv(
  vehicle: Vehicle,
  fillUps: readonly FillUp[],
  services: readonly ServiceEntry[],
  ctx: { t: TFunction; units: UnitPreferences },
): string {
  const { t, units } = ctx;
  const dist = t(`units.${units.distanceUnit}`);
  const qtyUnit = quantityUnitFor(vehicle.fuelType, units);
  const round = (n: number, digits: number) => Number(n.toFixed(digits));
  const header = [
    t('csv.type'),
    t('csv.date'),
    t('csv.odometer', { unit: dist }),
    t('csv.quantity', { unit: t(`units.${qtyUnit}`) }),
    t('csv.amount'),
    t('csv.currency'),
    t('csv.full'),
    t('csv.missed'),
    t('csv.detail'),
    t('csv.note'),
  ];
  const fills = fillUps.map((f) => ({
    day: f.localDate,
    row: [
      t('csv.fillUp'),
      f.localDate,
      round(metresTo(f.odometerM, units.distanceUnit), 1),
      round(baseTo(f.quantityBase, qtyUnit), 3),
      Money.ofMinor(f.totalMinor, f.currency).major,
      f.currency,
      f.isFull ? t('csv.yes') : t('csv.no'),
      f.missedPrevious ? t('csv.yes') : t('csv.no'),
      f.station,
      f.note,
    ],
  }));
  const done = services.map((s) => ({
    day: s.servicedDate,
    row: [
      t('csv.service'),
      s.servicedDate,
      s.odometerM === null ? null : round(metresTo(s.odometerM, units.distanceUnit), 1),
      null,
      s.costMinor === null || s.currency === null
        ? null
        : Money.ofMinor(s.costMinor, s.currency).major,
      s.currency,
      null,
      null,
      s.typeKey === 'custom' ? s.title : t(`servicePresets.${s.typeKey}`),
      s.note,
    ],
  }));
  const rows = [...fills, ...done].sort((a, b) => a.day.localeCompare(b.day)).map((r) => r.row);
  return toCsv([header, ...rows]);
}

/** `fuelora-my-activa-2026-10-28.csv`: ASCII-only, so every app can open it. */
export function csvFileName(vehicle: Vehicle, today: string): string {
  const slug = vehicle.name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `fuelora-${slug || 'vehicle'}-${today}.csv`;
}
