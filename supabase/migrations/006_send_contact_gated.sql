-- Phase 5 (fix) — Atomic rate-limit + insert for send-contact Edge Function
-- Addresses: H-01 race condition — concurrent requests can bypass daily/weekly cap checks
-- Strategy: pg_advisory_xact_lock on sender serializes concurrent requests from the same sender
-- The lock is released automatically at transaction end (xact-scoped advisory lock).

create or replace function public.send_contact_gated(
  p_sender_profile_id uuid,
  p_recipient_profile_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_daily  int;
  v_weekly int;
  v_pair   int;
  v_id     uuid;
begin
  -- Serialize concurrent requests from the same sender.
  -- hashtext() maps the UUID text to a bigint for the advisory lock namespace.
  perform pg_advisory_xact_lock(hashtext(p_sender_profile_id::text));

  -- Daily cap: count ALL attempts (any status) in the last 24 hours
  select count(*) into v_daily
    from public.contact_requests
   where sender_id  = p_sender_profile_id
     and created_at >= now() - interval '24 hours';
  if v_daily >= 5 then raise exception 'daily_cap'; end if;

  -- Weekly cap: count ALL attempts in the last 7 days
  select count(*) into v_weekly
    from public.contact_requests
   where sender_id  = p_sender_profile_id
     and created_at >= now() - interval '7 days';
  if v_weekly >= 20 then raise exception 'weekly_cap'; end if;

  -- Per-pair weekly cap: count ALL attempts to same recipient in last 7 days
  select count(*) into v_pair
    from public.contact_requests
   where sender_id    = p_sender_profile_id
     and recipient_id = p_recipient_profile_id
     and created_at  >= now() - interval '7 days';
  if v_pair >= 2 then raise exception 'pair_cap'; end if;

  -- Insert (inside the advisory lock — atomically enforces the caps checked above)
  insert into public.contact_requests(sender_id, recipient_id, message, status)
  values (p_sender_profile_id, p_recipient_profile_id, p_message, 'sent')
  returning id into v_id;

  return v_id;
end;
$$;

-- Only service_role (Edge Function) may call this function
revoke execute on function public.send_contact_gated(uuid, uuid, text) from public;
revoke execute on function public.send_contact_gated(uuid, uuid, text) from anon;
revoke execute on function public.send_contact_gated(uuid, uuid, text) from authenticated;
grant execute on function public.send_contact_gated(uuid, uuid, text) to service_role;

comment on function public.send_contact_gated(uuid, uuid, text) is
  'Phase 5 (fix H-01) — atomically checks daily/weekly/pair caps then inserts a contact_request row. Uses pg_advisory_xact_lock to serialize concurrent requests from the same sender. Only service_role may invoke.';
