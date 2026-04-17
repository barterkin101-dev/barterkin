# Architecture Research

**Domain:** Community directory (Next.js 15 + Supabase + Vercel + Resend; PWA → Capacitor later)
**Researched:** 2026-04-17
**Confidence:** HIGH (Next.js / Supabase / RLS patterns verified against current official docs; Capacitor wrap pattern verified against current guides; Resend Edge Function pattern verified)

---

## 1. System Overview

Georgia Barter is a **read-heavy directory** with occasional writes (profile edits, contact submissions). Three distinct security tiers exist: **public marketing** (anonymous, crawlable), **authed directory** (email-verified members only), and **server-only contact relay** (no client can invoke Resend directly).

```
┌──────────────────────────────────────────────────────────────────────┐
│                            CLIENTS                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐    │
│  │ Anon Web   │  │ Authed Web │  │ PWA (add   │  │ Capacitor    │    │
│  │ (marketing)│  │ (directory)│  │  to home)  │  │ wrap (later) │    │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘    │
│        │               │               │                │             │
├────────┴───────────────┴───────────────┴────────────────┴─────────────┤
│                    NEXT.JS 15 APP ROUTER (Vercel)                     │
│                                                                        │
│  middleware.ts  →  refresh Supabase session cookie on every request   │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ (marketing)      │  │ (auth)           │  │ (app)              │  │
│  │ / landing        │  │ /login           │  │ /directory         │  │
│  │ /how-it-works    │  │ /callback        │  │ /directory/[slug]  │  │
│  │ /about           │  │ /verify-pending  │  │ /profile/edit      │  │
│  │ RSC, no auth     │  │ anon-only guard  │  │ authed+verified    │  │
│  └──────────────────┘  └──────────────────┘  └────────┬───────────┘  │
│                                                         │              │
│  Server Actions (mutations)                             │              │
│  ┌──────────────────────────────────────────────────────┴───────────┐ │
│  │ createProfile / updateProfile / submitContactRequest            │ │
│  │ uses @supabase/ssr server client with user session              │ │
│  └──────────────────────────────────────────────────────┬───────────┘ │
└─────────────────────────────────────────────────────────┼─────────────┘
                                                          │
                        ┌─────────────────────────────────┼───────────────┐
                        │                                 │               │
┌───────────────────────┼────────┐  ┌──────────────────┐  │  ┌────────────┼────────────┐
│   SUPABASE (managed)  ▼         │  │   RESEND         │  │  │  VERCEL EDGE/NODE       │
│                                 │  │                  │  │  │                         │
│ ┌─────────────┐  ┌────────────┐ │  │ transactional    │  │  │  Server Components      │
│ │ auth.users  │  │ Postgres + │ │  │ email API        │  │  │  stream HTML            │
│ │ (managed)   │  │    RLS     │ │  │                  │  │  │                         │
│ └──────┬──────┘  └─────┬──────┘ │  └────────▲─────────┘  │  └─────────────────────────┘
│        │trigger        │         │           │            │
│        └──────→ public.profiles  │           │            │
│                      ...         │           │            │
│ ┌─────────────────────────────┐  │           │            │
│ │ Edge Function: send-contact │──┼───────────┘            │
│ │  - service_role key         │  │   From: noreply@       │
│ │  - validates rate limit     │  │   Reply-To: sender     │
│ │  - writes contact_requests  │  │                        │
│ │  - calls Resend API         │  │                        │
│ └─────────────────────────────┘  │                        │
│                                   │                        │
│ ┌─────────────────────────────┐  │                        │
│ │ Storage: avatars/ bucket    │  │                        │
│ └─────────────────────────────┘  │                        │
└───────────────────────────────────┘                        │
                                                             │
                        ┌──────────────────────────────────┐ │
                        │  LEGACY (temporary)              │ │
                        │  Netlify → index.html             │ │
                        │  retired when (marketing)/ ships  │ │
                        └──────────────────────────────────┘ │
```

