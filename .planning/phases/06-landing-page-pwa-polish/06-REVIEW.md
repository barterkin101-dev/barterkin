---
phase: 06-landing-page-pwa-polish
status: issues_found
files_reviewed: 20
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
---

# Code Review — Phase 06: Landing Page & PWA Polish

## Critical (0)

None.

## Warnings (2)

### W-01 — `(row: any)` cast in `getFoundingMembers` silently drops end-to-end type safety

**File:** `lib/data/landing.ts`
**Confidence:** 82

`createClient` is typed with `Database` throughout the project. The `.map((row: any) => ...)` cast discards all PostgREST-inferred column types. Any column rename in `profiles`, `counties`, `categories`, or `skills_offered` will fail silently at runtime rather than at the TypeScript compile step.

**Fix:** Introduce a typed intermediate that mirrors the select shape:
```ts
type FounderRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  counties: { name: string } | null
  categories: { name: string } | null
  skills_offered: Array<{ skill_text: string; sort_order: number }> | null
}
const profiles = (data ?? [] as FounderRow[]).map((row) => { ... })
```

---

### W-02 — `getCountyCoverage` fetches up to 500 profile rows to derive ≤24 distinct county names

**File:** `lib/data/landing.ts`
**Confidence:** 80

Loads up to 500 `profiles` rows with a joined `counties.name`, then deduplicates in JS and caps at 24. Wastes Supabase free-tier egress (5 GB cap) on every landing render. A `DISTINCT` query delivers at most 24 county name strings in a single round-trip with zero over-fetch.

**Fix:**
```ts
// Query counties reference table with inner join instead
const { data, error } = await supabase
  .from('counties')
  .select('name, profiles!inner(id)')
  .eq('profiles.is_published', true)
  .eq('profiles.banned', false)
  .order('name')
  .limit(24)
```

---

## Info (1)

### I-01 — `test.use()` in `landing-mobile.spec.ts` causes tests to run under both Playwright projects

**File:** `tests/e2e/landing-mobile.spec.ts`
**Confidence:** 80

Module-level `test.use({ ...devices['iPhone SE'] })` means the `chromium` project also inherits iPhone SE viewport/user-agent for this file, doubling CI time with no correctness benefit. The `iphone-se` project in `playwright.config.ts` already applies the device config.

**Fix:** Remove the `test.use()` line; rely on the `iphone-se` project to supply the mobile context.

---

## Verified Clean

- **RLS (migration 008):** Anon profiles policy (`is_published = true AND banned = false`) is safe. Unverified users cannot publish (gated by `current_user_is_verified()` in migration 003), so they never surface through the anon policy. No auth bypass or PII leak.
- **PII protection (`lib/data/landing.ts`):** All three helpers use explicit column lists. `owner_id`, `email`, and all PII fields are never selected.
- **`getClaims()` usage (`app/page.tsx`):** Drives only a CTA label swap, not an access-control decision. Matches established project pattern; does not violate the ban on `getSession()` for trust decisions.
- **`app/layout.tsx`:** Correct skip-nav, `lang="en"`, `metadataBase` with env fallback, `Viewport` export separated from `Metadata` per Next 16 requirements.
- **`app/opengraph-image.tsx`:** `Lora-Bold.ttf` committed and present. Font load pattern correct.
- **`scripts/generate-icons.cjs`:** Maskable safe-zone 15% (correct). Output paths align with manifest declarations.
- **`playwright.config.ts`:** `reuseExistingServer: !CI` correct. `forbidOnly` enforced in CI. `pnpm start` targets production build.
- **Accessibility:** Skip-nav, `aria-hidden` on decorative icons, `role="list"` + `role="listitem"` on grids, descriptive `aria-label` on founder card links. Tap targets ≥56 px (above 44 px minimum).
- **Test cleanup:** `cleanupUser` in `finally` block prevents test-environment pollution.
- **Seed fixture:** Admin client with `autoRefreshToken: false, persistSession: false` — correct for server-side seeding.
