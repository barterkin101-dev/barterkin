# Phase 1: Foundation & Infrastructure - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a deployable empty Next.js 16.2 foundation on Vercel, with Supabase + Resend + PostHog wired, DNS + deliverability already live (done pre-phase via Playwright automation — domain verified 10/10 on mail-tester), PWA shell installable, and CI running on every PR.

**Does NOT include:** auth UI, profile UI, directory UI, contact relay, final landing page content (those are Phases 2-6). This phase delivers the empty-but-deployable foundation that every later phase builds on.

</domain>

<decisions>
## Implementation Decisions

### Repo + GitHub

- **D-01**: GitHub repo name: **`barterkin`** (under `Biznomad` GitHub account). Chose umbrella brand over product name for future-proofing.
- **D-02**: **Public from day 1** (build-in-public). Has critical implications for secret handling — see D-06 through D-09.
- **D-03**: Existing `~/georgia-barter/index.html` moves to `legacy/` in the repo. Kept as design reference until Phase 6 ships the new landing; delete after cutover.
- **D-04**: Vercel GitHub integration is set up **after** the first scaffold commit succeeds locally — not against an empty repo. First Vercel deploy should succeed on first attempt.
- **D-05**: Initial commit contents: Next.js scaffold + `legacy/index.html` + `README.md` (with brand framing) + `.gitignore` + `.env.local.example`.
- **D-22**: Rename local folder `~/georgia-barter` → `~/barterkin` at the start of Phase 1 execution. Update any path-embedded references in `.planning/`, `CLAUDE.md`, `EXPLORE.md`, and memory files.

### Secrets + public-repo hygiene (non-negotiable)

