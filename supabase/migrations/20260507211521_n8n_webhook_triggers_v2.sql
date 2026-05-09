-- Phase 1.5 — n8n Webhook Triggers v2 (messages, tickets, disputes)
-- Depends on: 014_conversations.sql, 015_tickets_disputes.sql
-- Security: Uses CUSTOM header X-Barterkin-Webhook-Secret (same pattern as 010)

-- ============================================================================
-- SECTION 1: message_alert_payload RPC
-- Resolves sender display name + conversation participants for n8n notification
-- ============================================================================
create or replace function public.message_alert_payload(p_message_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'sender_display_name', coalesce(s.display_name, s.username, '(unknown)'),
           'conversation_id',     m.conversation_id,
           'content_preview',     left(m.content, 200),
           'created_at',          m.created_at,
           'participants',        (
             select jsonb_agg(p.profile_id)
             from public.conversation_participants p
             where p.conversation_id = m.conversation_id
           )
         )
    from public.messages m
    left join public.profiles s on s.id = m.sender_profile_id
   where m.id = p_message_id
   limit 1;
$$;

revoke execute on function public.message_alert_payload(uuid) from public;
revoke execute on function public.message_alert_payload(uuid) from anon;
revoke execute on function public.message_alert_payload(uuid) from authenticated;
grant  execute on function public.message_alert_payload(uuid) to   service_role;

comment on function public.message_alert_payload(uuid) is
  'Phase 1.5 — resolves sender name + conversation participants for n8n new-message notification.
   SECURITY DEFINER. Only service_role may invoke.';

-- ============================================================================
-- SECTION 2: ticket_alert_payload RPC
-- ============================================================================
create or replace function public.ticket_alert_payload(p_ticket_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'subject',             t.subject,
           'category',            t.category,
           'priority',            t.priority,
           'profile_display_name', coalesce(p.display_name, p.username, '(unknown)'),
           'created_at',          t.created_at
         )
    from public.tickets t
    left join public.profiles p on p.id = t.profile_id
   where t.id = p_ticket_id
   limit 1;
$$;

revoke execute on function public.ticket_alert_payload(uuid) from public;
revoke execute on function public.ticket_alert_payload(uuid) from anon;
revoke execute on function public.ticket_alert_payload(uuid) from authenticated;
grant  execute on function public.ticket_alert_payload(uuid) to   service_role;

comment on function public.ticket_alert_payload(uuid) is
  'Phase 1.5 — resolves ticket details + profile name for n8n ticket alert.
   SECURITY DEFINER. Only service_role may invoke.';

-- ============================================================================
-- SECTION 3: dispute_alert_payload RPC
-- ============================================================================
create or replace function public.dispute_alert_payload(p_dispute_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'reason',              d.reason,
           'initiator_name',      coalesce(i.display_name, i.username, '(unknown)'),
           'responder_name',      coalesce(r.display_name, r.username, '(unknown)'),
           'created_at',          d.created_at
         )
    from public.disputes d
    left join public.profiles i on i.id = d.initiator_profile_id
    left join public.profiles r on r.id = d.responder_profile_id
   where d.id = p_dispute_id
   limit 1;
$$;

revoke execute on function public.dispute_alert_payload(uuid) from public;
revoke execute on function public.dispute_alert_payload(uuid) from anon;
revoke execute on function public.dispute_alert_payload(uuid) from authenticated;
grant  execute on function public.dispute_alert_payload(uuid) to   service_role;

comment on function public.dispute_alert_payload(uuid) is
  'Phase 1.5 — resolves dispute details + participant names for n8n dispute alert.
   SECURITY DEFINER. Only service_role may invoke.';

-- ============================================================================
-- SECTION 4: Trigger templates (create in Supabase Studio first, then record names)
-- ============================================================================
-- After creating webhooks in Studio, record trigger names from:
--   SELECT tgname, tgrelid::regclass FROM pg_trigger
--    WHERE tgname LIKE 'supabase_functions_hooks_%' ORDER BY tgname;
--
-- PLACEHOLDERS (substitute before running on temp copy only):
--   <trigger_name_message>  → actual trigger name
--   <trigger_name_ticket>   → actual trigger name
--   <trigger_name_dispute>  → actual trigger name
--   __WEBHOOK_SECRET__      → 32-byte hex secret

-- New message trigger
-- DROP TRIGGER IF EXISTS <trigger_name_message> ON public.messages;
-- CREATE TRIGGER <trigger_name_message>
--   AFTER INSERT ON public.messages
--   FOR EACH ROW
--   EXECUTE FUNCTION supabase_functions.http_request(
--     'https://n8n.barterkin.com/webhook/new-message',
--     'POST',
--     '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"__WEBHOOK_SECRET__"}',
--     '{}',
--     '5000'
--   );

-- New ticket trigger
-- DROP TRIGGER IF EXISTS <trigger_name_ticket> ON public.tickets;
-- CREATE TRIGGER <trigger_name_ticket>
--   AFTER INSERT ON public.tickets
--   FOR EACH ROW
--   EXECUTE FUNCTION supabase_functions.http_request(
--     'https://n8n.barterkin.com/webhook/new-ticket',
--     'POST',
--     '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"__WEBHOOK_SECRET__"}',
--     '{}',
--     '5000'
--   );

-- New dispute trigger
-- DROP TRIGGER IF EXISTS <trigger_name_dispute> ON public.disputes;
-- CREATE TRIGGER <trigger_name_dispute>
--   AFTER INSERT ON public.disputes
--   FOR EACH ROW
--   EXECUTE FUNCTION supabase_functions.http_request(
--     'https://n8n.barterkin.com/webhook/new-dispute',
--     'POST',
--     '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"__WEBHOOK_SECRET__"}',
--     '{}',
--     '5000'
--   );
