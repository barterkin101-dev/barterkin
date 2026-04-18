# Phase 1: Foundation & Infrastructure — Research

**Researched:** 2026-04-18
**Domain:** Next.js 16.2 scaffold + Supabase SSR + Serwist PWA + PostHog + Resend + gitleaks CI + public-repo hygiene
**Confidence:** HIGH (stack choices anchored to pre-existing `.planning/research/STACK.md` verified 2026-04-17; Phase 1 integration specifics verified via WebSearch against current docs 2026-04-18)

## Summary

All stack choices for this phase are already locked upstream in `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, and `.planning/research/PITFALLS.md` — this research does **not** re-open those decisions. The job here is to compile the Phase-1-specific execution details (scaffold commands, integration wiring, env-var boundary, validation hooks) that the planner needs to write crisp task plans.

Phase 1 is a **scaffold phase**: no UI, no auth logic, no data model. The foundation must yield a deployable empty Next.js 16.2 app on Vercel with Supabase wired, Serwist PWA installable, PostHog firing test events, Resend SDK plumbed to a verified-domain test endpoint, and gitleaks + GH Actions running on every PR. Domain, DNS/SPF/DKIM/DMARC, Supabase project, Vercel project, PostHog project, and Resend domain verification are **already done pre-phase** (Playwright automation achieved 10/10 mail-tester score per CONTEXT.md); this phase inherits those as given and does the code-side wiring.

**Primary recommendation:** Use `pnpm create next-app@latest barterkin --typescript --app --tailwind --eslint --src-dir=false --import-alias "@/*"`, then `shadcn init -t next` (new-york, Tailwind v4), then layer Supabase SSR + Serwist + PostHog + Resend per the locked STACK.md. One CI workflow (`ci.yml`) with parallel jobs for lint/typecheck/test/gitleaks. Vercel preview is a separate required check via GitHub integration. All secrets live in Vercel env vars (prod+preview scoped), GH Actions repository secrets, or Supabase Studio — zero secrets in repo.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Repo + GitHub**
- **D-01:** GitHub repo name: `barterkin` (under `Biznomad`). Umbrella brand over product name.
- **D-02:** Public from day 1 — drives secret hygiene (D-06..D-09).
- **D-03:** Existing `~/georgia-barter/index.html` moves to `legacy/` in the repo. Kept as design reference until Phase 6 ships new landing; delete after cutover.
- **D-04:** Vercel GitHub integration set up **after** first scaffold commit succeeds locally — not against empty repo.
- **D-05:** Initial commit: Next.js scaffold + `legacy/index.html` + `README.md` + `.gitignore` + `.env.local.example`.
- **D-22:** Rename local folder `~/georgia-barter` → `~/barterkin` at start of Phase 1. Update path-embedded refs in `.planning/`, `CLAUDE.md`, `EXPLORE.md`, memory.

**Secrets + public-repo hygiene (non-negotiable)**
- **D-06:** Repo is public — every secret lives ONLY in: Vercel project env vars, Supabase Edge Function secrets, GitHub Actions repository secrets. Zero secrets in repo or Next.js code.
- **D-07:** Commit `.env.local.example` with variable names + inline comments. Never commit `.env.local`.
- **D-08:** Env-var naming audit for Phase 1:
  - **Client-safe (browser-exposed):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SITE_URL`
  - **Server-only (no `NEXT_PUBLIC_` prefix — ever):** `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`
- **D-09:** `gitleaks` as a pre-commit hook AND a CI step. Non-optional for public repos.

**Landing page + DNS transition**
- **D-10:** `barterkin.com` (root + www) DNS points at **Netlify** during Phases 1–5.
- **D-11:** Netlify site stays at its current `*.netlify.app` URL during development — no `legacy.barterkin.com` split.
- **D-12:** Vercel previews use default `*.vercel.app` URLs per-PR. No pinning to `preview.barterkin.com`.
- **D-13:** **Phase 6 cutover:** Update Cloudflare DNS to Vercel (A `76.76.21.21` + CNAME `cname.vercel-dns.com`), verify live, unpublish Netlify. ~10 min. No canary.
- **D-14:** Phase 1 must add Cloudflare DNS records pointing `barterkin.com` at Netlify (root + www) so domain actually shows legacy page during dev. Verify by visit.

**CI + branching**
- **D-15:** `main` is only long-lived branch. Feature branches for non-trivial work. Solo-builder PRs to main are self-review. No branch protection in MVP.
- **D-16:** GitHub Actions CI on every PR: `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm test`. Vercel builds preview. All four green for clean PR, not branch-protected.
- **D-17:** No CD beyond Vercel's `push-to-main` → production behavior.

**Supabase migrations**
- **D-18:** Migrations at `supabase/migrations/*.sql`, versioned in git, reproducible via `supabase db reset`.
- **D-19:** Local workflow: `supabase start` → `supabase db reset` → edit migrations → `supabase db push` to remote (`georgia-barter` us-east-1).
- **D-20:** CI runs migrations against ephemeral local Postgres (`supabase start` in CI) for integration tests only. No auto-apply to production on merge. Revisit when team > solo.
- **D-21:** Retire auto-created `vlrioprefvwkahryuuap` (us-east-2) starter once scaffold connects to `hfdcsickergdcdvejbcw` (us-east-1).

### Claude's Discretion

- Exact shadcn/ui components to pre-install at scaffold time (minimum recommended: `button` + `card` + `input` + `form` — see Phase-1 Component Install Set below)
- Serwist manifest icon set — placeholder sage/forest PNGs at 192 × 256 × 512 until Phase 6 ships final branded assets
- GitHub Actions workflow file organization — one `ci.yml` with parallel jobs recommended
- `.env.local.example` variable ordering and comment depth
- pnpm workspaces: **no** — single app, flat layout
- CI runner choice — `ubuntu-latest`

### Deferred Ideas (OUT OF SCOPE)

- Cloudflare Turnstile site-key provisioning → Phase 2 (AUTH-08)
- Final PWA icon assets → Phase 6 (Landing + Polish)
- Bun vs pnpm reconsider → pnpm locked
- CI auto-apply migrations on merge → revisit post-solo
- Coming-soon holding page → rejected
- Subdomain split for legacy (`legacy.barterkin.com`) → rejected
- Canary rollout at Phase 6 cutover → rejected
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Next.js 16.2 App Router scaffold with pnpm, Tailwind v4, shadcn/ui new-york, TS strict, Lora+Inter via next/font/google | §Standard Stack §Code Examples §Scaffold Sequence |
| FOUND-02 | Sage/forest/clay palette as Tailwind v4 `@theme` tokens | §Design Tokens §Code Examples (globals.css) |
| FOUND-03 | Dedicated domain procured + DNS-controlled | **Done pre-phase** (CONTEXT.md). Phase 1 task: point Cloudflare A/CNAME at Netlify (D-14). |
| FOUND-04 | SPF + DKIM + DMARC set + verified | **Done pre-phase** (10/10 mail-tester). Phase 1 task: verification-check script in CI-adjacent tooling only, no new DNS. |
| FOUND-05 | Fresh Supabase project; RLS enabled on all public tables by default | **Done pre-phase** (project `hfdcsickergdcdvejbcw` exists). Phase 1 task: `supabase link` + initial migration `001_enable_rls.sql` that asserts RLS-enabled default pattern; retire us-east-2 starter. |
| FOUND-06 | Fresh Vercel project w/ separate preview + production envs | **Done pre-phase** (Vercel project exists). Phase 1 task: GitHub integration + env var population (scoped prod/preview/dev). |
| FOUND-07 | Resend domain verified; plugged into Supabase Studio SMTP | **Done pre-phase** (domain verified). Phase 1 task: Supabase Studio → Auth → SMTP configured with Resend creds; test magic-link email send (no auth UI yet, just Studio "Send test email"). |
| FOUND-08 | Migrations versioned under `supabase/migrations/`, reproducible via `supabase db reset` | §Supabase Migrations Workflow §Code Examples |
| FOUND-09 | Serwist PWA with `app/manifest.ts`, service worker, installable manifest incl. icons | §Serwist Integration §Code Examples (next.config.ts, manifest.ts, sw.ts) |
| FOUND-10 | PostHog integrated with `posthog-js` + `@posthog/next`; `initiated_contact` event schema defined | §PostHog Wiring §Event Schema |
| FOUND-11 | GitHub Actions CI: `pnpm lint` + `pnpm typecheck` + `pnpm test` on every PR; Vercel preview on every branch | §CI Workflow §Code Examples (ci.yml) |
| FOUND-12 | Legacy `index.html` kept live on Netlify until new landing replaces it | §Legacy Coexistence — inventoried D-10..D-14 above; no code in the Next.js repo affects this. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Next.js 16.2 scaffold + route tree | Frontend Server (SSR) | Browser | App Router runs server components by default; hydration is secondary |
| Design tokens (CSS vars) | Browser | — | CSS variables resolved at browser render time; shipped as static CSS |
| Lora + Inter font loading | Frontend Server (SSR) | Browser | `next/font/google` self-hosts at build; served from same origin |
| Supabase client factory (browser) | Browser | — | `createBrowserClient` runs in client components |
| Supabase client factory (server) | Frontend Server (SSR) | — | `createServerClient` with cookie adapter runs in RSC + actions |
| Supabase middleware (session refresh) | Frontend Server (Edge) | — | Next.js middleware runs at edge; `getClaims()` revalidates JWT |
| Service-role Supabase client | API / Backend | — | Must stay server-only; Phase 1 scaffolds but doesn't invoke |
| Serwist service worker | Browser | — | Service worker is a browser-only caching layer |
| Web app manifest (`app/manifest.ts`) | Frontend Server (SSR) | Browser | Next.js builds manifest at request time; browser reads it |
| PostHog client SDK | Browser | — | `posthog-js` runs in browser only; initialized via PHProvider |
| PostHog Node SDK | API / Backend | — | `posthog-node` for server-side capture from actions/edge functions |
| Resend SDK test send | API / Backend | — | `RESEND_API_KEY` is server-only; test endpoint = Route Handler |
| Supabase migrations | Database / Storage | — | Schema lives in DB; CLI applies migrations via `db push` |
| gitleaks pre-commit | Local dev (developer machine) | — | Blocks secrets before they hit the public repo |
| gitleaks CI | CI runner (GitHub Actions) | — | Defense-in-depth against secrets reaching main |
| Vercel preview deploys | CDN / Static + Frontend Server (SSR) | — | Vercel integration auto-builds per PR |
| Legacy `index.html` hosting | CDN / Static (Netlify) | — | Existing Netlify site serves brand domain until Phase 6 cutover |