**Why this shape:**
- Route groups cleanly split the three security tiers without URL pollution.
- Session refresh belongs in middleware (Server Components can't set cookies).
- Email relay sits in an Edge Function (not a Server Action) so the service_role key never ships to the Next.js runtime, and rate limits run close to the database.
- Capacitor is NOT in the critical path for MVP — the PWA wrap pattern requires `output: 'export'` which would break Server Actions, so we keep the full SSR Next.js app for MVP and add a *thin* Capacitor shell later (covered in §7).

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `middleware.ts` | Refresh Supabase auth cookie on every request; redirect unauthed from `(app)` | `@supabase/ssr` `createServerClient` + `supabase.auth.getClaims()` |
| `(marketing)` route group | Public landing, how-it-works, about, privacy | Pure RSC, no Supabase client needed, SEO-optimized |
| `(auth)` route group | Login, OAuth callback, magic-link pending, verify-pending | Minimal layout, anon-only redirect if already logged in |
| `(app)` route group | Directory browse, profile view/edit, dashboard | Authed+verified guard in layout; Server Components fetch with user session |
| Server Actions | Profile mutations, filter form posts | Use cookie-bound server client; RLS enforces ownership |
| Supabase Edge Function `send-contact` | Validate → rate-limit → insert row → call Resend | Deno runtime, service_role key, only callable by authenticated users |
| `public.profiles` | Per-member directory record | FK to `auth.users`, RLS: authed-read, owner-write |
| `public.contact_requests` | Ledger of initiated contacts (metric + rate limit source) | RLS: sender-write, no-read-anywhere except via Edge Function |
| `public.counties` / `public.categories` | Reference data | RLS: public-read, service-role-write |
| Supabase Storage `avatars/` | Profile photos | RLS: owner-write, authed-read |

---

## 2. Next.js Project Structure

```
georgia-barter/
├── app/
│   ├── (marketing)/                    # public, anonymous-allowed, SEO
│   │   ├── layout.tsx                  # nav (logged-out) + footer, no Supabase
│   │   ├── page.tsx                    # new landing (port from index.html)
│   │   ├── how-it-works/page.tsx
│   │   ├── about/page.tsx
│   │   └── privacy/page.tsx
│   │
│   ├── (auth)/                         # anon-only — redirect to /directory if logged in
│   │   ├── layout.tsx                  # centered card layout
│   │   ├── login/page.tsx              # Google + Apple + magic-link form
│   │   ├── callback/route.ts           # OAuth code exchange → cookie set
│   │   └── verify-pending/page.tsx     # "check your email"
│   │
│   ├── (app)/                          # authed + email-verified only
│   │   ├── layout.tsx                  # authed nav + verify-gate check
│   │   ├── directory/
│   │   │   ├── page.tsx                # browse with search params
│   │   │   └── [username]/page.tsx     # public-ish profile view
│   │   ├── profile/
│   │   │   ├── page.tsx                # own profile preview
│   │   │   └── edit/page.tsx           # edit form
│   │   ├── contact/
│   │   │   └── [recipientId]/page.tsx  # contact form (server action target)
│   │   └── dashboard/page.tsx          # "my profile, my sent contacts"
│   │
│   ├── api/
│   │   ├── health/route.ts             # liveness for Vercel
│   │   └── webhooks/
│   │       └── resend/route.ts         # bounce/complaint webhooks → flag profile
│   │
│   ├── layout.tsx                      # root <html>, fonts, analytics
│   └── globals.css                     # sage/forest/clay CSS vars + Tailwind base
│
├── middleware.ts                        # Supabase session refresh on all matched paths
│
├── features/                            # domain modules (NOT route-coupled)
│   ├── profile/
│   │   ├── actions.ts                  # "use server" mutations
│   │   ├── queries.ts                  # server-side reads (cached)
│   │   ├── schema.ts                   # Zod validators
│   │   ├── ProfileCard.tsx             # RSC — renders one directory entry
│   │   ├── ProfileEditor.tsx           # client — form state + image upload
│   │   └── types.ts
│   ├── directory/
│   │   ├── queries.ts                  # listDirectory(filter, cursor)
│   │   ├── DirectoryGrid.tsx           # RSC — renders grid from query
│   │   ├── DirectoryFilters.tsx        # client — URL-param-driven filter UI
│   │   └── types.ts
│   ├── contact/
│   │   ├── actions.ts                  # submitContact → calls Edge Function
│   │   ├── ContactForm.tsx             # client — subject/message/captcha
│   │   ├── schema.ts                   # Zod (max length, profanity check hook)
│   │   └── types.ts
│   └── auth/
│       ├── actions.ts                  # signInWithOAuth, signInWithMagicLink, signOut
│       ├── guards.ts                   # requireAuth(), requireVerified() helpers
│       └── session.ts                  # getSessionUser() RSC helper (cached per-request)
│
├── components/
│   ├── ui/                              # stack-agnostic primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx                   # for category pills (sage/clay/forest variants)
│   │   └── Dialog.tsx
│   ├── layout/
│   │   ├── NavMarketing.tsx
│   │   ├── NavApp.tsx
│   │   └── Footer.tsx
│   └── brand/
│       ├── Logo.tsx
│       └── tokens.ts                    # sage/forest/clay CSS-var names
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                   # createServerClient (RSC + actions)
│   │   ├── browser.ts                  # createBrowserClient (client components)
│   │   ├── middleware.ts               # createMiddlewareClient + refresh helper
│   │   └── admin.ts                    # service_role client — EDGE FUNCTION ONLY, never imported by app/
│   ├── resend/
│   │   └── client.ts                   # Resend SDK wrapper — also Edge-only
│   ├── email-templates/
│   │   ├── contactRelay.tsx            # React Email template for the relay
│   │   └── welcome.tsx
│   ├── validators/                      # Zod schemas shared across features
│   ├── formatters.ts                   # county display, date formatting
│   └── constants.ts                    # GA_COUNTIES, CATEGORY_TAXONOMY
│
├── supabase/
│   ├── migrations/                      # numbered SQL migrations
│   │   ├── 001_init_profiles.sql
│   │   ├── 002_reference_tables.sql
│   │   ├── 003_contact_requests.sql
│   │   ├── 004_rls_policies.sql
│   │   ├── 005_fts_index.sql
│   │   └── 006_storage_policies.sql
│   ├── functions/
│   │   └── send-contact/
│   │       ├── index.ts                # Edge Function
│   │       └── deno.json
│   ├── seed.sql                         # GA_COUNTIES + starter categories
│   └── config.toml                      # local dev config
│
├── public/
│   ├── manifest.webmanifest             # PWA manifest (sage theme_color)
│   ├── sw.js                             # minimal service worker (cache shell only)
│   ├── icons/                            # 192/512/maskable
│   └── .well-known/
│       ├── apple-app-site-association    # populated when Capacitor ships
│       └── assetlinks.json               # populated when Capacitor ships
│
├── types/
│   └── database.ts                       # generated: `supabase gen types typescript`
│
├── tests/
│   ├── e2e/                              # Playwright
│   └── unit/                             # Vitest
│
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

### Structure Rationale

- **Route groups `(marketing)` / `(auth)` / `(app)`** — Next.js docs-recommended pattern for applying different root-level layouts and guards per security tier without URL pollution. Note: navigating *between* route groups with different root layouts triggers a full page reload — acceptable here because we intentionally want a hard boundary between the marketing shell and the app shell.
- **`features/` domain modules** — separate from `app/` because the same `ProfileCard` is consumed by both `/directory` and `/profile/[username]`; coupling domain logic to route folders leads to import hell. Keeps actions + queries + components + types co-located per business concept.
- **`components/ui/` stack-agnostic primitives** — Button, Card, Avatar, Badge live here. No Supabase imports. Styled with Tailwind + CSS vars (`--forest`, `--sage-bg`, `--clay`) so the existing palette ports cleanly.
- **`lib/supabase/`** — three separate clients because the `@supabase/ssr` package exposes distinct factories for server, browser, and middleware contexts. The `admin.ts` (service_role) client is ring-fenced so a junior or future-you can't accidentally import it from a client component.
- **`supabase/` at repo root** — matches `supabase` CLI conventions so `supabase db push` / `supabase functions deploy` work without flags.
- **Landing page moves into `(marketing)/page.tsx`** — do NOT keep `index.html` on Netlify long-term. Reasons: (a) a single domain for SEO and brand; (b) the current index.html has `data-netlify="true"` form submissions that will 404 once the Next app becomes canonical; (c) duplicate nav/footer maintenance. Netlify stays live only until the `(marketing)` page passes visual parity.

### Server vs Client Components — Where Each Lives

| Surface | RSC / Client | Why |
|---------|--------------|-----|
| Marketing pages | RSC | SEO, static-ish, no interactivity beyond nav |
| Directory grid rendering | RSC | Data fetched server-side with user's session, HTML streamed |
| Directory filter controls | Client | URL param manipulation, controlled inputs |
| Profile edit form | Client | Form state, image upload progress, optimistic UI |
| Profile view | RSC | Read-only, cacheable per-request |
| Contact form | Client | Form state + captcha widget; submit triggers Server Action |
| Nav (authed) | Client (thin shell) + RSC (user data) | User avatar pre-rendered; dropdown is client |
| Dashboard ("my contacts sent") | RSC | Read-only list |

Rule of thumb: **default to RSC; escalate to client only when you need `useState`, `useEffect`, event handlers, or browser APIs.** Filter UI is the main client-component surface in the directory path.

---

## 3. Data Model (Postgres Schema)

### 3.1 `public.profiles`

```sql
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       citext unique not null,                    -- URL slug, lowercased
  display_name   text not null check (char_length(display_name) between 2 and 60),
  bio            text check (char_length(bio) <= 500),
  avatar_url     text,                                       -- Supabase Storage signed URL
  county_id      smallint not null references public.counties(id),
  availability   text check (char_length(availability) <= 200),
  contact_pref   text not null default 'email'
                 check (contact_pref in ('email','email_tiktok','email_phone')),
  is_published   boolean not null default false,             -- only true after email verified AND user hits publish
  email_verified boolean not null default false,             -- mirrored from auth.users.email_confirmed_at via trigger
  reported_count smallint not null default 0,                -- denormalized for sort/filter
  search_vector  tsvector generated always as (
                   setweight(to_tsvector('english', coalesce(display_name,'')), 'A') ||
                   setweight(to_tsvector('english', coalesce(bio,'')),           'B') ||
                   setweight(to_tsvector('english', coalesce(availability,'')),  'C')
                 ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz                                  -- soft delete
);

create index profiles_published_county_idx
  on public.profiles (is_published, county_id)
  where deleted_at is null;

create index profiles_search_vector_idx
  on public.profiles using gin (search_vector)
  where deleted_at is null and is_published = true;

create index profiles_username_idx on public.profiles (username);
```

**Rationale:**
- `id uuid primary key references auth.users(id)` — the canonical Supabase extend-auth pattern; no separate `user_id` column, simpler joins.
- `username citext unique` — case-insensitive URL slugs (`/directory/ashley` not `/directory/Ashley`).
- `search_vector` is a **stored generated column** — Postgres maintains it automatically on insert/update. Weighted A/B/C so name matches rank above bio matches above availability. GIN index is the preferred index type for tsvector (per official Postgres docs).
- **Partial indexes** on `where deleted_at is null and is_published = true` — 99% of directory queries filter this way, so the index is ~half the size and skips the WHERE-check entirely.
- `email_verified` is mirrored into `profiles` (not queried via JOIN to auth.users) because: (a) joins across the `auth` schema are cumbersome under RLS, (b) it lets us compose the verification gate as a simple `WHERE email_verified = true` inside directory queries.
- Soft delete via `deleted_at` preserves `contact_requests` referential integrity when a member deletes their profile (their sent contacts don't cascade-delete, protecting the recipient's inbox history).

### 3.2 Skills: separate tables, not JSON arrays

**Recommendation: separate `skills_offered` and `skills_wanted` tables.**

```sql
create table public.skills_offered (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  category_id smallint not null references public.categories(id),
  title       text not null check (char_length(title) between 2 and 80),
  description text check (char_length(description) <= 300),
  search_vector tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
                  setweight(to_tsvector('english', coalesce(description,'')), 'B')
                ) stored,
  created_at  timestamptz not null default now()
);
create index skills_offered_profile_idx on public.skills_offered (profile_id);
create index skills_offered_category_idx on public.skills_offered (category_id);
create index skills_offered_search_idx on public.skills_offered using gin (search_vector);

