# Roadmap: Georgia Barter

**Created:** 2026-04-17
**Core Value:** A Georgian with a skill to trade can find another Georgian with a matching need, and initiate contact in under two minutes.
**Success Metric:** Initiated contacts (PostHog `contact_initiated` event fired by the Supabase Edge Function).
**Granularity:** standard (target 5-8 phases)
**Coverage:** 78/78 v1 requirements mapped

## Milestone: v1 Launch

**Goal:** Ship a live, seeded, Georgia-only skills-barter directory where authed+verified members can find each other by category/county/keyword and initiate first contact through a platform-relayed email — with day-one rate limits, block, report, and ban infrastructure.

**Out of scope for this milestone:** Barter Tools (time-bank ledger, trade state machine, in-app chat, ratings), Capacitor wrap, phone verification, Apple Sign-In, cross-state expansion, admin review queue UI.

## Phases

- [ ] **Phase 1: Foundation & Infrastructure** - Scaffold Next.js 16.2 + Supabase + Vercel + Resend + PWA shell with DNS/SPF/DKIM/DMARC live from day one
- [ ] **Phase 2: Authentication & Legal** - Google OAuth + magic-link auth with email-verify gate, CAPTCHA, rate limits, and ToS/Privacy/Guidelines pages
- [ ] **Phase 3: Profile & Georgia Gate** - Member profiles (skills offered/wanted, county, category, bio, avatar, TikTok handle) with 159-county typeahead and publish gate
- [ ] **Phase 4: Directory** - Authed+verified members browse/search/filter profiles by category + county + keyword with cursor pagination and shareable URLs
- [ ] **Phase 5: Contact Relay + Trust (joined)** - Edge-Function-backed platform-relayed email with rate limits, block, report, and ban — ships together because launching relay without trust = day-one spam cannon
- [ ] **Phase 6: Landing Page & PWA Polish** - Next.js landing page matching existing index.html identity, OG meta, and installable PWA; Netlify index.html retired
- [ ] **Phase 7: Pre-Launch Seeding** - Migrate 11 existing index.html listings with consent, reach ≥30 founding-member profiles spanning ≥2 counties × ≥3 categories before public launch

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: Every downstream phase has a working Next.js 16.2 scaffold, design-token system, fresh Supabase + Vercel projects, dedicated domain with SPF/DKIM/DMARC propagated (24-48h lead time), Resend plugged into Supabase SMTP, PWA shell, PostHog, and CI — so no later phase blocks on infrastructure or DNS propagation.
**Depends on**: Nothing (first phase; blocking procurement: dedicated domain, Supabase project, Vercel project, Resend account)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10, FOUND-11, FOUND-12
**Success Criteria** (what must be TRUE):
  1. A developer can clone the repo, run `pnpm install && pnpm dev`, and see a Next.js 16.2 app on localhost:3000 rendering sage/forest/clay Tailwind tokens with Lora + Inter fonts
  2. A test email sent from the dedicated domain via Resend passes SPF + DKIM + DMARC at mail-tester.com (≥9/10 score)
  3. A PR triggers `pnpm lint`, `pnpm typecheck`, `pnpm test`, and a Vercel preview deploy — all green before merge
  4. The existing Netlify `index.html` stays reachable at its current URL (no service gap) while the new app is built on the new domain
  5. A `posthog.capture('test_event', ...)` call from the Next.js app appears in the PostHog dashboard within 60 seconds