## Standard Stack

**All versions locked upstream in `.planning/research/STACK.md` — this table reiterates Phase-1-relevant packages only. Do not re-research.**

### Core (Phase 1 installs)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `next` | `16.2.x` (currently `16.2.2`, Apr 1 2026) | App Router framework, Turbopack default, React 19.2 runtime | STACK.md §Core |
| `react` / `react-dom` | `19.2.x` | UI runtime | STACK.md §Core |
| `typescript` | `5.7.x` | Type safety, strict mode default | STACK.md §Core |
| `tailwindcss` | `4.x` (`4.1.x`) | CSS-first config, `@theme` directive, Oxide engine | STACK.md §Core |
| `@supabase/ssr` | `0.10.x` | The only Supabase client for App Router | STACK.md §Core |
| `@supabase/supabase-js` | `2.103.x` | Underlying client | STACK.md §Core |
| `shadcn` CLI | latest (`3.x`), `new-york` style, Tailwind v4 mode | Component system | STACK.md §Core |
| `resend` + `@react-email/components` | `4.x` / `0.1.x` | Transactional email (test send only in Phase 1) | STACK.md §Core |
| `posthog-js` + `posthog-node` | `1.x` / `1.x` | Client + server product analytics | STACK.md §Core |
| `@serwist/next` + `serwist` | `9.x` | PWA service worker (dev-package) | STACK.md §Supporting |
| `@vercel/analytics` | `1.x` | Free Core Web Vitals + page views | STACK.md §Supporting |
| `lucide-react` | `0.4xx` | Icon set for shadcn | STACK.md §Supporting |

### Phase 1 supporting (dev)

