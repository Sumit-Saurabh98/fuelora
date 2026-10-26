# APP_STORE.md

## 1. Listing

Primary category: **Utilities** (secondary: Travel or Lifestyle — pick by competitor ranks at submission) · Price: Free

| Field              | Limit                                                             | Value                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name               | 30                                                                | `Fuelora: Fuel & Mileage Log` (27)                                                                                                                             |
| Subtitle           | 30                                                                | `Bike, car & EV service tracker` (30)                                                                                                                          |
| Keywords           | 100, comma-separated, no spaces; don't repeat name/subtitle words | `mpg,gas,logbook,petrol,diesel,maintenance,reminder,expense,trip,cost,calculator,scooter,motorcycle` (98)                                                      |
| Promotional text   | 170                                                               | `Log a fill-up in 10 seconds. Real mileage even with partial fills, monthly fuel cost, and service & renewal reminders. Offline, no login.`                    |
| Description        | 4000                                                              | Same structure as PLAY_STORE.md §1, US wording: "gas" alongside "fuel", mpg first, "emissions test" instead of PUC/MOT in the main copy (mention PUC/MOT once) |
| Support URL        | —                                                                 | `https://<project-id>.web.app/support.html`                                                                                                                    |
| Marketing URL      | —                                                                 | `https://<project-id>.web.app` (AdMob reads app-ads.txt from this domain)                                                                                      |
| Privacy policy URL | —                                                                 | `https://<project-id>.web.app/privacy.html`                                                                                                                    |

Localizations at launch: English (U.S.), English (U.K.), English (India) if offered, Hindi. Keyword field is per localization — use the extra localizations for extra keywords (e.g. en-GB: `mot,tax,petrol`; en-IN: `puc,bike,kmpl,service`). Never use other companies' brand or model names as keywords.

## 2. Screenshots

| Device      | Size                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| iPhone 6.9" | 1320×2868 (required)                                                                                     |
| iPhone 6.5" | 1284×2778 (if still requested)                                                                           |
| iPad        | Only if the app supports iPad — set `supportsTablet: false` in MVP to avoid iPad screenshot requirements |

Same 6-screen story as Play, with mpg/gallon/$ screenshots for the US/UK localization.

## 3. App Privacy ("nutrition label") — draft

| Data type                                                | Collected                     | Linked to user | Used for tracking | Purpose                 |
| -------------------------------------------------------- | ----------------------------- | -------------- | ----------------- | ----------------------- |
| Identifiers → Device ID (IDFA, only with ATT permission) | Yes                           | No             | Yes               | Third-party advertising |
| Usage data → Product interaction                         | Yes                           | No             | No                | Analytics               |
| Usage data → Advertising data                            | Yes                           | No             | Yes               | Third-party advertising |
| Diagnostics → Crash data, Performance data               | Yes                           | No             | No                | App functionality       |
| Location → Coarse (if AdMob derives from IP)             | Check current Google guidance | No             | —                 | Advertising             |

User content (vehicles, fill-ups, notes): **not collected**.

`PrivacyInfo.xcprivacy`: AdMob, Firebase and Sentry ship their own privacy manifests; the app's manifest declares required-reason APIs used by our code/Expo modules (UserDefaults, file timestamp) — verify with Xcode's privacy report on the first archive.

## 4. App Review notes

```
Fuelora works fully offline and requires no account or login. All features are available immediately.
To test: complete the short onboarding (choose language, region, add a vehicle), then tap + to add a fill-up.
Ads are served by Google AdMob. The tracking permission prompt is shown only through Google's consent (UMP) flow.
No in-app purchases.
```

## 5. Settings

| Item                    | Value                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Age rating              | 4+ (no objectionable content; ads filtered via AdMob blocking controls)                |
| Export compliance       | `ITSAppUsesNonExemptEncryption = false` (only standard HTTPS) in `app.config.ts`       |
| Bundle ID               | Proposal `com.fuelora.app` (match Android package)                                     |
| Info.plist strings      | `NSUserTrackingUsageDescription` (ADS.md §4); no camera/photos/location strings in MVP |
| SKAdNetwork             | Add Google's SKAdNetwork identifiers list via the google-mobile-ads config plugin      |
| Push / background modes | None (local notifications don't need push entitlement)                                 |

## 6. Before submission

- [ ] App record "Fuelora" created in App Store Connect (reserves the name)
- [ ] TestFlight internal build tested: consent form, ATT prompt, notifications at 09:00, restore from backup
- [ ] Privacy label matches the SDKs actually shipped
- [ ] Screenshots per localization
- [ ] Marketing URL points to the domain hosting app-ads.txt
