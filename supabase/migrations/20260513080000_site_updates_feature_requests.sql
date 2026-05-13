-- Site updates (changelog) table for the notification dropdown
-- Admin posts updates; members see unread ones in a bell dropdown.

create table if not exists public.site_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'feature' check (category in ('feature','fix','announcement')),
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  is_published boolean not null default true
);

-- Index for fast "recent updates" lookups
create index if not exists idx_site_updates_published_at
  on public.site_updates(published_at desc)
  where is_published = true;

-- RLS: anyone can read published updates; only admins can insert/update/delete
alter table public.site_updates enable row level security;

create policy "Anyone can read published site updates"
  on public.site_updates for select
  using (is_published = true);

create policy "Admins can manage site updates"
  on public.site_updates for all to authenticated
  using (exists (
    select 1 from public.profiles
    where owner_id = auth.uid() and is_admin = true
  ));

-- Member read tracking for site updates (which updates each member has seen)
create table if not exists public.site_update_reads (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  update_id uuid not null references public.site_updates(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (profile_id, update_id)
);

-- Index for fast "unread count for member" lookups
create index if not exists idx_site_update_reads_profile
  on public.site_update_reads(profile_id);

-- RLS: members can only read/write their own read tracking
alter table public.site_update_reads enable row level security;

create policy "Members can manage own update reads"
  on public.site_update_reads for all to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

-- ============================================================================
-- Feature requests table — members submit ideas, admins review
-- ============================================================================

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 20 and 2000),
  category text not null default 'general' check (category in ('general','ui','billing','messaging','listings','search','other')),
  status text not null default 'pending' check (status in ('pending','under_review','planned','declined','shipped')),
  votes integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookups
create index if not exists idx_feature_requests_status on public.feature_requests(status);
create index if not exists idx_feature_requests_created_at on public.feature_requests(created_at desc);

-- RLS: anyone can read all feature requests; owners can update/delete their own; admins can manage all
alter table public.feature_requests enable row level security;

create policy "Anyone can read feature requests"
  on public.feature_requests for select
  using (true);

create policy "Authenticated members can create feature requests"
  on public.feature_requests for insert to authenticated
  with check (profile_id = (select id from public.profiles where owner_id = auth.uid()));

create policy "Owners can update own feature requests"
  on public.feature_requests for update to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

create policy "Admins can manage all feature requests"
  on public.feature_requests for all to authenticated
  using (exists (
    select 1 from public.profiles
    where owner_id = auth.uid() and is_admin = true
  ));

-- Vote tracking (one vote per member per request)
create table if not exists public.feature_request_votes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  feature_request_id uuid not null references public.feature_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, feature_request_id)
);

alter table public.feature_request_votes enable row level security;

create policy "Anyone can read votes"
  on public.feature_request_votes for select
  using (true);

create policy "Members can vote once"
  on public.feature_request_votes for insert to authenticated
  with check (profile_id = (select id from public.profiles where owner_id = auth.uid()));

create policy "Members can remove own vote"
  on public.feature_request_votes for delete to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

-- Updated-at trigger
comment on table public.site_updates is
  'Changelog / site updates shown in the notification dropdown. Admin-managed.';
comment on table public.feature_requests is
  'Member-submitted feature requests. Admins review and update status.';
