---
phase: 01-foundation-infrastructure
plan: 06
plan_number: 6
plan_name: supabase-migrations
type: execute
wave: 2
depends_on: [2]
files_modified:
  - /Users/ashleyakbar/barterkin/package.json
  - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
  - /Users/ashleyakbar/barterkin/supabase/config.toml
  - /Users/ashleyakbar/barterkin/supabase/migrations/.gitkeep
  - /Users/ashleyakbar/barterkin/supabase/functions/.gitkeep
  - /Users/ashleyakbar/barterkin/supabase/seed.sql
  - /Users/ashleyakbar/barterkin/.gitignore
  - /Users/ashleyakbar/barterkin/README.md
autonomous: false
requirements:
  - FOUND-05
  - FOUND-08
must_haves:
  truths:
    - "`supabase` CLI installed as devDependency (pnpm supabase --version returns 1.x or later)"
    - "`supabase/config.toml` committed, linked to project-ref `hfdcsickergdcdvejbcw` (us-east-1)"
    - "`supabase/migrations/` directory committed (via .gitkeep; Phase 2 adds first real migration)"
    - "`supabase/functions/` directory committed (via .gitkeep; Phase 5 adds send-contact)"
    - "`supabase/seed.sql` placeholder committed"
    - ".gitignore excludes supabase/.temp, supabase/.branches, supabase/.env"
    - "README documents `pnpm supabase start`, `pnpm supabase db reset`, `pnpm supabase db push` workflow"
    - "us-east-2 starter project (`vlrioprefvwkahryuuap`) retired — D-21 housekeeping"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/supabase/config.toml"
      provides: "Supabase CLI project config linked to hfdcsickergdcdvejbcw"
      contains: "project_id = \"hfdcsickergdcdvejbcw\""
    - path: "/Users/ashleyakbar/barterkin/supabase/migrations/.gitkeep"
      provides: "Ensures the migrations dir is tracked even while empty"
    - path: "/Users/ashleyakbar/barterkin/supabase/functions/.gitkeep"
      provides: "Ensures the functions dir is tracked; Phase 5 drops send-contact here"
    - path: "/Users/ashleyakbar/barterkin/supabase/seed.sql"
      provides: "Placeholder seed file; Phase 3 populates counties + categories"
      contains: "-- seed.sql"
  key_links:
    - from: "supabase/config.toml"
      to: "Supabase project hfdcsickergdcdvejbcw (us-east-1)"
      via: "project_id field + `supabase link` binding"
      pattern: "hfdcsickergdcdvejbcw"
    - from: ".gitignore"
      to: "supabase/.env + supabase/.temp + supabase/.branches"
      via: "exclude patterns from Plan 01"
      pattern: "supabase/\\.(temp|branches|env)"
---

<objective>
Install the Supabase CLI as a dev-dep, run `supabase init` to scaffold the `supabase/` directory, `supabase link` it to the us-east-1 project (`hfdcsickergdcdvejbcw`), commit the non-secret config, and retire the auto-created us-east-2 starter project (`vlrioprefvwkahryuuap`, D-21). No real migrations land here — Phase 2 auth schema is the first real migration.

Purpose: FOUND-08 requires a `supabase/migrations/` workflow that's reproducible via `supabase db reset`. Establishing the directory structure + project link in Phase 1 means Phase 2 can write its first migration without wrestling with `supabase link` errors (PITFALLS Pitfall 7). The D-21 retire step prevents a future developer from accidentally pushing a migration to the wrong (us-east-2) project.

Output: `supabase/` directory scaffolded + linked, CLI available as `pnpm supabase <cmd>`, README workflow section, us-east-2 starter deleted.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md
@/Users/ashleyakbar/barterkin/.planning/research/PITFALLS.md
@/Users/ashleyakbar/barterkin/README.md
@/Users/ashleyakbar/barterkin/.gitignore
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-02-SUMMARY.md

