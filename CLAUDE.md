# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Shared rules live in `AGENTS.md` (imported above) so every agent follows the same instructions. Edit that file, not this one, for project rules.
- Before multi-file changes, state a short plan (files to touch, migration needed?, tests to add) and then implement.
- When adding a feature, use the skill at `.claude/skills/add-feature/SKILL.md`.
- Run `pnpm lint && pnpm typecheck && pnpm test` before saying a task is done, and report the result.
- If a requirement is ambiguous or conflicts with `docs/KNOWLEDGE_BASE.md`, ask instead of guessing — a wrong mileage number or a lost log is the fastest way to a 1-star review.
- Keep responses concise: summarize what changed, what was tested, and any follow-ups.
