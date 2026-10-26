# PLAY_STORE.md

## 1. Store listing text

Category: **Auto & Vehicles** · Tags: fuel, car maintenance, utilities · Contains ads: **Yes** · In-app purchases: No

### English (en-US default; copy to en-IN, en-GB)

**App name (≤ 30):** `Fuelora: Bike & Car Fuel Log` (28)

**Short description (≤ 80):** `Real mileage, fuel cost & service reminders for bike, scooter & car. No login.` (78)

**Full description (≤ 4000):**

```
Know your real mileage, fuel cost and when your next service is due — for your bike, scooter, car or EV. Fuelora works offline, needs no account, and keeps your data on your phone.

⛽ LOG A FILL-UP IN 10 SECONDS
• Enter odometer and amount — Fuelora works out the litres from your last price
• Full or partial tank — mileage is always calculated correctly
• Forgot a fill-up? Mark it and your averages stay accurate

📊 YOUR REAL MILEAGE AND COST
• km/L, L/100km, mpg (US/UK), km/kg for CNG, km/kWh for EVs
• Fuel spend per month and cost per km or mile
• Simple charts for mileage and spending over time

🔧 SERVICE & RENEWAL REMINDERS
• Oil change, general service, chain, tyres, brakes, battery and more
• Remind by date, by distance, or both — with an estimated due date
• Insurance, emission test (PUC/MOT), registration and licence renewals

🚗 ALL YOUR VEHICLES
• Bikes, scooters, cars and electric vehicles in one app
• Switch vehicles in one tap; each has its own history and stats

🧮 QUICK CALCULATORS
• Trip cost, mileage and fuel cost split — no setup needed

🔒 PRIVATE AND OFFLINE
• No sign-up, no login
• Your vehicle data stays on your phone
• Export a backup or CSV any time

Available in English and Hindi. Works with your country's currency and units.
```

Keywords to cover naturally (no keyword stuffing): mileage tracker, fuel log, bike mileage, petrol expense, km/L calculator, service reminder, vehicle maintenance, gas mileage, mpg, EV charging log, trip cost calculator.

### Hindi (hi-IN)

**App name:** `Fuelora: बाइक-कार फ्यूल लॉग`
**Short description:** `बाइक, स्कूटर, कार का असली माइलेज, पेट्रोल खर्च और सर्विस रिमाइंडर। बिना लॉगिन।` (verify ≤ 80 in Console)
**Full description:** translate the English text; keep "PUC", "RC", "km/L" as is. Native-speaker review before publishing.

## 2. Graphics (`store/`)

| Asset             | Spec                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App icon          | 512×512 PNG, 32-bit, no transparency issues; same artwork as the adaptive icon                                                                                                                |
| Feature graphic   | 1024×500                                                                                                                                                                                      |
| Phone screenshots | 4–8, 1080×1920 or larger (9:16) — EN and HI sets                                                                                                                                              |
| Screenshot story  | 1 "Log fuel in 10 seconds" · 2 "Real mileage, even with partial fills" · 3 "Monthly fuel cost" · 4 "Service & PUC/insurance reminders" · 5 "Bike, scooter, car & EV" · 6 "Offline. No login." |

## 3. App content and settings (Play Console)

| Item                                   | Answer                                                                                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy                         | `https://<project-id>.web.app/privacy.html`                                                                                                                                                              |
| Website (Store settings → contact)     | `https://<project-id>.web.app` (required for app-ads.txt)                                                                                                                                                |
| Ads                                    | Contains ads                                                                                                                                                                                             |
| App access                             | All functionality available without login                                                                                                                                                                |
| Target audience                        | 18+ (not appealing to children)                                                                                                                                                                          |
| Content rating                         | Utility/productivity; no user-to-user communication, no shared UGC, no location sharing → expected "Everyone / 3+"                                                                                       |
| News app / health / financial features | No                                                                                                                                                                                                       |
| Government app                         | No (and no government names/emblems in listing — KB #5)                                                                                                                                                  |
| Account deletion URL                   | Not applicable — no accounts                                                                                                                                                                             |
| Data safety                            | §4                                                                                                                                                                                                       |
| Permissions                            | `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` (notifications), `INTERNET`, `ACCESS_NETWORK_STATE`, `com.google.android.gms.permission.AD_ID`. **No** exact alarms, location, contacts, camera, storage. |

## 4. Data safety form (draft: check every answer against the SDK versions shipped)

User-entered vehicle data, fill-ups, services, reminders: **not collected** (never leaves the device).

| Data type                                   | Collected                             | Shared            | Purpose                         | Source             |
| ------------------------------------------- | ------------------------------------- | ----------------- | ------------------------------- | ------------------ |
| Device or other IDs (advertising ID)        | Yes                                   | Yes (advertising) | Advertising, Analytics          | AdMob, Firebase    |
| App interactions                            | Yes                                   | No                | Analytics                       | Firebase Analytics |
| Crash logs                                  | Yes                                   | No                | App functionality / diagnostics | Sentry, Firebase   |
| Diagnostics (performance)                   | Yes                                   | No                | Diagnostics                     | Sentry             |
| Approximate location (IP-derived by ad SDK) | Check Google's current AdMob guidance | —                 | Advertising                     | AdMob              |

- Data encrypted in transit: **Yes**
- Users can request data deletion: user content is deleted by uninstalling; for SDK data, link to Google's ad-settings controls in `privacy.html`
- Is collection required? Ads/analytics: required (app is ad-supported); personalization follows consent

Reference: Google's "AdMob — data disclosure for Play Data safety" help page (re-check before submitting).

## 5. Before the first upload

- [ ] Package name final (`com.fuelora.app` proposal) — cannot change later
- [ ] Play App Signing enabled; upload key stored safely (EAS manages credentials)
- [ ] `targetSdkVersion` meets current Play requirement
- [ ] AdMob app ID in `app.config.ts` (production profile) and test IDs in dev/preview
- [ ] Privacy policy live and mentions AdMob, Firebase Analytics, Sentry, consent, data on device
- [ ] app-ads.txt live on the website URL entered above
- [ ] Closed testing track (12+ testers × 14 days if your account requires it) → production staged rollout
- [ ] Pre-launch report reviewed (crashes, accessibility warnings)
