-- testimonials table: member-submitted quotes displayed on the landing page
-- Admin reviews and features/unfeatures via is_featured flag.

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quote text NOT NULL CHECK (length(trim(quote)) >= 10 AND length(trim(quote)) <= 500),
  trade_context text CHECK (length(trim(trade_context)) <= 200),
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast featured lookups
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonials_profile ON testimonials(profile_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS testimonials_updated_at ON testimonials;
CREATE TRIGGER testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();

-- RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Everyone can read featured testimonials
CREATE POLICY testimonials_select_featured
  ON testimonials
  FOR SELECT
  TO anon, authenticated
  USING (is_featured = true);

-- Members can read their own testimonials (featured or not)
CREATE POLICY testimonials_select_own
  ON testimonials
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT id FROM profiles WHERE owner_id = auth.uid()));

-- Members can insert their own testimonial (one per profile)
CREATE POLICY testimonials_insert_own
  ON testimonials
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE owner_id = auth.uid()));

-- Members can update/delete their own testimonial
CREATE POLICY testimonials_update_own
  ON testimonials
  FOR UPDATE
  TO authenticated
  USING (profile_id = (SELECT id FROM profiles WHERE owner_id = auth.uid()));

CREATE POLICY testimonials_delete_own
  ON testimonials
  FOR DELETE
  TO authenticated
  USING (profile_id = (SELECT id FROM profiles WHERE owner_id = auth.uid()));

-- Admin can do everything (enforced by app-layer admin guard, not RLS)
CREATE POLICY testimonials_admin_all
  ON testimonials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE owner_id = auth.uid()
        AND email = current_setting('app.admin_email', true)
    )
  );
