import { EfficiencyEngine, type EfficiencyFormat } from './efficiency';
import {
  CNG_EFFICIENCY_FORMATS,
  EV_EFFICIENCY_FORMATS,
  LIQUID_EFFICIENCY_FORMATS,
} from './efficiency-formats';
import { Money } from './money';
import { baseTo, type QuantityUnit } from './units';

// No-setup calculators (F-12, FR-19-21): nothing here is stored. Efficiency maths stays in
// EfficiencyEngine (AGENTS.md rule 5).

const engine = new EfficiencyEngine();

export type TripCost = {
  quantityBase: number;
  total: Money;
  /** Equal shares that add up exactly to the total (see splitEvenly). */
  perPerson: Money[];
};

/**
 * FR-19: fuel for a trip at a known efficiency, its cost at a unit price (major units per display
 * `unit`), and the split between `people` (default 1).
 */
export function tripCost(input: {
  distanceM: number;
  efficiency: number;
  format: EfficiencyFormat;
  unitPrice: number;
  unit: QuantityUnit;
  currency: string;
  people?: number;
}): TripCost | null {
  const quantityBase = engine.quantityFor(input.distanceM, input.efficiency, input.format);
  if (quantityBase === null || !(input.unitPrice >= 0) || !Number.isFinite(input.unitPrice)) {
    return null;
  }
  const total = Money.fromMajor(baseTo(quantityBase, input.unit) * input.unitPrice, input.currency);
  const shares = splitEvenly(total, input.people ?? 1);
  return shares ? { quantityBase, total, perPerson: shares } : null;
}

/**
 * Splits money into `people` shares that add up exactly: the leftover minor units go one each
 * to the first shares (₹100 / 3 → 33.34, 33.33, 33.33). Null for fewer than 1 or > 50 people.
 */
export function splitEvenly(total: Money, people: number): Money[] | null {
  if (!Number.isInteger(people) || people < 1 || people > 50) return null;
  const base = Math.floor(total.amountMinor / people);
  const extra = total.amountMinor - base * people;
  return Array.from({ length: people }, (_, i) =>
    Money.ofMinor(base + (i < extra ? 1 : 0), total.currency),
  );
}

export type EnergyKind = 'liquid' | 'cng' | 'electric';

/** FR-20: distance + quantity → efficiency in every format for that kind of energy. */
export function mileageInAllFormats(
  distanceM: number,
  quantityBase: number,
  kind: EnergyKind,
): { format: EfficiencyFormat; value: number }[] {
  const formats: readonly EfficiencyFormat[] =
    kind === 'cng'
      ? CNG_EFFICIENCY_FORMATS
      : kind === 'electric'
        ? EV_EFFICIENCY_FORMATS
        : LIQUID_EFFICIENCY_FORMATS;
  return formats.flatMap((format) => {
    const value = engine.value({ distanceM, quantityBase }, format);
    return value === null ? [] : [{ format, value }];
  });
}
