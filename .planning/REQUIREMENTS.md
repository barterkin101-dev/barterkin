# Requirements: Georgia Barter

**Defined:** 2026-04-17
**Core Value:** A Georgian with a skill to trade can find another Georgian with a matching need, and initiate contact in under two minutes.

Every requirement below maps to exactly one phase in ROADMAP.md. Requirement IDs use `[CATEGORY]-[NUMBER]`. Categories derived from research/FEATURES.md Section 8 phase split.

## v1 Requirements

### Foundation

<!-- Infrastructure that everything else depends on. -->

- [ ] **FOUND-01**: Next.js 16.2 App Router project scaffolded with pnpm, Tailwind v4, shadcn/ui new-york, TypeScript strict, and Lora + Inter via next/font/google
- [ ] **FOUND-02**: Sage/forest/clay palette (`--sage-bg #eef3e8`, `--sage-light #dfe8d5`, `--sage-pale #f4f7f0`, `--forest #2d5a27`, `--forest-deep #1e4420`, `--forest-mid #3a7032`, `--clay #c4956a`) wired as Tailwind v4 `@theme` tokens
- [ ] **FOUND-03**: Dedicated domain procured and DNS-controlled
- [ ] **FOUND-04**: SPF + DKIM + DMARC records set at DNS and verified (≥24h before launch)
- [x] **FOUND-05**: Fresh Supabase project provisioned; RLS enabled on all public tables by default
- [x] **FOUND-06**: Fresh Vercel project provisioned with separate preview and production environments; env vars set per environment
- [ ] **FOUND-07**: Resend account + domain verified; plugged into Supabase Studio SMTP so auth emails come from branded domain
- [ ] **FOUND-08**: Database migrations versioned under `supabase/migrations/`, committed to git, and reproducible locally via `supabase db reset`
- [ ] **FOUND-09**: Serwist PWA with `app/manifest.ts`, service worker, and installable web manifest including icons derived from existing identity
- [ ] **FOUND-10**: PostHog integrated with `posthog-js` + `@posthog/next`; `initiated_contact` event schema defined as KPI source of truth
- [ ] **FOUND-11**: GitHub Actions CI: `pnpm lint`, `pnpm typecheck`, `pnpm test` on every PR; Vercel preview on every branch
- [ ] **FOUND-12**: Legacy `index.html` kept live on Netlify until new landing page replaces it (no service gap at cutover)

### Authentication

- [ ] **AUTH-01**: User can sign up with Google OAuth
- [ ] **AUTH-02**: User can sign up with magic-link email (passwordless)
- [ ] **AUTH-03**: User session persists ≥30 days across browser refresh via `@supabase/ssr` cookie pattern
- [ ] **AUTH-04**: User must verify email before their profile appears in the directory (enforced via both RLS and middleware redirect to `/verify-pending`)
- [ ] **AUTH-05**: User can log out from any page; session is cleared on client and server
- [ ] **AUTH-06**: Signup rate-limited (5 accounts per IP per day) to block bot waves
- [ ] **AUTH-07**: Signups from known disposable-email domains are rejected
- [ ] **AUTH-08**: Cloudflare Turnstile CAPTCHA gates signup form
- [ ] **AUTH-09**: Auth routes live under `(auth)` route group; middleware refreshes session on every request and redirects authed users away from auth pages
- [ ] **AUTH-10**: Terms of Service, Privacy Policy, and Community Guidelines pages exist and are linked from signup + footer

### Profile

