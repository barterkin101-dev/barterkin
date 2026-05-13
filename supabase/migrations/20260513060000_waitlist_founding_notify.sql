-- Waitlist founding-slot notification tracking
-- Tracks which waitlisters have been notified about founding member availability.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_about_founding boolean NOT NULL DEFAULT false;

-- Index for efficient querying of unnotified waitlisters
CREATE INDEX IF NOT EXISTS idx_waitlist_notified_about_founding
  ON public.waitlist(notified_about_founding, joined_at)
  WHERE notified_about_founding = false;

COMMENT ON COLUMN public.waitlist.notified_at IS
  'When the waitlister was last notified about founding slot availability';

COMMENT ON COLUMN public.waitlist.notified_about_founding IS
  'True if the waitlister has been notified that founding slots are available';
