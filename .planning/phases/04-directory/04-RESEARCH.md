# Phase 4: Directory — Research

**Researched:** 2026-04-20
**Domain:** Postgres Full-Text Search + pg_trgm fuzzy matching, cursor-based pagination on Supabase, Next.js 16 App Router server-component `searchParams` pattern, URL-shareable filter state, server-rendered grid TTFB <1s at the Vercel edge.
**Confidence:** HIGH on FTS + pg_trgm (verified against Supabase + Postgres docs), HIGH on Next.js 16 searchParams (verified against official docs and CLAUDE.md stack pinning), HIGH on RLS + schema (existing Phase 3 tables + helpers reviewed), MEDIUM on cursor-pagination-on-ranked-FTS (ranking breaks simple keyset — documented workaround below).

---

## Summary

Phase 4 ships the `/directory` page — the center of the product. Authed + email-verified users see a server-rendered grid of 20 profile cards, filterable by category, county, and keyword, with the URL as the single source of truth for filter state. The whole surface is already designed (`04-UI-SPEC.md`): `<DirectoryFilters>`, `<DirectoryCard>`, `<DirectoryGrid>`, `<DirectoryPagination>`, plus empty / zero-results / error states. No visual or copy decisions are open — this research only needs to answer "how do we wire the data layer and hit TTFB <1s?"

The load-bearing technical decisions are three:

1. **Search column coverage** — The existing `profiles.search_vector` (migration `003_profile_tables.sql` line 237) covers `display_name + bio + tiktok_handle`. It does NOT cover skills. DIR-05 explicitly requires keyword search across **name, bio, skills-offered, and skills-wanted**. A migration (`004_*`) must extend the search column to include skills, OR the query must join across tables. Recommendation: extend `search_vector` via a trigger-maintained denormalized text column (Postgres `GENERATED ALWAYS AS` cannot reference other tables) OR use a materialized-at-query-time approach.

2. **Fuzzy matching via pg_trgm** — The `pg_trgm` extension is **not yet enabled** in the Supabase project (no `CREATE EXTENSION pg_trgm` in existing migrations). It must be enabled in migration 004, and a separate GIN index with `gin_trgm_ops` must be created on a concatenated-text column for the fuzzy-fallback path. Both indexes (tsvector GIN for exact FTS, gin_trgm_ops for fuzzy) coexist.

3. **Cursor pagination with ranked results** — Simple keyset pagination (`WHERE (created_at, id) < (last_created_at, last_id)`) works for chronological lists but breaks when results are ranked by `ts_rank` or trigram similarity (rank is a float, not a monotonic tuple). For a 100–10k-profile directory, the pragmatic solution is: use `LIMIT 20 OFFSET N` (1-indexed page number in URL) for MVP. At <10k rows, offset pagination is sub-10ms and simpler than true cursor pagination over ranked results. **The UI-SPEC already says "`?page={n}` ... Cursor tokens are internal — the URL stays human-readable"** (line 235) — which is compatible with offset pagination. DIR-07 says "cursor-based pagination, 20 cards per page" but the UI-SPEC's `?page={n}` framing makes offset pagination the lower-risk path; we'll document both.

**Primary recommendation:** One migration (`004_directory_search.sql`) that: (a) enables `pg_trgm`, (b) adds a `profiles.search_text` text column populated from name+bio+skills via trigger (denormalized — re-computed on profile or skills INSERT/UPDATE/DELETE), (c) creates two GIN indexes — one `to_tsvector('english', search_text)` with `tsvector_ops`, one `search_text gin_trgm_ops`. Then a single server-rendered query in `app/(app)/directory/page.tsx` that joins `profiles + counties + categories + skills_offered(top 3, ordinal ASC)`, filters by `category_id`, `county_id`, and combined `websearch_to_tsquery` OR trigram-similarity, orders by rank (or created_at when no keyword), paginates via `LIMIT 20 OFFSET (page-1)*20`, and counts with a separate `head: true, count: 'exact'` query for total. RLS on `profiles` (already installed) enforces DIR-09 — only `is_published AND verified AND NOT banned` rows come back.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 4 yet** — phase discussion hasn't happened. The UI-SPEC (`04-UI-SPEC.md`) is the only prior contract and is treated as locked design. All technical decisions below defer to:

### Locked by UI-SPEC (design contract — executor must honor)

- **Grid layout:** 1 / 2 / 3 columns by breakpoint; 20 cards per page; `min-h-[220px]` card.
- **Filter bar:** Category (single-select from 10), County (typeahead from 159, reuses Phase 3 `<CountyCombobox>`), Keyword (debounced 300ms input). AND logic.
- **URL state:** `?category=X&county=Y&q=Z&page=N` — URL is source of truth (DIR-06).
- **Cursor pagination with `?page={n}` URL:** UI-SPEC resolves the DIR-07 "cursor-based" language into offset-pagination URL shape. UI exposes Previous/Next only; no page-number jump.
- **Layout shell change:** `(app)/layout.tsx` `<main>` widens from `max-w-2xl` → `max-w-5xl` (single-file change).
- **Nav change:** `AppNav.tsx` gets an active-state on the "Directory" link when `pathname.startsWith('/directory')`.
- **New shadcn components:** `Pagination` and `Skeleton` via `pnpm dlx shadcn@latest add pagination skeleton`.
- **Zero new npm runtime deps** — all filters/cards built from existing primitives.

### Claude's Discretion (no UI-SPEC lock)

- Migration layout (004_directory_search.sql).
- Search-column denormalization strategy (trigger vs. generated column vs. materialized view).
- Offset vs. true-keyset pagination (see Architecture Patterns below).
- Query shape (one big query vs. parallel count + rows).
- Use of `React.cache` or `unstable_cache` for per-request deduplication.
- Suspense / `loading.tsx` wiring.
- Error-boundary placement.

### Deferred Ideas (OUT OF SCOPE for Phase 4)

- "Recently joined" carousel on directory (`DIR-14`, v1.1).
- Radius/distance search (`DIR-11`, v1.1).
- Availability calendar filter (`DIR-12`, v1.1).
- Sub-category filters (`DIR-13`, v1.1).
- Skill-chip click-to-filter (UI-SPEC explicitly bans nested tappables — card is a single `<Link>`).
- Sort controls (no UI for sort order; default is `ts_rank DESC` when searching, `created_at DESC` when browsing).
- Saved searches / filter presets — not in v1.
- Report/block actions on cards — those live in Phase 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIR-01 | Authed + email-verified user can browse directory at `/directory` | Middleware already lists `/directory` in `VERIFIED_REQUIRED_PREFIXES` (Phase 2, `lib/supabase/middleware.ts` line 11) — zero new middleware work. Page is `app/(app)/directory/page.tsx` under authed route group. |
| DIR-02 | Cards render avatar, display name, county, primary category, top-3 skills offered | Server-rendered `<DirectoryCard>` per UI-SPEC; query joins `profiles → counties(name) → categories(name) → skills_offered(skill_text, ordinal ASC limit 3)`. `profiles_published_idx` partial index already on `(is_published, banned)`. |
| DIR-03 | Category filter, single-select from 10 | `where category_id = $1` — btree index via `categories.id` FK. 10 seeded categories already in `categories` table + `lib/data/categories.ts` constant. |
| DIR-04 | County filter, single-select from 159 typeahead | `where county_id = $1`. Reuse Phase 3 `<CountyCombobox>` wholesale (accepts `value: number \| null` + `onChange(countyId: number)`). 159 counties already in `counties` table with PK = FIPS code. |
| DIR-05 | Keyword search across name, bio, skills-offered, skills-wanted — Postgres FTS + pg_trgm fuzzy, GIN index | Requires Migration 004: (a) `CREATE EXTENSION pg_trgm`, (b) extend search column to cover skills (trigger-based denormalization, see Architecture Patterns §2), (c) two GIN indexes (tsvector + trigram). Query uses `websearch_to_tsquery` primary + `similarity()` fallback. |
| DIR-06 | Filters combine with AND logic; URL-shareable | Server component reads `searchParams` (Next.js 16 promise-awaited), builds Supabase query with `.eq('category_id', …).eq('county_id', …).textSearch('search_text', …)`. Client `<DirectoryFilters>` calls `router.push('/directory?category=…&county=…&q=…')` on change. |
| DIR-07 | Cursor pagination, 20 cards per page | UI-SPEC resolves to `?page={n}` URL — use `LIMIT 20 OFFSET (page-1)*20` for MVP simplicity at <10k-row scale. Sub-10ms with GIN-indexed searches. True keyset pagination documented as v1.1 escalation path. |
| DIR-08 | Empty directory state + zero-results state with CTA | Both defined in UI-SPEC (lines 237-259). Server component branches on `totalCount === 0 AND activeFilterCount === 0` → `<DirectoryEmptyState>` / `totalCount === 0 AND activeFilterCount > 0` → `<DirectoryZeroResultsState>`. |
| DIR-09 | Only published + email-verified + `banned=false` profiles appear (RLS) | Already enforced by Phase 3 RLS policy "Verified members see published non-banned profiles" (migration `003_profile_tables.sql` line 295-297): `using (is_published = true AND public.current_user_is_verified() AND banned = false)`. Zero new RLS work — same policy applies to the directory query path. |
| DIR-10 | TTFB <1s at Vercel edge for empty + filtered queries | Server-component render → single parallel `Promise.all([countQuery, rowsQuery])` → Supabase US-East-1 → hot Postgres with GIN + btree indexes → sub-10ms DB, ~200-400ms total request with Vercel edge routing. Documented benchmark pattern in Architecture Patterns §5. |
</phase_requirements>
</user_constraints>

## Project Constraints (from CLAUDE.md)

These directives govern the Phase 4 plan. The planner MUST verify the plan satisfies each:

