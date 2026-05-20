-- Gift Premium purchases table
-- Tracks gift subscriptions purchased by one member for another.

CREATE TABLE IF NOT EXISTS gift_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchaser_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'redeemed', 'expired')),
  redeemed_at timestamptz,
  redeemed_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  tier text NOT NULL DEFAULT 'premium' CHECK (tier IN ('premium', 'founding')),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_gift_purchases_purchaser ON gift_purchases(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_recipient_email ON gift_purchases(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_status ON gift_purchases(status);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_session ON gift_purchases(stripe_checkout_session_id);

-- RLS: purchasers can read their own gift purchases
ALTER TABLE gift_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gift purchases: purchasers can read own"
  ON gift_purchases
  FOR SELECT
  TO authenticated
  USING (purchaser_id = (
    SELECT id FROM profiles WHERE owner_id = auth.uid()
  ));

-- Admin read-all policy (via service role, bypasses RLS)
-- No additional policy needed; service role bypasses RLS.