- [ ] **PROF-01**: User creates profile with display name (required, 1-60 chars) and short bio (optional, max 500 chars)
- [ ] **PROF-02**: User uploads avatar image to Supabase Storage (≤2MB; jpg/png/webp only; client-side resize before upload)
- [ ] **PROF-03**: User adds up to 5 "skills offered" entries (free-text, 1-60 chars each)
- [ ] **PROF-04**: User adds up to 5 "skills wanted" entries (free-text, 1-60 chars each)
- [ ] **PROF-05**: User selects exactly one of 159 Georgia counties via typeahead dropdown
- [ ] **PROF-06**: User picks primary category from the 10 seeded Georgia categories
- [ ] **PROF-07**: User writes free-text availability (max 200 chars; e.g. "weekends only")
- [ ] **PROF-08**: User sets `accepting_contact` preference (bool; default true)
- [ ] **PROF-09**: User optionally adds TikTok handle (validated format `@username`)
- [ ] **PROF-10**: User views their own profile with publish/unpublish toggle
- [ ] **PROF-11**: Edits to any profile field reflect in directory immediately (no admin approval)
- [ ] **PROF-12**: Profile must be "complete" (display name + county + category + ≥1 skill offered + avatar) before it can be published
- [ ] **PROF-13**: Published + email-verified + not-banned profiles appear in directory; all other states are hidden (enforced by RLS)
- [ ] **PROF-14**: Member can view another member's full profile page at `/m/[username]`

### Directory

- [ ] **DIR-01**: Authenticated + email-verified user can browse directory at `/directory`
- [ ] **DIR-02**: Directory renders profile cards with avatar, display name, county, primary category, and top-3 skills offered
- [ ] **DIR-03**: User filters by category (single-select from 10 seeded categories)
- [ ] **DIR-04**: User filters by county (single-select from 159 typeahead)
- [ ] **DIR-05**: User searches by keyword across name, bio, skills-offered, skills-wanted (Postgres full-text with pg_trgm for typo tolerance, GIN index)
- [ ] **DIR-06**: Filters combine with AND logic; filter state is URL-shareable (query params)
- [ ] **DIR-07**: Directory paginated with cursor-based pagination, 20 cards per page
- [ ] **DIR-08**: Empty directory state and zero-results state both show explanatory copy + next-step CTA
- [ ] **DIR-09**: Only published + email-verified + `banned=false` profiles appear (enforced by RLS)
- [ ] **DIR-10**: Directory page hits TTFB <1s at Vercel edge for empty/filter queries

### Contact Relay

<!-- Ships JOINED with Trust — cannot split without creating a day-one abuse vector. -->

- [ ] **CONT-01**: Member can open a "Contact" form from any profile page (for members whose `accepting_contact=true`)
- [ ] **CONT-02**: Sender writes a short message (20-500 chars) and submits
- [ ] **CONT-03**: Submission handled by a Supabase Edge Function (`send-contact`), not a Next.js Server Action, so service-role + Resend keys never enter the Next bundle
- [ ] **CONT-04**: Edge Function inserts a `contact_requests` row (sender_id, recipient_id, message, created_at) — this row IS the `initiated_contact` source of truth
- [ ] **CONT-05**: Email sent via Resend with `From: noreply@<domain>`, `Reply-To: <sender_email>`, `To: <recipient_email>`, `X-Entity-Ref-ID: <contact_request_id>`
- [ ] **CONT-06**: Recipient's email is never exposed to sender in-app until recipient voluntarily replies
- [ ] **CONT-07**: Per-sender rate limit: ≤5 contact sends per day, ≤20 per week (enforced server-side, unique index prevents duplicate sends to same recipient within 24h)
- [ ] **CONT-08**: Per-recipient rate limit: any one sender may contact the same recipient ≤2 times per week
- [ ] **CONT-09**: Resend bounce + complaint webhook at `/api/webhooks/resend` updates `contact_requests.status`
- [ ] **CONT-10**: Recipient sees an in-app badge "1 new contact" on next login (no inbox UI — the email is the inbox)
- [ ] **CONT-11**: Successful send fires `posthog.capture('contact_initiated', ...)` with anonymized ids — feeds the KPI dashboard

### Trust & Safety (Minimum Floor)

<!-- Ships with Contact Relay. Non-negotiable baseline. -->

