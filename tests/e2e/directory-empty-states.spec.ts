/**
 * Phase 4 — DIR-08 — Empty state on 0 profiles; zero-results on 0 matches with active filters
 */
import { test, expect } from '@playwright/test'
import {
  createVerifiedUser,
  seedPublishedProfile,
  cleanupUser,
} from './fixtures/directory-seed'

const hasEnv =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

test.describe('DIR-08: empty states', () => {
  let viewerId = ''
  let subjectId = ''
  const stamp = Date.now()
  const viewerEmail = `dir-empty-view-${stamp}@example.test`
  const viewerPassword = 'TestOnly-pw-12345!'

  test.beforeAll(async () => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    viewerId = await createVerifiedUser(viewerEmail, viewerPassword)
    // Seed one profile so the zero-results test (filtered) can distinguish from empty-directory
    subjectId = await createVerifiedUser(
      `dir-empty-subj-${stamp}@example.test`,
      viewerPassword,
    )
    await seedPublishedProfile({
      ownerId: subjectId,
      display_name: `Empty Test Member ${stamp}`,
      category_id: 2, // Food & Kitchen
      county_id: 13001,
      skills: ['cooking'],
    })
  })

  test.afterAll(async () => {
    if (viewerId) await cleanupUser(viewerId)
    if (subjectId) await cleanupUser(subjectId)
  })

  test('zero-results state: filtering to non-matching category shows "No profiles match those filters."', async ({
    page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(viewerEmail)
    const pwField = page.getByLabel(/password/i)
    if (await pwField.isVisible()) {
      await pwField.fill(viewerPassword)
      await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
    }
    await page
      .waitForURL(/\/(directory|profile)/, { timeout: 15_000 })
      .catch(() => undefined)

    // Use a category that has no seeded profiles from THIS test (transportation = category 10)
    // Note: other tests may have profiles in this category, so we combine with a unique keyword
    await page.goto(`/directory?category=transportation&q=zzz-nomatch-${stamp}`)

    // Zero-results heading
    await expect(
      page.getByRole('heading', { name: 'No profiles match those filters.' }),
    ).toBeVisible({ timeout: 10_000 })

    // "Clear filters" CTA links to /directory
    const clearLink = page.getByRole('link', { name: 'Clear filters' })
    await expect(clearLink).toBeVisible()
    await expect(clearLink).toHaveAttribute('href', '/directory')
  })

  test('empty-directory state: no published profiles shows "Nobody\'s here yet."', async ({
    page: _page,
  }) => {
    test.skip(!hasEnv, 'Supabase env vars not set — skip DB-seeded E2E')
    // NOTE: This test is hard to run reliably in a shared DB (other profiles exist).
    // We test the zero-results state instead as a proxy for the empty-state UI path,
    // and verify the DirectoryEmptyState component renders correctly via its heading.
    // True "zero profiles" state requires a clean DB environment — document as a
    // manual-verification item for isolated staging environments.

    // The zero-results state with no filters at all (category slug that maps to nothing,
    // but the empty-state renders when totalCount===0 AND activeFilterCount===0)
    // In a shared DB, we cannot guarantee zero profiles, so we skip this sub-test
    // and document it as requiring isolated environment.
    test.skip(
      true,
      'DIR-08a (empty directory): requires isolated DB with zero published profiles. ' +
        'Verify manually on staging: visit /directory with no profiles, expect "Nobody\'s here yet." heading + "Build your profile" link to /profile/edit.',
    )
  })
})
