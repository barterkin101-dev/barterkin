# Phase 6: Landing Page & PWA Polish - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 18 (new) + 4 (modified) = 22 total
**Analogs found:** 20 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/008_landing_public_reads.sql` | migration | SQL DDL (RLS) | `supabase/migrations/003_profile_tables.sql` lines 17-20, 194-197, 287-297 | exact (same RLS-policy pattern, different role) |
| `lib/data/landing.ts` | service (data helper) | request-response (read) | `lib/data/directory.ts` | exact (server-only, RSC-called, `createClient()` + Supabase query + error fallback) |
| `app/page.tsx` (modify) | route (server component) | request-response | `app/(app)/directory/page.tsx` | exact (server-component page with metadata + data-helper call + composed components) |
| `app/opengraph-image.tsx` | route (file convention) | build-time render | — (no existing analog; first `next/og` usage in repo) | no analog |
| `app/apple-icon.png` | static asset | build-time | `public/icons/icon-192.png` (generator at `scripts/generate-icons.cjs`) | partial (similar asset class, different destination) |
| `components/landing/LandingNav.tsx` | component | no-data, static | `components/layout/AppNav.tsx` | role-match (different purpose/visual, same "nav bar" structure) |
| `components/landing/Hero.tsx` | component | props-only | `components/directory/DirectoryEmptyState.tsx` | partial (heading + sub + CTA layout) |
| `components/landing/HowItWorks.tsx` | component | no-data, static | `components/directory/DirectoryEmptyState.tsx` | partial (sage card pattern) |
| `components/landing/FoundingMemberStrip.tsx` | component | props-only (list) | `components/directory/DirectoryGrid.tsx` | exact (grid + empty-state branching over list prop) |
| `components/landing/FoundingMemberCard.tsx` | component | props-only | `components/directory/DirectoryCard.tsx` | exact (UI-SPEC §Founding-member strip locks "Identical to DirectoryCard") |
| `components/landing/CountyCoverage.tsx` | component | props-only (list) | `components/directory/DirectoryEmptyState.tsx` + legacy/index.html pill pattern | partial |
| `components/landing/SecondaryCTA.tsx` | component | no-data, static | `components/directory/DirectoryEmptyState.tsx` | partial (CTA card pattern) |
| `scripts/generate-icons.cjs` (modify) | build script | build-time (sharp) | `scripts/generate-icons.cjs` (itself, swap SVG template + add 180×180) | exact (same script, new SVG input + new output path) |
| `playwright.config.ts` (modify) | config | config | `playwright.config.ts` (itself — add project) | exact |
| `tests/e2e/landing-smoke.spec.ts` | test | E2E | `tests/e2e/smoke.spec.ts` (REPLACES) + `tests/e2e/footer-links.spec.ts` | exact (smoke text-assertion pattern) |
| `tests/e2e/landing-metadata.spec.ts` | test | E2E HEAD | `tests/e2e/legal-pages.spec.ts` | role-match (route-level assertions, different DOM targets) |
| `tests/e2e/landing-founding-strip.spec.ts` | test | E2E seeded | `tests/e2e/directory-card-render.spec.ts` + `tests/e2e/directory-empty-states.spec.ts` | exact (seeded profile fixture + empty-state branch) |
| `tests/e2e/landing-mobile.spec.ts` | test | E2E (mobile project) | `tests/e2e/footer-links.spec.ts` | partial (uses route + viewport, no existing mobile project yet) |
| `tests/e2e/smoke.spec.ts` (modify) | test | E2E | `tests/e2e/smoke.spec.ts` (retarget or delete) | exact |
| `legacy/README.md` | doc marker | — | — | no analog |
| `app/layout.tsx` (modify for `metadataBase` + skip-link) | layout | server component | `app/layout.tsx` (itself) | exact |
| `tests/unit/landing-data.test.ts` (optional) | test | unit (mock) | — (no existing unit test mocks Supabase in this repo) | no analog |

---

## Pattern Assignments

### `lib/data/landing.ts` (service, request-response)

**Analog:** `/Users/ashleyakbar/barterkin/lib/data/directory.ts`

**Imports pattern** (lines 1-22 — `lib/data/directory.ts`):
```typescript
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type {
  DirectoryFilters,
  DirectoryProfile,
  DirectoryQueryResult,
  DirectorySkill,
} from '@/lib/data/directory.types'
```
**Apply:** Copy the `import 'server-only'` line-1 invariant and the `createClient` import verbatim. If Pitfall 1 is resolved via RLS (recommended), keep `@/lib/supabase/server`; if resolved via service-role, switch to `@/lib/supabase/admin` and import `supabaseAdmin`.

**Core query pattern** (lines 47-73 — builder with explicit column list, no `.select('*')`):
```typescript
const buildRows = () => {
  let q = supabase
    .from('profiles')
    .select(
      `id, username, display_name, avatar_url,
       counties!inner(name),
       categories!inner(name),
       skills_offered(skill_text, sort_order)`,
    )
  if (filters.categoryId !== null) q = q.eq('category_id', filters.categoryId)
  if (filters.countyId !== null) q = q.eq('county_id', filters.countyId)
  // ...
  return q
    .order('created_at', { ascending: false })
    .range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1)
}
```
**Apply:** `getFoundingMembers()` uses the exact `counties!inner(name), categories!inner(name), skills_offered(skill_text, sort_order)` join shape. Add `.eq('founding_member', true).eq('is_published', true).eq('banned', false).limit(6)`. Never use `.select('*')` (V8 Data Protection — security reserves).

**Count-only (HEAD) pattern** (lines 32-45 — `lib/data/directory.ts`):
```typescript
const buildCount = () => {
  let q = supabase
    .from('profiles')
    .select('id', { head: true, count: 'exact' })
  // ...
  return q
}
```
**Apply:** `getStatCounts()` uses `select('id', { head: true, count: 'exact' })` for total profile count — cheapest possible query.

**Parallel await pattern** (lines 75-79 — `lib/data/directory.ts`):
```typescript
const [countResult, rowsResult] = await Promise.all([
  buildCount(),
  buildRows(),
])
```
**Apply:** Each landing helper that runs multiple queries internally (`getStatCounts` does 2) mirrors this exact shape.

**Error handling pattern** (lines 81-125 — `lib/data/directory.ts`):
```typescript
if (countResult.error) {
  console.error('[getDirectoryRows] count error', {
    code: countResult.error.code,
  })
  return { profiles: [], totalCount: 0, error: 'count_failed' }
}
// ...
} catch (err) {
  console.error('[getDirectoryRows] unexpected', err)
  return { profiles: [], totalCount: 0, error: 'unknown' }
}
```
**Apply:** Wrap every landing helper in try/catch. Return `{ data, error }` tuple shape. On error, return UI-SPEC fallback values (30+ profiles, 2+ counties for stats; empty array for strip/coverage). Additionally fire `posthog-node` `landing_*_error` event per RESEARCH §Pattern 5 before returning.

**Row normalization pattern** (lines 97-115 — top-3 skills slicing):
```typescript
const profiles: DirectoryProfile[] = (rowsResult.data ?? []).map((row) => {
  const allSkills = (row.skills_offered ?? []) as DirectorySkill[]
  const topSkills = [...allSkills]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 3)
  return {
    id: row.id,
    // ...
    counties: row.counties
      ? { name: (row.counties as { name: string }).name }
      : null,
    skills_offered: topSkills,
  }
})
```
**Apply:** `getFoundingMembers()` uses identical skill-sorting + slice-3 pattern. Founder card shape mirrors `DirectoryProfile` for cross-surface parity (UI-SPEC §Founding-member strip locks this).

---

### `app/page.tsx` (route, request-response, MODIFY)

**Analog:** `/Users/ashleyakbar/barterkin/app/(app)/directory/page.tsx`

**Imports + metadata pattern** (lines 1-16):
```typescript
import type { Metadata } from 'next'
import { parseSearchParams } from '@/lib/data/directory-params'
import { getDirectoryRows, PAGE_SIZE } from '@/lib/data/directory'
// ... component imports