create table public.skills_wanted (
  -- identical shape
);
```

**Why not JSON arrays on profile:**
- **Filtering** — "show me all profiles offering *tutoring* in *Fulton County*" requires indexed category joins; JSON containment queries (`skills @> '[{"category":"tutoring"}]'`) are clumsy and don't compose with county + text filters in a single efficient plan.
- **FTS granularity** — a tsvector on a JSON blob conflates offered vs wanted skills, which makes ranking noisy.
- **Per-skill cardinality is bounded** — most profiles will list 1-5 skills of each type. The join-cost argument against normalization doesn't apply at this scale.
- **Future-proofing** — Barter Tools milestone will need per-skill trade history. Starting with a skills row makes that a non-breaking change.

The only case for JSON would be if skills were free-text tags with no category. The project already specifies a curated taxonomy, which tips the decision hard toward normalized tables.

### 3.3 `public.counties` — lookup table, not enum

```sql
create table public.counties (
  id    smallint primary key,
  name  text not null unique,              -- "Fulton", "Gwinnett", ...
  slug  text not null unique,              -- "fulton", "gwinnett"
  fips  text not null unique               -- "13121" (GA Fulton), for future data joins
);
```

**Why lookup, not enum:**
- Postgres enums require `ALTER TYPE ... ADD VALUE` which **can't run inside a transaction before PG 12** and still requires migration coordination.
- Georgia has 159 counties and isn't changing, but adjacent use cases (display order, region grouping, census joins) require *columns* that enums can't hold.
- Foreign-keying a `smallint` is cheaper than string comparisons, and gives us free validation.
- Seeded once in `supabase/seed.sql` from a canonical GA counties JSON.

### 3.4 `public.categories` — flat for MVP, hierarchy-ready

```sql
create table public.categories (
  id          smallint primary key,
  slug        text not null unique,           -- "tutoring", "farm-labor"
  name        text not null,                  -- "Tutoring"
  parent_id   smallint references public.categories(id),   -- null at MVP, future-proofing
  sort_order  smallint not null default 0,
  is_active   boolean not null default true
);
```

- Flat taxonomy for MVP (PROJECT.md out-of-scope: "curated Georgia category taxonomy — v1.1+"). Keep it to 6-10 categories matching the existing `index.html` (food, agriculture, services, crafts, beauty, wellness) plus whatever emerges.
- `parent_id` column added now but left null — avoids a migration later when v1.1 introduces hierarchy.

### 3.5 `public.contact_requests` — metric source + rate-limit source of truth

```sql
create table public.contact_requests (
  id             uuid primary key default gen_random_uuid(),
  sender_id      uuid not null references public.profiles(id),
  recipient_id   uuid not null references public.profiles(id),
  subject        text not null check (char_length(subject) between 3 and 120),
  message        text not null check (char_length(message) between 10 and 1500),
  status         text not null default 'sent'
                 check (status in ('sent','bounced','complained','rate_limited')),
  resend_id      text,                                   -- Resend message ID for tracing
  sender_ip      inet,                                   -- for abuse detection (not shown in UI)
  user_agent     text,
  created_at     timestamptz not null default now()
);

create index contact_requests_sender_idx on public.contact_requests (sender_id, created_at desc);
create index contact_requests_recipient_idx on public.contact_requests (recipient_id, created_at desc);
create index contact_requests_rate_limit_idx on public.contact_requests (sender_id, created_at)
  where status = 'sent';

