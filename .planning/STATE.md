---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-18T18:18:31.291Z"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 10
  completed_plans: 0
  percent: 0
---

# State: Georgia Barter

**Project:** Georgia Barter — Georgia-only community skills-barter directory (directory-first MVP, Barter Tools deferred)
**Core Value:** A Georgian with a skill to trade can find another Georgian with a matching need, and initiate contact in under two minutes.
**Success Metric:** Initiated contacts (PostHog `contact_initiated` event fired by the Supabase Edge Function `send-contact`)
**Milestone:** v1 Launch
**Initialized:** 2026-04-17

---

## Project Reference

| Field | Value |
|-------|-------|
| Working directory | `/Users/ashleyakbar/barterkin` |
| Tech stack | Next.js 16.2 (App Router, React 19.2) + Supabase (Auth + Postgres 17 + Storage + Edge Functions) + Vercel + Resend + PostHog |
| Package manager | pnpm 9 |
| Runtime | Node 20 LTS |
| Deployment | Vercel (app) + Netlify (legacy index.html until retired in Phase 6) |
| Granularity | standard (5-8 phases; 3-5 plans per phase) |
| Mode | yolo (auto-accept by default) |
| Solo builder | Yes — all scope decisions filtered through "what can one person maintain" |

### Core constraints (from PROJECT.md)

- No custom auth code — Supabase Auth only
- Member email/phone never exposed in directory UI — always routed through relay
- Dedicated Georgia Barter domain, standalone brand (separate from biznomad.io)
- Fresh Supabase + Vercel accounts (no reuse)
- Free-tier-first; near-zero-cost
- Georgia-only v1; honor-system county gate (no ZIP allowlist, no phone area-code check)
- Apple Sign-In deferred to Capacitor milestone
- SPF/DKIM/DMARC configured at DNS (Phase 1), not pre-launch — 24-48h propagation

### Joined phases (cannot split)

- **Phase 5: Contact Relay + Trust** — shipping relay without rate limits + CAPTCHA + block + report = day-one spam cannon per PITFALLS.md §11, §15. Non-negotiable.

---

## Current Position

**Phase:** Pre-Phase-1 (roadmap complete, not yet planning)
**Plan:** None
**Status:** Ready to execute
**Progress:** 0/7 phases complete

```
[▱▱▱▱▱▱▱] 0%  Phase 1: Foundation & Infrastructure (next)
```

### Phase Status Grid

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation & Infrastructure | Not started |
| 2 | Authentication & Legal | Not started |
| 3 | Profile & Georgia Gate | Not started |
| 4 | Directory | Not started |
| 5 | Contact Relay + Trust (joined) | Not started |
| 6 | Landing Page & PWA Polish | Not started |
| 7 | Pre-Launch Seeding | Not started |

---

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| v1 requirements mapped | 78/78 | 78/78 ✓ |
| Orphaned requirements | 0 | 0 ✓ |
| Phases complete | 7 | 0 |
| Plans complete | TBD | 0 |
| Initiated contacts (post-launch) | ≥1 per 10 profiles per week | — (pre-launch) |
| Seeded profiles at launch | ≥30 (≥2 counties × ≥3 categories) | 0 (pre-seeding) |
| Mail-tester deliverability score | ≥9/10 | — (pre-DNS) |

---

## Accumulated Context

### Key Decisions (from PROJECT.md)

- Directory-only MVP; Barter Tools deferred (validate demand first)
- Next.js 16.2 + Supabase + Vercel (NOT Clerk + Convex — RLS is the right primitive)
- Platform-relayed email for first contact (privacy + real KPI + no real-time infra)
- PWA first, Capacitor when App Store matters
- Georgia gate = county selector + honor system
- Email verify required; phone verify deferred to v1.1 badge
- Success metric = initiated contacts (behavioral signal, not vanity)
- SSO v1 = Google + magic-link only; Apple deferred to Capacitor milestone
- 10-category Georgia taxonomy ships in MVP (not v1.1)
- Optional TikTok handle field (community is TikTok-native)
- Contact Relay + Trust ship together (joined phase)
- Pre-launch seeding to ≥30 founding-member profiles
- Separate `skills_offered` / `skills_wanted` tables (not single table with type enum)
- Contact relay in Supabase Edge Function (not Server Action — keeps service-role key out of Next.js bundle)

### Research Flags (from SUMMARY.md)

- **Phase 5 (Contact Relay + Trust)** may benefit from `/gsd-research-phase` — Resend + Edge Function integration has specific patterns (JWT forwarding, rate-limit counter caching, bounce webhook signature verification)
- **Phase 7 (Seeding)** is a non-negotiable phase, not "do it in spare time"

### Open Todos (pre-phase procurement)

- [ ] Procure dedicated Georgia Barter domain (blocker for Phase 1 DNS)
- [ ] Create fresh Supabase project (dev + prod) (blocker for Phase 1)
- [ ] Create fresh Vercel project (blocker for Phase 1)
- [ ] Create Resend account + verify domain (blocker for Phase 1 SMTP wiring + Phase 5 relay)

### Blockers

None currently — roadmap complete, awaiting phase-1 planning.

---

## Session Continuity

### Last Session

- **Date:** 2026-04-17
- **Action:** Roadmap created via `/gsd-new-project` → roadmapper
- **Outcome:** 7-phase structure, 78/78 v1 requirements mapped, 0 orphans, ready for `/gsd-plan-phase 1`

### Next Session Should

1. Verify pre-phase procurement items (domain, Supabase, Vercel, Resend) are in place — or kick off acquisition
2. Run `/gsd-plan-phase 1` to decompose Phase 1 (Foundation & Infrastructure) into plans
3. Phase 1 is the only phase gated by real-world procurement timing (DNS propagation 24-48h); plan around that

### Context Budget

- No plans yet; context budget fresh
- Research files (STACK.md 641 lines, FEATURES.md 531 lines, ARCHITECTURE.md 1143 lines, PITFALLS.md 727 lines) are heavy — load selectively during phase planning, not all at once

---

## Evolution

This document updates on:

- **Every phase transition** (via `/gsd-transition`) — phase status, progress bar, accumulated decisions, next-session notes
- **Every plan completion** — plan count, progress
- **Every milestone complete** (via `/gsd-complete-milestone`) — full state audit
- **Session handoff** — "Last Session" + "Next Session Should"

---
*State initialized: 2026-04-17 at roadmap creation*
*Last updated: 2026-04-17*
