import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Reminder } from '@/domain/reminder';
import { EmptyState } from '@/ui/empty-state';

import { useCurrentOdometer } from '../../vehicles/hooks/use-current-odometer';
import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { useReminder } from '../hooks/use-reminder';
import { ReminderForm } from './reminder-form';

/** New reminder for a vehicle, or a person-level one (licence) when there is none. */
export function AddReminderScreen({ vehicleId }: { vehicleId?: string }) {
  const vehicle = useVehicle(vehicleId ?? '');
  const resolved = vehicleId ? vehicle : null;
  const odometerM = useCurrentOdometer(resolved ?? null);
  if (resolved === undefined || odometerM === undefined) return null; // loading
  return (
    <ReminderForm
      key={resolved?.id ?? 'person'}
      vehicle={resolved && !resolved.isArchived ? resolved : null}
      currentOdometerM={odometerM}
    />
  );
}

export function EditReminderScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const reminder = useReminder(id);
  const vehicle = useVehicle(reminder?.vehicleId ?? '');
  // The first loaded row; later live updates (incl. our own save or delete) don't reset the form.
  const [existing, setExisting] = useState<Reminder | null>(null);
  if (!existing && reminder) setExisting(reminder);
  const needsVehicle = Boolean(reminder?.vehicleId);
  const odometerM = useCurrentOdometer(needsVehicle ? (vehicle ?? null) : null);

  if (reminder === undefined || (reminder && !existing)) return null;
  if (needsVehicle && (vehicle === undefined || odometerM === undefined)) return null;
  if (!existing) {
    return (
      <EmptyState
        icon="bell-off-outline"
        title={t('fillUp.notFoundTitle')}
        body={t('fillUp.notFoundBody')}
      />
    );
  }
  return (
    <ReminderForm
      key={existing.id}
      vehicle={vehicle ?? null}
      currentOdometerM={odometerM ?? null}
      existing={existing}
    />
  );
}
