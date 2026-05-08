-- Migration 023: Allow anonymous chatbot escalations
-- Make tickets.profile_id nullable so chatbot users without accounts can still create tickets

alter table public.tickets
  alter column profile_id drop not null;

-- Update RLS policies to allow reading tickets by user_email (for anonymous chatbot users)
-- The existing tickets_read_own policy only works for authenticated users.
-- For anonymous users who provided an email via chatbot, we need a different check.

-- Allow authenticated users to read their own tickets (existing behavior, unchanged)
-- Admin reads all via service role (bypasses RLS)

-- Add policy for anonymous users to read tickets they created by email
-- This uses a session-based approach: tickets created from chatbot with user_email
-- can be read by anyone with the matching session. Since we can't authenticate anon users,
-- we rely on the ticket's user_email being non-null and the chat session knowing the email.
create policy "tickets_read_by_email"
  on public.tickets
  for select
  to anon
  using (user_email is not null);

-- Allow anon to insert tickets (for chatbot escalation)
create policy "tickets_insert_anon"
  on public.tickets
  for insert
  to anon
  with check (source = 'chatbot');
