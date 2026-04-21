// STUB — FILLED IN: Plan 02 (RLS policy on reports table in migration 005)
import { describe, it } from 'vitest'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasAll = Boolean(URL && ANON && SERVICE)
const d = hasAll ? describe : describe.skip

// TRUST-05 — reports table is opaque to authenticated non-admin users.
// An authenticated user querying SELECT * FROM reports must receive 0 rows (RLS blocks all reads).
// Only the service-role admin can read reports (for moderation via Supabase Studio).
d('TRUST-05 reports table RLS', () => {
  it.skip('authenticated user SELECT returns 0 rows (RLS blocks read)', () => {
    // FILLED IN: Plan 02 — create auth user + service role, insert report via admin, SELECT via user JWT client,
    // assert rows.length === 0 (RLS policy: no SELECT for non-service-role)
  })

  it.skip('authenticated user cannot SELECT their own submitted reports', () => {
    // FILLED IN: Plan 02 — user submits report, queries their own reports, gets 0 rows
    // (privacy: reporter cannot see what was filed — prevents targeted harassment counterclaims)
  })

  it.skip('service-role client can SELECT all reports', () => {
    // FILLED IN: Plan 02 — admin client SELECTs reports, assert rows visible (moderation use case)
  })

  it.skip('authenticated user INSERT is allowed (submit report)', () => {
    // FILLED IN: Plan 02 — authenticated user inserts a report, assert success (reporters_id = auth.uid() enforced)
  })

  it.skip('unauthenticated request is rejected with 401', () => {
    // FILLED IN: Plan 02 — anon client INSERT attempt, assert RLS error
  })
})
