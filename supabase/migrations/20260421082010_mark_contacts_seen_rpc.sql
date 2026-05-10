-- Phase 5 (fix H-02) — RETIRED
-- The email-based contact relay and contact_requests table have been replaced by
-- in-app messaging (conversations + messages). This migration is preserved as a
-- tombstone to document the retirement. The function and table references below
-- are no-op safe (IF EXISTS / OR REPLACE) and will not affect the current schema.

-- Legacy: drop the overly-broad UPDATE policy (table no longer exists)
drop policy if exists "contact_requests_mark_seen" on public.contact_requests;

-- Legacy: revoke direct UPDATE (table no longer exists)
revoke update on public.contact_requests from authenticated;

-- Legacy: mark_contacts_seen function — kept for backward compatibility with
-- any external callers. It is now a no-op since contact_requests is retired.
create or replace function public.mark_contacts_seen(p_recipient_profile_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  -- No-op: contact_requests table retired. Use mark_conversation_read instead.
  select 1 where false;
$$;

-- Restrict execute: authenticated callers only (not public/anon)
revoke execute on function public.mark_contacts_seen(uuid) from public;
revoke execute on function public.mark_contacts_seen(uuid) from anon;
grant execute on function public.mark_contacts_seen(uuid) to authenticated;

comment on function public.mark_contacts_seen(uuid) is
  'RETIRED — Phase 5 (fix H-02). The contact_requests table has been replaced by in-app messaging. This function is now a no-op. Use mark_conversation_read for the messaging system.';
