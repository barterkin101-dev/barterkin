-- Phase 3 — Profile & Georgia Gate
-- Requirements: PROF-01..PROF-14, GEO-01, GEO-02
-- See: .planning/phases/03-profile-georgia-gate/03-RESEARCH.md §Database Schema
-- Depends on: 002_auth_tables.sql (public.current_user_is_verified())
-- Revision iter-1 fix: counties.id IS the FIPS code (no synthetic serial, no separate fips column)

----------------------------------------------------------------------
-- 1. counties (GEO-02, revision iter-1 Blocker 1)
-- counties.id IS the FIPS code. Explicitly assigned — NOT serial.
-- This keeps a single integer space across client JSON (fips) → DB PK → profile FK.
-- See RESEARCH §Pitfall 8 for the failure mode this prevents.
----------------------------------------------------------------------
create table public.counties (
  id    int  primary key,   -- FIPS code, e.g. 13001 Appling, 13321 Worth
  name  text not null
);
alter table public.counties enable row level security;

create policy "Counties readable by authenticated"
  on public.counties for select to authenticated using (true);

-- Seed: 159 Georgia counties from lib/data/georgia-counties.json (via scripts/seed-georgia-counties.mjs)
-- INSERT supplies id explicitly so counties.id = FIPS
INSERT INTO public.counties (id, name) VALUES
  (13001, 'Appling County'),
  (13003, 'Atkinson County'),
  (13005, 'Bacon County'),
  (13007, 'Baker County'),
  (13009, 'Baldwin County'),
  (13011, 'Banks County'),
  (13013, 'Barrow County'),
  (13015, 'Bartow County'),
  (13017, 'Ben Hill County'),
  (13019, 'Berrien County'),
  (13021, 'Bibb County'),
  (13023, 'Bleckley County'),
  (13025, 'Brantley County'),
  (13027, 'Brooks County'),
  (13029, 'Bryan County'),
  (13031, 'Bulloch County'),
  (13033, 'Burke County'),
  (13035, 'Butts County'),
  (13037, 'Calhoun County'),
  (13039, 'Camden County'),
  (13043, 'Candler County'),
  (13045, 'Carroll County'),
  (13047, 'Catoosa County'),
  (13049, 'Charlton County'),
  (13051, 'Chatham County'),
  (13053, 'Chattahoochee County'),
  (13055, 'Chattooga County'),
  (13057, 'Cherokee County'),
  (13059, 'Clarke County'),
  (13061, 'Clay County'),
  (13063, 'Clayton County'),
  (13065, 'Clinch County'),
  (13067, 'Cobb County'),
  (13069, 'Coffee County'),
  (13071, 'Colquitt County'),
  (13073, 'Columbia County'),
  (13075, 'Cook County'),
  (13077, 'Coweta County'),
  (13079, 'Crawford County'),
  (13081, 'Crisp County'),
  (13083, 'Dade County'),
  (13085, 'Dawson County'),
  (13087, 'Decatur County'),
  (13089, 'DeKalb County'),
  (13091, 'Dodge County'),
  (13093, 'Dooly County'),
  (13095, 'Dougherty County'),
  (13097, 'Douglas County'),
  (13099, 'Early County'),
  (13101, 'Echols County'),
  (13103, 'Effingham County'),
  (13105, 'Elbert County'),
  (13107, 'Emanuel County'),
  (13109, 'Evans County'),
  (13111, 'Fannin County'),
  (13113, 'Fayette County'),
  (13115, 'Floyd County'),
  (13117, 'Forsyth County'),
  (13119, 'Franklin County'),
  (13121, 'Fulton County'),
  (13123, 'Gilmer County'),
  (13125, 'Glascock County'),
  (13127, 'Glynn County'),
  (13129, 'Gordon County'),
  (13131, 'Grady County'),
  (13133, 'Greene County'),
  (13135, 'Gwinnett County'),
  (13137, 'Habersham County'),
  (13139, 'Hall County'),
  (13141, 'Hancock County'),
  (13143, 'Haralson County'),
  (13145, 'Harris County'),
  (13147, 'Hart County'),
  (13149, 'Heard County'),
  (13151, 'Henry County'),
  (13153, 'Houston County'),
  (13155, 'Irwin County'),
  (13157, 'Jackson County'),
  (13159, 'Jasper County'),
  (13161, 'Jeff Davis County'),
  (13163, 'Jefferson County'),
  (13165, 'Jenkins County'),
  (13167, 'Johnson County'),
  (13169, 'Jones County'),
  (13171, 'Lamar County'),
  (13173, 'Lanier County'),
  (13175, 'Laurens County'),
  (13177, 'Lee County'),
  (13179, 'Liberty County'),
  (13181, 'Lincoln County'),
  (13183, 'Long County'),
  (13185, 'Lowndes County'),
  (13187, 'Lumpkin County'),
  (13189, 'McDuffie County'),
  (13191, 'McIntosh County'),
  (13193, 'Macon County'),
  (13195, 'Madison County'),
  (13197, 'Marion County'),
  (13199, 'Meriwether County'),
  (13201, 'Miller County'),
  (13205, 'Mitchell County'),
  (13207, 'Monroe County'),
  (13209, 'Montgomery County'),
  (13211, 'Morgan County'),
  (13213, 'Murray County'),
  (13215, 'Muscogee County'),
  (13217, 'Newton County'),
  (13219, 'Oconee County'),
  (13221, 'Oglethorpe County'),
  (13223, 'Paulding County'),
  (13225, 'Peach County'),
  (13227, 'Pickens County'),
  (13229, 'Pierce County'),
  (13231, 'Pike County'),
  (13233, 'Polk County'),
  (13235, 'Pulaski County'),
  (13237, 'Putnam County'),
  (13239, 'Quitman County'),
  (13241, 'Rabun County'),
  (13243, 'Randolph County'),
  (13245, 'Richmond County'),
  (13247, 'Rockdale County'),
  (13249, 'Schley County'),
  (13251, 'Screven County'),
  (13253, 'Seminole County'),
  (13255, 'Spalding County'),
  (13257, 'Stephens County'),
  (13259, 'Stewart County'),
  (13261, 'Sumter County'),
  (13263, 'Talbot County'),
  (13265, 'Taliaferro County'),
  (13267, 'Tattnall County'),
  (13269, 'Taylor County'),
  (13271, 'Telfair County'),
  (13273, 'Terrell County'),
  (13275, 'Thomas County'),
  (13277, 'Tift County'),
  (13279, 'Toombs County'),
  (13281, 'Towns County'),
  (13283, 'Treutlen County'),
  (13285, 'Troup County'),
  (13287, 'Turner County'),
  (13289, 'Twiggs County'),
  (13291, 'Union County'),
  (13293, 'Upson County'),
  (13295, 'Walker County'),
  (13297, 'Walton County'),
  (13299, 'Ware County'),
  (13301, 'Warren County'),
  (13303, 'Washington County'),
  (13305, 'Wayne County'),
  (13307, 'Webster County'),
  (13309, 'Wheeler County'),
  (13311, 'White County'),
  (13313, 'Whitfield County'),
  (13315, 'Wilcox County'),
  (13317, 'Wilkes County'),
  (13319, 'Wilkinson County'),
  (13321, 'Worth County')