-- Prevent a sender from contacting the same recipient more than once per 24h
create unique index contact_requests_dedupe_idx on public.contact_requests (sender_id, recipient_id, (created_at::date));
```

- `sender_id`/`recipient_id` both FK to `profiles` (not `auth.users`) — ensures both parties have a profile.
- `sender_ip` + `user_agent` captured for abuse triage (never surfaced in UI).
- The **partial unique index on date** is the dedupe primitive: one contact per (sender, recipient, day). Attempts to double-submit trigger a unique violation the Edge Function can catch and translate to a friendly "already contacted today" message.
- The rate-limit index supports "count sends in last 24h by this sender" in one planner-cached range scan.

### 3.6 `public.reports` (moderation queue, deferred to v1.1 but scaffold now)

```sql
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id),
  reported_profile_id uuid not null references public.profiles(id),
  reason        text not null,
  details       text,
  status        text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  created_at    timestamptz not null default now()
);
```

Ship the table + RLS in MVP even if the admin UI comes later — cheaper than a migration during a moderation incident.

### 3.7 Audit columns + `updated_at` trigger

Standard Supabase idiom:

```sql
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
```

### 3.8 Composite filter query (directory browse)

```sql
-- category × county × keyword, published + verified only, cursor-paginated
select p.id, p.username, p.display_name, p.bio, p.avatar_url,
       c.name as county, ts_rank(p.search_vector, plainto_tsquery('english', $1)) as rank
  from public.profiles p
  join public.counties c on c.id = p.county_id
  join public.skills_offered s on s.profile_id = p.id
 where p.deleted_at is null
   and p.is_published = true
   and p.email_verified = true
   and ($2::smallint is null or s.category_id = $2)         -- optional category
   and ($3::smallint is null or p.county_id = $3)           -- optional county
   and ($1 = '' or p.search_vector @@ plainto_tsquery('english', $1))  -- optional keyword
   and (p.created_at, p.id) < ($4, $5)                       -- cursor
 order by p.created_at desc, p.id desc
 limit 21;                                                    -- fetch N+1 for "has more"
```

Supporting indexes: `profiles_published_county_idx`, `skills_offered_category_idx`, `profiles_search_vector_idx`. On small datasets (< 10k profiles) this plans as a bitmap heap scan; well within free-tier budget.

---

## 4. RLS Policy Architecture

### 4.1 Core principles (verified against current Supabase docs)

1. **Always specify `to authenticated` / `to anon`** — never leave the `TO` clause empty (which defaults to `public` and ignores role). This was called out in 2024-2025 Supabase perf guidance.
2. **Wrap `auth.uid()` in a subquery**: `(select auth.uid())` instead of bare `auth.uid()`. This lets Postgres run the function once per statement via initPlan caching instead of once per row. Meaningful at scale, free to adopt.
3. **Index every column referenced in a policy** — `user_id`, `profile_id`, etc. RLS adds a `WHERE` clause to every query; that clause must be indexable.
4. **No recursive policies** — never write a policy on table A that queries table A. Extract shared logic into a `security definer` function if needed.
5. **Policies are additive (OR'd) per action** — prefer one tight policy per `(role, action)` tuple over clever multi-condition policies.

### 4.2 Policies per table

**`public.profiles`**

```sql
alter table public.profiles enable row level security;

-- authed users can read published, non-deleted, verified profiles
create policy "profiles_read_published"
  on public.profiles for select to authenticated
  using (is_published = true and email_verified = true and deleted_at is null);

-- authed users can always read their own row (even unpublished)
create policy "profiles_read_self"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- owner can insert their own row (normally the trigger does this, but allow manual)
create policy "profiles_insert_self"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- owner can update their own row
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- soft-delete only; hard delete blocked for everyone except service_role
-- (no DELETE policy = no one with authenticated role can delete)
```

**Critical:** *no* anon-read policy on `profiles`. Anonymous visitors see the marketing page; directory requires login. This is the single biggest privacy lever in the system.

**`public.skills_offered` / `public.skills_wanted`**

```sql
-- authed can read skills belonging to a visible profile
create policy "skills_read_visible"
  on public.skills_offered for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
       where p.id = skills_offered.profile_id
         and p.is_published = true
         and p.email_verified = true
         and p.deleted_at is null
    )
    or profile_id = (select auth.uid())
  );

-- owner-only mutations
create policy "skills_write_self"
  on public.skills_offered for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
```

**`public.contact_requests`**

```sql
-- recipient can read contacts addressed to them (for "my received contacts" page, if shipped)
create policy "contact_read_recipient"
  on public.contact_requests for select to authenticated
  using (recipient_id = (select auth.uid()));

-- sender can read their own sent contacts
create policy "contact_read_sender"
  on public.contact_requests for select to authenticated
  using (sender_id = (select auth.uid()));

-- sender can insert, but ONLY for themselves
-- (the Edge Function is expected to insert; this is a defense-in-depth policy)
create policy "contact_insert_self"
  on public.contact_requests for insert to authenticated
  with check (sender_id = (select auth.uid()));

-- no one can update or delete; service_role bypasses RLS for ops queries
```

Note: the Edge Function uses `service_role` key which **bypasses RLS**, so the above policies are for direct-from-client operations. Having the policies forces an explicit decision about whether future client paths should be allowed to insert directly.

**`public.counties` / `public.categories`**

```sql
-- anon + authed read; only service_role writes
create policy "counties_read_all" on public.counties for select to anon, authenticated using (true);
-- no insert/update/delete policies = only service_role can mutate
```

**`public.reports`**

```sql
create policy "reports_insert_any_authed" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
-- no select policy for authenticated = reports are opaque to reporter
-- (admin UI uses service_role to query the queue)
```

### 4.3 Storage RLS (`avatars/` bucket)

```sql
-- pattern: path = "{user_id}/avatar.{ext}"
create policy "avatar_read_authed"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatar_write_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatar_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

### 4.4 RLS pitfalls to actively avoid

- **Bare `auth.uid()` without `(select …)`** — fine for 100 rows, 100x slower at 100k rows.
- **Missing index on `user_id` / `profile_id`** — RLS turns every query into a filtered scan; without an index, it's a seq scan.
- **Reading auth.users columns directly from RLS policies** — cross-schema reads get expensive and break when Supabase updates the auth schema. Mirror the one bit you need (`email_verified`) into `profiles` via a trigger.
- **Policy that queries the same table it protects without a `security definer` wrapper** — causes infinite recursion.
- **Granting SELECT to `public` role (the default)** — `public` includes unauthenticated requests in Postgres semantics. Always specify `to authenticated` explicitly.

---

## 5. Auth Flow & Session Handling

### 5.1 Package choice

**Use `@supabase/ssr` (current), NOT the deprecated `@supabase/auth-helpers-nextjs`.** Supabase officially recommends `@supabase/ssr` for all new Next.js App Router projects as of 2024.

### 5.2 Three client factories

