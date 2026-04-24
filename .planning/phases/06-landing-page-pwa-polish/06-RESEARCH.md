# Phase 6: Landing Page & PWA Polish - Research

**Researched:** 2026-04-21
**Domain:** Next.js 16 public marketing page, Open Graph / social card metadata, Serwist PWA polish, mobile-first Tailwind v4 responsive
**Confidence:** HIGH

## Summary

Phase 6 is the first public (unauthenticated) Next.js surface in the codebase. Phases 1–5 shipped only authed surfaces (`/directory`, `/m/*`, `/profile`, `/login`) — every migration to date has `for select to authenticated` on `profiles`, `counties`, and `categories`. That makes the founding-member strip and county-coverage queries **the single highest-risk item in this phase**: they either need an anon-scoped RLS policy (data migration) or they need to run through the server-only `supabaseAdmin` service-role client that already exists in `lib/supabase/admin.ts`. The UI-SPEC did not flag this.

Everything else is well-understood Next.js 16 terrain: the metadata API handles Open Graph and Twitter cards declaratively, the `app/opengraph-image.tsx` + `app/icon.tsx` + `app/apple-icon.tsx` file conventions generate static social/icon assets at build time via `next/og`'s `ImageResponse`, and the Serwist PWA shell (service worker + manifest + offline fallback) is already live from Phase 1 — Phase 6 only needs to (1) replace three placeholder `B`-on-forest PNGs with branded sprout/leaf icons, (2) add a `180x180` `apple-icon`, and (3) verify the install flow works at the new copy.

Legacy `legacy/index.html` retirement is organizational, not technical: DNS already points `barterkin.com` at Vercel (per STATE.md 2026-04-20), so the cutover is (a) archive the Netlify deploy and (b) add `legacy/README.md` marking the file as historical reference. The Netlify site is not on `barterkin.com` — it is on whatever Netlify subdomain it was born with — so there is no "shut it off" step that affects customers.

**Primary recommendation:** Before writing any landing-page component, add a `select-for-public-directory` RLS policy (or a `service_role`-fronted data helper) that lets the anon Postgres role read the exact same 3 fields from 3 tables the strip + coverage + stat queries need. Treat this as Wave 0 blocking work, not an afterthought.

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for Phase 6. UI-SPEC (`06-UI-SPEC.md`) is the locked design contract and serves the same role.

### Locked Decisions (from UI-SPEC)