ON CONFLICT (id) DO NOTHING;

----------------------------------------------------------------------
-- 2. categories (PROF-06) — ref table, ids 1..10 fixed to match lib/data/categories.ts
----------------------------------------------------------------------
create table public.categories (
  id    serial primary key,
  name  text unique not null,
  slug  text unique not null
);
alter table public.categories enable row level security;

create policy "Categories readable by authenticated"
  on public.categories for select to authenticated using (true);

-- Seed: must match lib/data/categories.ts id ordering 1..10 (UI-SPEC-locked order)
INSERT INTO public.categories (id, name, slug) VALUES
  (1,  'Home & Garden',       'home-garden'),
  (2,  'Food & Kitchen',      'food-kitchen'),
  (3,  'Arts & Crafts',       'arts-crafts'),
  (4,  'Music & Performance', 'music-performance'),
  (5,  'Tech & Digital',      'tech-digital'),
  (6,  'Wellness & Bodywork', 'wellness-bodywork'),
  (7,  'Teaching & Tutoring', 'teaching-tutoring'),
  (8,  'Trades & Repair',     'trades-repair'),
  (9,  'Outdoors & Animals',  'outdoors-animals'),
  (10, 'Community & Events',  'community-events')
ON CONFLICT (id) DO NOTHING;

-- Keep serial sequence aligned so future INSERTs don't collide with fixed ids 1..10
SELECT setval(pg_get_serial_sequence('public.categories', 'id'), 10, true);

