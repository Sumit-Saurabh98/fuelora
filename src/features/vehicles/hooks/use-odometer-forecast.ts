import { useMemo } from 'react';

import { getContainer } from '@/container';
import { averageDailyM } from '@/domain/distance-forecaster';
import { localDateOf } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import { currentOdometerM } from '@/domain/vehicle-stats';

import { useVehicleFillUps } from '../../fill-up/hooks/use-vehicle-fill-ups';
import { useVehicleServices } from '../../services/hooks/use-vehicle-services';

export type OdometerForecast = { currentOdometerM: number | null; avgDailyM: number | null };

/**
 * Current odometer (LLD §5.1) and recent daily distance (§5.2) from fill-ups and services with a
 * reading, kept live; `undefined` while loading.
 */
export function useOdometerForecast(vehicle: Vehicle | null): OdometerForecast | undefined {
  const fillUps = useVehicleFillUps(vehicle?.id ?? '');
  const services = useVehicleServices(vehicle?.id ?? '');
  return useMemo(() => {
    if (!vehicle) return { currentOdometerM: null, avgDailyM: null };
    if (!fillUps || !services) return undefined;
    const readings = [
      ...fillUps.map((f) => ({ date: f.localDate, odometerM: f.odometerM })),
      ...services.flatMap((s) =>
        s.odometerM === null ? [] : [{ date: s.servicedDate, odometerM: s.odometerM }],
      ),
    ];
    return {
      currentOdometerM: currentOdometerM([...fillUps, ...services], vehicle.initialOdometerM),
      avgDailyM: averageDailyM(readings, localDateOf(getContainer().clock.now())),
    };
  }, [vehicle, fillUps, services]);
}
