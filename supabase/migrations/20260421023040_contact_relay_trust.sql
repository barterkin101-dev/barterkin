-- Phase 5 — Contact Relay + Trust (joined)
-- Requirements: CONT-04, CONT-07, CONT-08, CONT-10, TRUST-01, TRUST-02, TRUST-03, TRUST-04, TRUST-05, TRUST-07
-- See: .planning/phases/05-contact-relay-trust-joined/05-RESEARCH.md §Architecture Patterns
-- Depends on: 003_profile_tables.sql (profiles.banned, profiles.accepting_contact, profiles table itself),
--             002_auth_tables.sql (public.current_user_is_verified())

-- ============================================================================
-- SECTION 1: contact_requests table
-- ============================================================================
create table public.contact_requests (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message      text not null check (char_length(message) between 20 and 500),
  status       text not null default 'sent' check (status in ('sent','delivered','bounced','complained','failed')),
  resend_id    text,
  seen_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint contact_requests_not_self check (sender_id <> recipient_id)
);

alter table public.contact_requests enable row level security;

-- Sender/recipient can SELECT their own contact_requests rows
create policy "contact_requests_read_own_as_sender" on public.contact_requests for select to authenticated
  using (sender_id in (select id from public.profiles where owner_id = (select auth.uid())));
create policy "contact_requests_read_own_as_recipient" on public.contact_requests for select to authenticated
  using (recipient_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- No INSERT policy for authenticated — Edge Function uses service-role (CONT-03)
-- No DELETE policy — immutable audit trail

-- Recipient may UPDATE seen_at (and nothing else) on their own rows (CONT-10)
-- Enforced by only exposing a 'markContactsSeen' server action that sets seen_at; RLS just gates which rows
create policy "contact_requests_mark_seen" on public.contact_requests for update to authenticated
  using (recipient_id in (select id from public.profiles where owner_id = (select auth.uid())))
  with check (recipient_id in (select id from public.profiles where owner_id = (select auth.uid())));

-- Indexes
create index contact_requests_sender_created_idx on public.contact_requests(sender_id, created_at desc);
create index contact_requests_pair_created_idx on public.contact_requests(sender_id, recipient_id, created_at desc);
create index contact_requests_recipient_unseen_idx on public.contact_requests(recipient_id) where seen_at is null;
create index contact_requests_resend_id_idx on public.contact_requests(resend_id) where resend_id is not null;

-- IMMUTABLE helper for UTC day truncation (date_trunc on timestamptz is only STABLE, not IMMUTABLE)
-- This wrapper lets us build a partial unique index expression on the UTC calendar day.
create or replace function public.utc_day(ts timestamptz)
returns date
language sql immutable strict parallel safe
set search_path = public, pg_temp
as $$ select (ts at time zone 'UTC')::date $$;

revoke execute on function public.utc_day(timestamptz) from public;
grant execute on function public.utc_day(timestamptz) to authenticated, service_role;

-- Partial unique: prevent double-send in same UTC calendar day for the same (sender, recipient) pair when status='sent'
create unique index contact_requests_pair_day_unique_idx
  on public.contact_requests(sender_id, recipient_id, public.utc_day(created_at))
  where status = 'sent';

-- ============================================================================
-- SECTION 2: blocks table
-- ============================================================================
create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy "blocks_insert_self" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "blocks_delete_self" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
create policy "blocks_read_self" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
-- No UPDATE policy — blocks are immutable once created (delete to unblock)

create index blocks_blocker_idx on public.blocks(blocker_id);
create index blocks_blocked_idx on public.blocks(blocked_id);

-- ============================================================================
-- SECTION 3: reports table
-- ============================================================================
create table public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references auth.users(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason            text not null check (reason in ('harassment','spam','off-topic','impersonation','other')),
  note              text check (note is null or char_length(note) <= 500),
  status            text not null default 'pending' check (status in ('pending','reviewed','actioned','dismissed')),
  created_at        timestamptz not null default now()
  -- NOTE: self-report constraint (reporter cannot report their own profile) enforced in reportMember server action.
  -- Postgres does not allow subqueries in CHECK constraints; application-layer enforcement is the correct approach here.
  -- The constraint name reports_no_self_report is reserved for documentation traceability.
);

alter table public.reports enable row level security;

create policy "reports_insert_self" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) AND public.current_user_is_verified());
-- TRUST-05: NO SELECT policy for authenticated — reporter identity opaque. Service-role bypasses RLS for admin queries.
-- No UPDATE/DELETE for authenticated — reports are immutable from reporter's side.