| Library | Version | Purpose |
|---------|---------|---------|
| `vitest` + `@vitest/ui` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` | `3.x` | Unit test scaffold (no tests yet — just wiring) |
| `@playwright/test` | `1.x` | E2E scaffold (no tests yet — just wiring) |
| `prettier` + `prettier-plugin-tailwindcss` | `3.x` | Formatting, Tailwind class sort |
| `supabase` | `1.25.x` | Supabase CLI as dev dep; `pnpm supabase <cmd>` |
| `gitleaks` | `8.x` | Secret scanner (binary — not an npm package; install via pre-commit hook repo + GH Action) |

### NOT installed in Phase 1 (deferred)

| Library | Why deferred |
|---------|--------------|
| `react-hook-form` + `@hookform/resolvers` + `zod` + `zod-form-data` | No forms in Phase 1 — first form lands in Phase 2 auth |
| `react-email` (templates dir, not the components package) | Template files land in Phase 5 (contact-relay email) |
| `browser-image-compression` | Avatar upload is Phase 3 |
| `@capacitor/*` | Capacitor wrap is a post-MVP milestone |

**Version verification:** STACK.md versions were verified 2026-04-17 via Context7 + WebSearch. No re-verify needed unless a package > 30 days old at plan time — the planner should re-run `npm view <package> version` for each install at plan execution if more than 30 days have elapsed.

### Alternatives already rejected (don't reconsider)

| Rejected | Why | Source |
|----------|-----|--------|
| `@supabase/auth-helpers-nextjs` | Deprecated at 0.15.0; doesn't handle Next 15/16 async `cookies()` | STACK.md §What NOT to Use, PITFALLS.md §Pitfall 3 |
| `next-pwa` | Abandoned (2+ years); no App Router / Turbopack support | STACK.md §What NOT to Use |
| Bun | Compat edges with Next 16 plugins; solo-maintainer blast radius | STACK.md §Alternatives Considered |
| Jest + Cypress | ESM gymnastics; Playwright handles WebKit for iOS PWA testing | STACK.md §Alternatives Considered |
| Google Analytics 4 | Cookie-consent burden; `contact_initiated` is the metric, not pageviews | STACK.md §What NOT to Use |
| Tailwind v3 config style | v4 is CSS-first; shadcn templates assume v4 | STACK.md §What NOT to Use |

## Architecture Patterns

### System Architecture Diagram (Phase 1 scope only)

```
Developer machine                 GitHub (public repo: barterkin)                Vercel (project exists)
─────────────────                 ───────────────────────────                    ─────────────────────
┌───────────────┐                 ┌─────────────────────┐                        ┌──────────────────┐
│  pnpm dev     │  git push ─────>│  main branch        │                        │  Production      │
│  (localhost   │                 │                     │── push:main ─────────> │  deploy          │
│   :3000)      │                 │  pull request ──────│── PR opened ─────────> │  Preview (PR)    │
└───────┬───────┘                 │                     │                        │  *.vercel.app    │
        │ env                     │  Actions:           │                        └────────┬─────────┘
        │ .env.local              │    lint             │                                 │
        │                         │    typecheck        │                                 │ NEXT_PUBLIC_*
        │                         │    test             │                                 │ + server-only
        │                         │    gitleaks         │                                 │ env injected
        │                         └─────────────────────┘                                 │ per-env
        │                                                                                 v
        │                         ┌─────────────────────────┐                    ┌──────────────────┐
        │   @supabase/ssr ───────>│  Supabase               │                    │  Browser client  │
        └──── createClient ──────>│  (hfdcsickergdcdvejbcw, │ <─ cookies ──────> │  Next.js runtime │
                                  │   us-east-1)            │                    │  React 19.2 +    │
                                  │   - Postgres 17         │                    │  Turbopack SSR   │
                                  │   - Auth (SMTP: Resend) │                    │                  │
                                  │   - Storage             │                    │  Serwist SW      │
                                  │   - migrations via CLI  │                    │  (PWA shell)     │
                                  └─────────────────────────┘                    └─────┬────────────┘
                                                                                       │
                                  ┌─────────────────────────┐                          │
                                  │  Resend (domain verified)│ <── test API route ─────┤
                                  │  SPF/DKIM/DMARC = 10/10  │                          │
                                  └─────────────────────────┘                          │
                                                                                        │
                                  ┌─────────────────────────┐                           │
                                  │  PostHog (project 387571)│ <── capture events ──────┤
                                  │                          │ <── client SDK init ─────┘
                                  └─────────────────────────┘
```

**Data flow in Phase 1:**
1. Developer runs `pnpm dev` → Next.js 16.2 on `:3000` → renders empty scaffold with palette + fonts applied.
2. Developer commits → pre-commit hook runs gitleaks → push to branch → PR opens.
3. PR triggers GH Actions (lint/typecheck/test/gitleaks) and Vercel preview build in parallel.
4. Merge to main → Vercel auto-deploys to production (still on `*.vercel.app`; DNS cutover deferred to Phase 6).
5. Runtime: browser loads app → PostHog SDK inits → optional test event fires → appears in PostHog dashboard.
6. Runtime: `/api/test-email` (dev-only route) POST → Resend SDK sends from verified domain → confirm inbox delivery.

### Recommended Project Structure (Phase 1 starting point)

**Follow `.planning/research/ARCHITECTURE.md` §2 for full target structure.** Phase 1 scaffolds the skeleton but doesn't populate domain modules yet.

```
barterkin/
├── app/
│   ├── layout.tsx                 # <html lang=en>, fonts, <Analytics/>, <PHProvider/>
│   ├── page.tsx                   # empty "Barterkin foundation" placeholder
│   ├── globals.css                # @import "tailwindcss" + @theme tokens
│   ├── manifest.ts                # PWA manifest
│   ├── sw.ts                      # Serwist service worker source
│   ├── providers.tsx              # "use client" — PHProvider + PostHog init
│   └── api/
│       └── test-email/route.ts    # POST → Resend send from verified domain (dev-only; guard by env)
│
├── lib/
│   └── supabase/
│       ├── client.ts              # createBrowserClient — empty-ready
│       ├── server.ts              # createServerClient w/ cookie adapter
│       ├── middleware.ts          # createServerClient for middleware context
│       └── admin.ts               # service-role client; starts with `import "server-only"`
│
├── middleware.ts                   # Supabase session refresh (no route-gating yet — no auth UI)
│
├── supabase/
│   ├── config.toml                 # `supabase init` output; link to project-ref hfdcsickergdcdvejbcw
│   ├── migrations/
│   │   └── 001_foundation_placeholder.sql  # asserts RLS pattern; no tables yet
│   ├── functions/                  # empty (Phase 5 adds send-contact)
│   └── seed.sql                    # empty (Phase 3 seeds counties/categories)
│
├── legacy/
│   └── index.html                  # moved from ~/georgia-barter/index.html (D-03)
│
├── public/
│   └── icons/                      # placeholder PWA icons (sage/forest PNGs, 192/512/maskable)
│
├── tests/
│   ├── unit/                       # Vitest (empty — just framework wired)
│   └── e2e/                        # Playwright (empty — just framework wired)
│
├── scripts/                        # kept from pre-phase: send-mailtest.mjs, setup-dns.mjs
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # lint + typecheck + test + gitleaks parallel jobs
│
├── .env.local.example              # commented template (see §Env Var Structure)
├── .gitignore                      # standard Next.js + .env.local + .vercel + supabase/.branches
├── .gitleaks.toml                  # project-scoped gitleaks config (allowlist .planning/, legacy/)
├── .pre-commit-config.yaml         # gitleaks hook
├── components.json                 # shadcn config
├── postcss.config.mjs              # Tailwind v4 PostCSS plugin
├── next.config.ts                  # wrapped with withSerwist(); images.remotePatterns for Supabase
├── tsconfig.json                   # strict: true (default in Next 16)
├── vitest.config.ts                # minimal config
├── playwright.config.ts            # minimal config
├── README.md                       # brand framing + install + dev instructions
└── package.json                    # pnpm, node 20 engines; scripts: dev/build/lint/typecheck/test
```

### Pattern 1: `@supabase/ssr` Three-Client Factory

**What:** Separate factories for browser, server-components/actions, and middleware — the only correct pattern per Supabase SSR docs.
**When to use:** Every Supabase call in the Next.js app.
**Source:** STACK.md §Key setup patterns, ARCHITECTURE.md §5.2.

**Critical Next 16 detail:** Middleware must use `supabase.auth.getClaims()` (not `getUser()` or `getSession()`) to revalidate the JWT signature against Supabase's published public keys — this is the 2026 replacement for the pre-`getClaims` pattern. Server components and route handlers should use `getUser()` (which round-trips to the Auth server). [CITED: https://supabase.com/docs/guides/auth/server-side/creating-a-client]

```ts
// lib/supabase/client.ts — browser
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
```

```ts
// lib/supabase/server.ts — RSC + route handlers + server actions
import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // called from a Server Component — middleware handles refresh
          }
        },
      },
    },
  )
}
```

```ts
// middleware.ts — session refresh; no route-gating in Phase 1 (no auth UI yet)
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Next 16 pattern: getClaims() revalidates JWT signature without hitting Auth server
  await supabase.auth.getClaims()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
}
```

```ts
// lib/supabase/admin.ts — service-role; never imported from client
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
```

**[ASSUMED]:** The env-var name `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` reflects the 2025-2026 Supabase API-key rename from `anon` → `publishable`. Supabase has announced new key formats (`sb_publishable_...` / `sb_secret_...`) but documentation as of April 2026 doesn't mandate a specific env-var name — `NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted. CONTEXT.md D-08 locks the name as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If the remote Supabase project is still issuing legacy `anon` keys at plan time, the planner should either (a) switch the env-var name to `_ANON_KEY` to match the key type, or (b) rotate to the new publishable key in Supabase Studio before scaffold commit. Flag for user confirmation. [CITED: https://supabase.com/docs/guides/api/api-keys]

### Pattern 2: Serwist PWA (Next 16 App Router)

**What:** Service worker for offline shell + installable web manifest.
**When to use:** Every browser-facing route group once wired.
**Source:** STACK.md §PWA with Serwist, ARCHITECTURE.md §7.

**Critical Next 16 compat note:** Next 16 uses Turbopack by default for `next build`. Serwist has a known integration issue with Turbopack. Two valid workarounds: [CITED: https://serwist.pages.dev/docs/next/getting-started, https://nextjs.org/docs/app/guides/progressive-web-apps]

1. **Build with webpack:** `next build --webpack` in `package.json` scripts. Simple, loses ~30% Turbopack build speedup. Recommended for Phase 1.
2. **Wait for Serwist Turbopack support:** track Serwist repo; revisit at Next 17 or Serwist 10.

**Disable PWA in dev** (`next dev`) to avoid Turbopack/Webpack friction — PWA testing happens on preview deploys.

```ts
// next.config.ts
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})

export default withSerwist({
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
})
```

```ts
// app/sw.ts — Serwist service worker entry
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }],
  },
})

serwist.addEventListeners()
```

```ts
// app/manifest.ts
import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barterkin',
    short_name: 'Barterkin',
    description: "Georgia's community skills exchange.",
    start_url: '/',
    display: 'standalone',
    background_color: '#eef3e8', // --sage-bg
    theme_color: '#2d5a27',       // --forest
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

```tsx
// app/offline/page.tsx — minimal offline fallback
export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-sage-bg)] text-[var(--color-forest-deep)] font-serif text-2xl">
      You&apos;re offline. Barterkin will be back when your connection returns.
    </main>
  )
}
```

### Pattern 3: PostHog Provider (Next 16 App Router)

**What:** Client-side SDK init via PHProvider wrapped in root layout; server-side capture from route handlers/actions when needed.
**When to use:** Every Next.js app that uses PostHog.
**Source:** [CITED: https://posthog.com/docs/libraries/next-js]

**Next 15.3+ / Next 16 detail:** PostHog now recommends `instrumentation-client.ts` for lightweight init, but the PHProvider pattern is still the documented App Router path and preserves flexibility for feature flags + identify. Phase 1 uses PHProvider to minimize surprise.

```tsx
// app/providers.tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only', // GDPR-leaning default
      capture_pageview: true,
      capture_pageleave: true,
      defaults: '2026-01-30',
    })
  }, [])
  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

```tsx
// app/layout.tsx — wrap children with PHProvider + fonts + Analytics
import { Inter, Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PostHogProvider } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const lora = Lora({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })

export const metadata = {
  title: 'Barterkin',
  description: "Georgia's community skills exchange.",
  manifest: '/manifest.webmanifest',
  themeColor: '#2d5a27',
  appleWebApp: { capable: true, title: 'Barterkin', statusBarStyle: 'default' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans bg-[var(--color-sage-bg)] text-[var(--color-forest-deep)]">
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
```

**Phase 1 success-criterion test:** A single `<button onClick={() => posthog.capture('test_event')}>Fire test event</button>` on the placeholder home page, or an equivalent dev-console snippet, must show up in the PostHog dashboard within 60 seconds (ROADMAP.md §Phase 1 success criterion #5).

### Pattern 4: Resend Test Send Route Handler

**What:** A single API route that sends a hardcoded email from the verified domain, used to validate Resend wiring and the Supabase Studio SMTP plumbing.
**When to use:** Phase 1 validation only; Phase 5 will add the real `send-contact` Edge Function.
**Source:** [CITED: https://resend.com/docs/send-with-nextjs]

```ts
// app/api/test-email/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // dev-only guard — never expose this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 404 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const body = (await request.json().catch(() => ({}))) as { to?: string }
  const to = body.to

  if (!to) {
    return NextResponse.json({ error: 'missing `to` field' }, { status: 400 })
  }

  const { data, error } = await resend.emails.send({
    from: 'Barterkin <hello@barterkin.com>', // assumes mail domain = barterkin.com (CONTEXT confirms 10/10 mail-tester achieved)
    to: [to],
    subject: 'Barterkin Phase 1 — Resend test send',
    text: 'If you received this, Resend is correctly wired to the verified domain.',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: data?.id })
}
```

**Validation hook:** `curl -X POST http://localhost:3000/api/test-email -H "Content-Type: application/json" -d '{"to":"your-email@example.com"}'` → 200 OK + email arrives.

**Env-var discipline:** `RESEND_API_KEY` has **no** `NEXT_PUBLIC_` prefix and is server-only. The route handler runs on Node runtime, never in the browser bundle.

### Pattern 5: Supabase Migrations Workflow

**What:** Local-first migrations in `supabase/migrations/*.sql`, applied to remote via `supabase db push`. CI runs migrations against ephemeral local Postgres for integration tests. No auto-apply on merge.
**When to use:** Every schema change from Phase 1 onward.
**Source:** CONTEXT.md D-18..D-20, [CITED: https://supabase.com/docs/guides/deployment/database-migrations]

**Phase 1 migration set:** minimal. Likely one placeholder migration that just asserts the RLS-default pattern (no real tables yet — those arrive in Phase 2 auth / Phase 3 profile).

```bash
# one-time init
pnpm add -D supabase
pnpm supabase init                    # creates supabase/ dir, config.toml
pnpm supabase login
pnpm supabase link --project-ref hfdcsickergdcdvejbcw  # us-east-1 Supabase project

# first migration
pnpm supabase migration new foundation_placeholder
# edit supabase/migrations/<ts>_foundation_placeholder.sql — add comment asserting RLS discipline

# local test: reset local DB + re-apply all migrations
pnpm supabase start                   # starts local Postgres on 54321-54327
pnpm supabase db reset                # applies all migrations cleanly

# push to remote
pnpm supabase db push
```

```sql
-- supabase/migrations/<timestamp>_foundation_placeholder.sql
-- Phase 1 foundation placeholder.
-- No tables yet — Phase 2 creates auth-linked profiles; Phase 3 creates profile fields; Phase 5 creates contact_requests.
-- This migration documents the project's RLS convention for future migrations:
--   1. Every public.* table MUST have `alter table enable row level security` in the same migration.
--   2. Every RLS-enabled table MUST have explicit policies for SELECT, INSERT, UPDATE, DELETE (missing = locked).
--   3. All policies MUST specify `to authenticated` or `to anon` — never empty TO clause.
--   4. `auth.uid()` MUST be wrapped as `(select auth.uid())` for RLS initPlan caching.
-- See .planning/research/ARCHITECTURE.md §4 for full RLS pattern.

-- No-op SQL: assert the migration machinery works end-to-end.
select 1;
```

**CI integration:** GitHub Actions workflow includes an optional migrations job that runs `supabase start` in a service container and applies migrations to the local Postgres, validating they execute cleanly on a fresh DB. Do not run `supabase db push` in CI — that's a manual step.

### Pattern 6: GitHub Actions CI

**What:** One workflow file `ci.yml` with parallel jobs for lint, typecheck, test, and gitleaks. Vercel preview check runs via GitHub integration (separate, not in this workflow).
**When to use:** Every PR and every push to main.
**Source:** CONTEXT.md D-15..D-17, [CITED: https://docs.github.com/actions]

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      pnpm-store: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

  lint:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # GITLEAKS_LICENSE not needed for public repos
```

**`package.json` scripts (Phase 1 minimum):**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "format": "prettier --write ."
  },
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" }
}
```

**Note on `--webpack` build flag:** Required for Serwist compat under Next 16 (see Pattern 2). Dev still uses default Turbopack (`next dev`) — PWA is disabled in dev anyway.

### Pattern 7: gitleaks Pre-Commit + CI

**What:** Secret-scanner run on pre-commit (blocks local commit) and on every PR (CI safety net).
**When to use:** Every commit to the public repo.
**Source:** [CITED: https://github.com/gitleaks/gitleaks, CONTEXT.md D-09]

**Pre-commit integration options (planner chooses):**

| Approach | Pros | Cons |
|----------|------|------|
| `pre-commit` framework (Python-based) | Industry-standard, easy config | Requires `pip install pre-commit` on every dev machine |
| `husky` + `lint-staged` | Node-native, no Python dep | More moving parts; husky v9 install hooks per-clone |
| Raw `.git/hooks/pre-commit` shell script | Zero dep | Not versioned; each dev must install manually |
| `lefthook` | Single Go binary, fast | Extra tool to install |

**Recommendation for solo-builder public repo:** `pre-commit` framework. Python is on macOS by default; the `.pre-commit-config.yaml` is versioned; every dev (including future contributors) runs `pre-commit install` once after clone and it Just Works. If the user prefers no Python dep, `husky` is the next best choice.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2   # verify latest at plan time: github.com/gitleaks/gitleaks/releases
    hooks:
      - id: gitleaks
        args: ['--config=.gitleaks.toml', '--verbose']
```

```toml
# .gitleaks.toml — project config
title = "barterkin gitleaks config"

[extend]
useDefault = true

[allowlist]
description = "Paths to exclude from scanning"
paths = [
  '''\.planning/''',      # planning artifacts contain example keys in docs
  '''legacy/''',          # legacy index.html has no secrets
  '''\.env\.local\.example$''',  # template with placeholder values
  '''pnpm-lock\.yaml$''',
]

# Rules are inherited from default; add project-specific rules if needed.
```

**CI workflow** already covers gitleaks via `gitleaks/gitleaks-action@v2` (see Pattern 6). The action picks up `.gitleaks.toml` automatically when `fetch-depth: 0` is set.

**README bootstrap instruction:** One-liner in `README.md` dev setup section: `pip install pre-commit && pre-commit install` (or `brew install pre-commit` on macOS). This must fire on every fresh clone.

### Design Tokens (Tailwind v4 CSS-first + next/font variables)

**Source:** CONTEXT.md §code_context reusable assets, [CITED: https://ui.shadcn.com/docs/tailwind-v4]

**Key Tailwind v4 insight:** `@theme` directive registers CSS vars that become utility classes (`--color-forest` → `bg-forest`, `text-forest`, etc.). `@theme inline` is for variables that reference other CSS vars (like `next/font` variables).

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";   /* shadcn new-york default */

