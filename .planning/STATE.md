---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: context exhaustion — phase 3 UAT complete
last_updated: "2026-04-21T06:23:20.141Z"
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 28
  completed_plans: 29
  percent: 100
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

Phase: 04 (directory) — EXECUTING
Plan: Not started
**Phase:** 5
**Status:** Ready to plan
**Progress:** [███░░░░] Phases 1–3 complete

```
[▰▰▰▱▱▱▱] Phase 3 complete. Next: plan + execute Phase 4 (Directory)
```

### CI fixes discovered in Phase 1 (apply to all future phases)

- pnpm lockfileVersion 9.0 requires pnpm@10 (CI now uses npm install -g pnpm@10)
- `next lint` removed in Next.js 16 — lint script is now `eslint .`
- NEXT_PUBLIC_* vars must be in GitHub Actions repo variables for E2E builds
- Serwist sw bundles excluded from ESLint globalIgnores

### Phase Status Grid

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation & Infrastructure | ✅ complete (5bc75c1, 2026-04-19) |
| 2 | Authentication & Legal | ✅ complete (2026-04-20) |
| 3 | Profile & Georgia Gate | ✅ complete — all 6 UATs passed (2026-04-20) |
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
| Plans complete | 10 (Phase 1) | 5 |
| Initiated contacts (post-launch) | ≥1 per 10 profiles per week | — (pre-launch) |
| Seeded profiles at launch | ≥30 (≥2 counties × ≥3 categories) | 0 (pre-seeding) |
| Mail-tester deliverability score | ≥9/10 | — (pre-DNS) |

---
| Phase 01 P03 | 2min | 2 tasks | 8 files |
| Phase 01-foundation-infrastructure P04 | 12min | 2 tasks | 14 files |

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

### Key Decisions (accumulated during execution)

- **Plan 01-03:** Chose `supabase.auth.getClaims()` over `getUser()` fallback — install-time probe returned `HAS_GETCLAIMS` on `@supabase/ssr@0.10.2`. JWKS-verified, no Auth-server round-trip (saves ~50ms/req). `getSession()` remains banned from all server paths (PITFALLS Pitfall 1).
- **Plan 01-03:** `server.ts` carries `import 'server-only'` on line 1 in addition to admin.ts (defense-in-depth per PLAN Step 4 spec).
- **Plan 01-03:** Middleware matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `api/webhooks`, and image/PWA extensions (`.webmanifest` explicitly — leaves PWA paths unclogged for Plan 04 Serwist).
- **Plan 01-04:** Serwist 9.5.7 wired with `disable: process.env.NODE_ENV === 'development'` — keeps Turbopack dev speed; production build uses webpack (Plan 02 pin) to emit `public/sw.js`.
- **Plan 01-04:** Added `turbopack: {}` to `next.config.ts` to silence Next 16's "webpack config with no turbopack config" error that fires because `withSerwist` injects a webpack config at config-eval time even when PWA is disabled in dev. Future webpack-wrapping plugins will need the same silencer.
- **Plan 01-04:** `tsconfig.json` lib extended with `"webworker"` to expose `ServiceWorkerGlobalScope` for `app/sw.ts` (global project-wide, not per-file triple-slash).
- **Plan 01-04:** `sharp@0.34.5` kept as devDep and `scripts/generate-icons.cjs` committed so Phase 6 can regenerate branded icons via `node scripts/generate-icons.cjs` after dropping in a new SVG template.
- **Plan 01-04:** `public/swe-worker-*.js` added to `.gitignore` alongside `sw.js` + `workbox-*.js` — Serwist emits a second per-build chunk beyond the main service worker.

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

- **Date:** 2026-04-20
- **Action:** Completed Phase 03 UAT (all 6 tests) + wired production DNS
- **Outcome:** Added root CNAME `barterkin.com → 35c7cc2beaeaa25c.vercel-dns-017.com` on Cloudflare; added Turnstile env vars to Vercel and redeployed; ran all 6 Phase 3 UATs via Playwright: (1) profile save, (2) publish gate tooltip, (3) avatar validation, (4) cross-session publish visibility, (5) empty state, (6) slug lock — all PASS. Phase 03 VERIFICATION and HUMAN-UAT updated to complete.
- **Stopped at:** context exhaustion — phase 3 UAT complete

### Next Session Should

1. Plan Phase 4 (Directory) with `/gsd-plan-phase 4`
2. Execute Phase 4 with `/gsd-execute-phase 4`
3. Phase 4 scope: directory listing page, search/filter by county + category + keyword, profile cards, pagination

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
*Last updated: 2026-04-18 (Plan 01-03 complete)*
