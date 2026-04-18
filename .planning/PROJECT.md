# Georgia Barter

## What This Is

Georgia Barter is a community directory where residents of Georgia list skills they offer and skills they want, then find each other by category, county, and keyword. Members make first contact through a platform-relayed email and negotiate barters themselves — the directory is the product; structured barter tools come later.

## Core Value

A Georgian with a skill to trade can find another Georgian with a matching need, and initiate contact in under two minutes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] SSO signup with Google + magic-link email (no password); Apple deferred to Capacitor wrap milestone
- [ ] Email verification required before appearing in directory
- [ ] Member profile: skills offered, skills wanted, bio, photo, county, availability (free text), contact preference, optional TikTok handle
- [ ] Directory: browse + search with category, county, and keyword filters
- [ ] 10-category Georgia taxonomy seeded at launch (Food, Farm & Garden, Skilled Trades, Beauty & Hair, Wellness, Crafts, Childcare/Tutoring, Tech, Home/Cleaning, Transportation)
- [ ] Platform-relayed contact: sender fills a short form, recipient gets an email from platform (Reply-To: sender); replies go direct after first touch
- [ ] Rate limits + CAPTCHA + report + block as day-one trust floor (launches with contact relay, not after)
- [ ] Georgia-only soft gate: county selector required at signup (honor system, no ZIP allowlist); all 159 counties available
- [ ] Landing page in sage/forest/clay palette + Lora/Inter, warm community aesthetic
- [ ] PWA-installable; wrapped later with Capacitor when App Store presence is needed
- [ ] Pre-launch seeding: migrate the 11 existing `index.html` listings as "founding members" with consent; reach ≥30 seeded profiles before public launch

### Out of Scope