@custom-variant dark (&:is(.dark *));

/* Phase 1 token set — palette ported from legacy/index.html */
@theme {
  --color-sage-bg:     #eef3e8;
  --color-sage-light:  #dfe8d5;
  --color-sage-pale:   #f4f7f0;
  --color-forest:      #2d5a27;
  --color-forest-deep: #1e4420;
  --color-forest-mid:  #3a7032;
  --color-clay:        #c4956a;

  /* Optional: bring these in Phase 6 when the landing page lands */
  /* --color-teal: #2a9d8f; */
  /* --color-teal-light: #40c4b0; */
  /* --color-warm-brown: #6b5342; */
  /* --color-sand: #e8dcc8; */
}

/* next/font variables bridged via @theme inline — required pattern in Tailwind v4 */
@theme inline {
  --font-sans:  var(--font-sans),  system-ui, -apple-system, sans-serif;
  --font-serif: var(--font-serif), Georgia, 'Times New Roman', serif;
}

/* shadcn new-york default layer — keep if shadcn init emits it */
@layer base {
  :root {
    /* shadcn tokens populated by `shadcn init`; do not hand-edit */
  }
}
```

**Utility classes available after this config:**
- `bg-sage-bg`, `bg-forest`, `text-forest-deep`, `border-forest-mid`, `fill-clay` — full palette
- `font-sans` → Inter, `font-serif` → Lora
- Arbitrary syntax also works: `bg-[var(--color-sage-pale)]`

**Verification:** `curl http://localhost:3000 | grep -oE "--color-(sage|forest|clay)" | sort -u` should show all seven palette vars inlined in the served CSS.

### shadcn Component Install Set (Phase 1 minimum)

**Recommended:** Install only what the Phase 1 scaffold page uses. Add more as Phase 2+ needs them.

```bash
pnpm dlx shadcn@latest init -t next      # new-york style, Tailwind v4 mode
pnpm dlx shadcn@latest add button card input label
```

Adding `form` is optional in Phase 1 — no forms exist yet. Wait until Phase 2 auth; `shadcn@latest add form` also installs `react-hook-form` + `@hookform/resolvers` + `zod` as peer deps, which clutters the Phase-1 dep tree.

### Env-Var Structure (`.env.local.example`)

**Source:** CONTEXT.md D-07, D-08.

```bash
# .env.local.example
# ─────────────────────────────────────────────────────────────
# Barterkin environment variables
# Copy to .env.local and fill in actual values. NEVER commit .env.local.
# Production/preview values live in Vercel env vars (per-environment scope).
# GitHub Actions secrets hold any CI-only values.
# ─────────────────────────────────────────────────────────────

# ── Supabase (project: hfdcsickergdcdvejbcw, region: us-east-1) ──

# Public URL — safe in browser, used by browser + server clients
NEXT_PUBLIC_SUPABASE_URL=https://hfdcsickergdcdvejbcw.supabase.co

# Publishable anon-tier key — safe in browser; RLS is the security boundary
# NOTE: Supabase is renaming `anon` keys to `publishable`; if your project
# still issues `anon` keys, use that name here (or rotate to publishable in Studio).
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Service-role key — SERVER ONLY, bypasses RLS entirely.
# Never add NEXT_PUBLIC_ to this or any other secret.
SUPABASE_SERVICE_ROLE_KEY=

# ── Resend (domain: barterkin.com, verified 10/10 mail-tester) ──

# Transactional email API key — server-only
RESEND_API_KEY=

# ── PostHog (project id: 387571) ──

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# ── Site ──

# Used to construct absolute URLs (OAuth redirects, email links, etc.)
# Phase 1 value: http://localhost:3000 (local) / https://<preview>.vercel.app (preview) / https://barterkin.com (prod, post-Phase-6)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Vercel env-var setup (CONTEXT.md D-04, D-06):**

| Variable | Production scope | Preview scope | Development scope |
|----------|------------------|---------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | prod project URL | prod project URL | prod project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod publishable | prod publishable | prod publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service-role | prod service-role | prod service-role |
| `RESEND_API_KEY` | prod Resend | prod Resend | prod Resend |
| `NEXT_PUBLIC_POSTHOG_KEY` | prod PostHog | prod PostHog | prod PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | same | same |
| `NEXT_PUBLIC_SITE_URL` | `https://barterkin.com` (Phase-6+) or `https://barterkin.vercel.app` (Phase 1-5) | `${VERCEL_URL}` | `http://localhost:3000` |

**Phase 1 detail:** Since Phase 1 doesn't have separate dev/staging Supabase projects (CONTEXT confirms the us-east-2 starter will be retired), all three scopes point at the same `hfdcsickergdcdvejbcw` (us-east-1) project. This is a solo-builder tradeoff — when a second engineer joins, consider creating a dedicated preview Supabase project.

### Anti-Patterns to Avoid (Phase 1 specific)

