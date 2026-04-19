import { test } from '@playwright/test'

test.describe('verify-pending gate (AUTH-04)', () => {
  test.fixme('authed-but-unverified user is redirected from /directory to /verify-pending', async () => {})
  test.fixme('/verify-pending shows "One more step" heading and Resend button', async () => {})
  test.fixme('/verify-pending is accessible to authed-unverified users (no redirect loop)', async () => {})
})
