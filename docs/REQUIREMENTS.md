# REQUIREMENTS.md

> Product name: **Fuelora** · Store title: _Fuelora: Bike & Car Fuel Log_
> Status: v0.1 draft · Owner: Sumit

## 1. Product summary

A free, offline mobile app for **owners of bikes, scooters, cars and EVs** that turns fill-ups into **real mileage, fuel cost and timely service/document reminders** — with a 10-second entry and no account.

**Core promise:** "Know your real mileage and never miss a service or renewal — offline, no login."

Worldwide from day one (units, currencies, region names), with marketing starting in India.

### 1.1 Target users

| Segment                                           | Typical pain                                                                | What brings them back              |
| ------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| Two-wheeler commuters (bike/scooter)              | "What mileage am I really getting?", forget oil change, PUC/insurance lapse | Weekly fill-up, reminders          |
| Car owners / families (often own a 2-wheeler too) | Fuel spend unclear, service intervals, many renewals                        | Monthly spend, multi-vehicle       |
| EV owners (scooters, cars)                        | Real cost per km vs petrol, charging spend                                  | Charging log, cost/km              |
| Delivery / gig riders (v1.1 focus)                | Fuel eats earnings, no record                                               | Daily earnings − fuel = net (v1.1) |

**Not targeted:** fleets, businesses needing tax mileage logs, GPS trip tracking users.

### 1.2 Personas

- **Rahul, 26, commuter (India):** Splendor/Activa, fills "₹200 petrol" not litres, mid/low-end Android, Hindi or English. Wants mileage and "when is oil change due".
- **Priya, 38, family car + scooter:** wants monthly fuel spend across both and insurance/PUC reminders.
- **Mike, 45, US/UK commuter:** thinks in mpg and gallons, wants a clean log and service reminders. Higher ad value.
- **Arjun, 30, EV scooter owner:** wants ₹/km and kWh charged.

## 2. Features

### 2.1 MVP (v1.0)

| ID   | Feature                | Description                                                                                                                                                                                                                                              |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Onboarding             | Language → region (pre-filled from device locale: sets currency, units, region names) → first vehicle. Under 60 seconds. No login.                                                                                                                       |
| F-02 | Vehicles               | Add/edit/archive unlimited vehicles: type (bike, scooter, car, other), fuel (petrol/gasoline, diesel, CNG, LPG, electric), name, make/model/year (optional), plate (optional), starting odometer. Vehicle switcher on top of home.                       |
| F-03 | Fill-up / charge entry | Date-time, odometer, and **any two of** quantity / unit price / total (third computed). Full-tank toggle (default on). "Missed a fill-up before this" toggle. Station and note optional. Unit price and station pre-filled from the last entry.          |
| F-04 | Amount-only mode       | User types only the total (e.g. ₹200) + odometer; quantity is derived from the remembered unit price. Most Indian 2-wheeler fills are by amount.                                                                                                         |
| F-05 | Efficiency engine      | Correct full-to-full calculation with partial fills accumulated; missed-fill flag breaks the chain (LLD §4). Shown after each save.                                                                                                                      |
| F-06 | Vehicle dashboard      | Last and average efficiency, this month's spend, distance this month, cost per km/mi, next reminders, recent entries.                                                                                                                                    |
| F-07 | History                | List of fill-ups and services per vehicle; edit/delete; segment efficiency on each full fill.                                                                                                                                                            |
| F-08 | Stats & charts         | Efficiency over time, monthly spend (bar), cost per distance; ranges 3M / 6M / 1Y / All.                                                                                                                                                                 |
| F-09 | Service log            | Record service: date, odometer, type (presets per vehicle type, KB §5), cost, note. Logging a service completes the matching reminder and rolls it forward.                                                                                              |
| F-10 | Reminders              | Service reminders by **date and/or distance**; document reminders by date (insurance, emission test, registration/road tax, licence, custom). Repeat intervals. Distance reminders show a **predicted due date** from the user's average daily distance. |
| F-11 | Local notifications    | Scheduled on the device. Permission asked when the first reminder is created. Optional weekly "log your fill-up" nudge (default on, easy off).                                                                                                           |
| F-12 | Calculators (no setup) | Trip cost, mileage calculator, fuel cost split — usable without adding a vehicle; each ends with "Track this vehicle". Store-search entry point.                                                                                                         |
| F-13 | Backup & export        | Export full backup (JSON) and CSV via share sheet; restore from JSON (replace all, with automatic safety backup). Monthly "back up your data" nudge. OS-level backup enabled (Android Auto Backup, iOS device backup).                                   |
| F-14 | Settings               | Language (EN/HI), region, currency, distance unit (km/mi), volume unit (L, US gal, UK gal), efficiency format (km/L, L/100km, mpg US/UK, km/kWh, kWh/100km, mi/kWh), theme (system/light/dark), notification toggles, privacy/ad choices, about.         |
| F-15 | Ads                    | AdMob banner, interstitial, app-open per `docs/ADS.md`; consent via UMP (EEA/UK/CH) and ATT (iOS).                                                                                                                                                       |

