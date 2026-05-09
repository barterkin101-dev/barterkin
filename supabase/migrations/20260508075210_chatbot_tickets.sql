-- Phase 1.5 — Chatbot ticket enhancements
-- Adds user_email and source to tickets for anonymous chatbot escalations

alter table public.tickets add column user_email text;
alter table public.tickets add column source text default 'web' check (source in ('web', 'chatbot', 'email'));

create index tickets_user_email_idx on public.tickets(user_email, created_at desc);
create index tickets_source_idx on public.tickets(source, created_at desc);
