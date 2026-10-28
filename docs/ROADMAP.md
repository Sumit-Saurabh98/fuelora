# ROADMAP.md

Solo developer, vibe-coding mostly on weekends, ~12 weeks to launch on Android + iOS. Each phase ends with something demoable on a real phone.

## Phase 0 — Set up (Week 1)
- [x] Use Google's test ad unit IDs and a placeholder bundle ID (`com.fuelora.dev`) for dev builds (store setup is deferred to Phase 5 — KB §9)
- [x] Expo project scaffold: TypeScript strict, Expo Router, Paper theme, i18n (en/hi), ESLint/Prettier, Jest, GitHub Actions CI (workflow ready; runs once the repo is pushed to GitHub)
- [x] EAS dev builds: Android on own phone, iOS on the Simulator (KB #15)
- **Demo:** empty app with tabs, theme and language switch on the Android phone and the iOS Simulator

## Phase 1 — Core data & mileage (Weeks 2–4)

- [x] Drizzle schema + migrations + composition root (1.1–1.5: settings, vehicles, fill_ups; theme/language saved; Clock, UUID v7, AppError)
- [x] `units`, `money`, `regions` domain + tests (2.1–2.3)
- [x] Settings → Region: India / US / UK / Other with live units preview, saved (2.4)
- [x] Settings → Units: override currency, distance, volume, mileage formats; reset to region defaults (2.5, F-14)
- [x] Fix: shaded seam in Settings → Theme selector on iOS — replaced Paper SegmentedButtons with own `SegmentedControl` (device check passed)
- [x] `EfficiencyEngine` with all fixture cases (LLD §4.4) (3.1–3.2)
  - [x] 3.1 Engine: full-to-full segments, range-aware summary, all formats (km/L, L/100 km, mpg US/UK, km/kg, km/kWh, mi/kWh, kWh/100 km), cost per km/mi as Money per currency, amount-only quantity; all 11 fixtures
  - [x] 3.2 Plausibility warnings (LLD §4.2) + tank-capacity warning, ranges per KB #20
- [x] Onboarding (language, region, first vehicle) — Step 4 (decisions: KB #21)
  - [x] 4.1 Vehicle data layer: VehicleRepository (Drizzle + in-memory), VehicleService (create, list, current vehicle), validation + error codes
  - [x] 4.2 Onboarding shell: first launch opens onboarding until done; welcome + language screen ("no login, data stays on this phone"); dev-only "Reset app data" in Settings
  - [x] 4.3 Region screen: pre-selected from the phone, units preview, change if needed; shared onboarding frame (step dots, Back/Continue)
  - [x] 4.4 First vehicle screen: type, fuel, name, current odometer (+ optional details); saves, sets current vehicle, Home shows it; Skip for now. Onboarding layout: back arrow top-left, one full-width action, Skip under Save. iOS Intl crash fixed + guarded
  - [x] 4.5 Home "Add your first vehicle" button + add-vehicle screen (for users who skipped) — device check pending
- [x] Vehicles: add/edit/archive/delete, switcher — Step 5 (5.1–5.5 device check pending)
  - [x] 5.1 Data layer: update, archive/unarchive, delete with cascade; current vehicle moves to the next active one
  - [x] 5.2 Vehicles screen (active + archived, current badge) from Settings → Vehicles, "Add vehicle"
  - [x] 5.3 Edit vehicle screen (tap a vehicle in the list); untouched odometer/tank keep their exact stored values
  - [x] 5.4 Archive/restore + delete with typed-name confirmation (on the edit screen)
  - [x] 5.5 Vehicle switcher on top of Home (switch, add, manage); "all archived" state on Home
- [x] Fill-up entry: any-two-of-three, amount-only, full/partial, missed flag, validation, plausibility warnings — Step 6 (6.3–6.5 device check pending, new dev build needed)
  - [x] 6.1 Domain: FillUp type, any-two-of-three resolution (FR-9), field validation (no future dates, free charge allowed), odometer order by date + not below vehicle start (FR-7), localDate
  - [x] 6.2 Data layer: FillUpRepository + FillUpService (add/update/delete/latest, FR-7, archived vehicles read-only); vehicle edit rules once fill-ups exist (KB #24)
  - [x] 6.3 Fill-up entry screen (Home "Add fill-up" / "Add charge"): native date/time pickers, any two of three with live third value, full/missed toggles, station/note, pre-filled price + station, odometer order messages — needs a new dev build (native picker)
  - [x] 6.4 Amount-only mode: "Amount only" / "Fuel + amount" switch, two-wheelers default to amount only when a last price exists (KB #25)
  - [x] 6.5 Plausibility + tank warnings: "Does this look right?" with Check again / Save anyway (FR-8)
- [x] Result card + dashboard (last/avg efficiency, month spend, cost per distance) — Step 7 (device check pending)
  - [x] 7.1 Domain: result for a saved fill-up (segment / baseline / partial / missed) and vehicle stats (last, distance-weighted average, cost per distance, month spend + distance), all through EfficiencyEngine
  - [x] 7.2 Result card after saving: this tank's mileage, distance on fuel, cost per km/mi; or baseline / partial / missed explanation (FR-10)
  - [x] 7.3 Home dashboard: last + average mileage, cost per km/mi, this month's spend and distance; current odometer on the vehicle card
- [x] History list with edit/delete — Step 8 (device check pending)
  - [x] 8.1 History tab: current vehicle's fill-ups by month (newest first) with month spend; each entry shows date, total, odometer, quantity, station and its mileage / Partial / First full / Missed fill
  - [x] 8.2 Edit and delete a fill-up (tap an entry in History): same form, untouched odometer/amounts keep exact stored values, entry keeps its own currency, delete asks first; segments recomputed (FR-11)
- **Demo:** log ₹200 partial fills on a bike and a full-tank car fill in gallons; correct numbers

## Phase 2 — Services, reminders, notifications (Weeks 5–6)

- [x] Service log with presets per vehicle type — Step 9 (device check pending)
  - [x] 9.1 Domain: service presets with suggested intervals per vehicle column (bike / scooter / car / EV, KB §5), service record rules
  - [x] 9.2 Data layer: `services` table (migration 0002 + upgrade test), repository, ServiceLogService; services count toward the current odometer
  - [x] 9.3 Add service screen (small wrench button on Home): date, presets for the vehicle + Other with a name, optional odometer and cost, note
  - [x] 9.4 Services in History next to fill-ups (month header = everything spent); tap to edit or delete; service readings move the current odometer
- [ ] Reminders (date / distance / both, repeat, lead) + document presets + region names
- [ ] Distance forecaster + predicted dates
- [ ] `ReminderPlanner` + `NotificationScheduler` (60 budget, 09:00, overdue once), permission on first reminder
- [ ] Weekly nudge (toggle)
- [ ] First real-iPhone check (borrowed device, ad hoc dev build): notifications at 09:00 (KB #15)
- **Demo:** set insurance date and oil change at +300 km; notification arrives; log service → reminder rolls forward

## Phase 3 — Stats, calculators, backup (Weeks 7–8)

- [ ] Stats screen: efficiency line, monthly spend bars, cost per distance, ranges
- [ ] Calculators: trip cost, mileage, fuel split → "Track this vehicle"
- [ ] Backup export (JSON + CSV), restore with safety backup, monthly nudge
- [ ] Verify Android Auto Backup / iOS backup include the DB
- [ ] `.fuelora` backup file type: "Open in Fuelora" from WhatsApp/email/Drive/Files on both platforms (FR-23)
- [ ] After restore: notification permission prompt + reschedule when reminders exist (FR-24)
- [ ] Cross-platform restore tested both ways: Android → iOS and iOS → Android (FR-22)
- [ ] Android "Keep app data" on uninstall via a small config plugin; test uninstall-keep-reinstall (FR-25)
- [ ] Backup status row in Settings: "Last backup: N days ago" with warning color (FR-26)
- [ ] Nudge after 20 new entries since last export, max one nudge per 7 days (FR-27)
- **Demo:** export on the Android phone, send via WhatsApp, tap the file on the iPhone (Simulator), restore — everything matches, reminders notify

## Phase 4 — Ads, analytics, polish (Weeks 9–10)

- [ ] UMP consent + ATT; `AdsManager` with caps (ADS.md §2); banner, interstitial, app open
- [ ] Firebase Analytics allow-listed events; Sentry with scrubbing
- [ ] Hindi review by a native speaker; empty states; dark mode; font scaling; 360dp layouts
- [ ] Performance pass on a low-end Android (cold start, 1,500-entry history)
- [ ] Maestro flows for key journeys
- [ ] Real-iPhone check: consent + ATT prompt, ads, performance (KB #15)
- **Demo:** full app with test ads, consent form (via VPN/EEA debug geography), no ads on forms

## Phase 5 — Store & launch (Weeks 11–12)

- [ ] Decide the deferred items (KB §9): support email, Firebase project ID, final package name / bundle ID, reserve "Fuelora" in App Store Connect
- [ ] Firebase project (Hosting + Analytics); deploy `web/` with privacy, terms, support, app-ads.txt
- [ ] AdMob account + apps + real units (ADS.md §9)
- [ ] Store assets: icon, screenshots (EN + HI for Play; EN for App Store), feature graphic
- [ ] Listings, data safety, privacy label, content rating (PLAY_STORE.md, APP_STORE.md)
- [ ] app-ads.txt verified on `<project-id>.web.app`
- [ ] Play closed testing — **new personal developer accounts must run a closed test with ≥ 12 testers for 14 days before production** (applies to personal accounts created after Nov 2023 — check yours); TestFlight beta
- [ ] Production: Play staged rollout 10% → 100%; App Store release
- [ ] Launch posts (Instagram reels, YouTube shorts, bike/car groups, Reddit r/india etc.)
- **Demo:** live on both stores

## After launch (v1.1 → v2)

- Weeks 1–4: fix top review complaints; watch D1/D7 retention, entries/user/week, ARPDAU
- v1.1 candidates (pick by data): widget, document wallet, rider mode, expenses, trip-meter entry, more languages (REQUIREMENTS §2.2)
- Revisit KB proposals: remove-ads purchase (P-1), mediation (P-5)
