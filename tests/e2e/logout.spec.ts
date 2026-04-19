import { test } from '@playwright/test'

test.describe('logout (AUTH-05)', () => {
  test.fixme('clicking Log out in footer clears the session cookie', async () => {})
  test.fixme('after logout, visiting /directory redirects to /login', async () => {})
  test.fixme('/auth/signout GET returns 405 (POST-only)', async () => {})
})
