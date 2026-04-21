/**
 * SEED-04 — founding-member badge renders on DirectoryCard + ProfileCard.
 *
 * Env-gated: tests run only when NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are present (pattern mirrors
 * tests/e2e/landing-founding-strip.spec.ts).
 *
 * Sign-in pattern: mirrors tests/e2e/directory-card-render.spec.ts +
 * tests/e2e/directory-category-filter.spec.ts — fills the email field on
 * /login, tries to fill a password field if present, clicks the submit
 * button, then waits for a /directory or /profile URL. Turnstile CAPTCHA
 * blocks programmatic magic-link submit in automated test envs (see
 * tests/e2e/login-magic-link.spec.ts for the known constraint), so the
 * wait is a best-effort `.catch(() => undefined)` and the subsequent
 * `page.goto('/directory')` will succeed only when a live session exists.
 * When the session cannot be established (Turnstile blocked), the badge
 * assertions will fail gracefully with timeout — document as flaky in
 * SUMMARY and track for a future Turnstile-bypass plan.
 */
import { test, expect } from '@playwright/test'
import {
  createVerifiedUser,
  seedPublishedProfile,
  admin,
  cleanupUser,
} from './fixtures/directory-seed'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('SEED-04 — founding-member badge', () => {
  test('directory card renders "Founding member" badge when founding_member=true', async ({
    page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set')

    const stamp = Date.now()
    const subjectEmail = `fb-subject-${stamp}@example.test`
    const controlEmail = `fb-control-${stamp}@example.test`
    const viewerEmail = `fb-viewer-${stamp}@example.test`
    const password = 'TestOnly-pw-12345!'

    const subjectId = await createVerifiedUser(subjectEmail, password)
    const controlId = await createVerifiedUser(controlEmail, password)
    const viewerId = await createVerifiedUser(viewerEmail, password)

    try {
      const subjectName = `Subject Founder ${stamp}`
      const controlName = `Control Non ${stamp}`

      await seedPublishedProfile({
        ownerId: subjectId,
        display_name: subjectName,
        county_id: 13001,
        category_id: 1,
        skills: ['founder skill'],
        founding_member: true,
      })
      await seedPublishedProfile({
        ownerId: controlId,
        display_name: controlName,
        county_id: 13001,
        category_id: 1,
        skills: ['control skill'],
        founding_member: false,
      })

      // Sign in viewer — pattern mirrors directory-card-render.spec.ts.
      await page.goto('/login')
      await page.getByLabel(/email/i).fill(viewerEmail)
      const pwField = page.getByLabel(/password/i)
      if (await pwField.isVisible().catch(() => false)) {
        await pwField.fill(password)
        await page
          .getByRole('button', { name: /sign in|log in|continue/i })
          .click()
      }
      await page
        .waitForURL(/\/(directory|profile)/, { timeout: 15_000 })
        .catch(() => undefined)

      // Navigate to directory
      await page.goto('/directory')

      // Subject's card shows the badge
      const subjectCard = page
        .getByRole('listitem')
        .filter({ hasText: subjectName })
        .first()
      await expect(subjectCard).toBeVisible({ timeout: 10_000 })
      await expect(subjectCard.getByText('Founding member')).toBeVisible()

      // Control's card does NOT show the badge
      const controlCard = page
        .getByRole('listitem')
        .filter({ hasText: controlName })
        .first()
      await expect(controlCard).toBeVisible()
      await expect(
        controlCard.getByText('Founding member'),
      ).not.toBeVisible()
    } finally {
      await cleanupUser(subjectId)
      await cleanupUser(controlId)
      await cleanupUser(viewerId)
    }
  })

  test('detail page renders "Founding member" badge when founding_member=true', async ({
    page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set')

    const stamp = Date.now()
    const subjectEmail = `fb-detail-subject-${stamp}@example.test`
    const controlEmail = `fb-detail-control-${stamp}@example.test`
    const viewerEmail = `fb-detail-viewer-${stamp}@example.test`
    const password = 'TestOnly-pw-12345!'

    const subjectId = await createVerifiedUser(subjectEmail, password)
    const controlId = await createVerifiedUser(controlEmail, password)
    const viewerId = await createVerifiedUser(viewerEmail, password)

    try {
      // Predictable usernames so we can navigate by URL
      const subjectUsername = `fb-detail-founder-${stamp}`.slice(0, 40)
      const controlUsername = `fb-detail-non-${stamp}`.slice(0, 40)
      const subjectName = `Detail Founder ${stamp}`
      const controlName = `Detail Non ${stamp}`

      await admin()
        .from('profiles')
        .insert({
          owner_id: subjectId,
          username: subjectUsername,
          display_name: subjectName,
          county_id: 13001,
          category_id: 1,
          is_published: true,
          banned: false,
          founding_member: true,
        })
      await admin()
        .from('profiles')
        .insert({
          owner_id: controlId,
          username: controlUsername,
          display_name: controlName,
          county_id: 13001,
          category_id: 1,
          is_published: true,
          banned: false,
          founding_member: false,
        })

      // Sign in viewer — pattern mirrors directory-card-render.spec.ts.
      await page.goto('/login')
      await page.getByLabel(/email/i).fill(viewerEmail)
      const pwField = page.getByLabel(/password/i)
      if (await pwField.isVisible().catch(() => false)) {
        await pwField.fill(password)
        await page
          .getByRole('button', { name: /sign in|log in|continue/i })
          .click()
      }
      await page
        .waitForURL(/\/(directory|profile)/, { timeout: 15_000 })
        .catch(() => undefined)

      // Visit founder's detail page
      await page.goto(`/m/${subjectUsername}`)
      await expect(
        page.getByRole('heading', { name: subjectName }),
      ).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText('Founding member')).toBeVisible()

      // Visit non-founder's detail page
      await page.goto(`/m/${controlUsername}`)
      await expect(
        page.getByRole('heading', { name: controlName }),
      ).toBeVisible()
      await expect(page.getByText('Founding member')).not.toBeVisible()
    } finally {
      await cleanupUser(subjectId)
      await cleanupUser(controlId)
      await cleanupUser(viewerId)
    }
  })
})
