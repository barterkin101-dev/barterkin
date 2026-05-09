-- Phase 4 — Support Tickets + Mediation
-- Depends on: 003_profile_tables.sql, 014_conversations.sql

-- ============================================================================
-- SECTION 1: tickets table
-- ============================================================================
create table public.tickets (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  subject     text not null check (char_length(subject) between 5 and 120),
  description text not null check (char_length(description) between 20 and 2000),
  status      text not null default 'open' check (status in ('open','in_progress','waiting','resolved','closed')),
  priority    text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  category    text not null check (category in ('bug','feature','account','billing','other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tickets enable row level security;

-- SELECT: owner sees own; admin sees all (admin uses service-role)
create policy "tickets_read_own" on public.tickets for select to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- INSERT: owner only
create policy "tickets_insert_own" on public.tickets for insert to authenticated
  with check (
    profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and public.current_user_is_verified()
  );

-- UPDATE: owner can update their own tickets (limited fields in practice)
create policy "tickets_update_own" on public.tickets for update to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())))
  with check (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- Indexes
create index tickets_profile_idx on public.tickets(profile_id, created_at desc);
create index tickets_status_idx on public.tickets(status, created_at desc);

-- updated_at trigger
create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SECTION 2: ticket_messages table
-- ============================================================================
create table public.ticket_messages (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid not null references public.tickets(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,  -- null = admin/system
  content           text not null check (char_length(content) between 1 and 2000),
  is_internal       boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.ticket_messages enable row level security;

-- SELECT: ticket owner or admin (admin uses service-role)
create policy "ticket_messages_read_own" on public.ticket_messages for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and t.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

-- INSERT: ticket owner
create policy "ticket_messages_insert_own" on public.ticket_messages for insert to authenticated
  with check (
    sender_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and t.profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    )
  );

-- Indexes
create index ticket_messages_ticket_idx on public.ticket_messages(ticket_id, created_at desc);

-- ============================================================================
-- SECTION 3: disputes table
-- ============================================================================
create table public.disputes (
  id                    uuid primary key default gen_random_uuid(),
  initiator_profile_id  uuid not null references public.profiles(id) on delete cascade,
  responder_profile_id  uuid not null references public.profiles(id) on delete cascade,
  listing_id            uuid references public.listings(id) on delete set null,
  conversation_id       uuid references public.conversations(id) on delete set null,
  reason                text not null check (char_length(reason) between 10 and 500),
  status                text not null default 'open' check (status in ('open','under_review','mediating','resolved','dismissed')),
  resolution            text check (resolution is null or char_length(resolution) <= 1000),
  resolution_outcome    text check (resolution_outcome in ('refund_agreed','no_action','warning_issued','ban_recommended')),
  mediator_profile_id   uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  resolved_at           timestamptz
);

alter table public.disputes enable row level security;

-- SELECT: initiator or responder sees own; admin sees all (service-role)
create policy "disputes_read_participant" on public.disputes for select to authenticated
  using (
    initiator_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    or responder_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
  );

-- INSERT: initiator only
create policy "disputes_insert_initiator" on public.disputes for insert to authenticated
  with check (
    initiator_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and public.current_user_is_verified()
  );

-- UPDATE: neither party can update (mediator/admin uses service-role)

-- Indexes
create index disputes_initiator_idx on public.disputes(initiator_profile_id, created_at desc);
create index disputes_responder_idx on public.disputes(responder_profile_id, created_at desc);
create index disputes_status_idx on public.disputes(status, created_at desc);

-- updated_at trigger
create trigger disputes_updated_at
  before update on public.disputes
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SECTION 4: dispute_messages table
-- ============================================================================
create table public.dispute_messages (
  id                uuid primary key default gen_random_uuid(),
  dispute_id        uuid not null references public.disputes(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  content           text not null check (char_length(content) between 1 and 2000),
  created_at        timestamptz not null default now()
);

alter table public.dispute_messages enable row level security;

-- SELECT: dispute participants
create policy "dispute_messages_read_participant" on public.dispute_messages for select to authenticated
  using (
    exists (
      select 1 from public.disputes d
      where d.id = dispute_messages.dispute_id
        and (
          d.initiator_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
          or d.responder_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
        )
    )
  );

-- INSERT: dispute participants only
create policy "dispute_messages_insert_participant" on public.dispute_messages for insert to authenticated
  with check (
    sender_profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
    and exists (
      select 1 from public.disputes d
      where d.id = dispute_messages.dispute_id
        and (
          d.initiator_profile_id = sender_profile_id
          or d.responder_profile_id = sender_profile_id
        )
    )
  );

-- Indexes
create index dispute_messages_dispute_idx on public.dispute_messages(dispute_id, created_at desc);

-- ============================================================================
-- SECTION 5: Performance indexes for dashboard queries
-- ============================================================================
create index listings_profile_status_idx on public.listings(profile_id, status, created_at desc);
