---
phase: 01-foundation-infrastructure
plan: 01
plan_number: 1
plan_name: repo-init
type: execute
wave: 0
depends_on: []
files_modified:
  - /Users/ashleyakbar/barterkin/.gitignore
  - /Users/ashleyakbar/barterkin/README.md
  - /Users/ashleyakbar/barterkin/.env.local.example
  - /Users/ashleyakbar/barterkin/legacy/index.html
autonomous: false
requirements:
  - FOUND-01
  - FOUND-11
  - FOUND-12
user_setup:
  - service: github
    why: "Public repo creation requires authenticated gh CLI"
    env_vars: []
    dashboard_config:
      - task: "Ensure `gh auth status` reports logged in as Biznomad"
        location: "Local terminal"

must_haves:
  truths:
    - "Local folder ~/georgia-barter is renamed to ~/barterkin; old path no longer exists"
    - "Public GitHub repo `Biznomad/barterkin` exists with description and topic tags"
    - "legacy/index.html exists inside the repo (moved from root)"
    - ".gitignore ignores node_modules, .env.local, .vercel, .next, supabase/.branches, .DS_Store"
    - ".env.local.example contains placeholder keys only and is committed; .env.local is not tracked"
    - "README.md contains brand framing and dev-setup instructions"
    - "Initial git commit `chore(foundation): repo scaffold` lands on main"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/.gitignore"
      provides: "Ignore rules excluding secrets, build artifacts, OS files"
      contains: "node_modules, .env.local, .vercel, .next, supabase/.branches"
    - path: "/Users/ashleyakbar/barterkin/README.md"
      provides: "Brand framing and setup instructions"
      contains: "Barterkin"
    - path: "/Users/ashleyakbar/barterkin/.env.local.example"
      provides: "Env-var template with NEXT_PUBLIC_ and server-only vars separated"
      contains: "NEXT_PUBLIC_SUPABASE_URL"
    - path: "/Users/ashleyakbar/barterkin/legacy/index.html"
      provides: "Legacy Netlify landing kept as design reference"
      contains: "<!DOCTYPE html>"
  key_links:
    - from: "Local filesystem"
      to: "GitHub Biznomad/barterkin"
      via: "git remote origin"
      pattern: "git@github.com:Biznomad/barterkin.git|https://github.com/Biznomad/barterkin"
    - from: ".env.local.example"
      to: ".gitignore"
      via: "`.env.local` pattern in .gitignore; `.env.local.example` explicitly tracked"
      pattern: ".env.local"
---

<objective>
Rename local folder, create the public GitHub repository, move the legacy index.html into the repo, and seed the bootstrap files (`.gitignore`, `README.md`, `.env.local.example`) so every subsequent Wave 1+ plan has a committed, remote-backed working tree to build on.

Purpose: D-01/D-02/D-03/D-05/D-07/D-22 require the public `barterkin` repo under the renamed folder before any scaffold can happen. Treating this as Wave 0 means the folder rename landmine (PITFALLS.md Pitfall 6) bites once, here, and never again.

Output: Renamed local folder `~/barterkin`, empty git-initialised repo with legacy/, README.md, .gitignore, .env.local.example committed and pushed to `Biznomad/barterkin` (public).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ashleyakbar/barterkin/.planning/STATE.md
@/Users/ashleyakbar/barterkin/.planning/ROADMAP.md
@/Users/ashleyakbar/barterkin/.planning/REQUIREMENTS.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md
@/Users/ashleyakbar/barterkin/.planning/research/PITFALLS.md

<interfaces>
Live identifiers (from CONTEXT §canonical_refs, memory file):
- GitHub org/user: `Biznomad`
- Repo name: `barterkin` (public)
- Supabase project ref (us-east-1): `hfdcsickergdcdvejbcw`
- Cloudflare zone: `62def5475df0d359095a370e051404e0`
- PostHog project id: `387571`
- Vercel team id: `team_lgW6L6OTcKom1vrTkNwdsGJ4`
- Local Node path: `~/node/bin` (Node v22.14.0)
- gh CLI path: `~/bin/gh`

