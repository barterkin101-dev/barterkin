-- Enable RLS on credit_ledger and referrals tables.
-- These tables were created without RLS in 20260513010000_referral_credits.sql.
-- This migration closes the gap so members can only read their own rows.

-- ============================================================================
-- credit_ledger
-- ============================================================================
alter table public.credit_ledger enable row level security;

create policy "Members read own credit ledger"
  on public.credit_ledger
  for select
  to authenticated
  using (profile_id = auth.uid());

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
  using (inviter_id = auth.uid());

-- Service role can manage all rows
create policy "Service role manages referrals"
  on public.referrals
  for all
  to service_role
  using (true)
  with check (true);