export const metadata: Metadata = {
  title: 'Directory',
  description:
    'Find Georgia residents offering skills to trade — woodworking, cooking, music, tech, and more. One community, 159 counties.',
  robots: { index: false, follow: false },
}
```
**Apply:** Use `export const metadata: Metadata` (static, not `generateMetadata`). Landing uses `robots: { index: true, follow: true }` (public page) and adds `openGraph` + `twitter` blocks per UI-SPEC §Meta. Set `metadataBase` in `app/layout.tsx` root (not page).

**Server component body pattern** (lines 18-81):
```typescript
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const rawParams = await searchParams
  const filters = parseSearchParams(rawParams)
  const { profiles, totalCount, error } = await getDirectoryRows(filters)
  // ...
  return (
    <>
      {/* composed components */}
      <DirectoryGrid profiles={profiles} totalCount={totalCount} ... />
    </>
  )
}
```
**Apply:** Landing `LandingPage` has no `searchParams` (static route `/`). Use `Promise.all` for the three data helpers (RESEARCH Pattern 1):
```typescript
const [founders, counties, stats] = await Promise.all([
  getFoundingMembers(),
  getCountyCoverage(),
  getStatCounts(),
])
```

**Rendering-with-error-flag pattern** (line 69 — `DirectoryGrid` receives `hasError={error !== null}`):
**Apply:** Landing components receive `.profiles` / `.counties` from the result tuple; the UI-SPEC says a failed query degrades to empty-state copy, so landing components internally branch on `profiles.length === 0` rather than a separate `hasError` prop.

---

### `components/landing/FoundingMemberCard.tsx` (component, props-only)

**Analog:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryCard.tsx` (UI-SPEC locks: "Identical to DirectoryCard")

