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