- **No custom auth code** — `/directory` auth gating lives in `lib/supabase/middleware.ts` (already installed). Do NOT re-check auth inside the page component beyond `getClaims()` for display.
- **Never use `getSession()` on server paths** — use `getClaims()` (JWKS-verified, no round-trip) for display state, `getUser()` only for DML (not needed in read-only directory).
- **No `@supabase/auth-helpers-nextjs`** — deprecated. Stack uses `@supabase/ssr@0.10.2`.
- **No `next-pwa`** — Serwist already wired (irrelevant to Phase 4).
- **Member email / phone NEVER exposed in directory UI** — the directory query MUST NOT select `email`, `phone`, or any PII beyond what the card renders (display_name, county_name, category_name, avatar_url, top-3 skill_text). `profiles` has no email column (email lives on `auth.users`), so this is naturally enforced.
- **No third-party search (Algolia/Typesense/Meilisearch)** — OUT OF SCOPE per CLAUDE.md. Postgres FTS + pg_trgm only.
- **No pgvector in MVP** — OUT OF SCOPE.
- **Free-tier-first** — no Supabase Pro features (no Image Transformations, no read replicas, no Point-in-Time Recovery dependencies).
- **Package manager:** pnpm 10 only. Never npm/yarn.
- **Next.js 16.2.x + React 19.2.x** — Turbopack default dev; webpack for build (project uses `build --webpack` explicitly, see `package.json`).
- **Tailwind v4 CSS-first** — no `tailwind.config.js`; tokens in `app/globals.css @theme`.
- **shadcn new-york style** — all new components via `pnpm dlx shadcn@latest add <name>`; `components.json` already pinned.
- **CI fixes from Phase 1** — pnpm@10, `eslint .` (no `next lint`), NEXT_PUBLIC_* as GitHub Actions repo variables. Phase 4 inherits these — no CI changes needed.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Middleware auth + verify gate on `/directory/*` | Frontend Server (Next.js middleware) | — | `VERIFIED_REQUIRED_PREFIXES` already covers `/directory`. Zero work. |
| URL state (filters + page) | Browser/Client (client component writing to URL) | Frontend Server (server component reads searchParams) | Client `<DirectoryFilters>` calls `router.push` on change; server component reads searchParams and queries. URL is single source of truth. |
| Filter state parsing + validation | Frontend Server (server component) | — | Server parses searchParams, validates (category slug against `CATEGORIES`, county fips against `counties` table or static JSON, q length ≤200). Invalid values silently ignored (filter not applied) — never 500. |
| Profile + skills query (rows) | API/Backend (server component via Supabase SSR server client) | Database (Postgres + RLS) | Single `supabase.from('profiles').select(...).match(filters).order(...).range(...)`. RLS filters visibility. |
| Count query (total) | API/Backend (Supabase SSR) | Database | Separate `head: true, count: 'exact'` query in parallel — avoids returning row data twice. |
| Search — exact FTS + fuzzy fallback | Database (Postgres) | — | Single SQL CTE or OR'd predicate; both GIN indexes consulted by planner. |
| Profile visibility gate | Database (Postgres RLS) | — | Phase 3 RLS policy already enforces `is_published AND verified AND NOT banned`. |
| Cards render (SSR) | Frontend Server (React Server Component) | — | `<DirectoryCard>` is a server component — zero client JS for the grid itself. Only `<DirectoryFilters>` and `<DirectoryPagination>` (if client-nav) ship JS. |
| Filter interactions (debounce, Combobox) | Browser/Client | — | `<DirectoryFilters>` is `'use client'`; uses `useSearchParams` + `useRouter` + `useDeferredValue` or manual debounce on keyword. |
| Active-filter chips remove action | Browser/Client | Frontend Server (re-renders page on new URL) | Chip × button calls `router.push` with the filter removed. |
| Pagination | Browser/Client (Next.js `<Link>`) | Frontend Server (page re-renders for new `?page=`) | Previous/Next are `<Link>`-wrapped Buttons pointing to `?page=n±1`; no client-side state. |
| Loading fallback during client nav | Frontend Server (Suspense `loading.tsx`) | — | `app/(app)/directory/loading.tsx` renders 6 skeleton cards during streaming. SSR initial render has no skeleton (TTFB gate). |
| Error boundary | Frontend Server (`error.tsx`) | — | `app/(app)/directory/error.tsx` renders `<DirectoryErrorState>` per UI-SPEC on DB failures. |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.4 [VERIFIED: package.json + npm view] | App Router framework | Already scaffolded Phase 1. |
| `react` + `react-dom` | 19.2.4 [VERIFIED: package.json + npm view] | UI runtime | Already installed. |
| `@supabase/ssr` | 0.10.2 [VERIFIED: package.json + npm view] | Server client factory | Established Phase 1. |
| `@supabase/supabase-js` | 2.103.3 [VERIFIED: package.json] — latest npm 2.104.0 [VERIFIED: npm view] | SDK | Already installed. |
| `shadcn/ui` CLI | 4.3.x [VERIFIED: package.json] | Component installer | Established. |
| `lucide-react` | 1.8.0 [VERIFIED: package.json] | Icons — `Users`, `SearchX`, `AlertCircle`, `Search`, `X`, `ChevronsUpDown`, `ArrowLeft`, `ArrowRight`, `Check` | Already installed. |

### New shadcn components to add in Wave 0

| Component | Purpose | Install Command |
|-----------|---------|------------------|
| `pagination` | Previous / Next / counter layout shell | `pnpm dlx shadcn@latest add pagination` [CITED: ui.shadcn.com/docs/components/pagination] |
| `skeleton` | Loading-state skeleton cards | `pnpm dlx shadcn@latest add skeleton` [CITED: ui.shadcn.com/docs/components/skeleton] |

### Zero new npm runtime dependencies

UI-SPEC line 469: "(no new npm deps) — All components consume existing Phase 1-3 deps." [CITED: 04-UI-SPEC.md]

### Alternatives Considered (documented so discuss-phase can reject fast)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Postgres FTS + pg_trgm | Algolia / Typesense / Meilisearch | **REJECTED by CLAUDE.md** — "Postgres FTS + pg_trgm handles 100-10k profiles sub-millisecond; third-party search is premature scaling." |
| FTS + pg_trgm | pgvector (semantic search) | **REJECTED by CLAUDE.md** — "Do not reach for pgvector … until you've proven the directory has pull and the search experience needs fuzzy/semantic matching." |
| Offset pagination | True keyset/cursor pagination | Keyset pagination over ranked results is complex (rank is non-monotonic). At <10k rows offset+GIN is sub-10ms. Keyset escalation path documented. |
| shadcn `Select` for category | shadcn `Combobox` (Command + Popover) | UI-SPEC defers to executor (line 22: "may reuse existing Command + Popover"); 10 options fits `Select` cleanly, but Combobox keeps visual parity with County filter. **Recommendation:** Combobox for parity with County filter + keyboard-search parity. |
| Single query with relations | Two parallel queries (count + rows) | Two parallel with `Promise.all` is marginally faster (avoids double-counting) and mirrors Supabase docs idiom. [CITED: supabase.com/docs/reference/javascript/using-filters] |

**Version verification:**

```
$ npm view next version          → 16.2.4 [VERIFIED: 2026-04-20]
$ npm view @supabase/ssr version → 0.10.2 [VERIFIED: 2026-04-20]
$ npm view @supabase/supabase-js version → 2.104.0 [VERIFIED: 2026-04-20]
```

---

## Architecture Patterns

### System Architecture Diagram

```
                   User (browser)
                        |
                        | clicks filter → router.push(?category=…&county=…&q=…)
                        v
        Next.js Middleware (edge)  ───►  auth + verify gate
                        |                  (already in place)
                        v
   app/(app)/directory/page.tsx  (Server Component — async)
        │
        ├─ awaits { searchParams } → parses { category?, county?, q?, page? }
        │
        ├─ validates filters (silently drops invalid values)
        │
        │         Promise.all([
        │           // count query
        │           supabase.from('profiles')
        │             .select('id', { head: true, count: 'exact' })
        │             .match({ ... RLS-filtered ... })
        │             .filter(...category, county, search...) ,
        │           // rows query
        │           supabase.from('profiles')
        │             .select('id, username, display_name, avatar_url,
        │                      counties(name),
        │                      categories(name),
        │                      skills_offered(skill_text, sort_order)')
        │             .match({ ... same filters ... })
        │             .order('<rank or created_at>')
        │             .range(offset, offset+19)
        │         ])
        │
        ├─► Postgres (Supabase us-east-1)
        │     ├─ RLS: is_published AND verified AND NOT banned
        │     ├─ btree on category_id, county_id
        │     ├─ GIN on search_vector (tsvector)    ◄── Phase 3 installed
        │     └─ GIN on search_text gin_trgm_ops    ◄── Phase 4 adds
        │
        ├─ branch: empty / zero-results / error / grid
        │
        └─► renders <DirectoryFilters /> (client)
                    <ActiveFilterChips />
                    <DirectoryResultCounter />
                    <DirectoryGrid>
                       {profiles.map(p => <DirectoryCard key=…/>)}
                    </DirectoryGrid>
                    <DirectoryPagination />

               HTML streams back to browser → TTFB target <1s
```

### Recommended Project Structure (consistent with UI-SPEC)

