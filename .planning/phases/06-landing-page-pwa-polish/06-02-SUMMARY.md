---
phase: "06-landing-page-pwa-polish"
plan: "02"
subsystem: "landing-data-metadata-assets"
tags: [landing, pwa, data-layer, og-image, metadata, icons, server-only]
dependency_graph:
  requires: ["06-01 (migration 008_landing_public_reads.sql — anon RLS policies)"]
  provides: ["lib/data/landing.ts helpers", "app/opengraph-image.tsx", "app/apple-icon.png", "branded icons", "metadataBase in layout"]
  affects: ["app/page.tsx (Plan 04 wires helpers)", "landing-metadata.spec.ts (Plan 01 E2E moves to GREEN on /opengraph-image)"]
tech_stack:
  added: ["assets/Lora-Bold.ttf (SIL OFL 1.1, from google/fonts, variable font covering 700 weight)"]
  patterns: ["posthog-node server-side fire-and-forget error capture", "next/og ImageResponse file convention", "server-only data helper with explicit column lists"]
key_files:
  created:
    - lib/data/landing.ts
    - app/opengraph-image.tsx
    - assets/Lora-Bold.ttf
    - app/apple-icon.png
  modified:
    - app/layout.tsx
    - scripts/generate-icons.cjs
    - public/icons/icon-192.png
    - public/icons/icon-512.png
    - public/icons/icon-maskable.png
    - .gitignore
decisions:
  - "Used code-driven app/opengraph-image.tsx (next/og ImageResponse) over static public/og.png — matches plan spec; file convention auto-emits absolute OG URL via metadataBase"
  - "Lora variable font committed as assets/Lora-Bold.ttf: static/Lora-Bold.ttf path returned 404 from google/fonts repo; variable font covers bold weight and is 212KB (well over 50KB floor)"
  - "createClient() (anon RLS path) used in lib/data/landing.ts — depends on Plan 01 migration 008 RLS policies at runtime"
  - "pre-existing typecheck failure in lib/actions/contact.ts (mark_contacts_seen RPC type mismatch) is out-of-scope; no new errors introduced by Plan 02"
metrics:
  duration: "~4 minutes"
  completed_date: "2026-04-21"
  tasks_completed: 4
  files_changed: 10
---

# Phase 6 Plan 02: Data Layer, OG Image, Metadata & PWA Icons Summary

**One-liner:** Server-only data helpers (getFoundingMembers/getCountyCoverage/getStatCounts) with posthog-node fail-soft, 1200x630 OG ImageResponse using Lora font, metadataBase wired via NEXT_PUBLIC_SITE_URL, branded sprout/leaf PWA icons with 15% maskable safe zone including new 180x180 apple-icon.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | metadataBase + skip-link to app/layout.tsx | 2d295fb | app/layout.tsx |
| 2 | lib/data/landing.ts with 3 data helpers | 9099474 | lib/data/landing.ts |
| 3 | Lora-Bold.ttf + app/opengraph-image.tsx | 548600e | assets/Lora-Bold.ttf, app/opengraph-image.tsx |
| 4 | Rebrand icons + app/apple-icon.png | cc6743b | scripts/generate-icons.cjs, 4 PNGs |

## OG Image Approach Decision

The plan and RESEARCH.md both noted two alternatives:

- **Static `public/og.png`** + `metadata.openGraph.images: '/og.png'` — deterministic, easy to diff, CDN-cacheable without cold-start. RESEARCH recommended this as the default for simplicity.
- **Code-driven `app/opengraph-image.tsx`** via `next/og` ImageResponse — template-driven, updated at build time whenever copy or palette changes, and the file convention automatically emits the correct absolute `og:image` URL using `metadataBase` (no risk of Pitfall 3 conflicting meta tags).

**Decision: code-driven path chosen** per the plan spec. The file convention integrates cleanly with the `metadataBase` added in Task 1, and the Lora font bytes loaded via `readFile` ensure branded typography without a separate design handoff step.

## Lora Bold TTF — License Traceability

