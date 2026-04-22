import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createVerifiedPair, cleanupPair, setBanned, adminClient } from './fixtures/contact-helpers'
import type { VerifiedPair } from './fixtures/contact-helpers'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD_TEST = process.env.ADMIN_PASSWORD_TEST ?? 'TestOnly-admin-pw-12345!'
const hasAdminCreds = !!ADMIN_EMAIL && hasEnv

async function ensureAdminUser(): Promise<void> {
  if (!hasAdminCreds) return
  const admin = adminClient()
  // Idempotent: create the admin user if it doesn't exist, otherwise no-op.
  // Use listUsers → find → create-if-absent (avoids unique-constraint crash).
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users?.find((u) => u.email === ADMIN_EMAIL)
  if (!existing) {
    await admin.auth.admin.createUser({
      email: ADMIN_EMAIL!,
      password: ADMIN_PASSWORD_TEST,
      email_confirm: true,
    })
  }
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL!)
  const pwField = page.getByLabel(/password/i)
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(ADMIN_PASSWORD_TEST)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
  }
  await page.waitForURL(/\/(directory|profile|admin|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}

/**
 * Resolve profiles.id (primary key) from owner_id (auth.users.id).
 * Required because createVerifiedPair returns auth user ids via
 * `recipientId`, but /admin/members/[id] expects profiles.id.
 */
async function profileIdFromOwner(ownerId: string): Promise<string> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('owner_id', ownerId)
    .single()
  if (error || !data) throw new Error(`profileIdFromOwner(${ownerId}) failed: ${error?.message ?? 'no row'}`)
  return data.id as string
}

test.describe('ADMIN-03 — admin member detail view', () => {
  let pair: VerifiedPair | null = null
  let recipientProfileId: string | null = null

  test.beforeAll(async () => {
    test.skip(!hasAdminCreds, 'requires Supabase env + ADMIN_EMAIL')
    await ensureAdminUser()
    pair = await createVerifiedPair('admin-detail')
    recipientProfileId = await profileIdFromOwner(pair.recipientId)
  })

  test.afterAll(async () => {
    if (pair) {
      await setBanned(pair.recipientId, false).catch(() => undefined)
      await cleanupPair(pair.senderId, pair.recipientId)
    }
  })

  test('admin sees display name, county, joined date, skills', async ({ page }) => {
    test.skip(!hasAdminCreds, 'requires admin env')
    await loginAsAdmin(page)
    await page.goto(`/admin/members/${recipientProfileId}`)
    await expect(page.getByText(/Recipient/i).first()).toBeVisible({ timeout: 10_000 })
    // UI-SPEC: back link
    await expect(page.getByRole('link', { name: /Back to members/i })).toBeVisible()
    // Joined date renders a long month name (e.g. "April")
    await expect(page.getByText(/Joined [A-Za-z]+ \d+, \d{4}/)).toBeVisible()
    // Skills section header exists
    await expect(page.getByText('Skills offered')).toBeVisible()
    await expect(page.getByText('Skills wanted')).toBeVisible()
  })

  test('admin sees Ban button when profile is not banned', async ({ page }) => {
    test.skip(!hasAdminCreds, 'requires admin env')
    await setBanned(pair!.recipientId, false)
    await loginAsAdmin(page)
    await page.goto(`/admin/members/${recipientProfileId}`)
    await expect(page.getByRole('button', { name: /Ban this member/i })).toBeVisible({ timeout: 10_000 })
  })

  test('admin sees Unban button when profile is banned', async ({ page }) => {
    test.skip(!hasAdminCreds, 'requires admin env')
    await setBanned(pair!.recipientId, true)
    await loginAsAdmin(page)
    await page.goto(`/admin/members/${recipientProfileId}`)
    await expect(page.getByRole('button', { name: /Unban this member/i })).toBeVisible({ timeout: 10_000 })
    // Status pill should read "Banned"
    await expect(page.getByText(/^Banned$/).first()).toBeVisible()
    // Reset for other tests
    await setBanned(pair!.recipientId, false)
  })

  test('non-existent id produces 404', async ({ page }) => {
    test.skip(!hasAdminCreds, 'requires admin env')
    await loginAsAdmin(page)
    const resp = await page.goto('/admin/members/00000000-0000-0000-0000-000000000000')
    // Next.js notFound() renders the not-found UI with 404 status
    expect(resp?.status()).toBe(404)
  })
})