### 2.2 v1.1 (after launch, driven by retention data)

| ID   | Feature                     | Why                                                                                                                                                   |
| ---- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-20 | Home-screen widget          | "Next service in 240 km / 9 days", last mileage. Passive daily visibility.                                                                            |
| F-21 | Document wallet             | Photos of RC/registration, insurance, emission certificate, licence stored locally, linked to expiry reminders. Opened at traffic checks → frequency. |
| F-22 | Rider mode                  | Daily earnings + fuel → net per day/week/month for delivery riders. Daily habit.                                                                      |
| F-23 | Expenses beyond fuel        | Parking, tolls, wash, fines, accessories — simple categories.                                                                                         |
| F-24 | Trip-meter entry            | Enter distance since last fill instead of odometer.                                                                                                   |
| F-25 | Year-in-review / PDF report | Shareable summary (rewarded ad unlock candidate, ADS.md §6).                                                                                          |
| F-26 | More languages              | Spanish, Portuguese (BR), Indonesian, Bengali, Tamil — by store traffic.                                                                              |

### 2.3 v2 (only with clear signals)

Parking saver (photo + note + timer), tyre-pressure routine, native ads in history, ad mediation, merge-import of backups, user-chosen backup to Google Drive app folder / iCloud Drive (client-side, still no server).

### 2.4 Explicitly out of scope