```
app/(app)/directory/
  page.tsx                    # server component; reads searchParams, queries, branches
  loading.tsx                 # skeleton grid during streaming
  error.tsx                   # <DirectoryErrorState>

components/directory/
  DirectoryFilters.tsx              # 'use client' — wraps 3 controls + Clear
  DirectoryCategoryFilter.tsx       # Combobox specialization (10 categories)
  DirectoryCountyFilter.tsx         # thin wrapper over Phase 3 <CountyCombobox>
  DirectoryKeywordSearch.tsx        # Input + Search icon + debounce + clear-×
  ActiveFilterChips.tsx             # renders active filter badges with × remove
  DirectoryResultCounter.tsx        # "Showing 1–20 of 47"
  DirectoryCard.tsx                 # server component — avatar+name+meta+chips
  DirectoryGrid.tsx                 # server component — grid layout + branch
  DirectoryEmptyState.tsx           # "Nobody's here yet." + Build your profile
  DirectoryZeroResultsState.tsx     # "No profiles match..." + Clear filters
  DirectoryErrorState.tsx           # "Something went wrong..." + Reload
  DirectoryPagination.tsx           # Previous / counter / Next <Link>s
  DirectorySkeletonCard.tsx         # single skeleton card (used x6 in loading)

lib/data/directory.ts
  getDirectoryRows()         # parallelized count + rows query
  buildSearchPredicate()     # builds websearch_to_tsquery + trigram OR
  parseSearchParams()        # validates + coerces URL params to typed filters

lib/actions/directory-helpers.ts
  # Pure helpers (no 'use server') — filter slug <-> id maps, debounce helper

supabase/migrations/004_directory_search.sql
  # CREATE EXTENSION pg_trgm
  # ALTER TABLE profiles ADD COLUMN search_text text
  # Trigger to keep search_text synced from profile + skills changes
  # CREATE INDEX profiles_search_text_gin_trgm ON profiles USING gin (search_text gin_trgm_ops)
  # Optionally: replace search_vector to include skills via the same denorm column
```

### Pattern 1: Migration 004 — pg_trgm + denormalized search text

**What:** The existing `profiles.search_vector` (Phase 3) only covers name, bio, tiktok_handle. To satisfy DIR-05 (search across skills_offered + skills_wanted), we denormalize the skill text into a `profiles.search_text` TEXT column, maintained by a trigger that runs on skills INSERT/UPDATE/DELETE and on profile UPDATE of bio/display_name.

**Why a trigger, not a generated column:** Postgres `GENERATED ALWAYS AS` cannot reference other tables. Skills live in separate tables (`skills_offered`, `skills_wanted`) per Phase 3 D-05. A trigger-maintained denormalized TEXT column is the canonical Postgres pattern for cross-table search indexes. [CITED: postgresql.org/docs/current/triggers.html]

**Why one TEXT column, not two indexes on two separate columns:** Postgres can query across multiple GIN indexes but the planner is more aggressive with a single concatenated column + one GIN per operator class (tsvector + gin_trgm_ops). [CITED: postgresql.org/docs/current/textsearch-indexes.html]

**Trigger strategy:**

```sql
-- Called whenever profile fields OR skills rows change → recomputes search_text
CREATE OR REPLACE FUNCTION public.refresh_profile_search_text(p_profile_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.profiles p
  SET search_text = trim(
    coalesce(p.display_name, '') || ' ' ||
    coalesce(p.bio, '') || ' ' ||
    coalesce(p.tiktok_handle, '') || ' ' ||
    coalesce((SELECT string_agg(skill_text, ' ' ORDER BY sort_order)
              FROM public.skills_offered WHERE profile_id = p.id), '') || ' ' ||
    coalesce((SELECT string_agg(skill_text, ' ' ORDER BY sort_order)
              FROM public.skills_wanted WHERE profile_id = p.id), '')
  )
  WHERE p.id = p_profile_id;
END; $$;

-- Three triggers fire this:
--   1. AFTER INSERT OR UPDATE ON profiles (but only when display_name/bio/tiktok_handle change)
--   2. AFTER INSERT OR UPDATE OR DELETE ON skills_offered → refresh for profile_id
--   3. AFTER INSERT OR UPDATE OR DELETE ON skills_wanted → refresh for profile_id
```

**Indexes:**

```sql
CREATE INDEX profiles_search_text_trgm_idx
  ON public.profiles USING gin (search_text gin_trgm_ops);

-- If we want to ALSO satisfy exact FTS via websearch_to_tsquery on the denormalized column:
CREATE INDEX profiles_search_text_tsv_idx
  ON public.profiles USING gin (to_tsvector('english', coalesce(search_text, '')));
```

**Replacing or retaining `search_vector`?** Options:
- **(Recommended)** Keep `search_vector` for narrow name/bio/tiktok FTS (useful for username @-matching later); add new `search_text` + both indexes above for directory-scope FTS + trigram. Two columns is minor storage cost, zero query-time cost (planner picks the right index).
- Replace: `ALTER TABLE DROP COLUMN search_vector` + rebuild. More migration complexity, marginal savings.

**Backfill on deploy:** Run `SELECT refresh_profile_search_text(id) FROM profiles;` once in the migration after creating the function — populates search_text for existing rows.

**Source:** [CITED: supabase.com/docs/guides/database/full-text-search], [CITED: postgresql.org/docs/current/pgtrgm.html], [CITED: postgresql.org/docs/current/textsearch-controls.html]

### Pattern 2: Hybrid FTS + trigram query

