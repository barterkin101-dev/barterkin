-- Phase 5 (fix H-02) — Narrow contact_requests UPDATE to seen_at only
-- Problem: the contact_requests_mark_seen UPDATE RLS policy gates *which rows* a recipient
--          can update but not *which columns* — a user can UPDATE any column via direct API.
-- Fix: revoke direct UPDATE from authenticated; expose a narrow SECURITY DEFINER function
--      that only sets seen_at, and grant execute only to authenticated.

-- Drop the overly-broad UPDATE policy
drop policy if exists "contact_requests_mark_seen" on public.contact_requests;

-- Revoke direct UPDATE privilege from the authenticated role
revoke update on public.contact_requests from authenticated;

-- Narrow SECURITY DEFINER function: only sets seen_at on the caller's received rows
create or replace function public.mark_contacts_seen(p_recipient_profile_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.contact_requests
     set seen_at = now()
   where recipient_id = p_recipient_profile_id
     and seen_at is null;
$$;

-- Restrict execute: authenticated callers only (not public/anon)
revoke execute on function public.mark_contacts_seen(uuid) from public;
revoke execute on function public.mark_contacts_seen(uuid) from anon;
grant execute on function public.mark_contacts_seen(uuid) to authenticated;

comment on function public.mark_contacts_seen(uuid) is
  'Phase 5 (fix H-02) — sets seen_at = now() on all unseen contact_requests where recipient_id matches the supplied profile id. SECURITY DEFINER so only seen_at is ever mutated; direct UPDATE on contact_requests has been revoked from authenticated.';
