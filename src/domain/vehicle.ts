// Allowed values from REQUIREMENTS F-02 / LLD §2. Stored as text, so never rename a value;
// adding one is safe.
export const VEHICLE_TYPES = ['bike', 'scooter', 'car', 'other'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'lpg', 'electric'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