**Imports pattern** (lines 1-5):
```typescript
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { DirectoryProfile } from '@/lib/data/directory.types'
```
**Apply:** Copy imports verbatim. Create a `LandingFounderCard` type in `lib/data/landing.ts` mirroring `DirectoryProfile` (UI-SPEC allows distinct DTO since Founding uses a small additional badge).

**Core card pattern + aria-label** (lines 7-27):
```typescript
export function DirectoryCard({ profile }: { profile: DirectoryProfile }) {
  const initial = (profile.display_name ?? '?').charAt(0).toUpperCase()
  const displayName = profile.display_name ?? 'Unnamed member'
  const county = profile.counties?.name ?? 'Unknown County'
  const category = profile.categories?.name ?? ''

  const skillNames = profile.skills_offered
    .slice(0, 3)
    .map((s) => s.skill_text)
  const ariaLabel = [
    `View ${displayName}'s profile`,
    `${county} County`,
    category,
    skillNames.length > 0 ? `offers ${skillNames.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <Link href={`/m/${profile.username}`} aria-label={ariaLabel} className="block">
      <Card className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-6 min-h-[220px] hover:ring-1 hover:ring-sage-light hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none transition-all border-0">
        {/* avatar + name + meta + skills */}
      </Card>
    </Link>
  )
}
```
**Apply:** Copy card shell + aria-label construction verbatim. Add a corner `<Badge>` with copy `"Founding member"` per UI-SPEC §FoundingMemberStrip grid — use `className="bg-clay/10 text-clay ring-1 ring-clay/20"`.

**Avatar fallback + skill chips** (lines 28-60):
```typescript
<Avatar className="h-16 w-16 border border-sage-light flex-shrink-0">
  <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
  <AvatarFallback>{initial}</AvatarFallback>
</Avatar>
// ...
<Badge
  key={skill.skill_text}
  variant="secondary"
  className="h-7 px-2 bg-sage-bg text-forest-deep font-normal"
>
  {skill.skill_text.length > 24 ? `${skill.skill_text.slice(0, 24)}\u2026` : skill.skill_text}
</Badge>
```
**Apply:** Copy verbatim. UI-SPEC `Registry additions required` forbids new primitives — compose from `Avatar`, `Badge`, `Card` already installed.

---

### `components/landing/Hero.tsx` (component, props-only)

**Analog:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryEmptyState.tsx` (heading + sub + CTA card shell)

**Card-like structure** (lines 6-27):
```typescript
export function DirectoryEmptyState() {
  return (
    <div className="py-16 text-center">
      <Card className="max-w-xl mx-auto bg-sage-pale border-sage-light p-8 md:p-12 space-y-6">
        <Users className="h-12 w-12 text-forest-mid mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-forest-deep">
          {"Nobody's here yet."}
        </h2>
        <p className="text-base text-forest-deep leading-[1.5] max-w-md mx-auto">
          {"The directory's still seeding..."}
        </p>
        <Button
          asChild
          size="lg"
          className="h-11 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg"
        >
          <Link href="/profile/edit">Build your profile</Link>
        </Button>
      </Card>
    </div>
  )
}
```
**Apply:**
- Hero uses `<section>` not `<Card>` — forest gradient per UI-SPEC §Hero specifics: `bg-gradient-to-b from-forest-deep via-forest to-forest-mid`.
- Padding per UI-SPEC ratified exceptions: `pt-20 pb-24 sm:pt-28 sm:pb-32`.
- H1: `text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-sage-bg leading-[1.1]`.
- CTAs: **copy the `h-11 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg` button pattern verbatim** from lines 18-22 above. Hero primary uses `h-14` (ratified floor); hero secondary uses `variant="outline"` with white border on gradient.
- Icon-leading pattern from `lucide-react` (use `Sprout` per UI-SPEC §LandingNav + §Hero).

**Stat strip semantic pattern** — UI-SPEC Accessibility Contract says "Stats use `<dl>` with `<dt>` label + `<dd>` value for proper semantics." No existing analog in the codebase — invent cleanly.

---

### `components/landing/FoundingMemberStrip.tsx` (component, props-only list)

**Analog:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryGrid.tsx`

