---
phase: 06-landing-page-pwa-polish
verified: 2026-04-21T19:30:00Z
status: human_needed
score: 14/15
overrides_applied: 0
human_verification:
  - test: "Run pnpm exec playwright test tests/e2e/landing-smoke.spec.ts tests/e2e/landing-metadata.spec.ts tests/e2e/landing-mobile.spec.ts against a running dev server"
    expected: "All 15 tests pass (6 smoke, 6 metadata, 3 mobile). landing-founding-strip.spec.ts should pass the empty-state branch when no founding members are seeded."
    why_human: "E2E tests require a running dev server with real Supabase env vars. Cannot verify programmatically without starting a server."
  - test: "Resize browser to 360px on http://localhost:3000 and visually confirm no horizontal scroll, all CTAs are full-width stacked, nav shows only brand + Join"
    expected: "No horizontal scrollbar, CTAs are block-stacked, LandingNav hides How it works and Directory links (only visible at sm:)"
    why_human: "Pixel-level responsive layout requires a real browser at the target viewport."
  - test: "Share https://barterkin.com on Twitter/X or iMessage and confirm OG preview card renders with forest-gradient image, correct title, and description"
    expected: "Preview card shows the 1200x630 Lora-branded forest-gradient image, title Barterkin Georgia community skills exchange, and the find-Georgians description"
    why_human: "Social OG cards require external crawlers fetching the deployed production URL -- cannot test from codebase alone."
  - test: "Open http://localhost:3000 in Chrome DevTools > Application > Manifest, confirm installable PWA prompt appears; install and launch from home screen"
    expected: "Install prompt appears, installed app opens in standalone mode, sw.js service worker is active and the /~offline fallback page works"
    why_human: "PWA install prompt and service worker behavior require real browser interaction and cannot be asserted via file checks."
gaps: []
deferred: []
---

# Phase 6: Landing Page & PWA Polish -- Verification Report

**Phase Goal:** The new Next.js landing page at `/` matches the existing `index.html` visual identity (sage/forest/clay + Lora/Inter + warm community aesthetic) with sections for hero, how-it-works (3-step), founding-member strip (live profiles), county coverage, signup CTA, and footer -- plus Georgia-honor-system framing copy, responsive mobile-first layout (>=360px), Open Graph meta/favicon/manifest icons, and a Serwist-powered installable PWA. Legacy Netlify `index.html` is retired once parity is verified.
**Verified:** 2026-04-21T19:30:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Landing page at `/` renders with sage/forest/clay palette, Lora headings, Inter body, matching visual identity | VERIFIED | `app/page.tsx` composes LandingNav + Hero (forest-gradient, clay CTAs) + HowItWorks (sage-bg) + FoundingMemberStrip + CountyCoverage + SecondaryCTA (sage-pale); all use canonical color tokens from globals.css |
| 2 | Hero, how-it-works 3-step, founding-member strip with live profiles, county coverage, signup CTA, footer with ToS/Privacy/Guidelines all present | VERIFIED | All 6 sections exist in `app/page.tsx`; Footer from `app/layout.tsx`; SecondaryCTA links to `/legal/guidelines`; LandingNav provides navigation |
| 3 | GEO-03 honor-system framing copy "Georgia residents only" appears on page | VERIFIED | Hero eyebrow Badge: "Georgia residents only · Honor system"; CountyCoverage populated + empty branches each contain the honor-system line (2 occurrences confirmed) |
| 4 | Responsive mobile-first layout -- no horizontal scroll at 360px, tap targets >=44px | VERIFIED (code) / NEEDS HUMAN (runtime) | Hero CTAs use h-14 (56px); all other CTAs h-12/h-11 (48/44px). LandingNav hides nav links below sm:. HowItWorks uses grid-cols-1 on mobile. CountyCoverage pills use flex-wrap. Actual viewport confirmation requires browser. |
| 5 | Open Graph meta, favicon, manifest icons -- preview card renders on social | VERIFIED (code) / NEEDS HUMAN (deployed) | `app/opengraph-image.tsx` exports alt/size/contentType; 1200x630 ImageResponse with Lora TTF loaded via readFile; metadataBase wired via NEXT_PUBLIC_SITE_URL in `app/layout.tsx`; manifest.ts has branded icons; twitter card = summary_large_image |
| 6 | Serwist-powered installable PWA -- install prompt, offline shell | VERIFIED (code) / NEEDS HUMAN (browser) | `@serwist/next@9.5.7` in package.json; `app/sw.ts` configures Serwist with precache + defaultCache + /~offline fallback; `next.config.ts` wraps with `withSerwist`; `app/manifest.ts` standalone display + theme_color #2d5a27 |
| 7 | Legacy Netlify `index.html` retired (moved to legacy/, not deployed) | VERIFIED | `legacy/index.html` exists as historical reference; `legacy/README.md` declares "not deployed" and explains UAT-gated Netlify suspension; no runtime references from app/, components/, or lib/ |
| 8 | Anon RLS policies grant SELECT on profiles/counties/categories/skills_offered | VERIFIED | `supabase/migrations/008_landing_public_reads.sql` contains exactly 4 `for select to anon` clauses; profiles predicate: `is_published = true AND banned = false`; skills_offered uses subquery joining parent profile visibility |
| 9 | Data helpers never select forbidden columns (email, owner_id, accepting_contact, banned, bio) | VERIFIED | Forbidden-column grep exits 1 (no matches); explicit column lists confirmed in all three helpers; `is_published` and `banned` appear only as WHERE predicates, never in projections |
| 10 | Each data helper fails soft -- DB error returns UI-SPEC fallback values, not a 500 | VERIFIED | All three helpers wrapped in try/catch; getStatCounts returns `{ totalProfiles: 30, distinctCounties: 2 }` on error; founders/counties return empty arrays on error |
| 11 | PostHog error events wired for all three data helpers | VERIFIED | 3 PostHog error event names confirmed (landing_founding_strip_error, landing_county_coverage_error, landing_stat_strip_error); fire-and-forget shutdown pattern |
| 12 | app/page.tsx is a server component using Promise.all for parallel data fetch | VERIFIED | `Promise.all([getFoundingMembers(), getCountyCoverage(), getStatCounts(), supabase.auth.getClaims()])` confirmed; no 'use client' directive; no client-side data fetching |
| 13 | Authed CTA swap -- authed user sees "Go to your dashboard" -> /profile | VERIFIED | `Hero.tsx` receives `isAuthed` prop; primaryLabel and primaryHref swap based on isAuthed; getClaims() used (not getSession() -- CLAUDE.md ban enforced) |
| 14 | No PII exposed in landing component tree | VERIFIED | PII field grep exits 1 (no email/owner_id/accepting_contact/bio/banned in render); `LandingFounderCard` type excludes all PII fields by construction; no raw-HTML-injection props anywhere in components/landing/ |
| 15 | E2E test suite has 4 new landing specs; smoke.spec.ts deleted; iphone-se Playwright project registered | VERIFIED (code) / NEEDS HUMAN (runtime) | All 4 spec files exist; smoke.spec.ts absent; playwright.config.ts has iphone-se project; spec assertions match UI-SPEC copywriting contract verbatim |

