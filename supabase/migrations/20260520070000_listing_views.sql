-- Recently viewed listings
-- Tracks which listings each member has viewed for the "Recently Viewed" dashboard card.
-- Pruned to 20 most recent views per member via trigger.

create table if not exists public.listing_views (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  unique (profile_id, listing_id)
);

comment on table public.listing_views is 'Tracks listing views per member for the Recently Viewed dashboard feature.';

-- Index for fast recent-view lookups per member
create index if not exists idx_listing_views_profile_viewed_at
  on public.listing_views(profile_id, viewed_at desc);

-- Index for pruning old views
create index if not exists idx_listing_views_profile_id
  on public.listing_views(profile_id);

-- RLS: members can only read their own views
alter table public.listing_views enable row level security;

create policy "Members read own listing views"
  on public.listing_views
  for select
  to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

create policy "Members insert own listing views"
  on public.listing_views
  for insert
  to authenticated
  with check (profile_id = (select id from public.profiles where owner_id = auth.uid()));

create policy "Members delete own listing views"
  on public.listing_views
  for delete
  to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

-- Service role can manage all rows (for admin ops, edge functions)
create policy "Service role manages listing views"
  on public.listing_views
  for all
  to service_role
  using (true)
  with check (true);

-- Trigger: after insert, keep only the 20 most recent views per member
-- Uses a deferred-safe pattern: delete excess rows for the same profile_id

create or replace function public.prune_listing_views()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from public.listing_views
  where id in (
    select id from public.listing_views
    where profile_id = new.profile_id
    order by viewed_at desc
    offset 20
  );
  return new;
end;
$$;

create trigger trg_prune_listing_views
  after insert on public.listing_views
  for each row
  execute function public.prune_listing_views();