**Plans:** 10 plans
Plans:
- [x] 01-01-repo-init-PLAN.md — Folder rename (georgia-barter → barterkin), public GitHub repo, legacy/index.html move, bootstrap .gitignore/README/.env.local.example
- [x] 01-02-nextjs-scaffold-PLAN.md — Next.js 16.2 App Router + Tailwind v4 + shadcn new-york + Lora/Inter fonts + sage/forest/clay palette in @theme
- [x] 01-03-supabase-ssr-PLAN.md — @supabase/ssr three-client factory + server-only admin + root middleware (getClaims pattern)
- [x] 01-04-pwa-serwist-PLAN.md — Serwist PWA shell (sw.ts + manifest.ts + /~offline + 3 placeholder icons)
- [ ] 01-05-posthog-resend-PLAN.md — PostHog provider + Fire-test-event button + Resend test route + contact_initiated event schema
- [x] 01-06-supabase-migrations-PLAN.md — Supabase CLI dev-dep + supabase/ scaffold linked to us-east-1; migrations workflow in README; D-21 retirement path
- [ ] 01-07-testing-infra-PLAN.md — Vitest + Playwright + smoke tests (tests/unit + tests/e2e) — VALIDATION.md Wave 0 requirement
- [ ] 01-08-ci-gitleaks-PLAN.md — GitHub Actions CI (6 jobs) + pre-commit gitleaks + .gitleaks.toml allowlist
- [ ] 01-09-cloudflare-dns-PLAN.md — Cloudflare DNS → Netlify (D-14) + idempotent script + Phase 6 cutover runbook
- [ ] 01-10-vercel-link-deploy-PLAN.md — Vercel project link + 7 env vars × 3 scopes + first production deploy + end-to-end smoke (PostHog/Resend/Supabase SMTP/us-east-2 retirement)

### Phase 2: Authentication & Legal
**Goal**: Users can sign up with Google OAuth or magic-link email, must verify their email before appearing in the directory (enforced in both RLS and middleware), and are protected from bot waves by CAPTCHA, per-IP rate limits, and disposable-email blocking — with ToS/Privacy/Community Guidelines pages (including the Georgia non-residency clause) linked from signup and footer.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, GEO-04
**Success Criteria** (what must be TRUE):
  1. A new user can sign up with Google or request a magic link, click the link, and land back in the app authenticated
  2. A signed-in user stays logged in across a browser refresh and across a 30-day window (session refreshed by middleware on every request)
  3. A user who has not clicked their email-verify link is blocked from the directory by a middleware redirect to `/verify-pending` — and even if the UI is bypassed, RLS prevents their profile from appearing in any directory query
  4. A user can log out from any page and the session is cleared on both client and server
  5. A bot attempting to create 6 accounts from the same IP in a day is blocked, and signups from disposable-email domains (e.g. `@mailinator.com`) are rejected with a clear error
**Plans:** 4 plans
Plans:
- [x] 02-01-procurement-probes-PLAN.md — Wave 0: Google OAuth + Turnstile procurement, package installs, shadcn primitives, A4 probe, 12 test stubs
- [x] 02-02-migrations-backend-PLAN.md — Wave 1: 002_auth_tables.sql (signup_attempts + helpers + disposable trigger), disposable-email + rate-limit utilities, sendMagicLink server action, 4 route handlers, middleware route-gating
- [ ] 02-03-ui-pages-PLAN.md — Wave 2: @theme inline clay brand override, auth components (Turnstile/Google/LoginForm/Logout), /login + /signup + /verify-pending, three legal pages with locked GEO-04 clause, Footer wired into root layout
- [x] 02-04-tests-verify-PLAN.md — Wave 3: supabase db push, type regen, fill 3 unit + 9 E2E test bodies, run full suite, push CI (6 jobs), Vercel preview smoke

