create table public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_profile_id uuid not null references public.profiles(id) on delete cascade,
  viewed_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_views_not_self check (viewer_profile_id <> viewed_profile_id)
);

alter table public.profile_views enable row level security;

create index profile_views_viewed_profile_created_idx
  on public.profile_views(viewed_profile_id, created_at desc);

create policy "Owners see views on own profile"
  on public.profile_views for select to authenticated
  using (
    exists (
      select 1
      from public.profiles viewed
      where viewed.id = profile_views.viewed_profile_id
        and viewed.owner_id = auth.uid()
    )
  );

create policy "Verified members log profile views"
  on public.profile_views for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles viewer
      where viewer.id = profile_views.viewer_profile_id
        and viewer.owner_id = auth.uid()
    )
    and exists (
      select 1
      from public.profiles viewed
      where viewed.id = profile_views.viewed_profile_id
        and viewed.is_published = true
        and viewed.banned = false
    )
    and viewer_profile_id <> viewed_profile_id
  );