- [ ] **TRUST-01**: Any authed member can report another profile with reason enum (harassment, spam, off-topic, impersonation, other) and optional note
- [ ] **TRUST-02**: Any authed member can block another member; blocked members disappear from blocker's directory view and cannot send them contacts
- [ ] **TRUST-03**: `profiles.banned` flag exists; when `true`, profile is hidden from directory and contact relay rejects sends to/from that user (enforced by RLS)
- [ ] **TRUST-04**: Admin sets `banned=true` via Supabase SQL (no admin UI at MVP)
- [ ] **TRUST-05**: Reports table scaffolded day-one with RLS; reporter's identity visible only to service-role
- [ ] **TRUST-06**: Report submission emails the admin address (simple notification; no UI)
- [ ] **TRUST-07**: Contact relay Edge Function rejects sends when sender has `banned=true`, recipient has `banned=true`, recipient has `accepting_contact=false`, recipient is on sender's block list, or sender is on recipient's block list

### Georgia Gate

- [ ] **GEO-01**: Signup flow requires county selection before profile can publish (enforced in profile completeness check)
- [ ] **GEO-02**: All 159 Georgia counties available in a typeahead dropdown, seeded from FIPS codes in `counties` reference table
- [ ] **GEO-03**: Landing page and onboarding copy frame the honor-system expectation: "Georgia residents only"
- [ ] **GEO-04**: ToS includes non-residency clause (use-at-your-own-risk; removal for proven out-of-state abuse)

### Landing Page

- [ ] **LAND-01**: New landing page at `/` in the Next.js app matches the existing `index.html` visual identity (palette + Lora/Inter + warm community aesthetic)
- [ ] **LAND-02**: Landing page sections: hero with value prop, "how it works" (3-step), founding-member strip (live profiles), county coverage, signup CTA, footer with ToS/Privacy/Guidelines
- [ ] **LAND-03**: Responsive: mobile-first; tested on ≥360px viewport width
- [ ] **LAND-04**: Open Graph meta, favicon, manifest icons; preview card renders when shared on social

### Pre-Launch Seeding

- [ ] **SEED-01**: Outreach to all 11 existing `index.html` listings for opt-in consent (message template + tracking)
- [ ] **SEED-02**: Consent form captures: migrate existing listing Y/N, updates to skills/bio/county, preferred email, TikTok handle (if applicable)
- [ ] **SEED-03**: Founding-member profiles seeded in production via admin script (never via public signup flow)
- [ ] **SEED-04**: `founding_member=true` flag renders a subtle badge on profile + card
- [ ] **SEED-05**: Reach ≥30 seeded profiles spanning ≥2 counties × ≥3 categories before public launch
- [ ] **SEED-06**: Founder-operator personally replies to every contact request received in the first 14 days post-launch (operational requirement, not a feature)

## v2 Requirements

<!-- Deferred to future milestones. Tracked but not in current roadmap. -->

### Barter Tools (separate milestone)

- **BAR-01**: Time-bank ledger (1 hr = 1 credit), immutable-by-default, service-role-only writes
- **BAR-02**: Trade state machine: requested → agreed → completed → rated
- **BAR-03**: In-app messaging threads per trade (replaces email relay for trade coordination)
- **BAR-04**: Ratings + reviews + trust score
- **BAR-05**: Dispute flow with admin review queue UI

### v1.1 Trust Escalators

- **TRUST-08**: Phone verification as optional profile badge
- **TRUST-09**: Photo verification / ID verification as optional profile badge
- **TRUST-10**: Admin review queue UI (when report volume justifies)

### v1.1 Discovery

- **DIR-11**: Radius search (via county centroids or geocoded address)
- **DIR-12**: Availability calendar (structured vs the v1 free-text field)
- **DIR-13**: Finer sub-category taxonomy beneath the 10 top-level categories
- **DIR-14**: "Recently joined" / county-spotlight strips on landing + directory

### Capacitor Milestone

- **CAP-01**: Capacitor wrap (iOS + Android) of the PWA
- **CAP-02**: Apple Sign-In added to auth options (required for App Store acceptance)
- **CAP-03**: Push notifications for new contact requests
- **CAP-04**: Deep link handling (`/m/[username]` opens inside the app)