- **Committing `.env.local`:** `.gitignore` must include it; gitleaks catches if slipped in.
- **Adding `NEXT_PUBLIC_` to a server-only secret:** `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are server-only. gitleaks will flag the leak on commit, but code review is the first gate.
- **Importing `lib/supabase/admin.ts` from any file without `import "server-only"` at the top:** bundles service-role key into browser.
- **Using `next dev --turbopack` with Serwist enabled:** PWA is disabled in dev via `next.config.ts` so this doesn't bite, but planner must not lift the disable flag.
- **Running `supabase db push` in CI on PR merge:** CONTEXT.md D-20 forbids auto-apply. `db push` is a manual developer step.
- **Skipping the folder rename (D-22):** paths in `.planning/`, `CLAUDE.md`, `EXPLORE.md`, and memory will be stale. Rename first, fix paths second.
- **Letting the `us-east-2` starter Supabase project linger (D-21):** housekeeping; delete once the scaffold successfully connects to `us-east-1`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Supabase cookie refresh | Custom middleware that writes cookies by hand | `@supabase/ssr` `createServerClient` with `getAll`/`setAll` adapters + `supabase.auth.getClaims()` | Cookie round-trip is fragile (PITFALLS.md §Pitfall 4) |
| Service worker for PWA | Custom `public/sw.js` from scratch | `@serwist/next` `withSerwistInit` | Precache manifest injection, offline fallback routing, cache strategies are non-trivial |
| Tailwind config file | `tailwind.config.ts` with JS color objects | Tailwind v4 `@theme` in `globals.css` | v4 is CSS-first; shadcn new-york expects this shape |
| Google Font loading | `<link href="fonts.googleapis.com">` in `<head>` | `next/font/google` | Self-hosts at build; zero-runtime to Google; no layout shift |
| Secret scanner | Custom grep for AWS/GitHub tokens | `gitleaks` (8.21+) | Maintained rule set, entropy detection, allowlists, GH Action |
| PostHog init wrapper | Custom provider with manual init | `posthog-js/react` `PostHogProvider` | Handles HMR, dev-mode cleanup, SSR hydration |
| Transactional email | Direct SMTP via `nodemailer` | Resend SDK `@4` | Deliverability, DKIM rotation, webhook signing, React Email compat |
| Supabase migrations | Hand-written SQL files applied via `psql` | `supabase migration new` + `supabase db push` | Migration history table, automatic sequencing, local/remote parity |
| GH Actions Vercel deploy | Custom `vercel deploy` action | Vercel GitHub integration | Per-PR previews, env-scoped vars, auto production deploy on main push |
| Design-token JS objects | Custom `tokens.ts` with JS color strings | CSS custom properties in `@theme` | Themeable at runtime, consumable by non-JS (e.g. email templates) |

**Key insight:** Phase 1 is "wire standard libraries correctly" not "build infrastructure." Any custom code in Phase 1 should be < 50 lines total outside of routine scaffold/config — everything substantive routes through a library or managed service.

## Common Pitfalls

All pitfalls below are either from `.planning/research/PITFALLS.md` (project-wide) or Phase-1-specific discoveries from this research pass.

### Pitfall 1: Secret leaked to client bundle via `NEXT_PUBLIC_` prefix

**Source:** PITFALLS.md §Pitfall 2.
**What goes wrong:** A future developer "fixes" an undefined env error by adding `NEXT_PUBLIC_` to `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY`. Next.js inlines the value into the client chunk. Repo is public. Key is now in GitHub for any visitor.
**How to avoid:**
- `lib/supabase/admin.ts` starts with `import "server-only"` — accidental client import is a build-time error.
- gitleaks CI + pre-commit blocks commits containing `SUPABASE_SERVICE_ROLE_KEY=<hex>` or `re_<token>` strings.
- Code review checklist: any new env var with a secret pattern must **not** have `NEXT_PUBLIC_`.
- CI step (plan this for Phase 2+): `grep -r "service_role\|re_[A-Z0-9]" .next/static/` post-build should return zero hits.
**Warning signs:** `process.env.NEXT_PUBLIC_*` adjacent to words `role`, `secret`, `admin`, `api_key`.

### Pitfall 2: Serwist + Turbopack build incompatibility

**Source:** [CITED: https://nextjs.org/docs/app/guides/progressive-web-apps, Serwist docs].
**What goes wrong:** `next build` (which defaults to Turbopack in Next 16) fails with Serwist in the config. Error cryptic, stops deploy.
**How to avoid:**
- `package.json` build script: `next build --webpack`.
- Dev stays on Turbopack (`next dev`) because Serwist is disabled in dev via `next.config.ts`.
- Re-verify Serwist Turbopack support at each minor bump of Next or Serwist; remove `--webpack` flag when support lands.
**Warning signs:** Build logs mention Turbopack + Serwist + resolve error.

### Pitfall 3: Cookie round-trip in middleware breaks silently

**Source:** PITFALLS.md §Pitfall 4.
**What goes wrong:** Developer copies older middleware pattern that constructs a new `NextResponse` after the Supabase client, losing `Set-Cookie` headers. Session appears to work, then silently expires.
**How to avoid:**
- Use the canonical `@supabase/ssr` middleware template verbatim (shown in Pattern 1).
- Never swallow errors in middleware try/catch.
- Write one Playwright test (Phase 2+) that logs in, waits past token expiry (mocked), and verifies session.

### Pitfall 4: Tailwind v4 font variables not applying

**Source:** [CITED: https://github.com/vercel/next.js/discussions/77337, https://github.com/tailwindlabs/tailwindcss/discussions/13890].
**What goes wrong:** `next/font` sets `--font-sans` CSS var on `<html>`, but `@theme --font-sans: var(--font-sans)` in Tailwind v4 fails to resolve. Fonts don't apply to `font-sans` utility.
**How to avoid:** Use `@theme inline` (not plain `@theme`) when referencing another CSS variable. Verified in Pattern §Design Tokens.
**Warning signs:** `font-sans` utility renders as default system font despite `next/font/google` loading.

### Pitfall 5: Public repo with Vercel integration leaks secrets via build logs

**Source:** WebSearch 2026-04-18.
**What goes wrong:** Build-time env vars get printed into Vercel build logs (rare, but possible via misconfigured `console.log` or failed build diagnostics). Public-repo GitHub gets Vercel status links; anyone reading the failed log sees the secret.
**How to avoid:**
- Vercel automatically masks env vars in logs, but **only for vars registered in the Vercel project**. Unregistered vars set via ad-hoc build commands are NOT masked.
- Never echo env vars in build steps: no `console.log(process.env)` anywhere.
- Mark all secrets in Vercel as "Sensitive" (Vercel UI toggle) to force extra masking.

### Pitfall 6: Folder rename leaves stale path references

**Source:** CONTEXT.md D-22.
**What goes wrong:** `~/georgia-barter` renamed to `~/barterkin` but `.planning/STATE.md`, `CLAUDE.md`, `EXPLORE.md`, `~/.claude/projects/-Users-ashleyakbar/memory/georgia-barter.md` still reference the old path. Future commands (Claude Code, CI, scripts) hit missing-file errors.
**How to avoid:**
- Rename folder FIRST.
- Grep for `georgia-barter` in all project files; replace with `barterkin` where path-relevant (not content-relevant — project history still says "Georgia Barter" the brand; the folder rename is the specific fix).
- Update memory file name AND contents: `georgia-barter.md` → `barterkin.md`.
- Smoke test: run `/gsd-state` from new path; verify STATE.md loads clean.
**Warning signs:** `ENOENT /Users/ashleyakbar/georgia-barter/...` in logs after rename.

### Pitfall 7: Supabase `db push` against unlinked project errors silently on first run

**Source:** [CITED: https://supabase.com/docs/reference/cli/supabase-db-push].
**What goes wrong:** `supabase db push` requires a prior `supabase link`. First run without link-step yields "project not linked" error; developer retries with a `--project-ref` flag but forgets to commit `supabase/config.toml`.
**How to avoid:**
- `supabase link --project-ref hfdcsickergdcdvejbcw` during Phase 1 scaffold, once.
- Commit `supabase/config.toml` (the project-ref is non-secret; secrets go in `supabase/.env` which is gitignored).
- Add `pnpm supabase status` check to README dev setup.

### Pitfall 8: us-east-2 starter Supabase project retained → accidental use

**Source:** CONTEXT.md D-21.
**What goes wrong:** Auto-created `vlrioprefvwkahryuuap` (us-east-2) project exists alongside the intended `hfdcsickergdcdvejbcw` (us-east-1). Future developer (or future-self) runs `supabase link` with wrong ref; migrations go to wrong DB.
**How to avoid:** Delete the us-east-2 starter once us-east-1 scaffold is confirmed connecting (after first successful `pnpm dev` with Supabase query working). Document the delete in the Phase 1 completion checklist.

## Runtime State Inventory

**Required because Phase 1 includes a folder rename (`~/georgia-barter` → `~/barterkin`) AND embeds account identifiers.**

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — no app data exists yet. Supabase DB is empty (us-east-1 project created, no tables). | None |
| **Live service config** | Netlify site serving `index.html` at current `*.netlify.app` URL (D-10, D-11); Cloudflare DNS for `barterkin.com` (will be set in Phase 1 to point at Netlify per D-14); Supabase Studio SMTP settings (to be plugged with Resend creds per FOUND-07); Vercel project env vars (prod+preview+dev scopes to be populated); PostHog project settings (site_url to be set to `*.vercel.app` during Phase 1-5, then `barterkin.com` at Phase 6). | (a) Add Cloudflare A/CNAME records → Netlify. (b) Configure Supabase Studio SMTP → Resend. (c) Populate Vercel env vars via CLI or UI. (d) Add `*.vercel.app` to PostHog authorized URLs. |
| **OS-registered state** | None expected — solo builder on macOS, no systemd/launchd/Task Scheduler tasks registered for this project. | None — verify at Phase 1 start (`ls ~/Library/LaunchAgents | grep -i barterkin` should be empty). |
| **Secrets / env vars** | Memory file `~/.claude/projects/-Users-ashleyakbar/memory/georgia-barter.md` references account identifiers (non-secret) for the project. Secrets in Ashley's 1Password. 1Password vault naming may reference "Georgia Barter" — brand unchanged, so no rotation needed; optionally rename the 1Password vault to "Barterkin" for consistency. | Rename memory file `georgia-barter.md` → `barterkin.md` (optional, per D-22 spirit). 1Password vault rename is optional — brand is still "Barterkin (formerly Georgia Barter)"; secrets themselves unchanged. |
| **Build artifacts / installed packages** | No `node_modules/` yet (no package.json exists before Phase 1 scaffold). No compiled binaries. Legacy `index.html` is static — no build artifacts. `.netlify/` dir (31KB) exists from Netlify CLI — safe to keep or `.gitignore` out. | Start fresh with `pnpm create next-app`. Add `.netlify/` to `.gitignore` if not already there. |

**Canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?*

Answer: only the Cloudflare DNS (which Phase 1 actively reconfigures — D-14) and the memory file (rename recommended). All other references are code-only and grep-replaceable.

## Code Examples

All code examples are inline in §Architecture Patterns above — see:
- Pattern 1: Supabase three-client factory (`lib/supabase/client.ts`, `server.ts`, `admin.ts`, `middleware.ts`)
- Pattern 2: Serwist PWA (`next.config.ts`, `app/sw.ts`, `app/manifest.ts`, `app/offline/page.tsx`)
- Pattern 3: PostHog provider (`app/providers.tsx`, `app/layout.tsx`)
- Pattern 4: Resend test route (`app/api/test-email/route.ts`)
- Pattern 5: Supabase migration workflow (CLI commands + SQL placeholder)
- Pattern 6: GitHub Actions CI (`.github/workflows/ci.yml`)
- Pattern 7: gitleaks config (`.pre-commit-config.yaml`, `.gitleaks.toml`)
- §Design Tokens: `app/globals.css` with `@theme` + `@theme inline`
- §Env-Var Structure: `.env.local.example` template

## Scaffold Sequence (recommended task order)

The planner may reshape this, but the natural dependency order is:

1. **Rename folder** (D-22) — update memory file, grep-replace path refs.
2. **Create GitHub repo** `barterkin` (public, D-01) — empty, with README placeholder.
3. **Scaffold Next.js 16.2** locally: `pnpm create next-app@latest barterkin ...` — yields base.
4. **Move `legacy/index.html`** into `legacy/` dir (D-03).
5. **Install stack deps** (pnpm add blocks per STACK.md §Installation).
6. **`shadcn init`** with new-york / Tailwind v4 mode; add `button card input label`.
7. **Wire design tokens** into `app/globals.css` (@theme + @theme inline).
8. **Wire `next/font/google`** (Lora + Inter) in `app/layout.tsx`.
9. **Wire Supabase SSR** — three clients + middleware.
10. **`supabase init` + `supabase link`** to us-east-1 project.
11. **Add foundation placeholder migration**.
12. **Wire Serwist** — next.config.ts + sw.ts + manifest.ts + icons placeholder.
13. **Wire PostHog** — providers.tsx + layout.tsx wrap.
14. **Wire Resend test route** — `app/api/test-email/route.ts`.
15. **Create `.env.local.example` + `.env.local`** — populate locally for `pnpm dev` to work.
16. **Add gitleaks config + pre-commit hook**.
17. **Write `ci.yml`** — lint/typecheck/test/gitleaks parallel jobs.
18. **Scaffold Vitest + Playwright configs** (empty test suites — just config + script).
19. **First commit** of complete scaffold → push to `main` on new GitHub repo.
20. **Add Vercel GitHub integration** (D-04; after first successful local build).
21. **Populate Vercel env vars** (prod/preview/dev scopes).
22. **Configure Cloudflare DNS → Netlify** (D-14): A root + CNAME www → netlify apex.
23. **Verify**: visit `barterkin.com` shows legacy; visit `<project>.vercel.app` shows empty scaffold with palette; fire `posthog.capture('test_event')` and confirm in dashboard; `curl` Resend test endpoint and confirm email delivery.
24. **Supabase Studio SMTP config**: plug Resend into Auth → SMTP (FOUND-07).
25. **Retire us-east-2 starter** (D-21): delete the auto-created project.

**Total task count:** planner should expect ~6-10 task plans to cover this depending on granularity. Suggested grouping:
- Plan A: Repo rename + GitHub repo + scaffold (steps 1-4)
- Plan B: Dep install + shadcn init + design tokens + fonts (steps 5-8)
- Plan C: Supabase wiring + migrations (steps 9-11)
- Plan D: Serwist PWA (step 12)
- Plan E: PostHog + Resend test route (steps 13-14)
- Plan F: Env-var template + secret hygiene + gitleaks + CI (steps 15-17)
- Plan G: Test scaffolds + first commit + Vercel integration + DNS + Supabase SMTP + verification (steps 18-25)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr@0.10.x` | 2024 | PITFALLS.md §Pitfall 3 — hard-deprecated |
| `supabase.auth.getSession()` server-side | `supabase.auth.getUser()` or `.getClaims()` | Post-2024 | JWT revalidation; `getSession` spoofable |
| `next-pwa` | `@serwist/next@9.x` | 2023-2024 | `next-pwa` abandoned; Serwist official successor |
| Tailwind v3 `tailwind.config.ts` JS config | Tailwind v4 CSS-first `@theme` | 2024-2025 | shadcn CLI defaults to v4 |
| HSL colors in shadcn | OKLCH | 2025 | Nicer color interpolation |
| PostHog manual `posthog.init` in layout | `PostHogProvider` from `posthog-js/react` | 2024+ | Handles HMR/hydration |
| `pages/api/*.ts` route handlers | `app/api/*/route.ts` Route Handlers | 2023+ | App Router standard |
| Webpack default for Next | Turbopack default in Next 16 | Oct 2025 | Serwist compat requires `--webpack` flag (temporary) |