**Score:** 14/15 truths verified at code level (runtime confirmation needed for items 4, 5, 6, 15)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/008_landing_public_reads.sql` | 4 anon SELECT RLS policies | VERIFIED | Exists; 4 `for select to anon` clauses; correct predicates on profiles and skills_offered |
| `playwright.config.ts` | iphone-se Playwright project | VERIFIED | `{ name: 'iphone-se', use: { ...devices['iPhone SE'] } }` present alongside chromium project |
| `tests/e2e/landing-smoke.spec.ts` | Hero + how-it-works + GEO-03 smoke assertions | VERIFIED | Exists; contains locked copy; 6 tests |
| `tests/e2e/landing-metadata.spec.ts` | OG, Twitter, manifest metadata assertions | VERIFIED | Exists; asserts summary_large_image; tests manifest 200 and opengraph-image 200 |
| `tests/e2e/landing-founding-strip.spec.ts` | Founding-member strip branches | VERIFIED | Exists; imports directory-seed fixture with founding_member support; hasEnv guard |
| `tests/e2e/landing-mobile.spec.ts` | 360px + 44px tap target assertions | VERIFIED | Exists; uses devices['iPhone SE']; 3 tests for scroll and tap target |
| `lib/data/landing.ts` | getFoundingMembers/getCountyCoverage/getStatCounts | VERIFIED | Line 1: `import 'server-only'`; 3 exported async functions; explicit column lists; PostHog fail-soft |
| `app/opengraph-image.tsx` | 1200x630 OG ImageResponse | VERIFIED | Exports alt, size, contentType; reads Lora-Bold.ttf via readFile; forest gradient; Barterkin wordmark |
| `app/apple-icon.png` | 180x180 iOS icon | VERIFIED | File exists |
| `assets/Lora-Bold.ttf` | TrueType font >50KB | VERIFIED | 212,196 bytes (207KB); variable font covering 700 weight; SIL OFL 1.1 |
| `app/layout.tsx` | metadataBase + skip-link | VERIFIED | metadataBase set from NEXT_PUBLIC_SITE_URL; skip-link targeting #main present |
| `components/landing/LandingNav.tsx` | Sticky forest-deep nav + Sprout + Join CTA | VERIFIED | sticky top-0 z-40 bg-forest-deep; Sprout from lucide-react; Join -> /signup |
| `components/landing/Hero.tsx` | H1 + CTA swap + stat strip | VERIFIED | H1 confirmed; isAuthed CTA swap; dl/dt/dd stat strip with live and fallback values |
| `components/landing/HowItWorks.tsx` | 3-step grid with id="how" | VERIFIED | id="how" anchor; "Three steps to your first trade"; all 3 step headings |
| `components/landing/FoundingMemberStrip.tsx` | Empty-state + populated grid | VERIFIED | "Be a founding member." empty state; "Meet the first Georgians on Barterkin" populated; role="list"/listitem |
| `components/landing/FoundingMemberCard.tsx` | Sage-pale card with Founding member badge | VERIFIED | Founding member badge; hover lift; /m/{username} link; aria-label pattern |
| `components/landing/CountyCoverage.tsx` | County pill grid + GEO-03 honor-system | VERIFIED | GEO-03 honor-system line in BOTH populated and empty branches (2 occurrences) |
| `components/landing/SecondaryCTA.tsx` | "Ready to trade?" + Join Barterkin | VERIFIED | "Ready to trade?" heading; "Join Barterkin" CTA -> /signup; /legal/guidelines link |
| `app/page.tsx` | Server component composing all sections | VERIFIED | 6 landing component imports; Promise.all; static metadata with twitter:card=summary_large_image; id="main"; getClaims() |
| `legacy/README.md` | Historical marker for retired Netlify index.html | VERIFIED | "not deployed" marker; explains UAT-gated Netlify suspension; legacy/index.html untouched |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `supabase/migrations/008_landing_public_reads.sql` | Postgres anon role | `for select to anon` | VERIFIED | Pattern confirmed 4 times; counties, categories, profiles, skills_offered all granted |
| `playwright.config.ts` | Playwright devices registry | `devices['iPhone SE']` | VERIFIED | iphone-se project registered alongside chromium |
| `lib/data/landing.ts` | Supabase profiles/counties tables | explicit column list (no select *) | VERIFIED | `id, username, display_name, avatar_url, counties!inner(name)...` confirmed; no select * |
| `lib/data/landing.ts` | PostHog (posthog-node) | landing_*_error event capture | VERIFIED | 3 PostHog error event names; fire-and-forget shutdown pattern |
| `app/layout.tsx` | NEXT_PUBLIC_SITE_URL env var | `new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com')` | VERIFIED | metadataBase wired with production URL fallback |
| `app/opengraph-image.tsx` | assets/Lora-Bold.ttf | readFile of TTF path | VERIFIED | `readFile(join(process.cwd(), 'assets/Lora-Bold.ttf'))` confirmed |
| `app/page.tsx` | lib/data/landing.ts | Promise.all([getFoundingMembers(), getCountyCoverage(), getStatCounts()]) | VERIFIED | All 3 helpers imported and called in parallel; 4th call is supabase.auth.getClaims() |
| `app/page.tsx` | components/landing/* | Named imports + prop drilling | VERIFIED | 6 landing component imports; stats, profiles, counties, isAuthed props drilled |
| `components/landing/Hero.tsx` | /signup or /profile | href based on isAuthed | VERIFIED | CTA swap logic confirmed in Hero.tsx |
| `components/landing/FoundingMemberCard.tsx` | /m/{username} | Template literal href | VERIFIED | Link pattern confirmed in FoundingMemberCard.tsx |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `Hero.tsx` | stats.totalProfiles, stats.distinctCounties | getStatCounts() -> Supabase profiles count queries | Yes -- count query + fallback 30/2 on error | FLOWING |
| `FoundingMemberStrip.tsx` | profiles array | getFoundingMembers() -> Supabase profiles join | Yes -- founding_member=true AND is_published=true AND banned=false; up to 6 rows | FLOWING |
| `CountyCoverage.tsx` | counties array | getCountyCoverage() -> Supabase profiles + counties join | Yes -- deduped up to 24 distinct county names | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running Next.js dev server -- cannot start server in verification context)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| LAND-01 | 06-01, 06-02, 06-03 | Landing page matches index.html visual identity (palette + Lora/Inter + warm aesthetic) | VERIFIED | All landing components use sage/forest/clay tokens; Lora font via next/font/google; Hero forest gradient; warm community copy throughout |
| LAND-02 | 06-01, 06-02, 06-03 | Hero + how-it-works (3-step) + founding-member strip (live profiles) + county coverage + signup CTA + footer | VERIFIED | All 6 sections present in app/page.tsx; data helpers return live profiles; footer from root layout |
| LAND-03 | 06-01, 06-03 | Responsive mobile-first; tested on >=360px viewport | VERIFIED (code) / NEEDS HUMAN (browser) | All CTAs >=44px height; flex-col stacking on mobile; grid-cols-1 on mobile; iphone-se E2E spec created |
| LAND-04 | 06-01, 06-02 | Open Graph meta, favicon, manifest icons; preview card renders on social | VERIFIED (code) / NEEDS HUMAN (deployed) | OG image route + metadataBase + apple-icon + manifest.ts + branded icons all present |
| GEO-03 | 06-01, 06-03 | Landing page frames honor-system expectation: "Georgia residents only" | VERIFIED | "Georgia residents only · Honor system" in Hero eyebrow; honor-system sentence in CountyCoverage both branches |

All 5 requirements assigned to Phase 6 in REQUIREMENTS.md are accounted for. No orphaned requirements.

### Anti-Patterns Found

| File | Pattern Checked | Severity | Result |
|------|----------------|---------|--------|
| components/landing/* | TODO/FIXME/placeholder comments | Blocker | None found |
| components/landing/* | Raw HTML injection props | Blocker | None found -- all profile strings rendered as React text children (auto-escaped) |
| components/landing/* | 'use client' directive | Blocker | None found -- all components are server-safe RSC |
| components/landing/* | font-semibold (UI-SPEC forbids) | Warning | None found |
| components/landing/* | Teal hex colors (#2a9d8f, #40c4b0) | Warning | None found |
| app/page.tsx | getSession() usage (CLAUDE.md ban) | Blocker | None found -- getClaims() used instead |
| lib/data/landing.ts | select('*') usage | Blocker | None found -- all selects use explicit column lists |

### Human Verification Required

#### 1. E2E Test Suite Full Pass

**Test:** Start `pnpm dev` (or `pnpm build && pnpm start`) with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY set, then run:
```
pnpm exec playwright test tests/e2e/landing-smoke.spec.ts tests/e2e/landing-metadata.spec.ts tests/e2e/landing-founding-strip.spec.ts
pnpm exec playwright test --project=iphone-se tests/e2e/landing-mobile.spec.ts
```
**Expected:** All tests green. landing-smoke: 6/6. landing-metadata: 6/6. landing-founding-strip: empty-state branch passes (or skipped if founders already seeded in env). landing-mobile: 3/3.
**Why human:** E2E tests require a running Next.js server. Cannot be started from a verification context.

#### 2. 360px Mobile Layout

**Test:** Open http://localhost:3000 in Chrome DevTools, set viewport to 360px wide, scroll the full landing page.
**Expected:** No horizontal scrollbar appears; hero CTAs stack vertically (full width); LandingNav shows only brand mark and "Join" button (no "How it works" / "Directory" text links visible); HowItWorks grid is single column; county pills wrap without overflow.
**Why human:** CSS responsive behavior at an exact pixel breakpoint requires real browser rendering to confirm.

#### 3. Social Open Graph Card

**Test:** Share https://barterkin.com (production URL) on Twitter/X, Facebook, or iMessage.
**Expected:** Preview card shows the 1200x630 forest-gradient image with "Barterkin" in Lora font and the tagline; title matches "Barterkin -- Georgia's community skills exchange"; description matches the find-Georgians copy.
**Why human:** Social OG cards require external crawlers to fetch the deployed URL. The metadataBase and OG image route are correctly configured in code, but actual card rendering requires a live deploy.

#### 4. PWA Install Prompt + Offline Shell

**Test:** Run `pnpm build && pnpm start` (Serwist is disabled in dev mode). Open Chrome at http://localhost:3000. Check DevTools > Application > Service Workers. Confirm install prompt appears in Chrome address bar. Install to home screen. Navigate to a landing section, disconnect network, reload.
**Expected:** Service worker registered (sw.js), install prompt available in Chrome, app launches in standalone mode from home screen, /~offline page loads when network is disconnected.
**Why human:** PWA install prompt requires Serwist build (not dev mode, which disables the service worker) and browser interaction. Service worker behavior cannot be asserted via file inspection alone.

### Gaps Summary

No code-level gaps were found. All must-have truths are verified at the implementation level:

- All 20 required artifacts exist and are substantive (not stubs)
- All key links are wired (data flows from Supabase through helpers through components to render)
- No forbidden columns in queries, no PII in render, no banned patterns (getSession, raw HTML injection, teal, font-semibold)
- GEO-03 honor-system copy confirmed in Hero (eyebrow) and CountyCoverage (both branches)
- Legacy index.html properly retired with README marker and no runtime references

Four human verification items are needed for behaviors that require a running environment:
1. E2E test pass against live server
2. 360px viewport layout in real browser
3. Social OG card on deployed production URL
4. PWA install prompt and offline shell in Chromium

These are confirmation checks, not indicators of code defects.

---

_Verified: 2026-04-21T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
