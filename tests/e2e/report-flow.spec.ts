// STUB — FILLED IN: Plan 04 (report server action + admin notify) + Plan 05 (UI wiring)
import { test } from '@playwright/test'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

// TRUST-01, TRUST-06 — report submission with reason + note; admin notified via Resend
test.describe('TRUST-01/06 report member flow', () => {
  test.skip('report submission with reason + note', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 04 + Plan 05 — create pair, reporter visits /m/reported,
    // opens overflow menu, clicks Report, selects reason "spam", enters note,
    // submits, assert reports row via admin client (reporter_id, reason, note)
  })

  test.skip('report submission without note (note optional)', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 04 + Plan 05 — submit report with reason only, no note, assert success
  })

  test.skip('admin notified', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 04 — stub Resend mock, submit report,
    // assert reportMember server action called Resend with admin notification email
    // (stubbed Resend — not real email delivery in CI)
  })

  test.skip('shows validation error when no reason selected', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — open report sheet, submit without selecting reason,
    // assert inline validation error
  })

  test.skip('note field rejects over 500 chars', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // FILLED IN: Plan 05 — enter 501-char note, assert validation error
  })
})
