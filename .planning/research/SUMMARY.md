# Project Research Summary

**Project:** Georgia Barter
**Domain:** Community skills-barter directory (Georgia-only, directory-first, barter tools deferred)
**Researched:** 2026-04-17
**Confidence:** HIGH on technical stack / architecture / pitfalls; MEDIUM-HIGH on feature scope; MEDIUM on Georgia-specific community claims.

---

## Executive Summary

Georgia Barter is a **read-heavy community directory** with three tight security tiers (anonymous marketing, authed+verified directory, server-only contact relay) and one core success metric: initiated contacts via platform-relayed email. The canonical build for this shape in 2026 is **Next.js 16 App Router + Supabase (Auth + Postgres + RLS + Storage) + Vercel + Resend**, wired via `@supabase/ssr` with middleware session refresh and RLS as the primary security primitive. A thin PWA shell ships at launch; Capacitor wraps later if App Store pressure arrives. This is a boring, well-documented stack for a solo builder on free tiers.

The research flagged **five cross-cutting findings that must shape the roadmap before requirements are scoped:** (1) **Next.js 16.2 — not 15 — is the current stable**, with Turbopack default and React 19.2; PROJECT.md's "Next.js 15" should be updated. (2) **A 10-category Georgia taxonomy must ship in MVP, not v1.1** — the directory's category filter is inert without it, and PROJECT.md currently defers this. (3) **Apple OAuth is high-friction for MVP** (Apple Developer account, key rotation, private-relay email drops); ship Google + magic-link only and add Apple when Capacitor needs it. (4) **Contact Relay (P4) and Trust Layer (P5) cannot split** — shipping a relay without rate limits, CAPTCHA, and block/report tables turns the platform into a spam cannon on day one. (5) **A pre-launch seeding phase is a real phase** — migrating the 11 existing `index.html` listings as "founding members" (with consent) is the only way to avoid a dead-directory bounce on launch day.

The dominant risks are all preventable and well-understood in the ecosystem: RLS misconfiguration (views bypass RLS, `getSession()` spoofing, default-allow policies), email deliverability (SPF/DKIM/DMARC, Apple Communication Email Service registration), and cold-start marketplace dynamics. Mitigations are called out inline in ARCHITECTURE.md and PITFALLS.md with specific code patterns and pre-launch checklists. Build order is strict: **Foundation → Auth → Profile → Directory → Contact Relay + Trust (joined) → Landing/PWA (parallel) → Capacitor (post-MVP)**.

---

## Key Findings

### Recommended Stack

A single-vendor, free-tier-first setup with no custom auth and no reactive-data overkill. Every choice has an official-doc-verified pattern; nothing is speculative.

**Core technologies:**
- **Next.js 16.2.x** (App Router, Turbopack default, React 19.2) — SSR + server actions + RSC, Vercel-native. **Supersedes PROJECT.md's "Next.js 15" — update Key Decisions.**
- **Supabase (Auth + Postgres 17 + RLS + Storage)** — RLS is the right primitive for owner-edit / authed-read / server-RPC boundaries; one vendor, one bill, free tier fits MVP.
- **`@supabase/ssr@0.10.x`** (NOT the deprecated `@supabase/auth-helpers-nextjs`) — browser + server + middleware clients; middleware session refresh is mandatory.
- **Resend `@4.x` + React Email `@4.x`** — free tier 3,000/mo, 100/day; pairs with SMTP override in Supabase Studio so auth emails also land on branded domain.
- **Tailwind v4 (CSS-first `@theme`) + shadcn/ui (`new-york`, Tailwind v4 mode)** — preserves sage/forest/clay palette as CSS vars; no fighting a component library's tokens.
- **React Hook Form + Zod 4 + zod-form-data** — one schema on client and server; used across profile editor and contact relay.
- **Serwist `@9.x`** (not abandoned `next-pwa`) — PWA service worker for Next 16 App Router.
- **Vercel Hobby + pnpm 9 + Node 20 LTS + Vitest + Playwright + PostHog** — hosting, package manager, test split, metrics.

