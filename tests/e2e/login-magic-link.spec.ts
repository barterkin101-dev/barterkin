import { test } from '@playwright/test'

test.describe('login — magic link (AUTH-02)', () => {
  test.fixme('email input renders and accepts input', async () => {})
  test.fixme('submitting a valid email shows "Check your email" confirmation', async () => {})
  test.fixme('submitting @mailinator.com shows disposable-email error copy', async () => {})
  test.fixme('submitting without completing Turnstile keeps button disabled', async () => {})
})