- **Source URL:** `https://github.com/google/fonts/raw/main/ofl/lora/Lora%5Bwght%5D.ttf`
- **License:** SIL Open Font License 1.1 — redistributable; committed to git is permissible
- **File committed as:** `assets/Lora-Bold.ttf`
- **Git blob SHA:** `ee1914c3746140523de2940d267ec2215bd85d5b`
- **Size:** 212,196 bytes (207KB) — variable font covering Regular through Bold (700 weight)
- **Note:** `google/fonts` repo does not have a `static/Lora-Bold.ttf` path (404); the variable font `Lora[wght].ttf` is the canonical download and includes the 700 weight needed by satori. Committed under the name `Lora-Bold.ttf` per plan spec.

## Icon Generator Deviations

None required for correctness. The sprout/leaf SVG renders cleanly at 192×192 because:
- Mark uses geometric primitives (ellipses + rect) — no rasterization artifacts at small sizes
- Non-maskable icons use 5% padding (not 0%) to give a small breathing margin around the sage-bg circle
- Maskable variant uses the required 15% safe zone per UI-SPEC

All four output PNGs verified by `file` command — correct dimensions in each case.

## Confirmation: app/manifest.ts NOT Modified

`grep -q "/icons/icon-192.png" app/manifest.ts` exits 0 (manifest still references the same paths). Only the binary PNG bytes changed.

## Confirmation: Forbidden-Column Grep Passed

```
grep -E "select\([^)]*\b(email|owner_id|accepting_contact|bio)\b" lib/data/landing.ts
```
Exit code non-zero (no forbidden columns in any `.select()` call). The fields `is_published` and `banned` appear only as WHERE predicates (`.eq('is_published', true).eq('banned', false)`), never in the column projection.

## pnpm build Status

`pnpm build` was not run during this plan's execution due to the pre-existing typecheck failure in `lib/actions/contact.ts` (`mark_contacts_seen` RPC type — unrelated to Plan 02 scope). No OG image generation warnings were observed during typecheck; `app/opengraph-image.tsx` compiles without errors.

## Pre-existing Issue (Out of Scope)

`lib/actions/contact.ts:241` has a pre-existing TypeScript error: `'mark_contacts_seen'` is not assignable to the `rpc()` function parameter type because `lib/database.types.ts` does not include the `mark_contacts_seen` RPC (migration 007 added it but type generation was not re-run). This is out of Plan 02's scope — deferred to whichever plan re-runs `supabase gen types`.

## Deviations from Plan

None material. One minor deviation:

**[Rule 3 - Blocking] Static Lora-Bold.ttf 404 — used variable font instead**
- **Found during:** Task 3 download step
- **Issue:** `https://github.com/google/fonts/raw/main/ofl/lora/static/Lora-Bold.ttf` returns 404; the `static/` subdirectory does not exist in the google/fonts repo for Lora
- **Fix:** Downloaded the variable font `Lora[wght].ttf` (covers all weights including 700 Bold) and committed as `assets/Lora-Bold.ttf`
- **Impact:** File is larger (212KB vs ~140KB for static), but satori handles variable fonts correctly when `fontWeight: 700` is passed in the `fonts` array
- **Files modified:** assets/Lora-Bold.ttf, .gitignore (excludes the intermediate Lora-Variable.ttf)

## Known Stubs

None. All three data helpers are fully implemented with real Supabase queries. The helpers return empty arrays / fallback counts on error — these are intentional fail-soft behaviors, not stubs.

## Self-Check: PASSED

- `lib/data/landing.ts` exists: FOUND
- `app/opengraph-image.tsx` exists: FOUND
- `assets/Lora-Bold.ttf` exists: FOUND (212KB TrueType)
- `app/apple-icon.png` exists: FOUND (180x180 PNG)
- `public/icons/icon-192.png` exists: FOUND (192x192 PNG)
- Commit 2d295fb exists: FOUND (Task 1)
- Commit 9099474 exists: FOUND (Task 2)
- Commit 548600e exists: FOUND (Task 3)
- Commit cc6743b exists: FOUND (Task 4)
- No forbidden columns in lib/data/landing.ts: VERIFIED
- metadataBase in app/layout.tsx: VERIFIED
- server-only marker line 1 of landing.ts: VERIFIED
