import { describe, it } from 'vitest'

/**
 * Tests for markOnboardingComplete() server action.
 * Wave 0 stub — bodies filled by Plan 09-02 after the action is implemented.
 *
 * Coverage:
 *  - D-11: writes onboarding_completed_at = now() when called by authed user with NULL timestamp
 *  - Idempotency: .is('onboarding_completed_at', null) guard → re-calls are no-ops
 *  - Auth failure: returns { ok: false } when unauthenticated
 */
describe('markOnboardingComplete() (D-11)', () => {
  it.todo('writes onboarding_completed_at when profile has NULL timestamp')
  it.todo('is idempotent — second call is a no-op when timestamp already set')
  it.todo('returns { ok: false } when supabase.auth.getUser() returns no user')
  it.todo('returns { ok: false } and logs error code on DB failure (no PII)')
})
