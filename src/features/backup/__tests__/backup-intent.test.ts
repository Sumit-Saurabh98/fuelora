import { restorePathFor } from '../backup-intent';

describe('restorePathFor (FR-23)', () => {
  it('Android content and iOS file URLs open the restore summary', () => {
    expect(restorePathFor('content://com.whatsapp.provider/media/fuelora-backup.fuelora')).toBe(
      '/restore?uri=content%3A%2F%2Fcom.whatsapp.provider%2Fmedia%2Ffuelora-backup.fuelora',
    );
    expect(
      restorePathFor('file:///private/var/mobile/Inbox/fuelora-backup-2026-10-28.fuelora'),
    ).toMatch(/^\/restore\?uri=file%3A/);
  });

  it('app links stay normal routes', () => {
    expect(restorePathFor('fuelora://reminders')).toBeNull();
    expect(restorePathFor('/history')).toBeNull();
    expect(restorePathFor(null)).toBeNull();
  });
});