- Time-bank ledger and trade state machine — deferred to "Barter Tools" milestone; members barter their own deals for MVP
- In-app messaging / chat threads — platform-relayed email is the only MVP contact mechanism; chat reconsidered post-MVP based on usage signals
- Ratings, reviews, disputes — no trust-layer infra until directory has demonstrated pull
- Phone verification — deferred to v1.1 as a trust badge
- Apple Sign-In — deferred to Capacitor wrap milestone (Apple Developer $99/yr + 6-month key rotation + private-relay email complexity isn't worth it until the App Store build needs it)
- Radius search / availability calendar / finer sub-category taxonomy — v1.1+ (top-level 10-category taxonomy ships in MVP)
- Admin review queue UI — MVP uses SQL + `banned=true` flag; build a UI once report volume demands it
- County community boards, group barters, events, referral credits — later milestones
- Native iOS/Android codebases — Capacitor wrapper only when stores matter; no SwiftUI/Kotlin work
- Custom auth code — Supabase Auth is the managed provider; we don't roll our own
- Cash payments / marketplace fees — this is a barter directory, not a marketplace

## Context

- **Origin:** Pivot from a single marketing page (`index.html`, already deployed on Netlify). That page establishes the visual identity: sage/forest/clay palette (`--sage-bg #eef3e8`, `--forest #2d5a27`, `--clay #c4956a`) and Lora (serif, headings) + Inter (sans, body). Keep the palette and fonts; rebuild the page inside the new Next.js app.
- **Scope shape:** Directory-first. Members barter off-platform. Validates demand before investing in ledger / messaging / trust infra.
- **Success metric:** Count of "Contact" button presses (initiated contacts). Chosen over active profiles because profile count is vanity and contacts are the first true behavioral signal that the directory is working.
- **Geography:** Georgia (US state) only for v1. County selector + honor system at signup. No geofence, no ZIP allowlist, no phone area-code check for MVP.
- **Team:** Solo builder. Every scope decision filtered through "what can one person maintain."
- **Prior exploration:** Full pre-project brief at `EXPLORE.md` in the repo root captures stack rationale, rejected alternatives (Clerk + Convex, Netlify-for-app, PWABuilder-only, public contact reveal, in-app messaging for MVP), and deferred-milestone scope.

## Constraints

- **Tech stack**: Next.js 16.2.x (App Router, React 19.2) + Supabase (Auth + Postgres + Storage) + Vercel hosting — "Next.js 15" in original brief read as "modern App-Router Next.js"; 16.2 is current stable as of 2026-04 and what `create-next-app` scaffolds. Chosen for RLS-native data model, OOTB social+magic-link auth, and free-tier headroom.
- **Moderation**: Report-after model. Admin actions via SQL (`banned=true` flag) at MVP; no admin UI until report volume demands one.
- **App wrapper**: PWA first; Capacitor added only when App Store / iOS push is required — keeps one codebase, no native-code maintenance.
- **Hosting**: Must deploy on Vercel or Netlify free tier — Vercel for the Next.js app, Netlify keeps serving the legacy `index.html` until the new landing page replaces it.
- **Auth**: No custom auth code — Supabase Auth is the only managed provider; rejected Clerk + Convex (pricing caps + reactive-data overkill for a directory).
- **Budget**: Solo-builder, near-zero-cost — free tiers for as long as possible.
- **Email delivery**: Platform-relayed contact requires a transactional email provider (Resend or equivalent via Supabase Edge Function). Must stay within free-tier sending limits.
- **Privacy**: Member email/phone never exposed in the directory UI — always routed through the relay.
- **Brand**: **Barterkin** is the umbrella brand; **Georgia Barter Network** is the v1 product (regional descriptor). Domain: `barterkin.com` (to be procured at Cloudflare Registrar). Standalone from biznomad.io.
- **Accounts**: Fresh Supabase + Vercel projects — no reuse of existing infrastructure.
- **Deliverability**: SPF + DKIM + DMARC must be configured at DNS setup (Phase 1), not pre-launch — propagation takes 24-48h. Resend is plugged into Supabase Studio SMTP so auth emails come from branded domain too.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Directory-only MVP; defer barter tools | Validate demand before building ledger, messaging, ratings, disputes. Solo builder can't ship all of it at once. | — Pending |
| Next.js + Supabase + Vercel (not Clerk + Convex) | Postgres+RLS is the right primitive for profile-edit / directory-read / ledger-RPC boundaries; Supabase Auth covers the full SSO set; Convex reactive model is overkill for a directory. | — Pending |
| Platform-relayed email for first contact (not public reveal, not in-app chat) | Protects member privacy, gives a real "initiated contacts" metric, avoids real-time infra. | — Pending |
| PWA first, Capacitor later | App Store requires a native shell; PWA ships fastest and Capacitor is the clean upgrade path when stores matter. | — Pending |
| Georgia gate = county selector + honor system | ZIP allowlist and phone area-code check add friction without real enforcement; honor system is acceptable for MVP. | — Pending |
| Email verify required; phone verify deferred to v1.1 badge | Email verify is the minimum trust floor directory listings need to feel real. Phone verify is a v1.1 trust escalator, not MVP table stakes. | — Pending |
| Success metric = initiated contacts (Contact button hits) | Behavioral signal that directory is matching supply with demand; profile count would mislead. | — Pending |
| Dedicated domain, standalone brand | Georgia Barter is a distinct product from biznomad.io; cleaner long-term identity and future transferability. | — Pending |
| Brand = Barterkin (umbrella); v1 product = Georgia Barter Network; domain = barterkin.com | Umbrella brand gives room to expand beyond Georgia later without rebranding, while the v1 product descriptor keeps the Georgia-first positioning in landing copy. Matches the `barterkin101@gmail.com` business Google account. | — Pending |
| Cloudflare Registrar for domain + DNS + Turnstile | At-cost domain pricing (~$10/yr), free WHOIS privacy, fast DNS propagation, and Cloudflare Turnstile is already in scope for AUTH-08. Consolidates domain+DNS+CAPTCHA on one vendor. | — Pending |
| Fresh Supabase + Vercel accounts | Keep project infra isolated from any existing work; simplifies billing and access. | — Pending |
| SSO v1 = Google + magic-link only; Apple deferred | Apple Dev $99/yr, 6-month JWT client-secret rotation, private-relay email complexity. Not worth the MVP drag; add when Capacitor wrap needs it (App Store requires Apple Sign-In anyway). | — Pending |
| 10-category Georgia taxonomy ships in MVP (not v1.1) | The category filter is broken without a day-1 taxonomy. Top-level 10 categories are light enough to seed immediately; finer sub-taxonomy stays v1.1. | — Pending |
| Optional TikTok handle field on profile | Existing community is TikTok-native (1,400+ interested via @kerryscountrylife); preserving that audience through the rebuild is zero-cost. | — Pending |
| Contact Relay + Trust ship together (joined phase) | Launching contact relay without rate limits + CAPTCHA + report + block = day-one spam cannon. Cannot split. | — Pending |
| Pre-launch seeding to ≥30 founding-member profiles | Empty directory = instant bounce. Migrating 11 existing index.html listings (with consent) + manually onboarding ~20 more is the single highest-leverage cold-start lever. | — Pending |
| Next.js 16.2.x (not 15) — current stable | Next.js 16.2 is the current stable as of 2026-04; create-next-app scaffolds 16.x. Reading original "Next.js 15" constraint as "modern App Router Next.js". | — Pending |
| Separate skills_offered / skills_wanted tables (not single table with type enum) | Better composite filter plans with category+county+FTS, cleaner per-skill history for future Barter Tools ledger, avoids JSON-containment awkwardness. | — Pending |
| Contact relay in Supabase Edge Function (not Server Action) | Keeps service-role key out of Next.js bundle surface area, co-locates rate-limit logic with the DB, clean path to add per-IP limiting. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-17 after initialization*
