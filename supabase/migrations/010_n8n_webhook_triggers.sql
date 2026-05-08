-- Phase 10 — n8n Webhook Triggers
-- Requirements: D-03 (welcome-email fires ONLY on onboarding_completed_at NULL->timestamp transition),
--               D-05 (contact-request-alert fires on every contact_requests INSERT),
--               D-06 (WhatsApp leg data-only; no DB change needed)
-- Depends on: 003_profile_tables.sql (profiles.owner_id, profiles.display_name — email resolving
--               and display name lookups used in Sections 1 and 2),
--             005_contact_relay_trust.sql (contact_requests table — target of Section 2 RPC
--               and contact-request-alert trigger in Section 3),
--             009_onboarding.sql (profiles.onboarding_completed_at — WHEN clause in Section 3
--               welcome-email trigger depends on this column existing)
-- Security: Uses CUSTOM header X-Barterkin-Webhook-Secret (NOT Authorization) to dodge
--           Supabase UI bug #38848 which silently deletes Authorization headers on webhook re-save.
--           DO NOT re-save these webhooks in Supabase Studio after this migration runs —
--           the UI regenerates triggers WITHOUT the WHEN clause (Pitfall 2 in 10-RESEARCH.md).
--           See 10-RESEARCH.md §Pitfalls 1 and 2 for full context.

-- ============================================================================
-- SECTION 1: profile_owner_email RPC (n8n welcome-email workflow uses this)
-- Mirrors the SECURITY DEFINER + revoke/grant pattern from migrations 005 and 006.
-- auth.users.email is not readable by authenticated role; service_role (n8n with
-- service-role key in its Supabase REST credential) may invoke this RPC.
-- ============================================================================
create or replace function public.profile_owner_email(p_profile_id uuid)
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select u.email
    from auth.users u
    join public.profiles p on p.owner_id = u.id
   where p.id = p_profile_id
   limit 1;
$$;

revoke execute on function public.profile_owner_email(uuid) from public;
revoke execute on function public.profile_owner_email(uuid) from anon;
revoke execute on function public.profile_owner_email(uuid) from authenticated;
grant  execute on function public.profile_owner_email(uuid) to   service_role;

comment on function public.profile_owner_email(uuid) is
  'Phase 10 — resolves auth.users.email from a profile id for the n8n welcome-email workflow.
   SECURITY DEFINER because auth.users.email is not readable by authenticated role.
   Only service_role (n8n HTTP Request node using the Supabase service-role key) may invoke.';

-- ============================================================================
-- SECTION 2: contact_request_alert_payload RPC (n8n contact-request-alert workflow uses this)
-- Webhook payload has sender_id + recipient_id UUIDs only; this RPC resolves both
-- display names and created_at in one round trip so the workflow doesn't fan out.
-- ============================================================================
create or replace function public.contact_request_alert_payload(p_contact_request_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'sender_display_name',    coalesce(s.display_name, '(unknown sender)'),
           'recipient_display_name', coalesce(r.display_name, '(unknown recipient)'),
           'created_at',             cr.created_at
         )
    from public.contact_requests cr
    left join public.profiles s on s.id = cr.sender_id
    left join public.profiles r on r.id = cr.recipient_id
   where cr.id = p_contact_request_id
   limit 1;
$$;

revoke execute on function public.contact_request_alert_payload(uuid) from public;
revoke execute on function public.contact_request_alert_payload(uuid) from anon;
revoke execute on function public.contact_request_alert_payload(uuid) from authenticated;
grant  execute on function public.contact_request_alert_payload(uuid) to   service_role;

comment on function public.contact_request_alert_payload(uuid) is
  'Phase 10 — resolves sender/recipient display names + created_at for the n8n
   contact-request-alert workflow. SECURITY DEFINER because direct profile reads by
   service_role are already allowed, but this keeps a single call contract. Only
   service_role may invoke.';

-- ============================================================================
-- SECTION 3: Re-create the Studio-managed triggers with WHEN clause + custom header
-- ============================================================================
-- After creating both webhooks in Studio, record the generated trigger names:
--   SELECT tgname, tgrelid::regclass FROM pg_trigger
--    WHERE tgname LIKE 'supabase_functions_hooks_%' ORDER BY tgname;
--
-- Paste the names below as <trigger_name_welcome> and <trigger_name_contact>.
-- Postgres has no ALTER TRIGGER ... WHEN — DROP + recreate is the only path.
--
-- PLACEHOLDER NOTE: Before running supabase db push, substitute these placeholders
-- on a TEMP copy only (never commit the substituted version — see runbook 03-supabase-webhooks-create.md):
--   <trigger_name_welcome>  → actual trigger name from pg_trigger (e.g. supabase_functions_hooks_123)
--   <trigger_name_contact>  → actual trigger name from pg_trigger (e.g. supabase_functions_hooks_456)
--   __WEBHOOK_SECRET__      → 32-byte hex secret from 1Password ("Barterkin — Supabase webhook secret")

-- Welcome-email trigger: adds WHEN (OLD.onboarding_completed_at IS NULL AND NEW IS NOT NULL)
-- Replace <trigger_name_welcome> with the real name from pg_trigger.
DROP TRIGGER IF EXISTS <trigger_name_welcome> ON public.profiles;
CREATE TRIGGER <trigger_name_welcome>
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.onboarding_completed_at IS NULL AND NEW.onboarding_completed_at IS NOT NULL)
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/welcome-email',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"__WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );

-- Contact-request-alert trigger: fires on every INSERT; no WHEN clause needed.
-- Replace <trigger_name_contact> with the real name from pg_trigger.
-- Recreated here for two reasons:
--   1. Ensures the header is X-Barterkin-Webhook-Secret (future Studio edits won't clobber this migration source of truth).
--   2. Makes the migration file a self-contained source of truth for both triggers.
DROP TRIGGER IF EXISTS <trigger_name_contact> ON public.contact_requests;
CREATE TRIGGER <trigger_name_contact>
  AFTER INSERT ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/contact-request-alert',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"__WEBHOOK_SECRET__"}',
    '{}',
    '5000'
  );
