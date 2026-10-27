// How the user entered a fill-up (LLD §2 `entry_mode`): which two of quantity, price and total
// they typed, or money only ("₹200 of petrol"). Stored as text, so never rename a value.
export const ENTRY_MODES = ['qty_price', 'qty_total', 'price_total', 'amount_only'] as const;
export type EntryMode = (typeof ENTRY_MODES)[number];