### Later

- **LATE-01**: County community boards
- **LATE-02**: Group barters (3+ party circular trades)
- **LATE-03**: Events / skill-share meetups
- **LATE-04**: Referral credits

## Out of Scope

| Feature | Reason |
|---------|--------|
| Apple Sign-In in v1 | Apple Dev $99/yr + 6-month client-secret rotation + private-relay email complexity; add when Capacitor wrap needs it. |
| Custom auth / password flow | Supabase Auth is the managed provider; rolling our own is a liability. |
| Cash payments / fees | This is a barter directory, not a marketplace. Payments bring tax, KYC, escrow, and regulatory scope that invalidate the thesis. |
| Real-time chat | Cut from MVP — platform-relayed email is the only contact mechanism; chat reconsidered post-MVP based on usage signals. |
| Public email/phone reveal on profile | Privacy-first; defeats the purpose of the relay. |
| Rating/review system before any trades have happened | Pre-populated review systems on community directories degrade to popularity contests. Wait for Barter Tools milestone. |
| Native iOS / Android codebases | Capacitor wrapper only; zero SwiftUI/Kotlin maintenance. |
| Admin review queue UI at MVP | SQL + `banned=true` flag is enough; UI is premature until report volume justifies it. |
| Cross-state expansion at MVP | Georgia-first. County-level community is the thesis; multi-state breaks it. |
| Third-party search (Algolia, Typesense, Meilisearch) | Postgres FTS + pg_trgm handles 100-10k profiles sub-millisecond; third-party search is premature scaling. |
| next-pwa | Abandoned; Serwist is the maintained successor and Next 16-compatible. |
| `@supabase/auth-helpers-nextjs` | Deprecated in favor of `@supabase/ssr`. |
| Payments for "featured" profile placement | Marketplace dynamic; not v1. |

## Traceability

