import { useMemo } from 'react';

import { getContainer } from '@/container';
import { localDateOf } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import {
  currentOdometerM,
  efficiencyFormatFor,
  vehicleStats,
  type VehicleStats,
} from '@/domain/vehicle-stats';

import { useVehicleFillUps } from '../../fill-up/hooks/use-vehicle-fill-ups';
import { useVehicleServices } from '../../services/hooks/use-vehicle-services';
import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';

export type DashboardStats = VehicleStats & {
  format: ReturnType<typeof efficiencyFormatFor>;
  odometerM: number;
  entries: number;
};

/** Dashboard numbers for a vehicle, recomputed whenever its fill-ups change. */
export function useVehicleStats(vehicle: Vehicle): DashboardStats | undefined {
  const fillUps = useVehicleFillUps(vehicle.id);
  const services = useVehicleServices(vehicle.id);
  const { units } = useUnitPreferences();
  return useMemo(() => {
    if (!fillUps || !services) return undefined;
    const format = efficiencyFormatFor(vehicle.fuelType, units);
    const stats = vehicleStats(fillUps, {
      format,
      distanceUnit: units.distanceUnit,
      today: localDateOf(getContainer().clock.now()),
      initialOdometerM: vehicle.initialOdometerM,
    });
    return {
      ...stats,
      format,
      odometerM: currentOdometerM([...fillUps, ...services], vehicle.initialOdometerM),
      entries: fillUps.length,
    };
  }, [fillUps, services, units, vehicle.fuelType, vehicle.initialOdometerM]);
}
