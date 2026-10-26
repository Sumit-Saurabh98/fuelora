---
name: add-feature
description: Step-by-step workflow for adding or changing a feature in Fuelora (new screen, new table or column, new reminder type, calculator, stats, backup format change, ad placement, or notification) across src/domain, src/db, src/repositories, src/services, src/features and app/. Use this whenever the task involves a new screen, schema change, efficiency or unit logic, reminders/notifications, backup, or ads — even if the user only says "add X" or "build the Y screen".
---

# Add a feature

Follow these steps in order. Skip a step only if it clearly doesn't apply, and say which you skipped.

## 1. Understand the rule first

- Find the feature in `docs/REQUIREMENTS.md` and related rules in `docs/KNOWLEDGE_BASE.md`.
- If the behavior isn't specified, ask before coding. Wrong mileage numbers and lost data destroy ratings.
- Out of scope (GPS, sync, login, price APIs, IAP)? Stop and say so.

## 2. Domain (src/domain) — pure TypeScript

- Put rules in classes/functions with no React, Expo or DB imports.
- Use canonical units (`…M`, `…Base`, `…Minor`) and `units.ts` / `money.ts` helpers. Efficiency only via `EfficiencyEngine`.
- Inject `Clock` for anything time-based.
- Add error codes to `src/domain/errors.ts`.
- Write unit tests in `src/domain/__tests__/` first for the tricky cases.

## 3. Database (src/db) — only if schema changes

- Edit `src/db/schema.ts`; every table has `id`, `created_at`, `updated_at`; vehicle-owned tables reference `vehicles(id) on delete cascade` and index starting with `vehicle_id`.
- `pnpm db:generate`, review the SQL; forward-only, never edit an applied migration.
- Add a migration test (previous version DB with data → migrate → data intact).
- If the table holds user data: add it to the backup format (`schemaVersion` + 1), write the step in `backup-migrations.ts`, add an old-version fixture test.

## 4. Repository (src/repositories)

- Interface (`<thing>.repository.ts`) + `Drizzle<Thing>Repository` + `InMemory<Thing>Repository` for tests.
- Queries ordered and filtered by `vehicle_id`; writes that touch several rows run in a transaction.

## 5. Service (src/services)

- Class with constructor-injected interfaces; wire it in `src/container.ts`.
- After any change to fill-ups, services, odometer readings or reminders: call `ReminderService.replan(vehicleId)`.
- Track only allow-listed analytics events (KB §7); add new events to the allow-list first. No user content in params.
- Service tests with InMemory repos + fixed Clock.

## 6. UI (app/ + src/features/<feature>/)

- Route file stays thin; logic in feature hooks (`useLiveQuery` for reads, service calls for writes).
- React Native Paper components, theme tokens, light + dark.
- All strings in `src/i18n/en.json` and `hi.json`; region-specific names from `regions.ts`; numbers/currency via locale formatters.
- Numeric inputs: locale decimal separator, numeric keypad, live derived values.
- Empty state, error state (map `AppError` codes), works at 360dp width and 1.3× font.

## 7. Side effects

- Notifications: only via `NotificationScheduler.sync()`; respect the 60 budget and 09:00 rule. Ask for permission in context, never at launch.
- Ads: only if `docs/ADS.md` lists the placement; call `AdsManager` with a placement key; never on forms, onboarding, backup/restore.
- New permission or network call? Needs a KB decision first (AGENTS.md rules 1 and 13).

## 8. Docs & finish

- Update `docs/LLD.md` (schema, algorithms), `docs/KNOWLEDGE_BASE.md` decision log if a rule changed, `docs/ADS.md` for ad changes, store docs if permissions/data collection changed.
- Run `pnpm lint && pnpm typecheck && pnpm test`.
- Check in airplane mode on a device.
- Summarize: files changed, migration (yes/no), backup version bump (yes/no), tests added, open questions.