| Factory | File | Used in | Notes |
|---------|------|---------|-------|
| `createServerClient` | `lib/supabase/server.ts` | RSC, Server Actions, Route Handlers | Reads/writes cookies via `cookies()` helper |
| `createBrowserClient` | `lib/supabase/browser.ts` | Client Components only | Reads cookies from `document.cookie` |
| `createMiddlewareClient` | `lib/supabase/middleware.ts` | `middleware.ts` | Handles the cookie-refresh dance |

### 5.3 Session refresh architecture

Server Components cannot write cookies (Next.js constraint). So sessions must be refreshed in middleware:

```ts
// middleware.ts (skeleton)
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  // CRITICAL: always use getClaims() not getSession() in server code
  const { data: { claims } } = await supabase.auth.getClaims();

  // redirect logic for (app) group
  if (request.nextUrl.pathname.startsWith('/directory') && !claims) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.well-known/).*)',
  ],
};
```

Current Supabase guidance: **use `supabase.auth.getClaims()`, not `getSession()`** in server code. `getClaims()` verifies the JWT signature against the project's public keys; `getSession()` may return a stale, unverified token.

### 5.4 OAuth redirect URL architecture

Supabase OAuth requires redirect URLs to be pre-registered. Register **all three** environments up front:

| Env | Redirect URL | Notes |
|-----|--------------|-------|
| Local dev | `http://localhost:3000/callback` | per-developer |
| Vercel preview | `https://*.vercel.app/callback` | wildcard if Supabase supports it; otherwise register each preview URL manually — painful |
| Production | `https://georgiabarter.com/callback` | post-domain purchase |

**Recommendation:** use **two separate Supabase projects** — one for `localhost + preview branches`, one for production (see §9). This sidesteps the wildcard-redirect mess.

The callback route:

```ts
// app/(auth)/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = createServerClient(/* cookies adapter */);
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL('/directory', request.url));
}
```

### 5.5 Email-verified gate

Two-layer enforcement:

1. **Data layer** (RLS) — directory read policy requires `email_verified = true`. Even if the UI leaks, nothing renders.
2. **UX layer** (middleware/layout) — `(app)/layout.tsx` fetches user claims, checks `email_verified_at is not null`, redirects to `/verify-pending` if false.

The `email_verified` column on `profiles` is kept in sync via an Auth webhook or a database trigger on the (internal) `auth.users` table watching `email_confirmed_at`. A simple synchronous approach:

```sql
create or replace function public.sync_email_verified() returns trigger as $$
begin
  update public.profiles
     set email_verified = (new.email_confirmed_at is not null)
   where id = new.id;
  return new;
end; $$ language plpgsql security definer;

create trigger on_auth_user_verified
  after update of email_confirmed_at on auth.users
  for each row execute procedure public.sync_email_verified();
```

### 5.6 Guards: middleware vs layout vs per-page

**Decision: middleware for coarse redirect, layout for verified-check, per-page checks only when scoping.**

| Check | Where | Why |
|-------|-------|-----|
| "Is user logged in?" | `middleware.ts` | Runs before any RSC, cheapest place |
| "Is email verified?" | `(app)/layout.tsx` | Happens once per (app) page load, and middleware already has claims |
| "Is this user the profile owner?" (for `/profile/edit`) | page.tsx | Per-page business rule |

Middleware *can* do the verified check, but overloading middleware with business rules hurts cold-start latency. Keep middleware to auth-presence + route-group routing; push "is verified" to the layout.

---

## 6. Contact-Relay Architecture

### 6.1 Flow

```
[Client ContactForm.tsx]
    │ submit (subject, message)
    ▼
[Server Action: submitContact()]
    │ - read current user from cookies
    │ - Zod validate
    │ - call Edge Function with user JWT
    ▼
[Supabase Edge Function: send-contact]
    │ (runs in Deno, has SERVICE_ROLE_KEY in env)
    │ 1. verify JWT → get sender user_id
    │ 2. query contact_requests for this sender in last 24h → enforce rate limit
    │ 3. query recipient profile → ensure published + verified
    │ 4. INSERT contact_requests (sender_id, recipient_id, subject, message)
    │    ↓ unique index on (sender, recipient, date) dedupes
    │ 5. call Resend API with From: noreply@georgiabarter.com,
    │                       Reply-To: <sender_email>,
    │                       To: <recipient_email>
    │ 6. store Resend message_id back on contact_requests row
    │ 7. return { success, contact_id } to server action
    ▼
[Server Action returns to Client]
    │ render "Your message has been sent" confirmation
    ▼
[Client] fires analytics event: contact_initiated (recipient_id, category)
```

### 6.2 Why Edge Function and not Server Action directly

- Server Action runs on Vercel Node runtime → would need `RESEND_API_KEY` in Vercel env vars. Acceptable, but...
- Keeping the call in a **Supabase Edge Function** co-locates it with the database, keeps the Resend key out of the Next.js bundle surface area, and gives a natural enforcement point for "service_role bypasses RLS" operations.
- Edge Function also naturally hosts the **bounce/complaint webhook receiver** from Resend, which updates `contact_requests.status`.

### 6.3 Rate limiting — three layers

1. **DB unique index** on `(sender_id, recipient_id, created_at::date)` — per-pair daily dedupe. Free, guaranteed.
2. **Sender daily cap** — count `contact_requests` rows with `sender_id = :uid and created_at > now() - interval '24 hours' and status = 'sent'`. Cap at (say) **5 per day for MVP**, low enough to deter spam, high enough for legitimate browsing.
3. **IP-based soft rate limit** in the Edge Function — Supabase's rate limiting example uses a sliding window; at MVP scale an in-memory map keyed by IP is fine. Upgrade to Upstash Redis if abuse surfaces.

### 6.4 Reply-To pattern (so recipient can reply directly)

```ts
await resend.emails.send({
  from: 'Georgia Barter <noreply@georgiabarter.com>',
  to: recipientEmail,
  reply_to: senderEmail,                   // ← the key line
  subject: `[Georgia Barter] ${sanitizedSubject}`,
  react: <ContactRelayEmail
           senderDisplayName={sender.display_name}
           message={message}
           profileUrl={...} />,
  headers: {
    'X-Entity-Ref-ID': contactRequestId,   // so bounces can be traced back
  },
});
```

Recipient hits "Reply" in their email client → message goes directly to sender's email. Platform is out of the loop after first contact (matches PROJECT.md spec: "replies go direct after first touch").

**DMARC / sender auth** — `From: noreply@georgiabarter.com` requires:
- SPF record listing Resend's sending IPs
- DKIM records provisioned by Resend
- DMARC record at `_dmarc.georgiabarter.com`

Skipping any of these lands the relay in spam folders. This is a pre-launch checklist item, not a nice-to-have.

### 6.5 Analytics event: "initiated contacts"

The success metric. Fire twice (defensive):
- **Server-side**, inside the Edge Function post-successful-insert, to Vercel Analytics or PostHog or Plausible. Source of truth.
- **Client-side** after the server action resolves, for UX-level funnels (button hover → submit → success).