**Grid + empty-state branching pattern** (lines 7-35):
```typescript
export function DirectoryGrid({
  profiles,
  totalCount,
  activeFilterCount,
  hasError,
}: {
  profiles: DirectoryProfile[]
  // ...
}) {
  if (hasError) return <DirectoryErrorState />
  if (totalCount === 0 && activeFilterCount === 0) return <DirectoryEmptyState />
  if (totalCount === 0 && activeFilterCount > 0) return <DirectoryZeroResultsState />

  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
      role="list"
      aria-label="Directory profiles"
    >
      {profiles.map((p) => (
        <div key={p.id} role="listitem">
          <DirectoryCard profile={p} />
        </div>
      ))}
    </div>
  )
}
```
**Apply:**
- Copy the `if profiles.length === 0 → render empty-state JSX inline` pattern.
- Use identical grid `grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3` per UI-SPEC §FoundingMemberStrip grid.
- Keep `role="list"` + per-item `role="listitem"` pattern.
- UI-SPEC §Founding-member strip — empty state locks the fallback copy (`Be a founding member.` / `Claim your spot` CTA to `/signup`).

---

### `components/landing/LandingNav.tsx` (component, no-data)

**Analog:** `/Users/ashleyakbar/barterkin/components/layout/AppNav.tsx`

**Nav structure pattern** (lines 4-22):
```typescript
export function AppNav({ displayName, avatarUrl, unseenContactCount }: { ... }) {
  return (
    <nav className="border-b border-sage-light bg-sage-pale">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl font-bold text-forest-deep">
          Barterkin
        </Link>
        <NavLinks ... />
      </div>
    </nav>
  )
}
```
**Apply:**
- Same `<nav>` + container div structure.
- UI-SPEC changes: background from `bg-sage-pale` → `bg-forest-deep`; brand color from `text-forest-deep` → `text-sage-bg`; add `sticky top-0 z-40 h-16`.
- UI-SPEC §LandingNav specifics — Lora 18px brand, lucide `Sprout` icon; right-side links "How it works" (anchor `#how`), "Directory" (`/directory`), "Join" (clay CTA button `h-9`).
- Mobile (<640px): hide text links via `hidden sm:flex` on the right-side link cluster, keep brand + Join visible.

---

### `components/landing/CountyCoverage.tsx` (component, props-only list)

**Analog:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryEmptyState.tsx` + UI-SPEC §CountyCoverage pill grid

**Section + empty-state pattern** from `DirectoryEmptyState.tsx`:
**Apply:** When `counties.length === 0`, render the UI-SPEC §County coverage empty state (`No counties yet. Yours could be first.` + `Claim your spot` CTA). Use the same centered `Card` shell pattern.

**Pill component pattern** — UI-SPEC locks exact markup:
```tsx
<span className="inline-flex items-center h-9 px-4 rounded-full bg-sage-pale ring-1 ring-sage-light text-sm text-forest-deep">
  {name}
</span>
```
**Container:** `flex flex-wrap justify-center gap-3 max-w-3xl mx-auto`. `aria-label="Counties with members on Barterkin"`.

---

### `components/landing/HowItWorks.tsx` + `SecondaryCTA.tsx` (component, no-data)

**Analog:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryEmptyState.tsx`

**Apply:**
- Both reuse the `Card` + `p-8 md:p-12 space-y-6 bg-sage-pale ring-1 ring-sage-light` surface pattern (exact copy from lines 9-10 of `DirectoryEmptyState.tsx`).
- HowItWorks: 3-column grid per UI-SPEC (`grid-cols-1 gap-4 md:grid-cols-3 md:gap-6`). Step circle `w-12 h-12 rounded-full bg-forest text-sage-bg font-serif text-xl flex items-center justify-center mx-auto mb-5` with `aria-hidden="true"` on the decorative numeral (UI-SPEC Accessibility).
- SecondaryCTA: single centered block. CTA button pattern identical to `DirectoryEmptyState.tsx` line 17-22.

---

### `supabase/migrations/008_landing_public_reads.sql` (migration, RLS DDL)

**Analog:** `/Users/ashleyakbar/barterkin/supabase/migrations/003_profile_tables.sql`

**Counties RLS pattern** (lines 17-20):
```sql
alter table public.counties enable row level security;

create policy "Counties readable by authenticated"
  on public.counties for select to authenticated using (true);
```
**Apply:** Add parallel `to anon` policies for the 3 public-read use cases:
```sql
create policy "Counties readable by anon for landing"
  on public.counties for select to anon using (true);

create policy "Categories readable by anon for landing"
  on public.categories for select to anon using (true);
```

