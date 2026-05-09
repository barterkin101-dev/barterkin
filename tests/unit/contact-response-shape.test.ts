// RETIRED: The send-contact Edge Function was removed in favor of in-app messaging.
// This test previously verified that the Edge Function response never included recipient PII.
// The function no longer exists, so this test suite is now a no-op documenting the retirement.
import { describe, it } from 'vitest'

describe('CONT-06 — send-contact Edge Function (retired)', () => {
  it('is retired — in-app messaging replaced email relay', () => {
    // No-op: the Edge Function was removed as part of the messaging migration.
    // Privacy invariant is now enforced by the messaging server actions in lib/actions/messaging.ts
  })
})
