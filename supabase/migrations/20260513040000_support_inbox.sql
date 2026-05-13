-- Support Inbox — inbound email handling via Resend webhook
-- Creates tables for receiving customer support emails and managing replies.

-- ============================================================================
-- SECTION 1: support_tickets table
-- ============================================================================
create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  from_email  text not null,
  from_name   text,
  subject     text not null,
  body_text   text not null,
  body_html   text,
  status      text not null default 'open' check (status in ('open','in_progress','waiting','resolved','closed')),
  priority    text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  source      text not null default 'email' check (source in ('email','chatbot','manual')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.support_tickets is 'Inbound support requests from email, chatbot, or manual entry';

alter table public.support_tickets enable row level security;

-- Only service_role (admin server actions) can read/write
-- No authenticated user policies — this is admin-only data
create policy "support_tickets_admin_only" on public.support_tickets
  for all to authenticated using (false) with check (false);

-- Indexes
create index support_tickets_status_idx on public.support_tickets(status, created_at desc);
create index support_tickets_email_idx on public.support_tickets(from_email, created_at desc);

-- updated_at trigger
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- SECTION 2: support_replies table
-- ============================================================================
create table public.support_replies (
  id                uuid primary key default gen_random_uuid(),
  support_ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  body              text not null check (char_length(body) between 1 and 5000),
  sent_to           text not null,
  sent_via          text not null default 'resend' check (sent_via in ('resend','manual')),
  sent_at           timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

comment on table public.support_replies is 'Replies sent to customers from the support inbox';

alter table public.support_replies enable row level security;

create policy "support_replies_admin_only" on public.support_replies
  for all to authenticated using (false) with check (false);

-- Indexes
create index support_replies_ticket_idx on public.support_replies(support_ticket_id, created_at desc);

-- ============================================================================
-- SECTION 3: Grant service_role full access
-- ============================================================================
grant all on public.support_tickets to service_role;
grant all on public.support_replies to service_role;
grant usage, select on sequence public.support_tickets_id_seq to service_role;
grant usage, select on sequence public.support_replies_id_seq to service_role;
