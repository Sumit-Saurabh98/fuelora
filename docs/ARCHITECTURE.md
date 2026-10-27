# ARCHITECTURE.md — High-Level Design (HLD)

## 1. Architecture style

**Offline-first single mobile app.** One Expo (React Native) codebase for Android and iOS. All business logic and data live on the device in SQLite. There is no backend we operate (KB #3).

Why: zero hosting cost, no account friction, privacy as a selling point, and one solo developer can own everything.

## 2. System context

```
                ┌──────────────────────── Phone ────────────────────────┐
                │                                                        │
   User ───────▶│  Fuelora app (Expo RN)                                 │
                │   ├─ UI (Expo Router screens, React Native Paper)       │
                │   ├─ Services + Domain (pure TS)                        │
                │   ├─ SQLite (expo-sqlite + Drizzle)  ◀── OS backup ────┼──▶ Google account / iCloud (user's own)
                │   ├─ Local notifications (expo-notifications)          │
                │   └─ Share sheet / document picker  ───────────────────┼──▶ Files, Drive, WhatsApp (user-initiated)
                │                                                        │
                └───────┬───────────────┬───────────────┬───────────────┘
                        │ ads            │ events        │ crashes
                        ▼                ▼               ▼
                   Google AdMob    Firebase Analytics   Sentry
                   + UMP consent   (allow-listed)       (scrubbed)

   Firebase Hosting (static, free *.web.app): privacy, terms, support, app-ads.txt
```

## 3. Components

| Component                         | Responsibility                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes (`app/`)                   | Navigation and screen layout only                                                                                                                             |
| Feature hooks (`src/features/*`)  | Read via `useLiveQuery`, call services for writes, map errors to i18n                                                                                         |
| Services (`src/services`)         | Use cases: `VehicleService`, `FillUpService`, `ServiceLogService`, `ReminderService`, `StatsService`, `BackupService`, `CalculatorService`, `SettingsService` |
| Domain (`src/domain`)             | Pure rules: `units`, `money`, `EfficiencyEngine`, `ReminderPlanner`, `DistanceForecaster`, `presets`, `regions`                                               |
| Repositories (`src/repositories`) | Interfaces + Drizzle implementations per aggregate                                                                                                            |
| `NotificationScheduler`           | Turns planner output into OS notifications; enforces the 60-notification budget                                                                               |
| `AdsManager`                      | Consent state, preload, caps, placement checks (ADS.md)                                                                                                       |
| `Analytics`                       | Allow-listed events → Firebase Analytics; no-op in tests                                                                                                      |
| `container.ts`                    | Composition root: builds everything once at startup                                                                                                           |

## 4. Key flows

### 4.1 First launch

1. Splash → init SQLite, run migrations (`useMigrations`).
2. Onboarding: language → region (from `expo-localization`) → add first vehicle.
3. After onboarding: run UMP consent (and ATT on iOS through UMP's IDFA message) → initialize Mobile Ads SDK. No ads in this session (ADS.md §3).

### 4.2 Add fill-up (the core loop)

1. User opens the entry sheet from the dashboard FAB; fields pre-filled (date now, last unit price, last station, full = on).
2. Live computation of the missing third value (quantity / price / total).
3. Save → `FillUpService.add()`:
   - validate odometer ordering (repository query for neighbours),
   - insert in a transaction,
   - `EfficiencyEngine` recomputes the affected segment,
   - `ReminderService.replan(vehicleId)` → `NotificationScheduler.sync()`,
   - analytics `fill_up_added { fuel_type, is_full, entry_mode }` (no values).
4. Result card: segment efficiency or "Partial fill — mileage shows after your next full tank".
5. On closing the result card, `AdsManager.maybeShowInterstitial('after_save')` (caps apply).

### 4.3 Reminders and notifications

- `ReminderPlanner` (pure) takes reminders + current odometer + forecast → list of desired notifications (id, fire time, text key, params).
- `NotificationScheduler.sync()` diffs desired vs. scheduled (stored ids) and schedules/cancels. Runs on: app foreground, any data change, settings change, and once per day if the app is opened.
- Budget: max 60 scheduled; priority = soonest first. Notifications fire at 09:00 local.
- Android: inexact daily-time triggers (no exact-alarm permission). Boot persistence handled by expo-notifications.

### 4.4 Backup and restore

- **OS backup (automatic, free):** Android Auto Backup includes the app's database directory (≤ 25 MB quota); iOS device backups include the app's Documents directory where expo-sqlite stores the DB. Not guaranteed (user may disable), hence manual backup too.
- **Manual export:** `BackupService.export()` → JSON (LLD §7) written with `expo-file-system` → `expo-sharing` share sheet (Drive, Files, WhatsApp, email).
- **Restore:** `expo-document-picker` → parse + validate + migrate older `schemaVersion` → summary → safety export to app cache → replace all in one transaction → if active reminders and no notification permission on this device, ask (FR-24) → `NotificationScheduler.sync()`.
- **Open from other apps:** the `.fuelora` file type is registered (iOS document type / UTI, Android intent filter for `VIEW`) so tapping a backup in WhatsApp, email, Drive or Files opens Fuelora on the restore summary (FR-23). Same restore path as the picker.
- **Cross-platform:** the backup holds only canonical values, so Android → iOS and back is the same restore (FR-22). OS backups (Auto Backup / iCloud) don't cross platforms; the file is the only way to switch.
- Monthly in-app nudge if the last export is older than 30 days and there are ≥ 5 entries.

### 4.5 Ads and consent

See `docs/ADS.md`. Summary: consent first; the SDK initializes only after consent info is gathered; ads load in the background; any ad failure is silent.

## 5. Data storage

- SQLite (WAL mode) via expo-sqlite; schema and migrations by Drizzle (LLD §2).
- Small key-value state (ad caps, last export date, onboarding flags, last-shown nudges) in MMKV — never user content that must survive restore. Settings that should travel with backups live in the SQLite `settings` table.

## 6. Privacy & security

- No accounts, no user content on any server. This is a store-listing feature ("Your data stays on your phone").
- Analytics: allow-listed event names and enum params only (KB §7). No vehicle names, plates, amounts, notes, stations.
- Sentry: `beforeSend` strips breadcrumbs with user input; no screenshots; no PII.
- Backup files are plain JSON the user controls; the app warns that anyone with the file can read it.
- Ads: personalized only with consent; non-personalized otherwise (UMP handles).

## 7. Performance

- Indexes on `(vehicle_id, odometer_m)` and `(vehicle_id, local_date)`.
- Efficiency segments computed in the engine from a vehicle's ordered entries (cheap at ≤ 2,000 rows); memoized per vehicle and invalidated on change. Precomputed columns only if profiling shows a need.
- Charts get pre-aggregated series (monthly buckets) from `StatsService`.
- Avoid heavy JS on startup: lazy-load charts and calculators.

## 8. Release & updates

- EAS Build for store binaries; EAS Submit to Play/App Store.
- EAS Update (OTA) for JS-only fixes; native changes (SDK bump, new permission) go through store review.
- Channels: `development`, `preview` (internal testing tracks / TestFlight), `production`.
- Staged rollout on Play (10% → 50% → 100%).

## 9. Observability

- Sentry: crashes, JS errors, release health.
- Firebase Analytics: retention cohorts, funnel (onboarding → first fill-up → second fill-up → reminder created), linked to AdMob for ARPDAU.
- Play Console / App Store Connect: installs, uninstalls, ratings, vitals (ANR rate < 0.47%, crash rate < 1.09% — Play bad-behavior thresholds).

## 10. Website (Firebase Hosting)

Static files in `web/`, deployed with `firebase deploy --only hosting` to the free `PROJECT_ID.web.app` subdomain (KB #4). Pages: `index.html` (what Fuelora is + store badges), `privacy.html`, `terms.html`, `support.html`, and `app-ads.txt` at the root. That URL is the developer website in both store listings so AdMob can verify `app-ads.txt`.
