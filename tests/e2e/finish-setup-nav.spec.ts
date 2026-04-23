import { test } from '@playwright/test'

test.describe('AppNav "Finish setup" link (D-04, D-12)', () => {
  test.fixme('link is visible when profile.onboarding_completed_at IS NULL', async () => {})
  test.fixme('link is hidden when profile.onboarding_completed_at is set', async () => {})
  test.fixme('link target is /onboarding (with optional ?step=N)', async () => {})
  test.fixme('clicking link navigates to /onboarding wizard', async () => {})
})
