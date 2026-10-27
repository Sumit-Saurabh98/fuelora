import type { Money } from './money';
import { quantityToBase, type QuantityUnit } from './units';

// How the user entered a fill-up (LLD §2 `entry_mode`): which two of quantity, price and total
// they typed, or money only ("₹200 of petrol"). Stored as text, so never rename a value.
export const ENTRY_MODES = ['qty_price', 'qty_total', 'price_total', 'amount_only'] as const;
export type EntryMode = (typeof ENTRY_MODES)[number];

/**
 * Quantity in base units from a total and a unit price per display unit, e.g. ₹200 at ₹104.50/L
 * → 1913.88 mL → 1914 (LLD §4.4 #8). Used by amount-only entry with the remembered price.
 * Null when there is no usable price.
 */
export function quantityFromTotal(
  total: Money,
  unitPrice: number,
  unit: QuantityUnit,
): number | null {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  return quantityToBase(total.major / unitPrice, unit);
}