**Profiles RLS pattern with predicate** (lines 295-297):
```sql
create policy "Verified members see published non-banned profiles"
  on public.profiles for select to authenticated
  using (is_published = true AND public.current_user_is_verified() AND banned = false);
```
**Apply:** Anon version DOES NOT include `current_user_is_verified()` (it's anon):
```sql
create policy "Public landing reads published non-banned profiles"
  on public.profiles for select to anon
  using (is_published = true AND banned = false);
```

**Skills_offered RLS pattern** — similar `to anon` policy scoped through profile-join (use the `(select 1 from profiles where id = skills_offered.profile_id and is_published = true and banned = false)` sub-predicate so only skills attached to public profiles read).

**Header comment style** (lines 1-5):
```sql
-- Phase 3 — Profile & Georgia Gate
-- Requirements: PROF-01..PROF-14, GEO-01, GEO-02
-- See: .planning/phases/03-profile-georgia-gate/03-RESEARCH.md §Database Schema
-- Depends on: 002_auth_tables.sql (public.current_user_is_verified())
-- Revision iter-1 fix: ...
```
**Apply:** Use identical comment block: `-- Phase 6 — Landing public reads`, `-- Requirements: LAND-02`, `-- See: .planning/phases/06-landing-page-pwa-polish/06-RESEARCH.md Pitfall 1`.

---

### `scripts/generate-icons.cjs` (build script, MODIFY)

**Analog:** `/Users/ashleyakbar/barterkin/scripts/generate-icons.cjs` (self — replace SVG template, add 180×180 path)

**Current generator pattern** (lines 8-25):
```javascript
async function makeIcon(size, filename, maskable = false) {
  const pad = maskable ? Math.floor(size * 0.1) : 0;
  const inner = size - pad * 2;
  const fontSize = Math.floor(inner * 0.6);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${forest}"/>
      <text x="50%" y="50%"
            text-anchor="middle" dominant-baseline="central"
            font-family="Georgia, Lora, serif" font-weight="700"
            font-size="${fontSize}" fill="${sage}">B</text>
    </svg>
  `;
  await sharp(Buffer.from(svg)).png().toFile(filename);
  console.log(`wrote ${filename}`);
}
```
**Apply:**
- Replace the `<text>B</text>` SVG with a sprout/leaf illustration (UI-SPEC §PWA install prompt polish item 1: "sprout-leaf mark in forest on sage-bg circular background").
- Maskable safe-zone: UI-SPEC says 15% — update `pad = maskable ? Math.floor(size * 0.15) : 0` (current is 10%).
- Emit IIFE at lines 27-31:
```javascript
(async () => {
  await makeIcon(192, 'public/icons/icon-192.png', false);
  await makeIcon(512, 'public/icons/icon-512.png', false);
  await makeIcon(512, 'public/icons/icon-maskable.png', true);
  await makeIcon(180, 'app/apple-icon.png', false); // NEW line per UI-SPEC §PWA item 3
})().catch((e) => { console.error(e); process.exit(1); });
```

---

### `playwright.config.ts` (config, MODIFY)

**Analog:** `/Users/ashleyakbar/barterkin/playwright.config.ts` (self — add project entry)

**Current projects block** (lines 15-17):
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
],
```
**Apply — add iPhone SE project:**
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'iphone-se', use: { ...devices['iPhone SE'] } },
],
```
Playwright's `devices['iPhone SE']` returns a 320×568 viewport (1st gen) — matches UI-SPEC §Responsive "Mobile floor: 360px viewport". Tests that require the floor filter with `test.use({ ...devices['iPhone SE'] })` or the project name via `--project=iphone-se`.

---

### `tests/e2e/landing-smoke.spec.ts` (test, E2E, REPLACES `smoke.spec.ts`)

**Analog:** `/Users/ashleyakbar/barterkin/tests/e2e/footer-links.spec.ts` + existing `/Users/ashleyakbar/barterkin/tests/e2e/smoke.spec.ts`

**Describe + assertion pattern** (`footer-links.spec.ts` lines 3-25):
```typescript
import { test, expect } from '@playwright/test'

test.describe('footer links (AUTH-10 + UI-SPEC)', () => {
  test(`footer shows legal links on /`, async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: /terms/i })).toBeVisible()
  })
})
```
**Apply:**
```typescript
test.describe('landing smoke (LAND-01, LAND-02, GEO-03)', () => {
  test('landing page renders hero h1', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: /trade skills with your georgia neighbors/i }),
    ).toBeVisible()
  })

  test('landing page shows honor-system copy (GEO-03)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/georgia residents only/i)).toBeVisible()
  })

  test('hero primary CTA links to /signup', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('link', { name: /join the network/i }),
    ).toHaveAttribute('href', '/signup')
  })
})
```

**Retire `smoke.spec.ts`:** Current file (Read at lines 1-13) asserts "Barterkin foundation" — **delete** the file or retarget to the landing hero heading.

---

### `tests/e2e/landing-metadata.spec.ts` (test, E2E HEAD)

**Analog:** `/Users/ashleyakbar/barterkin/tests/e2e/legal-pages.spec.ts`

**Route assertion pattern** (`legal-pages.spec.ts` lines 1-35):
```typescript
import { test, expect } from '@playwright/test'