- Sage/forest/clay palette only — **no teal** ported from legacy `index.html` (explicitly excluded, rationale documented in UI-SPEC §Color)
- Typography: Lora (headings/display) + Inter (body/label), exactly 4 sizes (14 / 16 / 24–32 / 40–64) and exactly 2 weights (400 + 700); `font-semibold` forbidden
- Spacing: 8-point scale + ratified phase-specific exceptions (40 / 56 / 80 px)
- Components: compose from already-installed shadcn primitives only (`button`, `card`, `avatar`, `badge`, `separator`) — no new `shadcn add` calls
- No third-party registries
- No sign-up form embedded on landing — link to `/signup`
- No photography / stock imagery — type + palette + illustration only
- No scroll animations, parallax, or video backgrounds
- No custom `beforeinstallprompt` handler — rely on browser default
- 7 new components under `components/landing/`: `LandingNav`, `Hero`, `HowItWorks`, `FoundingMemberStrip`, `FoundingMemberCard`, `CountyCoverage`, `SecondaryCTA`
- `app/page.tsx` is a server component that runs 3 queries in parallel via `Promise.all` (founders, counties, stats) and passes results as props — **no client-side data fetching**
- Tap target floor: `h-11` (44px) on CTAs; `h-14` (56px) permitted on hero primary
- Mobile floor: 360px viewport (iPhone SE 1st gen)
- All copy is locked verbatim in UI-SPEC §Copywriting Contract — no ad-hoc edits
- Error states degrade gracefully to empty-state copy + PostHog event; **never** show a user-facing error page on the public marketing front door
- PostHog events namespace: `landing_*` (never `contact_initiated` — that's the Phase 5 KPI)
- Footer already exists (`components/layout/Footer.tsx`) — already in root `app/layout.tsx` — do not modify

### Claude's Discretion (inferred from UI-SPEC gaps)

- **Exact Supabase query mechanism for anon-scoped reads** (see Summary — UI-SPEC says "server component performs the three queries" but does not specify how the anon role gets read access; see Pitfall 1)
- OG image composition details within the locked brief (Lora 120px wordmark, forest gradient, no photography)
- Branded icon SVG illustration within the locked palette (sprout/leaf mark, forest on sage)
- PWA install polish beyond icon replacement (apple-icon.png size/location)
- How to structurally "retire" `legacy/index.html` (README marker pattern)

### Deferred Ideas (OUT OF SCOPE)

- Custom install prompt UI — revisit in v1.1 if install rate is low
- Teal accent or any new hue — explicitly forbidden
- Embedded sign-up form — link to `/signup` only
- Scroll animations / parallax / video backgrounds
- Authed-user app nav (AppNav) on landing — landing uses its own `LandingNav`
- Footer copy or structure changes — cross-page, handled separately
- Any shadcn primitive not already installed
- Analytics events beyond page-view and the explicit `landing_*` list
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAND-01 | New landing page at `/` matches existing `index.html` visual identity (palette + Lora/Inter + warm community aesthetic) | Palette verified — `app/globals.css` `@theme` tokens match `legacy/index.html` CSS vars (verbatim hex); Lora + Inter wired via `next/font/google` in `app/layout.tsx` (Phase 1); landing page composes existing shadcn primitives only (UI-SPEC §Registry additions required) |
| LAND-02 | Landing sections: hero with value prop, "how it works" 3-step, founding-member strip (live profiles), county coverage, signup CTA, footer with ToS/Privacy/Guidelines | 7 components mapped in UI-SPEC §Page structure; Footer already in root layout (Phase 2); **data-source blocker** — see Pitfall 1 for the anon-RLS hole |
| LAND-03 | Responsive: mobile-first; tested on ≥360px viewport width | Playwright config has `devices['Desktop Chrome']` only (no `iPhoneSE` project yet) — Wave 0 gap: add a mobile project. UI-SPEC §Responsive pins exact Tailwind breakpoints per section |
| LAND-04 | Open Graph meta, favicon, manifest icons; preview card renders when shared on social | `next/og` `ImageResponse` available (`node_modules/next/og.d.ts` verified); file conventions `app/opengraph-image.tsx` + `app/twitter-image.tsx` (or reuse OG via inheritance) + `app/icon.tsx` + `app/apple-icon.tsx` are the canonical paths; see Code Examples |
| GEO-03 | Landing page and onboarding copy frame the honor-system expectation: "Georgia residents only" | Exact copy locked in UI-SPEC §Hero eyebrow ("Georgia residents only · Honor system") + §County coverage honor-system line + §Meta |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following directives from `./CLAUDE.md` must be honored during planning and execution:

- **Tech stack**: Next.js 16.2.x App Router; Node 20 LTS; pnpm (NOT Bun)
- **Supabase clients**: `@supabase/ssr` three-client factory; NEVER `@supabase/auth-helpers-nextjs`; NEVER `supabase.auth.getSession()` for trust decisions
- **PWA**: Serwist (`@serwist/next`) NOT `next-pwa`
- **Tailwind**: v4 CSS-first (`@theme`), NOT v3 `tailwind.config.js`
- **Service-role key**: never prefixed `NEXT_PUBLIC_`; server-only imports use `import 'server-only'` at line 1
- **Privacy**: member email/phone NEVER in directory UI — relay only (not relevant to landing page since no profile emails rendered, but worth re-stating for the county/founder queries that MUST select only public fields: `username`, `display_name`, `avatar_url`, county name, category name, top-3 skill text — NOT email)
- **Hosting**: Vercel for Next.js app; legacy `index.html` on Netlify until Phase 6 retires it
- **Not-this-Next.js** (AGENTS.md): read `node_modules/next/dist/docs/` before writing Next 16 code — APIs have changed from older Next versions
- **GSD workflow**: edits go through `/gsd-execute-phase`, never direct edits

Training-data hallucination risks flagged:
- `ImageResponse` imports from `next/og` (NOT `next/server` which was the pre-13.3 path)
- `params` in generated images/metadata is `Promise<...>` as of Next 16 (was plain object in older Next)
- `metadata` and `generateMetadata` are Server-Component-only (no `'use client'`)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Render landing page HTML (hero, how, strip, coverage, CTA) | Frontend Server (SSR, server component) | CDN (Vercel edge cache) | Public + mostly static; Next 16 statically optimizes by default unless RSC reads dynamic data. Founding strip + county coverage + stat strip are the only dynamic pieces. |
| Query founding-member profiles (live) | Database / Storage (Supabase Postgres via server client OR service-role) | — | Server component issues SELECT; RLS today blocks anon — see Pitfall 1 |
| Query county coverage counts (live) | Database / Storage | — | Same RLS issue |
| Query stat-strip counts (total profiles, distinct counties) | Database / Storage | — | Same RLS issue; use `count` query (HEAD) for cheapness |
| Open Graph / Twitter social cards | Frontend Server (build-time ImageResponse) | CDN (static cache) | `app/opengraph-image.tsx` runs via `next/og`, statically optimized at build; served from CDN |
| Favicon / app icons / apple-touch-icon | Frontend Server (build-time) or Static | CDN | Prefer static `.ico` + `.png` files in `app/` for determinism; generator script already exists |
| PWA install / service worker / offline shell | Browser / Client (service worker) + Frontend Server (manifest route) | — | Serwist already shipped; Phase 6 only swaps icons + verifies |
| Legacy Netlify `index.html` retirement | External (Netlify dashboard) + Repo (README marker) | — | Not a code path — operational |
| Honor-system framing copy (GEO-03) | Frontend Server (static copy in components) | — | Pure copy; no data |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.2.4` [VERIFIED: package.json + npm view] | App Router, metadata API, file-conventions for OG/icons, server components for parallel data fetch | Already installed and pinned; `app/page.tsx` is the convention for the landing route |
| `next/og` | (bundled with Next 16) [VERIFIED: `node_modules/next/og.d.ts` = `export * from './dist/server/og/image-response'`] | `ImageResponse` for `opengraph-image.tsx`, `twitter-image.tsx`, `icon.tsx`, `apple-icon.tsx` | Canonical Next 16 path for generated social cards and icons |
| `next/font/google` | (bundled with Next 16) [VERIFIED: `app/layout.tsx` lines 2, 10-11] | Lora + Inter wired as `--font-serif` + `--font-sans` via `@theme inline` | Already configured — landing page inherits automatically |
| `@supabase/ssr` | `^0.10.2` [VERIFIED: package.json + STATE.md Plan 01-03] | Server-side Supabase client (`createClient` from `lib/supabase/server.ts`) for authed reads | Already installed; however, see Pitfall 1 for anon-reads gap |
| `@serwist/next` | `^9.5.7` [VERIFIED: package.json; npm publish 2026-03-14] | Service worker + manifest generation | Already wired in `next.config.ts`; Phase 6 does not touch this |
| `tailwindcss` | `^4` [VERIFIED: package.json] | `@theme` tokens, `@import "tailwindcss"`, Lightning CSS | Already configured; palette ported verbatim from `legacy/index.html` |
| `shadcn` CLI | `^4.3.0` [VERIFIED: package.json] | Not invoked in Phase 6 — all required primitives already installed | UI-SPEC §Registry additions required: "No `shadcn add` invocations required for Phase 6" |
| `lucide-react` | `^1.8.0` [VERIFIED: package.json] | Icons (`Sprout`, per UI-SPEC §LandingNav + §Hero) | Already installed; tree-shakeable per-icon imports |
| `sharp` | `^0.34.5` [VERIFIED: package.json devDeps; scripts/generate-icons.cjs] | Build-time icon PNG generation for manifest icons | Already installed + script exists; swap SVG template for branded version |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `posthog-js` | `^1.369.3` [VERIFIED: package.json] | Client-side event capture for `landing_view`, `landing_*_cta_click` | Use from a thin `'use client'` wrapper; PostHog provider already in `app/providers.tsx` |
| `posthog-node` | `^5.29.2` [VERIFIED: package.json] | Server-side event capture for `landing_founding_strip_error`, `landing_county_coverage_error`, `landing_stat_strip_error` (per UI-SPEC §PostHog Events) | Fire from catch blocks inside the server component's parallel queries; wrap in try/catch so PostHog failure cannot crash the landing page |
| `@vercel/analytics` | `^2.0.1` [VERIFIED: package.json] | Page views (already wired in `app/layout.tsx` line 3) | No changes needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `app/opengraph-image.tsx` generated at build | Static `public/og.png` + `metadata.openGraph.images: '/og.png'` | Static PNG is faster to diff/review, deterministic, and cacheable at CDN without cold-start. Generated approach lets you template-drive updates. UI-SPEC §Meta says `og.png` exists at `/og.png` — if the human/designer ships a hand-made PNG, use static. If we want code-driven OG, use `app/opengraph-image.tsx`. **Recommendation:** start static (`public/og.png`) for determinism; upgrade to generated if brand refresh becomes frequent. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image] |
| `app/icon.tsx` generated via `ImageResponse` | Existing `app/favicon.ico` + static `public/icons/icon-*.png` | We already have `app/favicon.ico` (Phase 1) and `public/icons/icon-{192,512,maskable}.png` wired into `manifest.ts`. Prefer static files for determinism and for the maskable variant (ImageResponse SVG does not trivially produce the 15% safe-zone padding UI-SPEC requires). Keep the `scripts/generate-icons.cjs` approach. |
| Client-component landing with `useEffect` + `createBrowserClient` | Server-component landing with `Promise.all` inside RSC | Server component is the locked decision in UI-SPEC §Page structure. Server render removes FOUC, makes data visible to social crawlers, and avoids a Supabase-anon-key round-trip from every client. |
| Querying `profiles` directly from anon client | Service-role-backed data helper | See Pitfall 1. If we go service-role, the query MUST select only the public fields the UI needs (never email) and MUST live in a file with `import 'server-only'` line 1. |
| New `shadcn add` primitives (marketing blocks, hero) | Compose from existing `button`, `card`, `avatar`, `badge` | UI-SPEC §Registry additions required locks this: no new primitives. Reason: avoid palette drift and keep the component surface stable across Phase 6 → 7 → launch. |
| `next-pwa` | `@serwist/next` | `next-pwa` is unmaintained (2+ years). `@serwist/next` is already shipped and Next 16-compatible. Never revisit. |
| Custom `beforeinstallprompt` handler | Browser default install banner | UI-SPEC §PWA install prompt polish item 4: "No custom install prompt UI — we rely on Chrome's built-in banner." Revisit in v1.1 only if install-rate data says so. |

**Installation:**

No new packages required for Phase 6. Confirm with:

```bash
pnpm list next @serwist/next sharp lucide-react posthog-js posthog-node
```

**Version verification** (run at planning time):

```bash
pnpm view next version          # expect ^16.2.x
pnpm view @serwist/next version # expect ^9.5.x
pnpm view sharp version         # expect ^0.34.x
```

All three were current as of 2026-03-14 (Serwist ecosystem last published) and 2026-04 (Next 16.2.4 released Apr 1 2026 per CLAUDE.md stack notes). No mandatory bumps for Phase 6.

## Architecture Patterns

### System Architecture Diagram

```
                  ┌───────────────────────────────────────────┐
                  │ Public visitor (no auth cookie)           │
                  │ or authed viewer (may have session)       │
                  └──────────────────┬────────────────────────┘
                                     │ GET /
                                     ▼
          ┌──────────────────────────────────────────────────┐
          │ middleware.ts (updateSession)                    │
          │ - runs getClaims() for session refresh           │
          │ - matcher EXCLUDES static assets + webhooks      │
          │ - "/" is NOT in AUTH_GROUP_PATHS or              │
          │   VERIFIED_REQUIRED_PREFIXES → no redirect       │
          │ - passes through to the route handler            │
          └──────────────────┬───────────────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────────────────┐
          │ app/layout.tsx (RootLayout)                       │
          │ - PostHogProvider + Vercel Analytics              │
          │ - Footer (server component, uses getClaims)       │
          │ - viewport { themeColor: #2d5a27 }                │
          └──────────────────┬────────────────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────────────────┐
          │ app/page.tsx (NEW, server component)              │
          │ - generateMetadata (static or function)           │
          │ - Promise.all:                                    │
          │     getFoundingMembers()                          │
          │     getCountyCoverage()                           │
          │     getStatCounts()                               │
          │ - Renders: LandingNav, Hero, HowItWorks,          │
          │   FoundingMemberStrip, CountyCoverage,            │
          │   SecondaryCTA (Footer comes from root layout)    │
          └──────────────────┬────────────────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────────────────┐
          │ Data helpers (lib/data/landing.ts — NEW)          │
          │ - ALL three read-paths for the public landing    │
          │ - Each helper:                                    │
          │     1. try { query via public client / admin }    │
          │     2. catch { posthog-node capture +             │
          │        return empty array / fallback counts }     │
          │ - import 'server-only' at line 1                  │
          └──────────────────┬────────────────────────────────┘
                             │ read
                             ▼
          ┌──────────────────────────────────────────────────┐
          │ Supabase Postgres (RLS-governed)                  │
          │ - profiles  (published + verified + not banned)   │
          │ - counties                                        │
          │ - categories (only needed if strip shows them)    │
          │ *** RLS today = `to authenticated` only ***       │
          │ *** Anon query will return zero rows ***          │
          │ *** → See Pitfall 1 for resolution ***            │
          └───────────────────────────────────────────────────┘

Orthogonal flows:
  /manifest.webmanifest     ← app/manifest.ts (Phase 1, no change)
  /sw.js                    ← Serwist (Phase 1, no change)
  /opengraph-image          ← app/opengraph-image.tsx OR public/og.png (NEW)
  /twitter-image            ← inherits OG or own file (NEW)
  /icon.png                 ← existing app/favicon.ico (Phase 1, keep)
                              + new public/apple-touch-icon.png or app/apple-icon.png (NEW)
```

### Recommended Project Structure

```
app/
├── page.tsx                    # NEW — rewrite: server component, Promise.all 3 queries
├── opengraph-image.tsx         # NEW (OR public/og.png + metadata.openGraph.images)
├── twitter-image.tsx           # NEW (OR inherit from opengraph-image via metadata)
├── apple-icon.png              # NEW — 180×180, sage-bg + forest sprout
├── favicon.ico                 # existing (Phase 1)
├── icon.tsx                    # OPTIONAL — dynamic favicon if we stop using favicon.ico
├── layout.tsx                  # existing (adds metadataBase, no structural change)
├── manifest.ts                 # existing (no change — theme-color/bg-color already correct)
└── sw.ts                       # existing (no change)

components/
└── landing/                    # NEW directory per UI-SPEC §Page structure
    ├── LandingNav.tsx
    ├── Hero.tsx
    ├── HowItWorks.tsx
    ├── FoundingMemberStrip.tsx
    ├── FoundingMemberCard.tsx
    ├── CountyCoverage.tsx
    └── SecondaryCTA.tsx

lib/
└── data/
    └── landing.ts              # NEW — getFoundingMembers, getCountyCoverage, getStatCounts
                                # (mirrors lib/data/directory.ts shape; "import 'server-only'")

public/
├── og.png                      # OPTIONAL — static 1200x630 social card (alternative to app/opengraph-image.tsx)
├── apple-touch-icon.png        # OPTIONAL — iOS home-screen icon (alt to app/apple-icon.png)
└── icons/
    ├── icon-192.png            # existing — REPLACE with branded
    ├── icon-512.png            # existing — REPLACE with branded
    └── icon-maskable.png       # existing — REPLACE with branded (15% safe zone)

scripts/
└── generate-icons.cjs          # existing — update SVG template for branded sprout/leaf

legacy/
├── index.html                  # existing — preserve
└── README.md                   # NEW — mark as historical reference; not deployed

tests/
├── e2e/
│   └── landing-smoke.spec.ts   # NEW — replace tests/e2e/smoke.spec.ts (expects "Barterkin foundation" card which is gone)
└── unit/
    └── landing-data.test.ts    # NEW — optional, mock Supabase and assert fallback behavior
```

### Pattern 1: Server component with parallel data fetching

**What:** One server component. Three queries in parallel via `Promise.all`. Each query wrapped in try/catch so one failure can't crash the others.

**When to use:** Whenever a server component needs multiple independent reads. Matches the UI-SPEC §Page structure instruction: "performs the three queries (founders, counties, stats) in parallel via `Promise.all`."

**Example:**

```typescript
// Source: lib/data/directory.ts line 56-59 (existing pattern in codebase)
// and Next.js 16 App Router convention
// app/page.tsx
import type { Metadata } from 'next'
import { getFoundingMembers, getCountyCoverage, getStatCounts } from '@/lib/data/landing'
import { Hero } from '@/components/landing/Hero'
// ... other components

export const metadata: Metadata = {
  title: "Barterkin — Georgia's community skills exchange",
  description: "Find Georgians with skills to trade. Swap a haircut for sourdough, plumbing for produce, tutoring for tailoring — no money, just neighbors.",
  openGraph: {
    title: "Barterkin — Georgia's community skills exchange",
    description: "Find Georgians with skills to trade...",
    url: 'https://barterkin.com/',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
    // images inferred from app/opengraph-image.tsx or set explicitly here
  },
  twitter: {
    card: 'summary_large_image',
    title: "Barterkin — Georgia's community skills exchange",
    description: "Find Georgians with skills to trade...",
  },
  alternates: { canonical: 'https://barterkin.com/' },
}

export default async function LandingPage() {
  const [founders, counties, stats] = await Promise.all([
    getFoundingMembers(),
    getCountyCoverage(),
    getStatCounts(),
  ])

  return (
    <main>
      <LandingNav />
      <Hero stats={stats} />
      <HowItWorks />
      <FoundingMemberStrip profiles={founders} />
      <CountyCoverage counties={counties} />
      <SecondaryCTA />
      {/* Footer comes from root layout */}
    </main>
  )
}
```

### Pattern 2: Generated social card via `next/og`

**What:** `app/opengraph-image.tsx` exports a default async function returning `new ImageResponse(...)`. Next.js statically optimizes this at build unless it reads runtime data.

**When to use:** When we want code-driven OG images (easy to A/B, easy to re-render on brand updates). UI-SPEC §Meta describes an OG image with forest gradient + Lora wordmark.

**Example:**

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = "Barterkin — Georgia's community skills exchange"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: 'linear-gradient(180deg, #1e4420 0%, #2d5a27 50%, #3a7032 100%)',
          color: '#eef3e8',
          fontFamily: 'serif', // Lora fallback; load Lora bytes via readFile for true fidelity
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: '-2px' }}>
          Barterkin
        </div>
        <div style={{ fontSize: 32, marginTop: 16, opacity: 0.8 }}>
          Georgia's community skills exchange
        </div>
      </div>
    ),
    { ...size }
  )
}
```

**Font-fidelity note:** `ImageResponse` does NOT have access to `next/font/google` at runtime. To get true Lora, bundle the `.ttf` in `public/` or `assets/` and load via `readFile(join(process.cwd(), 'assets/Lora-Bold.ttf'))`, then pass as `fonts: [{ name: 'Lora', data, style: 'normal', weight: 700 }]`. See example in Next 16 docs. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image, lastUpdated 2026-04-15]

### Pattern 3: Static OG image (simpler alternative)

**What:** Put `og.png` in `/public/`, reference via `metadata.openGraph.images`. Serve from CDN; no build-time generation.

**When to use:** When the OG image is hand-designed (Figma export) and won't change often. Given UI-SPEC's detailed content brief, this is our likely default — have the human/designer produce `public/og.png` once and commit it.

**Example:**

```typescript
// Source: Next.js 16 metadata API + metadataBase pattern
// app/layout.tsx (update metadataBase)
export const metadata: Metadata = {
  metadataBase: new URL('https://barterkin.com'),
  // ... rest unchanged
}

// app/page.tsx (landing-specific openGraph.images)
export const metadata: Metadata = {
  openGraph: {
    // ... other fields
    images: [{ url: '/og.png', width: 1200, height: 630, alt: "Barterkin — Georgia's community skills exchange" }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og.png'],
  },
}
```

### Pattern 4: Branded apple-touch-icon

**What:** Place `app/apple-icon.png` (180×180) OR `public/apple-touch-icon.png`. iOS Safari "Add to Home Screen" reads this, not the manifest icons. [CITED: UI-SPEC §PWA install prompt polish item 3]

**When to use:** Always for PWA + iOS Safari. `app/apple-icon.png` is the Next-native convention; Next auto-emits the `<link rel="apple-touch-icon">` tag.

**Example:**

```
# 1. Update scripts/generate-icons.cjs to also emit 180x180 + branded sprout/leaf SVG
# 2. Run:
node scripts/generate-icons.cjs
# 3. Commit app/apple-icon.png (Next will serve it)
```

### Pattern 5: PostHog fail-soft on server

**What:** Server-component queries wrap each call in try/catch. On error, fire `posthog-node` event and return fallback empty state.

**When to use:** Every user-facing public page. Database blips should degrade to empty state, not 500.

**Example:**

```typescript
// Source: lib/data/landing.ts (NEW)
// Pattern mirrors lib/data/directory.ts's error.null return shape
import 'server-only'
import { PostHog } from 'posthog-node'

const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    })
  : null

export async function getFoundingMembers() {
  try {
    // ... query — see Pitfall 1 for which client to use
    return { profiles, error: null }
  } catch (e) {
    posthog?.capture({
      distinctId: 'landing_server',
      event: 'landing_founding_strip_error',
      properties: { error: String(e) },
    })
    await posthog?.shutdown()
    return { profiles: [], error: String(e) }
  }
}
```

### Anti-Patterns to Avoid

- **Querying `profiles` from a Client Component via `createBrowserClient`** — defeats SSR, leaks the anon key to every visitor, and fails RLS anyway. UI-SPEC explicitly locks server-component-only.
- **Using `getSession()` in the Footer or any server path** — CLAUDE.md bans this. `Footer.tsx` already uses `getClaims()`; don't regress.
- **Hardcoding font bytes in `ImageResponse`** without the `readFile` pattern — satori-backed `ImageResponse` does not pick up `next/font/google`. Use `assets/Lora-Bold.ttf` + `readFile`.
- **Setting `metadata.themeColor` in Next 16** — deprecated since 14. Use `viewport.themeColor` (already correct in `app/layout.tsx`).
- **Embedding a `<form method="POST" action="/signup">`** — UI-SPEC explicitly says "link to `/signup`, don't embed it."
- **Wiring a `beforeinstallprompt` listener** — UI-SPEC §PWA install prompt polish item 4 forbids for v1.
- **Adding `<AppNav />` to the landing page** — `LandingNav` is a distinct component. AppNav queries authed-user data the landing page doesn't need.
- **Not handling zero-founder / zero-county states** — UI-SPEC §Founding-member strip — empty state and §County coverage — empty state lock the fallback copy.
- **Shipping `public/og.png` as a placeholder** — social card is high-signal SEO; either ship the real one or leave the `openGraph.images` field off (Next will omit the meta tag rather than link to a missing file).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Open Graph meta tag generation | Manually writing `<meta property="og:title">` tags in `app/head.tsx` | Next.js `metadata` export + `openGraph` field | Next 16 handles merging, inheritance, and metadataBase composition. Manual tags bypass the framework's bot-detection for HTML-limited crawlers. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata] |
| Social card image (1200x630 PNG) | Hand-exporting a PNG from Figma every time brand changes | `app/opengraph-image.tsx` with `ImageResponse` (if frequent) OR static `public/og.png` (if stable) | Two good answers — pick one and commit. Avoid the middle ground of "static file that's out of date" |
| Favicon generation | Rolling individual `.ico` / `.png` files by hand | Next 16 file conventions (`app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`) + `scripts/generate-icons.cjs` | Already scaffolded — just replace the `B` SVG with a branded mark |
| Maskable icon safe-zone math | Computing 15% padding on a fresh PNG every time | `scripts/generate-icons.cjs` — pass `maskable = true` | Existing script already does this (Phase 1 Plan 01-04) |
| PWA install prompt UI | Listening for `beforeinstallprompt` and rendering a custom button | Browser default install banner | UI-SPEC explicitly excludes v1; revisit only if install rate is low |
| Service worker + offline page | Hand-writing a `sw.js` with fetch handlers | Serwist `@serwist/next` + `fallbacks.entries` | Already shipped (Phase 1 Plan 01-04) |
| Responsive breakpoints | CSS `@media` queries or JS viewport detection | Tailwind v4 responsive prefixes (`sm:`, `md:`, `lg:`) + `text-4xl sm:text-5xl md:text-6xl` fluid scale | UI-SPEC §Typography already specifies this approach |
| County / category name lookups | Joining `counties` and `categories` twice (once for card, once for chip) | Supabase Postgres inner-join via `counties!inner(name), categories!inner(name)` — same pattern as `lib/data/directory.ts` | Existing pattern; do not duplicate |
| Social preview validation | Manually opening Facebook Sharing Debugger / Twitter Validator on every change | Keep a human-UAT step in the phase plan that confirms via Facebook Debugger + `twittercard-validator` + iMessage send-to-self | No automated tool replaces this |

**Key insight:** Every item the landing page needs already exists somewhere in the codebase or in Next 16's file conventions. This is a composition phase, not a "build new primitives" phase.

## Runtime State Inventory

> This is a forward-only phase (new surfaces) but there is one rename/retirement: the legacy `legacy/index.html` site on Netlify gets retired. Runtime-state audit below.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no database key references "legacy" or "netlify". The `profiles`, `counties`, `contact_requests` tables carry no ties to the old HTML. Confirmed via `Grep -rn 'legacy\|netlify'` in `supabase/migrations/`. | None |
| Live service config | **Netlify deploy** — the `legacy/index.html` file is deployed to a Netlify site with whatever build settings are configured in the Netlify dashboard. Those settings live in Netlify's UI, not in git. | Manual: pause/suspend the Netlify site in the dashboard AFTER parity-UAT passes. No code change. |
| OS-registered state | None — no launchd / systemd / Task Scheduler / cron entries reference the legacy site or the Vercel deployment from within the repo. | None |
| Secrets and env vars | `.env.local.example` does not reference any Netlify secrets. `NEXT_PUBLIC_*` env vars on Vercel are scoped to the new app. | None |
| Build artifacts / installed packages | `public/sw.js` + `public/swe-worker-*.js` are build outputs of Serwist — already in `.gitignore` per STATE.md Plan 01-04. Landing page will trigger a rebuild; Serwist output will refresh automatically. Old placeholder icons in `public/icons/*.png` will be **replaced in-place** by `scripts/generate-icons.cjs` — not renamed, so no stale references. | Regenerate icons via `node scripts/generate-icons.cjs`; commit updated PNGs. |

**DNS** — not a rename, but worth noting: root `barterkin.com` CNAME already points to Vercel (STATE.md 2026-04-20). Netlify site lives at its Netlify-owned subdomain, so retiring it does NOT cause a domain gap for customers.

**The canonical question** (after all repo files update): Nothing live breaks. Netlify keeps serving the legacy HTML at its own subdomain until a human flips the switch in the dashboard. The repo just needs a `legacy/README.md` marker so future-Ashley knows why `legacy/index.html` is still there.

## Common Pitfalls

### Pitfall 1: Anon RLS blocks the three landing queries [CRITICAL]

**What goes wrong:** The landing page is public (no auth cookie required). When the RSC calls `createClient()` (server helper in `lib/supabase/server.ts`) and the visitor is not authed, Supabase executes queries under the Postgres `anon` role. Current RLS for `profiles`, `counties`, and `categories` is `for select to authenticated using (...)` — the `anon` role has NO select privilege. The three `Promise.all` queries return empty arrays (or error) for every anonymous visitor.

**Why it happens:** Phases 1–5 only built authed surfaces. There was no incentive to grant anon read access. Migration `003_profile_tables.sql` lines 19–20 (counties), 196–197 (categories), 291–297 (profiles) all restrict to `authenticated`. [VERIFIED: grep of `supabase/migrations/003_profile_tables.sql`]

**How to avoid:** Pick one of three approaches in Wave 0 before writing any component:

1. **New RLS policy for public visibility** — add a migration `008_landing_public_reads.sql` that grants `for select to anon` on:
   - `counties` (read-all; it's a reference table of public Georgia county names)
   - `categories` (read-all; it's a reference table of the 10 taxonomy names)
   - `profiles` with the existing predicate `is_published = true AND banned = false AND email_confirmed = true` — but **only the public fields** via a VIEW or via explicit SELECT column list in the client. This is the cleanest approach and matches how other public directories expose seeded content.
2. **Service-role helper** — `lib/data/landing.ts` uses `supabaseAdmin` from `lib/supabase/admin.ts`. Only selects public fields. Wraps SELECT in a function that filters to `is_published AND NOT banned AND email_confirmed`. Simpler migration-wise, but means the service-role key is in use on every anon pageview (today only Edge Functions use it).
3. **Supabase Anonymous Sign-Ins** — `supabase.auth.signInAnonymously()` creates an anon user with an `is_anonymous` JWT claim. RLS policies gain an `is_anonymous = true` branch. Over-engineered for a marketing page; introduces state where statelessness works.

**Recommendation:** **Approach 1** (new RLS policy). Benefits: (a) keeps service-role out of hot path, (b) explicit contract in SQL, (c) matches how `contact_eligibility` Phase 5 extended RLS for public-facing data needs. Add the migration as the first task of Phase 6.

**Warning signs:** Landing page renders `Be a founding member.` empty state in production even though `/directory` shows populated profiles — that's the anon-RLS mismatch, not a data seed gap.

### Pitfall 2: Missing `metadataBase` in production OG tags

**What goes wrong:** `metadata.openGraph.images: '/og.png'` resolves to a relative URL. Without `metadataBase`, Next.js emits `<meta property="og:image" content="/og.png">` which is invalid — social crawlers cannot resolve relative paths. Result: preview cards are broken even though the image exists.

**Why it happens:** Easy to miss because local dev sometimes works (crawler follows Host header), but production social-share fetches the image from `https://barterkin.com/og.png` with a resolver that needs a full URL.

**How to avoid:** Set `metadataBase: new URL('https://barterkin.com')` on `app/layout.tsx` (root). Every child metadata field inherits the base. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata — §metadataBase]

**Warning signs:** Facebook Sharing Debugger shows `og:image: /og.png` in raw response; Twitter Card Validator says "Unable to render Card preview."

### Pitfall 3: `opengraph-image` size ≠ metadata.openGraph.images.size

**What goes wrong:** If you ship BOTH `app/opengraph-image.tsx` AND a `metadata.openGraph.images` array pointing to `/og.png`, Next merges — the file-based convention wins per the docs' good-to-know note. If the two disagree (different sizes, different URLs), social crawlers may pick either or error.

**How to avoid:** Pick ONE approach — file convention or metadata field — not both. If we go file-convention, delete any `metadata.openGraph.images` from `page.tsx`. [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image — "File-based metadata has higher priority"]

### Pitfall 4: Lora not rendered in `ImageResponse`

**What goes wrong:** Code uses `fontFamily: 'Lora'` inside `new ImageResponse(...)`. The satori-backed ImageResponse does NOT have access to `next/font/google` (which injects CSS, not raw font bytes at runtime). Result: OG image renders with satori's default font, not Lora.

**How to avoid:** Download Lora `.ttf` bytes, commit to `assets/Lora-Bold.ttf`, then:

```typescript
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const loraBold = await readFile(join(process.cwd(), 'assets/Lora-Bold.ttf'))
return new ImageResponse(<div style={{ fontFamily: 'Lora' }}>...</div>, {
  ...size,
  fonts: [{ name: 'Lora', data: loraBold, style: 'normal', weight: 700 }],
})
```

[CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image — "Font loading, process.cwd() is Next.js project directory"]

### Pitfall 5: `tests/e2e/smoke.spec.ts` expects Phase-1 foundation card

**What goes wrong:** Phase 1's smoke test (`tests/e2e/smoke.spec.ts`) asserts `page.getByText('Barterkin foundation')` and `page.getByRole('button', { name: /fire posthog test_event/i })`. Phase 6 deletes both ("Barterkin foundation" card and `<FireTestEvent />`). Smoke test will fail on first post-Phase-6 `pnpm e2e`.

**How to avoid:** Phase 6 plan MUST include a task "update tests/e2e/smoke.spec.ts to assert the landing hero heading instead of the Phase 1 card." Equivalent assertion: `page.getByRole('heading', { level: 1, name: /trade skills with your georgia neighbors/i })`.

**Warning signs:** CI red on the `smoke` project with "Expected to find text 'Barterkin foundation'."

### Pitfall 6: `tests/e2e/footer-links.spec.ts` covers `/` — confirm Footer still renders

**What goes wrong:** Footer is in root `app/layout.tsx` — should be fine. But if Phase 6 accidentally moves Footer into a different layout (say, an `(app)` group equivalent for marketing), that test breaks.

**How to avoid:** Leave Footer in root layout. UI-SPEC §Page structure already reflects this.

**Warning signs:** Playwright `footer-links.spec.ts` red with "`footer` element not visible."

### Pitfall 7: Playwright config has no mobile project for 360px testing

**What goes wrong:** `playwright.config.ts` line 14 only defines `chromium` (Desktop Chrome). LAND-03 requires 360px viewport coverage. UI-SPEC §Horizontal overflow check says "Verified via Playwright's `mobile` project in existing test infra (Phase 1 wired `devices.iPhoneSE`)" — but **this is not currently wired**; `playwright.config.ts` only has Desktop Chrome. [VERIFIED: `cat playwright.config.ts`]

**How to avoid:** Phase 6 plan MUST include a task "add `devices['iPhone SE']` project to `playwright.config.ts`" as a Wave 0 blocker. Mobile responsive tests need this project to run.

**Warning signs:** LAND-03 verification (no horizontal scroll at 360px) is claimed to pass but the test is actually running at 1280px desktop.

### Pitfall 8: Service worker caches the OLD landing page

**What goes wrong:** Visitors who have visited the Phase-1 scaffold page have `public/sw.js` pre-caching its manifest. After Phase 6 deploy, Serwist bumps the precache revision and invalidates — but only on next visit. A visitor might see the old "Barterkin foundation" card until they hard-refresh.

**How to avoid:** Serwist's `skipWaiting: true` + `clientsClaim: true` in `app/sw.ts` (already set — STATE.md Plan 01-04) handles this: the new SW takes control on first visit after deploy. No manual action required. Include this in the Phase 6 verification runbook: test in Chrome DevTools → Application → Service Workers, verify "Status: activated and is running" after deploy, then refresh.

**Warning signs:** Bug reports of "landing page looks wrong" from users who visited before launch.

### Pitfall 9: Serwist offline shell caches stale content via `defaultCache`

**What goes wrong:** `app/sw.ts` uses `defaultCache` from `@serwist/next/worker`. `defaultCache` includes a NetworkFirst strategy for navigation requests AND image caching. After Phase 6 ships the new landing, offline users on old caches might see stale hero copy until network returns. More critically, if `defaultCache` accidentally caches a Supabase API call (founding-member query response), the offline shell could serve yesterday's founders.

**How to avoid:** Verify (read — do not change) what `defaultCache` includes. If it caches `/api/*` or Supabase URLs (`*.supabase.co`), either (a) add an explicit `denylist` entry, or (b) custom-compose the runtime caching config. UI-SPEC §PWA install prompt polish item 5 says "service worker caches shell, not Supabase API calls" — verify this is actually true before signing off.

**Warning signs:** A member who updates their profile still sees their old profile reflected in the landing strip when offline.

### Pitfall 10: `legacy/index.html` contains teal (`#2a9d8f`) — tempting to port

**What goes wrong:** An executor reading `legacy/index.html` sees the teal accent used for hero CTA and thinks "match it." UI-SPEC §Color deliberately excludes teal and substitutes clay. Porting teal would violate the 60/30/10 palette split and reopen a design decision that's already locked.

**How to avoid:** UI-SPEC §Out-of-Spec Guardrails says: "Introduce teal (`#2a9d8f`) or any new hue" requires amending the spec. ENFORCE this — any teal in the diff blocks the PR.

**Warning signs:** Color hex `#2a9d8f` or `#40c4b0` (teal-light) appears in any Phase 6 file.

### Pitfall 11: Next 16 `params` is a Promise

**What goes wrong:** Agents trained on Next ≤ 14 write `export default function Image({ params })` and try `params.slug` directly. In Next 16, `params` is `Promise<{ slug: string }>` and must be `await`ed. Same applies to `opengraph-image.tsx` and `icon.tsx` when they're in a dynamic segment. The landing page is at `/` (no params) so this is only relevant if we ever add per-segment OG images.

**How to avoid:** For landing page (`/`), omit params. For any dynamic segment, always `await params`. [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata — v16 Version History]

### Pitfall 12: Generated Next assets cannot reuse `next/font/google` output

**What goes wrong:** Using `app/icon.tsx` (via `ImageResponse`) assumes the same fonts as the page. They are not shared. `app/icon.tsx` satori instance is separate from the page's Lora/Inter.

**How to avoid:** For icons, use static PNGs (already the Phase 1 approach via `scripts/generate-icons.cjs`) rather than `app/icon.tsx`. Reserve `ImageResponse` for OG image only, and font-load via `readFile` as in Pitfall 4.

## Code Examples

### Example 1: Server helper for founding-member strip

```typescript
// Source: new file lib/data/landing.ts — pattern mirrors lib/data/directory.ts
import 'server-only'
import { createClient } from '@/lib/supabase/server' // OR lib/supabase/admin if Pitfall 1 resolution is "service-role"

export interface LandingFounderCard {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  county_name: string
  category_name: string
  top_skills: string[] // max 3
}

export async function getFoundingMembers(): Promise<{
  profiles: LandingFounderCard[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `id, username, display_name, avatar_url,
         counties!inner(name),
         categories!inner(name),
         skills_offered(skill_text, sort_order)`,
      )
      .eq('founding_member', true)
      .eq('is_published', true)
      .eq('banned', false)
      .order('created_at', { ascending: false })
      .limit(6)
    if (error) throw error
    return {
      profiles: (data ?? []).map((r) => ({
        id: r.id,
        username: r.username ?? '',
        display_name: r.display_name ?? 'Unnamed member',
        avatar_url: r.avatar_url,
        county_name: r.counties?.name ?? 'Unknown',
        category_name: r.categories?.name ?? '',
        top_skills: (r.skills_offered ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .slice(0, 3)
          .map((s) => s.skill_text),
      })),
      error: null,
    }
  } catch (e) {
    // posthog-node capture here (non-blocking)
    return { profiles: [], error: String(e) }
  }
}
```

### Example 2: Stat-strip counts

```typescript
// Source: new file lib/data/landing.ts
export async function getStatCounts(): Promise<{
  totalProfiles: number
  distinctCounties: number
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const [totalResult, countiesResult] = await Promise.all([
      // HEAD + count='exact' → no rows returned, just COUNT(*)
      supabase
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .eq('is_published', true)
        .eq('banned', false),
      // DISTINCT county_id across published profiles — use a database view or RPC for efficiency.
      // For MVP scale (<10k profiles), a plain select + dedupe in JS is acceptable:
      supabase
        .from('profiles')
        .select('county_id')
        .eq('is_published', true)
        .eq('banned', false),
    ])
    if (totalResult.error) throw totalResult.error
    if (countiesResult.error) throw countiesResult.error
    const distinct = new Set(
      (countiesResult.data ?? []).map((r) => r.county_id).filter((x) => x != null),
    ).size
    return {
      totalProfiles: totalResult.count ?? 0,
      distinctCounties: distinct,
      error: null,
    }
  } catch (e) {
    return { totalProfiles: 30, distinctCounties: 2, error: String(e) } // UI-SPEC fallback
  }
}
```

### Example 3: `app/page.tsx` skeleton

```typescript
// Source: UI-SPEC §Page structure + Next.js 16 server-component convention
import type { Metadata } from 'next'
import { getFoundingMembers, getCountyCoverage, getStatCounts } from '@/lib/data/landing'
import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FoundingMemberStrip } from '@/components/landing/FoundingMemberStrip'
import { CountyCoverage } from '@/components/landing/CountyCoverage'
import { SecondaryCTA } from '@/components/landing/SecondaryCTA'

export const metadata: Metadata = {
  title: "Barterkin — Georgia's community skills exchange",
  description: "Find Georgians with skills to trade. Swap a haircut for sourdough, plumbing for produce, tutoring for tailoring — no money, just neighbors.",
  alternates: { canonical: '/' },
  openGraph: {
    title: "Barterkin — Georgia's community skills exchange",
    description: "Find Georgians with skills to trade. Swap a haircut for sourdough, plumbing for produce, tutoring for tailoring — no money, just neighbors.",
    url: '/',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
    // omit images if using app/opengraph-image.tsx (file wins);
    // include if using static public/og.png
  },
  twitter: {
    card: 'summary_large_image',
    title: "Barterkin — Georgia's community skills exchange",
    description: "Find Georgians with skills to trade. Swap a haircut for sourdough, plumbing for produce, tutoring for tailoring — no money, just neighbors.",
  },
  robots: { index: true, follow: true },
}

export default async function LandingPage() {
  const [founders, counties, stats] = await Promise.all([
    getFoundingMembers(),
    getCountyCoverage(),
    getStatCounts(),
  ])
  return (
    <>
      <LandingNav />
      <Hero stats={stats} />
      <HowItWorks />
      <FoundingMemberStrip profiles={founders.profiles} />
      <CountyCoverage counties={counties.counties} />
      <SecondaryCTA />
      {/* Footer comes from root layout */}
    </>
  )
}
```

### Example 4: Skip link in root layout

```tsx
// Source: UI-SPEC §Accessibility Contract — add to app/layout.tsx body
<body className="font-sans bg-sage-bg text-forest-deep min-h-screen antialiased">
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-forest focus:text-sage-bg focus:px-4 focus:py-2 focus:rounded"
  >
    Skip to content
  </a>
  <PostHogProvider>
    {/* add id="main" to the landing <main> (and any other landing-like page) */}
    {children}
    <Footer />
  </PostHogProvider>
  <Analytics />
</body>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-pwa` | `@serwist/next` | Late 2024 | Already done in Phase 1 — don't regress |
| Static `public/og-image.png` + hand-written `<meta>` tags | Next 16 metadata API + `app/opengraph-image.tsx` with `ImageResponse` | Next 13.3 (Mar 2023); API-stable in Next 16 | Now the canonical path; use file-convention OR `metadata.openGraph.images` field, not both |
| `metadata.themeColor` | `viewport.themeColor` | Next 14 | Already done in Phase 1 (`app/layout.tsx` `viewport` export) |
| `metadata.viewport` | `viewport` export | Next 14 | Already done |
| Client-only landing page via `useEffect` + Supabase browser client | Server component with parallel reads via `Promise.all` | Stable since Next 13 | UI-SPEC locks server-component |
| Hand-written service worker | Serwist `defaultCache` + `fallbacks` | Phase 1 decision | No change |
| Custom install prompt | Browser default `beforeinstallprompt` (or no custom UI at all) | Industry convention | UI-SPEC locks no-custom for v1 |

**Deprecated/outdated:**

- `next-pwa` — unmaintained; replaced by Serwist (already done)
- `@supabase/auth-helpers-nextjs` — deprecated; `@supabase/ssr` is the live path (already done; CLAUDE.md enforces)
- `metadata.themeColor` — deprecated in favor of `viewport.themeColor` (already done)
- Imports of `ImageResponse` from `next/server` — moved to `next/og` in Next 13.3

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The anon RLS gap (Pitfall 1) has not already been patched in a later migration. | Pitfall 1 | If already patched, we skip the migration task and the planner has one fewer wave. Low risk — I grep'd the migrations, confirmed `to authenticated`. Verify via `supabase db diff` or a spot-check in Supabase Studio before committing. |
| A2 | The legacy Netlify site is at a Netlify-owned subdomain, not `barterkin.com`. | Runtime State Inventory + Summary | STATE.md 2026-04-20 says root CNAME went to Vercel. If the Netlify site was the primary domain before that, cutover already happened. Verify via `dig barterkin.com CNAME`. |
| A3 | `defaultCache` from `@serwist/next/worker` does not cache Supabase API calls. | Pitfall 9 | If it does cache, offline users might see stale founder data. Mitigation: read the Serwist source or test explicitly before signing off Phase 6. |
| A4 | Lora TTF can be committed to `assets/` for ImageResponse use. | Pitfall 4 + Code Example OG | Google Fonts license is SIL OFL 1.1 (open, redistributable). Confirm before committing the .ttf. Alternative: host on Google's CDN and fetch at build time. |
| A5 | The 6 founding-member limit and `founding_member = true` filter (UI-SPEC §Founding-member strip) are the intended query — not "any 6 published profiles." | Code Example 1 + UI-SPEC trace | If seeding hasn't reached 6 founding members by launch, strip shows empty-state. UI-SPEC already accounts for this. |
| A6 | Static `public/og.png` will be produced by a human designer (or via `app/opengraph-image.tsx` at plan time) — not left as a placeholder. | Don't Hand-Roll table + Pattern 3 | If plan ships without the OG image, social previews will be broken at launch. Plan should include explicit "produce + commit og.png" or "implement app/opengraph-image.tsx" as a task. |
| A7 | `viewport.themeColor` is already `#2d5a27` (forest) in `app/layout.tsx`. | Standard Stack + UI-SPEC trace | Verified via Read — correct. |
| A8 | `app/manifest.ts` already has `theme_color: '#2d5a27'` and `background_color: '#eef3e8'`. | PWA section | Verified via Read — correct. |
| A9 | The Footer component already queries Supabase via `getClaims()` and handles anon gracefully (shows "Sign in" link when `!isAuthed`). | Project structure | Verified via Read of `components/layout/Footer.tsx` — correct. |

## Open Questions

1. **Do we grant anon RLS, or do we use service-role?**
   - What we know: Both approaches work technically. Approach 1 (RLS) is more explicit and more secure; Approach 2 (service-role) is faster to implement.
   - What's unclear: Whether the team prefers to keep service-role key usage restricted to Edge Functions only (current stance per `lib/supabase/admin.ts` comment).
   - Recommendation: **Go with Approach 1** (new RLS policy). Add migration `008_landing_public_reads.sql`. Treat as Wave 0 blocker. Ping the human at plan-check time if service-role is preferred instead.

2. **OG image: generated (`app/opengraph-image.tsx`) or static (`public/og.png`)?**
   - What we know: Both work; generated is code-driven, static is designer-driven.
   - What's unclear: Does a designer-produced PNG exist yet? UI-SPEC §Meta provides a content brief but not the asset.
   - Recommendation: Start with `app/opengraph-image.tsx` + bundled Lora TTF for determinism. If a designer ships a handcrafted `og.png`, switch to static at plan time.

3. **Where does `apple-icon.png` live — `app/apple-icon.png` or `public/apple-touch-icon.png`?**
   - What we know: Both patterns work. `app/apple-icon.png` is the Next-native convention; Next auto-emits the `<link>` tag. Static `public/apple-touch-icon.png` requires manual `metadata.icons.apple: '/apple-touch-icon.png'`.
   - What's unclear: Convention preference.
   - Recommendation: Use `app/apple-icon.png` (let the framework do it). Update `scripts/generate-icons.cjs` to emit `app/apple-icon.png` at 180×180.

4. **Should the founding-member strip query include non-founding members when `founding_member = true` count is < 3?**
   - What we know: UI-SPEC §Founding-member strip empty state handles `COUNT(founding_member=true) = 0`. It does NOT specify behavior for 1 or 2 founders — would the strip render 1 card and the empty-state fills the rest?
   - What's unclear: Ambiguous. The literal reading says "render the empty state if zero, render up to 6 cards if ≥1."
   - Recommendation: Render actual cards when `founders.length > 0` (even if just 1 or 2) without padding. Only fall through to empty-state when literally zero. Note this decision in the plan and flag for UI-SPEC amendment if the design team disagrees.

5. **Is the `GET /` route supposed to skip the middleware's auth redirect even when the user is authed?**
   - What we know: UI-SPEC §Page-level CTA ordering rule says "For authenticated viewers (rare — authed users go directly to `/directory`), swap both primary CTAs to `Go to your dashboard` linking to `/profile`." That implies `/` is still served to authed users (not redirected).
   - What's unclear: `middleware.ts` AUTH_GROUP_PATHS is `/login` + `/signup`. `/` is not in it. So authed users will see the landing page. UI-SPEC wants a CTA swap — does it also want an optional redirect to `/directory`? Not spec'd.
   - Recommendation: Keep `/` accessible to authed users (no redirect). Implement the CTA-swap by checking `getClaims()` in the server component. Log `landing_view` with `is_authed` property (already in UI-SPEC events list).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + runtime | ✓ | v22.14.0 (dev) / v20 LTS (prod per package.json engines) | — |
| pnpm | Package install | ✓ | v10.33.0 (dev) / v10+ required | — |
| Next.js 16.2 | Framework | ✓ | 16.2.4 | — |
| @serwist/next | PWA | ✓ | 9.5.7 | — |
| sharp | Icon generation | ✓ | 0.34.5 | — |
| Supabase Postgres (prod) | Founder/county/stat queries | ✓ | Cloud (managed) | Empty-state fallback copy in UI-SPEC |
| Facebook Sharing Debugger | Human UAT of OG card | ✓ (web-based, free) | — | — |
| Twitter Card Validator | Human UAT of Twitter card | ✓ (web-based, free) | — | — |
| Chrome DevTools Lighthouse | PWA install verification | ✓ (bundled in Chrome) | — | Edge DevTools equivalent |
| Playwright iPhone SE device emulation | LAND-03 360px verification | ✓ (bundled in Playwright `devices`) | — | Manual resize in Chrome DevTools |
| Netlify dashboard access | Legacy `index.html` suspension | Assumed ✓ (Ashley owns the account) | — | If lost, legacy site keeps running until credentials recovered — not a blocker |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- `assets/Lora-Bold.ttf` — not yet committed. Must be downloaded and committed in Phase 6 if OG image is generated via ImageResponse. If missing, fallback to satori default font (ugly — avoid).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (unit) + Playwright 1.59.1 (E2E) |
| Config file | `vitest.config.ts` (unit) + `playwright.config.ts` (E2E) |
| Quick run command | `pnpm test` (unit, <5s on landing scope) |
| Full suite command | `pnpm test && pnpm build && pnpm e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | Landing page at `/` renders sage/forest/clay + Lora/Inter | E2E visual | `pnpm e2e -- landing-visual.spec.ts` | ❌ Wave 0 |
| LAND-01 | Replaces existing `/` scaffold card | E2E | `pnpm e2e -- landing-smoke.spec.ts` | ❌ Wave 0 (REPLACES `smoke.spec.ts`) |
| LAND-02 | Hero section with H1 "Trade skills with your Georgia neighbors." | E2E | `pnpm e2e -- landing-smoke.spec.ts` | ❌ Wave 0 |
| LAND-02 | How-it-works 3-step grid | E2E | same | ❌ Wave 0 |
| LAND-02 | Founding-member strip renders ≤6 cards OR empty state | E2E + unit (fallback logic) | `pnpm e2e -- landing-founding-strip.spec.ts` + `pnpm test -- landing-data.test.ts` | ❌ Wave 0 |
| LAND-02 | County coverage pill grid renders | E2E | same | ❌ Wave 0 |
| LAND-02 | SecondaryCTA strip + link to `/signup` | E2E | same | ❌ Wave 0 |
| LAND-02 | Footer legal links present | E2E (existing) | `pnpm e2e -- footer-links.spec.ts` | ✅ EXISTING — passes |
| LAND-03 | 360px viewport renders without horizontal scroll | E2E (mobile project) | `pnpm e2e --project=iphone-se -- landing-mobile.spec.ts` | ❌ Wave 0 — **REQUIRES new Playwright project** |
| LAND-03 | Tap targets ≥44px | E2E | `pnpm e2e -- landing-a11y.spec.ts` | ❌ Wave 0 |
| LAND-04 | `og:title`, `og:description`, `og:image` meta tags rendered | E2E HEAD check | `pnpm e2e -- landing-metadata.spec.ts` | ❌ Wave 0 |
| LAND-04 | `twitter:card` = `summary_large_image` | E2E HEAD check | same | ❌ Wave 0 |
| LAND-04 | `/manifest.webmanifest` returns 200 + valid JSON | E2E HEAD check | same | ❌ Wave 0 |
| LAND-04 | `/opengraph-image` OR `/og.png` returns 200 | E2E HEAD check | same | ❌ Wave 0 |
| LAND-04 | Preview card renders on social | Human UAT — Facebook Debugger + Twitter Validator + iMessage | Manual | N/A |
| GEO-03 | Honor-system copy present in hero + county section | E2E text-search | `pnpm e2e -- landing-smoke.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test` (unit tests only — fast)
- **Per wave merge:** `pnpm test && pnpm build && pnpm e2e` (full suite — Playwright needs `pnpm start` webserver)
- **Phase gate:** Full suite green + human UAT (Facebook Debugger + Chrome DevTools Lighthouse PWA score + 360px physical device or iPhone SE Playwright project)

### Wave 0 Gaps

- [ ] `tests/e2e/landing-smoke.spec.ts` — replaces `tests/e2e/smoke.spec.ts` (which asserts Phase-1 card)
- [ ] `tests/e2e/landing-metadata.spec.ts` — OG + Twitter + manifest assertions
- [ ] `tests/e2e/landing-founding-strip.spec.ts` — empty vs. populated branches
- [ ] `tests/e2e/landing-mobile.spec.ts` — 360px render + tap target sizing
- [ ] `tests/e2e/landing-a11y.spec.ts` — skip link, contrast, keyboard tab order (OPTIONAL but recommended)
- [ ] `playwright.config.ts` — add `devices['iPhone SE']` project (`{ name: 'iphone-se', use: { ...devices['iPhone SE'] } }`)
- [ ] `tests/unit/landing-data.test.ts` — mock Supabase + assert fallback empty arrays on error (OPTIONAL)
- [ ] Update `tests/e2e/smoke.spec.ts` — either retire or retarget to landing hero

*(UPDATE: `tests/e2e/footer-links.spec.ts` already covers `/` — continues to pass without modification. `tests/e2e/smoke.spec.ts` MUST be updated or retired.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | partial | Landing is public; no auth on `/`. Handled by middleware for authed-subsurface. |
| V3 Session Management | no | No session created on landing page view. Vercel Analytics + PostHog client-side only. |
| V4 Access Control | **yes** | RLS policies on `profiles`, `counties`, `categories` control what data the anon reader can see. **This is the Pitfall 1 crux** — the new `008_landing_public_reads.sql` migration MUST explicitly enumerate visible columns (never `email`, `owner_id`, `accepting_contact`, `banned`). |
| V5 Input Validation | no | Landing has no user input forms. All CTAs are navigation links. |
| V6 Cryptography | no | No handling of sensitive data on landing. |
| V7 Error Handling | **yes** | Error states must not leak internal details (stack traces). UI-SPEC §Error state locks graceful fallback copy. |
| V8 Data Protection | **yes** | Public query MUST select only the fields the strip + coverage actually render. Never select `email`, `owner_id`, or secure fields. Enforce via explicit `.select('id, username, display_name, ...')` column list — not `.select('*')`. |
| V9 Communication | yes | HTTPS enforced by Vercel. Manifest + SW must be served over HTTPS (already enforced). |
| V10 Malicious Code | no | No dynamic code execution. |
| V14 Configuration | yes | `metadataBase` must be `https://barterkin.com` not a preview URL. Set `NEXT_PUBLIC_SITE_URL` env var and use it in `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com')` for preview-deploy correctness. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Scraping founding-member names/counties from OG-indexed crawlers | Information disclosure | Acceptable — these are PUBLIC (published + email-verified + not-banned) profiles. The exact same data is indexed in the authed `/directory` page for all signed-in members. No additional mitigation needed. DO NOT select email. |
| XSS via unescaped profile display_name in founding strip | Tampering | React automatically escapes string children — always render profile strings as children (e.g. `<h2>{profile.display_name}</h2>`), not via unsafe innerHTML-setting props. Existing `DirectoryCard` follows this rule — `FoundingMemberCard` must mirror it. |
| Clickjacking via iframe of landing page | Tampering | Next 16 default `x-frame-options: SAMEORIGIN` + Vercel default CSP. Not required to custom-set. |
| SQL injection via search params | Tampering | Landing has no search params consumed by Supabase queries. N/A. |
| Rate-limited abuse of founder/county queries | DoS | Supabase free-tier has connection pool limits. Vercel edge cache (default for static-marking pages) absorbs most traffic. If landing becomes a DDoS target: add `revalidate = 60` or full SSG. |
| OG image / icon URL pointing to attacker-controlled host | Tampering | All image URLs are same-origin (`metadataBase` + relative paths). |
| Stale service worker serving old landing after deploy | Availability / Integrity | Serwist `skipWaiting` + `clientsClaim` already set; see Pitfall 8. |
| Leaking `SUPABASE_SERVICE_ROLE_KEY` if Pitfall 1 is resolved via service-role | Elevation of privilege | `lib/supabase/admin.ts` line 1 is `import 'server-only'`. Any file importing from `lib/data/landing.ts` must stay server-side. Never invoke the data helpers from a Client Component. |

## Sources

### Primary (HIGH confidence)

- [VERIFIED: package.json + pnpm view] — `next@16.2.4`, `@serwist/next@9.5.7`, `sharp@0.34.5`, `lucide-react@1.8.0`, `posthog-js@1.369.3`, `posthog-node@5.29.2`
- [VERIFIED: `app/globals.css` inspection] — `--color-sage-bg`, `--color-forest`, `--color-clay`, `--color-primary: var(--color-clay)`, `--color-ring: var(--color-clay)` wired
- [VERIFIED: `app/layout.tsx` inspection] — `viewport.themeColor: '#2d5a27'`, Lora + Inter via `next/font/google`
- [VERIFIED: `app/manifest.ts` inspection] — sage-bg background + forest theme-color + 3 icons in `public/icons/`
- [VERIFIED: `app/sw.ts` inspection] — Serwist configured with `defaultCache` + `/~offline` fallback
- [VERIFIED: `lib/supabase/server.ts` + `lib/supabase/admin.ts` inspection] — three-client factory, admin has `'server-only'` line 1
- [VERIFIED: `supabase/migrations/003_profile_tables.sql` lines 19, 196, 291-296] — RLS `for select to authenticated` on counties, categories, profiles (Pitfall 1 source)
- [VERIFIED: `supabase/migrations/003_profile_tables.sql` line 233] — `founding_member boolean not null default false` column exists
- [VERIFIED: `components/layout/Footer.tsx` inspection] — already in root layout, uses `getClaims()` (anon-safe)
- [VERIFIED: `components/directory/DirectoryCard.tsx` inspection] — `FoundingMemberCard` should mirror this pattern (UI-SPEC explicit)
- [CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata, lastUpdated 2026-04-15 per WebFetch] — metadata object, generateMetadata, metadataBase, openGraph, twitter, icons, viewport (deprecated), appleWebApp, alternates
- [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image, lastUpdated 2026-04-15] — file convention, ImageResponse, size/contentType/alt, params is Promise in v16
- [CITED: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons, lastUpdated 2026-04-15] — favicon/icon/apple-icon conventions, location rules
- [CITED: `CLAUDE.md` stack section] — Next 16.2.2 GA Oct 2025, Serwist `9.x`, Tailwind v4 CSS-first, `@supabase/ssr@0.10.x`, avoid `getSession()` in server paths

### Secondary (MEDIUM confidence)

- [CITED: https://serwist.pages.dev/docs/next/getting-started, fetched 2026-04-21] — Serwist `defaultCache` + fallbacks pattern; notes that document-only fallback pattern avoids API caching
- [CITED: WebSearch — "Next.js 16 App Router Supabase RLS public landing page anonymous data query pattern 2026"] — confirms anon role requires explicit RLS grant; mentions anonymous sign-ins as alternative (over-engineering for our case)

### Tertiary (LOW confidence)

- None — no critical findings rest on unverified sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified via `pnpm view` + `package.json`; versions fresh
- Architecture: HIGH — codebase pattern (`lib/data/directory.ts` + `app/(app)/directory/page.tsx`) provides the template; Next 16 metadata API documented with publish date 2026-04-15 (<2 weeks ago)
- Pitfalls: HIGH for 1 (RLS gap — directly verified via migration files), HIGH for 5, 6, 7 (test file existence verified), MEDIUM for 9 (Serwist `defaultCache` behavior — assumed based on `@serwist/next` convention; should be explicitly tested before Phase 6 sign-off)
- Validation architecture: HIGH — `playwright.config.ts` + `vitest.config.ts` inspected; gaps enumerated accurately
- Security domain: HIGH — V4 (access control via RLS) is the load-bearing concern and directly traced to Pitfall 1

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — Next 16 and Serwist are stable; Supabase migration state might evolve if Phase 7 pre-seeding lands ahead of Phase 6)