**Hard "do not use":** `@supabase/auth-helpers-nextjs` (deprecated), `getSession()` server-side (spoofable — use `getUser()`/`getClaims()`), `next-pwa` (abandoned), Tailwind v3 config, Supabase Storage Image Transformations on free tier, passkeys-only sign-in (Supabase WebAuthn not GA as of April 2026).

### Expected Features

**Must have (table stakes) — from FEATURES.md Sections 1-2:**
- Keyword search (debounced) + filter by category + filter by county, composable, URL-persistent, paginated
- Profile: name, county, bio, photo (optional), skills_offered[], skills_wanted[], availability (free-text), contact preference, TikTok handle
- Email verification gate before directory visibility (enforced in RLS, not just UI)
- Platform-relayed contact form (Reply-To: sender; first reply goes direct)
- Loading skeletons, empty states, 404, shareable filter URLs, SEO meta per profile
- Mobile-first responsive layout with bottom-sheet filter on mobile

**Should have (competitive differentiators):**
- **10-category Georgia taxonomy** (Food, Farm & Garden, Skilled Trades, Beauty & Hair, Wellness, Crafts, Childcare/Tutoring, Tech, Home/Cleaning, Transportation) — **MVP, not v1.1**
- **TikTok handle profile field** — the existing @kerryscountrylife community is TikTok-native
- "Contact initiated" counter visible to member (powers success metric + mild retention)
- Photo-forward listing cards (category is visual: eggs, sourdough, nail art, crafts)
- Shareable OG images per profile
- Seed migration of 11 existing `index.html` listings as "founding members" with consent
- Warm aesthetic (sage/forest/clay + Lora/Inter) across the whole app, not just marketing

**Defer to v1.1 or Barter Tools:**
- Radius search, availability calendar, seasonal tagging
- Saved profiles, skill-match serendipity, nearby-county grouping
- Phone verification badge, image moderation API, admin report queue UI
- Ratings, reviews, time-bank ledger, trade state machine, in-app chat (all = Barter Tools milestone)

**Explicit anti-features (20 items in FEATURES.md §4):** no cash/fees, no in-app chat MVP, no ratings pre-trade, no phone verify at signup, no radius search, no map, no cross-state, no group barters, no native apps, no custom auth, no public contact reveal, no pre-approval queue, no events, no referral credits, no social graph.

### Architecture Approach