test.describe('legal pages (AUTH-10 + GEO-04)', () => {
  test('/legal/tos renders with H1 "Terms of Service"', async ({ page }) => {
    await page.goto('/legal/tos')
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible()
  })
})
```
**Apply — use page HEAD assertions via `page.locator('meta[property="og:title"]')` (Playwright can read head tags):**
```typescript
test.describe('landing metadata (LAND-04)', () => {
  test('renders og:title + og:description + og:image meta tags', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[property="og:title"]'))
      .toHaveAttribute('content', /barterkin.*georgia/i)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /.+/)
  })

  test('twitter card = summary_large_image', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="twitter:card"]'))
      .toHaveAttribute('content', 'summary_large_image')
  })

  test('manifest.webmanifest returns 200 + valid JSON', async ({ request }) => {
    const resp = await request.get('/manifest.webmanifest')
    expect(resp.status()).toBe(200)
    const json = await resp.json()
    expect(json.theme_color).toBe('#2d5a27')
  })
})
```

---

### `tests/e2e/landing-founding-strip.spec.ts` (test, E2E seeded)

**Analog:** `/Users/ashleyakbar/barterkin/tests/e2e/directory-card-render.spec.ts` + `/Users/ashleyakbar/barterkin/tests/e2e/directory-empty-states.spec.ts`

**Fixture import + env guard + seed pattern** (`directory-card-render.spec.ts` lines 4-42):
```typescript
import { test, expect } from '@playwright/test'
import {
  createVerifiedUser,
  seedPublishedProfile,
  cleanupUser,
} from './fixtures/directory-seed'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('DIR-02: directory card renders all required fields', () => {
  let subjectId = ''
  const stamp = Date.now()

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    subjectId = await createVerifiedUser(`dir-subj-${stamp}@example.test`, viewerPassword)
    await seedPublishedProfile({
      ownerId: subjectId,
      display_name: subjectName,
      category_id: 2,
      county_id: 13001,
      skills: ['baking', 'sourdough', 'cakes', 'pastries', 'bread'],
    })
  })

  test.afterAll(async () => {
    if (subjectId) await cleanupUser(subjectId)
  })
})
```
**Apply:** Reuse `tests/e2e/fixtures/directory-seed` helpers. Seed a founder profile with `founding_member: true` (may need to extend the fixture to accept this flag). Test branches:
1. Populated: `founding_member = true, is_published = true` → strip shows card + links to `/m/{username}`.
2. Empty: zero founders → strip shows UI-SPEC empty-state heading "Be a founding member."

**Empty-state assertion pattern** (`directory-empty-states.spec.ts` lines 65-72):
```typescript
await expect(
  page.getByRole('heading', { name: 'No profiles match those filters.' }),
).toBeVisible({ timeout: 10_000 })
const clearLink = page.getByRole('link', { name: 'Clear filters' })
await expect(clearLink).toHaveAttribute('href', '/directory')
```
**Apply to landing:**
```typescript
await expect(page.getByRole('heading', { name: /be a founding member/i })).toBeVisible()
await expect(page.getByRole('link', { name: /claim your spot/i }))
  .toHaveAttribute('href', '/signup')
```

---

### `tests/e2e/landing-mobile.spec.ts` (test, E2E mobile project)

**Analog:** `/Users/ashleyakbar/barterkin/tests/e2e/footer-links.spec.ts` (basic route navigation pattern)

**Apply — horizontal-scroll + tap-target assertion** (no existing analog; new shape):
```typescript
import { test, expect, devices } from '@playwright/test'

test.use({ ...devices['iPhone SE'] })

test.describe('landing mobile (LAND-03)', () => {
  test('no horizontal scroll at 360px', async ({ page }) => {
    await page.goto('/')
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHScroll).toBe(false)
  })

  test('hero primary CTA ≥ 44px tap target', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /join the network/i }).first()
    const box = await cta.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})
```
**Note:** Requires the iphone-se project added to `playwright.config.ts` for CLI run `--project=iphone-se`.

---

### `app/layout.tsx` (MODIFY for `metadataBase` + skip-link)

**Analog:** `/Users/ashleyakbar/barterkin/app/layout.tsx` (self)

**Current metadata + viewport** (lines 11-24):
```typescript
export const metadata: Metadata = {
  title: 'Barterkin',
  description: "Georgia's community skills exchange.",
  appleWebApp: { capable: true, title: 'Barterkin', statusBarStyle: 'default' },
  applicationName: 'Barterkin',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#2d5a27',
  width: 'device-width',
  initialScale: 1,
}
```
**Apply — add `metadataBase`** (RESEARCH Pitfall 2):
```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'),
  title: 'Barterkin',
  // ... existing fields
}
```

**Apply — add skip link** (RESEARCH Example 4; UI-SPEC Accessibility Contract):
```tsx
<body className="font-sans bg-sage-bg text-forest-deep min-h-screen antialiased">
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-forest focus:text-sage-bg focus:px-4 focus:py-2 focus:rounded"
  >
    Skip to content
  </a>
  <PostHogProvider>
    {children}
    <Footer />
  </PostHogProvider>
  <Analytics />
