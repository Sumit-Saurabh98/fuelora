import { useMemo } from 'react';

import type { Vehicle } from '@/domain/vehicle';
import { currentOdometerM } from '@/domain/vehicle-stats';

import { useVehicleFillUps } from '../../fill-up/hooks/use-vehicle-fill-ups';
import { useVehicleServices } from '../../services/hooks/use-vehicle-services';

/** Latest known odometer (LLD §5.1), kept live; `undefined` while loading. */
export function useCurrentOdometer(vehicle: Vehicle | null): number | null | undefined {
  const fillUps = useVehicleFillUps(vehicle?.id ?? '');
  const services = useVehicleServices(vehicle?.id ?? '');
  return useMemo(() => {
    if (!vehicle) return null;
    if (!fillUps || !services) return undefined;
    return currentOdometerM([...fillUps, ...services], vehicle.initialOdometerM);
  }, [vehicle, fillUps, services]);
}
