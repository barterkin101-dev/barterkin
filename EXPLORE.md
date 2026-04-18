# Georgia Barter — Exploration Brief

Pivot from single marketing page (`index.html`, deployed on Netlify) to a community directory for bartering skills and services across Georgia.

## Product thesis

Directory-first. Members create profiles listing skills offered and wanted. Other members find them via category/county/keyword filters and make first contact through a platform-relayed email. Members barter their own deals off-platform. Barter tools (time-bank ledger, trade flow, ratings, messaging) are deferred to a later milestone once directory usage validates demand.

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Fits Vercel hosting, App Router edge features |
| Hosting | Vercel | First-class Next.js support; keep Netlify for static `index.html` until replaced |
| Auth | Supabase Auth | Google + Apple + magic-link OOTB; passkeys in beta |
| DB | Supabase Postgres + RLS | Owner-scoped profile edits, authed-read directory, server-RPC-only writes for future ledger |
| Storage | Supabase Storage | Avatars, skill photos |
| Email | Resend (or Supabase Edge Function via Resend) | Platform-relayed contact |
| App wrapper | PWA first, Capacitor later | App Store requires native shell — add Capacitor when stores matter |

## Design constraints (from existing `index.html`)

- Palette: `--sage-bg #eef3e8`, `--sage-light #dfe8d5`, `--sage-pale #f4f7f0`, `--forest #2d5a27`, `--forest-deep #1e4420`, `--forest-mid #3a7032`, `--clay #c4956a`
- Fonts: Lora (serif, headings) + Inter (sans, body)
- Warm, community, earth-tone aesthetic

## MVP scope

1. SSO signup: Google + Apple + magic-link
2. Profile: skills offered, skills wanted, bio, photo, county, availability (free text), contact preference
3. Directory: category + county + keyword filters, search
4. First contact: platform-relayed email via Resend — sender fills short form, recipient gets email (From: platform, Reply-To: sender), replies go direct after first touch
5. Georgia gate: county selector at signup + honor system
6. Trust floor: email verified required; no other badge at MVP
7. Landing page: new page in new aesthetic, keep sage/forest/clay + Lora/Inter

## Locked decisions

1. **Scope shape:** directory only at MVP; members barter their own deals off-platform
2. **Georgia gating:** county selector + honor system (no ZIP allowlist, no phone area-code check at MVP)
3. **Trust floor:** email verified required; phone verify deferred to v1.1 trust badge
4. **First-contact mechanic:** platform-relayed email (not public contact reveal, not in-app inbox)
5. **Stack:** Next.js + Supabase + Vercel (not Clerk + Convex, not Netlify for the app)
6. **App wrapper strategy:** PWA first, Capacitor when App Store / iOS push is required

## Deferred milestone: Barter Tools

Surface after directory has active members and initiated contacts. Plant as a seed with trigger condition "directory MVP has ≥ 50 active members with ≥ 1 contact initiated each."

Scope:
- Time-bank ledger (1 hr = 1 credit, server-authoritative RPC writes only, 2 hrs seeded on signup)
- Trade state machine: requested → agreed → completed → rated
- In-app messaging (replaces email relay for trade coordination)
- Reviews + ratings + trust score
- Phone verification badge
- Availability calendar + radius search
- Curated Georgia categories (farm labor, tutoring, handyman, childcare, tech help, creative)
- Dispute flag + admin review queue

## Later (post-v1.1)

- County community boards
- Group barters (3+ party circular trades)
- Events / skill-share meetups
- Referral credits

## Open questions for project init

- v1 success metric: active profiles vs. initiated contacts vs. week-1 retention?
- Do we keep `biznomad.io` as brand, or is there a dedicated Georgia Barter domain?
- Is there an existing Supabase / Vercel account, or do we provision fresh?
