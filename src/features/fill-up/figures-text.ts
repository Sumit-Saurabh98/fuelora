import type { TFunction } from 'i18next';

import type { EfficiencyFormat } from '@/domain/efficiency';
import type { Money } from '@/domain/money';
import type { UnitPreferences } from '@/domain/unit-preferences';
import { baseTo, metresTo } from '@/domain/units';
import type { FuelType } from '@/domain/vehicle';
import { formatFixed, formatNumber } from '@/ui/format';

import { quantityUnitFor } from './fill-up-form-values';

// Display text for engine output; no maths beyond unit conversion for display (rule 3, rule 5).
type Ctx = { t: TFunction; units: UnitPreferences; locale: string };

/** "40.0 km/L"; "—" when there is no number. */
export function efficiencyText(value: number | null, format: EfficiencyFormat, ctx: Ctx): string {
  if (value === null) return '—';
  // Efficiency always shows one decimal (LLD §3).
  return `${formatFixed(value, ctx.locale, 1)} ${ctx.t(`efficiencyFormats.${format}`)}`;
}

export function distanceText(distanceM: number, ctx: Ctx): string {
  const unit = ctx.units.distanceUnit;
  return `${formatNumber(metresTo(distanceM, unit), ctx.locale, 0)} ${ctx.t(`units.${unit}`)}`;
}

export function quantityText(quantityBase: number, fuel: FuelType, ctx: Ctx): string {
  const unit = quantityUnitFor(fuel, ctx.units);
  return `${formatNumber(baseTo(quantityBase, unit), ctx.locale, 2)} ${ctx.t(`units.${unit}`)}`;
}

/** "₹2.50 per km" (several currencies joined for a traveller); '' when there is none. */
export function costPerDistanceText(amounts: readonly Money[], ctx: Ctx): string {
  if (amounts.length === 0) return '';
  const per = ctx.t(`units.${ctx.units.distanceUnit}`);
  return amounts
    .map((m) => ctx.t('stats.perDistance', { cost: m.format(ctx.locale), unit: per }))
    .join(' · ');
}
