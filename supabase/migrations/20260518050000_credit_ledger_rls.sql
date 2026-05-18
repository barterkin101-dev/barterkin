-- Enable RLS on credit_ledger and referrals tables.
-- These tables were created without RLS in 20260513010000_referral_credits.sql.
-- This migration closes the gap so members can only read their own rows.
--
-- IMPORTANT: credit_ledger.profile_id and referrals.inviter_id reference
-- profiles.id (a generated UUID), NOT auth.uid() (the Supabase auth user ID).
-- The RLS policies must map auth.uid() -> profiles.id via owner_id.

-- ============================================================================
-- credit_ledger
-- ============================================================================
alter table public.credit_ledger enable row level security;

create policy "Members read own credit ledger"
  on public.credit_ledger
  for select
  to authenticated
  using (profile_id = (select id from public.profiles where owner_id = auth.uid()));

-- Service role can manage all rows (for admin ops, edge functions)
create policy "Service role manages credit ledger"
  on public.credit_ledger
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================================
-- referrals
-- ============================================================================
alter table public.referrals enable row level security;

create policy "Members read own referrals"
  on public.referrals
  for select
  to authenticated
  using (inviter_id = (select id from public.profiles where owner_id = auth.uid()));

-- Service role can manage all rows
create policy "Service role manages referrals"
  on public.referrals
  for all
  to service_role
  using (true)
  with check (true);
