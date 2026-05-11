import { test, expect } from '@playwright/test'

test.describe('ADMIN-07 — admin pages auth guard (extended coverage)', () => {
  test('unauthenticated user visiting /admin/contacts is redirected to /login', async ({ page }) => {
    await page.goto('/admin/contacts')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/listings is redirected to /login', async ({ page }) => {
    await page.goto('/admin/listings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/tickets is redirected to /login', async ({ page }) => {
    await page.goto('/admin/tickets')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/disputes is redirected to /login', async ({ page }) => {
    await page.goto('/admin/disputes')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/tickets/[id] is redirected to /login', async ({ page }) => {
    await page.goto('/admin/tickets/00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user visiting /admin/disputes/[id] is redirected to /login', async ({ page }) => {
    await page.goto('/admin/disputes/00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveURL(/\/login/)
  })
})
