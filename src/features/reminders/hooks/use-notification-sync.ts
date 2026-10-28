import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { getContainer } from '@/container';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { onNotificationSyncRequest, requestNotificationSync } from '../notification-sync-requests';
import { notificationTexts } from '../notification-texts';

// Tables whose changes can move a reminder or its forecast (AGENTS.md rule 8).
const WATCHED = new Set(['reminders', 'fill_ups', 'services', 'vehicles']);
const DEBOUNCE_MS = 1000;

/**
 * Keeps scheduled notifications in step with the data: on start, when the app comes to the
 * foreground, after any change to reminders / fill-ups / services / vehicles, and when the
 * language, region or units change. Mounted once, inside the onboarded app.
 */
export function useNotificationSync(): void {
  const { t } = useTranslation();
  const { units, locale, region } = useUnitPreferences();
  const texts = useMemo(
    () => notificationTexts({ t, units, locale, region }),
    [t, units, locale, region],
  );
  const textsRef = useRef(texts);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    // Show reminders as a banner even while the app is open.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // Scheduling problems must never break the app; the in-app list still shows everything.
        getContainer()
          .reminderNotifications.sync(textsRef.current)
          .catch(() => undefined);
      }, DEBOUNCE_MS);
    };
    const unsubscribe = onNotificationSyncRequest(run);
    run();
    const db = addDatabaseChangeListener((event) => {
      if (WATCHED.has(event.tableName)) run();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      db.remove();
      app.remove();
    };
  }, []);

  // New words (language, region names, date format) reschedule with the new text.
  useEffect(() => {
    textsRef.current = texts;
    requestNotificationSync();
  }, [texts]);

  useEffect(() => {
    void getContainer().notificationGateway.ensureChannel(t('notifications.channel'));
  }, [t]);

  // Tapping a reminder notification opens the Reminders tab.
  useEffect(() => {
    const id = lastResponse?.notification.request.identifier;
    if (!id || handled.current === id) return;
    handled.current = id;
    router.navigate('/reminders');
  }, [lastResponse]);
}