Every v1 requirement maps to exactly one phase in ROADMAP.md.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-02 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-03 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-04 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-05 | Phase 1: Foundation & Infrastructure | Complete |
| FOUND-06 | Phase 1: Foundation & Infrastructure | Complete |
| FOUND-07 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-08 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-09 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-10 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-11 | Phase 1: Foundation & Infrastructure | Pending |
| FOUND-12 | Phase 1: Foundation & Infrastructure | Pending |
| AUTH-01 | Phase 2: Authentication & Legal | Pending |
| AUTH-02 | Phase 2: Authentication & Legal | Pending |
| AUTH-03 | Phase 2: Authentication & Legal | Pending |
| AUTH-04 | Phase 2: Authentication & Legal | Pending |
| AUTH-05 | Phase 2: Authentication & Legal | Pending |
| AUTH-06 | Phase 2: Authentication & Legal | Pending |
| AUTH-07 | Phase 2: Authentication & Legal | Pending |
| AUTH-08 | Phase 2: Authentication & Legal | Pending |
| AUTH-09 | Phase 2: Authentication & Legal | Pending |
| AUTH-10 | Phase 2: Authentication & Legal | Pending |
| GEO-04 | Phase 2: Authentication & Legal | Pending |
| PROF-01 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-02 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-03 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-04 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-05 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-06 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-07 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-08 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-09 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-10 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-11 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-12 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-13 | Phase 3: Profile & Georgia Gate | Pending |
| PROF-14 | Phase 3: Profile & Georgia Gate | Pending |
| GEO-01 | Phase 3: Profile & Georgia Gate | Pending |
| GEO-02 | Phase 3: Profile & Georgia Gate | Pending |
| DIR-01 | Phase 4: Directory | Pending |
| DIR-02 | Phase 4: Directory | Pending |
| DIR-03 | Phase 4: Directory | Pending |
| DIR-04 | Phase 4: Directory | Pending |
| DIR-05 | Phase 4: Directory | Pending |
| DIR-06 | Phase 4: Directory | Pending |
| DIR-07 | Phase 4: Directory | Pending |
| DIR-08 | Phase 4: Directory | Pending |
| DIR-09 | Phase 4: Directory | Pending |
| DIR-10 | Phase 4: Directory | Pending |
| CONT-01 | Phase 5: Contact Relay + Trust | Pending |
| CONT-02 | Phase 5: Contact Relay + Trust | Pending |
| CONT-03 | Phase 5: Contact Relay + Trust | Pending |
| CONT-04 | Phase 5: Contact Relay + Trust | Pending |
| CONT-05 | Phase 5: Contact Relay + Trust | Pending |
| CONT-06 | Phase 5: Contact Relay + Trust | Pending |
| CONT-07 | Phase 5: Contact Relay + Trust | Pending |
| CONT-08 | Phase 5: Contact Relay + Trust | Pending |
| CONT-09 | Phase 5: Contact Relay + Trust | Pending |
| CONT-10 | Phase 5: Contact Relay + Trust | Pending |
| CONT-11 | Phase 5: Contact Relay + Trust | Pending |
| TRUST-01 | Phase 5: Contact Relay + Trust | Pending |
| TRUST-02 | Phase 5: Contact Relay + Trust | Pending |
| TRUST-03 | Phase 5: Contact Relay + Trust | Pending |
| TRUST-04 | Phase 5: Contact Relay + Trust | Pending |
| TRUST-05 | Phase 5: Contact Relay + Trust | Pending |
| TRUST-06 | Phase 5: Contact Relay + Trust | Pending |
| TRUST-07 | Phase 5: Contact Relay + Trust | Pending |
| LAND-01 | Phase 6: Landing Page & PWA Polish | Pending |
| LAND-02 | Phase 6: Landing Page & PWA Polish | Pending |
| LAND-03 | Phase 6: Landing Page & PWA Polish | Pending |
| LAND-04 | Phase 6: Landing Page & PWA Polish | Pending |
| GEO-03 | Phase 6: Landing Page & PWA Polish | Pending |
| SEED-01 | Phase 7: Pre-Launch Seeding | Pending |
| SEED-02 | Phase 7: Pre-Launch Seeding | Pending |
| SEED-03 | Phase 7: Pre-Launch Seeding | Pending |
| SEED-04 | Phase 7: Pre-Launch Seeding | Pending |
| SEED-05 | Phase 7: Pre-Launch Seeding | Pending |
| SEED-06 | Phase 7: Pre-Launch Seeding | Pending |

**Coverage:**
- v1 requirements: 78 total (12 FOUND + 10 AUTH + 14 PROF + 10 DIR + 11 CONT + 7 TRUST + 4 GEO + 4 LAND + 6 SEED)
- Mapped to phases: 78 ✓
- Unmapped: 0 ✓
- Duplicates: 0 ✓

**Phase distribution:**
- Phase 1 (Foundation & Infrastructure): 12 requirements
- Phase 2 (Authentication & Legal): 11 requirements (AUTH x10 + GEO-04)
- Phase 3 (Profile & Georgia Gate): 16 requirements (PROF x14 + GEO-01 + GEO-02)
- Phase 4 (Directory): 10 requirements
- Phase 5 (Contact Relay + Trust, joined): 18 requirements (CONT x11 + TRUST x7)
- Phase 6 (Landing Page & PWA Polish): 5 requirements (LAND x4 + GEO-03)
- Phase 7 (Pre-Launch Seeding): 6 requirements

**Cross-category splits explained:**
- GEO-01, GEO-02 → Phase 3 (county selector + 159-county typeahead are profile fields; PROF-05 depends on them)
- GEO-03 → Phase 6 (landing page honor-system copy)
- GEO-04 → Phase 2 (ToS non-residency clause ships with AUTH-10 ToS creation)

---
*Requirements defined: 2026-04-17*
*Last updated: 2026-04-17 after roadmap creation — traceability populated, coverage verified 78/78*