The system splits into three route groups `(marketing)` / `(auth)` / `(app)` with progressively stricter guards: anon / anon-only / authed-and-verified. Middleware handles session refresh (cookie round-trip is the #1 source of silent logout bugs — use the canonical Supabase SSR template verbatim). Server Components fetch with the user's cookie-bound session; Server Actions handle profile mutations. The **contact relay lives in a Supabase Edge Function**, not a Server Action — this keeps the `service_role` key out of the Next.js runtime, colocates rate-limit queries with the database, and gives a natural home for Resend bounce webhooks.

**Major components:**
1. **Next.js App Router on Vercel** — three route groups, middleware for session refresh, Server Components for reads, Server Actions for profile writes
2. **Supabase Postgres with RLS** — `profiles` (PK = `auth.users.id`), separate **`skills_offered` + `skills_wanted`** normalized tables (NOT a single table with type enum — ARCHITECTURE.md documents the filter-composition + FTS-granularity + Barter-Tools-evolution reasoning), `counties` lookup (FIPS-keyed, not enum), `categories` flat with `parent_id` scaffold, `contact_requests` (rate-limit + metric source of truth), `reports` (scaffolded now, admin UI in v1.1), `blocks` (pre-launch required)
3. **Supabase Edge Function `send-contact`** — validates JWT → checks rate limit → INSERTs `contact_requests` → calls Resend with `Reply-To: sender` → returns success to Server Action
4. **Supabase Storage `avatars/`** bucket — public-read (members consent), RLS on INSERT/UPDATE with path `{user_id}/avatar.ext`
5. **PWA manifest + Serwist service worker** — shell cache only, no Supabase API caching at MVP; Capacitor design (deep-link URL schema, AASA/assetlinks.json stubs, push_subscriptions table) baked in now so later wrap is a 1-day job
6. **Resend** — transactional email for auth (via Supabase SMTP override) and contact relay, with SPF/DKIM/DMARC and Apple Communication Email Service registration as pre-launch blockers

### Critical Pitfalls

Top five from PITFALLS.md — each has a concrete prevention phase and verification step:

1. **`getSession()` on server for trust decisions (spoofable)** — use `getUser()` / `getClaims()` in every server context; ESLint rule or pre-commit grep on `app/**`. **Phase: P2 (Auth).**
2. **Service-role key leaking into client bundle** — `lib/supabase/admin.ts` starts with `import "server-only"`; CI step greps `.next/static` for `service_role` after build. Never prefix a service key with `NEXT_PUBLIC_`. **Phase: P2 (Auth), verified before P4.**
3. **RLS bypass via views/RPCs** — every view created `WITH (security_invoker = true)`; helper functions in `private` schema, not `public` (PostgREST auto-exposes `public` functions); run Supabase Database Advisor before every deploy. **Phase: P3 (Directory).**
4. **Contact relay as spam cannon** — rate limits, CAPTCHA, block/report tables ship **in the same phase** as the relay. Per-sender daily cap (5/24h), unique index `(sender, recipient, date)` for dedupe, `Reply-To` server-assigned from auth user's verified email (never free-form). **Phase: P4 + P5 joined.**
5. **Empty-directory cold start** — seed 30-50 real profiles before public launch; migrate the 11 existing `index.html` listings; don't display profile count below 50; beachhead on 2 counties × 2 categories. **Phase: P6 (Seeding & Launch).**

Additional high-severity pitfalls flagged in PITFALLS.md: middleware cookie round-trip broken (silent logouts), default-allow RLS policies on INSERT/UPDATE (impersonation), confusing `auth.uid()` vs separate `user_id` column (pick `profiles.id REFERENCES auth.users(id)` once and stick to it), avatar bucket public-vs-private misconfiguration, caching auth-personalized pages (cross-user leak), N+1 on directory cards (use PostgREST embedding), SPF/DKIM/DMARC missing + Apple private-relay silent drops, commercial/cash creep (Craigslist drift), first-contact harassment (block/report mandatory pre-launch).

---

## Implications for Roadmap

Based on combined research, the build order is **strictly dependency-ordered**; no phase can be reshuffled without rework.

### Phase 1: Foundation & Landing
**Rationale:** Every downstream phase needs the repo scaffold, design tokens, Supabase projects, domain DNS (SPF/DKIM/DMARC), and migrations-as-source-of-truth discipline. DNS records take 24-48h to propagate — land them first.
**Delivers:** Next.js 16.2 App Router scaffold with Tailwind v4 + shadcn (new-york), sage/forest/clay CSS vars, Lora + Inter fonts, `components/ui/` primitives, `lib/supabase/{server,browser,middleware}.ts` clients, two Supabase projects (`-dev` + `-prod`), migrations folder initialized, middleware.ts skeleton, Vercel project + domain configured, **SPF/DKIM/DMARC records live from day one**, ToS/Privacy/Community Guidelines copy-locked, landing page ported from `index.html` into `(marketing)/page.tsx`.
**Addresses:** Features TD-10/11/19, DF-10, GA-9/10. **Avoids:** migration drift (Pitfall 17), late DNS (Pitfall 12), copy-creep killing velocity.
**Blocking procurement:** dedicated Georgia Barter domain must be purchased before DNS can be configured.

### Phase 2: Auth & Profile
**Rationale:** Auth must be rock-solid before Profile; Profile must be rock-solid before Directory. RLS conventions set here are inherited by every later table — do it right once.
**Delivers:** Supabase Auth with **Google + magic-link** (Apple deferred — see Research Flags below), email-verify gate enforced in RLS (not just UI), `handle_new_user` trigger creates profile row on signup, `sync_email_verified` trigger mirrors to `profiles.email_verified`, profile editor (client with Zod), avatar upload to Storage with RLS, **separate `skills_offered` + `skills_wanted` tables** (not single-table-with-type-enum), `counties` FIPS lookup, 10-category Georgia taxonomy seeded, `(select auth.uid())` wrapping convention, `server-only` discipline on admin client, CAPTCHA on signup (Cloudflare Turnstile), disposable-email blocklist.
**Addresses:** Features OB-1 through OB-6, SB-1 through SB-12, TS-1/4/5/11, GA-1/3/4, DF-11 (TikTok handle). **Avoids:** Pitfalls 1, 2, 4, 6, 7, 8, 16, 18, 22.

### Phase 3: Directory
**Rationale:** Users need to browse before they contact. Search + filter composition is where the category taxonomy pays off.
**Delivers:** `/directory` RSC page reading searchParams, `DirectoryFilters` client component (category chips + county select + keyword search, URL-persistent), Postgres FTS with GIN on `profiles.search_vector` + `skills_offered.search_vector`, cursor pagination (not offset), `/directory/[username]` profile view, empty states, loading skeletons, shareable filter URLs, SEO meta per profile, OG images, "Recently joined" module.
**Addresses:** Features TD-1 through TD-21, SB-13 (defer), DF-3/6/12/13. **Avoids:** Pitfalls 5 (RLS-via-views), 9 (caching auth-personalized), 10 (N+1), 20 (premature search infra).

### Phase 4+5: Contact Relay + Trust (joined — cannot split)
**Rationale:** PITFALLS.md is explicit — launching a contact relay publicly without rate limits, CAPTCHA, block/report tables is a day-one spam cannon and harassment vector. These phases must ship together.
**Delivers:** Supabase Edge Function `send-contact` (validates JWT → checks rate limit → INSERTs `contact_requests` → calls Resend with `Reply-To: sender`), contact form page, per-sender daily cap (5/24h), per-pair daily dedupe via unique index, `blocks` table + enforcement, `reports` table + every relay email links to "Report this contact," keyword filter on bio/skills at submit (flag `$`, `hourly`, `cash`, `venmo`, etc.), admin ban flag with RLS enforcement, Resend bounce/complaint webhook at `/api/webhooks/resend`, admin = saved Supabase Studio SQL query + email alert on every report (NO custom admin UI yet), success metric fires from Edge Function.
**Addresses:** Features SB-9, DF-12, TS-2/3/6/9/13/14/15/16/18. **Avoids:** Pitfalls 11 (spam cannon), 14 (cash creep), 15 (harassment), 19 (Apple delivery expectations), 21 (premature admin UI).
**Blocking procurement:** Resend account + domain verification before this phase can be tested.

### Phase 6: Landing + PWA Polish (parallel to P4+5 once P3 stable)
**Rationale:** Can run in parallel with Phase 4+5 once Profile+Directory are stable. Netlify `index.html` stays live as fallback until `(marketing)` ships full parity.
**Delivers:** `/how-it-works`, `/about`, `/privacy` pages, PWA manifest (sage theme_color), Serwist service worker (shell cache only, no Supabase API caching), iOS install explainer (Safari has no `beforeinstallprompt`), `apple-touch-icon` meta, AASA + assetlinks.json placeholder files for later Capacitor, retire Netlify `index.html`.
**Addresses:** GA-9/10, PWA installability.

### Phase 7: Launch Seeding (pre-public)
**Rationale:** PITFALLS.md #13 is the highest-severity non-technical risk. A launch with 3 profiles dies on social the same day.
**Delivers:** Reach out to 11 existing `index.html` listers with consent offer + "founding member" badge flag, personally onboard 30-50 real members (DM, Zoom, profile-writing help), beachhead on 2 counties + 2 categories, metric dashboard (`/admin/metrics` querying `contact_requests`), pre-launch deliverability check (mail-tester.com ≥ 9/10), two-browser two-user cache-leak test, "Looks Done But Isn't" checklist from PITFALLS.md worked through.

### Phase 8: Capacitor Wrap (post-MVP, triggered by App Store demand)
**Rationale:** Not MVP. Budget one day when the trigger arrives. Foundation in P1-P6 (deep-link URL schema, .well-known stubs, `push_subscriptions` scaffold, storage-key namespacing) makes this a non-event.
**Blocking procurement:** Apple Developer account ($99/yr) required when this phase activates.

### Phase Ordering Rationale

- **Auth before Profile before Directory before Relay** is strict — each builds on the previous schema and RLS baseline.
- **Trust cross-cuts** — CAPTCHA + ToS land in P2; rate limits + block/report ship in the same phase as the relay (P4+5 joined).
- **Landing + PWA parallel to P4+5** is possible because they don't share code with the directory flow.
- **Seeding is a real phase** — not "do it in your spare time before launch." It's the difference between a live community and a dead URL.

### Research Flags

**Phases likely needing deeper research during planning:**
- **P4+5 (Contact Relay + Trust):** Resend + Edge Function integration has specific patterns (JWT forwarding, rate-limit counter caching, bounce webhook signature verification) that warrant `/gsd-research-phase`. Also Apple Communication Email Service registration has to happen before first real send to Apple private-relay users.
- **P8 (Capacitor):** The SSR-vs-static-export tension is documented but the "WebView-over-hosted-Vercel" approach recommended in ARCHITECTURE.md §8 is less tutorialized; a spike is warranted before committing.

**Phases with standard patterns (skip research-phase):**
- **P1 (Foundation):** Next.js + Supabase + Tailwind v4 + shadcn init is extremely well-documented; the STACK.md installation commands are directly usable.
- **P2 (Auth & Profile):** `@supabase/ssr` pattern is canonical; the only nuance is middleware cookie round-trip, and STACK.md + ARCHITECTURE.md both quote the official template verbatim.
- **P3 (Directory):** Postgres FTS + PostgREST embedding + cursor pagination are standard Supabase patterns.

**MVP-trim recommendation to validate during requirements:** Ship **Google + magic-link only** for v1 auth. Apple OAuth adds the Apple Developer account ($99/yr), Apple Communication Email Service registration, Services ID + Sign In with Apple key + signed client-secret JWT rotation every 6mo, and the private-relay-email quirk — all for the ~20% of users who prefer Apple over Google on iOS web. Add Apple when Capacitor wraps (which already requires the Apple Developer account). This is a **departure from PROJECT.md's locked-in "Google + Apple + magic-link"** and belongs in the requirements-step discussion.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Context7 + official docs verified for Next.js 16.2, `@supabase/ssr` 0.10, Tailwind v4, shadcn, Resend, Serwist; PWA/Capacitor MEDIUM (moving fast, pin exact versions) |
| Features | MEDIUM-HIGH | HIGH on directory UX table stakes and competitor patterns (TimeBanks, hOurworld, Simbi, Nextdoor verified); MEDIUM on Georgia-specific economy claims (grounded in `index.html` listings + general GA knowledge, not quantitative surveys) |
| Architecture | HIGH | Next.js + Supabase + RLS + Resend patterns verified against current official docs; separate skills tables vs JSON-on-profile decision documented with rationale (filter composition + FTS granularity + Barter Tools evolution) |
| Pitfalls | HIGH | Verified against Supabase 2025 docs, active GitHub discussions, Vercel blog; product/trust pitfalls MEDIUM (composite of directory + marketplace literature applied to this specific shape) |

**Overall confidence:** HIGH for roadmapping. Enough certainty on the build path that the roadmap can be scoped with minor requirements-step refinements, primarily around the Apple-OAuth trim and the MVP-vs-v1.1 category-taxonomy boundary.

### Gaps to Address

1. **PROJECT.md Key Decisions drift** — "Next.js 15" should be updated to "Next.js 16.2.x"; "Google + Apple + magic-link" should be reopened with Apple-deferral trade-off; "curated Georgia taxonomy v1.1+" should move to MVP with the 10-category proposal. **Handle in requirements step.**
2. **Consent for seed migration** — 11 existing `index.html` listers need to be reached out to before migration. **Handle in P7 Seeding phase.**
3. **Wildcard redirect URL support** — Supabase's support for `https://*.vercel.app/**` preview wildcards is unclear in docs; the recommended mitigation is two separate Supabase projects (dev + prod) which ARCHITECTURE.md already specifies. **Validated in P1.**
4. **"Founding member" badge** — FEATURES.md flags this as cheap social proof; whether to build it is a requirements-step call.
5. **Dashboard design** — progress bars vs. light nudges for profile completion; no strong research signal either way. **Requirements-step call.**
6. **Open procurement items** — dedicated domain (before P1 DNS), Resend account + domain verification (before P4), Apple Developer $99 (only if Apple OAuth retained), Supabase + Vercel project provisioning. **Track as P1 prerequisites.**

---

## Sources

### Primary (HIGH confidence)

**Context7 (verified against live code):**
- `/vercel/next.js` — Next.js 16 App Router, server actions, middleware auth patterns
- `/supabase/ssr` — `createBrowserClient`, `createServerClient`, middleware session refresh, Next.js App Router integration
- `/websites/supabase` — Auth providers, MFA status, OAuth + magic-link patterns
- `/supabase/supabase-js` — v2.103.x client reference
- `/shadcn-ui/ui` — Tailwind v4 migration changelog, Next.js installation, `new-york` style
- `/tailwindlabs/tailwindcss.com` — v4 CSS-first configuration, `@theme` directive
- `/websites/resend` — `reply-to` header, React Email integration
- `/react-hook-form/react-hook-form` — v7.66.x + Zod resolver
- `/colinhacks/zod` — Zod 4 stable

**Official docs:**
- https://nextjs.org/blog/next-16 — Next 16 GA (Oct 2025)
- https://nextjs.org/docs/app/api-reference/file-conventions/route-groups — route group behavior
- https://supabase.com/docs/guides/auth/server-side/nextjs — canonical SSR setup
- https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers — deprecation + migration
- https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv — `(select auth.uid())` pattern
- https://supabase.com/docs/guides/database/database-advisors — RLS lint rules
- https://supabase.com/docs/guides/database/full-text-search — FTS for small-to-medium corpora
- https://resend.com/docs/send-with-supabase-edge-functions — canonical relay pattern
- https://resend.com/docs/knowledge-base/sending-apple-private-relay — Apple Communication Email registration
- https://developer.apple.com/documentation/sign_in_with_apple — private email relay service
- https://capacitorjs.com/docs/guides/deep-links — iOS Universal Links
- https://ui.shadcn.com/docs/tailwind-v4 — Tailwind v4 migration
- https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them — caching + auth anti-patterns

### Secondary (MEDIUM confidence)

- Competitor platform analysis — hOurworld, TimeBanks.org, Simbi, Nextdoor Services, Craigslist Atlanta Barter, Freecycle, Bunz
- DesignRush + UXPin 2026 Search UX best practices
- Andrew Chen / Unusual VC / 10Web on cold-start marketplace dynamics
- Markko + Failory + Sharetribe marketplace failure literature
- LogRocket + Aurora Scharff on Serwist for Next 16 PWA
- Capgo + Medium on Next.js + Capacitor SSR-vs-export tradeoffs

### Tertiary (LOW confidence — flagged for validation)

- Supabase GitHub discussions #8677 on WebAuthn/passkey GA timing
- Aso.dev 2025-05 Apple Sign In private-relay incident post

### Internal

- `/Users/ashleyakbar/georgia-barter/.planning/PROJECT.md`
- `/Users/ashleyakbar/georgia-barter/EXPLORE.md`
- `/Users/ashleyakbar/georgia-barter/index.html`
- `/Users/ashleyakbar/georgia-barter/.planning/research/STACK.md`
- `/Users/ashleyakbar/georgia-barter/.planning/research/FEATURES.md`
- `/Users/ashleyakbar/georgia-barter/.planning/research/ARCHITECTURE.md`
- `/Users/ashleyakbar/georgia-barter/.planning/research/PITFALLS.md`

---
*Research completed: 2026-04-17*
*Ready for roadmap: yes — with recommendation to update PROJECT.md Key Decisions (Next.js 16.2, Apple-OAuth trim, Georgia taxonomy into MVP) during the requirements step.*