**Deprecated/outdated (do not use):**
- `getServerSideProps` / Pages Router — no new app should use this
- `supabase.auth.onAuthStateChange()` as the sole session source on server — use middleware + getClaims
- Custom cookie-setting in middleware — use `@supabase/ssr` adapter
- `@types/react@17` — Next 16 ships with 19.2 types

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the correct env-var name (Supabase API-key rename may be in partial rollout). | §Pattern 1, §Env-Var Structure | Low — naming is a convention; value still works. Fix: rename to `_ANON_KEY` if the project still issues legacy anon keys. |
| A2 | Mail domain is `barterkin.com` (used for Resend `from:` address in test route example). CONTEXT.md says domain purchased but doesn't confirm exact hostname. | §Pattern 4 Resend test route | Low — swap the `from:` string in the test route. |
| A3 | Netlify apex = `barterkin.netlify.app`-style subdomain (CNAME target) or `75.2.60.5`-class Netlify A record IP. Exact Netlify DNS target not captured in CONTEXT. | §D-14, §Runtime State Inventory | Low — planner should verify current Netlify site's DNS configuration via Netlify API or UI before writing the Cloudflare record. |
| A4 | PostHog instance is US (`https://us.i.posthog.com`). Project id 387571 is captured in memory but the host (US vs EU) is not explicitly stated. | §Env-Var Structure, §Pattern 3 | Low — EU PostHog uses `https://eu.i.posthog.com`. Verify in PostHog project settings. |
| A5 | gitleaks `v8.21.2` is latest stable as of plan time. Version pinned in `.pre-commit-config.yaml`. | §Pattern 7 | Low — planner should `npm view` or check `github.com/gitleaks/gitleaks/releases` at plan time and bump to current. |
| A6 | Pre-commit framework (Python-based) chosen over husky or lefthook. User prefers minimal tooling; pre-commit framework is cross-repo stable. | §Pattern 7 | Low — swap for husky if Python is unwanted. Document in plan. |
| A7 | Serwist 9.x still has Turbopack build incompat as of April 2026 (Web search 2026-04-18 confirms). If Serwist 10 or Next 16.3 lands with fix before plan execution, the `--webpack` flag may be dropped. | §Pattern 2 | Medium — check Serwist changelog at plan time; if fixed, remove the build script workaround. |
| A8 | No branching strategy (D-15) means no branch-protection rules; gitleaks and CI are best-effort, not enforced. Acceptable for solo builder. | §CI Workflow | Low — matches CONTEXT.md D-15/D-16 intent. |
| A9 | Supabase CLI installed as project dev-dep (`pnpm add -D supabase`) rather than globally. | §Pattern 5 | Low — global install works too. Dev-dep keeps versions pinned across devs. |
| A10 | The `NEXT_PUBLIC_POSTHOG_HOST` default of `https://us.i.posthog.com` is safe. | §Env-Var Structure | Low — see A4. |

**Confirmation needed:** The planner/discuss-phase should verify A1 (env-var name vs key format), A2 (mail domain = `barterkin.com`), and A3 (Netlify DNS target) with the user before writing the final plans, as all three affect the exact string values that go into files or DNS records.

## Open Questions

1. **Exact Netlify DNS target for `barterkin.com`**
   - What we know: Netlify site is live with legacy `index.html`; Cloudflare DNS for `barterkin.com` needs A/CNAME pointing at Netlify (D-14).
   - What's unclear: Is the current Netlify site on a `*.netlify.app` subdomain (CNAME target) or a custom-deploy context (apex-alias A record)?
   - Recommendation: Phase 1 task Plan G step should include a Netlify API call (`netlify sites:list`) or UI check to capture the exact CNAME/A target, then write that to Cloudflare.

