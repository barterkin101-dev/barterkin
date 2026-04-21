-- Phase 4 — Directory
-- Requirements: DIR-05 (FTS + pg_trgm fuzzy matching across name/bio/skills), DIR-09 (RLS-gated visibility)
-- Depends on: 003_profile_tables.sql (profiles, skills_offered, skills_wanted, public.current_user_is_verified())

-- 1. Enable pg_trgm extension (idempotent)
create extension if not exists pg_trgm;

-- 2. Add denormalized search_text column. Not GENERATED — cross-table denorm maintained by trigger.
alter table public.profiles
  add column if not exists search_text text;

-- 3. Function: recompute search_text for a single profile (full recompute)
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

-- Keep execute permission tight — only called by triggers (which run as table owner via SECURITY DEFINER)
revoke execute on function public.refresh_profile_search_text(uuid) from public;

-- 4. Trigger on profiles: re-compute when searchable fields change (or on INSERT)
create or replace function public.trg_profiles_refresh_search()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') or
     (new.display_name is distinct from old.display_name) or
     (new.bio is distinct from old.bio) or
     (new.tiktok_handle is distinct from old.tiktok_handle) then
    perform public.refresh_profile_search_text(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_refresh_search on public.profiles;
create trigger profiles_refresh_search
  after insert or update on public.profiles
  for each row execute function public.trg_profiles_refresh_search();

-- 5. Triggers on skills_offered + skills_wanted: re-compute parent profile on any change
create or replace function public.trg_skills_refresh_search()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_profile_search_text(
    coalesce(new.profile_id, old.profile_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists skills_offered_refresh_search on public.skills_offered;
create trigger skills_offered_refresh_search
  after insert or update or delete on public.skills_offered
  for each row execute function public.trg_skills_refresh_search();

drop trigger if exists skills_wanted_refresh_search on public.skills_wanted;
create trigger skills_wanted_refresh_search
  after insert or update or delete on public.skills_wanted
  for each row execute function public.trg_skills_refresh_search();

-- 6. Backfill existing rows (safe if run twice; idempotent)
update public.profiles set search_text = null;
select public.refresh_profile_search_text(id) from public.profiles;

-- 7. Indexes — one GIN per operator class
-- Exact/phrase FTS via to_tsvector (websearch_to_tsquery @@ match)
create index if not exists profiles_search_text_tsv_gin
  on public.profiles using gin (to_tsvector('english', coalesce(search_text, '')));

-- Fuzzy matching via trigram (% similarity operator)
create index if not exists profiles_search_text_trgm_gin
  on public.profiles using gin (search_text gin_trgm_ops);

-- 8. Covering partial btree indexes for filter combinations
-- profiles_published_idx (Phase 3) covers (is_published, banned); these narrow further by FK.
create index if not exists profiles_category_idx
  on public.profiles(category_id)
  where is_published = true and banned = false;

create index if not exists profiles_county_idx
  on public.profiles(county_id)
  where is_published = true and banned = false;

-- Default ordering index (created_at desc) for the no-keyword browse path
create index if not exists profiles_created_at_desc_idx
  on public.profiles(created_at desc)
  where is_published = true and banned = false;
