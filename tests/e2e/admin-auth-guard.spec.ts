import { test, expect } from '@playwright/test'

test.describe('ADMIN-06 — admin auth guard', () => {
  test('unauthenticated user visiting /admin is redirected to /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/members is redirected to /login', async ({ page }) => {
    await page.goto('/admin/members')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/contacts is redirected to /login', async ({ page }) => {
    await page.goto('/admin/contacts')
    await expect(page).toHaveURL(/\/login/)
  })

  test.fixme('authenticated non-admin user visiting /admin is redirected to /', async () => {
    // Plan 04: use fixtures/contact-helpers.createVerifiedPair → login as sender → goto /admin → expect URL '/'
  })

  test.fixme('authenticated non-admin user visiting /admin/members/[id] is redirected to /', async () => {
    // Plan 04: same fixture, navigate to /admin/members/anything → expect URL '/'
  })
})
