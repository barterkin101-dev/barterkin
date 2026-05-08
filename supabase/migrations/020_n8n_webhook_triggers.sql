-- Phase 1.5 — n8n Webhook Triggers (production)
-- Depends on: 010_n8n_webhook_triggers.sql, 018_n8n_webhook_triggers_v2.sql
--
-- SECURITY NOTE: This file contains the webhook secret in trigger definitions.
-- It is committed for reproducibility. Rotate the secret via n8n if needed.
--
-- These triggers call supabase_functions.http_request directly (no Studio required).
-- The payload sent to n8n includes: old_record, record, type, table, schema.

-- ============================================================================
-- SECTION 1: Welcome email — fires when onboarding_completed_at transitions NULL → value
-- ============================================================================
drop trigger if exists webhook_welcome_email on public.profiles;
create trigger webhook_welcome_email
  after update on public.profiles
  for each row
  when (old.onboarding_completed_at is null and new.onboarding_completed_at is not null)
  execute function supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/welcome-email',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"46cb811aa65c34d073f79d40d363687af5880961adba6333978d25b6f9f238bd"}',
    '{}',
    '5000'
  );

-- ============================================================================
-- SECTION 2: Contact request alert — fires on every contact_requests INSERT
-- ============================================================================
drop trigger if exists webhook_contact_request on public.contact_requests;
create trigger webhook_contact_request
  after insert on public.contact_requests
  for each row
  execute function supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/contact-request-alert',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"46cb811aa65c34d073f79d40d363687af5880961adba6333978d25b6f9f238bd"}',
    '{}',
    '5000'
  );

-- ============================================================================
-- SECTION 3: New message alert — fires on every messages INSERT
-- ============================================================================
drop trigger if exists webhook_new_message on public.messages;
create trigger webhook_new_message
  after insert on public.messages
  for each row
  execute function supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/new-message',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"46cb811aa65c34d073f79d40d363687af5880961adba6333978d25b6f9f238bd"}',
    '{}',
    '5000'
  );

-- ============================================================================
-- SECTION 4: New ticket alert — fires on every tickets INSERT
-- ============================================================================
drop trigger if exists webhook_new_ticket on public.tickets;
create trigger webhook_new_ticket
  after insert on public.tickets
  for each row
  execute function supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/new-ticket',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"46cb811aa65c34d073f79d40d363687af5880961adba6333978d25b6f9f238bd"}',
    '{}',
    '5000'
  );

-- ============================================================================
-- SECTION 5: New dispute alert — fires on every disputes INSERT
-- ============================================================================
drop trigger if exists webhook_new_dispute on public.disputes;
create trigger webhook_new_dispute
  after insert on public.disputes
  for each row
  execute function supabase_functions.http_request(
    'https://n8n.barterkin.com/webhook/new-dispute',
    'POST',
    '{"Content-Type":"application/json","X-Barterkin-Webhook-Secret":"46cb811aa65c34d073f79d40d363687af5880961adba6333978d25b6f9f238bd"}',
    '{}',
    '5000'
  );