</body>
```
Landing's `<main>` (in `app/page.tsx`) must receive `id="main"` to match the anchor target.

---

### `app/opengraph-image.tsx` (route, file convention) — NO CODEBASE ANALOG

No existing `ImageResponse` / `next/og` usage in the repo. Planner must reference:
- **RESEARCH §Pattern 2** (Generated social card via `next/og`) for the skeleton.
- **RESEARCH §Pitfall 4** (Lora not rendered in `ImageResponse`) for `readFile` font loading.
- **UI-SPEC §Meta** OG image content brief for color/layout.

**Alternative (UI-SPEC-preferred for determinism):** produce static `public/og.png`; use `metadata.openGraph.images` array in `app/page.tsx`. Planner chooses at plan time (RESEARCH Open Question 2).

---

### `legacy/README.md` — NO CODEBASE ANALOG

New file; UI-SPEC §Legacy Netlify retirement describes intent only. Content is a plain README marker:
```markdown
# Legacy — not deployed

This directory preserves the pre-Next.js static site that was served from Netlify
(at a Netlify-owned subdomain, not barterkin.com) prior to Phase 6 launch.

Retained for historical visual-identity reference only. Do not deploy.
```

---

### `tests/unit/landing-data.test.ts` (OPTIONAL, unit, NO CODEBASE ANALOG)

No existing unit test in this repo mocks the Supabase client. RESEARCH §Wave 0 Gaps marks this OPTIONAL. If planner includes it, reference RESEARCH §Pattern 5 for the fail-soft shape and use Vitest's `vi.mock('@/lib/supabase/server')` pattern to inject the error branch.

---

## Shared Patterns

### Server-only marker
**Source:** `/Users/ashleyakbar/barterkin/lib/data/directory.ts` line 14 and `/Users/ashleyakbar/barterkin/lib/supabase/admin.ts` line 1
**Apply to:** `lib/data/landing.ts` (MUST be line 1)
```typescript
import 'server-only'
```
Enforces server-only import boundary; importing from a Client Component triggers a build error.

### Supabase server client (RLS-honoring path)
**Source:** `/Users/ashleyakbar/barterkin/lib/supabase/server.ts` lines 1-27
**Apply to:** `lib/data/landing.ts` (Pitfall 1 resolution via RLS migration — recommended)
```typescript
import { createClient } from '@/lib/supabase/server'
// ...
const supabase = await createClient()
```
Note: this client uses the anon key and respects RLS. The new migration `008_landing_public_reads.sql` MUST grant `to anon` SELECT on `profiles`, `counties`, `categories`, `skills_offered` (scoped) before these queries return rows for unauthenticated visitors.

### Service-role client (fallback — if Pitfall 1 resolved via admin)
**Source:** `/Users/ashleyakbar/barterkin/lib/supabase/admin.ts` lines 1-16
**Apply to:** `lib/data/landing.ts` (ONLY if RLS approach is rejected at plan-review)
```typescript
import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
```
Bypasses RLS — must filter `is_published = true AND banned = false AND email_confirmed = true` in the query WHERE clause explicitly. Still must NEVER select `email`, `owner_id`, or `accepting_contact`.

### Error fallback (graceful degradation — never 500 on marketing front door)
**Source:** `/Users/ashleyakbar/barterkin/lib/data/directory.ts` lines 81-125 + UI-SPEC §Error state
**Apply to:** All three landing data helpers
```typescript
try {
  const supabase = await createClient()
  const { data, error } = await supabase.from(...).select(...)
  if (error) throw error
  return { profiles: data ?? [], error: null }
} catch (e) {
  console.error('[getFoundingMembers]', e)
  // + posthog-node capture per RESEARCH Pattern 5
  return { profiles: [], error: String(e) }
}
```
Return fallback values from UI-SPEC § (30+ profiles, 2+ counties, empty array for strip/coverage). Never throw to the RSC — the UI-SPEC locks "never show a user-facing error page on the public marketing front door."

### PostHog server-side error capture (new pattern for this repo)
**Source:** RESEARCH §Pattern 5 (no existing codebase analog — `posthog-node` is in `package.json` but not invoked server-side yet)
**Apply to:** Every catch block in `lib/data/landing.ts`
```typescript
import { PostHog } from 'posthog-node'

const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    })
  : null
// in catch:
posthog?.capture({
  distinctId: 'landing_server',
  event: 'landing_founding_strip_error',
  properties: { error: String(e) },
})
await posthog?.shutdown()
```
Event names per UI-SPEC §PostHog Events: `landing_founding_strip_error`, `landing_county_coverage_error`, `landing_stat_strip_error`.

### Card surface styling (sage-pale theme)
**Source:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryCard.tsx` line 27 + `/Users/ashleyakbar/barterkin/components/directory/DirectoryEmptyState.tsx` line 9
**Apply to:** `FoundingMemberCard`, `HowItWorks` step cards, `SecondaryCTA` card shell
```tsx
<Card className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-6 min-h-[220px] hover:ring-1 hover:ring-sage-light hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none transition-all border-0">
```
UI-SPEC §Color locks this as the secondary (30%) surface treatment.

