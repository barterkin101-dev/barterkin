-- Waitlist table for landing page email capture
-- Converts anonymous visitors into captured leads before they sign up.

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text DEFAULT 'hero_cta',
  county_id integer REFERENCES counties(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  converted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for fast duplicate checks and admin listing
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_joined_at ON waitlist(joined_at DESC);

-- RLS: anyone can insert (landing page), only admins can read
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_insert_anon"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "waitlist_select_admin"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.owner_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Allow service_role full access for backfills / analytics
CREATE POLICY "waitlist_service_role_all"
  ON waitlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE waitlist IS 'Landing page email capture — pre-signup leads';