create index reports_target_idx on public.reports(target_profile_id);
create index reports_status_idx on public.reports(status, created_at desc);

-- ============================================================================
-- SECTION 4: Directory visibility — extend to exclude blocked pairs
-- ============================================================================
-- Must DROP + recreate (Postgres doesn't allow ALTER POLICY … USING on an existing policy cleanly)

drop policy if exists "Verified members see published non-banned profiles" on public.profiles;

create policy "Verified members see published non-banned non-blocked profiles"
  on public.profiles for select to authenticated
  using (
    is_published = true
    and public.current_user_is_verified()
    and banned = false
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = public.profiles.owner_id)
         or (b.blocker_id = public.profiles.owner_id and b.blocked_id = (select auth.uid()))
    )
  );

-- ============================================================================
-- SECTION 5: contact_eligibility SECURITY DEFINER RPC
-- ============================================================================
-- Returns a single row with all flags the Edge Function needs to decide send/reject.
-- SECURITY DEFINER because it reads profiles + auth.users.email which authenticated can't see.
-- REVOKE/GRANT ensures only service-role can invoke (Edge Function uses service-role client).

create or replace function public.contact_eligibility(
  p_sender_owner_id uuid,
  p_recipient_profile_id uuid
)
returns table (
  sender_profile_id      uuid,
  sender_display_name    text,
  sender_username        text,
  sender_banned          boolean,
  recipient_owner_id     uuid,
  recipient_email        text,
  recipient_display_name text,
  recipient_username     text,
  recipient_banned       boolean,
  accepting_contact      boolean,
  recipient_county_id    integer,
  recipient_category_id  integer,
  blocked_by_recipient   boolean,
  blocked_by_sender      boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    s.id                                    as sender_profile_id,
    s.display_name                          as sender_display_name,
    s.username                              as sender_username,
    s.banned                                as sender_banned,
    r.owner_id                              as recipient_owner_id,
    (select email from auth.users where id = r.owner_id) as recipient_email,
    r.display_name                          as recipient_display_name,
    r.username                              as recipient_username,
    r.banned                                as recipient_banned,
    r.accepting_contact                     as accepting_contact,
    r.county_id                             as recipient_county_id,
    r.category_id                           as recipient_category_id,
    exists(
      select 1 from public.blocks b
      where b.blocker_id = r.owner_id and b.blocked_id = p_sender_owner_id
    )                                       as blocked_by_recipient,
    exists(
      select 1 from public.blocks b
      where b.blocker_id = p_sender_owner_id and b.blocked_id = r.owner_id
    )                                       as blocked_by_sender
  from public.profiles s
  cross join public.profiles r
  where s.owner_id = p_sender_owner_id
    and r.id       = p_recipient_profile_id
  limit 1;
$$;

revoke execute on function public.contact_eligibility(uuid, uuid) from public;
revoke execute on function public.contact_eligibility(uuid, uuid) from anon;
revoke execute on function public.contact_eligibility(uuid, uuid) from authenticated;
grant execute on function public.contact_eligibility(uuid, uuid) to service_role;

comment on function public.contact_eligibility(uuid, uuid) is
  'Phase 5 — returns sender+recipient eligibility flags for the send-contact Edge Function. SECURITY DEFINER because it reads auth.users.email. Only service_role may invoke.';