2. **Supabase SMTP config in Studio — what's the "test email" path?**
   - What we know: FOUND-07 says Resend must be plugged into Supabase SMTP for auth emails. Phase 1 has no auth UI, so the only way to validate wiring is via Studio's "Send test email" button or by triggering a magic-link from Supabase Studio's own interface.
   - What's unclear: whether Supabase Studio exposes a "test SMTP" button or only validates at first real signup.
   - Recommendation: Planner should either (a) include a Supabase Studio UI check as a manual verification step, or (b) accept that full SMTP validation happens in Phase 2 when the first magic-link ships, and Phase 1 just completes the config plumbing.

3. **PostHog authorized URLs during Phase 1-5**
   - What we know: PostHog host = `us.i.posthog.com`; client SDK fires from browser.
   - What's unclear: Whether PostHog requires URL allowlisting for client SDK usage (most analytics services don't, but some rate-limit by origin).
   - Recommendation: Add `*.vercel.app` + `http://localhost:3000` to PostHog project's authorized URLs if the project uses strict origin checking.

4. **1Password vault rename**
   - What we know: memory references 1Password for secrets; brand is now "Barterkin."
   - What's unclear: Whether the vault is currently named something like "Georgia Barter Secrets" and whether that breaks anything if left unchanged.
   - Recommendation: Low priority. Vault rename is cosmetic; no code depends on vault name. Defer to "nice to have at some point."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥ 20 | Next.js 16.2, Vercel runtime | ✓ | `v22.14.0` at `~/node/bin` (per MEMORY) | — |
| pnpm ≥ 9 | Package manager | Unknown — need to verify at plan time | — | `corepack enable pnpm` or `npm install -g pnpm@9` |
| Supabase CLI | Local migrations + `db reset` | Installs as pnpm dev-dep (`pnpm add -D supabase`) | 1.25.x | — |
| gh CLI | GitHub repo creation, PR management | ✓ at `~/bin/gh` (per MEMORY) | current | — |
| gitleaks | pre-commit + CI | Not yet installed locally; pre-commit framework installs binary per-hook-run | 8.21+ | CI-only scanning if local install fails |
| pre-commit framework | Pre-commit hook runner | Unknown — `pip install pre-commit` | current | husky + `lint-staged` alternative |
| Python 3 (for pre-commit) | Pre-commit framework | ✓ (macOS default) | `python3` available | skip pre-commit, CI-only |
| git | Version control | ✓ | current | — |
| Docker | Supabase CLI local Postgres | Unknown — `supabase start` requires Docker Desktop | current | Use remote Supabase for dev; no local Postgres until Phase 2+ |
| Cloudflare DNS access | Adding A/CNAME records for barterkin.com (D-14) | ✓ per CONTEXT — zone `62def5475df0d359095a370e051404e0` captured in memory | — | — |
| Netlify access | Confirm Netlify site target, keep site live | ✓ — `.netlify/` dir exists in repo | — | — |
| Vercel access | Create project + GitHub integration + env vars | ✓ — team `team_lgW6L6OTcKom1vrTkNwdsGJ4` per CONTEXT memory | — | — |
| Resend dashboard | Verify SPF/DKIM/DMARC + obtain API key | ✓ — account exists, domain verified 10/10 per CONTEXT | — | — |
| PostHog dashboard | Confirm events arrive, set authorized URLs | ✓ — project 387571 per memory | — | — |
| Supabase dashboard | Project config, SMTP wiring | ✓ — project `hfdcsickergdcdvejbcw` us-east-1 per CONTEXT | — | — |

**Missing dependencies with no fallback:** Potentially Docker Desktop (for `supabase start` local dev). Phase 1 migration workflow (`supabase db push`) doesn't strictly require local Postgres — it can run against the remote project. However, CI integration tests (D-20) expect `supabase start` in the CI container, which uses Docker inside the GH Actions runner (always available on `ubuntu-latest`). Local Docker only matters if the developer wants `db reset` locally.

**Missing dependencies with fallback:** pre-commit framework (husky alternative), local pnpm (corepack enable), local Supabase CLI (use npx).

**Recommendation:** Planner should add a Plan-A step "verify/install pnpm@9, pre-commit, Docker Desktop (optional)" with fallback paths documented.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 3.x |
| E2E framework | Playwright 1.x |
| Unit config file | `vitest.config.ts` (Wave 0) |
| E2E config file | `playwright.config.ts` (Wave 0) |
| Quick run command | `pnpm test` (runs Vitest in CI mode) |
| Full suite command | `pnpm test && pnpm test:e2e` (Phase 2+ when tests exist) |

**Phase 1 reality:** No tests exist yet. Phase 1 wires the test frameworks but writes zero test files. Validation is primarily grep/file-read/CLI-command based.

### Phase Requirements → Test Map

| Req ID | Behavior | Validation Type | Automated Command | Wave 0 Gap |
|--------|----------|-----------------|-------------------|------------|
| FOUND-01 | Next.js 16.2 + pnpm + Tailwind v4 + shadcn new-york + TS strict + Lora+Inter | file-read + CLI | `grep '"next":' package.json && pnpm tsc --noEmit && grep 'Lora\|Inter' app/layout.tsx && grep 'new-york' components.json` | Framework scaffold step |
| FOUND-02 | Sage/forest/clay palette wired as `@theme` tokens | grep | `grep -E "color-(sage-bg\|sage-light\|sage-pale\|forest\|forest-deep\|forest-mid\|clay):" app/globals.css \| wc -l  # expect 7` | None — pure grep |
| FOUND-03 | Dedicated domain procured + DNS-controlled | external (manual) | `dig +short barterkin.com` returns records | Done pre-phase; Phase 1 adds Cloudflare → Netlify records |
| FOUND-04 | SPF + DKIM + DMARC verified | external (script) | `node scripts/send-mailtest.mjs` (existing script) expects ≥9/10 | Done pre-phase (10/10 achieved); Phase 1 retests |
| FOUND-05 | Fresh Supabase project; RLS enabled by default | CLI | `pnpm supabase db remote commit && grep 'enable row level security' supabase/migrations/*.sql` | Placeholder migration |
| FOUND-06 | Fresh Vercel project with preview+production env vars | external (API) | `vercel env ls --environment=production` and `--environment=preview` expect all 7 NEXT_PUBLIC_* + RESEND_API_KEY + SUPABASE_SERVICE_ROLE_KEY | Manual Vercel UI step + verification via vercel CLI |
| FOUND-07 | Resend verified + plugged into Supabase SMTP | HTTP probe + manual | `curl -X POST localhost:3000/api/test-email -d '{"to":"..."}'` returns 200 + email delivered | Test route + Supabase Studio config step |
| FOUND-08 | Migrations versioned, reproducible via `db reset` | CLI | `pnpm supabase db reset --local` exits 0 | Placeholder migration must exist |
| FOUND-09 | Serwist PWA w/ manifest + service worker + icons | file-exists + HTTP | `ls app/manifest.ts app/sw.ts public/icons/icon-192.png public/icons/icon-512.png` + `curl http://localhost:3000/manifest.webmanifest` returns 200 | Manifest + sw.ts + icon placeholder PNGs |
| FOUND-10 | PostHog integrated; `initiated_contact` event schema defined | file-read + manual | `grep 'PostHogProvider\|posthog.init' app/providers.tsx && grep "'contact_initiated'\|'initiated_contact'" docs/events.md` | providers.tsx + event schema doc |
| FOUND-11 | GH Actions CI: lint/typecheck/test on PR; Vercel preview on branch | file-read + manual | `grep -E '(pnpm lint\|pnpm typecheck\|pnpm test)' .github/workflows/ci.yml` + PR opened in GitHub shows Vercel check | ci.yml + GitHub integration |
| FOUND-12 | Legacy index.html kept live on Netlify | file-exists + HTTP | `ls legacy/index.html && curl -I https://<netlify-url>` returns 200 | Move file + preserve Netlify |

**Event schema file for FOUND-10:** Recommend creating `docs/events.md` (or `.planning/analytics/events.md`) in Phase 1 that declares:
```md
# Analytics Events

## contact_initiated
Fired from the `send-contact` Supabase Edge Function (Phase 5) on a successful platform-relayed contact send.

**Properties:**
- `recipient_county` (string) — ANON: county FIPS only, no names.
- `recipient_category` (string) — seeded 10-category slug.
- `sender_tenure_days` (integer) — days since sender.created_at.
- `$host` — inherited from PostHog defaults.

**Source of truth:** `public.contact_requests` row inserted by the Edge Function.

**Phase 1 scope:** document schema. Wiring lands in Phase 5.
```

### Sampling Rate