<interfaces>
Supabase project identifiers (from CONTEXT D-19, D-21, and memory):
- Keep: `hfdcsickergdcdvejbcw` (us-east-1) — named `georgia-barter` per D-19 (rename in Studio to `barterkin` is optional housekeeping)
- Retire: `vlrioprefvwkahryuuap` (us-east-2) — auto-created starter, not used

Supabase CLI version: `^1.25.0` (per RESEARCH Standard Stack)

`supabase init` produces:
- `supabase/config.toml` — non-secret project config (commit)
- `supabase/seed.sql` — empty seed (commit)
- `supabase/migrations/` — empty dir (commit with .gitkeep)
- `supabase/functions/` — empty dir (commit with .gitkeep)
- `.gitignore` inside `supabase/` — CLI may regenerate; ensure root .gitignore covers `.temp`, `.branches`, `.env`

`supabase link` requires authenticated CLI; planner must document the `supabase login` step but cannot script it non-interactively (it opens a browser). Hence this plan is `autonomous: false` on Task 1.

No .sql files beyond `.gitkeep` are added in Phase 1 — per the `<planning_context>`: "Phase 1 does NOT create actual migrations (that's Phase 2 auth schema). No `[BLOCKING]` schema push task required."
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Install Supabase CLI, run `supabase init`, link to us-east-1 project</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - /Users/ashleyakbar/barterkin/supabase/config.toml
    - /Users/ashleyakbar/barterkin/supabase/seed.sql
    - /Users/ashleyakbar/barterkin/supabase/migrations/.gitkeep
    - /Users/ashleyakbar/barterkin/supabase/functions/.gitkeep
    - /Users/ashleyakbar/barterkin/.gitignore
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Pattern 5 (lines ~577-619), Pitfall 7 (supabase link sequencing)
    - /Users/ashleyakbar/barterkin/.gitignore (current Plan 01 rules)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md D-18..D-21
  </read_first>
  <action>
  Step 1 — Install CLI as dev-dep:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm add -D supabase
  pnpm supabase --version   # expect 1.25.x or later
  ```

  Step 2 — `supabase init` (creates supabase/config.toml, supabase/seed.sql, supabase/migrations/, supabase/functions/):
  ```bash
  pnpm supabase init
  # Answer prompts:
  #  - Generate VS Code settings? (no)
  #  - Generate Intellij IDEA settings? (no)
  ```

  Step 3 — Authenticate the CLI (interactive — opens browser; this is WHY this task is `checkpoint:human-action`):
  ```bash
  pnpm supabase login
  # A browser opens → Supabase dashboard → approves CLI → paste access token.
  ```

  Step 4 — Link to the us-east-1 project (PITFALLS Pitfall 7 — do this before any future `db push`):
  ```bash
  pnpm supabase link --project-ref hfdcsickergdcdvejbcw
  # Prompts for the DB password — the developer has this in 1Password.
  # Produces / updates supabase/config.toml with project_id = "hfdcsickergdcdvejbcw"
  ```

  Step 5 — Add `.gitkeep` files so empty dirs are tracked (git doesn't track empty directories natively):
  ```bash
  touch supabase/migrations/.gitkeep
  touch supabase/functions/.gitkeep
  ```

  Step 6 — Replace `supabase/seed.sql` (supabase init emits an empty file) with a Phase-1 placeholder noting what Phase 3 will populate:
  ```sql
  -- supabase/seed.sql
  -- Phase 1 placeholder — no seed data yet.
  --
  -- Phase 3 (Profile & Georgia Gate) will seed:
  --   - `counties` (159 Georgia counties, FIPS codes from public.counties reference data)
  --   - `categories` (10 Georgia-community categories per CONTEXT + REQUIREMENTS.md PROF-06)
  -- Phase 7 (Pre-Launch Seeding) will add founding-member profile stubs via a separate admin script, NOT this file.
  --
  -- See .planning/research/ARCHITECTURE.md §4 for RLS conventions every future migration MUST follow:
  --   1. Every public.* table MUST have `alter table enable row level security` in the same migration.
  --   2. Every RLS-enabled table MUST have explicit policies for SELECT, INSERT, UPDATE, DELETE (missing = locked).
  --   3. All policies MUST specify `to authenticated` or `to anon` — never empty TO clause.
  --   4. `auth.uid()` MUST be wrapped as `(select auth.uid())` for initPlan caching.

  select 1;
  ```

  Step 7 — Extend `.gitignore` with Supabase CLI artefacts (Plan 01 covered most; double-check):
  ```bash
  # Verify these lines exist; append if missing:
  grep -qE "^supabase/\.temp$" .gitignore        || echo "supabase/.temp" >> .gitignore
  grep -qE "^supabase/\.branches$" .gitignore    || echo "supabase/.branches" >> .gitignore
  grep -qE "^supabase/\.env$" .gitignore         || echo "supabase/.env" >> .gitignore
  ```

  Step 8 — Confirm `config.toml` points at the correct project ref:
  ```bash
  grep -q 'project_id = "hfdcsickergdcdvejbcw"' supabase/config.toml || echo "WARN: config.toml project_id not set; re-run supabase link"
  ```

  This task is `checkpoint:human-action` because `supabase login` + `supabase link` both require interactive input (browser auth + DB password from 1Password). After the developer completes both, signal `resume`.
  </action>
  <acceptance_criteria>
    - `jq -r '.devDependencies.supabase' /Users/ashleyakbar/barterkin/package.json` matches `^1.25` or later
    - `test -f /Users/ashleyakbar/barterkin/supabase/config.toml`
    - `grep -q 'project_id = "hfdcsickergdcdvejbcw"' /Users/ashleyakbar/barterkin/supabase/config.toml`
    - `test -f /Users/ashleyakbar/barterkin/supabase/seed.sql`
    - `grep -q "Phase 1 placeholder" /Users/ashleyakbar/barterkin/supabase/seed.sql`
    - `test -f /Users/ashleyakbar/barterkin/supabase/migrations/.gitkeep`
    - `test -f /Users/ashleyakbar/barterkin/supabase/functions/.gitkeep`
    - `grep -q "^supabase/\.temp$" /Users/ashleyakbar/barterkin/.gitignore` and `grep -q "^supabase/\.branches$" /Users/ashleyakbar/barterkin/.gitignore` and `grep -q "^supabase/\.env$" /Users/ashleyakbar/barterkin/.gitignore`
    - `cd /Users/ashleyakbar/barterkin && pnpm supabase --version` exits 0 and prints a version
    - `cd /Users/ashleyakbar/barterkin && pnpm supabase projects list` (when authenticated) includes `hfdcsickergdcdvejbcw` — indirect proof the CLI is linked
    - No `.sql` file in `supabase/migrations/` (Phase 1 has no real migrations — only `.gitkeep`): `ls /Users/ashleyakbar/barterkin/supabase/migrations/*.sql 2>/dev/null | wc -l` returns `0`
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm supabase --version && grep -q 'project_id = "hfdcsickergdcdvejbcw"' supabase/config.toml && test -f supabase/migrations/.gitkeep && test -f supabase/functions/.gitkeep</automated>
  </verify>
  <done>CLI installed, supabase/ dir scaffolded + linked to us-east-1, .gitkeep files in place, .gitignore extended, seed.sql has explanatory placeholder.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Document migrations workflow in README, retire us-east-2 starter, commit</name>
  <files>
    - /Users/ashleyakbar/barterkin/README.md
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/README.md (Plans 01 + 05 versions — the "Supabase migrations" section already stubbed in Plan 01 needs fleshing out)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md D-18..D-21
  </read_first>
  <action>
  Step 1 — Expand the existing "Supabase migrations" section in `README.md` with a full workflow guide (D-18..D-20). Use the Edit tool to replace the placeholder block from Plan 01 with:
  ```markdown
  ## Supabase migrations

  **Project:** `hfdcsickergdcdvejbcw` (us-east-1), linked via `supabase/config.toml`.

  Migrations live at `supabase/migrations/*.sql` and are the source of truth for the schema. Run them locally against a Dockerised Postgres via `supabase start`, then push to remote with `supabase db push`.

  ### Local workflow

  ```bash
  pnpm supabase start          # boots local Postgres + Auth + Storage (requires Docker Desktop)
  pnpm supabase db reset       # wipes local DB + re-applies every migration in order
  pnpm supabase migration new <slug>   # scaffolds supabase/migrations/<ts>_<slug>.sql
  # ... edit the generated .sql file ...
  pnpm supabase db reset       # re-apply locally + verify
  pnpm supabase db push        # apply to remote (us-east-1). Prompts for DB password.
  ```

  ### Regenerate Database types after every migration

  ```bash
  pnpm supabase gen types typescript --local > lib/database.types.ts
  # Then `pnpm typecheck` — any breakage signals RLS / column drift.
  ```

  ### Rules (ABSOLUTE — documented in migrations/README and in supabase/seed.sql)

  1. Every `public.*` table MUST include `alter table <name> enable row level security` **in the same migration** that creates the table.
  2. Every RLS-enabled table MUST have explicit policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` (missing command = fully locked; see `.planning/research/PITFALLS.md` Pitfall 6).
  3. Every policy MUST specify `to authenticated` or `to anon` — never an empty `TO` clause.
  4. `auth.uid()` in policies MUST be wrapped as `(select auth.uid())` for initPlan caching (performance at scale).
  5. Never `alter table ... disable row level security` in a migration. If you need to debug, use `set local role authenticated` in `psql`.

  ### CI behaviour

  GitHub Actions runs `supabase db reset` against an ephemeral local Postgres for integration tests (per D-20). CI does **not** apply migrations to production — `db push` is a manual developer step. Revisit this policy when a second engineer joins.
  ```

  Step 2 — Retire the us-east-2 starter (D-21). This is **informational** here — the developer deletes it in Supabase Studio. Append to README:
  ```markdown
  ## Starter-project housekeeping (one-time)

  The `vlrioprefvwkahryuuap` (us-east-2) project was auto-created when the Supabase account was set up. It's not used. Delete it once the scaffold has confirmed connectivity to `hfdcsickergdcdvejbcw`:

  1. Visit https://supabase.com/dashboard/project/vlrioprefvwkahryuuap/settings/general
  2. Scroll to the "Danger Zone" → Delete project.
  3. Confirm by typing the project name.

  After deletion, `pnpm supabase projects list` shows only `hfdcsickergdcdvejbcw`.
  ```

  Step 3 — Commit:
  ```bash
  cd /Users/ashleyakbar/barterkin
  git add package.json pnpm-lock.yaml supabase/ .gitignore README.md
  git commit -m "feat(foundation): Supabase CLI + migrations workflow scaffold

- pnpm add -D supabase (CLI as dev-dep, D-19)
- supabase init → supabase/{config.toml, seed.sql, migrations/.gitkeep, functions/.gitkeep}
- Linked to us-east-1 project hfdcsickergdcdvejbcw (D-19, PITFALLS Pitfall 7)
- .gitignore extends with supabase/.temp, .branches, .env
- README: migrations workflow (local + push + db reset + gen types) + RLS rules + us-east-2 starter retirement instructions (D-21)

Phase 1 has NO real migrations — first migration lands in Phase 2 auth.

Covers FOUND-05 (Supabase provisioning tail), FOUND-08 (migrations workflow)."
  git push origin main
  ```
  </action>
  <acceptance_criteria>
    - `grep -q "pnpm supabase start" /Users/ashleyakbar/barterkin/README.md` and `grep -q "pnpm supabase db reset" /Users/ashleyakbar/barterkin/README.md` and `grep -q "pnpm supabase db push" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "gen types typescript --local" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "hfdcsickergdcdvejbcw" /Users/ashleyakbar/barterkin/README.md` (project ref documented)
    - `grep -q "vlrioprefvwkahryuuap" /Users/ashleyakbar/barterkin/README.md` (retirement instructions)
    - `grep -q "alter table.*enable row level security" /Users/ashleyakbar/barterkin/README.md` (Rule 1 inlined)
    - `git log --oneline -1 | grep -q "Supabase CLI + migrations workflow scaffold"`
    - Working tree clean: `test -z "$(git status --porcelain)"`
    - `git ls-files supabase/ | wc -l` returns at least `4` (config.toml, seed.sql, migrations/.gitkeep, functions/.gitkeep)
    - `git ls-files supabase/.temp 2>/dev/null | wc -l` returns `0` (CLI temp files not tracked)
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && grep -q "pnpm supabase db push" README.md && grep -q "hfdcsickergdcdvejbcw" README.md && grep -q "vlrioprefvwkahryuuap" README.md && git log --oneline -1 | grep -q "Supabase CLI" && test -z "$(git status --porcelain)"</automated>
  </verify>
  <done>README has full migrations workflow + retirement instructions; config.toml + .gitkeep files committed; us-east-2 retirement documented as a one-time manual step.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `supabase/config.toml` → public repo | Config contains `project_id` (non-secret) only; DB password, service-role key, JWT secret all live in Supabase Studio / developer 1Password. |
| Supabase CLI → Supabase API | Auth via token stored by CLI at `~/.supabase/`; never committed. |
| `supabase/.env` (if CLI creates one) | Ignored via `.gitignore` from Plan 01 + extension here. |
| us-east-2 starter project existing | Risk: a future `supabase link --project-ref` with the wrong ref pushes a migration to the wrong DB. Mitigation: delete the project. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01 | Information Disclosure | `supabase/config.toml` committed with secrets | mitigate | `supabase init` writes only `project_id` + non-secret options; DB password prompt at `supabase link` time stores in `supabase/.env` which is gitignored |
| T-06-02 | Tampering | Migration pushed to the wrong (us-east-2) project | mitigate | Task 2 documents D-21 retirement. Acceptance criterion: `pnpm supabase projects list` shows only `hfdcsickergdcdvejbcw` after retirement (manual step for the developer) |
| T-06-03 | Spoofing | Developer runs `db push` against a project they're not linked to | mitigate | `supabase db push` refuses without a prior `supabase link` (PITFALLS Pitfall 7 handled by the scripted `--project-ref hfdcsickergdcdvejbcw` invocation) |
| T-06-04 | Information Disclosure | `supabase/.env` accidentally committed | mitigate | `.gitignore` covers `supabase/.env` (added here); Plan 08 gitleaks CI catches any Supabase-key-like string in a PR |
| T-06-05 | Elevation of Privilege | Future migration missing `enable row level security` ships with an open table | mitigate | README Rules 1–5 documented; Phase 2+ `/gsd-verify-work` checker will grep migrations for `enable row level security` per every new `create table public.*` (not enforced here but policy is recorded) |
</threat_model>

<verification>
Plan 06 is complete when:
1. `pnpm supabase --version` returns 1.25.x+
2. `supabase/config.toml` contains `project_id = "hfdcsickergdcdvejbcw"`
3. `.gitkeep` files exist in `supabase/migrations/` and `supabase/functions/`
4. `supabase/seed.sql` placeholder committed with explanatory header
5. `.gitignore` excludes `supabase/.temp`, `.branches`, `.env`
6. README has full migrations workflow section + RLS rules + D-21 retirement instructions
7. Commit on `origin/main`
</verification>

<success_criteria>
- FOUND-05 satisfied (Supabase project linked + substrate scaffolded; pre-phase project-creation already done)
- FOUND-08 satisfied (migrations workflow in place; reproducible via `supabase db reset`; first real migration lands in Phase 2)
- D-21 retirement path documented; developer will delete us-east-2 starter before Phase 2 begins
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-06-SUMMARY.md`. Capture the exact installed `supabase` CLI version, confirmation that `supabase link` succeeded (e.g. `pnpm supabase status` output), and the commit SHA. Note whether the developer has retired the us-east-2 project (this is a manual Studio step that happens alongside the plan; if not done yet, log it as an open todo for Phase 2 prep).
</output>