### Primary CTA (clay accent) button
**Source:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryEmptyState.tsx` lines 17-22
**Apply to:** Hero primary CTA, SecondaryCTA primary, empty-state CTAs
```tsx
<Button
  asChild
  size="lg"
  className="h-11 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg"
>
  <Link href="/signup">Claim your spot</Link>
</Button>
```
Hero primary overrides to `h-14` (UI-SPEC ratified tap-target floor for hero). Do not use `variant="default"` directly — the shadcn primary uses clay already per `globals.css` but the explicit className ensures stability.

### Aria-label link pattern
**Source:** `/Users/ashleyakbar/barterkin/components/directory/DirectoryCard.tsx` lines 16-23
**Apply to:** `FoundingMemberCard` (UI-SPEC locks "Same pattern as DirectoryCard")
```typescript
const ariaLabel = [
  `View ${displayName}'s profile`,
  `${county} County`,
  category,
  skillNames.length > 0 ? `offers ${skillNames.join(', ')}` : '',
]
  .filter(Boolean)
  .join(' — ')
```

### E2E seeded-profile test shell
**Source:** `/Users/ashleyakbar/barterkin/tests/e2e/directory-card-render.spec.ts` lines 4-42
**Apply to:** `tests/e2e/landing-founding-strip.spec.ts`
- Same fixture import (`./fixtures/directory-seed`)
- Same `hasEnv` guard on `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Same `beforeAll` seed / `afterAll` cleanup pattern
- **Extension needed:** fixture `seedPublishedProfile` may need a `founding_member?: boolean` option — confirm before writing the test.

### Getting authed-user state from RSC (for CTA-swap)
**Source:** `/Users/ashleyakbar/barterkin/components/layout/Footer.tsx` lines 12-17 (NOT `AppNav` — AppNav uses `getUser()` for trust decisions)
**Apply to:** `app/page.tsx` (for the "authed viewer sees 'Go to your dashboard'" CTA swap per UI-SPEC)
```typescript
const supabase = await createClient()
const { data } = await supabase.auth.getClaims()
const isAuthed = !!data?.claims?.sub
```
UI-SPEC §Page-level CTA ordering rule locks the swap. `getClaims()` is OK here because this is a UI-presentation decision, not a trust gate (landing is fully public). CLAUDE.md bans `getSession()` but allows `getClaims()` for non-trust UX.

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/opengraph-image.tsx` | route (file convention) | build-time render | First `next/og` `ImageResponse` usage in repo. Use RESEARCH §Pattern 2 + §Pitfall 4 (font loading via `readFile`). |
| `legacy/README.md` | doc marker | — | Pure prose marker; no pattern to copy. UI-SPEC §Legacy Netlify retirement describes content. |
| `tests/unit/landing-data.test.ts` | unit test (mock) | unit | No existing repo test mocks `@/lib/supabase/server`. Planner may defer this per RESEARCH §Wave 0 Gaps (marked OPTIONAL). |
| `assets/Lora-Bold.ttf` | font asset | — | Not a code file; planner must commit via download (see RESEARCH §Pitfall 4). Only needed if OG image is generated (not if static `public/og.png` is chosen). |

---

## Metadata

**Analog search scope:**
- `app/`, `app/(app)/`, `app/(auth)/`
- `components/directory/`, `components/layout/`, `components/ui/`, `components/auth/`
- `lib/data/`, `lib/supabase/`
- `supabase/migrations/`
- `tests/e2e/`
- `scripts/`
- `playwright.config.ts`

**Files scanned:** 38 directly read (source), plus glob/grep enumeration of ~80 files

**Key patterns identified:**
- All data helpers use the `import 'server-only'` line-1 invariant and return `{ data, error }` tuples — new `lib/data/landing.ts` is a direct fit for this template
- Server components perform data fetching in the page file itself (`app/(app)/directory/page.tsx` pattern); composed UI components receive props
- RLS policies are always explicit `to {role}` and use predicate helpers like `public.current_user_is_verified()` — new migration follows the same shape, new role is `anon`
- All card-style UI (Directory empty-state, zero-results, error, DirectoryCard itself) uses the `bg-sage-pale ring-1 ring-sage-light rounded-lg` surface pattern and the `h-11 bg-clay hover:bg-clay/90 text-sage-bg` CTA pattern — landing components compose from these two building blocks
- E2E tests use a common fixture (`./fixtures/directory-seed`), `hasEnv` env-guard, and `createVerifiedUser` + `seedPublishedProfile` helpers; landing-founding-strip test reuses this verbatim (with one possible fixture extension for `founding_member`)

**Pattern extraction date:** 2026-04-21
