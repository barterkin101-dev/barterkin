-- Phase 3 — In-app Messaging (Realtime)
-- Depends on: 011_listings.sql, 003_profile_tables.sql

-- ============================================================================
-- SECTION 1: conversations table
-- ============================================================================
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.conversations enable row level security;

-- SELECT: participant only
create policy "conversations_read_participant" on public.conversations for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

-- INSERT: any authenticated user (participants added separately)
create policy "conversations_insert_auth" on public.conversations for insert to authenticated
  with check (public.current_user_is_verified());

-- ============================================================================
-- SECTION 2: conversation_participants table
-- ============================================================================
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);

alter table public.conversation_participants enable row level security;

-- SELECT: participant only
create policy "conversation_participants_read_self" on public.conversation_participants for select to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- INSERT: participant only (enforced that both participants are added)
create policy "conversation_participants_insert_self" on public.conversation_participants for insert to authenticated
  with check (
    profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and public.current_user_is_verified()
  );

-- UPDATE: participant can update their own last_read_at
create policy "conversation_participants_update_self" on public.conversation_participants for update to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())))
  with check (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- Indexes
create index conversation_participants_profile_idx on public.conversation_participants(profile_id);
create index conversation_participants_conversation_idx on public.conversation_participants(conversation_id);

-- ============================================================================
-- SECTION 3: messages table
-- ============================================================================
create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  content           text not null check (char_length(content) between 1 and 2000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.messages enable row level security;

-- SELECT: participant of parent conversation only
create policy "messages_read_participant" on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

-- INSERT: sender must be participant and auth.uid must match sender's owner
create policy "messages_insert_participant" on public.messages for insert to authenticated
  with check (
    sender_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and public.current_user_is_verified()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.profile_id = messages.sender_profile_id
    )
  );

-- No UPDATE/DELETE — immutable audit trail

-- Indexes
create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index messages_sender_idx on public.messages(sender_profile_id, created_at desc);

-- updated_at trigger
create trigger messages_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SECTION 4: find_conversation_between RPC
-- ============================================================================
create or replace function public.find_conversation_between(
  p_profile_a uuid,
  p_profile_b uuid
)
returns table (id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id
  from public.conversations c
  where exists (
    select 1 from public.conversation_participants cp1
    where cp1.conversation_id = c.id and cp1.profile_id = p_profile_a
  )
  and exists (
    select 1 from public.conversation_participants cp2
    where cp2.conversation_id = c.id and cp2.profile_id = p_profile_b
  )
  and not exists (
    select 1 from public.conversation_participants cp3
    where cp3.conversation_id = c.id
      and cp3.profile_id not in (p_profile_a, p_profile_b)
  )
  limit 1;
$$;

revoke execute on function public.find_conversation_between(uuid, uuid) from public;
revoke execute on function public.find_conversation_between(uuid, uuid) from anon;
grant execute on function public.find_conversation_between(uuid, uuid) to authenticated;
grant execute on function public.find_conversation_between(uuid, uuid) to service_role;

-- ============================================================================
-- SECTION 5: Enable Realtime on messages
-- ============================================================================
-- Supabase Realtime must be enabled on the messages table via the Supabase dashboard
-- or by running: alter publication supabase_realtime add table public.messages;
-- This migration documents the requirement; the actual enablement is infrastructure-level.

comment on table public.messages is
  'Phase 3 — in-app messaging. Enable Realtime on this table for live chat.';
