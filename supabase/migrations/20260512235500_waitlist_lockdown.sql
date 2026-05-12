-- Lock down direct client writes to the waitlist table.
-- Waitlist inserts must go through the server action, which uses service_role.

DROP POLICY IF EXISTS "waitlist_insert_anon" ON public.waitlist;

REVOKE INSERT ON public.waitlist FROM anon, authenticated;
