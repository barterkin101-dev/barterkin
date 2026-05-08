-- Phase 1.5 — Chatbot + Ticketing Integration
-- Depends on: 015_tickets_disputes.sql

-- ============================================================================
-- SECTION 1: chat_sessions
-- ============================================================================
create table public.chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles(id) on delete set null,
  user_email    text,
  status        text not null default 'active' check (status in ('active', 'escalated', 'closed')),
  ticket_id     uuid references public.tickets(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.chat_sessions is
  'Chatbot conversation sessions. Anonymous users can chat; profile_id is set if they log in mid-chat.';

-- ============================================================================
-- SECTION 2: chat_messages
-- ============================================================================
create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.chat_sessions(id) on delete cascade,
  role            text not null check (role in ('user', 'bot', 'admin')),
  content         text not null,
  intent          text, -- 'faq', 'ticket_status', 'escalate', 'greeting', etc.
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

comment on table public.chat_messages is
  'Individual messages within a chat session. role=user|bot|admin.';

-- ============================================================================
-- SECTION 3: RLS
-- ============================================================================
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- chat_sessions policies
create policy "chat_sessions_read_own" on public.chat_sessions for select to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

create policy "chat_sessions_insert_anon" on public.chat_sessions for insert to anon, authenticated
  with check (true);

create policy "chat_sessions_update_own" on public.chat_sessions for update to authenticated
  using (profile_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- chat_messages policies
create policy "chat_messages_read_own" on public.chat_messages for select to authenticated
  using (session_id in (
    select id from public.chat_sessions
    where profile_id in (select id from public.profiles where owner_id = (select auth.uid()))
  ));

create policy "chat_messages_insert_anon" on public.chat_messages for insert to anon, authenticated
  with check (true);

-- ============================================================================
-- SECTION 4: Indexes
-- ============================================================================
create index chat_sessions_profile_idx on public.chat_sessions(profile_id, created_at desc);
create index chat_sessions_ticket_idx on public.chat_sessions(ticket_id);
create index chat_messages_session_idx on public.chat_messages(session_id, created_at desc);

-- ============================================================================
-- SECTION 5: updated_at trigger
-- ============================================================================
create or replace function public.chat_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.chat_sessions_updated_at();