----------------------------------------------------------------------
-- 3. profiles (PROF-01..PROF-14, GEO-01)
----------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references auth.users(id) on delete cascade,
  username          text unique,                                                                      -- D-07 slug; locked once set (application layer enforces)
  display_name      text check (display_name is null or char_length(display_name) between 1 and 60), -- PROF-01
  bio               text check (bio is null or char_length(bio) <= 500),                             -- PROF-01
  avatar_url        text,                                                                             -- PROF-02; stored as full public URL
  county_id         int references public.counties(id),                                              -- PROF-05, GEO-01; FK carries FIPS values since counties.id = FIPS
  category_id       int references public.categories(id),                                            -- PROF-06
  availability      text check (availability is null or char_length(availability) <= 200),           -- PROF-07
  accepting_contact boolean not null default true,                                                   -- PROF-08
  tiktok_handle     text check (tiktok_handle is null or tiktok_handle ~ '^@[a-zA-Z0-9_.]{1,24}$'), -- PROF-09
  is_published      boolean not null default false,                                                  -- PROF-10, PROF-12
  banned            boolean not null default false,                                                  -- PROF-13, TRUST-03 forward-compat
  founding_member   boolean not null default false,                                                  -- SEED-04 forward-compat
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Phase 4 FTS prep (DIR-05)
  search_vector     tsvector generated always as (
    to_tsvector('english',
      coalesce(display_name, '') || ' ' ||
      coalesce(bio, '') || ' ' ||
      coalesce(tiktok_handle, '')
    )
  ) stored,
  -- Defense-in-depth: published profile must have display_name and username set
  constraint profiles_publish_requires_identity check (is_published = false OR (display_name is not null AND username is not null))
);
alter table public.profiles enable row level security;

-- updated_at trigger (PROF-11)
create or replace function public.set_updated_at()
  returns trigger language plpgsql
  security definer set search_path = public, pg_temp
  as $$ begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index profiles_search_vector_gin on public.profiles using gin(search_vector);
create index profiles_username_idx on public.profiles(username) where username is not null;
create index profiles_published_idx on public.profiles(is_published, banned) where is_published = true and banned = false;

----------------------------------------------------------------------
-- 4. skills_offered + skills_wanted (PROF-03, PROF-04)
----------------------------------------------------------------------
create table public.skills_offered (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  skill_text  text not null check (char_length(skill_text) between 1 and 60),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.skills_offered enable row level security;
create index skills_offered_profile_idx on public.skills_offered(profile_id);

create table public.skills_wanted (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  skill_text  text not null check (char_length(skill_text) between 1 and 60),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.skills_wanted enable row level security;
create index skills_wanted_profile_idx on public.skills_wanted(profile_id);

----------------------------------------------------------------------
-- 5. profiles RLS (PROF-10, PROF-12, PROF-13, PROF-14, GEO-01)
----------------------------------------------------------------------

-- SELECT: owner always sees own; others see only published + viewer-verified + not banned
create policy "Owners see own profile"
  on public.profiles for select to authenticated
  using (owner_id = auth.uid());

create policy "Verified members see published non-banned profiles"
  on public.profiles for select to authenticated
  using (is_published = true AND public.current_user_is_verified() AND banned = false);

-- INSERT: email-verified users only; owner_id MUST equal auth.uid()
create policy "Verified users create own profile"
  on public.profiles for insert to authenticated
  with check (owner_id = auth.uid() AND public.current_user_is_verified());

-- UPDATE: owner only; publishing requires completeness (PROF-12 + GEO-01)
-- A user may UNPUBLISH freely (is_published = false always passes). Cannot set banned.
create policy "Owners update own profile, publish only when complete"
  on public.profiles for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    AND banned = false    -- owners cannot self-ban or unban (admin uses service-role)
    AND (
      is_published = false
      OR (
        display_name is not null
        AND county_id is not null
        AND category_id is not null
        AND avatar_url is not null
        AND exists (select 1 from public.skills_offered so where so.profile_id = public.profiles.id limit 1)
      )
    )
  );

----------------------------------------------------------------------
-- 6. skills RLS — cascades visibility through profile (RESEARCH Pitfall 1)
----------------------------------------------------------------------

-- SELECT: mirror profile visibility
create policy "Skills offered visible where profile is visible"
  on public.skills_offered for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = skills_offered.profile_id
        and (p.owner_id = auth.uid() OR (p.is_published = true AND public.current_user_is_verified() AND p.banned = false))
    )
  );

create policy "Skills wanted visible where profile is visible"
  on public.skills_wanted for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = skills_wanted.profile_id
        and (p.owner_id = auth.uid() OR (p.is_published = true AND public.current_user_is_verified() AND p.banned = false))
    )
  );

-- INSERT / UPDATE / DELETE: owner only
create policy "Owners write own skills_offered"
  on public.skills_offered for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()));

create policy "Owners update own skills_offered"
  on public.skills_offered for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()));

create policy "Owners delete own skills_offered"
  on public.skills_offered for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()));

create policy "Owners write own skills_wanted"
  on public.skills_wanted for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()));

create policy "Owners update own skills_wanted"
  on public.skills_wanted for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()));

create policy "Owners delete own skills_wanted"
  on public.skills_wanted for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id AND p.owner_id = auth.uid()));