D-08 env-var boundary (locked):
- CLIENT-SAFE (browser bundle OK): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SITE_URL`
- SERVER-ONLY (NEVER `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Rename local folder and create public GitHub repo</name>
  <files>
    - /Users/ashleyakbar/barterkin → /Users/ashleyakbar/barterkin (rename)
    - GitHub: Biznomad/barterkin (create)
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md (D-01, D-02, D-22)
    - /Users/ashleyakbar/.claude/projects/-Users-ashleyakbar/memory/georgia-barter.md (for operational identifiers; the planner notes this file will be renamed at the end of this task — read it before any rename)
  </read_first>
  <action>
  Step 1 — Pre-rename verification (from `/Users/ashleyakbar`):
  ```bash
  ls -la /Users/ashleyakbar/barterkin         # confirm source exists
  ls -la /Users/ashleyakbar/barterkin 2>/dev/null  # MUST be empty/nonexistent
  git -C /Users/ashleyakbar/barterkin status  # ensure no uncommitted planning changes
  ```
  If `/Users/ashleyakbar/barterkin` already exists, STOP and ask user (do not overwrite).

  Step 2 — Perform the rename:
  ```bash
  mv /Users/ashleyakbar/barterkin /Users/ashleyakbar/barterkin
  cd /Users/ashleyakbar/barterkin
  pwd   # expect: /Users/ashleyakbar/barterkin
  ```

  Step 3 — Update path references in planning artefacts (grep-replace absolute paths ONLY; do NOT replace brand references to "Georgia Barter"):
  ```bash
  grep -rl "/Users/ashleyakbar/barterkin" /Users/ashleyakbar/barterkin/.planning /Users/ashleyakbar/barterkin/CLAUDE.md 2>/dev/null
  # For each match, replace '/Users/ashleyakbar/barterkin' with '/Users/ashleyakbar/barterkin'
  ```
  Use sed via Edit tool per file — do NOT blanket-replace the string "georgia-barter" (it appears in planning prose referencing the old brand, which is a separate concern).

  Step 4 — Rename the memory file:
  ```bash
  mv /Users/ashleyakbar/.claude/projects/-Users-ashleyakbar/memory/georgia-barter.md \
     /Users/ashleyakbar/.claude/projects/-Users-ashleyakbar/memory/barterkin.md
  ```
  Then Edit `/Users/ashleyakbar/.claude/projects/-Users-ashleyakbar/memory/MEMORY.md` and change the `[Georgia Barter](./georgia-barter.md)` reference to `[Barterkin](./barterkin.md)` (path only — label change optional per D-22 spirit).

  Step 5 — Initialise git (if not already a repo — STATE.md says `Is directory a git repo: No`):
  ```bash
  cd /Users/ashleyakbar/barterkin
  git init -b main
  git config user.email "contact@biznomad.io"
  git config user.name "Ashley Akbar"
  ```

  Step 6 — Create the GitHub repo (authenticated via `~/bin/gh`; MUST be `--public` per D-02):
  ```bash
  ~/bin/gh repo create Biznomad/barterkin \
    --public \
    --description "Barterkin — Georgia's community skills exchange. Find Georgians offering and wanting skills; barter your way. Web app + future mobile (Capacitor)." \
    --source=/Users/ashleyakbar/barterkin \
    --remote=origin
  ```
  Add repository topics (D-01 specifics + tags requested):
  ```bash
  ~/bin/gh repo edit Biznomad/barterkin --add-topic nextjs --add-topic supabase --add-topic community --add-topic barter --add-topic georgia --add-topic skills --add-topic pwa
  ```

  This task is `checkpoint:human-action` because `gh repo create` may prompt for re-auth or TOTP and `gh auth status` must already show an authenticated session. If the checkpoint stalls, user completes interactive auth then signals `resume`.
  </action>
  <acceptance_criteria>
    - `pwd` in shell returns `/Users/ashleyakbar/barterkin` (old `/Users/ashleyakbar/barterkin` yields `No such file or directory`).
    - `~/bin/gh repo view Biznomad/barterkin --json name,visibility,isPrivate,repositoryTopics` returns `{"name":"barterkin","visibility":"PUBLIC","isPrivate":false,...}` with all 7 topics present.
    - `git -C /Users/ashleyakbar/barterkin remote -v` shows `origin` pointing at `Biznomad/barterkin` (either SSH or HTTPS form).
    - `ls /Users/ashleyakbar/.claude/projects/-Users-ashleyakbar/memory/barterkin.md` exists; `ls /Users/ashleyakbar/.claude/projects/-Users-ashleyakbar/memory/georgia-barter.md` does NOT exist.
    - `grep -l "/Users/ashleyakbar/barterkin" /Users/ashleyakbar/barterkin/.planning/**/*.md /Users/ashleyakbar/barterkin/CLAUDE.md 2>/dev/null | wc -l` returns `0` (no path-stale references).
  </acceptance_criteria>
  <verify>
    <automated>test "$(pwd)" = "/Users/ashleyakbar/barterkin" && ~/bin/gh repo view Biznomad/barterkin --json visibility -q .visibility | grep -q PUBLIC && git -C /Users/ashleyakbar/barterkin remote -v | grep -q barterkin.git</automated>
  </verify>
  <done>Folder renamed, memory file renamed, planning-path references updated, public `Biznomad/barterkin` repo exists with topics and `origin` remote attached locally.</done>