Counting raw `contact_requests` rows where `status = 'sent'` is also a source-of-truth alternative that requires no event bus — just a DB query. Recommended for MVP: skip the analytics infra, build a `/admin/metrics` page that queries `contact_requests`.

---

## 7. Search / Filter Query Patterns

### 7.1 Pattern: URL params + server component re-render

```
/directory?q=gardening&category=agriculture&county=fulton&cursor=...
```

Client `DirectoryFilters.tsx` (thin) updates URL via `router.push('/directory?' + new URLSearchParams(...))`. Server Component `DirectoryPage` reads `searchParams`, calls `queries.listDirectory(filter, cursor)`, renders grid. Next.js handles the re-render via RSC streaming.

**Why not a single `search` server action returning JSON to a client grid:**
- Loses SEO (filter pages are crawlable and shareable URLs).
- Doubles the code (server action + client fetch + client render vs server-only render).
- Server Components + searchParams is the idiomatic Next.js 15 pattern.

### 7.2 Pagination: cursor, not offset

- Offset pagination (`LIMIT 20 OFFSET 40`) degrades as the directory grows and is incorrect when rows are inserted mid-pagination.
- Cursor on `(created_at desc, id desc)` is stable and index-friendly.
- Cursor encoded as base64(`${created_at}|${id}`) in a `cursor` query param.

### 7.3 Filter composition

One query, all optional params, NULL-guarded:

```sql
where p.deleted_at is null
  and p.is_published = true
  and p.email_verified = true
  and (:category_id is null or s.category_id = :category_id)
  and (:county_id   is null or p.county_id = :county_id)
  and (:q = ''      or p.search_vector @@ plainto_tsquery('english', :q))
  and ((:cursor_created_at is null)
       or (p.created_at, p.id) < (:cursor_created_at, :cursor_id))
order by p.created_at desc, p.id desc
limit 21;
```

Postgres planner handles NULL-gated clauses efficiently; no need for dynamic SQL construction.

---

## 8. PWA + Capacitor Boundaries

### 8.1 PWA (MVP)

- `public/manifest.webmanifest`:
  ```json
  {
    "name": "Georgia Barter",
    "short_name": "GA Barter",
    "start_url": "/directory",
    "scope": "/",
    "display": "standalone",
    "theme_color": "#2d5a27",
    "background_color": "#eef3e8",
    "icons": [
      { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
      { "src": "/icons/maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
  }
  ```
- **Minimal service worker**: cache shell (HTML, CSS, fonts, icons), network-first for everything else. Do NOT try to cache Supabase API responses at MVP — RLS + session cookies make it error-prone.
- `next-pwa` or `@serwist/next` for the SW scaffolding; both wrap Workbox.

### 8.2 Capacitor readiness (design now, implement later)

The PROJECT.md promises "Capacitor wrap is a 1-day job later." Making that true requires four things baked in now:

1. **Deep-link URL schema** — design every shareable resource with a canonical URL:
   - `/directory/:username` — profile view
   - `/categories/:slug` — category browse
   - `/callback` — OAuth return (CRITICAL for Capacitor; iOS universal links must resolve here)

2. **Assetlinks + AASA placeholders** — `public/.well-known/apple-app-site-association` and `public/.well-known/assetlinks.json` exist as empty/stub files now. Server them with `Content-Type: application/json` and no auth. Next.js serves `public/` as-is, so this is free.

3. **Storage-key discipline** — anything we put in `localStorage` or IndexedDB must be keyed with a namespace (`ga_barter:*`) because Capacitor's WebView shares storage quirks with Safari. The Supabase client does this correctly by default; user-added storage (e.g., draft form state) should follow suit.

4. **No `output: 'export'` lock-in** — current Capacitor + Next.js tutorials push for static export, which would break our Server Actions and RSC data fetching. The **alternative** is to host the Next.js app on Vercel and point the Capacitor shell at the hosted domain via WebView. That means:
   - Capacitor becomes a thin WebView shell + native plugin access (push notifs, haptics, share sheet).
   - Universal Links deep-link the shell back to the Vercel-hosted URL.
   - Service worker still handles offline shell.
   - No static export, no `next build && next export`, no SSR loss.

   This is the pragmatic path and is what most production Next.js + Capacitor apps ship.

5. **Push notification readiness** — add a `public.push_subscriptions` table now (empty, not used), with columns for `user_id`, `platform` (`web`/`ios`/`android`), `endpoint`, `keys`, `device_id`. No API implemented; the table exists. When Capacitor ships, one migration adds the `notifications` table, one Edge Function drops in to fan-out — no schema disruption to existing tables.

---

## 9. Suggested Build Order

The constraint: every phase must be independently demo-able, and later phases cannot require rework of earlier ones. Dependency order:

```
Phase A. Foundation
  └─→ Phase B. Auth
        └─→ Phase C. Profile CRUD
              ├─→ Phase D. Directory (browse + filter + search)
              │     └─→ Phase E. Contact Relay
              │           └─→ Phase F. Metrics + Moderation
              └─→ Phase G. PWA + Landing Polish (parallel to D/E once profile is stable)
                    └─→ Phase H. Capacitor wrap (deferred until App Store demand)
```

### Phase A — Foundation (repo + infra + palette)

- Next.js 15 App Router scaffold with Tailwind
- Port sage/forest/clay CSS vars + Lora/Inter fonts
- `components/ui/` primitives (Button, Card, Input, Select, Avatar, Badge)
- `lib/supabase/{server,browser,middleware}.ts` clients wired up
- Supabase projects (prod + dev) provisioned, CLI-linked
- Migrations folder initialized; counties + categories seed
- `middleware.ts` with session refresh + route-group routing stubs
- Vercel + domain configured

**Reasoning:** the palette ports are cheap; doing them first means every UI built afterward matches the brand without retrofit. Supabase migrations set up before any data code makes subsequent phases "write migration, write code" instead of "write code, retrofit migration."

### Phase B — Auth (log in, verify, sign out)

- `(auth)/login` page — Google, Apple, magic-link buttons
- `(auth)/callback/route.ts` — code exchange
- `(auth)/verify-pending` — email verification holding page
- `handle_new_user` trigger → creates `profiles` row on signup
- `sync_email_verified` trigger → updates `profiles.email_verified`
- RLS on `profiles` (self-read, self-write; authed-read gated on is_published + verified)
- Basic `(app)/dashboard` that just shows "Logged in as X" to prove auth works

**Reasoning:** every downstream phase needs `auth.uid()` to exist. Defer profile *editing* UI until C; here we just prove the session round-trip.

### Phase C — Profile CRUD

