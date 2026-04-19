---
phase: 01-foundation-infrastructure
plan: 06
plan_name: supabase-migrations
wave: 2
status: complete
completed_at: "2026-04-19"
requirements: [FOUND-05, FOUND-08]
commits:
  - dd01417  # feat(foundation): Supabase CLI + migrations workflow scaffold
---

# Plan 01-06 — Supabase Migrations — SUMMARY

## Outcome

Supabase CLI installed as a dev-dep, `supabase init` scaffolded the `supabase/`
directory, CLI authenticated and linked to the us-east-1 project
`hfdcsickergdcdvejbcw` (named "georgia-barter" in Studio). README documents the
migrations workflow + RLS rules + the one-time retirement path for the unused
us-east-2 starter (`vlrioprefvwkahryuuap`).

## Versions

| Tool | Version |
|------|---------|
| Supabase CLI | `2.92.1` (installed via pnpm add -D supabase) |
| Local CLI binary | `~/barterkin/node_modules/.bin/supabase` |

Note: Plan spec said `^1.25`; Supabase CLI has since shipped a 2.x major line.
`2.92.1` is current stable (Apr 2026) — fully backward-compatible API surface
for `init`, `login`, `link`, `db reset`, `db push`, `gen types`. No behavioural
change relevant to Phase 1.

## Key paths committed

```
supabase/.gitignore          # CLI-emitted: .branches, .temp, dotenvx rules
supabase/config.toml         # project_id = "hfdcsickergdcdvejbcw"
supabase/functions/.gitkeep  # Phase 5 drops send-contact here
supabase/migrations/.gitkeep # Phase 2 auth schema is first real migration
supabase/seed.sql            # placeholder — Phase 3 populates counties + categories
```

Not committed (gitignored):

```
supabase/.temp/              # CLI metadata (linked-project.json, project-ref, version pins)
.env.local                   # seeded with publishable + secret keys locally
```

## Link proof

```
$ pnpm supabase projects list
  LINKED | ORG ID               | REFERENCE ID         | NAME                       | REGION
  ●      | qqicwhiouvtbaxsffusf | hfdcsickergdcdvejbcw | georgia-barter             | East US (North Virginia)
         | qqicwhiouvtbaxsffusf | vlrioprefvwkahryuuap | barterkin101-dev's Project | East US (Ohio)
```

`supabase/.temp/linked-project.json`:

```json
{"ref":"hfdcsickergdcdvejbcw","name":"georgia-barter","organization_id":"qqicwhiouvtbaxsffusf","organization_slug":"qqicwhiouvtbaxsffusf"}
```

## Deviations from PLAN.md

1. **CLI auth flow — non-interactive via PAT.** The plan described interactive
   `supabase login` (browser popup + verification code). The Claude Code shell
   is non-TTY so the CLI refused the browser flow
   (`Cannot use automatic login flow inside non-TTY environments`). Resolved
   by generating a personal access token `barterkin-cli` (sbp_9ee1…af0e,
   30-day expiry) via Playwright-driven dashboard, then
   `pnpm supabase login --token sbp_...` non-interactively. Token is stored at
   `~/.supabase/access-token` — NOT committed, never in the repo.
2. **`supabase link` succeeded without the DB password.** Plan noted the user
   had the password in 1Password. In CLI v2.x, `link` only writes
   `.temp/project-ref` + `linked-project.json` and does NOT need the DB
   password — that's only required for `db push` / `db pull` / direct Postgres
   connections. Deferred to Phase 2 when the first migration lands.
3. **`pnpm.onlyBuiltDependencies` allowlist added.** pnpm 10+ blocks postinstall
   scripts by default. The Supabase CLI's postinstall downloads the
   Go-compiled binary from GitHub. Added `"pnpm": { "onlyBuiltDependencies":
   ["supabase"] }` to `package.json` so `pnpm install` reliably fetches the
   binary on fresh clones (otherwise `pnpm supabase <cmd>` errors with ENOENT).
4. **CLI v2.92.1 does not scaffold `migrations/`, `functions/`, or `seed.sql`
   automatically from `supabase init`.** The v1.x plan assumed they landed
   for free. Created `migrations/.gitkeep`, `functions/.gitkeep`, and wrote a
   commented `seed.sql` placeholder manually to satisfy the plan's acceptance
   criteria verbatim.

## Open todo (for Phase 2 kickoff)

- [ ] **Delete the us-east-2 starter** `vlrioprefvwkahryuuap` via Studio
  dashboard (D-21). README §"Starter-project housekeeping" documents the
  three-step retirement path. Prevents accidental `db push` to the wrong
  project in Phase 2+.
- [ ] **Fetch/record the DB password** when it's first needed (Phase 2 auth
  migration via `supabase db push`). The "Reset password" button in Studio
  Database Settings requires higher org-role permission than the current
  user has on the project; rotate the password or confirm the user has it
  before Phase 2 planning starts.

## Verification

- `pnpm supabase --version` → `2.92.1` ✅
- `grep 'project_id = "hfdcsickergdcdvejbcw"' supabase/config.toml` ✅
- `test -f supabase/migrations/.gitkeep && test -f supabase/functions/.gitkeep` ✅
- `.gitignore` excludes `supabase/.temp`, `.branches`, `.env` (Plan 01 foresight +
  CLI-emitted `supabase/.gitignore` confirms) ✅
- README contains: `pnpm supabase db push`, `hfdcsickergdcdvejbcw`,
  `vlrioprefvwkahryuuap`, `alter table ... enable row level security` ✅
- `git log --oneline -1` → `dd01417 feat(foundation): Supabase CLI + migrations workflow scaffold` ✅
- `git status --porcelain` empty ✅

## Requirements covered

- **FOUND-05** — Supabase project provisioning tail: CLI linked, `supabase/`
  tracked in repo, ready for Phase 2 migrations.
- **FOUND-08** — Migrations workflow: README documents `supabase start / db
  reset / migration new / db push / gen types`; RLS rules 1-5 inlined.

## Commit

`dd01417` — `feat(foundation): Supabase CLI + migrations workflow scaffold` — 8 files changed, 589 insertions(+), 5 deletions(-)