GPS trip tracking, cloud sync/accounts, live fuel-price APIs, mechanic booking, OCR of bills, social/community, fleet features, tax mileage logs, in-app purchases (KB #8).

## 3. Monetization

Ads only (AdMob). No subscriptions, no paywall, no locked core features. Details and revenue model: `docs/ADS.md`.

## 4. Functional requirements

### 4.1 Onboarding & settings

- FR-1 First launch never requires an account, email or phone number.
- FR-2 Region defaults from device locale; user can change region, currency and each unit independently later. Changing units never changes stored data (display only).
- FR-3 Consent (UMP) runs before any ad request; ATT prompt only on iOS and only via the consent flow (ADS.md §4).

### 4.2 Vehicles

- FR-4 Unlimited vehicles; one is "current" and opens by default.
- FR-5 Archiving hides a vehicle from the switcher but keeps its data; delete removes the vehicle and all its entries/reminders after a typed confirmation.
- FR-6 Fuel type decides quantity unit (L/gal, kg, kWh) and the efficiency formats offered.

### 4.3 Fill-ups

- FR-7 Odometer must be greater than the previous entry's and less than the next entry's (by date). Violations block save with a clear message.
- FR-8 If the implied segment efficiency is outside the plausible range for the vehicle type (KB §3), warn ("check odometer or quantity") but allow save.
- FR-9 Any two of quantity, unit price, total are required; the third is computed and shown live. Rounding: total to minor units, quantity to base units.
- FR-10 After save: show the segment efficiency (or "partial — mileage after next full tank"), update dashboard, reschedule distance-based reminders.
- FR-11 Edit/delete recomputes affected segments.

### 4.4 Services & reminders

- FR-12 Reminder: title, type (preset or custom), due date and/or due odometer, optional repeat (months and/or distance), lead time (default 7 days / 300 km).
- FR-13 Distance reminders show "due in X km · around DATE" when there is enough history (LLD §5), otherwise "due at X km".
- FR-14 Marking done (or logging a matching service) records completion and creates the next occurrence when repeating.
- FR-15 Notifications at 09:00 local time on the lead day and the due day; overdue reminders notify once more after 3 days, then only show in-app.

### 4.5 Backup

- FR-16 Export JSON contains all vehicles, entries, services, reminders and settings with `schemaVersion`.
- FR-17 Restore validates the file, shows a summary (vehicles, entries, date range), creates a safety backup, then replaces all data.
- FR-18 CSV export per vehicle (fill-ups, services) for spreadsheets.

### 4.6 Calculators

- FR-19 Trip cost: distance, efficiency, fuel price, passengers (optional split).
- FR-20 Mileage calculator: distance + quantity → efficiency in all formats.
- FR-21 No data saved unless the user taps "Track this vehicle".

## 5. Non-functional requirements

| ID     | Requirement                                                                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1  | Fully usable offline; no screen waits on the network. Ads failing to load never block UI.                                                           |
| NFR-2  | Fill-up entry to saved in ≤ 10 seconds for a returning user (pre-filled fields, numeric keypad, one screen).                                        |
| NFR-3  | Cold start ≤ 2.5 s on a low-end Android (2 GB RAM, Android 10).                                                                                     |
| NFR-4  | Works with 10 years of data (≈ 1,500 entries/vehicle) without slow screens: queries indexed by `vehicleId, odometerM`.                              |
| NFR-5  | Android 8+ (minSdk per Expo SDK), iOS per Expo SDK minimum. Phones first; tablets usable.                                                           |
| NFR-6  | Accessibility: font scaling up to 1.3× without clipping, 48dp touch targets, contrast AA, screen-reader labels on inputs and charts (text summary). |
| NFR-7  | Privacy: no user content leaves the device except user-initiated export. Analytics events allow-listed, no free text.                               |
| NFR-8  | Crash-free sessions ≥ 99.5%.                                                                                                                        |
| NFR-9  | App size ≤ 40 MB download (Android).                                                                                                                |
| NFR-10 | Data durability: SQLite with WAL; writes in transactions; OS backup enabled; restore tested in CI.                                                  |

## 6. Key user stories (MVP acceptance)

1. As a new user, I can open the app, pick my bike and log my first fill-up in under a minute without signing up.
2. As a bike owner who fills ₹200 at a time, I enter only the amount and odometer, and after my next full tank I see a correct km/L.
3. As a car owner in the US, I see mpg, gallons and $ everywhere, without changing settings.
4. As a family, I switch between my scooter and car and see each one's spend and mileage separately.
5. As an owner, I get a notification 7 days before my insurance expires and when my oil change is ~300 km away, with an estimated date.
6. As a user changing phones, I export a backup, restore it on the new phone, and see everything.
7. As someone searching "trip cost calculator", I can calculate without setup.

## 7. Success metrics

| Metric                                   | Target by day 60 after launch             |
| ---------------------------------------- | ----------------------------------------- |
| D1 / D7 / D30 retention                  | ≥ 35% / ≥ 20% / ≥ 10%                     |
| Users with ≥ 2 fill-ups in first 14 days | ≥ 40%                                     |
| Entries per active user per week         | ≥ 1.2                                     |
| DAU / MAU                                | ≥ 15%                                     |
| Crash-free sessions                      | ≥ 99.5%                                   |
| Store rating                             | ≥ 4.4                                     |
| Ad revenue                               | Tracking toward ₹20–30k/month (ADS.md §7) |
