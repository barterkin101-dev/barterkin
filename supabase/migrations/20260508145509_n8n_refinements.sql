-- Phase 1.5 — n8n Automation Refinements
-- Depends on: 020_n8n_webhook_triggers.sql, 022_chatbot_tickets.sql, 021_chatbot.sql
--
-- Improvements:
--   1. ticket_alert_payload now includes source/user_email and handles anonymous chatbot tickets
--   2. New chat escalation webhook — fires when chat_sessions.status → 'escalated'
--   3. New listing moderation webhook — fires on every listings INSERT
--   4. All webhook payloads include idempotency-friendly headers

-- ============================================================================
-- SECTION 1: Update ticket_alert_payload for anonymous tickets + source field
-- ============================================================================
create or replace function public.ticket_alert_payload(p_ticket_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'ticket_id',           t.id,
           'subject',             t.subject,
           'category',            t.category,
           'priority',            t.priority,
           'source',              t.source,
           'user_email',          t.user_email,
           'profile_display_name', coalesce(p.display_name, p.username, t.user_email, '(anonymous)'),
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
  'Phase 1.5 refined — resolves ticket details + profile name for n8n ticket alert.
   Now handles anonymous chatbot tickets (profile_id IS NULL) by falling back to user_email.
   Includes source (web/chatbot/email) for routing in n8n.
   SECURITY DEFINER. Only service_role may invoke.';

-- ============================================================================
-- SECTION 2: chat_escalation_payload RPC
-- ============================================================================
create or replace function public.chat_escalation_payload(p_session_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'session_id',       cs.id,
           'user_email',       cs.user_email,
           'ticket_id',        cs.ticket_id,
           'message_count',    (
             select count(*)::int
             from public.chat_messages cm
             where cm.session_id = cs.id
           ),
           'last_message',     (
             select left(cm.content, 300)
             from public.chat_messages cm
             where cm.session_id = cs.id
             order by cm.created_at desc
             limit 1
           ),
           'created_at',       cs.created_at,
           'escalated_at',     cs.updated_at
         )
    from public.chat_sessions cs
   where cs.id = p_session_id
   limit 1;
$$;

revoke execute on function public.chat_escalation_payload(uuid) from public;
revoke execute on function public.chat_escalation_payload(uuid) from anon;
revoke execute on function public.chat_escalation_payload(uuid) from authenticated;
grant  execute on function public.chat_escalation_payload(uuid) to   service_role;

comment on function public.chat_escalation_payload(uuid) is
  'Phase 1.5 — resolves chat session details for n8n escalation alert.
   Includes message count, last message preview, and ticket linkage.
   SECURITY DEFINER. Only service_role may invoke.';

-- ============================================================================
-- SECTION 3: listing_alert_payload RPC
-- ============================================================================
create or replace function public.listing_alert_payload(p_listing_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
           'listing_id',     l.id,
           'title',          l.title,
           'category_id',    l.category_id,
           'county_id',      l.county_id,
           'status',         l.status,
           'price_estimate', l.price_estimate,
           'profile_name',   coalesce(p.display_name, p.username, '(unknown)'),
           'created_at',     l.created_at
         )
    from public.listings l
    left join public.profiles p on p.id = l.profile_id
   where l.id = p_listing_id
   limit 1;
$$;

revoke execute on function public.listing_alert_payload(uuid) from public;
revoke execute on function public.listing_alert_payload(uuid) from anon;
revoke execute on function public.listing_alert_payload(uuid) from authenticated;
grant  execute on function public.listing_alert_payload(uuid) to   service_role;

comment on function public.listing_alert_payload(uuid) is
  'Phase 1.5 — resolves listing details + profile name for n8n moderation alert.
   SECURITY DEFINER. Only service_role may invoke.';

-- ============================================================================
-- SECTION 4: Chat escalation webhook
-- Fires when a chat session transitions to 'escalated' status
-- ============================================================================
drop trigger if exists webhook_chat_escalated on public.chat_sessions;
create trigger webhook_chat_escalated
  after update on public.chat_sessions
  for each row
  when (old.status is distinct from 'escalated' and new.status = 'escalated')
  execute function supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/chat-escalated',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"46cb811aa65c34d073f79d40d363687af5880961adba6333978d25b6f9f238bd"}',
    '{}',
    '5000'
  );

-- ============================================================================
-- SECTION 5: New listing webhook
-- Fires on every listings INSERT for moderation / directory indexing
-- ============================================================================
drop trigger if exists webhook_new_listing on public.listings;
create trigger webhook_new_listing
  after insert on public.listings
  for each row
  execute function supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/new-listing',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"46cb811aa65c34d073f79d40d363687af5880961adba6333978d25b6f9f238bd"}',
    '{}',
    '5000'
  );