- **Per task commit:** `pnpm lint && pnpm typecheck` — fast grep + config checks.
- **Per wave merge:** `pnpm test` (Vitest, empty suite = instant pass) + pre-commit hook full-repo scan.
- **Phase gate:** Full validation table above green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `vitest.config.ts` — framework wiring, no tests.
- [ ] `playwright.config.ts` — framework wiring, no tests.
- [ ] `app/globals.css` — @theme palette.
- [ ] `app/layout.tsx` — fonts + providers + Analytics.
- [ ] `app/providers.tsx` — PostHog init.
- [ ] `app/api/test-email/route.ts` — Resend test.
- [ ] `app/manifest.ts` — PWA manifest.
- [ ] `app/sw.ts` + `next.config.ts` withSerwist wrapper.
- [ ] `lib/supabase/{client,server,admin,middleware}.ts` — three-client factory.
- [ ] `middleware.ts` — session refresh.
- [ ] `supabase/config.toml` + `supabase/migrations/<ts>_foundation_placeholder.sql`.
- [ ] `.github/workflows/ci.yml` — parallel jobs.
- [ ] `.gitleaks.toml` + `.pre-commit-config.yaml`.
- [ ] `.env.local.example` — template.
- [ ] `docs/events.md` — analytics event schema for FOUND-10.
- [ ] `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable.png` — placeholder PWA icons (sage/forest flat PNGs).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Three-client Supabase factory; `import "server-only"` on admin.ts; public-repo secret boundary |
| V2 Authentication | partial (Phase 2 covers full) | Phase 1: Supabase Auth project exists, SMTP plugged. Phase 2 adds flows. |
| V3 Session Management | yes | `@supabase/ssr` middleware + `supabase.auth.getClaims()` JWT revalidation |
| V4 Access Control | partial | RLS pattern asserted in placeholder migration; no tables in Phase 1 |
| V5 Input Validation | no | No user input in Phase 1 (no forms) |
| V6 Cryptography | yes | TLS via Vercel/Cloudflare; DKIM signing via Resend; gitleaks guards key leaks |
| V7 Error Handling | yes | Middleware must not swallow errors (PITFALLS.md §Pitfall 4) |
| V8 Data Protection | yes | Service-role key server-only; env-var boundary policed |
| V9 Communications | yes | HTTPS enforced by Vercel; SPF/DKIM/DMARC verified pre-phase |
| V10 Malicious Code | yes | gitleaks pre-commit + CI; public-repo discipline |
| V14 Config | yes | `.gitignore` + `.env.local.example` + `supabase/config.toml` committed; secrets elsewhere |

### Known Threat Patterns for Next.js 16 + Supabase + Public Repo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service-role key leaked to client bundle | Info Disclosure | `import "server-only"` + gitleaks + no `NEXT_PUBLIC_` prefix |
| Secret committed to public repo | Info Disclosure | gitleaks pre-commit + CI; repo history audit |
| Spoofed session via stolen cookie | Spoofing | `getClaims()` revalidates JWT signature on every request |
| CSRF on test-email route | Tampering | Dev-only guard (`NODE_ENV === 'production'` returns 404); Phase 2+ adds auth-required checks on any mutating route |
| DNS hijack of mail domain | Spoofing | SPF/DKIM/DMARC (verified pre-phase); Cloudflare Universal SSL; DNSSEC enabled at Cloudflare |
| Resend API key abuse | Tampering | Server-only; Phase 5 adds per-sender rate limits; Resend dashboard alerting |
| Supabase PostgREST anon-role over-expose | Info Disclosure | Default-deny RLS; every public.* table gets RLS enabled in same migration as creation |
| Next.js build log secret leak | Info Disclosure | Never `console.log(process.env)`; mark Vercel vars as Sensitive |
| PWA service worker poisoning | Tampering | Serwist `skipWaiting`/`clientsClaim` controlled; SW source in git; build-time generation only |

### Project Constraints (from CLAUDE.md)

Extracted from `/Users/ashleyakbar/georgia-barter/CLAUDE.md` — treat with same authority as CONTEXT.md locked decisions:

- **Tech stack locked:** Next.js 16.2.x App Router + React 19.2, Supabase (Auth/Postgres/Storage), Vercel hosting. Do NOT propose alternatives.
- **No custom auth code:** Supabase Auth is the only provider.
- **Privacy:** Member email/phone never in directory UI; always via relay.
- **Dedicated Barterkin domain:** standalone brand; separate from biznomad.io.
- **Fresh accounts:** No reuse of existing infrastructure (Supabase/Vercel/Resend/PostHog).
- **Free-tier-first:** near-zero cost.
- **Hosting:** Vercel (app) + Netlify (legacy index.html until Phase 6 cutover).
- **Deliverability:** SPF+DKIM+DMARC in Phase 1 DNS setup; Resend plugged into Supabase Studio SMTP (FOUND-07).
- **CLAUDE.md TL;DR forbiddens (reinforce STACK.md):** No `@supabase/auth-helpers-nextjs`, no `supabase.auth.getSession()` server-side for trust, no `next-pwa`, no Tailwind v3 config, no `NEXT_PUBLIC_` on service-role key, no Bun, no Google Analytics, no Jest, no passkey-only sign-in, no recipient email exposed in directory pages.
- **GSD workflow enforcement:** Any file edit must go through a GSD command (`/gsd-execute-phase`, `/gsd-quick`, `/gsd-debug`) — planner should structure tasks knowing the executor works inside the GSD harness.

## Sources

### Primary (HIGH confidence)

- **`.planning/research/STACK.md`** (2026-04-17) — THE bible for Phase 1 stack. Versions, libraries, anti-patterns, installation order, version compatibility matrix, "What NOT to Use."
- **`.planning/research/ARCHITECTURE.md`** (2026-04-17) §1–5, §7, §9 — Route structure, three-client factory pattern, RLS architecture, Serwist PWA, Capacitor-later plan.
- **`.planning/research/PITFALLS.md`** (2026-04-17) §Technical pitfalls 1-22, §Pre-launch — `@supabase/auth-helpers-nextjs` deprecated, Serwist+Turbopack quirks, service-role leak, cookie round-trip, SPF/DKIM/DMARC, empty-directory cold start.
- **`.planning/research/SUMMARY.md`** + **`.planning/research/FEATURES.md`** — cross-cutting insights, phase-split rationale.
- **`.planning/PROJECT.md`**, **`.planning/REQUIREMENTS.md`**, **`.planning/ROADMAP.md`** — project-level constraints and Phase 1 requirement/success-criterion definitions.
- **`/Users/ashleyakbar/georgia-barter/CLAUDE.md`** — Project instructions (tech stack, constraints, GSD workflow).
- **`/Users/ashleyakbar/georgia-barter/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md`** — User decisions from `/gsd-discuss-phase`, locked.
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16) — GA Oct 2025.
- [Next.js Upgrading to v16](https://nextjs.org/docs/app/guides/upgrading/version-16) — Turbopack default, React 19.2.
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — recommends Serwist.
- [Supabase SSR Creating a Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — `getAll`/`setAll` mandatory, `getClaims()` middleware pattern.
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) — `db push` / `db reset` workflow.
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys) — anon → publishable rename in progress.
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) — new-york style default, `@theme` directive.
- [Resend Next.js SDK](https://resend.com/docs/send-with-nextjs) — `resend@4` + Route Handler pattern.
- [PostHog Next.js Docs](https://posthog.com/docs/libraries/next-js) — PHProvider, `defaults: '2026-01-30'`, instrumentation-client.ts alternative.
- [Serwist Getting Started](https://serwist.pages.dev/docs/next/getting-started) — withSerwistInit, sw.ts, cacheOnNavigation.
- [gitleaks GitHub](https://github.com/gitleaks/gitleaks) — config, pre-commit, Action v2.

### Secondary (MEDIUM confidence — verified against primary)

- [Using PostHog with Next.js App Router (Vercel KB)](https://vercel.com/kb/guide/posthog-nextjs-vercel-feature-flags-analytics) — verified against PostHog docs.
- [Next.js 16 Turbopack + Serwist compat (GitHub discussions)](https://github.com/vercel/next.js/discussions/77721) — confirmed `--webpack` flag workaround.
- [Tailwind v4 next/font variable issue](https://github.com/vercel/next.js/discussions/77337) — confirmed `@theme inline` required.
- [Securing Repositories with gitleaks + pre-commit](https://medium.com/@ibm_ptc_security/securing-your-repositories-with-gitleaks-and-pre-commit-27691eca478d) — pattern validated against gitleaks official README.
- [Vercel GitHub Integration + Deployment Checks](https://vercel.com/docs/deployment-checks) — required-checks pattern.
- [GitHub Actions + pnpm + Turborepo](https://vercel.com/academy/production-monorepos/github-actions) — pnpm cache + node setup pattern.

### Tertiary (LOW confidence — flagged, not relied on for critical claims)

- Medium/LogRocket tutorials on Next 16 PWA (dated Jan-Mar 2026) — not used for authoritative claims; cross-referenced with Serwist official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package pinned in STACK.md, verified 2026-04-17 via Context7 + WebSearch; this phase inherits without re-verification.
- Architecture patterns: HIGH — three-client factory, middleware, Serwist, PostHog, Resend all anchored to official docs re-confirmed 2026-04-18.
- Pitfalls: HIGH — project's own PITFALLS.md covers 22 pitfalls; Phase-1-specific additions (Serwist+Turbopack, folder rename, us-east-2 retire) verified this pass.
- Env-var naming (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`): MEDIUM — Supabase rename is in rollout; specific env-var naming is project convention (D-08), not Supabase-enforced.
- Netlify DNS target + Supabase SMTP test path: MEDIUM — documented as Open Questions; planner must resolve before/during execution.
- Validation Architecture: HIGH — every FOUND-XX requirement has an automated verification command.
- Security domain: HIGH — ASVS mapping straightforward for scaffold phase; STRIDE threat patterns well-covered by project's upstream research.

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — stable ecosystem, but Next 16 minor releases and Serwist updates may invalidate the Turbopack workaround sooner; re-verify Serwist compat at plan time if >14 days old)

---

*Phase: 01-foundation-infrastructure*
*Research consumed by: gsd-planner → creates PLAN.md + per-task plan files*
*Upstream inputs: STACK.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md, PROJECT.md, REQUIREMENTS.md, ROADMAP.md, CLAUDE.md, 01-CONTEXT.md*
