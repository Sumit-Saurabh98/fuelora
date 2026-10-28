# KNOWLEDGE_BASE.md

The "why" behind the product. Read this before changing business logic.

## 1. Market context

- Fuel-log apps are an established category: **Fuelio** (largest, Android + iOS), **Drivvo**, **Simply Auto**, **Fuelly**, and many newer offline trackers (**Tankly**, **FuelNest**, **MileageMate**, **Garagely**). Demand is proven; the category is not empty.
- In India, document/renewal reminders are also covered by big vehicle apps (**CarInfo**, **Park+**, insurer apps) — but those are RC-lookup / insurance-sales funnels, not fuel logs.
- Common complaints in competitor reviews: wrong mileage after partial fills, slow multi-field entry, confusing stats, data lost on phone change, aggressive ads/paywalls, US-centric units.
- **Our wedge:** fastest entry (amount-only mode for "₹200 petrol"), correct partial-fill math, bike/scooter-first design that also handles cars and EVs, region-aware names (PUC/MOT/emissions), fully offline + no login, fair ads.
- Real competitor is still **habit**: most two-wheeler owners track nothing. Calculators (F-12) and reminders are how we reach them.
- Pitch: _"Your real mileage and every renewal, in one offline app."_

## 2. Glossary

| Term                 | Meaning                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Vehicle              | A bike, scooter, car or other vehicle the user owns. All data belongs to a vehicle (except person-level reminders such as a driving licence). |
| Fill-up              | One purchase of fuel or one charging session: odometer, quantity, total cost, full or partial. UI calls it "Fill-up" (or "Charge" for EVs).   |
| Full fill            | Tank filled to the top (or battery charged to the user's usual full level). Closes a segment.                                                 |
| Partial fill         | Not to the top. Its quantity counts toward the next segment.                                                                                  |
| Missed fill-up       | User forgot to log one or more fill-ups before this one. Breaks the segment so no wrong number is shown.                                      |
| Segment              | Distance and fuel between two consecutive full fills. The unit of efficiency.                                                                 |
| Efficiency / mileage | Distance per quantity (km/L, mpg, km/kWh…) or quantity per distance (L/100km, kWh/100km). Indians say "mileage".                              |
| Amount-only entry    | User enters only total money + odometer; quantity is derived from the remembered unit price.                                                  |
| Reminder             | Something due by date and/or odometer: service, document renewal, custom.                                                                     |
| Lead                 | How early to warn (default 7 days / 300 km).                                                                                                  |
| Region               | Country setting that drives currency, units and names (PUC vs MOT vs emissions).                                                              |
| Base unit            | Stored quantity unit: mL (liquid), g (CNG), Wh (electric).                                                                                    |

## 3. Business rules (source of truth)

### Entries

- Odometer is required on every fill-up and must increase with time per vehicle (FR-7). Duplicate odometer on the same vehicle is rejected, and so is a reading below the vehicle's starting odometer (#24).
- Fill-up dates can't be more than a few minutes in the future. A total of 0 is allowed (free charging).
- Any two of quantity / unit price / total → third computed; stored values are total (minor units) and quantity (base units). Unit price is derived for display.
- Full tank defaults **on**. "Missed previous" defaults **off** and is explained in one line.
- Plausibility warnings use the ranges in LLD §4.2; never block a save on plausibility.
- Currency on each fill-up = settings currency at entry time. Changing the app currency later does not convert old entries; mixed-currency totals show per currency (rare: travellers).

### Efficiency

- Only full-to-full segments produce numbers; averages are distance-weighted (LLD §4).
- Never show an efficiency from a single entry or from partials alone.
- Never show "mileage boost" tips or claims.

### Reminders

- Service presets have **suggested** intervals (§5), always editable, labelled as suggestions — not manufacturer advice.
- Notifications fire at 09:00 local; at most one notification per reminder per day; overdue only once (3 days after due).
- Weekly nudge: Sunday 10:00 only if no entry in the last 7 days; one tap in the notification settings turns it off.
- Never more than 60 scheduled notifications (iOS limit 64).

### Data & privacy

- No account, no server copy. Store listing and onboarding say so plainly.
- Restore replaces everything after an automatic safety backup.
- Analytics events are allow-listed (§7); no free text, no amounts, no names.

### Ads

- Ads never appear on onboarding, entry/edit forms, backup/restore, or in the first session. Full rules in `docs/ADS.md`.

## 4. Region naming

| Concept              | IN              | GB              | US                     | Default         |
| -------------------- | --------------- | --------------- | ---------------------- | --------------- |
| Emission certificate | PUC             | MOT             | Emissions / smog check | Emission test   |
| Registration         | RC renewal      | Road tax (VED)  | Registration renewal   | Registration    |
| Insurance            | Insurance       | Insurance       | Insurance              | Insurance       |
| Licence              | Driving licence | Driving licence | Driver's license       | Driving licence |
| Fuel name            | Petrol          | Petrol          | Gas / Gasoline         | Petrol          |

## 5. Service presets (suggested defaults, editable)

| Key               | Bike               | Scooter            | Car                | EV (2W/car)               |
| ----------------- | ------------------ | ------------------ | ------------------ | ------------------------- |
| `general_service` | 3,000 km / 3 mo    | 3,000 km / 3 mo    | 10,000 km / 12 mo  | 10,000 km / 12 mo         |
| `engine_oil`      | 3,000 km / 6 mo    | 3,000 km / 6 mo    | 10,000 km / 12 mo  | —                         |
| `oil_filter`      | 6,000 km           | 6,000 km           | 10,000 km          | —                         |
| `air_filter`      | 6,000 km           | 6,000 km           | 15,000 km          | —                         |
| `chain_lube`      | 500 km             | —                  | —                  | —                         |
| `cvt_belt`        | —                  | 20,000 km          | —                  | —                         |
| `spark_plug`      | 10,000 km          | 10,000 km          | 30,000 km          | —                         |
| `brake_check`     | 5,000 km           | 5,000 km           | 10,000 km / 12 mo  | 10,000 km / 12 mo         |
| `tyre_rotation`   | —                  | —                  | 10,000 km          | 10,000 km                 |
| `wheel_alignment` | —                  | —                  | 10,000 km          | 10,000 km                 |
| `coolant`         | —                  | —                  | 40,000 km / 24 mo  | —                         |
| `ac_service`      | —                  | —                  | 12 mo              | 12 mo                     |
| `battery_check`   | 6 mo               | 6 mo               | 6 mo               | 12 mo (HV battery health) |
| `tyre_pressure`   | 14 days (optional) | 14 days (optional) | 30 days (optional) | 30 days (optional)        |

Document presets: `insurance`, `emission_test`, `registration`, `licence`, `custom` — date-based, yearly repeat suggested (emission test: IN 6–12 mo depending on vehicle; user sets date).

## 6. Decision log (ADR-lite)

| #   | Date    | Decision                                                                                 | Reason                                                                                                             |
| --- | ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | 2026-10 | Build a fuel + mileage + service reminder app (vs. exam-photo tool)                      | Moderate competition, repeat use, no backend needed                                                                |
| 2   | 2026-10 | Bike, scooter, car **and EV** from day one; worldwide; India-first marketing             | Families own several types; EV growth; non-India ad traffic is worth far more                                      |
| 3   | 2026-10 | Fully offline, no backend, no accounts                                                   | ₹0 hosting, privacy as a feature, solo-dev scope                                                                   |
| 4   | 2026-10 | Website + `app-ads.txt` on Firebase Hosting free `*.web.app` subdomain; no custom domain | Zero initial cost; Google documents this path for AdMob verification                                               |
| 5   | 2026-10 | Name **Fuelora**; store title "Fuelora: Bike & Car Fuel Log"                             | VahanLog risks government-affiliation confusion (VAHAN portal); MileMate and FuelNest already used by similar apps |
| 6   | 2026-10 | Expo React Native + expo-sqlite + Drizzle, single app (no monorepo)                      | Reuses CoachingDesk skills; no server packages to share                                                            |
| 7   | 2026-10 | Canonical storage (metres, mL/g/Wh, minor units); convert at the edges                   | Worldwide units without data migration; avoids float drift                                                         |
| 8   | 2026-10 | Ads only; no IAP for now                                                                 | Founder decision; revisit "Remove ads" one-time purchase after launch data                                         |
| 9   | 2026-10 | Full-to-full efficiency with partial accumulation and missed-fill flag                   | #1 complaint in competitor reviews is wrong mileage                                                                |
| 10  | 2026-10 | Amount-only entry mode                                                                   | Indian 2-wheeler fills are by money ("₹200"), not litres                                                           |
| 11  | 2026-10 | Local notifications only, max 60 scheduled, 09:00 local                                  | No push server; iOS 64 limit                                                                                       |
| 12  | 2026-10 | Firebase Analytics (allow-listed events) + Sentry                                        | Retention and ARPDAU are the success metrics; can't improve what we can't see                                      |
| 13  | 2026-10 | Android + iOS launch together                                                            | Both developer accounts already exist; iOS users have higher ad value                                              |
| 14  | 2026-10 | Calculators usable without setup                                                         | High-volume store searches; top of the funnel                                                                      |
| 15 | 2026-10 | iOS tested on the Xcode Simulator day to day; real iPhone (borrowed, ad hoc dev build via `eas device:create`) at end of Phase 2 and Phase 4; TestFlight in Phase 5 | Founder has only an Android phone; Simulator covers UI, DB, local notifications and test ads; ATT, real notification timing and performance need a device |
| 16 | 2026-10 | Bold, dark-first brand: ink `#0E0E14`, electric lime `#C8F542`, violet `#9D7BFF`/`#5B2EE6`, hot pink `#FF5C93`/`#C2185B`; roundness 6 (`src/ui/theme.ts`) | Founder wants a modern Gen-Z look, not subtle like CoachingDesk; all text pairs ≥ 4.5:1 (NFR-6); lime never as text on white |
| 17 | 2026-10 | Poppins 600/700 for display, headline and title text; system font for body; app icon = lime fuel drop with efficiency gauge on ink (`store/icon/`) | Poppins covers Latin + Devanagari so Hindi headings match; only 2 weights bundled (~310 KB); icon readable at 48 px and in Android themed mode |
| 18 | 2026-10 | Phone switching (incl. Android → iPhone) is done with the backup file; it gets a `.fuelora` extension registered with the OS, and restore asks for notification permission when reminders exist (FR-22–24) | People change phones often; OS backups don't cross platforms and iOS doesn't restore app data on reinstall; tapping the file in WhatsApp must just work for non-technical users |
| 19 | 2026-10 | Uninstall protection: Android "Keep app data" (`hasFragileUserData`), "Last backup: N days ago" in Settings, nudge after 20 new entries (max one nudge / 7 days) (FR-25–27) | Neither OS lets an app warn before uninstall; these reduce lost-data cases without nagging |
| 20 | 2026-10 | Plausibility ranges missing from LLD §4.2: CNG bike/scooter 40–120 km/kg, electric bike 10–80 km/kWh, "other" 4–120 km/L / 10–120 km/kg / 3–80 km/kWh, LPG = liquid ranges | CNG motorcycles (e.g. Bajaj Freedom 125) are advertised around 100 km/kg, so 10–40 would wrongly warn; wide ranges for "other" avoid false warnings |
| 21 | 2026-10 | Onboarding state in SQLite `settings` (`onboarding_done` OR ≥ 1 vehicle), not MMKV; vehicle step has "Skip for now"; form shows type, fuel, name, odometer with optional details collapsed | Stays correct after an interrupted save or a restore; no extra native package for one flag (MMKV comes in Phase 4 for ad counters); skip keeps calculators usable without setup (F-12); essentials keep onboarding under 60 s (F-01) |
| 22 | 2026-10 | Onboarding screens: back arrow top-left (none on step 1), step dots centred, one full-width primary action at the bottom, optional text action (Skip) under it | Side-by-side Back/Continue/Save crowded 360dp screens; one obvious thumb-reachable action is the common modern pattern |
| 23 | 2026-10 | Never use `Intl` `formatToParts` / `resolvedOptions`; derive separators and currency digits from `format()` output (lint-enforced, iOS-simulating test) | Hermes on iOS lacks them: the vehicle step crashed on the iPhone while all tests passed on Node |
| 24 | 2026-10 | Once a vehicle has fill-ups: its fuel may change only within the same stored unit (petrol ↔ diesel ↔ LPG, all mL; not to/from CNG g or electric Wh), and its starting odometer may not go above the first fill-up's odometer. Fill-ups can't be below the starting odometer, and archived vehicles take no new fill-ups | Stored quantities carry no unit of their own; a fuel change across units would silently reinterpret every old entry (30 L → 30 kWh). A start above logged entries breaks odometer order and the current-odometer rule (LLD §5.1). A CNG conversion or a new EV is added as a new vehicle |
| 25 | 2026-10 | Fill-up entry has two layouts: "Amount only" (amount + price, fuel derived; the last price is pre-filled) and "Fuel + amount" (any two of three). Bikes and scooters open in Amount only when a last price exists; cars, "other" and first entries open the full form. `entry_mode` is `amount_only` when the fuel came from the untouched remembered price, `price_total` when the user typed a price | Most Indian two-wheeler fills are by money (#10); one field is the fastest entry (NFR-2). Car owners more often have litres/gallons on the receipt, and a derived quantity is less exact after a price change |
| 26 | 2026-10 | Backups open from other apps: iOS exports the `app.fuelora.backup` type (`.fuelora`, conforms to JSON); Android registers VIEW for `content://` JSON **and** `application/octet-stream` plus `file://*.fuelora`. Incoming file URLs go to `/restore?uri=…` (`+native-intent.tsx`), and the restore screen sits outside the onboarding guard, with a "Restore from a backup" link on the welcome screen | WhatsApp and Drive usually hand over backups with no extension and a generic type, so a strict filter would miss them; Fuelora then also appears in "Open with" for other binary files, but the restore screen validates and refuses them without changing anything. A new phone must be able to restore before (instead of) onboarding (FR-22, FR-23) |

## 7. Analytics events (allow-list)

`onboarding_completed {region, vehicle_type}`, `vehicle_added {vehicle_type, fuel_type}`, `fill_up_added {fuel_type, is_full, entry_mode}`, `efficiency_shown {fuel_type}`, `service_added {type_key}`, `reminder_created {kind, has_date, has_distance}`, `reminder_done {kind}`, `notification_opened {kind}`, `calculator_used {calculator}`, `calculator_to_vehicle`, `backup_exported`, `backup_restored`, `stats_opened`, `settings_units_changed {distance_unit, volume_unit}`. Ad events come from the AdMob SDK. Nothing else.

## 8. Product proposals (not yet decided)

| #   | Proposal                                                             | Decide when                                                                      |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P-1 | "Remove ads" one-time purchase (₹99–149 / $2.99)                     | After 60 days of revenue data                                                    |
| P-2 | Rider mode (earnings − fuel) as a separate onboarding path           | If ≥ 10% of Indian users pick "delivery/work" in an optional onboarding question |
| P-3 | Document wallet with photos (needs camera/photo picker)              | v1.1 planning                                                                    |
| P-4 | Home-screen widget (needs native widget module)                      | v1.1 planning                                                                    |
| P-5 | Ad mediation (AppLovin/Meta/Unity)                                   | After ~1,000 DAU                                                                 |
| P-6 | Optional backup to user's own Google Drive app folder / iCloud Drive | If restore-related reviews appear                                                |
| P-7 | More languages (ES, PT-BR, ID, BN, TA)                               | By store traffic per country                                                     |

## 9. Open questions

Deferred until the app is ready (ROADMAP Phase 5). Until then, dev builds use a placeholder bundle ID and Google test ad units.

1. Support email shown on store listings and `web/support.html` (personal vs. a new free Gmail like fuelora.app@gmail.com)?
2. Firebase project ID → decides the website URL (`<project-id>.web.app`); pick before creating the store listings.
3. Bundle ID / package name (proposal: `com.fuelora.app`) — must be decided before the first build; it can never change on Play.
4. Confirm "Fuelora" is free in App Store Connect (create the app record) and on Play before building.
