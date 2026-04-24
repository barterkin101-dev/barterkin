import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

function serviceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Sets or clears onboarding_completed_at for a given owner_id.
 * Pass `null` to clear (NULL = not completed); pass an ISO string to mark complete.
 */
async function setOnboardingTimestamp(ownerId: string, value: string | null) {
  const admin = serviceRole()
  await admin
    .from('profiles')
    .update({ onboarding_completed_at: value })
    .eq('owner_id', ownerId)
}

/**
 * Creates a single verified user with a minimal profile.
 * Returns { userId, email, password, username }.
 */
async function createVerifiedUser(prefix: string) {
  const admin = serviceRole()
  const stamp = Date.now()
  const email = `${prefix}-onbrd-${stamp}@example.test`
  const password = 'TestOnly-pw-12345!'
  const username = `${prefix}-ob-${stamp}`.slice(0, 40)

  const { data: auth, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`createVerifiedUser failed: ${error.message}`)
  const userId = auth.user!.id

  await admin.from('profiles').insert({
    owner_id: userId,
    display_name: `OB User ${stamp}`,
    username,
    county_id: 13001,
    category_id: 1,
    is_published: true,
    accepting_contact: true,
    banned: false,
    onboarding_completed_at: null,
    // Provide all 5 completeness fields so profile is considered "complete"
    avatar_url: 'https://example.com/avatar.png',
  })

  // Insert one skill_offered so the profile is complete
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('owner_id', userId)
    .single()
  if (profile?.id) {
    await admin.from('skills_offered').insert({
      profile_id: profile.id,
      skill_text: 'Test skill',
    })
  }

  return { userId, email, password, username }
}

async function cleanupUser(userId: string) {
  const admin = serviceRole()
  await admin.auth.admin.deleteUser(userId)
}

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  const pwField = page.getByLabel(/password/i)
  if (await pwField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await pwField.fill(password)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
  }
  // Wait for redirect away from login
  await page.waitForURL(/\/(directory|profile|onboarding|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}

test.describe('Onboarding redirect + wizard route (D-02, D-03, D-10, D-16)', () => {
  // Live test — /onboarding route must respond once Plan 02 builds the page.
  // Until Plan 02 lands, this test will fail with 404; accepted as Wave 0 red.
  test('/onboarding responds with 200 (not 404)', async ({ page }) => {
    const response = await page.goto('/onboarding')
    // The middleware will redirect unauth users to /login — either 200 or a redirect chain is fine;
    // what we are asserting is NOT a 404 server error.
    expect(response?.status()).toBeLessThan(400)
  })

  test('D-02: authed + verified user with NULL onboarding_completed_at is redirected to /onboarding', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const { userId, email, password } = await createVerifiedUser('d02')
    try {
      await setOnboardingTimestamp(userId, null)
      await loginAs(page, email, password)
      await page.goto('/directory')
      await page.waitForURL(/\/onboarding/, { timeout: 10_000 })
      expect(page.url()).toMatch(/\/onboarding/)
    } finally {
      await cleanupUser(userId)
    }
  })

  test('D-10: user with onboarding_completed_at set is NOT redirected to /onboarding', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const { userId, email, password } = await createVerifiedUser('d10')
    try {
      await setOnboardingTimestamp(userId, new Date().toISOString())
      await loginAs(page, email, password)
      await page.goto('/directory')
      // Should not redirect to /onboarding — stays on /directory
      await page.waitForURL(/\/directory/, { timeout: 10_000 })
      expect(page.url()).toMatch(/\/directory/)
    } finally {
      await cleanupUser(userId)
    }
  })

  test('D-02 loop: /onboarding itself does not redirect back to /onboarding', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const { userId, email, password } = await createVerifiedUser('d02loop')
    try {
      await setOnboardingTimestamp(userId, null)
      await loginAs(page, email, password)
      await page.goto('/onboarding')
      // Allow redirect to settle but should stay on /onboarding (not loop)
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/onboarding/)
      // Response should be successful (no server error)
      const response = await page.goto('/onboarding')
      expect(response?.status()).toBeLessThan(400)
      // Step 1 content should be visible
      const hasStep1 = await page.getByText(/First, finish your profile\.|Step 1 of 3/).isVisible({ timeout: 5_000 }).catch(() => false)
      expect(hasStep1).toBe(true)
    } finally {
      await cleanupUser(userId)
    }
  })

  test('D-03: Skip-for-now CTA navigates to /directory', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const { userId, email, password } = await createVerifiedUser('d03')
    try {
      await setOnboardingTimestamp(userId, null)
      await loginAs(page, email, password)
      // Step 2 always shows the Skip link in WizardLayout footer
      await page.goto('/onboarding?step=2')
      await page.waitForLoadState('networkidle')
      await page.getByRole('link', { name: /Skip for now/i }).click()
      await page.waitForURL(/\/directory/, { timeout: 10_000 })
      expect(page.url()).toMatch(/\/directory/)
    } finally {
      await cleanupUser(userId)
    }
  })

  test('D-16: Skip-for-now does NOT set onboarding_completed_at (timestamp stays NULL)', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const { userId, email, password } = await createVerifiedUser('d16')
    try {
      await setOnboardingTimestamp(userId, null)
      await loginAs(page, email, password)
      await page.goto('/onboarding?step=2')
      await page.waitForLoadState('networkidle')
      await page.getByRole('link', { name: /Skip for now/i }).click()
      await page.waitForURL(/\/directory/, { timeout: 10_000 })

      // Verify onboarding_completed_at is still NULL after skip
      const admin = serviceRole()
      const { data } = await admin
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('owner_id', userId)
        .single()
      expect(data?.onboarding_completed_at).toBeNull()
    } finally {
      await cleanupUser(userId)
    }
  })

  test('D-11: viewing Step 3 sets onboarding_completed_at to a timestamp', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const { userId, email, password } = await createVerifiedUser('d11')
    try {
      await setOnboardingTimestamp(userId, null)
      await loginAs(page, email, password)
      await page.goto('/onboarding?step=3')
      await page.waitForLoadState('networkidle')

      // Step 3 headline should be visible
      await expect(page.getByText(/Finally, say hello\./)).toBeVisible({ timeout: 10_000 })

      // Poll DB to confirm onboarding_completed_at is set within 5 seconds
      const admin = serviceRole()
      let completedAt: string | null = null
      for (let i = 0; i < 10; i++) {
        const { data } = await admin
          .from('profiles')
          .select('onboarding_completed_at')
          .eq('owner_id', userId)
          .single()
        completedAt = data?.onboarding_completed_at ?? null
        if (completedAt) break
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      expect(completedAt).not.toBeNull()
    } finally {
      await cleanupUser(userId)
    }
  })
})
