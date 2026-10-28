import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { regionNameKey, type Region } from '@/domain/regions';
import type { FuelType, Vehicle, VehicleType } from '@/domain/vehicle';

export const VEHICLE_TYPE_ICONS: Record<VehicleType, keyof typeof MaterialCommunityIcons.glyphMap> =
  {
    bike: 'motorbike',
    scooter: 'moped',
    car: 'car',
    other: 'truck-outline',
  };

/** i18n key for a fuel; petrol has a region name ("Gas / Gasoline" in the US). */
export function fuelLabelKey(fuel: FuelType, region: Region): string {
  return fuel === 'petrol' ? regionNameKey(region, 'fuel') : `vehicleForm.fuels.${fuel}`;
}

/** "Honda · Activa 6G · 2023", or '' when none of them were entered. */
export function vehicleDetails(vehicle: Pick<Vehicle, 'make' | 'model' | 'year'>): string {
  return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' · ');
}
