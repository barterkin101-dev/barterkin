-- Phase 3 — Enable Realtime on messages table
-- Depends on: 014_conversations.sql

-- Enable Realtime on the messages table for live chat.
-- This adds the messages table to the supabase_realtime publication.

DO $$
BEGIN
  -- Add messages table to realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

comment on table public.messages is
  'Phase 3 — in-app messaging. Realtime enabled for live chat.';
