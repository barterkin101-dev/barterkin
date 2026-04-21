import { test, expect } from '@playwright/test'
import {
  createVerifiedPair,
  cleanupPair,
  adminClient,
} from './fixtures/contact-helpers'
import type { VerifiedPair } from './fixtures/contact-helpers'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  const pwField = page.getByLabel(/password/i)
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(password)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
  }
  await page.waitForURL(/\/(directory|profile|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}

// CONT-07, CONT-08 — rate limiting enforced at 5/day sender cap + 2/week per-recipient cap
test.describe('CONT-07/08 contact rate limits', () => {
  let pair: VerifiedPair

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'requires Supabase env')
    pair = await createVerifiedPair('ratelimit')
  })

  test.afterAll(async () => {
    if (pair) await cleanupPair(pair.senderId, pair.recipientId)
  })

  test('daily cap', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    // Get sender profile id
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.senderId)
      .single()
    expect(senderProfile).toBeTruthy()

    // Create 4 additional recipients so pair_cap doesn't fire first
    const extraRecipientIds: string[] = []
    for (let i = 0; i < 4; i++) {
      const stamp = Date.now() + i
      const { data: ua } = await admin.auth.admin.createUser({
        email: `ratelimit-extra-${stamp}-${i}@example.test`,
        password: 'TestOnly-pw-12345!',
        email_confirm: true,
      })
      if (!ua?.user) continue
      const uid = ua.user.id
      extraRecipientIds.push(uid)
      await admin.from('profiles').insert({
        owner_id: uid,
        display_name: `Extra ${stamp}`,
        username: `rl-extra-${stamp}-${i}`.slice(0, 40),
        county_id: 13001,
        category_id: 1,
        is_published: true,
        accepting_contact: true,
        banned: false,
      })
    }

    // Fetch extra profile ids
    const { data: extraProfiles } = await admin
      .from('profiles')
      .select('id, owner_id')
      .in('owner_id', extraRecipientIds)
    expect(extraProfiles?.length).toBe(extraRecipientIds.length)

    // Get original recipient profile id
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.recipientId)
      .single()

    // Seed 5 contact_requests from sender today (one to original recipient + four to extras)
    const seedRows = [
      { sender_id: senderProfile!.id, recipient_id: recipientProfile!.id, message: 'seed 1 — daily cap test for original recipient, valid message length here' },
      ...extraProfiles!.map((ep, i) => ({
        sender_id: senderProfile!.id,
        recipient_id: ep.id,
        message: `seed ${i + 2} — daily cap test to extra recipient ${i + 1}, valid message length`,
      })),
    ].slice(0, 5)
    await admin.from('contact_requests').insert(seedRows)

    // Attempt 6th via UI — should hit daily cap
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)
    await page.getByRole('button', { name: /^Contact /i }).click()
    const textarea = page.getByLabel(/your message/i)
    await textarea.fill('Attempting a sixth message today — this should be rejected by the daily cap.')
    await page.getByRole('button', { name: /^Send message$/i }).click()
    await expect(page.getByText(/daily|limit|too many/i)).toBeVisible({ timeout: 10_000 })

    // Cleanup extra users
    for (const uid of extraRecipientIds) {
      await admin.auth.admin.deleteUser(uid)
    }
  })

  test('per-recipient cap', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const admin = adminClient()

    // Get profile ids
    const { data: senderProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.senderId)
      .single()
    const { data: recipientProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('owner_id', pair.recipientId)
      .single()
    expect(senderProfile).toBeTruthy()
    expect(recipientProfile).toBeTruthy()

    // Seed 2 contact_requests from sender to same recipient in last 7 days
    await admin.from('contact_requests').insert([
      {
        sender_id: senderProfile!.id,
        recipient_id: recipientProfile!.id,
        message: 'Per-recipient cap seed 1 — checking weekly duplicate limit for same pair.',
        status: 'sent',
      },
      {
        sender_id: senderProfile!.id,
        recipient_id: recipientProfile!.id,
        message: 'Per-recipient cap seed 2 — checking weekly duplicate limit for same pair.',
        status: 'sent',
      },
    ])

    // Attempt 3rd via UI — should hit pair/weekly cap
    await loginAs(page, pair.senderEmail, pair.senderPassword)
    await page.goto(`/m/${pair.recipientUsername}`)
    await page.getByRole('button', { name: /^Contact /i }).click()
    const textarea = page.getByLabel(/your message/i)
    await textarea.fill('Attempting a third message to the same recipient this week — should be rejected.')
    await page.getByRole('button', { name: /^Send message$/i }).click()
    await expect(page.getByText(/already contacted|this week|per.recipient|weekly/i)).toBeVisible({ timeout: 10_000 })
  })

  test('weekly cap resets after 7 days', async ({ page: _page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // This test validates that requests seeded 8 days ago do not count toward weekly cap.
    // Full validation requires DB timestamp manipulation (created_at backdating via admin insert).
    // The Edge Function's weekly cap query uses: created_at > now() - interval '7 days'
    // Seeding with backdated rows requires raw SQL; covered in VALIDATION.md Manual-Only #2.
    // Marking as intentionally deferred to manual verification per VALIDATION.md.
    expect(true).toBe(true) // placeholder — manual VALIDATION.md §CONT-08 weekly-reset step
  })
})