- **D-06**: Because the repo is public, **every secret** lives in one of three places ONLY: Vercel project env vars, Supabase Edge Function secrets, GitHub Actions repository secrets. Zero secrets in the repo or in Next.js code.
- **D-07**: Commit `.env.local.example` with variable names + inline comments explaining each. Never commit `.env.local`.
- **D-08**: Env-var naming audit for Phase 1:
  - **Client-safe (browser-exposed):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SITE_URL`
  - **Server-only (no `NEXT_PUBLIC_` prefix — ever):** `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`
- **D-09**: Add `gitleaks` (or equivalent) as a pre-commit hook AND a CI step. Catches accidental secret commits on the public repo before they propagate. Non-optional for public repos.

### Landing page + DNS transition (pre-cutover)

- **D-10**: `barterkin.com` (root + www) DNS points at **Netlify** during Phases 1–5. Visitors see the existing `index.html` on the brand domain while the new app is built on `*.vercel.app` preview URLs.
- **D-11**: The Netlify site stays at its current `*.netlify.app` URL during development — no `legacy.barterkin.com` split. Zero additional DNS work.
- **D-12**: Vercel previews use default `*.vercel.app` URLs per-PR. No pinning to `preview.barterkin.com`.
- **D-13**: **Phase 6 cutover procedure:** Update Cloudflare DNS to Vercel (A record `76.76.21.21` + CNAME `cname.vercel-dns.com` for www), verify live, unpublish the Netlify site. ~10 min cutover. No canary / no dual-state warm standby.
- **D-14**: **Phase 1 must add Cloudflare DNS records pointing barterkin.com at Netlify** (root + www), so `barterkin.com` actually shows the legacy page during dev. Verify by visiting the domain.

### CI + branching (defaults applied — skipped by user)

- **D-15**: Branching: `main` is the only long-lived branch. Feature branches for non-trivial work. Solo-builder PRs to main are self-review. No branch protection rules (would just add friction for a solo builder).
- **D-16**: GitHub Actions CI on every PR: `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test`. Vercel builds a preview. All four gates must be green for a clean PR, but not enforced via branch protection in MVP.
- **D-17**: No CD beyond Vercel's built-in `push-to-main` → production deploy behavior.

### Supabase migrations (defaults applied — skipped by user)

- **D-18**: Migrations live at `supabase/migrations/*.sql`, versioned in git, reproducible via `supabase db reset`.
- **D-19**: Local workflow: `supabase start` → `supabase db reset` → edit migrations → `supabase db push` to remote (`georgia-barter` us-east-1).
- **D-20**: CI runs migrations against an ephemeral local Postgres (via `supabase start` in CI) for integration tests only. No auto-apply to production on merge. Revisit when team grows beyond solo.
- **D-21**: Retire the auto-created `vlrioprefvwkahryuuap` (us-east-2) Supabase starter project once the scaffold successfully connects to `hfdcsickergdcdvejbcw` (us-east-1). Housekeeping — not urgent but not forgotten.

### Claude's Discretion

- Exact shadcn/ui components to pre-install at scaffold time (install-as-needed works; `button` + `card` + `input` + `form` at minimum for any demo page before Phase 2 auth)
- Serwist manifest icon set (placeholder sage/forest PNGs at 192 × 256 × 512 until Phase 6 Landing & Polish delivers final branded assets)
- Specific GitHub Actions workflow file organization (one `ci.yml` with parallel jobs, or split by concern — planner's call)
- `.env.local.example` variable ordering and comment depth
- Whether to use pnpm workspaces at this stage (recommendation: **no** — single app, flat layout; revisit only when mobile/infra repos appear)
- CI runner choice — `ubuntu-latest` is the safe default

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level

- `.planning/PROJECT.md` — Core value, constraints, key decisions (especially brand, stack, deliverability). 19 Key Decisions are locked upstream.
- `.planning/REQUIREMENTS.md` §Foundation — FOUND-01 through FOUND-12 (Phase 1 scope).
- `.planning/ROADMAP.md` §Phase 1 — goal + 5 success criteria.
- `EXPLORE.md` — pre-project brief with rejected alternatives (Clerk + Convex, Netlify-for-app, in-app messaging for MVP, etc.) and rationale.

### Research (prescriptive for Phase 1)

- `.planning/research/STACK.md` — Pinned versions, libraries, anti-patterns. THE bible for this phase. Every dependency choice traces back here.
- `.planning/research/ARCHITECTURE.md` §1–5, §9 — Route structure, Supabase client factory pattern (`browser` / `server` / `middleware`), phase-A foundation tasks.
- `.planning/research/PITFALLS.md` §Technical, §Pre-launch — `@supabase/auth-helpers-nextjs` is deprecated, use `@supabase/ssr`; Serwist+Turbopack quirks; SPF/DKIM/DMARC propagation; email-verify gate layering.
- `.planning/research/FEATURES.md` §8 Phase split — confirms phase dependency order (Foundation → Auth → Profile → Directory → Relay+Trust → Landing → Seeding).
- `.planning/research/SUMMARY.md` — 10 cross-cutting insights; esp. Next.js 16.2 (not 15), DNS deliverability in P1, schema split decisions.

### External standards (read before writing code that uses them)

- https://supabase.com/docs/guides/auth/server-side/nextjs — `@supabase/ssr` Next.js App Router integration guide.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client — Three-client factory pattern (browser, server, middleware).
- https://nextjs.org/docs/app/guides/progressive-web-apps — Serwist-based PWA (Next.js 16.2-compatible).
- https://ui.shadcn.com/docs/tailwind-v4 — shadcn v4 + Tailwind v4 install steps and `@theme` directive.
- https://resend.com/docs/send-with-nextjs — Resend SDK basic usage (full contact-relay integration is Phase 5).
- https://posthog.com/docs/libraries/next-js — PostHog Next.js integration (`@posthog/next` + `posthog-js`).
- https://www.serwist.dev/ — Serwist docs, especially the `@serwist/next` package.

### Operational (live account identifiers)

- `~/.claude/projects/-Users-ashleyakbar/memory/georgia-barter.md` — Live account identifiers (Supabase ref `hfdcsickergdcdvejbcw`, Vercel team `team_lgW6L6OTcKom1vrTkNwdsGJ4`, PostHog project ID `387571`, CF zone `62def5475df0d359095a370e051404e0`, etc.). Secrets are NOT in memory — 1Password only.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- `~/georgia-barter/index.html` (soon `legacy/index.html`) — Defines the palette and typography Phase 1 must port:
  - CSS vars to hoist into Tailwind v4 `@theme`: `--sage-bg #eef3e8`, `--sage-light #dfe8d5`, `--sage-pale #f4f7f0`, `--forest #2d5a27`, `--forest-deep #1e4420`, `--forest-mid #3a7032`, `--clay #c4956a`
  - Fonts: Lora (serif, headings) + Inter (sans, body) via `next/font/google`
- `scripts/setup-dns.mjs` and `scripts/send-mailtest.mjs` — Existing operational scripts (API-based DNS + mail-tester). Retained in the repo for re-setup scenarios or future subdomain additions.
- `.planning/` — All planning artifacts. Must survive the local-folder rename (`~/georgia-barter` → `~/barterkin`).

### Established patterns

- **GSD planning workflow** — Phase work goes through `.planning/phases/NN-*` dirs with CONTEXT → (RESEARCH) → PLAN → PLANS/*.md → VERIFICATION flow. Phase 1 follows this.
- **Memory-first account tracking** — Account identifiers captured in `~/.claude/projects/-Users-ashleyakbar/memory/georgia-barter.md`; secrets in Ashley's 1Password only. Never commit identifiers to repo metadata that could shift as they rotate.

### Integration points (for downstream phases)

- **Supabase Edge Functions** — Phase 5 (Contact Relay + Trust) will add `supabase/functions/send-contact/`. Phase 1 leaves the `supabase/functions/` directory empty-but-present.
- **PostHog initialization** — Add a `PHProvider` client component in `app/` and wrap root layout. Event firing starts in Phase 5 (`posthog.capture('contact_initiated', ...)`).
- **Resend templates** — Phase 5 adds `emails/contact-relay.tsx` (react-email). Phase 1 doesn't install react-email yet — keep deps minimal.

</code_context>

<specifics>
## Specific Ideas

- **README brand framing:** "Barterkin — Georgia's community skills exchange. Find Georgians offering and wanting skills; barter your way. Web app + future mobile (Capacitor)."
- **GitHub repo description (public-facing):** Same one-liner. Add tags: `nextjs`, `supabase`, `community`, `barter`, `georgia`, `skills`, `pwa`.
- **Commit message format:** Conventional commits scoped to the phase domain (`feat(foundation): scaffold Next.js 16.2`, `chore(foundation): add SPF DNS for Netlify`, etc.).
- **Public-repo philosophy:** Transparency on scope + architecture, absolute rigor on secret handling. Any commit or PR that contains something resembling a key, token, or password triggers the gitleaks block — no exceptions.
- **Phase 1 visible deliverable at completion:** `barterkin.com` shows the legacy Netlify page; `*.vercel.app` preview URL shows the empty Next.js scaffold with palette applied + PWA installable from Chrome menu. That's "done."

</specifics>

<deferred>
## Deferred Ideas

- **Cloudflare Turnstile site-key provisioning** — Needed for AUTH-08 (Phase 2). Not Phase 1.
- **Final PWA icon assets** — Placeholder icons in Phase 1; Phase 6 (Landing + Polish) ships the branded set.
- **Bun vs pnpm reconsider** — pnpm locked per research. Revisit only if pnpm hurts velocity.
- **CI auto-apply migrations on merge** — Revisit if/when a second engineer joins. Solo = manual `supabase db push`.
- **Coming-soon holding page** — Considered; rejected. Netlify legacy page serves the same purpose for zero additional work.
- **Subdomain split for legacy (`legacy.barterkin.com`)** — Considered; rejected. Netlify default URL is fine for dev-only audience.
- **Canary rollout at Phase 6 cutover** — Overkill for a solo MVP launch. Straight DNS swap.

</deferred>

---

*Phase: 01-foundation-infrastructure*
*Context gathered: 2026-04-18*
