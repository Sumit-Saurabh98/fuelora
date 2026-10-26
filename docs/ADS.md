# ADS.md — Monetization with AdMob

Ads are the only revenue (KB #8). The rule of thumb: **ads may interrupt browsing, never logging.** A user who stops logging stops seeing ads forever.

## 1. Formats and placements

| Format                   | Placement key                                                  | Where / when                                                                                         | Never                                                                    |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Adaptive anchored banner | `banner_home`, `banner_history`, `banner_stats`, `banner_calc` | Bottom of Home, History, Stats and calculator result screens                                         | Onboarding, entry/edit forms, reminders editor, backup/restore, settings |
| Interstitial             | `after_save`                                                   | When the user closes the post-save result card (they have seen their mileage)                        | Before the result is shown; on save of an edit                           |
| Interstitial             | `open_stats`                                                   | Navigating from Home to the Stats screen                                                             | Back navigation; app launch; app exit                                    |
| App open                 | `app_open`                                                     | Returning to the app after ≥ 30 s in background, or cold start from the 3rd session on               | First session; when opened from a notification (user has a task)         |
| Rewarded                 | —                                                              | None in MVP. Candidate in v1.1: unlock the year-in-review PDF (optional; core features never locked) | Export/backup — always free                                              |
| Native                   | —                                                              | v2 candidate: one native card in History after the 5th row                                           | —                                                                        |

## 2. Frequency caps (enforced in `AdsManager`, counters in MMKV)

| Rule                                                           | Value                                          |
| -------------------------------------------------------------- | ---------------------------------------------- |
| No full-screen ads in the user's first session                 | Session 1 = install day until first background |
| No interstitial for the user's first 2 fill-ups                | Protects activation                            |
| Interstitials per session                                      | max 1                                          |
| Interstitials per day                                          | max 3                                          |
| Gap between any two full-screen ads (interstitial or app open) | ≥ 3 minutes                                    |
| App open ads                                                   | max 1 per 4 hours                              |
| Banner refresh                                                 | AdMob default (≥ 30 s); never manual refresh   |
| Ad not loaded in time                                          | Skip silently, never wait or show a spinner    |

Session = from foreground to ≥ 30 s background.

## 3. Policy guardrails (AdMob + Play + App Store)

- No interstitials on app launch/exit or right after the user taps an action (unexpected placement).
- Banners keep ≥ 8 dp clear from tappable controls; FAB sits above the banner area, never overlapping.
- No ads in notifications, widgets, or on screens that are mostly ad.
- Never click your own ads; register test devices in AdMob; dev/preview builds use Google test ad unit IDs only.
- Target audience 18+ (not for children); not in Designed for Families.
- No incentivized clicks, no "tap the ad to continue" copy.
- Content is utility/automotive — no sensitive categories to block by default; block gambling/dating in AdMob blocking controls to keep brand trust.

## 4. Consent and privacy (worldwide)

1. Every launch: `AdsConsent.requestInfoUpdate()` (UMP).
2. If required (EEA/UK/CH, and US state privacy messages enabled in AdMob), show the form with `loadAndShowConsentFormIfRequired()` — **after onboarding**, not on the first screen.
3. Initialize `mobileAds()` only when `canRequestAds` is true.
4. iOS: configure UMP's **IDFA explainer** message in AdMob → it triggers the ATT prompt. Add `NSUserTrackingUsageDescription` ("Used to show more relevant ads. Your vehicle data never leaves your phone.").
5. Settings → "Privacy & ad choices" shows the UMP privacy options form when `privacyOptionsRequirementStatus` is REQUIRED.
6. Non-consenting users get non-personalized ads (UMP/SDK handles it).
7. Android: declare `com.google.android.gms.permission.AD_ID` (needed for Android 13+ ad ID) and say so in Data safety.

## 5. app-ads.txt (no custom domain)

1. Create a Firebase project (free Spark plan) → Hosting → public folder `web/`.
2. `web/app-ads.txt`:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   (publisher ID from AdMob → Settings).
3. `firebase deploy --only hosting` → check `https://<project-id>.web.app/app-ads.txt` loads as plain text.
4. Set `https://<project-id>.web.app` as **Website** in Play Console (Store settings → Contact details) and as **Marketing URL** in App Store Connect.
5. AdMob → Apps → app-ads.txt tab → "Check for updates". Verification takes ~24 h+.

## 6. Ad units to create (per platform)

| Unit                                                                                                              | Android             | iOS                 |
| ----------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------- |
| Banner (adaptive) — one unit reused across banner placements, placement passed as `keywords`-free analytics param | `banner_main`       | `banner_main`       |
| Interstitial                                                                                                      | `interstitial_main` | `interstitial_main` |
| App open                                                                                                          | `app_open_main`     | `app_open_main`     |

Separate units per placement only if reporting shows a need (more units = more admin). Unit IDs live in `app.config.ts` extras per build profile.

## 7. Revenue model (estimates — verify with real data after launch)

Assumed India eCPMs: interstitial ≈ $0.9–1.1, banner ≈ $0.10–0.50, app open ≈ $0.5–0.8. Tier-1 (US/UK/EU) roughly 5–10× higher.

| Per active user per day (India) | Impressions | ≈ ₹                         |
| ------------------------------- | ----------- | --------------------------- |
| App open                        | ~1          | 0.05                        |
| Interstitial                    | ~0.5        | 0.04                        |
| Banner                          | ~5          | 0.06                        |
| **Total**                       |             | **~₹0.15/day ≈ ₹4.5/month** |

DAU needed for ₹25,000/month:

| Traffic mix            | ≈ ₹/DAU/month | DAU needed |
| ---------------------- | ------------- | ---------- |
| 100% India             | ~4.5          | ~5,500     |
| 85% India / 15% tier-1 | ~9            | ~2,700     |
| 70% India / 30% tier-1 | ~14           | ~1,800     |

Implications: worldwide store listings (en-US, en-GB) matter; daily-use hooks (v1.1 widget, rider mode, document wallet) matter more than more ad slots.

## 8. KPIs to watch weekly

ARPDAU (AdMob + Firebase linked), impressions per DAU per format, fill rate, eCPM by country, D1/D7 retention vs. ad exposure, uninstall rate in Play Console. If D7 retention drops after an ad change, revert it.

## 9. Account setup checklist

- [ ] AdMob account linked to the Google account that owns the Play developer account
- [ ] Payments profile: tax info (PAN), bank account; payout threshold applies (USD 100)
- [ ] Add Android + iOS apps in AdMob (can be added before publishing, then linked to store listings)
- [ ] Create units (§6); add test devices
- [ ] UMP messages: GDPR, US state regulations, IDFA explainer (iOS)
- [ ] Blocking controls: gambling, dating
- [ ] app-ads.txt verified (§5)
- [ ] Link AdMob ↔ Firebase
