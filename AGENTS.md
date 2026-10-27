# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repo.

## Project in one paragraph

**Fuelora** is a free, ad-supported mobile app (Android + iOS, one Expo codebase) for people who own bikes, scooters, cars or EVs, anywhere in the world (marketing starts in India). Users log fill-ups/charges and services; the app shows real fuel efficiency, fuel cost and cost per distance, and reminds them about services and document renewals (insurance, emission test, registration, licence). **Everything runs on the device**: no backend, no accounts, no cloud sync. The only network traffic is ads (AdMob + consent), analytics and crash reports (KB #3, #12).

## Read before working

| If you are touching…                              | Read                                                           |
| ------------------------------------------------- | -------------------------------------------------------------- |
| Anything                                          | `docs/KNOWLEDGE_BASE.md` (business rules, glossary, decisions) |
| A feature / behavior                              | `docs/REQUIREMENTS.md`                                         |
| Structure, flows, backup, notifications           | `docs/ARCHITECTURE.md`                                         |
| Schema, units, efficiency math, reminder planning | `docs/LLD.md`                                                  |
| Ads, consent, ad placement                        | `docs/ADS.md`                                                  |
| Libraries / tools                                 | `docs/TECH_STACK.md`                                           |
| Store listing, permissions, data safety           | `docs/PLAY_STORE.md`, `docs/APP_STORE.md`                      |
| Adding a feature                                  | `.claude/skills/add-feature/SKILL.md`                          |

## Repo map

```
app/                 Expo Router routes (screens are thin: layout + hooks)
src/domain/          Pure TypeScript: units, money, EfficiencyEngine, ReminderPlanner, presets. No React/Expo imports.
src/db/              Drizzle schema, generated migrations, SQLite client
src/repositories/    Interface per aggregate + Drizzle implementation
src/services/        Use cases (FillUpService, ReminderService, BackupService, …)
src/features/<x>/    Feature UI: components + hooks
src/ads/             AdsManager, consent (UMP/ATT), ad unit config
src/notifications/   NotificationScheduler (local notifications only)
src/analytics/       Analytics wrapper (allow-listed events only)
src/i18n/            en.json, hi.json
src/ui/              Theme, shared components
src/container.ts     Composition root (hand-written wiring)
web/                 Static site for Firebase Hosting: privacy, terms, support, app-ads.txt
docs/                Product and design docs
```

## Commands

```bash
pnpm install
pnpm start                     # expo start (dev client)
pnpm android / pnpm ios        # run on device/emulator
pnpm test                      # jest (jest-expo)
pnpm test -- efficiency        # one test file/pattern
pnpm lint && pnpm typecheck    # typecheck regenerates expo-router route types first
pnpm routes:types              # regenerate route types only (normally done by expo start)
pnpm db:generate               # drizzle-kit generate after a schema change
eas build --profile development --platform android   # dev build (ads need it)
firebase deploy --only hosting # publish web/ (privacy, app-ads.txt)
```

## Non-negotiable rules

1. **Offline, no backend:** never add a server, account system, cloud database or sync. Allowed network calls: AdMob/UMP, Firebase Analytics, Sentry. Anything else needs a decision in `docs/KNOWLEDGE_BASE.md` first.
2. **User data stays on the device.** Vehicle names, plates, odometer, costs, notes, stations never go to analytics, Sentry breadcrumbs or ads targeting. The only way data leaves is a user-initiated export/share.
3. **Units:** store canonical values only — distance in **metres** (`…M`), quantity in **base units** (`…Base`: mL for liquid fuel, g for CNG, Wh for electric). Convert only through `src/domain/units.ts`, at the input/display edge. Never store km, miles, litres or gallons.
4. **Money:** integer minor units (`…Minor`) + ISO currency code. No floats in storage; arithmetic via `src/domain/money.ts`; display via `Intl.NumberFormat`. Minor-unit digits come from the currency (₹ 2, $ 2, ¥ 0).
5. **Efficiency is computed in exactly one place:** `EfficiencyEngine` (`src/domain/efficiency.ts`). Screens and services never compute km/L, mpg or cost per km themselves. Full-to-full rules: `docs/LLD.md` §4.
6. **Time:** inject `Clock`; never call `new Date()` / `Date.now()` in domain or services. Store instants as UTC ISO strings plus the entry's `localDate` (YYYY-MM-DD) for grouping.
7. **Ads only through `AdsManager`.** Never show ads on onboarding, entry/edit forms, backup/restore or during the first session. Caps and placements: `docs/ADS.md`. Always test ad unit IDs in dev builds.
8. **Notifications only through `NotificationScheduler`.** Local notifications only. Keep total scheduled ≤ 60 (iOS hard limit is 64) and reschedule on app foreground and after every data change.
9. **i18n:** no hard-coded user-facing strings — add keys to both `en.json` and `hi.json`. Region-specific names (PUC/MOT/emission test) come from `src/domain/regions.ts`.
10. **Migrations:** drizzle-kit generated, forward-only, never edit an applied migration. An app update must open every older database. The backup file has `schemaVersion`; the importer must accept every version ever shipped.
11. **Layers:** screen → hook → service → repository → db. Screens never import `src/db`. A service may call another service, never another aggregate's repository directly.
12. **Never lose data:** destructive actions (delete vehicle, restore backup = replace all) need a confirm step; restore makes an automatic safety backup first.
13. **Permissions:** MVP asks only for notifications (when the user first creates a reminder, not at launch) and ATT on iOS (via the consent flow). No location, contacts, camera or storage permission without a KB decision.

## Code style

- TypeScript `strict`; no `any` (use `unknown` + narrowing).
- Named exports; file names `kebab-case` or `<thing>.<layer>.ts` (e.g. `fill-up.service.ts`).
- Errors: throw `AppError(code, message, details)` with codes from `src/domain/errors.ts`; screens map codes to i18n messages.
- **Practical OOP + SOLID** (same approach as CoachingDesk):
  - Domain concepts are **value objects / classes** where they carry rules (`Money`, `Distance`, `Quantity`, `EfficiencyEngine`, `ReminderPlanner`); pure, no I/O, easy to unit test.
  - **Services** are classes whose dependencies are **interfaces passed into the constructor** (`Clock`, `IdGenerator`, `FillUpRepository`, `NotificationScheduler`, `Analytics`).
  - **Repositories:** interface per aggregate + `Drizzle*` implementation; tests use `InMemory*` implementations.
  - Wiring happens in one composition root: `src/container.ts`. No DI framework.
  - No deep inheritance, no abstract base class until a second real implementation exists.
- UI is **React function components + hooks** only. Data reads use Drizzle `useLiveQuery` inside feature hooks.
- Glue code stays plain functions (routes, config, small helpers).
- Tests live in `__tests__/` next to the code they test.
- Formatting is Prettier's job (`pnpm format`).
- Comments explain _why_, not _what_.

## Testing expectations

- `src/domain` changes → unit tests. The efficiency engine and unit conversion must keep every fixture case in `docs/LLD.md` §4.4 passing.
- New service → tests with `InMemory*` repositories and a fixed `Clock`.
- Schema change → migration test: create a DB at the previous version with sample data, run migrations, assert data intact.
- Backup format change → import test for every previous `schemaVersion` fixture in `src/services/__tests__/fixtures/`.
- Notification logic → test the planner output (what would be scheduled), not the OS.
- Key user flows have Maestro flows in `.maestro/` (add vehicle, add fill-up, see mileage, create reminder, backup + restore).

## Definition of done

- [ ] Lint, typecheck, tests pass
- [ ] Docs updated if behavior/schema changed (`LLD.md`, `KNOWLEDGE_BASE.md` decision log, `ADS.md`)
- [ ] Translations added (en + hi)
- [ ] Works offline (airplane mode) and on a small Android screen (360dp wide)
- [ ] No user data in analytics/Sentry
- [ ] Migration included for schema changes

## Don'ts

- Don't add dependencies without a reason in the commit message; prefer Expo SDK packages.
- Don't build out-of-scope features: GPS trip tracking, cloud sync, login, fuel-price APIs, social features, OCR (KB §8 lists proposals).
- Don't add in-app purchases (KB #8).
- Don't place ads anywhere not listed in `docs/ADS.md`.
- Don't make mileage-boosting or fuel-saving claims in app copy or store text.
- Don't use `Intl` `formatToParts` or `resolvedOptions`: Hermes on iOS lacks them (KB #23). Read values from `format()` output; lint enforces this. Tests run on Node's full ICU, so check new `Intl` usage on the iOS Simulator.