- Profile edit form (client component, Zod validated)
- Avatar upload → Supabase Storage with RLS
- `skills_offered` + `skills_wanted` + `categories` + `counties` tables + policies
- "Publish profile" toggle (owner flips `is_published`)
- Own-profile view at `/profile`

**Reasoning:** directory needs data. Seed with test profiles via `supabase/seed.sql` so Phase D has something to render against during development even before real signups.

### Phase D — Directory (browse, filter, search)

- `/directory` RSC page reading `searchParams`
- `DirectoryFilters` client component (category buttons + county select + search input)
- FTS indexes on `profiles.search_vector` and `skills_offered.search_vector`
- Cursor pagination
- `/directory/[username]` profile view (RSC)

**Reasoning:** without directory, there's nothing to contact. Filter + search first because MVP success metric (initiated contacts) can't even register until someone finds someone.

### Phase E — Contact Relay

- `contact_requests` table + RLS
- Supabase Edge Function `send-contact` with Resend
- Domain DNS: SPF, DKIM, DMARC
- `(app)/contact/[recipientId]` page + form
- Rate limit: daily cap per sender, unique-per-day constraint
- Resend bounce/complaint webhook → `/api/webhooks/resend`

**Reasoning:** the core value prop. Everything before is plumbing.

### Phase F — Metrics + Moderation

- `/admin/metrics` page (service-role query of `contact_requests`)
- `reports` table + simple "report this profile" button
- Soft delete flow for owner ("delete my profile")

**Reasoning:** once the system is live, observability and moderation become urgent. Doing them in MVP is cheap insurance.

### Phase G — Landing + PWA polish

- Port `index.html` into `(marketing)/page.tsx` with parity
- Add `/how-it-works`, `/about`, `/privacy`
- PWA manifest + service worker
- Retire Netlify

**Reasoning:** can be done in parallel with E/F once C is stable. The *existing* Netlify page keeps serving until (marketing) ships — no outage.

### Phase H — Capacitor wrap (post-MVP, triggered by App Store demand)

Separate milestone. Not MVP.

---

## 10. Environments

### 10.1 Three tiers

| Env | Next.js | Supabase | Domain | Purpose |
|-----|---------|----------|--------|---------|
| **local** | `next dev` | local `supabase start` docker OR shared "dev" Supabase project | `localhost:3000` | solo dev, migrations run before push |
| **preview** | Vercel preview deploys per PR | **shared "dev" Supabase project** (NOT prod) | `<pr>.vercel.app` | stakeholder review, E2E CI |
| **production** | Vercel production | **separate "prod" Supabase project** | `georgiabarter.com` | live |

**Recommendation:** two Supabase projects — `georgia-barter-dev` and `georgia-barter-prod`. Preview URLs point at dev; prod points at prod. This sidesteps the wildcard-redirect-URL problem with OAuth, and lets you nuke dev data freely.

### 10.2 Environment variables (Vercel + Supabase Edge)

```
# Vercel (per environment)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=                   # https://georgiabarter.com or preview URL
RESEND_WEBHOOK_SECRET=                  # for /api/webhooks/resend

# Supabase Edge Function secrets (per project, set via `supabase secrets set`)
SUPABASE_SERVICE_ROLE_KEY=              # auto-injected
RESEND_API_KEY=
EMAIL_FROM=noreply@georgiabarter.com
RATE_LIMIT_DAILY_CAP=5
```