</task>

<task type="auto">
  <name>Task 2: Move legacy index.html and write bootstrap files</name>
  <files>
    - /Users/ashleyakbar/barterkin/legacy/index.html
    - /Users/ashleyakbar/barterkin/.gitignore
    - /Users/ashleyakbar/barterkin/README.md
    - /Users/ashleyakbar/barterkin/.env.local.example
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/index.html (the legacy landing page — inspect to confirm it exists at project root before moving)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md (D-03, D-05, D-07, D-08)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Env-Var Structure (lines ~837-895)
  </read_first>
  <action>
  Step 1 — Move legacy index.html into `legacy/` (D-03, D-05):
  ```bash
  cd /Users/ashleyakbar/barterkin
  mkdir -p legacy
  git mv index.html legacy/index.html   # if already tracked; otherwise use plain mv
  # Fallback if not yet git-tracked:
  # mv index.html legacy/index.html
  ```
  If the project root ALSO contains `.netlify/`, `scripts/`, `send-mailtest.mjs`, `setup-dns.mjs` — leave them in place (they're retained operational assets per CONTEXT §code_context).

  Step 2 — Write `.gitignore` (cover Next.js, macOS, secrets, Supabase CLI, Vercel CLI, legacy Netlify CLI):
  ```
  # Node / Next.js
  node_modules
  .next
  out
  build
  dist
  *.tsbuildinfo
  next-env.d.ts

  # Env files (NEVER commit secrets — D-06, D-07)
  .env
  .env.local
  .env.*.local
  .env.development.local
  .env.production.local

  # Vercel CLI
  .vercel

  # Supabase CLI
  supabase/.branches
  supabase/.temp
  supabase/.env

  # Netlify CLI (legacy — retained until Phase 6 cutover)
  .netlify

  # Testing
  coverage
  .nyc_output
  /test-results/
  /playwright-report/
  /playwright/.cache/

  # OS
  .DS_Store
  Thumbs.db
  *.swp
  *.swo

  # IDE
  .idea
  .vscode/*
  !.vscode/settings.json
  !.vscode/tasks.json
  !.vscode/launch.json
  !.vscode/extensions.json

  # Build-generated service worker (Serwist emits these)
  public/sw.js
  public/sw.js.map
  public/workbox-*.js
  public/workbox-*.js.map
  ```

  Step 3 — Write `README.md` with brand framing (CONTEXT §specifics) and dev-setup hooks that downstream plans will fill in:
  ```markdown
  # Barterkin

  **Barterkin** — Georgia's community skills exchange. Find Georgians offering and wanting skills; barter your way. Web app + future mobile (Capacitor).

  - **Status:** Phase 1 — Foundation & Infrastructure (in progress). Public build-in-public.
  - **Stack:** Next.js 16.2 (App Router, React 19.2) + Supabase (Auth + Postgres 17 + Storage + Edge Functions) + Vercel + Resend + PostHog. Package manager: `pnpm@9`. Runtime: Node 20 LTS.
  - **Legacy:** The previous static landing lives at `legacy/index.html` and is served from Netlify at the current `*.netlify.app` URL until Phase 6 cutover.

  ## Prerequisites

  - Node 20 LTS (repo verified on Node 22 too).
  - `pnpm@9` (install via `corepack enable pnpm` or `npm i -g pnpm@9`).
  - Supabase CLI (installed as a dev-dep; `pnpm supabase --help`).
  - `pre-commit` framework for the gitleaks secret-scan hook: `pip install pre-commit && pre-commit install` (or `brew install pre-commit` on macOS).

  ## Local setup

  ```bash
  git clone git@github.com:Biznomad/barterkin.git
  cd barterkin
  cp .env.local.example .env.local   # fill in values — DO NOT COMMIT .env.local
  pnpm install
  pre-commit install                  # gitleaks pre-commit hook
  pnpm dev                            # http://localhost:3000
  ```

  ## Environment variables

  See `.env.local.example` for the full list, grouped by client-safe (`NEXT_PUBLIC_*`) vs. server-only. Never add `NEXT_PUBLIC_` to `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` — the repo is public and those keys are inlined into the client chunk if you do.

  ## Supabase migrations

  ```bash
  pnpm supabase start          # starts local Postgres on 54321-54327 (requires Docker Desktop)
  pnpm supabase db reset       # applies all migrations on the local DB
  pnpm supabase migration new <slug>
  pnpm supabase db push        # applies new migrations to the remote us-east-1 project
  ```

  CI does NOT auto-apply migrations on merge (D-20) — `db push` is a manual developer step.

  ## Phase 6 DNS cutover procedure (reference)

  During Phases 1–5 the domain `barterkin.com` points at Netlify (legacy). When the new landing page ships in Phase 6:

  1. In Cloudflare DNS (zone `62def5475df0d359095a370e051404e0`), change the `barterkin.com` A record to `76.76.21.21` and the `www` CNAME to `cname.vercel-dns.com`.
  2. Verify the Vercel deployment serves the new landing at `barterkin.com` (`dig +short barterkin.com` + browser visit).
  3. In Netlify, unpublish the legacy site (keep the deploy history for rollback).

  No canary, ~10 min cutover.

  ## Contributing

  Solo builder for now. Conventional-commits scoped to the phase domain (e.g. `feat(foundation): scaffold Next.js 16.2`). No branch protection rules — self-review PRs to `main`.
  ```

  Step 4 — Write `.env.local.example` (exact shape from RESEARCH.md §Env-Var Structure; D-07/D-08 naming):
  ```bash
  # .env.local.example
  # ─────────────────────────────────────────────────────────────
  # Barterkin environment variables
  # Copy to .env.local and fill in actual values. NEVER commit .env.local.
  # Production/preview values live in Vercel env vars (per-environment scope).
  # GitHub Actions secrets hold any CI-only values.
  # Repo is PUBLIC — any secret with NEXT_PUBLIC_ prefix is browser-readable.
  # ─────────────────────────────────────────────────────────────

  # ── Supabase (project: hfdcsickergdcdvejbcw, region: us-east-1) ──

  # Public URL — safe in browser, used by browser + server clients
  NEXT_PUBLIC_SUPABASE_URL=https://hfdcsickergdcdvejbcw.supabase.co

  # Publishable (anon-tier) key — safe in browser; RLS is the security boundary
  # If your Supabase project still issues legacy `anon` keys, the same value works;
  # rotate to the new `sb_publishable_...` format in Studio when convenient.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

  # Service-role key — SERVER ONLY, bypasses RLS entirely. NEVER prefix with NEXT_PUBLIC_.
  SUPABASE_SERVICE_ROLE_KEY=

  # ── Resend (domain: barterkin.com, verified 10/10 mail-tester) ──

  # Transactional email API key — server-only
  RESEND_API_KEY=

  # ── PostHog (project id: 387571, host: US) ──

  NEXT_PUBLIC_POSTHOG_KEY=
  NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

  # ── Site ──

  # Used to construct absolute URLs (OAuth redirects, email links, canonical tags).
  # Phase 1 value: http://localhost:3000 (local) / <preview>.vercel.app (preview)
  # Phase 6+: https://barterkin.com (prod)
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```

  Use the Write tool for each file — do NOT use heredoc/echo.

  Step 5 — Initial commit:
  ```bash
  cd /Users/ashleyakbar/barterkin
  git add .gitignore README.md .env.local.example legacy/index.html .planning/ CLAUDE.md
  git commit -m "chore(foundation): repo scaffold (renamed from georgia-barter; public repo init)"
  git push -u origin main
  ```
  </action>
  <acceptance_criteria>
    - `ls /Users/ashleyakbar/barterkin/legacy/index.html` returns the moved file (≥1KB).
    - `ls /Users/ashleyakbar/barterkin/index.html` fails with `No such file or directory`.
    - `cat /Users/ashleyakbar/barterkin/.gitignore | grep -cE "^(node_modules|\.env\.local|\.vercel|\.next|supabase/\.branches|\.netlify|public/sw\.js)$"` returns `7` (all 7 critical ignore lines present).
    - `cat /Users/ashleyakbar/barterkin/.env.local.example | grep -c "^NEXT_PUBLIC_" ` returns `5` (five client-safe vars: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, POSTHOG_KEY, POSTHOG_HOST, SITE_URL).
    - `cat /Users/ashleyakbar/barterkin/.env.local.example | grep -cE "^(SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY)="` returns `2` (two server-only vars with NO `NEXT_PUBLIC_` prefix).
    - `grep -c "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY\|NEXT_PUBLIC_RESEND_API_KEY" /Users/ashleyakbar/barterkin/.env.local.example` returns `0` (no server secret accidentally prefixed).
    - `grep -q "Barterkin — Georgia's community skills exchange" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "pre-commit install" /Users/ashleyakbar/barterkin/README.md` (bootstrap instruction present for Plan 08)
    - `git -C /Users/ashleyakbar/barterkin log --oneline -1` shows the `chore(foundation): repo scaffold` commit.
    - `git -C /Users/ashleyakbar/barterkin ls-files --error-unmatch .env.local` exits non-zero (`.env.local` is NOT tracked).
    - `~/bin/gh repo view Biznomad/barterkin --json defaultBranchRef -q .defaultBranchRef.name` returns `main` and the commit is visible at `https://github.com/Biznomad/barterkin/commit/$(git -C /Users/ashleyakbar/barterkin rev-parse HEAD)`.
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && test -f legacy/index.html && test ! -f index.html && grep -q "^\.env\.local$" .gitignore && grep -q "^NEXT_PUBLIC_SUPABASE_URL=" .env.local.example && ! grep -q "^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" .env.local.example && git log --oneline -1 | grep -q "chore(foundation): repo scaffold"</automated>
  </verify>
  <done>Legacy file relocated, four bootstrap files written with correct env-var boundary, initial commit pushed to `origin/main`, `.env.local` ignored.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Developer machine → public GitHub | Every file committed is world-readable forever. Any secret pushed = compromised in minutes. |
| `.env.local` (untracked) → `.env.local.example` (tracked) | Template must contain NO real values; only documentation placeholders. |
| Memory file → repo | Memory file holds non-secret operational IDs; secrets stay in 1Password. Rename must not change the IDs themselves. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Information Disclosure | `.env.local.example` | mitigate | File contains empty `KEY=` placeholders — no real values; later plans enforce with gitleaks pre-commit (Plan 08) |
| T-01-02 | Information Disclosure | Initial commit to public repo | mitigate | `.gitignore` added BEFORE first commit; `.env.local` pattern excludes any accidental secret file at commit time |
| T-01-03 | Tampering | Folder rename leaves stale absolute paths in `.planning/` / `CLAUDE.md` | mitigate | Grep-replace step in Task 1 targets only `/Users/ashleyakbar/barterkin` absolute-path strings; brand-name references preserved |
| T-01-04 | Repudiation | Unsigned commit from a fresh git config | accept | Solo builder; GPG signing is out of scope for MVP (D-15 skips branch protection entirely). Revisit at Phase 2+ if collaborators join. |
| T-01-05 | Elevation of Privilege | `gh repo create` may prompt for OAuth scope grant | mitigate | Task 1 is `checkpoint:human-action` so user can approve OAuth scopes interactively |
| T-01-06 | Information Disclosure | Stale `georgia-barter.md` memory file contains brand-name references to old folder | mitigate | Task 1 Step 4 renames the file and updates the MEMORY.md index in the same step |
</threat_model>

<verification>
Phase 1 plan-01 is complete when:
1. `pwd` → `/Users/ashleyakbar/barterkin`
2. `~/bin/gh repo view Biznomad/barterkin --json visibility -q .visibility` returns `PUBLIC`
3. Initial commit `chore(foundation): repo scaffold` is pushed to `origin/main`
4. `.env.local.example` present and committed; `.env.local` absent from `git ls-files`
5. `legacy/index.html` present and committed
6. Memory file renamed to `barterkin.md`
</verification>

<success_criteria>
- Folder rename completed with zero stale absolute-path references in committed files
- Public GitHub repo exists under `Biznomad/barterkin` with correct topics
- Bootstrap files (`.gitignore`, `README.md`, `.env.local.example`, `legacy/index.html`) committed to `main`
- `.env.local` pattern present in `.gitignore` before any env-bearing code lands
- Covers FOUND-01 (repo scaffold foundation), FOUND-11 (CI substrate — actual workflow arrives in Plan 08), FOUND-12 (legacy preservation)
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-01-SUMMARY.md` per the summary template — capture the exact GitHub repo URL, initial commit SHA, and confirmation that `legacy/index.html` was preserved verbatim.
</output>