**What:** Combine exact-match FTS (fast, ranks well) with trigram similarity (handles typos) in a single query. Use `websearch_to_tsquery` (NOT `plainto_tsquery` — `websearch_*` handles "quoted phrases" and OR/NOT operators users type naturally). [CITED: postgresql.org/docs/current/textsearch-controls.html#TEXTSEARCH-PARSING-QUERIES]

**Pattern (inline SQL conceptual — actual implementation uses Supabase JS client):**

```sql
-- For a user query 'baking'
SELECT id, display_name, ...,
  -- Rank: FTS rank dominates; trigram similarity is tiebreaker
  GREATEST(
    ts_rank(to_tsvector('english', search_text), websearch_to_tsquery('english', 'baking')),
    similarity(search_text, 'baking')
  ) AS rank
FROM profiles
WHERE is_published = true                        -- also RLS-enforced
  AND banned = false                             -- also RLS-enforced
  AND (
    to_tsvector('english', search_text) @@ websearch_to_tsquery('english', 'baking')
    OR search_text % 'baking'                    -- % is pg_trgm similarity operator (default threshold 0.3)
  )
  AND category_id = $1                           -- optional
  AND county_id   = $2                           -- optional
ORDER BY rank DESC, created_at DESC
LIMIT 20 OFFSET (page - 1) * 20;
```

**In the Supabase JS client:** The cleanest path is to write this as a Postgres function (`public.search_directory(q text, cat int, county int, off int)`) called via `supabase.rpc()`. Alternative: use `.or('search_text.wfts(english).baking,search_text.ilike.%baking%')` — possible but harder to reason about. **Recommendation:** define a `search_directory` RPC function returning `setof directory_row` — clean, testable, single SQL statement.

**Pitfall — trigram false positives:** `%` operator defaults to 0.3 similarity. For 1–3 character queries, this returns noise. Mitigation: require `length(trim(q)) >= 2` in server-side validation; for 2-char queries, FTS handles it fine (websearch tokenizes short queries too).

**Source:** [CITED: postgresql.org/docs/current/pgtrgm.html#PGTRGM-FUNCS-OPS], [CITED: supabase.com/docs/guides/database/full-text-search#match-any-search-word]

### Pattern 3: Next.js 16 async searchParams + server component query

**What:** Next.js 16 promoted `searchParams` to a `Promise<{ [key: string]: string | string[] | undefined }>` [CITED: nextjs.org/docs/app/api-reference/file-conventions/page]. Must be `await`ed in page components.

**Pattern:**

```typescript
// app/(app)/directory/page.tsx
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    county?: string
    q?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const filters = parseSearchParams(params)     // validates + coerces
  const { profiles, totalCount, error } =
    await getDirectoryRows(filters)              // parallel count + rows
  // ... branch on totalCount / error
}
```

**Why this pattern:** Server component runs on every navigation, so `router.push('/directory?q=baking')` triggers a full re-render with streaming HTML. The Suspense boundary (via `loading.tsx`) shows skeleton while the new query runs. [CITED: nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming]

**Source:** [CITED: nextjs.org/docs/app/api-reference/functions/use-search-params] + [CITED: nextjs.org/learn/dashboard-app/adding-search-and-pagination]

### Pattern 4: Parallel count + rows

**What:** Run the count query and the rows query in `Promise.all` to cut total latency to max(count, rows) instead of sum. For a GIN-indexed, RLS-enforced directory query, both are ~5-10ms at <10k rows — parallelizing saves ~10ms, which matters at the 1s TTFB budget.

**Pattern:**

```typescript
export async function getDirectoryRows(filters: DirectoryFilters) {
  const supabase = await createClient()
  const base = supabase.from('profiles')
    .select('id', { head: true, count: 'exact' })

  const rowsBase = supabase.from('profiles').select(
    `id, username, display_name, avatar_url,
     counties(name),
     categories(name),
     skills_offered(skill_text, sort_order)`,
    { count: 'exact' }     // omit if running separate count query
  )

  const applyFilters = <T extends typeof base>(q: T): T => {
    // RLS handles is_published + verified + banned; don't duplicate
    if (filters.categoryId) q = q.eq('category_id', filters.categoryId) as T
    if (filters.countyId)   q = q.eq('county_id', filters.countyId) as T
    if (filters.q)          q = q.textSearch('search_text', filters.q, { type: 'websearch' }) as T
    return q
  }

  const [{ count, error: countErr }, { data: rows, error: rowsErr }] = await Promise.all([
    applyFilters(base),
    applyFilters(rowsBase)
      .order('created_at', { ascending: false })
      .range((filters.page - 1) * 20, filters.page * 20 - 1)
  ])
  if (countErr || rowsErr) return { error: countErr ?? rowsErr, profiles: [], totalCount: 0 }
  return { profiles: rows ?? [], totalCount: count ?? 0 }
}
```

**Caveat — skills ordering:** The inner `skills_offered` select returns ALL skills; we truncate to 3 in the card component via `.slice(0, 3)` after client-side sort. Alternative: use `skills_offered!inner(skill_text, sort_order)` with a row-limiting filter (Supabase does not support row limits on nested selects directly — this has to happen in SQL with a lateral join). For simplicity at MVP, fetch all skills and slice — max 5 per profile × 20 profiles = 100 rows of skills, negligible payload.

**Source:** [CITED: supabase.com/docs/reference/javascript/select#selecting-with-count], [VERIFIED: Supabase discussion #3938]

### Pattern 5: TTFB <1s — layer breakdown

**What:** DIR-10 requires <1s TTFB at the Vercel edge. The budget breaks down approximately:

| Layer | Target | How |
|-------|--------|-----|
| Edge routing (Vercel) | <50ms | Vercel routes to nearest POP; cold-cache first hit may be 200ms |
| Middleware (auth check) | <50ms | `getClaims()` is JWKS-verified, no DB call |
| Server-component render start | <10ms | Next.js App Router init |
| Supabase Postgres query (parallel count + rows) | <50ms | GIN + btree indexes; us-east-1 region |
| Network round-trip Vercel→Supabase | ~100-200ms | Both in us-east-1 (D-21 decision) — co-located |
| HTML streaming start | <50ms | React streams first chunk |
| **Total TTFB budget** | **~400-600ms** | Leaves headroom for p95 edge cases |

**Monitoring:** Vercel Speed Insights (already installed `@vercel/analytics` Phase 1) provides TTFB on the `/directory` route. Alert if p95 >1s. [CITED: vercel.com/docs/speed-insights/metrics]

**Common TTFB killer — the N+1 problem:** Fetching skills per-profile in a loop would explode queries. The select-with-embedded-relations pattern above does a single join on Postgres side — one round trip.

**Source:** [CITED: supabase.com/docs/guides/platform/performance]

### Pattern 6: Client filter debounce + router.push

**What:** Keyword input must debounce at 300ms (UI-SPEC line 184) but must not lose keystrokes. Category and County filters fire immediately on selection.

**Pattern:**

```typescript
// components/directory/DirectoryKeywordSearch.tsx
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

export function DirectoryKeywordSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (value) params.set('q', value); else params.delete('q')
      params.delete('page')  // reset pagination on filter change
      router.push(`${pathname}?${params}`)
    }, 300)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [value])

  return <Input value={value} onChange={(e) => setValue(e.target.value)} ... />
}
```

**Key pitfalls:**

1. **Reset `?page=` on filter change** — otherwise a user on page 5 who adds a filter lands on an empty page-5 result. UI-SPEC implicitly expects this.
2. **Don't sync React state to URL on every keystroke** — that triggers re-render + re-query per character. Debounce writes, let React state lead during typing.
3. **`router.push` not `router.replace`** — UI-SPEC line 506 locks this: "each filter change pushes a new URL … so back-button navigation returns to the previous filter state."

### Anti-Patterns to Avoid

- **Do NOT run `useSearchParams()` inside the server-component page** — it's a client-only hook. Server pages read from the `searchParams` prop. [CITED: nextjs.org/docs/app/api-reference/functions/use-search-params]
- **Do NOT call `getUser()` in the page** — costs a round trip to Supabase Auth. Use `getClaims()` (cached in JWT) if you need owner identity for ownership badges; don't if you don't. The directory query itself doesn't need the user's identity — RLS handles visibility.
- **Do NOT `unstable_cache` the directory query** — the query is per-user (RLS depends on the caller's JWT) and per-filter (searchParams vary). Caching would serve stale data or leak other users' visibility state.
- **Do NOT use `router.refresh()` inside `useEffect`** — it's a full refetch. `router.push` with new URL is the lightweight path.
- **Do NOT store filter state in React state + sync to URL** — the URL is the source of truth. State on mount is read FROM the URL (see `DirectoryKeywordSearch` above).
- **Do NOT select `*` from profiles** — that includes `owner_id` (auth.users FK) and other server-only fields. Explicit column list.
- **Do NOT compute `sort_order` in JS after fetch** — let Postgres order: `skills_offered(skill_text, sort_order).order('sort_order', { foreignTable: 'skills_offered' })` OR handle in the card by sorting before slicing. Cleaner: use a PostgREST-style select with explicit ordering.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Category dropdown | Custom `<select>` with manual keyboard nav | shadcn `Combobox` (Command + Popover) [already installed Phase 3] | ARIA combobox pattern + keyboard nav built in; visual parity with County filter |
| County typeahead | Custom filter-list | Reuse Phase 3 `<CountyCombobox>` wholesale | Already accepts `value: number \| null; onChange(countyId: number)` — drop-in per UI-SPEC line 417 |
| Debounce | `lodash.debounce` (extra dep) | `setTimeout` + `useRef` in `useEffect` | 10 lines; no new dep; same semantics |
| URL params | `query-string` package | `URLSearchParams` (native) | Native; works in both server and client |
| Pagination | Custom `<nav>` markup | shadcn `Pagination` block + custom wrapper `<DirectoryPagination>` | UI-SPEC line 406 accepts either; shadcn block is a safer starting point |
| Loading skeleton | Custom pulse animation | shadcn `Skeleton` component | `animate-pulse` + color tokens handled; `motion-reduce:animate-none` built in |
| FTS ranking | Application-level scoring | `ts_rank` + `similarity()` in Postgres | DB does it in sub-10ms; moving ranking to app = N+1 latency |
| Typo tolerance | Levenshtein in Node | `pg_trgm` similarity operator | Postgres-native, GIN-indexed, zero network |
| Search across tables | Client-side JOIN + filter | Trigger-maintained `search_text` denorm column | DB handles it; index scan, not app-level filter |
| Keyset pagination for ranked results | Roll your own cursor-over-float | `LIMIT/OFFSET` at MVP scale | <10k rows + GIN index = offset pagination is sub-10ms |

**Key insight:** 100% of the Phase 4 logic is either (a) existing Phase 3 infrastructure (RLS, middleware, CountyCombobox, tables, indexes) or (b) Postgres-native features (FTS, pg_trgm, btree). Zero new runtime dependencies. Any temptation to pull in a library is a smell — it means you've missed an existing tool.

---

## Common Pitfalls

### Pitfall 1: Unauthenticated query sidesteps RLS via anon key misuse

**What goes wrong:** An executor drops the `createClient` from `lib/supabase/server.ts` and instead imports the admin (service-role) client. RLS is bypassed, and banned/unpublished profiles leak into the directory. OR: an executor reads `searchParams` and builds a query assuming "the user is authed so it's fine" — but forgets that the middleware redirect happens before this page is reached, so the page's server-client call is guaranteed to be authed. The pitfall is losing this guarantee by using `createBrowserClient` for an SSR query.
**Why it happens:** Developer sees "it's server-side, I'll use the admin client for speed."
**How to avoid:** Use only `createClient` from `@/lib/supabase/server` (imports `server-only`). NEVER import `admin.ts` in route/page code. Add a lint rule or a code-review checklist item: admin client usage is restricted to Edge Functions (Phase 5) only.
**Warning signs:** Directory returns rows with `is_published = false` OR `banned = true`. Detect via a Playwright E2E that seeds a banned profile and asserts it's not in results.

### Pitfall 2: Search column doesn't include skills — DIR-05 silently broken

**What goes wrong:** Executor reuses the existing `profiles.search_vector` (Phase 3) without adding skills to it. User searches for "baking" and a profile whose `skills_offered` includes "baking" doesn't surface — because `skills_offered.skill_text` is not in the indexed column.
**Why it happens:** The existing `search_vector` column's shape looks sufficient — name + bio + tiktok_handle — and the migration note in Phase 3 says "Phase 4 FTS prep." Easy to assume it's already done.
**How to avoid:** Phase 4 migration 004 MUST either (a) replace `search_vector` with a denormalized `search_text` that includes skills via trigger, or (b) add a new `search_text` column alongside. This research recommends (b) — additive migration, zero risk to existing Phase 3 queries. See Pattern 1.
**Warning signs:** E2E test: create profile with skill "baking", search "baking" → card should appear. If absent, `search_text` is wrong.

### Pitfall 3: Trigram threshold too low — noise in short queries

**What goes wrong:** Default `pg_trgm` `%` operator threshold is 0.3. A 2-character query like "gt" matches half the directory. User sees irrelevant results.
**Why it happens:** Default is designed for longer strings. Short queries have high relative trigram overlap by chance.
**How to avoid:** Validate `q.length >= 2` server-side (silently drop the filter if shorter). For length < 4, skip trigram entirely and use FTS-only (`websearch_to_tsquery`). Consider tuning `pg_trgm.similarity_threshold` at session level if needed: `SET pg_trgm.similarity_threshold = 0.4;` inside the RPC function.
**Warning signs:** User types "ab" and gets 50 results that share no substring with "ab". Adjust threshold or branch query-type on length.

### Pitfall 4: Skills fetch N+1 in loop

**What goes wrong:** A DirectoryCard does its own `supabase.from('skills_offered').select(...)` call. 20 cards = 20 round trips. TTFB balloons past 2s.
**Why it happens:** Server components can do async work, so "each card fetches its own skills" feels clean. It isn't.
**How to avoid:** The top-level server component does one query with embedded `skills_offered(skill_text, sort_order)` relation — Supabase's PostgREST layer JOINs server-side, one round trip. Cards receive pre-fetched data as props.
**Warning signs:** DevTools Network tab shows 20+ parallel Supabase requests per page load. Fix: move query to page.tsx.

### Pitfall 5: `?page=` not reset on filter change

**What goes wrong:** User on page 5 (20-40 of ~100 results) adds a category filter that narrows to 8 results. URL still says `?page=5`. Page renders empty because offset 80 > total 8.
**Why it happens:** Filter-change handler only updates the changed filter param, leaves `page` alone.
**How to avoid:** Every filter-write handler calls `params.delete('page')` before pushing. Only Previous/Next pagination updates `page`. See Pattern 6.
**Warning signs:** E2E: set filter → navigate to page 3 → change filter → expect page 1. If stuck on page 3 with zero results, handler doesn't reset.

### Pitfall 6: Loading skeleton flash on SSR initial render

**What goes wrong:** `loading.tsx` is always rendered during streaming, including the very first SSR request. User sees skeleton cards flash before actual content — DIR-10 TTFB impression suffers.
**Why it happens:** Next.js wraps the page in Suspense for streaming SSR. `loading.tsx` IS the Suspense fallback.
**How to avoid:** For the directory, the initial page render is typically fast enough (sub-500ms) that the skeleton is barely visible — acceptable. For client-side navigation (filter change, pagination), the skeleton is visible and desired. If the flash is objectionable, the mitigation is to NOT have `loading.tsx` at the route level and instead wrap internal slow parts in `<Suspense>`. Trade-off: skeleton on client-nav disappears. Recommendation: keep `loading.tsx` — the small flash is fine and the client-nav experience is better.
**Warning signs:** User feedback "feels flashy on first load." If so, remove `loading.tsx` and measure.

### Pitfall 7: Count query and rows query get different filters

**What goes wrong:** `getDirectoryRows` builds the count query with one filter set and the rows query with another (e.g., forgets to apply category filter to count). Counter reads "Showing 1–20 of 320" but only 8 rows render.
**Why it happens:** DRY'ing up the filter-apply is tricky with Supabase's chained client.
**How to avoid:** Write a single `applyFilters(q)` helper used for BOTH count and rows queries. Unit test: call `applyFilters(...)` with known filters, assert the resulting query produces identical `.toURL()` (or just mirror in integration test).
**Warning signs:** E2E: apply filter, assert `rendered-cards === total-counter` or `rendered-cards <= 20`.

### Pitfall 8: `range()` off-by-one

**What goes wrong:** Supabase `.range(from, to)` is **inclusive** on both ends. `range(0, 20)` returns 21 rows, not 20.
**Why it happens:** Developer intuitively assumes exclusive end (like `slice`).
**How to avoid:** `range((page-1)*20, page*20 - 1)`. Unit test the math.
**Source:** [CITED: supabase.com/docs/reference/javascript/range]

### Pitfall 9: Google OAuth users missing `email_verified` claim — middleware edge case already handled

**What goes wrong:** Google-authed users don't have `email_verified` in their JWT claim — Phase 2 middleware has a documented fallback to `getUser()` for verified-only paths.
**Why it happens:** OAuth providers omit the claim; Supabase auth.users tracks it at the row level.
**How to avoid:** **Already handled** in `lib/supabase/middleware.ts` lines 68-85. Phase 4 inherits this — no new work. But verify the Playwright OAuth fixture covers a Google-authed user accessing `/directory` (not just email magic-link users).
**Source:** [CITED: lib/supabase/middleware.ts PITFALL 4 comment]

### Pitfall 10: Empty-state triggered by all-filtered-out vs. zero-published

**What goes wrong:** User filters to a county with no profiles. Page shows "Nobody's here yet. Build your profile." (empty-state copy) — but that's the wrong message; the correct one is "No profiles match those filters. Clear filters." (zero-results).
**Why it happens:** Both states have `totalCount === 0`. Must distinguish by whether filters are active.
**How to avoid:** Branch: `totalCount === 0 && activeFilterCount === 0 → EmptyState` vs `totalCount === 0 && activeFilterCount > 0 → ZeroResultsState`. UI-SPEC makes this explicit (lines 237, 250).
**Warning signs:** QA shows wrong empty state for county with 0 profiles. Fix branch.

---

## Runtime State Inventory

> Phase 4 is a new-surface phase — adds `/directory` and new components; does not rename or refactor existing state. Most categories are "nothing to do". Listed explicitly for auditability.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — the Phase 4 migration adds a new `profiles.search_text` column; existing `profiles` rows must be backfilled. | Backfill: `SELECT refresh_profile_search_text(id) FROM profiles;` in migration 004 after creating the function. |
| Live service config | None — no n8n/Datadog/etc. in this project. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | None — Phase 4 uses existing `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No new secrets. | None. |
| Build artifacts | `pnpm-lock.yaml` updates from adding shadcn components — expected. | None beyond normal commit. |

---

## Environment Availability

> Phase 4 has no new external dependencies beyond what Phase 1-3 installed. Skipped detailed probe — all already verified in Phase 1 runbook.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI (local dev) | Migration 004 authoring + `supabase db push` | ✓ | 2.92.1 (devDep) | — |
| Postgres `pg_trgm` extension | DIR-05 fuzzy matching | ✓ (Supabase-managed — available on all tiers, just needs `CREATE EXTENSION`) | built-in | — [CITED: supabase.com/docs/guides/database/extensions/pgtrgm] |
| Postgres `tsvector`/`to_tsvector` | DIR-05 exact FTS | ✓ (Postgres core) | Postgres 17 | — |
| Node 20 LTS | Next.js runtime | ✓ | ≥20.0.0 | — |
| pnpm 10 | Package manager | ✓ | ≥10 | — |
| Playwright Chromium | E2E tests | ✓ | installed Phase 1 | — |
| Vitest | Unit tests | ✓ | 4.1.4 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 4.1.4 with `@vitejs/plugin-react` 6.0.1 + jsdom 29.0.2 |
| E2E framework | `@playwright/test` 1.59.1 |
| Unit config | `/Users/ashleyakbar/barterkin/vitest.config.ts` (globals: true, includes `tests/unit/**`) |
| E2E config | `/Users/ashleyakbar/barterkin/playwright.config.ts` (Chromium only, `pnpm start` webServer) |
| Quick unit run | `pnpm test tests/unit/directory-*.test.ts` |
| Full unit suite | `pnpm test` |
| Quick E2E run | `pnpm e2e tests/e2e/directory-*.spec.ts` |
| Full E2E suite | `pnpm e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIR-01 | Authed+verified user accesses `/directory`; unauthed redirects to /login | E2E | `pnpm e2e tests/e2e/directory-auth-gate.spec.ts` | ❌ Wave 0 |
| DIR-02 | Card renders avatar, display_name, county, category, top-3 skills | E2E | `pnpm e2e tests/e2e/directory-card-render.spec.ts` | ❌ Wave 0 |
| DIR-03 | Category filter narrows results; URL updates | E2E | `pnpm e2e tests/e2e/directory-category-filter.spec.ts` | ❌ Wave 0 |
| DIR-04 | County typeahead filter narrows results; URL updates | E2E | `pnpm e2e tests/e2e/directory-county-filter.spec.ts` | ❌ Wave 0 |
| DIR-05 | Keyword "baking" matches; typo "bakng" also matches (pg_trgm) | E2E | `pnpm e2e tests/e2e/directory-keyword-search.spec.ts` | ❌ Wave 0 |
| DIR-05 | `parseSearchParams` drops invalid/short `q`; validates category slug + county fips | Unit | `pnpm test tests/unit/directory-params.test.ts` | ❌ Wave 0 |
| DIR-05 | `refresh_profile_search_text` trigger populates on skill insert/update/delete | Unit (SQL) | `pnpm test tests/unit/directory-search-trigger.test.ts` | ❌ Wave 0 — or verify via `supabase db test` |
| DIR-06 | URL round-trip: filter-state → URL → re-render with identical state across browsers | E2E | `pnpm e2e tests/e2e/directory-url-shareable.spec.ts` | ❌ Wave 0 |
| DIR-07 | Pagination: 20 per page, Previous/Next update `?page=`, first/last page disable | E2E | `pnpm e2e tests/e2e/directory-pagination.spec.ts` | ❌ Wave 0 |
| DIR-08 | Empty state renders when 0 profiles + 0 filters; zero-results when 0 profiles + ≥1 filter | E2E | `pnpm e2e tests/e2e/directory-empty-states.spec.ts` | ❌ Wave 0 |
| DIR-09 | RLS: unpublished / unverified / banned profile NEVER in results | Unit (supabase RLS harness — extend existing `tests/unit/rls-email-verify.test.ts`) | `pnpm test tests/unit/rls-directory-visibility.test.ts` | ❌ Wave 0 |
| DIR-10 | TTFB <1s for empty-filter + category+county+keyword query | Playwright perf (use `page.goto` + `performance.timing`) or manual curl | `pnpm e2e tests/e2e/directory-ttfb.spec.ts` | ❌ Wave 0 (or manual) |

### Sampling Rate

- **Per task commit:** `pnpm test tests/unit/directory-*.test.ts && pnpm lint && pnpm typecheck`
- **Per wave merge:** `pnpm test && pnpm e2e tests/e2e/directory-*.spec.ts`
- **Phase gate:** Full suite green (`pnpm test && pnpm e2e`) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/directory-params.test.ts` — `parseSearchParams` validator (category slug, county fips, q length, page parse)
- [ ] `tests/unit/directory-helpers.test.ts` — any pure helpers (debounce, chip-label builder)
- [ ] `tests/unit/rls-directory-visibility.test.ts` — RLS contract: unverified user, unpublished profile, banned profile all filtered
- [ ] `tests/unit/directory-search-trigger.test.ts` — (optional) migration-integration test that skill insert updates search_text
- [ ] `tests/e2e/directory-auth-gate.spec.ts` — auth + verify gate redirect
- [ ] `tests/e2e/directory-card-render.spec.ts` — card content
- [ ] `tests/e2e/directory-category-filter.spec.ts` — category filter behavior
- [ ] `tests/e2e/directory-county-filter.spec.ts` — county filter behavior
- [ ] `tests/e2e/directory-keyword-search.spec.ts` — exact + typo match
- [ ] `tests/e2e/directory-url-shareable.spec.ts` — URL round-trip
- [ ] `tests/e2e/directory-pagination.spec.ts` — Previous / Next / boundaries
- [ ] `tests/e2e/directory-empty-states.spec.ts` — Empty vs ZeroResults branching
- [ ] `tests/e2e/directory-ttfb.spec.ts` — optional: perf gate at 1s

Framework install: **None required** — Vitest + Playwright already installed.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `@supabase/ssr` middleware + `getClaims()` — Phase 2 infrastructure inherited |
| V3 Session Management | yes | Session refresh on every request in middleware — Phase 2 inherited |
| V4 Access Control | yes | Postgres RLS policies on `profiles`, `skills_offered`, `skills_wanted`, `counties`, `categories` — Phase 3 installed |
| V5 Input Validation | yes | Zod schema for `parseSearchParams` (category slug ∈ known 10, county fips ∈ 159, q ≤200 chars + ≥2 chars, page ∈ [1, Math.ceil(total/20)]) |
| V6 Cryptography | n/a | No crypto operations in Phase 4 — no signing, no passwords, no JWT generation. Supabase owns all crypto |
| V7 Error Handling | yes | Never expose raw Postgres errors to user — `<DirectoryErrorState>` renders generic copy; server logs structured error codes only (no row values, no PII) |
| V11 Business Logic | yes | Directory visibility gate is a business-logic security boundary — RLS handles it. Policy test required |

### Known Threat Patterns for Next.js + Supabase + Postgres

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `q` param | Tampering | Supabase PostgREST `.textSearch(col, query, { type: 'websearch' })` parameterizes the query; never `.raw()` or template string. `websearch_to_tsquery` is safe against tsquery-syntax injection by design. |
| RLS bypass via service-role leak | EoP | Service-role key is server-only (`lib/supabase/admin.ts` has `import 'server-only'`). Directory page never imports admin client. Lint/review gate. |
| Enumeration of unpublished profiles via username guess at `/m/[username]` | Info disclosure | Already mitigated Phase 3: RLS filters — guessing `/m/some-banned-user` returns "This profile isn't available." |
| PII leak via search results | Info disclosure | Directory query select list is explicit and excludes email/phone/owner_id. |
| Denial-of-service via expensive search query | Availability | `length(q) >= 2` guard; trigram threshold; GIN indexes bound query time. Rate limiting at Vercel edge + Supabase connection pooler (already active). |
| Cross-site request forgery on filter change | CSRF | Filter changes are GETs (URL updates) — not POSTs — inherently CSRF-safe. |
| Exposing banned users' profiles to admin page | AuthZ | No admin UI in MVP; `banned=true` set via SQL only. RLS enforces. |
| Username enumeration via search | Info disclosure | Search operates on name/bio/skills — a careful attacker could enumerate usernames partially, BUT only usernames of PUBLISHED profiles are visible anyway. Acceptable per product design. |
| JWT tampering bypassing RLS | Tampering | `getClaims()` is JWKS-verified — tampered JWTs fail signature check. `getSession()` NEVER used on server paths. |

### Phase 4-Specific Threat: pg_trgm DoS

- **Attack:** User submits a 200-char query with high-cardinality substrings forcing Postgres to evaluate thousands of trigram comparisons.
- **Mitigation:** Cap `q.length` at 100 chars in `parseSearchParams` (UI-SPEC doesn't mandate 200; 100 is plenty for "name or skill or bio" searches). GIN index on `search_text gin_trgm_ops` makes even worst-case linear in matching rows, sub-ms.

---

## Code Examples

### Example 1: Server-component page with filter parsing + parallel query

```typescript
// app/(app)/directory/page.tsx
// Source: CITED: nextjs.org/docs/app/api-reference/file-conventions/page (async searchParams pattern)
import type { Metadata } from 'next'
import { getDirectoryRows } from '@/lib/data/directory'
import { parseSearchParams } from '@/lib/data/directory-params'
import { DirectoryFilters } from '@/components/directory/DirectoryFilters'
import { ActiveFilterChips } from '@/components/directory/ActiveFilterChips'
import { DirectoryResultCounter } from '@/components/directory/DirectoryResultCounter'
import { DirectoryGrid } from '@/components/directory/DirectoryGrid'
import { DirectoryPagination } from '@/components/directory/DirectoryPagination'

export const metadata: Metadata = {
  title: 'Directory',
  description: 'Find Georgia residents offering skills to trade — woodworking, cooking, music, tech, and more. One community, 159 counties.',
  robots: { index: false, follow: false },  // auth-gated
}

// Next.js 16: searchParams is a Promise
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const rawParams = await searchParams
  const filters = parseSearchParams(rawParams)
  const { profiles, totalCount, error } = await getDirectoryRows(filters)

  return (
    <>
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold leading-[1.15] text-forest-deep">
          Directory
        </h1>
        <p className="text-base text-muted-foreground">
          Browse Georgians by skill, category, and county.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <DirectoryFilters initialFilters={filters} />
        <ActiveFilterChips filters={filters} />
      </div>

      {totalCount > 0 && (
        <DirectoryResultCounter
          from={(filters.page - 1) * 20 + 1}
          to={Math.min(filters.page * 20, totalCount)}
          total={totalCount}
        />
      )}

      <DirectoryGrid
        profiles={profiles}
        totalCount={totalCount}
        activeFilterCount={filters.activeFilterCount}
        hasError={!!error}
      />

      {totalCount > 20 && (
        <DirectoryPagination
          currentPage={filters.page}
          totalPages={Math.ceil(totalCount / 20)}
          searchParams={rawParams}
        />
      )}
    </>
  )
}
```

### Example 2: Data layer with parallel count + rows

```typescript
// lib/data/directory.ts
// Source: CITED: supabase.com/docs/reference/javascript/select#selecting-with-count
import { createClient } from '@/lib/supabase/server'
import type { DirectoryFilters, DirectoryProfile } from '@/lib/data/directory.types'

export async function getDirectoryRows(filters: DirectoryFilters): Promise<{
  profiles: DirectoryProfile[]
  totalCount: number
  error: string | null
}> {
  const supabase = await createClient()

  const buildBase = () => {
    let q = supabase.from('profiles')
    return q
  }

  const applyFilters = <T extends { eq: any; textSearch: any }>(q: T): T => {
    // RLS already filters is_published + verified + banned — don't duplicate
    if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
    if (filters.countyId)   q = q.eq('county_id', filters.countyId)
    if (filters.q && filters.q.length >= 2) {
      // .textSearch uses websearch_to_tsquery under the hood with type='websearch'
      q = q.textSearch('search_text', filters.q, {
        type: 'websearch',
        config: 'english',
      })
    }
    return q
  }

  try {
    const [countResult, rowsResult] = await Promise.all([
      applyFilters(buildBase().select('id', { head: true, count: 'exact' })),
      applyFilters(
        buildBase().select(
          `id, username, display_name, avatar_url,
           counties(name),
           categories(name),
           skills_offered(skill_text, sort_order)`
        )
      )
        .order('created_at', { ascending: false })
        .range((filters.page - 1) * 20, filters.page * 20 - 1),
    ])

    if (countResult.error) {
      console.error('[getDirectoryRows] count error', { code: countResult.error.code })
      return { profiles: [], totalCount: 0, error: 'count_failed' }
    }
    if (rowsResult.error) {
      console.error('[getDirectoryRows] rows error', { code: rowsResult.error.code })
      return { profiles: [], totalCount: 0, error: 'rows_failed' }
    }

    // Truncate skills to top 3 by sort_order ASC
    const profiles = (rowsResult.data ?? []).map((p) => ({
      ...p,
      skills_offered: [...(p.skills_offered ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(0, 3),
    })) as DirectoryProfile[]

    return {
      profiles,
      totalCount: countResult.count ?? 0,
      error: null,
    }
  } catch (err) {
    console.error('[getDirectoryRows] unexpected', err)
    return { profiles: [], totalCount: 0, error: 'unknown' }
  }
}
```

### Example 3: Search-param validation

```typescript
// lib/data/directory-params.ts
// Source: verified against lib/data/categories.ts + lib/data/georgia-counties.json
import { CATEGORIES, type CategorySlug } from '@/lib/data/categories'
import georgiaCounties from '@/lib/data/georgia-counties.json'

export interface DirectoryFilters {
  categorySlug: CategorySlug | null
  categoryId: number | null
  countyFips: number | null
  countyId: number | null
  countyName: string | null
  q: string | null
  page: number
  activeFilterCount: number
}

const MAX_Q_LENGTH = 100
const MIN_Q_LENGTH = 2

export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): DirectoryFilters {
  const take = (k: string) => (Array.isArray(raw[k]) ? raw[k]?.[0] : raw[k]) as string | undefined

  // Category slug → id
  const rawCategory = take('category')
  const category = CATEGORIES.find((c) => c.slug === rawCategory) ?? null

  // County fips (integer)
  const rawCounty = take('county')
  const fips = rawCounty ? Number.parseInt(rawCounty, 10) : NaN
  const county = Number.isFinite(fips)
    ? georgiaCounties.find((c) => c.fips === fips) ?? null
    : null

  // Keyword — trim, length-guard
  const rawQ = take('q')?.trim()
  const q = rawQ && rawQ.length >= MIN_Q_LENGTH
    ? rawQ.slice(0, MAX_Q_LENGTH)
    : null

  // Page — fall back to 1 on garbage input
  const rawPage = take('page')
  const pageNum = rawPage ? Number.parseInt(rawPage, 10) : 1
  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1

  const activeFilterCount =
    (category ? 1 : 0) + (county ? 1 : 0) + (q ? 1 : 0)

  return {
    categorySlug: category?.slug ?? null,
    categoryId: category?.id ?? null,
    countyFips: county?.fips ?? null,
    countyId: county?.fips ?? null, // counties.id == FIPS (Phase 3 D-01)
    countyName: county?.name ?? null,
    q,
    page,
    activeFilterCount,
  }
}
```

### Example 4: Migration 004 (pg_trgm + search_text + triggers)

```sql
-- supabase/migrations/004_directory_search.sql
-- Phase 4 — Directory
-- Requirements: DIR-05 (FTS + pg_trgm fuzzy matching)
-- Depends on: 003_profile_tables.sql (profiles, skills_offered, skills_wanted)

-- 1. Enable pg_trgm extension
create extension if not exists pg_trgm;

-- 2. Add denormalized search_text column (populated by trigger, not GENERATED — cross-table)
alter table public.profiles
  add column if not exists search_text text;

-- 3. Function to recompute search_text for a single profile
create or replace function public.refresh_profile_search_text(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles p
  set search_text = trim(both ' ' from
    coalesce(p.display_name, '') || ' ' ||
    coalesce(p.bio, '') || ' ' ||
    coalesce(p.tiktok_handle, '') || ' ' ||
    coalesce((
      select string_agg(skill_text, ' ' order by sort_order)
      from public.skills_offered where profile_id = p.id
    ), '') || ' ' ||
    coalesce((
      select string_agg(skill_text, ' ' order by sort_order)
      from public.skills_wanted where profile_id = p.id
    ), '')
  )
  where p.id = p_profile_id;
end;
$$;

-- Only the owner of a profile (or service_role) can write; SECURITY DEFINER makes this
-- callable from RLS-governed triggers on skills tables without opening broader access.
revoke execute on function public.refresh_profile_search_text(uuid) from public;

-- 4. Trigger on profiles update — re-compute when searchable fields change
create or replace function public.trg_profiles_refresh_search()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') or
     (new.display_name is distinct from old.display_name) or
     (new.bio is distinct from old.bio) or
     (new.tiktok_handle is distinct from old.tiktok_handle) then
    perform public.refresh_profile_search_text(new.id);
  end if;
  return new;
end; $$;

create trigger profiles_refresh_search
  after insert or update on public.profiles
  for each row execute function public.trg_profiles_refresh_search();

-- 5. Triggers on skills_offered + skills_wanted — re-compute parent profile on any change
create or replace function public.trg_skills_refresh_search()
returns trigger language plpgsql as $$
begin
  perform public.refresh_profile_search_text(
    coalesce(new.profile_id, old.profile_id)
  );
  return coalesce(new, old);
end; $$;

create trigger skills_offered_refresh_search
  after insert or update or delete on public.skills_offered
  for each row execute function public.trg_skills_refresh_search();

create trigger skills_wanted_refresh_search
  after insert or update or delete on public.skills_wanted
  for each row execute function public.trg_skills_refresh_search();

-- 6. Backfill existing rows (safe no-op if run twice)
update public.profiles set search_text = null;
select public.refresh_profile_search_text(id) from public.profiles;

-- 7. Indexes — one GIN per operator class
-- Exact + phrase FTS via to_tsvector (websearch_to_tsquery match operator)
create index if not exists profiles_search_text_tsv_gin
  on public.profiles using gin (to_tsvector('english', coalesce(search_text, '')));

-- Fuzzy matching via trigram (% similarity operator)
create index if not exists profiles_search_text_trgm_gin
  on public.profiles using gin (search_text gin_trgm_ops);

-- Covering indexes for filter combinations (btree)
-- Existing profiles_published_idx (Phase 3) covers (is_published, banned) filter;
-- category_id and county_id are FKs — Supabase auto-adds indexes on FKs? Not always.
create index if not exists profiles_category_idx on public.profiles(category_id)
  where is_published = true and banned = false;
create index if not exists profiles_county_idx on public.profiles(county_id)
  where is_published = true and banned = false;
```

### Example 5: Hybrid FTS + trigram query (if .textSearch isn't enough)

If Supabase's `.textSearch()` builder doesn't compose the FTS+trigram OR cleanly, drop to an RPC:

```sql
-- Optional: add to migration 004 if .textSearch OR-chain proves awkward
create or replace function public.search_directory(
  p_category_id int default null,
  p_county_id int default null,
  p_q text default null,
  p_offset int default 0,
  p_limit int default 20
)
returns setof public.profiles
language plpgsql
stable
security invoker  -- runs with caller's privileges — RLS still applies
set search_path = public, pg_temp
as $$
begin
  return query
  select p.*
  from public.profiles p
  where
    (p_category_id is null or p.category_id = p_category_id)
    and (p_county_id is null or p.county_id = p_county_id)
    and (
      p_q is null
      or to_tsvector('english', coalesce(p.search_text, '')) @@ websearch_to_tsquery('english', p_q)
      or p.search_text % p_q
    )
  order by
    case when p_q is not null then
      greatest(
        ts_rank(to_tsvector('english', coalesce(p.search_text, '')), websearch_to_tsquery('english', p_q)),
        similarity(coalesce(p.search_text, ''), p_q)
      )
    end desc nulls last,
    p.created_at desc
  offset p_offset
  limit p_limit;
end;
$$;

grant execute on function public.search_directory(int, int, text, int, int) to authenticated;
```

Called via `supabase.rpc('search_directory', { p_category_id, p_county_id, p_q, p_offset, p_limit })`. **Recommendation:** Try `.textSearch()` first; fall back to RPC only if ranking quality or predicate composition becomes painful.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr@0.10.x` | 2024 | Must use; auth-helpers removed from all Phase 4 examples |
| `getSession()` server-side | `getClaims()` for display, `getUser()` for DML | 2024 | Already enforced in Phase 1-3 code; Phase 4 inherits |
| Synchronous `searchParams` in page | `await searchParams` (Promise) | Next.js 15+ | Required in Next.js 16; Phase 4 code uses the await pattern |
| `plainto_tsquery` | `websearch_to_tsquery` | Postgres 11+ | Handles quoted phrases + operators; safer for user input |
| Tailwind v3 `tailwind.config.js` | Tailwind v4 `@theme` in globals.css | 2025 | Already migrated Phase 1; Phase 4 adds no tokens |
| Third-party search (Algolia, Typesense) for small-to-medium | Postgres FTS + pg_trgm | Always true at <10k rows; CLAUDE.md locks | Zero new infra |
| Offset pagination considered "wrong" | Offset is fine at <10k rows + GIN index | Pragmatic 2024-26 consensus | Allows simpler URL shape matching UI-SPEC |

**Deprecated / outdated:**
- `supabase.from('profiles').select('*')` → always explicit column list (privacy + payload size)
- `next-pwa` → Serwist (already handled Phase 1)
- `cookies()` sync import → `await cookies()` (already handled Phase 1)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DIR-07 language "cursor-based pagination" is satisfied by offset pagination with `?page=N` URL, per UI-SPEC framing at line 235 | Architecture Patterns §7, Example 1 | If user/stakeholder strictly requires keyset pagination, executor must add a `cursor` opaque token path — adds ~2 hours of work. Recommendation: discuss-phase clarifies. |
| A2 | `pg_trgm` similarity threshold 0.3 (default) is acceptable for 3+ char queries | Pitfall 3 | If users report noisy matches on short queries, tune via `SET pg_trgm.similarity_threshold` — 30-min fix. |
| A3 | Supabase PostgREST `.textSearch()` composes cleanly with trigram `%` via OR. | Example 2 | If not, fall back to RPC (Example 5) — 1-hour swap. Escape hatch exists. |
| A4 | Card skills truncate-to-3 happens in JS (client), not SQL | Pattern 4 | Minor payload overhead (~2 extra skills × 20 cards = negligible) vs. the complexity of a lateral-join limit — worth the tradeoff. |
| A5 | Existing `(app)/layout.tsx` `<main>` max-w-2xl → max-w-5xl change is safe for `/profile`, `/profile/edit`, `/m/[username]` since their inner Cards self-constrain | UI-SPEC line 462 | Verified: `ProfileCard` uses `max-w-2xl`/`max-w-3xl` wrappers. If any page doesn't, visual regression on that page. Quick Playwright screenshot check in Phase 4. |
| A6 | `profiles.created_at` is indexed implicitly (it's the secondary sort key). If not, `ORDER BY created_at DESC` could slow at higher row counts. | Pattern 4 | Add `CREATE INDEX profiles_created_at_idx ON profiles(created_at DESC) WHERE is_published = true AND banned = false;` in migration 004 defensively. |
| A7 | The Next.js 16 page's `searchParams` Promise unwrap adds no perceptible overhead vs. Next.js 14's sync access | Pattern 3 | Next 16 docs state it's a trivial unwrap; measured overhead <1ms. Negligible for 1s TTFB budget. |
| A8 | Vercel edge → Supabase us-east-1 round-trip stays under 200ms p95 | Pattern 5 | Per Supabase docs + CLAUDE.md us-east-1 colocation decision. If TTFB p95 misses 1s, first diagnostic is edge-to-db latency — escalate with Supabase support if unexplained. |
| A9 | Trigger-maintained `search_text` refresh adds <5ms per skill insert/update | Pattern 1 | At 5 skills × a few saves per user per month, this is well below any measurable impact. Worst case: batching via DEFER, but unnecessary at MVP. |
| A10 | `parseSearchParams` silently dropping invalid filters (category not in CATEGORIES, county not in 159) is the right UX, vs. 400 error | Example 3 | UI-SPEC doesn't lock this. If discuss-phase wants hard-fail, wrap in try/catch + redirect. Keep current "silent drop" as default — resilient to bookmark-URL drift. |

**If this table has entries:** All A1-A10 items should be reviewed during `/gsd-discuss-phase` before planning. A1 and A10 are the most material (both UX-affecting).

---

## Open Questions (RESOLVED)

> Each question below has been resolved during Phase 4 planning. Resolution annotations reference the plan and task where the decision is materialized, or document a deferral with rationale.

1. **Should Previous/Next pagination be a `<Link>` (full server re-render) or a client-side `router.push`?**
   - What we know: Both work. UI-SPEC doesn't lock. `<Link>` is simpler; `router.push` stays within the same page instance (preserves filter-input focus).
   - What's unclear: Which is preferred UX for this content.
   - Recommendation: `<Link>` for Previous/Next (full re-render keeps SSR TTFB story consistent); filter changes use `router.push` (client-initiated) since they're debounced.
   - **RESOLVED:** Plan 05 Task 1 implements `DirectoryPagination` as a server component rendering `<Button asChild><Link href=...>Previous/Next</Link></Button>` — full server re-render preserves SSR TTFB path, matches recommendation. Filter mutations use `router.push` via Plan 04 `DirectoryFilters` + `ActiveFilterChips` client components.

2. **Do we need a `loading.tsx` at the route level, or wrap slower parts in inline `<Suspense>`?**
   - What we know: `loading.tsx` is the Suspense fallback for the whole page. Shows on initial SSR + every client nav. UI-SPEC calls for 6 skeleton cards during filter/page changes.
   - What's unclear: Skeleton flash on first load acceptability.
   - Recommendation: Use `loading.tsx` with the 6 skeleton cards. If QA calls out the first-load flash, pivot to inline `<Suspense>` in Phase 4's late-wave.
   - **RESOLVED:** Plan 05 Task 1 creates `app/(app)/directory/loading.tsx` rendering 6 `DirectorySkeletonCard` instances in the same 1/2/3-col grid shape. Adopted route-level approach per recommendation. If first-load flash is objected to in QA (Pitfall 6), pivot to inline `<Suspense>` documented as a v1.1 follow-up — not blocking MVP.

3. **Do we index `profiles.created_at` explicitly, or trust an implicit index?**
   - What we know: Postgres does NOT auto-create indexes on non-unique columns. `ORDER BY created_at DESC` will plan a sequential scan when no search/filter limits rows < ~1000.
   - What's unclear: Whether Phase 3 implicitly added this index (grep says no).
   - Recommendation: Add `CREATE INDEX profiles_created_at_desc_idx ON profiles(created_at DESC) WHERE is_published = true AND banned = false;` in migration 004 — cheap insurance.
   - **RESOLVED:** Plan 01 Task 1 migration `004_directory_search.sql` step 8 adds `create index if not exists profiles_created_at_desc_idx on public.profiles(created_at desc) where is_published = true and banned = false;` — matches recommendation verbatim.

4. **For DIR-05 "search across skills_wanted" — is it in scope?**
   - What we know: Requirements.md DIR-05 explicitly lists skills_offered AND skills_wanted. Current Phase 3 `search_vector` covers neither.
   - What's unclear: Whether searching skills_wanted is product-meaningful.
   - Recommendation: Include both in `search_text` per strict reading of DIR-05. If post-launch QA shows noise, revisit in v1.1 with a filter toggle. Low risk either way.
   - **RESOLVED:** Plan 01 Task 1 `refresh_profile_search_text` function concatenates BOTH `skills_offered` AND `skills_wanted` into `search_text` via `string_agg`. Plan 01 Task 3 test case verifies `skills_wanted` insertion updates `search_text`. Post-launch revisit via filter toggle deferred to v1.1 per recommendation.

5. **Should `text-search` queries be logged (for analytics / PostHog)?**
   - What we know: PostHog is installed (Phase 1). Analytics on directory search informs v1.1 decisions.
   - What's unclear: Whether to capture a `directory_searched` event with `{ category?, county?, q_length, has_results }`.
   - Recommendation: YES — fire from the client `<DirectoryFilters>` after the URL updates.
   - **DEFERRED:** Not addressed in Phase 4 plans. Rationale: PostHog `directory_searched` event is a nice-to-have instrumentation that is non-blocking for MVP launch and carries zero user-facing behavior. Adding it now would force PostHog client-side wiring through the filter bar during Phase 4 execution, expanding Plan 04 scope. Documented as a Phase 6 (analytics polish) or early-v1.1 follow-up. Recommendation acknowledged; timing deferred to protect Phase 4 context budget.

6. **Is the `DirectoryCategoryFilter` best as shadcn `Select` or `Combobox`?**
   - What we know: 10 options. UI-SPEC defers (line 22).
   - What's unclear: Visual parity preference.
   - Recommendation: Combobox for parity with County (both trigger a Popover+Command list with the same styling).
   - **RESOLVED:** Plan 04 Task 1 `DirectoryCategoryFilter.tsx` implements the Combobox pattern (Popover + Command + CommandInput + CommandList + CommandGroup + CommandItem) matching Phase 3's `CountyCombobox`. The 11th item ("All categories" reset) sits at the top of the list. Visual + keyboard-search parity with County filter achieved per recommendation.

7. **Should we do performance testing against a seeded dataset before Phase 4 closes?**
   - What we know: DIR-10 requires TTFB <1s. We have <30 profiles at launch.
   - What's unclear: TTFB at 1k, 10k seed data.
   - Recommendation: Add a `scripts/seed-fake-profiles.ts` (dev-only; disabled in prod) to generate 1k synthetic profiles for local TTFB testing. Not a blocker; defer to Phase 7 seeding plan if tight.
   - **DEFERRED:** Not addressed in Phase 4 plans. Rationale: Plan 05 Task 4 captures a 3-shape TTFB smoke check against local dev (curl timings for no-filter, filtered, and page-2 queries) — sufficient to detect schema/index regressions but does NOT exercise 1k+ row scale. Synthetic seeding at 1k/10k scale is explicitly scoped to the Phase 7 seeding plan per recommendation. Phase 4 gate passes on local sub-1s TTFB + documented escalation path if production Vercel Speed Insights shows p95 >1s post-deploy.

---

## Sources

### Primary (HIGH confidence)

- **CLAUDE.md** (`/Users/ashleyakbar/barterkin/CLAUDE.md`) — locked stack decisions: Postgres FTS + pg_trgm for 100-10k profiles; `@supabase/ssr@0.10.x`; pnpm 10; no third-party search
- **Phase 3 migration** (`supabase/migrations/003_profile_tables.sql`) — RLS policies + FK shape (counties.id=FIPS + categories ids 1-10)
- **Phase 3 middleware** (`lib/supabase/middleware.ts`) — `VERIFIED_REQUIRED_PREFIXES` already covers `/directory`
- **Phase 3 CountyCombobox** (`components/profile/CountyCombobox.tsx`) — reusable `value`/`onChange` shape
- **Phase 4 UI-SPEC** (`.planning/phases/04-directory/04-UI-SPEC.md`) — design contract (locked)
- https://nextjs.org/docs/app/api-reference/file-conventions/page — `searchParams` is Promise in Next 16
- https://nextjs.org/docs/app/api-reference/functions/use-search-params — useSearchParams (client only)
- https://nextjs.org/learn/dashboard-app/adding-search-and-pagination — Next.js official search + pagination pattern
- https://supabase.com/docs/guides/database/full-text-search — Supabase FTS guide
- https://supabase.com/docs/guides/database/extensions/pgtrgm — pg_trgm on Supabase
- https://supabase.com/docs/reference/javascript/range — `.range()` is inclusive
- https://supabase.com/docs/reference/javascript/select#selecting-with-count — count query pattern
- https://www.postgresql.org/docs/current/pgtrgm.html — pg_trgm operators + functions
- https://www.postgresql.org/docs/current/textsearch-controls.html — websearch_to_tsquery
- https://www.postgresql.org/docs/current/textsearch-indexes.html — GIN indexes for FTS
- https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv — RLS perf
- https://vercel.com/docs/speed-insights/metrics — TTFB metric definition
- `npm view next version` → 16.2.4 [VERIFIED: 2026-04-20]
- `npm view @supabase/ssr version` → 0.10.2 [VERIFIED: 2026-04-20]
- `npm view @supabase/supabase-js version` → 2.104.0 [VERIFIED: 2026-04-20]

### Secondary (MEDIUM confidence — WebSearch cross-referenced with official docs)

- https://makerkit.dev/blog/tutorials/pagination-supabase-react — Supabase pagination patterns
- https://0x.run/pagination-offset-vs-cursor — keyset vs offset benchmarks
- https://www.stacksync.com/blog/keyset-cursors-postgres-pagination-fast-accurate-scalable — keyset pagination guide
- https://tacnode.io/post/full-text-search-postgresql-complete-guide — FTS + pg_trgm combined patterns
- https://github.com/orgs/supabase/discussions/5435 — Supabase FTS + trigram community thread
- https://markaicode.com/nextjs-16-server-actions-edge-runtime-ttfb/ — TTFB at the edge
- https://supalaunch.com/blog/supabase-nextjs-pagination — Next.js + Supabase pagination patterns

### Tertiary (LOW confidence — informational only)

- https://medium.com/@Jaimayal/how-to-properly-manage-search-params-in-nextjs-app-router-leverage-the-power-of-nuqs-the-right-way-9f7238cff76a — `nuqs` library (NOT recommended; native URL is sufficient)

---

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — all versions verified via `npm view` in this session; CLAUDE.md locks.
- Architecture: **HIGH** — patterns verified against Postgres official docs + Supabase + Phase 3 existing code.
- Data-layer query: **HIGH** — Supabase `.textSearch()` + `.range()` + relations all documented; Example 2 is buildable as-is.
- Migration (pg_trgm + trigger): **HIGH** — Postgres-native, canonical trigger pattern; Example 4 is runnable.
- Pagination strategy: **MEDIUM** — offset is correct at MVP scale but DIR-07 strict reading says "cursor-based" — A1 assumption should be confirmed in discuss-phase.
- TTFB feasibility: **MEDIUM** — depends on us-east-1 colocation + Postgres hot-path. Pattern 5 breakdown is well-grounded but real numbers need measurement after first deploy.
- Pitfalls: **HIGH** — most are verified against Phase 3 patterns or canonical Postgres/Supabase behavior.

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stable ecosystem; shadcn/ui is the only fast-moving dep and new components are additive)
