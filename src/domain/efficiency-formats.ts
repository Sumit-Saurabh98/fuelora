// Efficiency display formats (LLD §3). Ids are stored in settings, so never rename one.
// The maths lives in EfficiencyEngine (src/domain/efficiency.ts).
export const LIQUID_EFFICIENCY_FORMATS = ['km_per_l', 'l_per_100km', 'mpg_us', 'mpg_uk'] as const;
export type LiquidEfficiencyFormat = (typeof LIQUID_EFFICIENCY_FORMATS)[number];

export const CNG_EFFICIENCY_FORMATS = ['km_per_kg'] as const;
export type CngEfficiencyFormat = (typeof CNG_EFFICIENCY_FORMATS)[number];

export const EV_EFFICIENCY_FORMATS = ['km_per_kwh', 'mi_per_kwh', 'kwh_per_100km'] as const;
export type EvEfficiencyFormat = (typeof EV_EFFICIENCY_FORMATS)[number];
