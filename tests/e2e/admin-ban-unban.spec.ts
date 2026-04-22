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

test.describe('ADMIN-04 — admin ban/unban UI flow', () => {
  let pair: VerifiedPair | null = null
  let recipientProfileId: string | null = null

  test.beforeAll(async () => {
    test.skip(!hasAdminCreds, 'requires Supabase env + ADMIN_EMAIL')
    await ensureAdminUser()
    pair = await createVerifiedPair('admin-ban-ui')
    recipientProfileId = await profileIdFromOwner(pair.recipientId)
  })

  test.afterAll(async () => {
    if (pair) {
      await setBanned(pair.recipientId, false).catch(() => undefined)
      await cleanupPair(pair.senderId, pair.recipientId)
    }
  })

  test('admin bans a member via AlertDialog → banned=true in DB + toast shown', async ({ page }) => {
    test.skip(!hasAdminCreds, 'requires admin env')
    await setBanned(pair!.recipientId, false)
    await loginAsAdmin(page)
    await page.goto(`/admin/members/${recipientProfileId}`)

    const trigger = page.getByTestId('ban-unban-trigger')
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    await trigger.click()

    // AlertDialog title appears
    await expect(page.getByText(/^Ban .+\?/)).toBeVisible()
    await page.getByTestId('ban-unban-confirm').click()

    // Sonner toast
    await expect(page.getByText(/has been banned\./i)).toBeVisible({ timeout: 10_000 })

    // DB reflects banned=true
    const admin = adminClient()
    const { data } = await admin.from('profiles').select('banned').eq('id', recipientProfileId!).single()
    expect(data?.banned).toBe(true)
  })

  test('admin unbans a member via AlertDialog → banned=false in DB', async ({ page }) => {
    test.skip(!hasAdminCreds, 'requires admin env')
    await setBanned(pair!.recipientId, true)
    await loginAsAdmin(page)
    await page.goto(`/admin/members/${recipientProfileId}`)

    const trigger = page.getByTestId('ban-unban-trigger')
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    await expect(trigger).toHaveText(/Unban this member/i)
    await trigger.click()

    await expect(page.getByText(/^Unban .+\?/)).toBeVisible()
    await page.getByTestId('ban-unban-confirm').click()

    await expect(page.getByText(/has been unbanned\./i)).toBeVisible({ timeout: 10_000 })

    const admin = adminClient()
    const { data } = await admin.from('profiles').select('banned').eq('id', recipientProfileId!).single()
    expect(data?.banned).toBe(false)
  })

  test('canceling the dialog does not change the banned state', async ({ page }) => {
    test.skip(!hasAdminCreds, 'requires admin env')
    await setBanned(pair!.recipientId, false)
    await loginAsAdmin(page)
    await page.goto(`/admin/members/${recipientProfileId}`)

    await page.getByTestId('ban-unban-trigger').click()
    await page.getByRole('button', { name: 'No, go back' }).click()

    const admin = adminClient()
    const { data } = await admin.from('profiles').select('banned').eq('id', recipientProfileId!).single()
    expect(data?.banned).toBe(false)
  })
})