**Never:** `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars. It belongs exclusively in Edge Function secrets.

### 10.3 Seeded test data

`supabase/seed.sql` runs on `supabase db reset`:
- 159 GA counties (canonical list)
- 6-8 starter categories
- 20-30 fake profiles with varied skills (for directory screenshots + E2E tests)
- Fake profile IDs are deterministic UUIDs so tests can reference them stably

Production is NEVER seeded; `seed.sql` only runs on `dev` project and local.

### 10.4 Migration workflow

- New feature → new `supabase/migrations/NNN_name.sql`
- `supabase db push` on PR branch → applied to **dev** project
- Merge to `main` → GitHub Action runs `supabase db push --linked` against **prod**
- Never click-ops the Supabase dashboard UI for schema changes (drift → doom)

---

## Anti-Patterns Specific to This Stack

### Anti-Pattern 1: Service-role client in Next.js runtime

**What people do:** import a Supabase client initialized with `SUPABASE_SERVICE_ROLE_KEY` from a Server Action because "it's easier than Edge Functions."
**Why it's wrong:** Next.js tree-shaking is fragile around env vars. A misconfigured import can leak the service_role key into the client bundle. Even without leak, any bug in the action becomes a "bypass all RLS" bug.
**Do this instead:** service_role only in `supabase/functions/*` (Edge Functions). The Next.js app uses cookie-bound clients exclusively.

### Anti-Pattern 2: `getSession()` in server code

**What people do:** call `supabase.auth.getSession()` in middleware / RSC to check auth.
**Why it's wrong:** Current Supabase docs warn this returns an unverified token. A forged/expired cookie can return a valid-looking session.
**Do this instead:** `supabase.auth.getClaims()` — verifies the JWT signature against the project's published public keys.

### Anti-Pattern 3: Storing skills as JSON on the profile row

**What people do:** `profiles.skills jsonb` with array of `{category, title}`.
**Why it's wrong:** filtering by category × county × FTS can't use composite indexes effectively; migrations to per-skill history (Barter Tools v2) require rewriting every row.
**Do this instead:** normalized `skills_offered` / `skills_wanted` tables with FKs.

### Anti-Pattern 4: Enum for counties

**What people do:** `create type ga_county as enum (...)`.
**Why it's wrong:** can't attach region metadata, can't sort by population, `ALTER TYPE ADD VALUE` has transaction restrictions, renaming a county = schema migration.
**Do this instead:** `counties` lookup table.

### Anti-Pattern 5: Public contact info in the directory UI

**What people do:** show `mailto:` and `tel:` links on profile cards.
**Why it's wrong:** PROJECT.md constraint: "Member email/phone never exposed in the directory UI — always routed through the relay." Scrapers harvest exposed contacts instantly.
**Do this instead:** Contact button → relay form → Edge Function → email. Period.

### Anti-Pattern 6: Auth rules split across middleware AND layout AND page

**What people do:** half-check auth in middleware, also in layout, also at top of page component "just to be sure."
**Why it's wrong:** scattered rules mean a future route bypasses a check silently.
**Do this instead:** middleware = "is logged in, which group"; layout = "is verified"; page = business-specific scoping. One-check-per-concern.

### Anti-Pattern 7: Cache tag invalidation for directory changes

**What people do:** aggressively cache directory queries with `revalidateTag` on every write.
**Why it's wrong:** RLS means the same query returns different results per user; one cache bucket poisons another user's view.
**Do this instead:** at MVP, don't cache directory queries server-side. Supabase's Postgres is fast enough for <10k profiles with proper indexes. Add caching only after measuring latency.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@supabase/ssr` server/browser/middleware clients | Register redirect URLs in dashboard; use `getClaims()` in server code |
| Supabase Postgres | Cookie-bound client; RLS-enforced | All reads go through the user's session; service_role only in Edge Functions |
| Supabase Storage | Bucket `avatars/`; path = `{user_id}/avatar.ext` | RLS policy on `storage.objects` |
| Supabase Edge Functions | Deno; one function per bounded operation | `send-contact`, future `send-welcome`, future `moderate-report` |
| Resend | REST API called from Edge Function | SPF/DKIM/DMARC required; bounce webhook → `/api/webhooks/resend` |
| Google OAuth | Supabase Auth provider | Register redirect URI in Google Cloud + Supabase |
| Apple OAuth | Supabase Auth provider | Requires Apple Developer account; private key rotation every 6mo |
| Vercel | Next.js host | Env vars per-environment; `main` → prod, PRs → preview |
| Sentry or Logtail (optional) | Error tracking | Defer to post-MVP unless issues emerge |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client Component ↔ Server Action | `"use server"` form action or direct call | Pass plain objects; no classes |
| Server Component ↔ Supabase | `createServerClient(cookies())` in `queries.ts` | Wrap in `cache()` for per-request dedupe |
| Server Action ↔ Edge Function | HTTPS `fetch` with user JWT in Authorization header | Function verifies JWT before service_role ops |
| Edge Function ↔ Postgres | `supabase-js` with service_role | Bypasses RLS; must implement its own authz checks |
| Edge Function ↔ Resend | REST via `@resend/node` SDK | Timeout 10s; log Resend message_id to `contact_requests.resend_id` |
| `features/*` modules ↔ `components/ui/*` | One-way dependency | UI primitives NEVER import from features |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current design untouched. Supabase free tier, Vercel hobby, Resend free. No caching. |
| 1k-10k users | Add Vercel Analytics (if not already). Consider `cache()` wrapping on query helpers with per-request dedupe (already cheap). Still free-tier for everything. |
| 10k-50k users | Upgrade Supabase to Pro ($25/mo) for connection pooler headroom. Resend paid tier (100k emails/mo ≈ $20). Consider Edge Function `supabase.rpc()` instead of in-function joins. |
| 50k+ users | Materialized views for directory browse queries. Dedicated read replica. Redis (Upstash) for rate-limit counters. |

### Scaling priorities

1. **First bottleneck:** Resend free tier (3,000 emails/mo). At ~100 contact sends/day we hit it in a month. Have payment method ready to upgrade.
2. **Second bottleneck:** Supabase free tier database (500MB). Profile rows + skills + contact_requests fit easily in 500MB for ~50k users; storage (avatars) is the real consumer — at 500KB avg avatar × 50k users = 25GB, way over free tier. Monitor storage, plan for Pro.
3. **Third bottleneck:** Next.js cold starts on Vercel hobby. Matters for SEO on `(marketing)` only. Upgrade to Pro if Lighthouse TTFB drops below target.

---

## Risks & Unknowns (Flags for Roadmap)

1. **OAuth redirect URL management across preview deploys** — need to confirm whether Supabase allows wildcard `*.vercel.app` URLs or requires explicit registration. If explicit, preview PRs targeting auth flows will be painful. *Mitigation:* separate dev Supabase project, single preview URL per PR environment, or use magic-link auth (which doesn't care about redirect URL) for previews.

2. **Apple OAuth overhead** — requires a paid Apple Developer account ($99/yr) and private-key rotation. For MVP, consider **shipping with Google + magic-link only** and adding Apple when Capacitor wrap ships (which already requires the Apple Developer account).

3. **Email deliverability** — DMARC can take 24-48h to propagate. Test with `mail-tester.com` pre-launch. Expect first-week bounce rate 2-5% from typo emails.

4. **Abuse — fake profiles** — honor-system Georgia gate is explicitly accepted in PROJECT.md, but if abuse materializes, the `reports` table + admin view need to ship fast. Keep the table scaffolded from day one.

5. **Capacitor + SSR compatibility** — the common guides suggest `output: 'export'`, which removes Server Actions. The "WebView-over-Vercel" approach I recommend is less documented; verify with a spike before committing.

6. **Free-tier limits on Edge Functions** — Supabase free tier allows 500k Edge Function invocations/mo. At 100 contacts/day = 3k/mo, plenty of headroom. Bounce webhooks maybe 200/mo. Fine.

7. **RLS-induced N+1 queries** — `skills_read_visible` policy does a per-row EXISTS check against profiles. At scale this could be slow. *Mitigation:* benchmark early with 1k profiles × 5 skills each; if slow, denormalize `is_visible` onto `skills_offered` via trigger.

---

## Sources

- [Next.js Route Groups — official docs](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) — route group behavior and layout scoping
- [Next.js Project Structure — official docs](https://nextjs.org/docs/app/getting-started/project-structure) — conventions for `app/`, route groups, private folders
- [Supabase — Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` pattern, middleware, `getClaims()` guidance
- [Supabase — Creating a Client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — three client factories
- [Supabase — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — `(select auth.uid())` wrapper pattern, always specify role
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax, role scoping
- [Supabase — User Management](https://supabase.com/docs/guides/auth/managing-user-data) — `handle_new_user` trigger pattern, extend-auth-with-profiles
- [Supabase — Send Emails with Edge Functions + Resend](https://resend.com/docs/send-with-supabase-edge-functions) — canonical Resend-in-Edge-Function example
- [Supabase — Rate Limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting) — sliding window rate limit example
- [Supabase — Performance Advisors: auth_rls_initplan lint](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0003_auth_rls_initplan) — the official lint that catches un-wrapped `auth.uid()`
- [PostgreSQL — Preferred Index Types for Text Search](https://www.postgresql.org/docs/current/textsearch-indexes.html) — GIN index selection for tsvector
- [PostgreSQL — Tables and Indexes for Text Search](https://www.postgresql.org/docs/current/textsearch-tables.html) — generated stored tsvector column pattern
- [Capacitor — Deep Linking with Universal and App Links](https://capacitorjs.com/docs/guides/deep-links) — AASA + assetlinks.json setup
- [Capgo — Universal Links in Next.js with Capacitor](https://capgo.app/blog/integrate-universal-links-capacitor-nextjs/) — Next.js-specific deep link routing notes
- [Next.js + Capacitor 2025 guide (Medium / Arijit Patra)](https://medium.com/@arijitpatra.online/how-to-build-a-cross-platform-app-using-next-js-and-capacitor-in-2025-3bf2ad1368c2) — static-export vs WebView-over-hosted-SSR discussion

---
*Architecture research for: Georgia Barter — community directory*
*Researched: 2026-04-17*
