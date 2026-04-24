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
 * Creates a verified user with a configurable profile completeness state.
 * fieldsToFill controls which of the 5 checklist items are present.
 */
async function createUserWithProfile(
  prefix: string,
  opts: {
    displayName?: boolean
    countyId?: boolean
    categoryId?: boolean
    avatarUrl?: boolean
    skillsOffered?: boolean
  } = {},
) {
  const admin = serviceRole()
  const stamp = Date.now()
  const email = `${prefix}-step1-${stamp}@example.test`
  const password = 'TestOnly-pw-12345!'
  const username = `${prefix}-s1-${stamp}`.slice(0, 40)

  const { data: auth, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`createUserWithProfile failed: ${error.message}`)
  const userId = auth.user!.id

  await admin.from('profiles').insert({
    owner_id: userId,
    display_name: opts.displayName ? `Test User ${stamp}` : null,
    username,
    county_id: opts.countyId ? 13001 : null,
    category_id: opts.categoryId ? 1 : null,
    avatar_url: opts.avatarUrl ? 'https://example.com/avatar.png' : null,
    is_published: false,
    accepting_contact: true,
    banned: false,
    onboarding_completed_at: null,
  })

  if (opts.skillsOffered) {
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
  await page.waitForURL(/\/(directory|profile|onboarding|m\/)/, { timeout: 15_000 }).catch(() => undefined)
}

test.describe('Onboarding Step 1 gate (D-15)', () => {
  test('Next button disabled when profile has 0 of 5 checklist items green', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // Create user with NO profile completeness fields
    const { userId, email, password } = await createUserWithProfile('zero')
    try {
      await loginAs(page, email, password)
      // Middleware will redirect to /onboarding; go directly to step 1
      await page.goto('/onboarding?step=1')
      await page.waitForLoadState('networkidle')

      // The "Next" button should be disabled when profile is incomplete
      const next = page.getByRole('button', { name: /^Next$/ })
      await expect(next).toBeDisabled({ timeout: 5_000 })
    } finally {
      await cleanupUser(userId)
    }
  })

  test('Next button disabled when profile has 4 of 5 checklist items green', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // 4 of 5: displayName + countyId + categoryId + skillsOffered but NO avatarUrl
    const { userId, email, password } = await createUserWithProfile('four', {
      displayName: true,
      countyId: true,
      categoryId: true,
      skillsOffered: true,
      avatarUrl: false,
    })
    try {
      await loginAs(page, email, password)
      await page.goto('/onboarding?step=1')
      await page.waitForLoadState('networkidle')

      const next = page.getByRole('button', { name: /^Next$/ })
      await expect(next).toBeDisabled({ timeout: 5_000 })
    } finally {
      await cleanupUser(userId)
    }
  })

  test('Next button enabled when profile has all 5 of 5 checklist items green', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // All 5: displayName + countyId + categoryId + avatarUrl + skillsOffered
    const { userId, email, password } = await createUserWithProfile('five', {
      displayName: true,
      countyId: true,
      categoryId: true,
      avatarUrl: true,
      skillsOffered: true,
    })
    try {
      await loginAs(page, email, password)
      await page.goto('/onboarding?step=1')
      await page.waitForLoadState('networkidle')

      // When complete, the "Next" button becomes "Next: browse the directory →" and is enabled
      const next = page.getByRole('link', { name: /browse the directory/i })
      await expect(next).toBeVisible({ timeout: 5_000 })
    } finally {
      await cleanupUser(userId)
    }
  })

  test('Disabled Next button shows "Finish all five to continue" tooltip on hover', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    // Incomplete profile — Next button is disabled and wrapped in a tooltip trigger
    const { userId, email, password } = await createUserWithProfile('tooltip')
    try {
      await loginAs(page, email, password)
      await page.goto('/onboarding?step=1')
      await page.waitForLoadState('networkidle')

      // Focus the tooltip trigger span (tabIndex={0}) to surface the Radix tooltip
      const triggerSpan = page.locator('span[tabindex="0"]').filter({ has: page.getByRole('button', { name: /^Next$/ }) })
      await triggerSpan.hover()

      // Radix Tooltip renders via portal — check for tooltip content text
      await expect(page.getByText('Finish all five to continue')).toBeVisible({ timeout: 5_000 })
    } finally {
      await cleanupUser(userId)
    }
  })

  test('D-06: Edit my profile CTA navigates to /profile/edit?returnTo=/onboarding?step=1', async ({ page }) => {
    test.skip(!hasEnv, 'requires Supabase env')
    const { userId, email, password } = await createUserWithProfile('d06')
    try {
      await loginAs(page, email, password)
      await page.goto('/onboarding?step=1')
      await page.waitForLoadState('networkidle')

      // Click the "Edit my profile →" link in StepProfile
      await page.getByRole('link', { name: /Edit my profile/i }).click()

      // URL should contain returnTo pointing back to /onboarding?step=1
      await page.waitForURL(/\/profile\/edit/, { timeout: 10_000 })
      const url = page.url()
      // Accept both URL-encoded and raw forms
      const hasReturnTo =
        url.includes('returnTo=%2Fonboarding') ||
        url.includes('returnTo=/onboarding') ||
        url.includes('returnTo=%2Fonboarding%3Fstep%3D1') ||
        url.includes('returnTo=/onboarding?step=1')
      expect(hasReturnTo).toBe(true)
    } finally {
      await cleanupUser(userId)
    }
  })
})
