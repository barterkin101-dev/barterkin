# Barterkin

**Barterkin** — Georgia's community skills exchange. Find Georgians offering and wanting skills; barter your way. Web app + future mobile (Capacitor).

- **Status:** Phase 1 — Foundation & Infrastructure (in progress). Public build-in-public.
- **Stack:** Next.js 16.2 (App Router, React 19.2) + Supabase (Auth + Postgres 17 + Storage + Edge Functions) + Vercel + Resend + PostHog. Package manager: `pnpm@9`. Runtime: Node 20 LTS.
- **Legacy:** The previous static landing lives at `legacy/index.html` and is served from Netlify at the current `*.netlify.app` URL until Phase 6 cutover.

## Prerequisites

- Node 20 LTS (repo verified on Node 22 too).
- `pnpm@9` (install via `corepack enable pnpm` or `npm i -g pnpm@9`).
- Supabase CLI (installed as a dev-dep; `pnpm supabase --help`).
- **Pre-commit framework + gitleaks (non-negotiable for this public repo):**
  - macOS: `brew install pre-commit` (or `pip install pre-commit` if no Homebrew).
  - `cd barterkin && pre-commit install` — wires the gitleaks hook to `.git/hooks/pre-commit`.
  - Every commit now runs gitleaks against staged files; commits with secrets are blocked locally.
  - CI re-runs gitleaks on every PR as a second-line defence (see `.github/workflows/ci.yml`).

## Local setup

```bash
git clone git@github.com:barterkin101-dev/barterkin.git
cd barterkin
cp .env.local.example .env.local   # fill in values — DO NOT COMMIT .env.local
pnpm install
pre-commit install                  # gitleaks pre-commit hook
pnpm dev                            # http://localhost:3000
```

## Environment variables

See `.env.local.example` for the full list, grouped by client-safe (`NEXT_PUBLIC_*`) vs. server-only. Never add `NEXT_PUBLIC_` to `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` — the repo is public and those keys are inlined into the client chunk if you do.

## Vercel deploys

- **Production:** `main` branch pushes auto-deploy to `https://barterkin.vercel.app` via Vercel GitHub integration (team: `barterkin101-devs-projects`, team ID: `team_lgW6L6OTcKom1vrTkNwdsGJ4`).
- **Preview:** Every PR gets a unique `*.vercel.app` URL posted by the Vercel bot.
- **Development:** `pnpm dev` at `http://localhost:3000` with `.env.local`.

### Env-var manifest

All 7 Phase-1 variables are set in Vercel for **production**, **preview**, and **development** scopes. Sync locally with:

```bash
pnpm vercel env pull .env.local   # pulls the development scope into .env.local
```

| Var | Scope | Sensitive | Source |
|-----|-------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | all 3 | no | `https://hfdcsickergdcdvejbcw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all 3 | no | Supabase Studio → API |
| `SUPABASE_SERVICE_ROLE_KEY` | all 3 | **yes** | Supabase Studio → API |
| `RESEND_API_KEY` | all 3 | **yes** | Resend dashboard |
| `NEXT_PUBLIC_POSTHOG_KEY` | all 3 | no | PostHog project 387571 |
| `NEXT_PUBLIC_POSTHOG_HOST` | all 3 | no | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_SITE_URL` | per scope | no | `http://localhost:3000` / `https://${VERCEL_URL}` / `https://barterkin.vercel.app` |

Server-only vars (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) are marked **Sensitive** in Vercel so build logs mask them. Never add `NEXT_PUBLIC_` to them — this public repo means inlined secrets are world-readable.

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

## Starter-project housekeeping (one-time)

The `vlrioprefvwkahryuuap` (us-east-2) project was auto-created when the Supabase account was set up. It's not used. Delete it once the scaffold has confirmed connectivity to `hfdcsickergdcdvejbcw`:

1. Visit https://supabase.com/dashboard/project/vlrioprefvwkahryuuap/settings/general
2. Scroll to the "Danger Zone" → Delete project.
3. Confirm by typing the project name.

After deletion, `pnpm supabase projects list` shows only `hfdcsickergdcdvejbcw`.

## Phase 6 DNS cutover procedure (reference)

During Phases 1–5 the domain `barterkin.com` points at Netlify (legacy). When the new landing page ships in Phase 6:

1. In Cloudflare DNS (zone `62def5475df0d359095a370e051404e0`), change the `barterkin.com` A record to `76.76.21.21` and the `www` CNAME to `cname.vercel-dns.com`.
2. Verify the Vercel deployment serves the new landing at `barterkin.com` (`dig +short barterkin.com` + browser visit).
3. In Netlify, unpublish the legacy site (keep the deploy history for rollback).

No canary, ~10 min cutover.

## Verifying Phase 1 wiring

After `pnpm dev` is running with a populated `.env.local`:

**PostHog** (FOUND-10 / ROADMAP success criterion #5):
1. Visit http://localhost:3000
2. Click "Fire test event"
3. In https://us.posthog.com (project 387571) → Activity, confirm `test_event` appears within 60s.

**Resend** (FOUND-04, FOUND-07):
```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-inbox@example.com"}'
# Expect: {"ok":true,"id":"..."}
# Check the inbox — email arrives from hello@barterkin.com.
```

The `/api/test-email` route returns 404 in production (safe to ship as-is; Phase 5 replaces it with a Supabase Edge Function).

**Supabase Studio SMTP** (FOUND-07 — one-time manual step):
In https://supabase.com/dashboard/project/hfdcsickergdcdvejbcw → Authentication → SMTP Settings, plug in the Resend credentials:
- Host: `smtp.resend.com`
- Port: `465` (SSL)
- User: `resend`
- Pass: your RESEND_API_KEY
- Sender: `Barterkin <hello@barterkin.com>`

Then click "Send test email" in Studio — confirm delivery. Full validation lands in Phase 2 with the first magic-link signup.

## Contributing

Solo builder for now. Conventional-commits scoped to the phase domain (e.g. `feat(foundation): scaffold Next.js 16.2`). No branch protection rules — self-review PRs to `main`.
