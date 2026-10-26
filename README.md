# Fuelora

Fuel, mileage and service log for bikes, scooters, cars and EVs. Works fully offline: no account, no server, data stays on the phone. Android + iOS from one Expo codebase. Free, ad-supported.

**Store title:** Fuelora: Bike & Car Fuel Log
**Tagline:** Real mileage, fuel cost and service reminders — offline, no login.

## Docs

| File                                                                       | What's inside                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [AGENTS.md](AGENTS.md)                                                     | Rules and commands for AI coding agents                                                    |
| [CLAUDE.md](CLAUDE.md)                                                     | Claude Code entry point (imports AGENTS.md)                                                |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)                               | Target users, features (MVP/v1.1/v2), functional & non-functional requirements             |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                               | High-level design: offline app, components, flows, backup, notifications, ads              |
| [docs/LLD.md](docs/LLD.md)                                                 | Low-level design: SQLite schema, units, efficiency engine, reminder planner, backup format |
| [docs/TECH_STACK.md](docs/TECH_STACK.md)                                   | Technology choices and rationale                                                           |
| [docs/KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md)                           | Market, glossary, business rules, presets, decisions, open questions                       |
| [docs/ADS.md](docs/ADS.md)                                                 | AdMob placements, frequency caps, consent, app-ads.txt, revenue model                      |
| [docs/ROADMAP.md](docs/ROADMAP.md)                                         | 12-week MVP plan                                                                           |
| [docs/PLAY_STORE.md](docs/PLAY_STORE.md)                                   | Google Play listing, data safety, release checklist                                        |
| [docs/APP_STORE.md](docs/APP_STORE.md)                                     | App Store listing, privacy label, review notes                                             |
| [.claude/skills/add-feature/SKILL.md](.claude/skills/add-feature/SKILL.md) | Agent workflow for adding a feature                                                        |

## Quick start (once code exists)

```bash
pnpm install
pnpm start            # Expo dev server (needs a dev build — ads don't run in Expo Go)
pnpm android          # or: pnpm ios
pnpm test
```
