import { useTranslation } from 'react-i18next';

import { getContainer } from '@/container';
import { localDateOf } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { csvFileName, vehicleCsv } from '../vehicle-csv';

export function useBackupActions() {
  const { t } = useTranslation();
  const { units } = useUnitPreferences();
  const c = () => getContainer();
  return {
    exportBackup: () => c().backupService.exportBackup(t('backup.shareTitle')),
    exportCsv: async (vehicle: Vehicle) => {
      const [fillUps, services] = await Promise.all([
        c().fillUpService.listByVehicle(vehicle.id),
        c().serviceLogService.listByVehicle(vehicle.id),
      ]);
      const today = localDateOf(c().clock.now());
      await c().backupService.exportCsv(
        csvFileName(vehicle, today),
        vehicleCsv(vehicle, fillUps, services, { t, units }),
        t('backup.shareTitle'),
      );
    },
  };
}