### Phase 3: Profile & Georgia Gate
**Goal**: Email-verified users can build a complete member profile (display name, bio, avatar, up to 5 skills offered, up to 5 skills wanted, exactly one of 159 Georgia counties, primary category from the 10-category taxonomy, availability free-text, contact preference, optional TikTok handle) and publish it — with RLS enforcing that only published + email-verified + not-banned profiles are directory-visible.
**Depends on**: Phase 2
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09, PROF-10, PROF-11, PROF-12, PROF-13, PROF-14, GEO-01, GEO-02
**Success Criteria** (what must be TRUE):
  1. An email-verified user can fill in the profile editor (display name, bio, avatar upload, 1-5 skills offered, 0-5 skills wanted, county via typeahead across all 159 Georgia counties, primary category from the seeded 10, availability, contact preference, TikTok handle) and save
  2. A user with an incomplete profile (missing display name, county, category, any skill offered, or avatar) cannot flip the `is_published` toggle — the UI gates on completeness and the server enforces the same check
  3. Published + email-verified + not-banned profiles are visible to other authed members at `/m/[username]`; all other states are hidden by RLS (not just UI)
  4. Editing any profile field (e.g. changing availability from "weekends" to "evenings") shows the new value in the directory immediately on next page load — no admin approval step
  5. Avatar upload rejects files over 2MB or non-image MIME types client-side, and Storage RLS rejects path traversal attempts (a user cannot overwrite another user's avatar)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Directory
**Goal**: Authed + email-verified users can browse the directory at `/directory`, filter by category (single-select from 10) and county (single-select from 159 typeahead), search by keyword across name/bio/skills (Postgres FTS with pg_trgm for typo tolerance), combine filters with AND logic, share the filter state via URL, and paginate through 20 cards per page — with TTFB <1s at the Vercel edge.
**Depends on**: Phase 3
**Requirements**: DIR-01, DIR-02, DIR-03, DIR-04, DIR-05, DIR-06, DIR-07, DIR-08, DIR-09, DIR-10
**Success Criteria** (what must be TRUE):
  1. An authed + email-verified user can browse the directory and see profile cards rendered with avatar, display name, county, primary category, and top-3 skills offered
  2. A user can combine a category filter + county filter + keyword search, see results filtered with AND logic, and paste the resulting URL into another browser to reproduce the same view
  3. A keyword search with a minor typo (e.g. "bakng" for "baking") still returns baking-related profiles thanks to pg_trgm fuzzy matching
  4. An empty directory state and a zero-results state both render explanatory copy and a clear next-step CTA — not a blank page or a bare "No results" message
  5. The directory page responds in under 1 second TTFB from the Vercel edge for both an empty-filter query and a category+county+keyword query
**Plans**: TBD
**UI hint**: yes

### Phase 5: Contact Relay + Trust (joined)
**Goal**: Ship the core value prop — platform-relayed first contact — TOGETHER with its non-negotiable day-one trust floor (rate limits, block, report, admin ban, bounce handling). Launching relay without trust = day-one spam cannon per PITFALLS.md §11 and §15; these phases are joined by design. The Supabase Edge Function `send-contact` validates sender eligibility (email-verified, not banned, not blocked by recipient, recipient `accepting_contact=true`), enforces rate limits, inserts a `contact_requests` row (KPI source of truth), sends email via Resend with `Reply-To: sender`, and fires the `contact_initiated` PostHog event.
**Depends on**: Phase 4
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09, CONT-10, CONT-11, TRUST-01, TRUST-02, TRUST-03, TRUST-04, TRUST-05, TRUST-06, TRUST-07
**Success Criteria** (what must be TRUE):
  1. An authed + email-verified user can open the Contact form on a profile page (for recipients with `accepting_contact=true`), write a 20-500 char message, submit, and see a success confirmation within 3 seconds
  2. The recipient receives an email from `noreply@<domain>` with `Reply-To: <sender_email>`, and replying in their mail client sends the reply directly to the sender (the platform is out of the loop after first touch); recipient email is never exposed in-app until they voluntarily reply
  3. Rate limits hold: a sender hitting 6 sends in 24h is rejected on the 6th; a sender attempting to contact the same recipient 3 times in a week is rejected on the 3rd; a banned sender, banned recipient, blocked pair, or `accepting_contact=false` recipient is rejected with a clear error
  4. Any authed member can report another profile (reason enum + optional note), block another member (blocked users disappear from their directory view and cannot contact them), and a single SQL `UPDATE profiles SET banned=true WHERE id=...` hides a profile from the directory and rejects all relay sends to/from that user
  5. A successful relay send fires `posthog.capture('contact_initiated', ...)` from the Edge Function with anonymized IDs, and a Resend bounce/complaint webhook at `/api/webhooks/resend` updates `contact_requests.status`
**Plans**: TBD

### Phase 6: Landing Page & PWA Polish
**Goal**: The new Next.js landing page at `/` matches the existing `index.html` visual identity (sage/forest/clay + Lora/Inter + warm community aesthetic) with sections for hero, how-it-works (3-step), founding-member strip (live profiles), county coverage, signup CTA, and footer — plus Georgia-honor-system framing copy, responsive mobile-first layout (≥360px), Open Graph meta/favicon/manifest icons, and a Serwist-powered installable PWA. Legacy Netlify `index.html` is retired once parity is verified.
**Depends on**: Phase 3 (for founding-member strip data); may run in parallel with Phase 5
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, GEO-03
**Success Criteria** (what must be TRUE):
  1. The new landing page at `/` renders with the sage/forest/clay palette, Lora headings + Inter body, and the warm community aesthetic — visually indistinguishable from the existing `index.html` identity
  2. The landing page includes all required sections (hero with value prop, how-it-works 3-step, founding-member strip with live profiles, county coverage, signup CTA, footer with ToS/Privacy/Guidelines links) and frames the Georgia honor-system expectation clearly ("Georgia residents only")
  3. The landing page renders correctly at 360px viewport width on a mobile device — no horizontal scroll, tap targets ≥44px, text legible without zoom
  4. Sharing the site URL on social (X, Facebook, iMessage) renders a proper preview card with Open Graph image, title, and description
  5. A user on Chrome mobile or desktop sees an "Install" prompt; after installing, the app launches from the home screen with the sage theme color and functions offline for the shell (service worker caches shell, not Supabase API calls)
**Plans**: TBD
**UI hint**: yes

### Phase 7: Pre-Launch Seeding
**Goal**: Prevent the empty-directory cold-start bounce (PITFALLS.md §13 — highest-severity non-technical risk). Reach out to all 11 existing `index.html` listings with a consent + "founding member" offer, seed those who opt in via an admin script (never through the public signup flow), reach ≥30 total seeded profiles spanning ≥2 counties × ≥3 categories, and commit the founder-operator to personally responding to every contact request in the first 14 days post-launch.
**Depends on**: Phase 3 (profile schema exists), Phase 5 (contact relay live so founder can respond to contacts)
**Requirements**: SEED-01, SEED-02, SEED-03, SEED-04, SEED-05, SEED-06
**Success Criteria** (what must be TRUE):
  1. All 11 existing `index.html` listers have been contacted with the consent + founding-member offer using a tracked outreach template, and their responses (Y/N + any updates) are captured in the consent form
  2. Consented founding-member profiles are seeded in production via the admin script (with `founding_member=true`), and their profile cards + detail pages render a subtle founding-member badge
  3. The directory shows ≥30 total profiles spanning ≥2 Georgia counties and ≥3 categories before the public launch announcement is made
  4. The founder-operator has a tracked commitment (written, visible in STATE.md) to personally reply to every contact request received in the first 14 days post-launch
  5. The pre-launch "Looks Done But Isn't" checklist from PITFALLS.md is worked through and every item checked off before public launch
**Plans**: TBD

## Dependency Map

```
Phase 1 (Foundation & Infrastructure)
    │
    └─> Phase 2 (Auth & Legal)
          │
          └─> Phase 3 (Profile & Georgia Gate)
                │
                ├─> Phase 4 (Directory)
                │     │
                │     └─> Phase 5 (Contact Relay + Trust — joined)
                │           │
                │           └─> Phase 7 (Pre-Launch Seeding)
                │
                └─> Phase 6 (Landing + PWA) ──[can run parallel to Phase 5]──┘
```

**Strict ordering (cannot reshuffle):**
- Auth (2) must precede Profile (3) — every profile FK's `auth.users`.
- Profile (3) must precede Directory (4) — nothing to render without profiles.
- Directory (4) must precede Contact Relay (5) — can't contact who you can't find.
- Contact Relay + Trust (5) cannot split into separate phases — see PITFALLS.md §11/§15.
- Seeding (7) must come last — requires contact relay live so the founder can respond to contacts.

**Parallelizable:**
- Phase 6 (Landing + PWA) can run in parallel with Phase 5 once Phase 3 is stable (they share no code).

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | 0/10 | Planned | - |
| 2. Authentication & Legal | 0/? | Not started | - |
| 3. Profile & Georgia Gate | 0/? | Not started | - |
| 4. Directory | 0/? | Not started | - |
| 5. Contact Relay + Trust | 0/? | Not started | - |
| 6. Landing Page & PWA Polish | 0/? | Not started | - |
| 7. Pre-Launch Seeding | 0/? | Not started | - |

---
*Roadmap created: 2026-04-17 from REQUIREMENTS.md + research synthesis*
*Phase 1 planned: 2026-04-18 — 10 plans across 9 waves*
*Next: `/gsd-execute-phase 1`*
