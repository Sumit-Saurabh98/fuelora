# TECH_STACK.md

Principle: **one TypeScript codebase, everything on the device, ₹0 running cost.** Same React Native + Expo + Drizzle skills as CoachingDesk, minus every server piece.

## 1. Summary

| Layer               | Choice                                                                                                  | Why                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| App framework       | **React Native + Expo (SDK latest stable, 58 at start), TypeScript strict**                             | One codebase for Android + iOS; EAS Build/Update; proven in CoachingDesk          |
| Navigation          | Expo Router                                                                                             | File-based routes, typed links                                                    |
| Local database      | **expo-sqlite** (WAL)                                                                                   | Built into Expo, fast, works offline                                              |
| ORM / migrations    | **Drizzle ORM (expo-sqlite driver) + drizzle-kit**, migrations bundled and applied with `useMigrations` | Typed schema, same tool as CoachingDesk                                           |
| Reactive reads      | Drizzle `useLiveQuery` (with `enableChangeListener`)                                                    | Screens update automatically after writes; no extra cache layer                   |
| UI state            | Zustand (only for transient UI state, e.g. entry sheet)                                                 | Small, simple                                                                     |
| Small key-value     | react-native-mmkv                                                                                       | Ad caps, flags, nudge timestamps                                                  |
| UI kit              | **React Native Paper** (Material 3) + custom theme                                                      | Same as CoachingDesk; accessible; light/dark                                      |
| Fonts | Poppins 600/700 via `@expo-google-fonts/poppins` subpath imports (display/headline/title); system font for body | Bold modern look; Latin + Devanagari in one family (KB #17) |
| Charts              | react-native-gifted-charts (+ react-native-svg)                                                         | Line/bar charts, decent on low-end devices                                        |
| Forms & validation  | react-hook-form + Zod                                                                                   | Numeric inputs with live derived values; Zod also validates backup files          |
| i18n                | i18next + react-i18next + expo-localization                                                             | EN + HI at launch; locale → region defaults                                       |
| Notifications       | expo-notifications (local only)                                                                         | Scheduled reminders, no push server                                               |
| Backup              | expo-file-system, expo-sharing, expo-document-picker                                                    | Export/restore via share sheet; no server                                         |
| Ads                 | **react-native-google-mobile-ads** (AdMob + UMP consent)                                                | Banner, interstitial, app-open; consent built in. Needs a dev build (not Expo Go) |
| iOS tracking prompt | Via UMP IDFA explainer + `NSUserTrackingUsageDescription` (expo-tracking-transparency only if needed)   | One consent flow                                                                  |
| Analytics           | **Google Analytics for Firebase** (@react-native-firebase/app + analytics)                              | Free retention cohorts + AdMob linking for ARPDAU (KB #12)                        |
| Crash reporting     | Sentry (@sentry/react-native) free tier                                                                 | Same as CoachingDesk                                                              |
| Website             | **Static HTML in `web/` on Firebase Hosting** (free `*.web.app`)                                        | Privacy policy + `app-ads.txt` without buying a domain (KB #4)                    |
| Build / release     | EAS Build, EAS Submit, EAS Update (free tier; `eas build --local` as fallback)                          | Store builds without maintaining native toolchains by hand                        |
| Testing             | Jest (jest-expo), React Native Testing Library, Maestro (E2E)                                           | Domain-heavy app → fast unit tests                                                |
| Lint / format       | ESLint (typescript-eslint) + Prettier                                                                   | Standard                                                                          |
| Package manager     | pnpm (`node-linker=hoisted` in `.npmrc` for React Native)                                               | Same as CoachingDesk                                                              |
| CI                  | GitHub Actions: lint, typecheck, test on push                                                           | Free for public/private small usage                                               |

## 2. Repo layout

```
fuelora/
  app/                 Expo Router routes
  src/                 domain, db, repositories, services, features, ads, notifications, analytics, i18n, ui
  web/                 static site (Firebase Hosting): index, privacy, terms, support, app-ads.txt
  store/               screenshots, feature graphic, icon sources
  .maestro/            E2E flows
  docs/                product & design docs
  app.config.ts        Expo config (plugins: expo-sqlite, expo-notifications, google-mobile-ads, firebase, sentry)
  drizzle.config.ts    drizzle-kit (dialect sqlite, driver expo)
  eas.json             build profiles: development, preview, production
  firebase.json        hosting config (public: web)
```

## 3. Versions policy

- Track the latest stable Expo SDK; upgrade within ~2 months of a new SDK (Play target-API deadlines).
- Pin exact versions via the lockfile; use `npx expo install` for Expo-managed packages so versions match the SDK.
- Android `targetSdkVersion` must meet Google Play's yearly requirement (check each August).

## 4. Environments

| Profile     | Ads                       | Analytics             | Distribution                      |
| ----------- | ------------------------- | --------------------- | --------------------------------- |
| development | **Test ad unit IDs only** | Debug view / disabled | Dev client on own devices         |
| preview     | Test ad unit IDs          | Enabled (debug)       | Play internal testing, TestFlight |
| production  | Real ad unit IDs          | Enabled               | Stores                            |

Ad unit IDs and AdMob app IDs live in `app.config.ts` per profile (env), never hard-coded in components.

## 5. Rejected alternatives (and why)

| Option                                 | Why not                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Flutter                                | New language (Dart); CoachingDesk experience is React Native                          |
| Native Kotlin + Swift (Room/Core Data) | Two codebases                                                                         |
| Firebase Firestore / Supabase sync     | Server dependency, accounts, privacy and cost (KB #3)                                 |
| WatermelonDB / Realm                   | Overkill without sync; Drizzle already known                                          |
| Expo Go only                           | AdMob and Firebase native modules need a dev build                                    |
| Custom domain + Cloudflare Pages       | Domain costs money; Firebase `*.web.app` is accepted by AdMob for app-ads.txt (KB #4) |
| In-app purchases / RevenueCat          | Not now (KB #8)                                                                       |

## 6. Running cost

| Item                                      | Cost                           |
| ----------------------------------------- | ------------------------------ |
| Google Play developer account             | Already owned                  |
| Apple Developer Program                   | Already owned (renewal $99/yr) |
| Firebase Hosting + Analytics (Spark plan) | ₹0                             |
| Sentry (free tier)                        | ₹0                             |
| EAS (free tier)                           | ₹0                             |
| Domain                                    | Not needed                     |
| **Total to launch**                       | **₹0**                         |
